// ==========================================
// API DE AGENDAMIENTO - GOOGLE CALENDAR
// Sistema de Gestión Inmobiliaria
// Archivo: API_AGENDA.js
// ==========================================
//
// Flujo de una cita:
//   1. El propietario agenda desde la página principal (ScheduleVisitForm) →
//      agendarCita(): evento en Google Calendar + fila en "2 - AGENDA CITAS" +
//      correo con botones Confirmar / Reagendar / Cancelar.
//   2. El motor horario (API_CRON_AGENDA.js) manda el recordatorio 24 h antes,
//      cancela sola la cita que nunca se confirmó y avisa al agente al empezar.
//   3. Los botones del correo abren una página que pide confirmar el clic
//      (estadoCita en doGet). El agente ve todo en el panel (obtenerCitas).

const CONFIG_AGENDA = {
  HOJA_CITAS: '2 - AGENDA CITAS',
  DURACION_CITA_MINUTOS: 60,
  TIEMPO_BUFFER_MINUTOS: 30, // Colchón de transporte/preparación entre citas
  MINIMO_AVISO_HORAS: 12, // No se puede agendar con menos de 12h de anticipación
  HORARIO: {
    LUNES_VIERNES: { inicio: 8, fin: 18 }, // 8:00 AM a 6:00 PM
    SABADO: { inicio: 8, fin: 13 } // 8:00 AM a 1:00 PM
  },
  CALENDARIO_FESTIVOS_COLOMBIA: 'es.co#holiday@group.v.calendar.google.com'
};

// Columnas de la hoja de citas. Se leen y escriben SIEMPRE por nombre.
// Hasta sep-2026 la hoja no tenía encabezados y el código usaba posiciones
// fijas (columna 3, 11, 12...): mover o insertar una columna habría escrito
// estados encima de otros datos sin que nadie lo notara.
const COLUMNAS_CITAS = [
  'ID CITA', 'FECHA CREACION', 'ESTADO', 'FECHA CITA', 'HORA CITA',
  'NOMBRE', 'CELULAR', 'CORREO', 'TIPO SERVICIO', 'DIRECCION',
  'ID EVENTO CALENDAR', 'NOTAS', 'RECORDATORIO ENVIADO',
  'TOKEN PROPIETARIO', 'TOKEN AGENTE', 'ULTIMO CAMBIO',
  // oct-2026: cuatro agendas en la misma hoja (AGENDA_MOTOR.js). Vacío = PROPIETARIO.
  'TIPO AGENDA', 'ID INMUEBLE',
  // oct-2026: notas del agente desde el panel (NOTAS es lo que escribió el propietario)
  'NOTAS AGENTE',
  // oct-2026 (bloque 3): último aviso enviado (H48, H24, H3, H2, M60, M45, M30) y cuándo
  'ULTIMO AVISO', 'FECHA ULTIMO AVISO',
  // oct-2026 (bloque 2, agendamiento coordinado): DIRECTO / COORDINADO, los hasta 3
  // horarios que pidió el interesado (JSON de timestamps) y quién abre el inmueble
  'MODO VISITA', 'HORARIOS PEDIDOS', 'QUIEN ABRE',
  // oct-2026 (negociación): horarios que pidió el interesado y el propietario no pudo.
  // Ya no se le vuelven a ofrecer al interesado (JSON de timestamps).
  'HORARIOS DESCARTADOS',
  // oct-2026 (sala de entrega): quién hizo la última propuesta, INQUILINO o PROPIETARIO
  'PROPUESTO POR',
  // oct-2026 (sala de entrega, parte B): datos de la mudanza (JSON) y los Doc de las dos cartas
  'DATOS ENTREGA', 'CARTAS ENTREGA',
  // oct-2026 (sala de entrega v2): aprobación de la mudanza y formato de la administración (JSON)
  'MUDANZA'
];

// Estados posibles de una cita.
const ESTADOS_CITA = {
  PENDIENTE: 'PENDIENTE',                   // agendada, el propietario aún no confirma
  CONFIRMADA: 'CONFIRMADA',                 // el propietario confirmó
  CONFIRMADA_NOTIFICADA: 'CONFIRMADA_NOTIFICADA', // confirmada y ya se avisó al agente al empezar
  QUIERE_REAGENDAR: 'QUIERE REAGENDAR',     // el propietario pidió otra fecha: el agente lo llama
  REAGENDADA: 'REAGENDADA',                 // el agente la movió tras hablar con él
  CANCELADA: 'CANCELADA',
  ASISTIDA: 'ASISTIDA',
  INASISTIDA: 'INASISTIDA',
  SIN_RESPUESTA: 'SIN RESPUESTA'            // pasó la fecha sin que nadie hiciera nada
};

/** Correo al que llegan los avisos del agente. */
function correoAgenteCitas() {
  try {
    const efectivo = Session.getEffectiveUser().getEmail();
    if (efectivo) return efectivo;
  } catch (e) {}
  return (typeof CORREO_AGENTE_MIGUEL !== 'undefined') ? CORREO_AGENTE_MIGUEL : '';
}

/**
 * Devuelve la hoja de citas con sus encabezados garantizados y un mapa
 * nombre → número de columna (base 1).
 */
function hojaCitasConColumnas() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_AGENDA.HOJA_CITAS);
  if (!sheet) throw new Error('No se encontró la hoja ' + CONFIG_AGENDA.HOJA_CITAS);

  const ultimaCol = Math.max(sheet.getLastColumn(), 1);
  let encabezados = sheet.getRange(1, 1, 1, ultimaCol).getValues()[0].map(h => String(h || '').trim());

  // Sin encabezados: se inserta la fila en vez de escribir encima de una cita.
  if (encabezados[0] !== 'ID CITA') {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, COLUMNAS_CITAS.length).setValues([COLUMNAS_CITAS]).setFontWeight('bold');
    encabezados = COLUMNAS_CITAS.slice();
  }

  // Columnas nuevas que falten se añaden al final, nunca en medio.
  COLUMNAS_CITAS.forEach(nombre => {
    if (encabezados.indexOf(nombre) === -1) {
      encabezados.push(nombre);
      sheet.getRange(1, encabezados.length).setValue(nombre).setFontWeight('bold');
    }
  });

  const col = {};
  encabezados.forEach((n, i) => { if (n) col[n] = i + 1; });
  return { sheet: sheet, col: col };
}

/** Lee el valor de una fila (array de getValues) por nombre de columna. */
function valorCita(fila, col, nombre) {
  const c = col[nombre];
  return c ? fila[c - 1] : '';
}

/**
 * Convierte fecha + hora de la hoja en un Date.
 *
 * ⚠️ La fecha puede llegar como Date y no como texto: Google Sheets convierte
 * "22/06/2026" en una fecha real al guardarla. El motor antiguo hacía
 * fecha.split('/') sobre ese Date, fallaba en silencio y saltaba la cita:
 * por eso NUNCA envió un recordatorio. Se aceptan las dos formas.
 */
function fechaHoraDeCita(fechaVal, horaVal) {
  let anio, mes, dia;
  if (fechaVal instanceof Date) {
    anio = fechaVal.getFullYear(); mes = fechaVal.getMonth(); dia = fechaVal.getDate();
  } else {
    const p = String(fechaVal || '').trim().split('/');
    if (p.length !== 3) return null;
    dia = parseInt(p[0], 10); mes = parseInt(p[1], 10) - 1; anio = parseInt(p[2], 10);
  }

  let horas, mins;
  if (horaVal instanceof Date) {
    horas = horaVal.getHours(); mins = horaVal.getMinutes();
  } else {
    const m = String(horaVal || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return null;
    horas = parseInt(m[1], 10); mins = parseInt(m[2], 10);
    const ampm = (m[3] || '').toUpperCase();
    if (ampm === 'PM' && horas < 12) horas += 12;
    if (ampm === 'AM' && horas === 12) horas = 0;
  }

  if ([anio, mes, dia, horas, mins].some(n => isNaN(n))) return null;
  return new Date(anio, mes, dia, horas, mins, 0);
}

/**
 * Horarios libres para la agenda del propietario (la que usa hoy el formulario de
 * la página principal). Desde oct-2026 el cálculo vive en AGENDA_MOTOR.js, común
 * a las cuatro agendas; esta función se conserva con el mismo nombre y la misma
 * respuesta para no romper nada.
 */
function obtenerDisponibilidad(fechaIsoString) {
  return obtenerDisponibilidadAgenda(fechaIsoString, 'PROPIETARIO');
}

/**
 * Recibe los datos del propietario, crea el evento y guarda en BD.
 * datos = { fechaTimestamp, nombreCliente, celular, correo, tipoServicio, direccion, detalles }
 */
function agendarCita(datos) {
  try {
    const tz = Session.getScriptTimeZone();
    const fechaInicio = new Date(datos.fechaTimestamp);
    const fechaFin = new Date(fechaInicio.getTime() + (CONFIG_AGENDA.DURACION_CITA_MINUTOS * 60000));

    // 1. Doble check de disponibilidad, con el colchón antes y después
    const calendario = CalendarApp.getDefaultCalendar();
    const colchonMs = TIPOS_AGENDA.PROPIETARIO.colchonMin * 60000;
    if (calendario.getEvents(new Date(fechaInicio.getTime() - colchonMs), new Date(fechaFin.getTime() + colchonMs)).length > 0) {
      return { success: false, error: "El horario acaba de ser ocupado. Por favor elige otro." };
    }

    const idCita = "CIT-" + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // 2. Evento en Calendar. Empieza marcado como pendiente: el título cambia
    //    cuando el propietario confirma, reagenda o cancela.
    const evento = calendario.createEvent(tituloEventoCita(ESTADOS_CITA.PENDIENTE, datos.tipoServicio, datos.nombreCliente), fechaInicio, fechaFin, {
      description:
        `Cita agendada desde la página principal (ID ${idCita})\n` +
        `Propietario: ${datos.nombreCliente}\n` +
        `Celular: ${datos.celular}\n` +
        `Correo: ${datos.correo}\n` +
        `Servicio: ${datos.tipoServicio}\n` +
        `Dirección del inmueble: ${datos.direccion || 'N/A'}\n` +
        `Notas: ${datos.detalles || 'N/A'}`,
      location: datos.direccion || '',
      guests: datos.correo,
      sendInvites: false // la invitación nativa de Google se sustituye por nuestro correo
    });

    // 3. Fila en la hoja, escrita por NOMBRE de columna
    const { sheet, col } = hojaCitasConColumnas();
    const tokenPropietario = Utilities.getUuid();
    const tokenAgente = Utilities.getUuid();
    const ahoraTxt = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy HH:mm:ss");
    const horaCitaStr = formatAmPm(fechaInicio);

    const fila = new Array(Math.max(sheet.getLastColumn(), COLUMNAS_CITAS.length)).fill('');
    const poner = (nombre, valor) => { if (col[nombre]) fila[col[nombre] - 1] = valor; };
    poner('ID CITA', idCita);
    poner('FECHA CREACION', ahoraTxt);
    poner('ESTADO', ESTADOS_CITA.PENDIENTE);
    // Se guarda como fecha real (no texto) para que el formato del Sheet no
    // la reinterprete: "05/06" podría leerse como 6 de mayo en otra configuración.
    poner('FECHA CITA', new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate()));
    poner('HORA CITA', horaCitaStr);
    poner('NOMBRE', datos.nombreCliente);
    poner('CELULAR', textoCelda_(datos.celular));
    poner('CORREO', datos.correo);
    poner('TIPO SERVICIO', datos.tipoServicio);
    poner('DIRECCION', datos.direccion || '');
    poner('ID EVENTO CALENDAR', evento.getId());
    poner('NOTAS', datos.detalles || '');
    // Los avisos que ya "pasaron" al agendar (p. ej. el de 48 h si la cita es en
    // 40 h) los cubre el correo de agendada: el motor sigue desde el siguiente.
    poner('ULTIMO AVISO', avisoVigenteCita((fechaInicio.getTime() - Date.now()) / 60000));
    poner('TOKEN PROPIETARIO', tokenPropietario);
    poner('TOKEN AGENTE', tokenAgente);
    poner('ULTIMO CAMBIO', ahoraTxt + ' · agendada');
    poner('TIPO AGENDA', 'PROPIETARIO');
    sheet.appendRow(fila);
    const filaNueva = sheet.getLastRow();
    if (col['FECHA CITA']) sheet.getRange(filaNueva, col['FECHA CITA']).setNumberFormat('dd/MM/yyyy');

    // 4. Correo al propietario: solo informa, sin botones (bloque 3, oct-2026).
    //    La confirmación se pide 1 hora antes; al final va la línea pequeña para
    //    cambiar la fecha o cancelar.
    try {
      enviarPasoCita('AGENDADA', datos.correo, {
        idCita: idCita, token: tokenPropietario, nombre: datos.nombreCliente,
        servicio: datos.tipoServicio, direccion: datos.direccion, inicio: fechaInicio
      });
    } catch (errMail) {
      Logger.log("Error enviando correo de cita agendada: " + errMail.message);
    }

    return { success: true, idCita: idCita, mensaje: "Cita agendada y registrada exitosamente" };

  } catch (error) {
    Logger.log("Error en agendarCita: " + error.message);
    return { success: false, error: error.message };
  }
}

/** Título del evento en Calendar según el estado, para verlo de un vistazo. */
function tituloEventoCita(estado, servicio, nombre) {
  const marcas = {
    'PENDIENTE': '⏳ POR CONFIRMAR',
    'CONFIRMADA': '✅ CONFIRMADA',
    'CONFIRMADA_NOTIFICADA': '✅ CONFIRMADA',
    'REAGENDADA': '🔄 REAGENDADA'
  };
  return `📍 VISITA ${marcas[estado] || ''}: ${servicio} - ${nombre}`.replace(/\s+/g, ' ');
}

/** URL de la página que aplica un cambio de estado (pide confirmar el clic). */
// oct-2026: los botones abren la página de GitHub Pages (frontend/cita.html) y no
// la de Apps Script, que mostraba el aviso "Un usuario de Google Apps Script creó
// esta aplicación". Los correos viejos con el enlace de Apps Script siguen
// funcionando (doGet accion=estadoCita).
const URL_PAGINA_CITA = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/cita.html';
function urlEstadoCita(idCita, nuevoEstado, token) {
  return `${URL_PAGINA_CITA}?idCita=${encodeURIComponent(idCita)}` +
         `&nuevoEstado=${encodeURIComponent(nuevoEstado)}&t=${encodeURIComponent(token)}`;
}

/**
 * Bloque HTML de botones para correo. Estilos en línea: los clientes de correo
 * ignoran las hojas CSS.
 *
 * oct-2026: en UNA fila que ocupa el 100 % del ancho, cada botón con su parte
 * (un tercio si son tres) y el ícono encima del texto. La primera versión los
 * ponía lado a lado sin ancho fijo y en el celular el último se salía.
 * Si un texto no trae emoji delante, el botón queda en una sola línea.
 */
function htmlBotonesCorreo(botones) {
  const ancho = Math.floor(100 / botones.length);
  const celdas = botones.map(b => {
    const m = String(b.texto).match(/^(\S+)\s+(.+)$/);
    const conIcono = m && !/[A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(m[1]);
    const contenido = conIcono
      ? `<span style="display:block;font-size:20px;line-height:1;margin-bottom:6px;">${m[1]}</span>${m[2]}`
      : b.texto;
    return `<td width="${ancho}%" style="padding:0 4px;"><a href="${b.url}" style="display:block;text-align:center;` +
      `padding:14px 4px;background:${b.color};color:#ffffff;text-decoration:none;border-radius:10px;` +
      `font-weight:bold;font-size:14px;line-height:1.2;font-family:Arial,sans-serif;">${contenido}</a></td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0;table-layout:fixed;"><tr>${celdas}</tr></table>`;
}

function botonesPropietarioCita(idCita, token) {
  // Confirmar a la DERECHA: el celular se usa casi siempre con la mano derecha
  // y queda bajo el pulgar. Cancelar a la izquierda (Leonardo, 14-oct-2026).
  return htmlBotonesCorreo([
    { texto: '❌ Cancelar', color: '#a3322a', url: urlEstadoCita(idCita, ESTADOS_CITA.CANCELADA, token) },
    { texto: '🔄 Reagendar', color: '#b8860b', url: urlEstadoCita(idCita, ESTADOS_CITA.QUIERE_REAGENDAR, token) },
    { texto: '✅ Confirmar', color: '#1f7a4d', url: urlEstadoCita(idCita, ESTADOS_CITA.CONFIRMADA, token) }
  ]);
}

/** Envía un correo de citas con la plantilla corporativa. */
/** @param {Blob[]=} adjuntos  p. ej. el archivo .ics de la cita (CORREOS_CITA.js) */
/**
 * Un texto que empieza con + (como "+57 300…") la hoja lo toma por fórmula y queda #ERROR!;
 * con el apóstrofo se guarda tal cual, como texto (27-oct-2026).
 */
function textoCelda_(v) {
  const t = v === undefined || v === null ? '' : String(v);
  return /^[+=@-]/.test(t) ? "'" + t : t;
}

function enviarCorreoCita(destino, asunto, titulo, nombre, mensajePrincipal, htmlSecundario, adjuntos) {
  if (!destino) return;
  // Plantilla propia de citas, corta y para celular (email_cita.html)
  const t = HtmlService.createTemplateFromFile('backend/email_cita');
  t.TITULO = titulo;
  t.NOMBRE_CLIENTE = nombre;
  t.MENSAJE_PRINCIPAL = mensajePrincipal;
  t.MENSAJE_SECUNDARIO = htmlSecundario || '';
  t.URL_ACCION = '';
  t.TEXTO_BOTON = '';
  const correo = { to: destino, subject: asunto, htmlBody: t.evaluate().getContent() };
  if (adjuntos && adjuntos.length) correo.attachments = adjuntos;
  enviarCorreo_(correo);
}

/**
 * Panel del agente: lista de citas. Exige la sesión de Google del agente,
 * validada en el servidor: las citas llevan teléfonos y correos de personas.
 */
function obtenerCitasPanel(datos) {
  const permiso = _verificarAgenteGoogle(datos && datos.credential);
  if (!permiso.ok) {
    return { success: false, message: String(permiso.mensaje).replace('lanzar a Miguel', 'ver las citas') };
  }

  try {
    const { sheet, col } = hojaCitasConColumnas();
    const ultima = sheet.getLastRow();
    if (ultima < 2) return { success: true, citas: [] };

    const tz = Session.getScriptTimeZone();
    const filas = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
    const citas = [];
    filas.forEach(f => {
      const id = String(valorCita(f, col, 'ID CITA') || '').trim();
      if (!id) return;
      const fecha = fechaHoraDeCita(valorCita(f, col, 'FECHA CITA'), valorCita(f, col, 'HORA CITA'));
      if (!fecha) return;   // fila sin fecha útil: no se puede pintar en un calendario
      citas.push({
        idCita: id,
        estado: String(valorCita(f, col, 'ESTADO') || ESTADOS_CITA.PENDIENTE).trim(),
        timestamp: fecha.getTime(),
        fecha: Utilities.formatDate(fecha, tz, 'dd/MM/yyyy'),
        hora: formatAmPm(fecha),
        nombre: String(valorCita(f, col, 'NOMBRE') || ''),
        celular: String(valorCita(f, col, 'CELULAR') || ''),
        correo: String(valorCita(f, col, 'CORREO') || ''),
        servicio: String(valorCita(f, col, 'TIPO SERVICIO') || ''),
        direccion: String(valorCita(f, col, 'DIRECCION') || ''),
        notas: String(valorCita(f, col, 'NOTAS') || ''),
        ultimoCambio: String(valorCita(f, col, 'ULTIMO CAMBIO') || ''),
        notasAgente: String(valorCita(f, col, 'NOTAS AGENTE') || ''),
        idInmueble: String(valorCita(f, col, 'ID INMUEBLE') || ''),
        // Vacío = citas viejas, todas de propietario
        tipoAgenda: String(valorCita(f, col, 'TIPO AGENDA') || 'PROPIETARIO').trim().toUpperCase()
        // Los tokens NO se envían al navegador.
      });
    });
    citas.sort((a, b) => a.timestamp - b.timestamp);
    return { success: true, citas: citas };
  } catch (e) {
    return { success: false, message: 'No se pudieron leer las citas: ' + e.message };
  }
}

// Utilidad para formatear 12h AM/PM
function formatAmPm(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutes + ' ' + ampm;
}
