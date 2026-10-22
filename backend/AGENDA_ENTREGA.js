/**
 * SALA DE ENTREGA — bloque 4 del plan de agendas (oct-2026)
 *
 * Al cargar el contrato autenticado se abre una cita de ENTREGA del inmueble
 * (una fila más de "2 - AGENDA CITAS", TIPO AGENDA = ENTREGA, MODO VISITA = ENTREGA).
 * Inquilino y propietario negocian la fecha con la misma mecánica de las visitas
 * con acompañamiento (PLAN_AGENDAS_Y_RECORDATORIOS.md, 6.3 y decisiones del 22-oct):
 *   - el que entre primero propone 3 horarios libres de Leonardo (quedan apartados);
 *   - el otro acepta uno ("Me sirve" + deslizar) o propone otros 3; los que no le
 *     sirvieron quedan en HORARIOS DESCARTADOS y no se vuelven a ofrecer;
 *   - al coincidir, la cita queda PENDIENTE (por confirmar) en el calendario.
 * Diferencias con las visitas: dura 60 min; si no confirman a tiempo NO se libera
 * (se avisa a Leonardo); al empezar, a Leonardo le llega "¿Ya se hizo la entrega?".
 *
 * Personas de la fila: NOMBRE / CORREO / CELULAR = inquilino; su token es
 * TOKEN PROPIETARIO (el token de "quien agenda", igual que en las visitas). El
 * propietario entra con un token HMAC de la cita (no se guarda; se recalcula).
 * PROPUESTO POR dice quién hizo la última propuesta: INQUILINO o PROPIETARIO.
 */

const MODO_ENTREGA = 'ENTREGA';
const URL_SALA_ENTREGA = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/sala_entrega.html';
const ROLES_ENTREGA = { i: 'INQUILINO', p: 'PROPIETARIO' };
// Sin respuesta del otro en este tiempo → aviso a Leonardo para que llame (una vez por ronda)
const HORAS_AVISO_ENTREGA = 24;

function _tokenPropietarioEntrega(idCita) {
  const firma = Utilities.computeHmacSha256Signature('ENTREGA:' + String(idCita), _secretoCoordinar());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 32);
}

function urlSalaEntrega(idCita, rol, token) {
  return URL_SALA_ENTREGA + '?c=' + encodeURIComponent(idCita) + '&r=' + rol + '&t=' + encodeURIComponent(token);
}

/** Datos del inquilino, del propietario y de la dirección, desde la fila de 1.1. */
function _datosEntregaInmueble_(idInmueble) {
  const inm = _inmueblePorId(idInmueble);
  if (!inm) return null;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  const datos = sheet.getDataRange().getValues();
  const h = datos[0].map(x => String(x).trim());
  const f = datos.find((r, k) => k > 0 && String(r[h.indexOf('ID DE REGISTRO')]).trim() === String(idInmueble).trim());
  const v = (n) => { const c = h.indexOf(n); return c < 0 || !f ? '' : String(f[c] || '').trim(); };
  return {
    inm: inm,
    inquilino: v('NOMBRE COMPLETO INQUILINO'),
    correoInquilino: v('CORREO INQUILINO'),
    celularInquilino: v('CELULAR INQUILINO'),
    direccion: [inm.direccion, [inm.barrio, inm.ciudad].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
  };
}

/** La cita de entrega abierta de un inmueble (no cancelada ni cerrada), o null. */
function _citaEntregaAbierta_(idInmueble) {
  const { sheet, col } = hojaCitasConColumnas();
  const ultima = sheet.getLastRow();
  if (ultima < 2) return null;
  const filas = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
  const cerradas = [ESTADOS_CITA.CANCELADA, ESTADOS_CITA.ASISTIDA, ESTADOS_CITA.INASISTIDA, ESTADOS_CITA.SIN_RESPUESTA];
  const i = filas.findIndex(f => String(valorCita(f, col, 'TIPO AGENDA')) === 'ENTREGA' &&
    String(valorCita(f, col, 'ID INMUEBLE')) === String(idInmueble) && cerradas.indexOf(String(valorCita(f, col, 'ESTADO')).trim()) === -1);
  return i === -1 ? null : { sheet: sheet, col: col, numFila: i + 2, fila: filas[i] };
}

/**
 * Abre la sala de entrega: crea la cita y les escribe al inquilino y al propietario.
 * La llama guardarContratoAutenticado (GESTOR DE DOCUMENTOS.js) al cargar el contrato.
 * Si ya hay una abierta para el inmueble, no crea otra.
 */
function abrirSalaEntrega(idInmueble) {
  try {
    if (_citaEntregaAbierta_(idInmueble)) return { ok: true, yaAbierta: true };
    const d = _datosEntregaInmueble_(idInmueble);
    if (!d) return { ok: false, error: 'No encontramos el inmueble ' + idInmueble };
    if (!d.correoInquilino) return { ok: false, error: 'El inmueble no tiene correo del inquilino' };

    const tz = Session.getScriptTimeZone();
    const ahoraTxt = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss');
    const idCita = 'CIT-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const tokenInq = Utilities.getUuid();
    const { sheet, col } = hojaCitasConColumnas();
    const fila = new Array(Math.max(sheet.getLastColumn(), COLUMNAS_CITAS.length)).fill('');
    const poner = (n, valor) => { if (col[n]) fila[col[n] - 1] = valor; };
    poner('ID CITA', idCita);
    poner('FECHA CREACION', ahoraTxt);
    poner('ESTADO', ESTADO_POR_COORDINAR);
    poner('NOMBRE', d.inquilino);
    poner('CELULAR', d.celularInquilino);
    poner('CORREO', d.correoInquilino);
    poner('TIPO SERVICIO', 'Entrega del inmueble');
    poner('DIRECCION', d.direccion);
    poner('TOKEN PROPIETARIO', tokenInq);
    poner('TOKEN AGENTE', Utilities.getUuid());
    poner('ULTIMO CAMBIO', ahoraTxt + ' · sala de entrega abierta');
    poner('TIPO AGENDA', 'ENTREGA');
    poner('ID INMUEBLE', idInmueble);
    poner('MODO VISITA', MODO_ENTREGA);
    poner('FECHA ULTIMO AVISO', new Date());
    sheet.appendRow(fila);

    const lugar = d.inm.tipoInmueble.toLowerCase() + ' en <strong>' + (d.inm.barrio || d.inm.direccion || 'el inmueble') + '</strong>';
    const explicar = 'Elige 3 horarios en que puedas y le preguntamos a la otra parte cuál le sirve. ' +
      'Si ninguno le sirve, propone otros y así hasta que coincidan. La entrega dura alrededor de una hora.';
    try {
      enviarCorreoCita(d.correoInquilino, '🔑 Agenda la entrega de tu nuevo hogar - Gold Life', 'AGENDA LA ENTREGA', d.inquilino.split(' ')[0],
        `Tu contrato quedó listo. Ahora agendemos la entrega del ${lugar}, junto con el propietario.<br><br>${explicar}`,
        htmlBotonesCorreo([{ texto: '🔑 Agendar la entrega', color: '#b8860b', url: urlSalaEntrega(idCita, 'i', tokenInq) }]));
    } catch (e) { Logger.log('No se pudo invitar al inquilino a la entrega: ' + e.message); }
    try {
      if (d.inm.correoPropietario) {
        enviarCorreoCita(d.inm.correoPropietario, '🔑 Agenda la entrega de tu inmueble - Gold Life', 'AGENDA LA ENTREGA', String(d.inm.propietario || '').split(' ')[0],
          `El contrato quedó listo. Ahora agendemos la entrega de tu ${lugar} a <strong>${d.inquilino}</strong>.<br><br>${explicar}` +
          '<br><br>Aunque no vayas a estar en la entrega, la fecha la aprobamos entre todos.',
          htmlBotonesCorreo([{ texto: '🔑 Agendar la entrega', color: '#b8860b', url: urlSalaEntrega(idCita, 'p', _tokenPropietarioEntrega(idCita)) }]));
      }
    } catch (e) { Logger.log('No se pudo invitar al propietario a la entrega: ' + e.message); }
    return { ok: true, idCita: idCita };
  } catch (e) {
    Logger.log('Error abriendo la sala de entrega de ' + idInmueble + ': ' + e.message);
    return { ok: false, error: e.message };
  }
}

/** Valida el enlace de la sala: devuelve la cita, el rol y los datos, o { error }. */
function _salaEntrega_(datos) {
  const cita = _citaPorId(datos.c);
  if (!cita || String(valorCita(cita.fila, cita.col, 'TIPO AGENDA')) !== 'ENTREGA') return { error: 'No encontramos esta entrega.' };
  const rol = ROLES_ENTREGA[datos.r];
  if (!rol) return { error: 'Este enlace no es válido.' };
  const esperado = rol === 'INQUILINO' ? String(valorCita(cita.fila, cita.col, 'TOKEN PROPIETARIO') || '') : _tokenPropietarioEntrega(datos.c);
  if (!datos.t || String(datos.t) !== esperado) return { error: 'Este enlace no es válido.' };
  const d = _datosEntregaInmueble_(valorCita(cita.fila, cita.col, 'ID INMUEBLE'));
  if (!d) return { error: 'No encontramos el inmueble de esta entrega.' };
  return { cita: cita, rol: rol, d: d };
}

/** Lo que ve cada parte al abrir su enlace. */
function infoSalaEntrega(datos) {
  const s = _salaEntrega_(datos);
  if (s.error) return { ok: false, mensaje: s.error };
  const { fila, col } = s.cita;
  const estado = String(valorCita(fila, col, 'ESTADO') || '').trim();
  const inicio = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
  const otro = s.rol === 'INQUILINO' ? String(s.d.inm.propietario || 'el propietario') : s.d.inquilino;
  return {
    ok: true,
    rol: s.rol,
    nombre: s.rol === 'INQUILINO' ? s.d.inquilino : String(s.d.inm.propietario || ''),
    otro: otro,
    direccion: s.d.direccion,
    tipoInmueble: s.d.inm.tipoInmueble,
    estado: estado === ESTADO_POR_COORDINAR ? 'NEGOCIANDO' : ([ESTADOS_CITA.PENDIENTE, ESTADOS_CITA.CONFIRMADA, ESTADOS_CITA.REAGENDADA, 'CONFIRMADA_NOTIFICADA'].indexOf(estado) !== -1 ? 'AGENDADA' : 'CERRADA'),
    agendada: inicio && estado !== ESTADO_POR_COORDINAR ? inicio.getTime() : null,
    pedidos: _pedidosDe(fila, col).filter(t => t > Date.now()),
    propuestoPor: String(valorCita(fila, col, 'PROPUESTO POR') || ''),
    descartados: _descartadosDe(fila, col)
  };
}

/** Horarios libres de Leonardo para la entrega en un día (sin los descartados). */
function disponibilidadSalaEntrega(datos) {
  const s = _salaEntrega_(datos);
  if (s.error) return { success: false, error: s.error };
  const disp = obtenerDisponibilidadAgenda(datos.fecha, 'ENTREGA', { excluirCita: String(datos.c) });
  if (!disp.success) return disp;
  const descartados = _descartadosDe(s.cita.fila, s.cita.col);
  disp.slots = disp.slots.filter(x => descartados.indexOf(x.timestamp) === -1);
  return disp;
}

/** Una parte propone 3 horarios. Lo que el otro había propuesto pasa a descartados. */
function proponerSalaEntrega(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { sheet, col, numFila, fila } = s.cita;
    if (String(valorCita(fila, col, 'ESTADO') || '').trim() !== ESTADO_POR_COORDINAR) return { ok: false, mensaje: 'La entrega ya quedó agendada.' };
    let pedidos = (Array.isArray(datos.pedidos) ? datos.pedidos : []).map(Number).filter(isFinite);
    pedidos = Array.from(new Set(pedidos)).sort((a, b) => a - b);
    if (pedidos.length !== MAX_PEDIDOS_COORDINADO) return { ok: false, mensaje: 'Elige 3 horarios.' };
    const idCita = String(datos.c);
    const descartados = _descartadosDe(fila, col);
    if (pedidos.some(t => descartados.indexOf(t) !== -1)) return { ok: false, mensaje: 'Uno de esos horarios ya se descartó. Elige otro.' };
    const ocupado = pedidos.find(t => !_horarioLibreTipo_(t, 'ENTREGA', idCita));
    if (ocupado) return { ok: false, mensaje: 'El horario del ' + _textoHorario(ocupado) + ' acaba de ser ocupado. Elige otro.' };

    const anteriores = _pedidosDe(fila, col);
    const antesPor = String(valorCita(fila, col, 'PROPUESTO POR') || '');
    const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
    // Los que propuso el otro y no le sirvieron a esta parte ya no se ofrecen
    if (anteriores.length && antesPor && antesPor !== s.rol) {
      escribir('HORARIOS DESCARTADOS', JSON.stringify(Array.from(new Set(descartados.concat(anteriores))).sort((a, b) => a - b)));
    }
    const primera = new Date(pedidos[0]);
    escribir('HORARIOS PEDIDOS', JSON.stringify(pedidos));
    escribir('PROPUESTO POR', s.rol);
    escribir('FECHA CITA', new Date(primera.getFullYear(), primera.getMonth(), primera.getDate()));
    escribir('HORA CITA', formatAmPm(primera));
    escribir('ULTIMO AVISO', '');
    escribir('FECHA ULTIMO AVISO', new Date());
    escribir('ULTIMO CAMBIO', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss') +
      ' · ' + (s.rol === 'INQUILINO' ? 'el inquilino' : 'el propietario') + ' propuso 3 horarios para la entrega');
    _cacheApartados = null;

    // Aviso a la otra parte
    const quien = s.rol === 'INQUILINO' ? s.d.inquilino : String(s.d.inm.propietario || 'El propietario');
    const lista = pedidos.map(t => '• <strong>' + _textoHorario(t) + '</strong>').join('<br>');
    const cuerpo = `<strong>${quien}</strong> propuso estos horarios para la entrega del inmueble:<br><br>${lista}<br><br>` +
      'Elige el que te sirva y la entrega queda agendada. Si ninguno te sirve, propón otros.';
    try {
      if (s.rol === 'INQUILINO') {
        if (s.d.inm.correoPropietario) enviarCorreoCita(s.d.inm.correoPropietario, '🔑 Te propusieron horarios para la entrega - Gold Life', 'ELIGE EL HORARIO',
          String(s.d.inm.propietario || '').split(' ')[0], cuerpo,
          htmlBotonesCorreo([{ texto: '🔑 Ver los horarios', color: '#b8860b', url: urlSalaEntrega(idCita, 'p', _tokenPropietarioEntrega(idCita)) }]));
      } else {
        enviarCorreoCita(s.d.correoInquilino, '🔑 Te propusieron horarios para la entrega - Gold Life', 'ELIGE EL HORARIO',
          s.d.inquilino.split(' ')[0], cuerpo,
          htmlBotonesCorreo([{ texto: '🔑 Ver los horarios', color: '#b8860b', url: urlSalaEntrega(idCita, 'i', String(valorCita(fila, col, 'TOKEN PROPIETARIO'))) }]));
      }
    } catch (e) { Logger.log('No se pudo avisar la propuesta de entrega: ' + e.message); }
    try {
      enviarCorreoCita(correoAgenteCitas(), `🔑 Entrega ${s.d.inm.id}: ${quien} propuso horarios`, 'ENTREGA POR COORDINAR', 'Agente',
        etiquetaTipoCitaHtml('ENTREGA') + `<strong>${quien}</strong> propuso para la entrega de <strong>${s.d.direccion}</strong>:<br>${lista}<br><br>Quedan apartados en tu agenda mientras la otra parte responde.`, '');
    } catch (e) { Logger.log('No se pudo avisar al agente: ' + e.message); }
    return { ok: true, mensaje: 'Listo. Le enviamos tus horarios ' + (s.rol === 'INQUILINO' ? 'al propietario' : 'a ' + s.d.inquilino.split(' ')[0]) + ' y te avisamos cuando responda.' };
  } finally {
    lock.releaseLock();
  }
}

/** Una parte acepta uno de los horarios que propuso la otra: queda agendada. */
function aceptarSalaEntrega(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { sheet, col, numFila, fila } = s.cita;
    if (String(valorCita(fila, col, 'ESTADO') || '').trim() !== ESTADO_POR_COORDINAR) return { ok: false, mensaje: 'La entrega ya quedó agendada.' };
    const ts = Number(datos.timestamp);
    if (String(valorCita(fila, col, 'PROPUESTO POR') || '') === s.rol) return { ok: false, mensaje: 'Ese horario lo propusiste tú: espera la respuesta de la otra parte.' };
    if (_pedidosDe(fila, col).indexOf(ts) === -1) return { ok: false, mensaje: 'Ese horario ya no está en la propuesta.' };
    const idCita = String(datos.c);
    if (!_horarioLibreTipo_(ts, 'ENTREGA', idCita)) return { ok: false, mensaje: 'Ese horario acaba de ser ocupado. Propón otros.' };

    const inicio = new Date(ts);
    const fin = new Date(ts + TIPOS_AGENDA.ENTREGA.duracionMin * 60000);
    const ev = CalendarApp.getDefaultCalendar().createEvent(
      `🔑 ENTREGA ⏳ POR CONFIRMAR: ${s.d.inm.tipoInmueble} ${s.d.inm.barrio || ''} - ${s.d.inquilino}`.replace(/\s+/g, ' '),
      inicio, fin, {
        description: `Entrega del inmueble ${s.d.inm.id} (cita ${idCita})\nInquilino: ${s.d.inquilino} · ${s.d.celularInquilino} · ${s.d.correoInquilino}\n` +
          `Propietario: ${s.d.inm.propietario || ''} · ${s.d.inm.celularPropietario || ''} · ${s.d.inm.correoPropietario || ''}`,
        location: s.d.direccion, guests: s.d.correoInquilino, sendInvites: false
      });
    const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
    escribir('ESTADO', ESTADOS_CITA.PENDIENTE);
    escribir('FECHA CITA', new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()));
    escribir('HORA CITA', formatAmPm(inicio));
    escribir('ID EVENTO CALENDAR', ev.getId());
    escribir('HORARIOS PEDIDOS', '');
    escribir('ULTIMO AVISO', avisoVigenteCita((ts - Date.now()) / 60000, 'ENTREGA'));
    escribir('FECHA ULTIMO AVISO', '');
    escribir('ULTIMO CAMBIO', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss') +
      ' · entrega agendada (' + (s.rol === 'INQUILINO' ? 'el inquilino' : 'el propietario') + ' aceptó)');
    _cacheApartados = null;

    // Constancia a las dos partes y aviso a Leonardo
    try {
      enviarPasoCita('AGENDADA', s.d.correoInquilino, {
        idCita: idCita, token: String(valorCita(fila, col, 'TOKEN PROPIETARIO') || ''), nombre: s.d.inquilino,
        servicio: 'Entrega del inmueble', direccion: s.d.direccion, inicio: inicio, duracionMin: TIPOS_AGENDA.ENTREGA.duracionMin
      });
    } catch (e) { Logger.log('No se pudo avisar al inquilino: ' + e.message); }
    try {
      if (s.d.inm.correoPropietario) enviarCorreoCita(s.d.inm.correoPropietario, `🔑 Entrega agendada: ${_textoHorario(ts)} - Gold Life`, 'ENTREGA AGENDADA',
        String(s.d.inm.propietario || '').split(' ')[0],
        `Quedó agendada la entrega de tu ${s.d.inm.tipoInmueble.toLowerCase()} a <strong>${s.d.inquilino}</strong>:<br><br>` +
        `🗓️ <strong>${_textoHorario(ts)}</strong> (alrededor de una hora)<br>📍 ${s.d.direccion}<br><br>Leonardo va a estar en la entrega. Si algo cambia, te avisamos por aquí.`, '');
    } catch (e) { Logger.log('No se pudo avisar al propietario: ' + e.message); }
    try {
      enviarCorreoCita(correoAgenteCitas(), `🔑 Entrega agendada: ${s.d.inquilino} · ${_textoHorario(ts)} · ${s.d.inm.id}`, 'NUEVA ENTREGA', 'Agente',
        etiquetaTipoCitaHtml('ENTREGA') + `🗓️ <strong>${_textoHorario(ts)}</strong><br>📍 ${s.d.direccion}<br>👤 Inquilino: ${s.d.inquilino} · ${s.d.celularInquilino}<br>` +
        `🏠 Propietario: ${s.d.inm.propietario || ''} · ${s.d.inm.celularPropietario || ''}`, '');
    } catch (e) { Logger.log('No se pudo avisar al agente: ' + e.message); }
    return { ok: true, mensaje: 'Listo: la entrega quedó para el ' + _textoHorario(ts) + '. Les enviamos los detalles por correo.' };
  } finally {
    lock.releaseLock();
  }
}

/** ¿Ese horario está libre en la agenda de Leonardo para ese tipo de cita? */
function _horarioLibreTipo_(ts, tipo, excluirIdCita) {
  const fecha = Utilities.formatDate(new Date(ts), 'America/Bogota', 'yyyy-MM-dd');
  const disp = obtenerDisponibilidadAgenda(fecha, tipo, { excluirCita: excluirIdCita || '' });
  return !!(disp.success && disp.slots.some(s => s.timestamp === ts));
}

/**
 * Tarea automática para una entrega POR COORDINAR (la llama ejecutarMotorAgenda):
 * los horarios propuestos se caen 2 h antes; si se caen todos, se avisa; y si la
 * otra parte no responde en 24 h, a Leonardo le llega un aviso para llamar.
 */
function revisarSalaEntrega_(sheet, col, numFila, f) {
  if (String(valorCita(f, col, 'MODO VISITA') || '') !== MODO_ENTREGA) return false;
  const ahora = Date.now();
  const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
  const idCita = String(valorCita(f, col, 'ID CITA'));
  const idInm = String(valorCita(f, col, 'ID INMUEBLE') || '');
  const pedidos = _pedidosDe(f, col);
  const vigentes = pedidos.filter(t => t - ahora > MIN_CAIDA_PEDIDO * 60000);
  const por = String(valorCita(f, col, 'PROPUESTO POR') || '');
  if (vigentes.length !== pedidos.length) {
    escribir('HORARIOS PEDIDOS', vigentes.length ? JSON.stringify(vigentes) : '');
    _cacheApartados = null;
    if (!vigentes.length) {
      escribir('PROPUESTO POR', '');
      escribir('FECHA ULTIMO AVISO', new Date());
      try {
        enviarCorreoCita(correoAgenteCitas(), `🔑 Entrega ${idInm}: se cayeron los horarios propuestos`, 'ENTREGA POR COORDINAR', 'Agente',
          etiquetaTipoCitaHtml('ENTREGA') + `Los horarios que propuso ${por === 'INQUILINO' ? 'el inquilino' : 'el propietario'} para la entrega de <strong>${idInm}</strong> pasaron sin respuesta. ` +
          'La sala sigue abierta para que propongan otros; quizá convenga llamarlos.', '');
      } catch (e) { Logger.log('Error avisando la caída de la entrega ' + idCita + ': ' + e.message); }
      return true;
    }
  }
  const fechaUltimo = valorCita(f, col, 'FECHA ULTIMO AVISO');
  const desde = fechaUltimo instanceof Date ? fechaUltimo.getTime() : 0;
  const ultimo = String(valorCita(f, col, 'ULTIMO AVISO') || '').trim();
  if (!ultimo && desde && ahora - desde >= HORAS_AVISO_ENTREGA * 3600000) {
    const d = _datosEntregaInmueble_(idInm);
    const esperando = !vigentes.length ? 'nadie ha propuesto horarios' : (por === 'INQUILINO' ? 'el propietario no ha respondido' : 'el inquilino no ha respondido');
    try {
      enviarCorreoCita(correoAgenteCitas(), `📞 Entrega ${idInm}: ${esperando}`, 'LLAMA PARA LA ENTREGA', 'Agente',
        etiquetaTipoCitaHtml('ENTREGA') + `Hace ${HORAS_AVISO_ENTREGA} horas que ${esperando} en la sala de entrega de <strong>${d ? d.direccion : idInm}</strong>.<br><br>` +
        (d ? `👤 Inquilino: ${d.inquilino} · ${d.celularInquilino}<br>🏠 Propietario: ${d.inm.propietario || ''} · ${d.inm.celularPropietario || ''}` : ''), '');
    } catch (e) { Logger.log('Error avisando al agente de la entrega ' + idCita + ': ' + e.message); }
    escribir('ULTIMO AVISO', 'LLAMAR');
  }
  return true;
}

/** Leonardo marcó "Sí, ya se hizo la entrega": queda registrado en el inmueble. */
function marcarInmuebleEntregado_(fila, col) {
  try {
    const idInm = String(valorCita(fila, col, 'ID INMUEBLE') || '');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
    const datos = sheet.getDataRange().getValues();
    const h = datos[0].map(x => String(x).trim());
    let cFecha = h.indexOf('FECHA DE ENTREGA DEL INMUEBLE');
    if (cFecha === -1) { cFecha = h.length; sheet.getRange(1, cFecha + 1).setValue('FECHA DE ENTREGA DEL INMUEBLE').setFontWeight('bold'); }
    const i = datos.findIndex((r, k) => k > 0 && String(r[h.indexOf('ID DE REGISTRO')]).trim() === idInm);
    if (i < 1) return;
    const inicio = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA')) || new Date();
    sheet.getRange(i + 1, cFecha + 1).setValue(inicio).setNumberFormat('dd/MM/yyyy');
    const cDet = h.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');
    if (cDet !== -1) sheet.getRange(i + 1, cDet + 1).setValue('🔑 Inmueble entregado al inquilino el ' + Utilities.formatDate(inicio, Session.getScriptTimeZone(), 'dd/MM/yyyy') + '.');
  } catch (e) { Logger.log('No se pudo marcar el inmueble como entregado: ' + e.message); }
}
