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

const PASOS_CORREO_CITA = {
  AGENDADA: { asunto: 'Tu cita quedó agendada', titulo: 'VISITA AGENDADA' },
  H48:      { asunto: 'Tienes una cita en 2 días', titulo: 'RECORDATORIO' },
  H24:      { asunto: 'Tienes una cita mañana', titulo: 'RECORDATORIO' },
  H3:       { asunto: 'Tienes una cita en 3 horas', titulo: 'RECORDATORIO' },
  H2:       { asunto: 'Tienes una cita en 2 horas', titulo: 'RECORDATORIO' },
  M60:      { asunto: 'Confirma tu cita de hoy', titulo: 'CONFIRMA TU CITA' },
  M45:      { asunto: 'Segundo aviso: confirma tu cita', titulo: 'CONFIRMA TU CITA' },
  M30:      { asunto: 'Último aviso: confirma tu cita', titulo: 'ÚLTIMO AVISO' }
};

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
    '</td></tr></table>';

  // Línea pequeña para cambiar o cancelar, en los correos sin botones
  const lineaCambio =
    '<p style="margin:18px 0 0 0;font-size:13px;color:#78716c;text-align:center;">¿No puedes asistir?<br>' +
    `<a href="${urlEstadoCita(c.idCita, ESTADOS_CITA.QUIERE_REAGENDAR, c.token)}" style="color:#a16207;">Cambiar fecha</a> · ` +
    `<a href="${urlEstadoCita(c.idCita, ESTADOS_CITA.CANCELADA, c.token)}" style="color:#a16207;">Cancelar cita</a></p>`;

  let mensaje, secundario;
  switch (paso) {
    case 'AGENDADA':
      mensaje = 'Tu cita quedó agendada.' + tarjeta + 'Te avisaremos antes de la cita. <strong>Una hora antes te pediremos que la confirmes.</strong>';
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
        (paso === 'M30'
          ? '<strong>Si no la confirmas en los próximos minutos, liberaremos el horario.</strong>'
          : '<strong>Confirma con el botón verde.</strong>');
      secundario = botonesPropietarioCita(c.idCita, c.token);
      break;
    }
    default:
      throw new Error('Paso de correo desconocido: ' + paso);
  }
  return { asunto: (paso.charAt(0) === 'M' ? '⏰ ' : '📅 ') + cfg.asunto + ' - Gold Life', titulo: cfg.titulo, nombre: c.nombre, mensaje: mensaje, secundario: secundario };
}

/** Arma y envía un paso. */
function enviarPasoCita(paso, correo, c) {
  const m = correoPasoCita(paso, c);
  enviarCorreoCita(correo, m.asunto, m.titulo, m.nombre, m.mensaje, m.secundario);
}
