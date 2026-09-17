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
  'TOKEN PROPIETARIO', 'TOKEN AGENTE', 'ULTIMO CAMBIO'
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
 * Obtiene los bloques de 1 hora disponibles para una fecha específica.
 * Maneja bloqueo de festivos, zonas ocupadas y márgenes de tiempo.
 */
function obtenerDisponibilidad(fechaIsoString) {
  try {
    const fechaSolicitada = new Date(fechaIsoString);
    const tz = Session.getScriptTimeZone();
    const ahora = new Date();

    // Domingo o festivo en Colombia
    const diaSemana = fechaSolicitada.getDay(); // 0 = Domingo
    if (diaSemana === 0) {
      return { success: true, libre: false, motivo: 'Día de descanso (Domingo)', slots: [] };
    }
    const calFestivos = CalendarApp.getCalendarById(CONFIG_AGENDA.CALENDARIO_FESTIVOS_COLOMBIA);
    if (calFestivos) {
      const eventosFestivos = calFestivos.getEventsForDay(fechaSolicitada);
      if (eventosFestivos.length > 0) {
        return { success: true, libre: false, motivo: `Día festivo: ${eventosFestivos[0].getTitle()}`, slots: [] };
      }
    }

    // Horario laboral del día
    let horaInicio = CONFIG_AGENDA.HORARIO.LUNES_VIERNES.inicio;
    let horaFin = CONFIG_AGENDA.HORARIO.LUNES_VIERNES.fin;
    if (diaSemana === 6) {
      horaInicio = CONFIG_AGENDA.HORARIO.SABADO.inicio;
      horaFin = CONFIG_AGENDA.HORARIO.SABADO.fin;
    }

    // Zonas ocupadas del calendario principal del agente
    const calendario = CalendarApp.getDefaultCalendar();
    const zonasOcupadas = calendario.getEventsForDay(fechaSolicitada).map(e => ({
      inicio: e.getStartTime().getTime(),
      fin: e.getEndTime().getTime()
    }));

    // Slots cada 30 minutos
    const slotsDisponibles = [];
    let currentSlot = new Date(fechaSolicitada.getFullYear(), fechaSolicitada.getMonth(), fechaSolicitada.getDate(), horaInicio, 0, 0);
    const finDia = new Date(fechaSolicitada.getFullYear(), fechaSolicitada.getMonth(), fechaSolicitada.getDate(), horaFin, 0, 0);

    while (currentSlot.getTime() + (CONFIG_AGENDA.DURACION_CITA_MINUTOS * 60000) <= finDia.getTime()) {
      const inicioSlot = currentSlot.getTime();
      const finCitaSlot = inicioSlot + (CONFIG_AGENDA.DURACION_CITA_MINUTOS * 60000);
      const finTotalConBuffer = finCitaSlot + (CONFIG_AGENDA.TIEMPO_BUFFER_MINUTOS * 60000);

      const horasParaSlot = (inicioSlot - ahora.getTime()) / (1000 * 60 * 60);
      if (horasParaSlot >= CONFIG_AGENDA.MINIMO_AVISO_HORAS) {
        const hayChoque = zonasOcupadas.some(occ => inicioSlot < occ.fin && finTotalConBuffer > occ.inicio);
        if (!hayChoque) {
          slotsDisponibles.push({
            horaString: Utilities.formatDate(currentSlot, tz, "HH:mm"),
            horaAmPm: formatAmPm(currentSlot),
            timestamp: inicioSlot
          });
        }
      }
      currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
    }

    return {
      success: true,
      libre: slotsDisponibles.length > 0,
      motivo: slotsDisponibles.length === 0 ? 'Sin horarios disponibles' : 'Horarios encontrados',
      slots: slotsDisponibles
    };

  } catch (error) {
    Logger.log("Error en obtenerDisponibilidad: " + error.message);
    return { success: false, error: error.message };
  }
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

    // 1. Doble check de disponibilidad
    const calendario = CalendarApp.getDefaultCalendar();
    if (calendario.getEvents(fechaInicio, fechaFin).length > 0) {
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

    // Si la cita es en menos de 24 h, el correo de agendado YA hace de
    // recordatorio. Sin esta marca el motor enviaría otro enseguida.
    const horasFaltantes = (fechaInicio.getTime() - Date.now()) / 3600000;

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
    poner('CELULAR', datos.celular);
    poner('CORREO', datos.correo);
    poner('TIPO SERVICIO', datos.tipoServicio);
    poner('DIRECCION', datos.direccion || '');
    poner('ID EVENTO CALENDAR', evento.getId());
    poner('NOTAS', datos.detalles || '');
    poner('RECORDATORIO ENVIADO', horasFaltantes <= 24 ? ahoraTxt : '');
    poner('TOKEN PROPIETARIO', tokenPropietario);
    poner('TOKEN AGENTE', tokenAgente);
    poner('ULTIMO CAMBIO', ahoraTxt + ' · agendada');
    sheet.appendRow(fila);
    const filaNueva = sheet.getLastRow();
    if (col['FECHA CITA']) sheet.getRange(filaNueva, col['FECHA CITA']).setNumberFormat('dd/MM/yyyy');

    // 4. Correo al propietario con los tres botones
    const fechaCitaStr = Utilities.formatDate(fechaInicio, tz, "dd/MM/yyyy");
    try {
      enviarCorreoCita(
        datos.correo,
        `📅 Cita agendada para el ${fechaCitaStr} a las ${horaCitaStr} — confirma tu asistencia`,
        'VISITA AGENDADA',
        datos.nombreCliente,
        `Hemos registrado tu cita para el servicio de <strong>${datos.tipoServicio}</strong>.<br><br>` +
        `🗓️ <strong>Fecha:</strong> ${fechaCitaStr}<br>⏰ <strong>Hora:</strong> ${horaCitaStr}<br>` +
        `📍 <strong>Inmueble:</strong> ${datos.direccion || 'A convenir'}` +
        `<br><br>Por favor <strong>confirma tu asistencia</strong>. Si no puedes en ese horario, elige reagendar y te llamaremos.`,
        botonesPropietarioCita(idCita, tokenPropietario)
      );
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
function urlEstadoCita(idCita, nuevoEstado, token) {
  const props = PropertiesService.getScriptProperties();
  const base = props.getProperty('WEB_APP_URL') ||
    'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
  return `${base}?accion=estadoCita&idCita=${encodeURIComponent(idCita)}` +
         `&nuevoEstado=${encodeURIComponent(nuevoEstado)}&t=${encodeURIComponent(token)}`;
}

/** Bloque HTML de botones para correo. Estilos en línea: los clientes de correo ignoran las hojas CSS. */
function htmlBotonesCorreo(botones) {
  const celdas = botones.map(b =>
    `<td style="padding:6px;"><a href="${b.url}" style="display:inline-block;padding:12px 18px;` +
    `background:${b.color};color:#ffffff;text-decoration:none;border-radius:8px;` +
    `font-weight:bold;font-size:14px;font-family:Arial,sans-serif;">${b.texto}</a></td>`
  ).join('');
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px auto;"><tr>${celdas}</tr></table>`;
}

function botonesPropietarioCita(idCita, token) {
  return htmlBotonesCorreo([
    { texto: '✅ Confirmar', color: '#1f7a4d', url: urlEstadoCita(idCita, ESTADOS_CITA.CONFIRMADA, token) },
    { texto: '🔄 Reagendar', color: '#b8860b', url: urlEstadoCita(idCita, ESTADOS_CITA.QUIERE_REAGENDAR, token) },
    { texto: '❌ Cancelar', color: '#a3322a', url: urlEstadoCita(idCita, ESTADOS_CITA.CANCELADA, token) }
  ]);
}

/** Envía un correo de citas con la plantilla corporativa. */
function enviarCorreoCita(destino, asunto, titulo, nombre, mensajePrincipal, htmlSecundario) {
  if (!destino) return;
  const t = HtmlService.createTemplateFromFile('backend/email_notificacion');
  t.TITULO = titulo;
  t.NOMBRE_CLIENTE = nombre;
  t.MENSAJE_PRINCIPAL = mensajePrincipal;
  t.MENSAJE_SECUNDARIO = htmlSecundario || '';
  t.URL_ACCION = '';
  t.TEXTO_BOTON = '';
  MailApp.sendEmail({ to: destino, subject: asunto, htmlBody: t.evaluate().getContent() });
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
        ultimoCambio: String(valorCita(f, col, 'ULTIMO CAMBIO') || '')
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
