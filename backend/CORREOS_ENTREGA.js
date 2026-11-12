/**
 * Correos de la entrega y la mudanza como UN proceso de dos pasos (Leonardo, 11-nov-2026):
 *   · Al acordar la entrega: "Paso 1 listo" — la entrega va como resumen pequeño y lo
 *     principal es elegir la mudanza (antes se sentía como un cierre con otra tarea pegada).
 *   · Cuando todo queda listo (entrega + mudanza aprobada + documento a la administración):
 *     "¡Todo listo para tu llegada!" — las dos fechas en una tarjeta, con los botones de siempre.
 * Muestra local: _herramientas_locales/preview_entrega_mudanza.js
 */

const MESES_CORREO_ENTREGA_ = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORREO_ENTREGA_ = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
function _diaCorreoEntrega_(d) { return DIAS_CORREO_ENTREGA_[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES_CORREO_ENTREGA_[d.getMonth()]; }

/** Indicador de pasos: estados = ['hecho'|'actual'|'pendiente', x3] para Entrega, Mudanza, Todo listo. */
function pasosEntregaHtml_(estados) {
  const paso = (n, txt, est) => {
    const c = est === 'hecho' ? ['#1c1917', '#d4af37', '✓'] : est === 'actual' ? ['#b8860b', '#ffffff', n] : ['#e7e5e4', '#a8a29e', n];
    return `<td align="center" style="width:33%;"><div style="width:30px;height:30px;line-height:30px;border-radius:15px;background:${c[0]};color:${c[1]};font-weight:bold;font-size:14px;margin:0 auto;">${c[2]}</div>` +
      `<div style="font-size:12px;color:${est === 'pendiente' ? '#a8a29e' : '#1c1917'};margin-top:6px;font-weight:${est === 'actual' ? 'bold' : 'normal'};">${txt}</div></td>`;
  };
  const linea = (on) => `<td style="width:10%;"><div style="height:2px;background:${on ? '#d4af37' : '#e7e5e4'};margin-bottom:18px;"></div></td>`;
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 18px;"><tr>' +
    paso('1', 'Entrega', estados[0]) + linea(estados[0] === 'hecho') + paso('2', 'Mudanza', estados[1]) + linea(estados[1] === 'hecho') +
    paso('3', 'Todo listo', estados[2]) + '</tr></table>';
}

/**
 * Paso 1: la entrega quedó acordada. c = { inicio, direccion }. m = datos de mudanza (o null).
 * Si el inquilino ya había propuesto mudanza, el paso 2 dice que la revisa el propietario.
 */
function mensajePaso1Entrega_(c, m, urlSala) {
  const yaPropuso = !!(m && m.mudanza);
  const resumen = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 6px;border:1px solid #e7e5e4;border-radius:12px;"><tr><td style="padding:12px 16px;">' +
    '<div style="color:#a16207;font-size:11px;letter-spacing:2px;font-weight:bold;">✓ ENTREGA ACORDADA</div>' +
    `<div style="color:#1c1917;font-size:16px;font-weight:bold;margin-top:3px;">${_diaCorreoEntrega_(c.inicio)} · ${formatAmPm(c.inicio)}</div>` +
    (c.direccion ? `<div style="color:#78716c;font-size:13px;margin-top:2px;">${c.direccion}</div>` : '') + '</td></tr></table>';
  const boton = (txt) => '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 4px;"><tr><td align="center">' +
    `<a href="${urlSala}" style="display:block;background:#b8860b;color:#ffffff;font-weight:bold;font-size:16px;padding:15px;border-radius:12px;text-decoration:none;">${txt}</a></td></tr></table>`;
  const mensaje = pasosEntregaHtml_(['hecho', 'actual', 'pendiente']) + 'Ya tienes fecha para recibir tu nuevo hogar. 🎉' + resumen +
    (yaPropuso
      ? '<div style="margin-top:20px;font-size:18px;font-weight:bold;color:#1c1917;">Tu mudanza está en revisión</div>' +
        `<div style="color:#57534e;margin-top:6px;">Propusiste el <strong>${_textoMudanza_(m)}</strong>. El propietario la revisa y te avisamos.</div>` + boton('🔑 Ver mi sala de entrega')
      : '<div style="margin-top:20px;font-size:18px;font-weight:bold;color:#1c1917;">Ahora elige el día de tu mudanza</div>' +
        '<div style="color:#57534e;margin-top:6px;">Siempre después de la entrega. Así coordinamos con la administración del conjunto el ingreso de tus cosas.</div>' + boton('🚚 Elegir mi mudanza')) +
    '<p style="margin:10px 0 0;font-size:13px;color:#78716c;text-align:center;">Antes de la entrega te avisaremos y una hora antes te pediremos que la confirmes.</p>';
  return { asunto: `🔑 Paso 1 listo: tu entrega es el ${_textoHorario(c.inicio.getTime())} - Gold Life`, titulo: 'PASO 1 LISTO', mensaje: mensaje };
}

/** Cierre: entrega + mudanza en una tarjeta. s = sala (rol inquilino), fila = fila fresca de la cita. */
function correoTodoListoEntrega_(s, fila) {
  const col = s.cita.col;
  const para = s.d.correoInquilino;
  if (!para) return;
  const inicio = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
  const m = _datosMudanzaDe(fila, col) || {};
  const mud = m.mudanza ? new Date(m.mudanza + 'T' + (m.horaMudanza || '12:00') + ':00-05:00') : null;
  const c = { idCita: String(valorCita(fila, col, 'ID CITA')), token: String(valorCita(fila, col, 'TOKEN PROPIETARIO') || ''), nombre: s.d.inquilino,
    servicio: 'Entrega del inmueble', esEntrega: true, direccion: s.d.direccion, inicio: inicio, duracionMin: TIPOS_AGENDA.ENTREGA.duracionMin };
  const bloque = (et, d, hora, extra) => `<div style="color:#d4af37;font-size:12px;letter-spacing:2px;font-weight:bold;">${et}</div>` +
    `<div style="color:#ffffff;font-size:19px;font-weight:bold;margin-top:4px;">${_diaCorreoEntrega_(d)}</div>` +
    `<div style="color:#e7e5e4;font-size:15px;margin-top:2px;">${hora ? hora + ' · ' : ''}${extra}</div>`;
  const tarjeta = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-radius:12px;background:#1c1917;"><tr><td style="padding:16px 18px;">' +
    bloque('🔑 ENTREGA', inicio, formatAmPm(inicio), 'Recibes el inmueble') +
    (mud ? '<div style="border-top:1px solid #33302d;margin:14px 0;"></div>' + bloque('🚚 MUDANZA', mud, m.horaMudanza ? formatAmPm(mud) : '', 'Ingreso de tus cosas') : '') +
    (c.direccion ? `<div style="color:#a8a29e;font-size:14px;margin-top:12px;"><img src="${ICONOS_CORREO_CITA}ruta.png" width="14" height="14" alt="" style="vertical-align:-2px;margin-right:6px;border:0;">${c.direccion}</div>` : '') +
    botonesTarjetaCita_(c, _diaCorreoEntrega_(inicio), formatAmPm(inicio)) + '</td></tr></table>';
  const mensaje = pasosEntregaHtml_(['hecho', 'hecho', 'hecho']) +
    '<strong>Ya está todo coordinado para tu llegada.</strong> Con estas fechas preparamos los documentos para la administración del conjunto.' + tarjeta +
    'Te avisaremos antes de cada fecha. <strong>Una hora antes de la entrega te pediremos que la confirmes.</strong>';
  const urlSala = urlSalaEntrega(c.idCita, 'i', c.token);
  const secundario = '<p style="margin:16px 0 0 0;font-size:13px;text-align:center;">📅 ' +
    `<a href="${urlGoogleCalendarCita(c)}" style="color:#a16207;font-weight:bold;">Guardar en mi calendario</a> · <a href="${urlSala}" style="color:#a16207;">Ver mi sala de entrega</a></p>`;
  enviarCorreoCita(para, '✅ ¡Todo listo para tu llegada! - Gold Life', '¡TODO LISTO!', String(s.d.inquilino || '').split(' ')[0], mensaje, secundario, [archivoCalendarioCita(c)]);
}
