/**
 * AGENDA DE INTERESADOS — bloque 1 del plan de agendas (oct-2026)
 *
 * Quien quiere ver un inmueble publicado agenda la visita desde la página pública
 * frontend/visita.html?i=<ID DE REGISTRO>, que comparte el agente con el botón de
 * compartir de su "Portafolio de Inmuebles".
 *
 * Decisiones de Leonardo (PLAN_AGENDAS_Y_RECORDATORIOS.md, 6.1 a 6.1.3):
 *  - Visitas de 40 min, colchón de 30, anticipación de 1 h (TIPOS_AGENDA.INTERESADO).
 *  - Preguntas cortas antes de agendar (no bloquean):
 *      arriendo: cuántas personas van a vivir y a qué se dedica;
 *      venta: contado o crédito, y si tiene crédito preaprobado.
 *  - Solo inmuebles PUBLICADO ARRIENDO / VENTA.
 *  - Según cómo se entra al inmueble:
 *      llaves en portería o copia de llaves → agenda DIRECTO (queda por confirmar,
 *        con la misma línea de avisos que el propietario, más el de 72 h);
 *      con acompañamiento del propietario → COORDINADO. Mientras no exista el
 *        bloque 2, se guarda la solicitud con el horario que prefiere y se avisa al
 *        agente; en el bloque 2 ese pedido le llegará al propietario.
 *  - El agente recibe un aviso inmediato que dice cómo se entra al inmueble.
 *
 * Lo que se le muestra al público NO lleva la dirección exacta ni datos del
 * propietario: solo barrio, ciudad, tipo, precio y una foto. La dirección se le
 * da al interesado en su correo, una vez agendada la visita directa.
 */

const ESTADO_POR_COORDINAR = 'POR COORDINAR';
const URL_PAGINA_VISITA = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/visita.html';

/** Lee el inmueble por ID DE REGISTRO. null si no existe. */
function _inmueblePorId(idInmueble) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  const rango = sheet.getDataRange();
  const datos = rango.getValues();
  const formulas = rango.getFormulas();
  const h = datos[0].map(x => String(x).trim().toUpperCase());
  const col = (n) => h.indexOf(n.toUpperCase());
  const iId = col('ID DE REGISTRO');
  const id = String(idInmueble || '').trim();
  if (!id) return null;
  const i = datos.findIndex((f, k) => k > 0 && String(f[iId]).trim() === id);
  if (i < 1) return null;
  const f = datos[i];
  const v = (n) => { const c = col(n); return c < 0 ? '' : f[c]; };

  let barrio = '';
  h.forEach((nombre, k) => {
    if (!barrio && /SELECCIONA EL BARRIO|BARRIO COMERCIAL|ESCRIBA EL BARRIO/.test(nombre) && String(f[k]).trim()) barrio = String(f[k]).trim();
  });

  // Carpeta de contenido: viene como fórmula HYPERLINK o como texto
  let carpeta = v('LINK CARPETA DE CONTENIDO');
  const cCarpeta = col('LINK CARPETA DE CONTENIDO');
  const fCarpeta = cCarpeta >= 0 ? formulas[i][cCarpeta] : '';
  const m = fCarpeta && fCarpeta.match(/HYPERLINK\("([^"]+)"/i);
  if (m) carpeta = m[1];

  return {
    id: id,
    estado: String(v('ESTADO DEL INMUEBLE')).toUpperCase(),
    tipoInmueble: String(v('Selecciona el tipo de inmueble') || 'Inmueble'),
    barrio: barrio,
    ciudad: String(v('INGRESE LA CIUDAD DEL INMUEBLE') || ''),
    direccion: String(v('INGRESE LA DIRECCIÓN DEL INMUEBLE') || ''),
    habitaciones: v('N° DE HABITACIONES'),
    banos: v('N° DE BAÑOS'),
    area: v('AREA  M²'),
    precioGeneral: v('PRECIO DE PROMOCION GENERAL'),
    precioVenta: v('PRECIO DE PROMOCION EN VENTA'),
    // Se lee la columna que corresponde al tipo de negocio: tras un cambio de modelo
    // la otra puede conservar la autorización del año anterior (16-oct-2026)
    autorizacion: String((/Administraci|Admi-Venta/i.test(String(v('TIPO DE NEGOCIO')))
      ? v('¿Qué tipo de autorización desea con el agente para administración?') || v('¿Qué tipo de autorización desea con el agente?')
      : v('¿Qué tipo de autorización desea con el agente?') || v('¿Qué tipo de autorización desea con el agente para administración?')) || ''),
    carpeta: String(carpeta || ''),
    // Datos clave para la página pública. Se dejan fuera torre, número de
    // apartamento, garaje y depósito: identifican el inmueble exacto.
    estrato: String(v('¿Cual es el estrato?') || ''),
    piso: String(v('N° de piso') || ''),
    antiguedad: String(v('Antiguedad del Inmueble') || ''),
    garajes: String(v('N° de Garajes') || ''),
    administracion: Number(v('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)')) || 0,
    mascotas: String(v('¿Se permite mascota?') || ''),
    video: String(v('LINK DEL VIDEO DEL INMUEBLE') || ''),
    // Solo para el agendamiento coordinado (bloque 2): NUNCA van a la página pública.
    // infoInmuebleVisita elige sus campos uno por uno y no los incluye.
    propietario: String(v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || ''),
    correoPropietario: String(v('Correo electrónico') || '').trim(),
    celularPropietario: String(v('Celular') || '')
  };
}

/** Cómo se entra al inmueble: DIRECTO (portería o copia de llaves) o COORDINADO (con el propietario). */
function modoVisita(autorizacion) {
  const a = String(autorizacion || '').toLowerCase();
  if (/porter[ií]a|copia de las llaves/.test(a)) return 'DIRECTO';
  return 'COORDINADO';   // con acompañamiento, o sin respuesta: lo más seguro es coordinar
}

/** Qué negocios ofrece según su estado de publicación. */
function negociosDeEstado(estado) {
  const e = String(estado || '').toUpperCase();
  const out = [];
  if (/PUBLICADO ARRIENDO|VENTA\/RENTA/.test(e)) out.push('ARRIENDO');
  if (/PUBLICADO VENTA/.test(e)) out.push('VENTA');
  return out;
}

// Todas las fotos de la carpeta (Leonardo, 15-oct-2026). El tope solo protege la
// página si una carpeta trae cientos de archivos por error.
const MAX_FOTOS_VISITA = 200;

/**
 * Fotos de la carpeta FOTOGRAFÍAS, en orden de nombre (la portada primero), todas.
 * Cada una con su miniatura y su versión grande, públicas de Drive.
 */
function _fotosInmueble(carpeta) {
  try {
    const m = String(carpeta || '').match(/(?:id=|folders\/|d\/)([a-zA-Z0-9_-]{25,})/);
    if (!m) return [];
    const carpetas = DriveApp.getFolderById(m[1]).getFoldersByName('FOTOGRAFÍAS');
    if (!carpetas.hasNext()) return [];
    const archivos = carpetas.next().getFiles();
    const lista = [];
    while (archivos.hasNext()) {
      const a = archivos.next();
      if (String(a.getMimeType()).indexOf('image/') === 0) lista.push({ id: a.getId(), nombre: a.getName() });
    }
    lista.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { numeric: true }));
    return lista.slice(0, MAX_FOTOS_VISITA).map(f => ({
      mini: 'https://drive.google.com/thumbnail?id=' + f.id + '&sz=w400',
      grande: 'https://drive.google.com/thumbnail?id=' + f.id + '&sz=w1600'
    }));
  } catch (e) { Logger.log('Sin fotos: ' + e.message); return []; }
}

/**
 * Texto del Doc "DESCRIPCIÓN DE INMUEBLE" (carpeta DESCRIPCIÓN DE LA PUBLICACIÓN),
 * el que se genera al registrar el inmueble y se publica en redes.
 */
function _descripcionInmueble(carpeta) {
  try {
    const m = String(carpeta || '').match(/(?:id=|folders\/|d\/)([a-zA-Z0-9_-]{25,})/);
    if (!m) return '';
    const carpetas = DriveApp.getFolderById(m[1]).getFoldersByName('DESCRIPCIÓN DE LA PUBLICACIÓN');
    if (!carpetas.hasNext()) return '';
    const docs = carpetas.next().searchFiles("title contains 'DESCRIPCIÓN' and trashed = false");
    while (docs.hasNext()) {
      const d = docs.next();
      if (d.getMimeType() === MimeType.GOOGLE_DOCS) return DocumentApp.openById(d.getId()).getBody().getText().trim();
    }
  } catch (e) { Logger.log('Sin descripción: ' + e.message); }
  return '';
}

/** Primera foto de la carpeta FOTOGRAFÍAS, como miniatura pública de Drive. */
function _fotoPortadaInmueble(carpeta) {
  try {
    const m = String(carpeta || '').match(/(?:id=|folders\/|d\/)([a-zA-Z0-9_-]{25,})/);
    if (!m) return '';
    const fotos = DriveApp.getFolderById(m[1]).getFoldersByName('FOTOGRAFÍAS');
    if (!fotos.hasNext()) return '';
    const archivos = fotos.next().getFiles();
    while (archivos.hasNext()) {
      const a = archivos.next();
      if (String(a.getMimeType()).indexOf('image/') === 0) return 'https://drive.google.com/thumbnail?id=' + a.getId() + '&sz=w1000';
    }
  } catch (e) { Logger.log('Sin foto de portada: ' + e.message); }
  return '';
}

/**
 * Id de un video de YouTube y si es vertical (Short). null si no es de YouTube.
 * Acepta youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID y /embed/ID.
 */
function videoYoutube(url) {
  const u = String(url || '');
  const m = u.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? { id: m[1], vertical: /\/shorts\//.test(u) } : null;
}

/** Para la página pública: lo publicable del inmueble y cómo se agenda. */
function infoInmuebleVisita(datos) {
  try {
    const inm = _inmueblePorId(datos.i);
    if (!inm) return { ok: false, mensaje: 'No encontramos este inmueble.' };
    const negocios = negociosDeEstado(inm.estado);
    if (!negocios.length) return { ok: false, mensaje: 'Este inmueble ya no está disponible para visitas.' };
    return {
      ok: true,
      id: inm.id,
      tipoInmueble: inm.tipoInmueble,
      barrio: inm.barrio,
      ciudad: inm.ciudad,
      habitaciones: String(inm.habitaciones || ''),
      banos: String(inm.banos || ''),
      area: String(inm.area || ''),
      negocios: negocios,
      precioArriendo: Number(inm.precioGeneral) || 0,
      precioVenta: Number(inm.precioVenta) || Number(inm.precioGeneral) || 0,
      fotos: _fotosInmueble(inm.carpeta),
      descripcion: _descripcionInmueble(inm.carpeta),
      estrato: inm.estrato, piso: inm.piso, antiguedad: inm.antiguedad, garajes: inm.garajes,
      administracion: inm.administracion, mascotas: inm.mascotas,
      // La dirección ya es pública: va en el afiche y en la descripción (Leonardo, 15-oct-2026)
      direccion: inm.direccion,
      video: videoYoutube(inm.video),
      modo: modoVisita(inm.autorizacion),
      // Bloque 2: horarios en que el propietario ya puede (los días salen con punto dorado)
      cruce: modoVisita(inm.autorizacion) === 'COORDINADO' ? leerDisponibilidad(inm.id).bloques : []
    };
  } catch (e) {
    Logger.log('Error en infoInmuebleVisita: ' + e.message);
    return { ok: false, mensaje: 'No pudimos cargar el inmueble. Intenta de nuevo.' };
  }
}

/** Texto de las preguntas cortas, para la hoja, el calendario y el correo del agente. */
function textoPrecalificacion(negocio, p) {
  p = p || {};
  if (negocio === 'VENTA') {
    return 'Compra: ' + (p.pago || 'sin respuesta') + ' · Crédito preaprobado: ' + (p.preaprobado || 'sin respuesta');
  }
  return 'Personas que vivirán: ' + (p.personas || 'sin respuesta') + ' · Se dedica a: ' + (p.ocupacion || 'sin respuesta');
}

/**
 * Registra la visita.
 * datos: { i, negocio, precalificacion:{…}, nombre, celular, correo, timestamp }
 *   timestamp: en DIRECTO, el horario elegido; en COORDINADO, el que prefiere.
 */
function agendarVisitaInteresado(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const inm = _inmueblePorId(datos.i);
    if (!inm) return { success: false, error: 'No encontramos este inmueble.' };
    const negocios = negociosDeEstado(inm.estado);
    if (!negocios.length) return { success: false, error: 'Este inmueble ya no está disponible para visitas.' };
    const negocio = negocios.indexOf(datos.negocio) !== -1 ? datos.negocio : negocios[0];

    const nombre = String(datos.nombre || '').trim().slice(0, 120);
    const correo = String(datos.correo || '').trim().slice(0, 120);
    const celular = String(datos.celular || '').trim().slice(0, 30);
    if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || celular.replace(/\D/g, '').length < 7) {
      return { success: false, error: 'Revisa tu nombre, tu correo y tu celular.' };
    }

    const modo = modoVisita(inm.autorizacion);
    // Bloque 2: con acompañamiento del propietario se agenda en el cruce o se piden
    // hasta 3 horarios (AGENDA_COORDINADA.js)
    if (modo === 'COORDINADO') return solicitarVisitaCoordinada_(datos, inm, negocio, nombre, correo, celular);
    const inicio = new Date(Number(datos.timestamp));
    const tieneHora = !isNaN(inicio.getTime());
    if (modo === 'DIRECTO') {
      if (!tieneHora) return { success: false, error: 'Elige un horario.' };
      const disp = obtenerDisponibilidadAgenda(Utilities.formatDate(inicio, 'America/Bogota', 'yyyy-MM-dd'), 'INTERESADO');
      if (!disp.success || !disp.slots.some(s => s.timestamp === inicio.getTime())) {
        return { success: false, error: 'El horario acaba de ser ocupado. Por favor elige otro.' };
      }
    }

    const tz = Session.getScriptTimeZone();
    const idCita = 'CIT-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const precal = textoPrecalificacion(negocio, datos.precalificacion);
    const servicio = 'Visita · ' + (negocio === 'VENTA' ? 'Venta' : 'Arriendo');
    const lugar = [inm.barrio, inm.ciudad].filter(Boolean).join(', ');
    const direccionCompleta = [inm.direccion, lugar].filter(Boolean).join(' · ');
    const acceso = modo === 'DIRECTO'
      ? (/porter/i.test(inm.autorizacion) ? 'Llaves en portería' : 'Copia de las llaves')
      : 'Con acompañamiento del propietario';

    // Evento en Calendar (solo visitas directas: las coordinadas esperan al propietario)
    let idEvento = '';
    if (modo === 'DIRECTO') {
      const fin = new Date(inicio.getTime() + TIPOS_AGENDA.INTERESADO.duracionMin * 60000);
      const ev = CalendarApp.getDefaultCalendar().createEvent(
        `👥 VISITA ⏳ POR CONFIRMAR: ${inm.tipoInmueble} ${inm.barrio || ''} - ${nombre}`.replace(/\s+/g, ' '),
        inicio, fin, {
          description: `Visita de interesado (ID ${idCita}) al inmueble ${inm.id}\n` +
            `Acceso: ${acceso}\nInteresado: ${nombre}\nCelular: ${celular}\nCorreo: ${correo}\n` +
            `Negocio: ${negocio}\n${precal}`,
          location: direccionCompleta,
          guests: correo,
          sendInvites: false
        });
      idEvento = ev.getId();
    }

    // Fila en la hoja de citas
    const { sheet, col } = hojaCitasConColumnas();
    const tokenInteresado = Utilities.getUuid();
    const tokenAgente = Utilities.getUuid();
    const ahoraTxt = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss');
    const fila = new Array(Math.max(sheet.getLastColumn(), COLUMNAS_CITAS.length)).fill('');
    const poner = (n, valor) => { if (col[n]) fila[col[n] - 1] = valor; };
    poner('ID CITA', idCita);
    poner('FECHA CREACION', ahoraTxt);
    poner('ESTADO', modo === 'DIRECTO' ? ESTADOS_CITA.PENDIENTE : ESTADO_POR_COORDINAR);
    if (tieneHora) {
      poner('FECHA CITA', new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()));
      poner('HORA CITA', formatAmPm(inicio));
    }
    poner('NOMBRE', nombre);
    poner('CELULAR', celular);
    poner('CORREO', correo);
    poner('TIPO SERVICIO', servicio);
    poner('DIRECCION', direccionCompleta);
    poner('ID EVENTO CALENDAR', idEvento);
    poner('NOTAS', precal + ' · Acceso: ' + acceso);
    poner('TOKEN PROPIETARIO', tokenInteresado);   // el token de quien agenda (aquí, el interesado)
    poner('TOKEN AGENTE', tokenAgente);
    poner('ULTIMO CAMBIO', ahoraTxt + ' · ' + (modo === 'DIRECTO' ? 'agendada' : 'solicitud: coordinar con el propietario'));
    poner('TIPO AGENDA', 'INTERESADO');
    poner('ID INMUEBLE', inm.id);
    if (modo === 'DIRECTO') poner('ULTIMO AVISO', avisoVigenteCita((inicio.getTime() - Date.now()) / 60000, 'INTERESADO'));
    sheet.appendRow(fila);
    if (tieneHora && col['FECHA CITA']) sheet.getRange(sheet.getLastRow(), col['FECHA CITA']).setNumberFormat('dd/MM/yyyy');

    // Correo al interesado
    try {
      if (modo === 'DIRECTO') {
        enviarPasoCita('AGENDADA', correo, {
          idCita: idCita, token: tokenInteresado, nombre: nombre, servicio: servicio,
          direccion: direccionCompleta, inicio: inicio, duracionMin: TIPOS_AGENDA.INTERESADO.duracionMin
        });
      } else {
        enviarCorreoCita(correo, '📅 Recibimos tu solicitud de visita - Gold Life', 'SOLICITUD RECIBIDA', nombre,
          `Recibimos tu solicitud para visitar el ${inm.tipoInmueble.toLowerCase()} en <strong>${lugar || 'el inmueble'}</strong>.<br><br>` +
          (tieneHora ? `Nos dijiste que te queda bien el <strong>${Utilities.formatDate(inicio, tz, 'dd/MM/yyyy')} a las ${formatAmPm(inicio)}</strong>.<br><br>` : '') +
          'Este inmueble se visita con el propietario, así que coordinamos la hora con él y te escribimos para confirmarte.', '');
      }
    } catch (e) { Logger.log('Error enviando el correo al interesado: ' + e.message); }

    // Aviso inmediato al agente, con cómo se entra al inmueble
    try {
      const wa = celular.replace(/\D/g, '');
      enviarCorreoCita(
        correoAgenteCitas(),
        modo === 'DIRECTO'
          ? `👥 Nueva visita: ${nombre} · ${Utilities.formatDate(inicio, tz, 'dd/MM')} ${formatAmPm(inicio)} · ${inm.id}`
          : `👥 Coordinar visita con el propietario: ${nombre} · ${inm.id}`,
        modo === 'DIRECTO' ? 'NUEVA VISITA' : 'VISITA POR COORDINAR',
        'Agente',
        etiquetaTipoCitaHtml('INTERESADO') +
        `<strong>${nombre}</strong> quiere visitar el inmueble <strong>${inm.id}</strong> (${inm.tipoInmueble}, ${lugar || 'sin barrio'}).<br><br>` +
        (tieneHora ? `🗓️ <strong>${modo === 'DIRECTO' ? 'Visita' : 'Prefiere'}:</strong> ${Utilities.formatDate(inicio, tz, 'dd/MM/yyyy')} a las ${formatAmPm(inicio)}<br>` : '') +
        `🔑 <strong>Acceso:</strong> ${acceso}<br>` +
        `📍 <strong>Dirección:</strong> ${direccionCompleta || 'N/A'}<br>` +
        `💬 <strong>${negocio === 'VENTA' ? 'Venta' : 'Arriendo'}:</strong> ${precal}<br>` +
        `📞 ${celular} · ✉️ ${correo}` +
        (modo === 'DIRECTO' ? '' : '<br><br><strong>Este inmueble se visita con el propietario:</strong> coordina la hora con él y luego agenda la visita.'),
        wa ? htmlBotonesCorreo([
          { texto: '📞 Llamar', color: '#555555', url: 'tel:+' + (wa.length === 10 ? '57' + wa : wa) },
          { texto: '💬 WhatsApp', color: '#1f7a4d', url: 'https://wa.me/' + (wa.length === 10 ? '57' + wa : wa) }
        ]) : ''
      );
    } catch (e) { Logger.log('Error avisando al agente: ' + e.message); }

    return { success: true, idCita: idCita, modo: modo };
  } catch (e) {
    Logger.log('Error en agendarVisitaInteresado: ' + e.message);
    return { success: false, error: 'No pudimos agendar la visita. Intenta de nuevo.' };
  } finally {
    lock.releaseLock();
  }
}

/** Enlace público para agendar una visita a un inmueble (el que comparte el agente). */
function urlVisitaInmueble(idInmueble) {
  return URL_PAGINA_VISITA + '?i=' + encodeURIComponent(idInmueble);
}
