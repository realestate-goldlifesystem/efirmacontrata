/**
 * TEXTOS DE LOS CORREOS DE UNA CITA, paso por paso (oct-2026, bloque 3 del plan)
 *
 * Decidido con Leonardo el 14-oct-2026:
 *   - Al agendar y en los recordatorios (48 h, 24 h, 3 h, 2 h): solo informar.
 *     Sin botones; al final, una línea pequeña "¿No puedes asistir? Cambiar fecha ·
 *     Cancelar cita", para que pueda avisar con tiempo.
 *   - Faltando 60, 45 y 30 minutos: pedir la confirmación con los botones
 *     Confirmar / Reagendar / Cancelar (solo si aún no confirmó).
 *   - Si no confirma, la cita se libera y le llega el botón para elegir otro horario.
 *
 * correoPasoCita() solo arma el contenido; enviarCorreoCita() (API_AGENDA.js) lo envía
 * con la plantilla email_cita.html.
 */

// ---------- Puras: qué aviso toca (probadas en _herramientas_locales/test_avisos_cita.js) ----------

// Avisos en orden, con los minutos que faltan para la cita cuando les toca salir.
const ORDEN_AVISOS_CITA = [['H48', 2880], ['H24', 1440], ['H3', 180], ['H2', 120], ['M60', 60], ['M45', 45], ['M30', 30]];
// Las visitas de interesados empiezan 3 días antes (plan 6.1.2): uno por día, 72, 48 y 24 h
const ORDEN_AVISOS_INTERESADO = [['H72', 4320]].concat(ORDEN_AVISOS_CITA);
const ordenAvisosDe = (tipo) => String(tipo || '').toUpperCase() === 'INTERESADO' ? ORDEN_AVISOS_INTERESADO : ORDEN_AVISOS_CITA;
// La cita se libera si, faltando 25 min o menos, ya salió algún aviso de
// confirmación y pasaron al menos 5 min sin respuesta (el margen que pidió Leonardo).
const LIBERAR_FALTANDO_MIN = 25;
const MARGEN_RESPUESTA_MIN = 5;

/** El aviso más reciente cuyo momento ya llegó ('' si ninguno). */
function avisoVigenteCita(minFaltan, tipo) {
  let paso = '';
  ordenAvisosDe(tipo).forEach(([p, umbral]) => { if (minFaltan <= umbral) paso = p; });
  return paso;
}

/**
 * Qué aviso hay que mandar ahora, o null.
 * Solo el más reciente: si el motor se atrasó, no se mandan varios de golpe.
 * Las citas ya confirmadas no reciben los avisos de confirmar (M60, M45, M30).
 */
function avisoQueTocaCita(minFaltan, ultimoPaso, confirmada, tipo) {
  if (minFaltan <= 0) return null;
  const orden = ordenAvisosDe(tipo).map(x => x[0]);
  const vigente = avisoVigenteCita(minFaltan, tipo);
  if (!vigente || orden.indexOf(vigente) <= orden.indexOf(ultimoPaso || '')) return null;
  if (confirmada && vigente.charAt(0) === 'M') return null;
  return vigente;
}

/** ¿Hay que liberar la cita por falta de confirmación? */
function debeLiberarCita(minFaltan, ultimoPaso, minDesdeUltimoAviso, pendiente) {
  return !!pendiente && String(ultimoPaso || '').charAt(0) === 'M' &&
    minFaltan <= LIBERAR_FALTANDO_MIN && minDesdeUltimoAviso >= MARGEN_RESPUESTA_MIN;
}

/**
 * Etiqueta de color con el tipo de cita, para los correos del agente. Mismos
 * nombres y colores que en la Agenda del panel (CitasAgendaPanel.tsx).
 */
const ETIQUETA_TIPO_CITA = {
  PROPIETARIO: { texto: 'Presentación al propietario', fondo: '#d4af37', letra: '#1c1917' },
  INTERESADO:  { texto: 'Visita de interesado',        fondo: '#6366f1', letra: '#ffffff' },
  ENTREGA:     { texto: 'Entrega del inmueble',        fondo: '#06b6d4', letra: '#1c1917' },
  DEVOLUCION:  { texto: 'Recibo del inmueble',         fondo: '#d946ef', letra: '#ffffff' }
};
function etiquetaTipoCitaHtml(tipo) {
  const e = ETIQUETA_TIPO_CITA[String(tipo || '').trim().toUpperCase()] || ETIQUETA_TIPO_CITA.PROPIETARIO;
  return `<div style="text-align:center;margin:0 0 14px 0;"><span style="display:inline-block;padding:6px 14px;border-radius:999px;` +
    `background:${e.fondo};color:${e.letra};font-size:12px;font-weight:bold;letter-spacing:.5px;">${e.texto}</span></div>`;
}

const PASOS_CORREO_CITA = {
  AGENDADA: { asunto: 'Tu cita quedó agendada', titulo: 'VISITA AGENDADA' },
  REAGENDADA: { asunto: 'Tu cita cambió de fecha', titulo: 'CITA REAGENDADA' },
  H72:      { asunto: 'Tienes una cita en 3 días', titulo: 'RECORDATORIO' },
  H48:      { asunto: 'Tienes una cita en 2 días', titulo: 'RECORDATORIO' },
  H24:      { asunto: 'Tienes una cita mañana', titulo: 'RECORDATORIO' },
  H3:       { asunto: 'Tienes una cita en 3 horas', titulo: 'RECORDATORIO' },
  H2:       { asunto: 'Tienes una cita en 2 horas', titulo: 'RECORDATORIO' },
  M60:      { asunto: 'Confirma tu cita de hoy', titulo: 'CONFIRMA TU CITA' },
  M45:      { asunto: 'Segundo aviso: confirma tu cita', titulo: 'CONFIRMA TU CITA' },
  M30:      { asunto: 'Último aviso: confirma tu cita', titulo: 'ÚLTIMO AVISO' },
  // Respuesta a lo que hizo la persona desde su correo
  CONFIRMADA: { asunto: 'Tu cita quedó confirmada', titulo: 'CITA CONFIRMADA' },
  CANCELADA:  { asunto: 'Tu cita quedó cancelada', titulo: 'CITA CANCELADA' }
};

/** Los datos de una fila de citas tal como los usa correoPasoCita. */
function datosCorreoDeCita(fila, col) {
  const tipo = String(valorCita(fila, col, 'TIPO AGENDA') || '').trim().toUpperCase();
  return {
    idCita: String(valorCita(fila, col, 'ID CITA') || ''),
    idInmueble: tipo === 'INTERESADO' ? String(valorCita(fila, col, 'ID INMUEBLE') || '') : '',
    token: String(valorCita(fila, col, 'TOKEN PROPIETARIO') || ''),
    nombre: String(valorCita(fila, col, 'NOMBRE') || ''),
    servicio: String(valorCita(fila, col, 'TIPO SERVICIO') || ''),
    direccion: String(valorCita(fila, col, 'DIRECCION') || ''),
    inicio: fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'))
  };
}

/** "Agendar de nuevo": a la visita del mismo inmueble, o al portafolio. */
function urlAgendarDeNuevo(idInmueble) {
  return idInmueble ? urlVisitaInmueble(idInmueble) : 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/';
}

/**
 * @param {string} paso   clave de PASOS_CORREO_CITA
 * @param {Object} c      { idCita, token, nombre, servicio, direccion, inicio: Date }
 * @return {{asunto, titulo, nombre, mensaje, secundario}}
 */
function correoPasoCita(paso, c) {
  const cfg = PASOS_CORREO_CITA[paso];
  const tz = Session.getScriptTimeZone();
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const d = c.inicio;
  const fechaLarga = dias[d.getDay()].charAt(0).toUpperCase() + dias[d.getDay()].slice(1) + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];
  const hora = formatAmPm(d);

  // Tarjeta con la fecha y la hora, igual en todos los pasos
  const tarjeta =
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-radius:12px;background:#1c1917;">' +
    '<tr><td style="padding:16px 18px;">' +
    `<div style="color:#d4af37;font-size:12px;letter-spacing:2px;font-weight:bold;">TU CITA</div>` +
    `<div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:4px;">${fechaLarga}</div>` +
    `<div style="color:#e7e5e4;font-size:16px;margin-top:2px;">${hora} · ${c.servicio || 'Visita'}</div>` +
    (c.direccion ? `<div style="color:#a8a29e;font-size:14px;margin-top:6px;">📍 ${c.direccion}</div>` : '') +
    // Visitas de interesados: el enlace al inmueble, para que sepa cuál fue el que agendó
    // (con ver=cita la página solo muestra el inmueble, sin el botón de agendar)
    (c.idInmueble && paso !== 'CANCELADA' ? `<div style="margin-top:12px;"><a href="${urlVisitaInmueble(c.idInmueble)}&ver=cita" style="display:inline-block;padding:9px 16px;border-radius:999px;` +
      `border:1px solid #d4af37;color:#d4af37;font-size:14px;font-weight:bold;text-decoration:none;">🏠 Ver el inmueble</a></div>` : '') +
    '</td></tr></table>';

  // Línea pequeña para cambiar o cancelar, en los correos sin botones
  const lineaCambio =
    '<p style="margin:18px 0 0 0;font-size:13px;color:#78716c;text-align:center;">¿No puedes asistir?<br>' +
    // Mismo orden que los botones: cancelar a la izquierda, lo positivo a la derecha (pulgar)
    `<a href="${urlEstadoCita(c.idCita, ESTADOS_CITA.CANCELADA, c.token)}" style="color:#a16207;">Cancelar cita</a> · ` +
    `<a href="${urlEstadoCita(c.idCita, ESTADOS_CITA.QUIERE_REAGENDAR, c.token)}" style="color:#a16207;">Cambiar fecha</a></p>`;

  // "Guardar en mi calendario": enlace a Google Calendar con la cita ya llena. Para
  // Outlook o Apple va además el archivo .ics adjunto (archivoCalendarioCita).
  const lineaCalendario =
    '<p style="margin:16px 0 0 0;font-size:13px;text-align:center;">📅 ' +
    `<a href="${urlGoogleCalendarCita(c)}" style="color:#a16207;font-weight:bold;">Guardar en mi calendario</a></p>`;

  let mensaje, secundario;
  switch (paso) {
    case 'AGENDADA':
      mensaje = 'Tu cita quedó agendada.' + tarjeta + 'Te avisaremos antes de la cita. <strong>Una hora antes te pediremos que la confirmes.</strong>';
      secundario = lineaCalendario + lineaCambio;
      break;
    case 'REAGENDADA':
      // c.confirmada: la movió el agente tras hablar con él (queda confirmada)
      mensaje = 'Tu cita quedó en la nueva fecha.' + tarjeta +
        (c.confirmada ? '¡Te esperamos!' : 'Te avisaremos antes de la cita. <strong>Una hora antes te pediremos que la confirmes.</strong>');
      secundario = lineaCalendario + lineaCambio;
      break;
    case 'H72':
      mensaje = 'Te recordamos que tienes una cita <strong>en 3 días</strong>.' + tarjeta;
      secundario = lineaCambio;
      break;
    case 'H48':
      mensaje = 'Te recordamos que tienes una cita <strong>en 2 días</strong>.' + tarjeta;
      secundario = lineaCambio;
      break;
    case 'H24':
      mensaje = 'Te recordamos que tienes una cita <strong>mañana</strong>.' + tarjeta;
      secundario = lineaCambio;
      break;
    case 'H3':
      mensaje = 'Tu cita es <strong>hoy, en 3 horas</strong>.' + tarjeta;
      secundario = lineaCambio;
      break;
    case 'H2':
      mensaje = 'Tu cita es <strong>en 2 horas</strong>.' + tarjeta + 'En una hora te pediremos que la confirmes.';
      secundario = lineaCambio;
      break;
    case 'M60':
    case 'M45':
    case 'M30': {
      const falta = { M60: '1 hora', M45: '45 minutos', M30: '30 minutos' }[paso];
      mensaje = `Tu cita es <strong>en ${falta}</strong>. Por favor confírmala para que te esperemos.` + tarjeta +
        (paso === 'M30' && !c.noLibera
          ? '<strong>Si no la confirmas en los próximos minutos, liberaremos el horario.</strong>'
          : '<strong>Confirma con el botón verde.</strong>');
      secundario = botonesPropietarioCita(c.idCita, c.token);
      break;
    }
    case 'CONFIRMADA':
      mensaje = '¡Listo! Tu cita quedó <strong>confirmada</strong>.' + tarjeta + 'Te esperamos.';
      secundario = lineaCambio;
      break;
    case 'CANCELADA':
      mensaje = 'Tu cita quedó <strong>cancelada</strong>, como lo pediste.' + tarjeta +
        'Si cambias de opinión, puedes agendar de nuevo cuando quieras.';
      secundario = htmlBotonesCorreo([{ texto: '📅 Agendar de nuevo', color: '#b8860b', url: urlAgendarDeNuevo(c.idInmueble) }]);
      break;
    default:
      throw new Error('Paso de correo desconocido: ' + paso);
  }
  return { asunto: ({ CONFIRMADA: '✅ ', CANCELADA: '❌ ' }[paso] || (paso.charAt(0) === 'M' ? '⏰ ' : '📅 ')) + cfg.asunto + ' - Gold Life', titulo: cfg.titulo, nombre: c.nombre, mensaje: mensaje, secundario: secundario };
}

/** Arma y envía un paso. */
function enviarPasoCita(paso, correo, c) {
  const m = correoPasoCita(paso, c);
  if (c.extra) m.mensaje += c.extra;
  // Al agendar y al reagendar va adjunta la cita para el calendario (Outlook, Apple…)
  const adjuntos = (paso === 'AGENDADA' || paso === 'REAGENDADA') ? [archivoCalendarioCita(c)] : null;
  enviarCorreoCita(correo, m.asunto, m.titulo, m.nombre, m.mensaje, m.secundario, adjuntos);
}

// ---------- La cita en el calendario del propietario ----------
// En Gmail aparece sola: el evento de Calendar lo lleva como invitado (sin el
// correo de invitación de Google). Para los demás: enlace y archivo .ics.

const DURACION_CITA_CALENDARIO_MIN = 60;
function fechaCalendarioUtc(d) { return Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'"); }

/** Enlace que abre Google Calendar con la cita lista para guardar. */
function urlGoogleCalendarCita(c) {
  const fin = new Date(c.inicio.getTime() + (c.duracionMin || DURACION_CITA_CALENDARIO_MIN) * 60000);
  const p = {
    action: 'TEMPLATE',
    text: 'Cita Gold Life Real Estate' + (c.servicio ? ' · ' + c.servicio : ''),
    dates: fechaCalendarioUtc(c.inicio) + '/' + fechaCalendarioUtc(fin),
    details: 'Tu cita con Gold Life Real Estate (ID ' + c.idCita + '). Te avisaremos antes por correo.',
    location: c.direccion || ''
  };
  return 'https://calendar.google.com/calendar/render?' +
    Object.keys(p).map(k => k + '=' + encodeURIComponent(p[k])).join('&');
}

/** La cita como archivo .ics: Outlook y Apple Mail lo muestran con "Agregar al calendario". */
function archivoCalendarioCita(c) {
  const fin = new Date(c.inicio.getTime() + (c.duracionMin || DURACION_CITA_CALENDARIO_MIN) * 60000);
  // En .ics las comas, puntos y comas y barras van escapados, y nada de saltos de línea
  const limpio = (t) => String(t || '').replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, ' ');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gold Life Real Estate//Citas//ES', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + c.idCita + '@goldlife-realestate',
    'DTSTAMP:' + fechaCalendarioUtc(new Date()),
    'DTSTART:' + fechaCalendarioUtc(c.inicio),
    'DTEND:' + fechaCalendarioUtc(fin),
    'SUMMARY:' + limpio('Cita Gold Life Real Estate' + (c.servicio ? ' · ' + c.servicio : '')),
    'LOCATION:' + limpio(c.direccion),
    'DESCRIPTION:' + limpio('Tu cita con Gold Life Real Estate (ID ' + c.idCita + ').'),
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  return Utilities.newBlob(ics, 'text/calendar', 'cita-gold-life.ics');
}
