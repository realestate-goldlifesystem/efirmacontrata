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
      'Si ninguno le sirve, propone otros y así hasta que coincidan. La entrega dura alrededor de una hora.' +
      '<br><br>📌 <strong>Primero va la entrega y después la mudanza:</strong> primero se acuerda el día de la entrega del inmueble y después el de la mudanza, que nunca puede ser antes de la entrega.';
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
    descartados: _descartadosDe(fila, col),
    // Parte B: lo que ya dio el inquilino y las listas de marcas
    mudanza: s.rol === 'INQUILINO' ? _datosMudanzaDe(fila, col) : null,
    marcas: s.rol === 'INQUILINO' ? { MOTO: MARCAS_MOTO, CARRO: MARCAS_CARRO } : null,
    // Versión 2 (26-oct-2026, MUDANZA_ENTREGA.js): aprobación de la mudanza y formato de la administración
    proceso: infoMudanza_(s)
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
    const sinTerminar = s.rol === 'INQUILINO' && !_datosMudanzaDe(fila, col);
    if (anteriores.length && antesPor === s.rol && !sinTerminar) return { ok: false, mensaje: 'Ya enviaste tus horarios. Te avisamos por correo cuando la otra parte responda.' };
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
    // Si el propietario ya cargó el formato de la administración, va en este mismo correo
    const conFormato = s.rol === 'PROPIETARIO' && formatoPendienteDeAviso_(fila, col);
    const cuerpo = `<strong>${quien}</strong> propuso estos horarios para la entrega del inmueble:<br><br>${lista}<br><br>` +
      'Elige el que te sirva y la entrega queda agendada. Si ninguno te sirve, propón otros.' +
      (conFormato ? '<br><br>📄 Además, la administración del conjunto tiene su propio <strong>formato de mudanza</strong>: en la sala de entrega lo descargas, lo llenas y lo cargas.' : '');
    const diferir = s.rol === 'INQUILINO' && !_datosMudanzaDe(fila, col);
    if (diferir) {
      const pm = _procesoMudanza_(fila, col); pm.horariosPendientes = true;
      _guardarProcesoMudanza_(s.cita, pm, 'los horarios del inquilino esperan a que termine el paso a paso');
    }
    try {
      if (s.rol === 'INQUILINO') {
        if (s.d.inm.correoPropietario && !diferir) enviarCorreoCita(s.d.inm.correoPropietario, '🔑 Te propusieron horarios para la entrega - Gold Life', 'ELIGE EL HORARIO',
          String(s.d.inm.propietario || '').split(' ')[0], cuerpo,
          htmlBotonesCorreo([{ texto: '🔑 Ver los horarios', color: '#b8860b', url: urlSalaEntrega(idCita, 'p', _tokenPropietarioEntrega(idCita)) }]));
      } else {
        _encolarAvisoInquilino_(s, 'HORARIOS DE ENTREGA', cuerpo.replace('Elige el que te sirva', 'Entra a tu sala, elige el que te sirva'));
      }
    } catch (e) { Logger.log('No se pudo avisar la propuesta de entrega: ' + e.message); }
    try {
      enviarCorreoCita(correoAgenteCitas(), `🔑 Entrega ${s.d.inm.id}: ${quien} propuso horarios`, 'ENTREGA POR COORDINAR', 'Agente',
        etiquetaTipoCitaHtml('ENTREGA') + `<strong>${quien}</strong> propuso para la entrega de <strong>${s.d.direccion}</strong>:<br>${lista}<br><br>Quedan apartados en tu agenda mientras la otra parte responde.`, '');
    } catch (e) { Logger.log('No se pudo avisar al agente: ' + e.message); }
    if (conFormato) { try { avisarFormatoAlInquilino_(s, true); } catch (e) { Logger.log('⚠️ Aviso del formato: ' + e.message); } }
    if (diferir) return { ok: true, mensaje: 'Guardamos tus horarios. Se los enviamos al propietario junto con los datos de tu mudanza cuando termines los pasos.' };
    return { ok: true, mensaje: 'Listo. Le enviamos tus horarios ' + (s.rol === 'INQUILINO' ? 'al propietario' : 'a ' + s.d.inquilino.split(' ')[0]) + ' y te avisamos cuando responda.' };
  } finally {
    lock.releaseLock();
  }
}

/** Una parte acepta uno de los horarios que propuso la otra: queda agendada. */
function aceptarSalaEntrega(datos) {
  _prog_(datos, 5, 'Preparando la agenda');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    _prog_(datos, 12, 'Verificando que el horario siga libre');
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { sheet, col, numFila, fila } = s.cita;
    if (String(valorCita(fila, col, 'ESTADO') || '').trim() !== ESTADO_POR_COORDINAR) return { ok: false, mensaje: 'La entrega ya quedó agendada.' };
    const ts = Number(datos.timestamp);
    if (String(valorCita(fila, col, 'PROPUESTO POR') || '') === s.rol) return { ok: false, mensaje: 'Ese horario lo propusiste tú: espera la respuesta de la otra parte.' };
    if (_pedidosDe(fila, col).indexOf(ts) === -1) return { ok: false, mensaje: 'Ese horario ya no está en la propuesta.' };
    const idCita = String(datos.c);
    if (!_horarioLibreTipo_(ts, 'ENTREGA', idCita)) return { ok: false, mensaje: 'Ese horario acaba de ser ocupado. Propón otros.' };

    _prog_(datos, 30, 'Creando el evento en el calendario');
    const inicio = new Date(ts);
    const fin = new Date(ts + TIPOS_AGENDA.ENTREGA.duracionMin * 60000);
    const ev = CalendarApp.getDefaultCalendar().createEvent(
      `🔑 ENTREGA ⏳ POR CONFIRMAR: ${s.d.inm.tipoInmueble} ${s.d.inm.barrio || ''} - ${s.d.inquilino}`.replace(/\s+/g, ' '),
      inicio, fin, {
        description: `Entrega del inmueble ${s.d.inm.id} (cita ${idCita})\nInquilino: ${s.d.inquilino} · ${s.d.celularInquilino} · ${s.d.correoInquilino}\n` +
          `Propietario: ${s.d.inm.propietario || ''} · ${s.d.inm.celularPropietario || ''} · ${s.d.inm.correoPropietario || ''}`,
        location: s.d.direccion, guests: s.d.correoInquilino, sendInvites: false
      });
    _prog_(datos, 45, 'Guardando la entrega en el sistema');
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
    _prog_(datos, 58, 'Enviando la confirmación al inquilino');
    try {
      const tokInq = String(valorCita(fila, col, 'TOKEN PROPIETARIO') || '');
      const c = { idCita: idCita, token: tokInq, nombre: s.d.inquilino, servicio: 'Entrega del inmueble', direccion: s.d.direccion, inicio: inicio, duracionMin: TIPOS_AGENDA.ENTREGA.duracionMin };
      const m = correoPasoCita('AGENDADA', c);
      enviarCorreoCita(s.d.correoInquilino, m.asunto, m.titulo, m.nombre,
        m.mensaje + '<br><br>🚚 <strong>Ahora sigue tu mudanza:</strong> entra a tu sala de entrega y elige el día y la hora (siempre después de la entrega).',
        htmlBotonesCorreo([{ texto: '🚚 Elegir mi mudanza', color: '#b8860b', url: urlSalaEntrega(idCita, 'i', tokInq) }]) + (m.secundario || ''),
        [archivoCalendarioCita(c)]);
    } catch (e) { Logger.log('No se pudo avisar al inquilino: ' + e.message); }
    _prog_(datos, 68, 'Enviando la confirmación al propietario');
    try {
      if (s.d.inm.correoPropietario) enviarCorreoCita(s.d.inm.correoPropietario, `🔑 Entrega agendada: ${_textoHorario(ts)} - Gold Life`, 'ENTREGA AGENDADA',
        String(s.d.inm.propietario || '').split(' ')[0],
        `Quedó agendada la entrega de tu ${s.d.inm.tipoInmueble.toLowerCase()} a <strong>${s.d.inquilino}</strong>:<br><br>` +
        `🗓️ <strong>${_textoHorario(ts)}</strong> (alrededor de una hora)<br>📍 ${s.d.direccion}<br><br>Leonardo va a estar en la entrega. Si algo cambia, te avisamos por aquí.`, '');
    } catch (e) { Logger.log('No se pudo avisar al propietario: ' + e.message); }
    try {
      // Leonardo revisa que la fecha tenga sentido (p. ej. no antes de lo acordado) y,
      // si no, la reabre de una para que la vuelvan a elegir
      enviarCorreoCita(correoAgenteCitas(), `🔑 Entrega agendada: ${s.d.inquilino} · ${_textoHorario(ts)} · ${s.d.inm.id} — revisa la fecha`, 'NUEVA ENTREGA', 'Agente',
        etiquetaTipoCitaHtml('ENTREGA') + `🗓️ <strong>${_textoHorario(ts)}</strong><br>📍 ${s.d.direccion}<br>👤 Inquilino: ${s.d.inquilino} · ${s.d.celularInquilino}<br>` +
        `🏠 Propietario: ${s.d.inm.propietario || ''} · ${s.d.inm.celularPropietario || ''}<br><br>` +
        '<strong>¿La fecha está bien?</strong> Si no es la que acordaron, habla con ellos y vuelve a abrirla para que elijan otra, o muévela tú desde el panel con "Reagendar".',
        htmlBotonesCorreo([{ texto: '🔄 Volver a elegir la fecha', color: '#b8860b', url: urlEstadoCita(idCita, 'REABRIR', String(valorCita(fila, col, 'TOKEN AGENTE') || '')) }]));
    } catch (e) { Logger.log('No se pudo avisar al agente: ' + e.message); }
    // La mudanza propuesta no puede quedar antes de recibir el inmueble (versión 2)
    try {
      const m = _datosMudanzaDe(fila, col);
      const filaN = sheet.getRange(numFila, 1, 1, sheet.getLastColumn()).getValues()[0];
      const sN = { cita: { sheet: sheet, col: col, numFila: numFila, fila: filaN }, rol: s.rol, d: s.d };
      if (m && m.mudanza && _validarMudanza_(sN, m.mudanza, m.horaMudanza || '23:00').indexOf('después de recibir') !== -1) {
        const p = _procesoMudanza_(filaN, col); p.estado = 'NO_POSIBLE'; p.motivo = 'quedó antes de la entrega del inmueble';
        _guardarProcesoMudanza_(sN.cita, p, 'la mudanza quedó antes de la entrega acordada: se pide otra fecha');
        _correoSala_(sN, 'INQUILINO', '🚚 Elige otra fecha para tu mudanza - Gold Life', 'NUEVA FECHA DE MUDANZA',
          'La entrega quedó para el <strong>' + _textoHorario(ts) + '</strong> y tu mudanza estaba antes. Por favor propón otra fecha en tu sala de entrega.', '🚚 Elegir otra fecha');
      }
    } catch (e) { Logger.log('⚠️ Revisión de la mudanza: ' + e.message); }
    // Pagos (VIDA_CONTRATO_PAGOS.js): accesos del propietario y cobro del primer mes
    _prog_(datos, 80, 'Preparando los accesos y el cobro del primer mes');
    try { alAcordarEntrega_(s.d.inm.id); } catch (e) { Logger.log('⚠️ alAcordarEntrega_: ' + e.message); }
    // Si el inquilino ya dio los datos de la mudanza, salen las cartas
    if ((_datosMudanzaDe(fila, col) || {}).mudanza) generarCartasEntrega_(sheet, col, numFila, sheet.getRange(numFila, 1, 1, sheet.getLastColumn()).getValues()[0]);
    // Si el propietario cargó el formato antes de acordar la entrega, ahora le llega al inquilino
    try { avisarFormatoAlInquilino_(s); } catch (e) { Logger.log('⚠️ Aviso del formato: ' + e.message); }
    _prog_(datos, 96, 'Terminando');
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

/**
 * Al cargar el contrato autenticado el inmueble ya está arrendado: se cancelan las
 * visitas de interesados que seguían vivas (pedidas, agendadas o confirmadas), se
 * borran sus eventos y a cada interesado le llega un aviso amable (22-oct-2026).
 */
function cancelarVisitasPorArriendo(idInmueble) {
  const canceladas = [];
  try {
    const { sheet, col } = hojaCitasConColumnas();
    const ultima = sheet.getLastRow();
    if (ultima < 2) return canceladas;
    const filas = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
    const vivas = [ESTADO_POR_COORDINAR, ESTADOS_CITA.PENDIENTE, ESTADOS_CITA.CONFIRMADA, ESTADOS_CITA.REAGENDADA, ESTADOS_CITA.QUIERE_REAGENDAR];
    filas.forEach((f, i) => {
      if (String(valorCita(f, col, 'TIPO AGENDA') || '').trim() !== 'INTERESADO') return;
      if (String(valorCita(f, col, 'ID INMUEBLE') || '') !== String(idInmueble)) return;
      if (vivas.indexOf(String(valorCita(f, col, 'ESTADO') || '').trim()) === -1) return;
      const numFila = i + 2;
      aplicarCambioEstadoCita(sheet, col, numFila, f, ESTADOS_CITA.CANCELADA, 'cancelada automáticamente: el inmueble se arrendó (contrato autenticado)');
      if (col['HORARIOS PEDIDOS']) sheet.getRange(numFila, col['HORARIOS PEDIDOS']).setValue('');
      const nombre = String(valorCita(f, col, 'NOMBRE') || '');
      const correo = String(valorCita(f, col, 'CORREO') || '');
      const inicio = fechaHoraDeCita(valorCita(f, col, 'FECHA CITA'), valorCita(f, col, 'HORA CITA'));
      canceladas.push(nombre + (inicio ? ' (' + Utilities.formatDate(inicio, Session.getScriptTimeZone(), 'dd/MM HH:mm') + ')' : ''));
      try {
        if (correo) enviarCorreoCita(correo, '🏠 Tu visita fue cancelada: el inmueble ya se arrendó - Gold Life', 'VISITA CANCELADA', nombre,
          'Te contamos que el inmueble que ibas a visitar' + (inicio ? ` el <strong>${_textoHorario(inicio.getTime())}</strong>` : '') +
          ' <strong>ya se arrendó</strong>, así que cancelamos tu visita. No tienes que hacer nada.<br><br>' +
          'Gracias por tu interés. En nuestro portafolio tenemos más inmuebles que te pueden gustar.',
          htmlBotonesCorreo([{ texto: '🏠 Ver más inmuebles', color: '#b8860b', url: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/' }]));
      } catch (e) { Logger.log('No se pudo avisar a ' + nombre + ': ' + e.message); }
    });
    _cacheApartados = null;
    if (canceladas.length) {
      try {
        enviarCorreoCita(correoAgenteCitas(), `🏠 ${idInmueble} arrendado: se cancelaron ${canceladas.length} visita(s)`, 'VISITAS CANCELADAS', 'Agente',
          etiquetaTipoCitaHtml('INTERESADO') + `Se cargó el contrato autenticado de <strong>${idInmueble}</strong>, así que se cancelaron las visitas que seguían pendientes y se liberó tu agenda:<br><br>` +
          canceladas.map(x => '• ' + x).join('<br>') + '<br><br>A cada interesado le llegó un aviso.', '');
      } catch (e) { Logger.log('No se pudo avisar al agente: ' + e.message); }
    }
  } catch (e) { Logger.log('Error cancelando visitas de ' + idInmueble + ': ' + e.message); }
  return canceladas;
}

// ================= Parte B: datos de la mudanza y cartas (22-oct-2026) =================
// El inquilino da en la sala la fecha de mudanza, quiénes más viven y sus vehículos. Con
// eso y la fecha de entrega se generan solas, con las plantillas de siempre y sin cambiar
// su texto, la carta de bienvenida y la carta de nuevo inquilino para la administración.
// Quedan en "4- VARIOS…" de la entrega del inquilino y a Leonardo le llega el aviso para
// revisarlas antes de enviarlas (PLAN_AGENDAS_Y_RECORDATORIOS.md, 6.3.0).

const PLANTILLA_CARTA_BIENVENIDA = '1IHtueDehlt2DrNFeLKtIJoAuAbsAkps6vkBlq7OYwUI';
const PLANTILLA_CARTA_ADMINISTRACION = '1NHiR1AWXNlvv6XyJnK91mdKyD9kZElDJBbKIPk8Tmxo';
// Listas del formulario de Google "FORMULARIO DE DOCUMENTOS DE ENTREGA" (leídas el 22-oct-2026)
const MARCAS_MOTO = ['Yamaha', 'Bajaj', 'AKT', 'Suzuki', 'Honda', 'KTM', 'BMW', 'Kawasaki', 'Royal Enfield', 'Ducati', 'Piaggio', 'TVS', 'Hero', 'Kymco', 'Triumph', 'Benelli', 'Husqvarna', 'Keeway', 'Vespa'];
const MARCAS_CARRO = ['Audi', 'BMW', 'Chevrolet', 'Changan', 'Chery', 'Citroën', 'Deepal', 'DS', 'Fiat', 'Ford', 'Great Wall', 'Honda', 'Hyundai', 'JAC', 'JMC', 'Jaguar', 'Jeep', 'KIA', 'Land Rover', 'Lexus', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'SEAT', 'Seres', 'Shineray', 'SsangYong', 'Subaru', 'Suzuki', 'Toyota', 'Volkswagen', 'Volvo', 'BYD', 'Changhe', 'DFS', 'Karry', 'Landwind', 'Lifan', 'Qingling', 'Trumpchi', 'Venucia'];
// Cupos de la plantilla: 5 personas (el inquilino + 4), 5 motos y 5 carros
const MAX_OTRAS_PERSONAS = 4, MAX_VEHICULOS_TIPO = 5;

function _datosMudanzaDe(fila, col) {
  try { return JSON.parse(valorCita(fila, col, 'DATOS ENTREGA') || 'null'); } catch (e) { return null; }
}

/** El inquilino guarda la fecha de mudanza, las otras personas y los vehículos. */
function guardarDatosEntrega(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'INQUILINO') return { ok: false, mensaje: 'Estos datos los da el inquilino.' };
    const { sheet, col, numFila, fila } = s.cita;
    const estado = String(valorCita(fila, col, 'ESTADO') || '').trim();
    if ([ESTADOS_CITA.CANCELADA, ESTADOS_CITA.ASISTIDA, ESTADOS_CITA.INASISTIDA].indexOf(estado) !== -1) return { ok: false, mensaje: 'Esta entrega ya no está activa.' };

    const limpio = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max || 80);
    // Dos formularios (27-oct-2026): ENTREGA = horarios + quién vive + vehículos; MUDANZA = día y hora,
    // solo con la entrega ya agendada. Lo de la entrega se da una vez (en el que llegue primero).
    const etapa = datos.etapa === 'ENTREGA' ? 'ENTREGA' : 'MUDANZA';
    const antes = _datosMudanzaDe(fila, col);
    const proc = _procesoMudanza_(fila, col);
    const datosYa = !!(antes && (antes.enviadoEntrega || antes.mudanza));
    let personas = datosYa ? (antes.personas || []) : null, vehiculos = datosYa ? (antes.vehiculos || []) : null;
    if (!datosYa) {
      personas = (Array.isArray(datos.personas) ? datos.personas : []).slice(0, MAX_OTRAS_PERSONAS).map(p => ({
        nombre: limpio(p.nombre), tipoDocumento: TIPOS_DOCUMENTO[p.tipoDocumento] ? p.tipoDocumento : 'CC', documento: limpio(p.documento, 20).replace(/[^\dA-Za-z]/g, ''), celular: limpio(p.celular, 20), correo: limpio(p.correo, 80)
      }));
      if (personas.some(p => p.nombre.length < 3 || p.documento.length < 5)) return { ok: false, mensaje: 'Escribe el nombre y el documento de cada persona.' };
      vehiculos = (Array.isArray(datos.vehiculos) ? datos.vehiculos : []).map(v => ({
        tipo: v.tipo === 'MOTO' ? 'MOTO' : 'CARRO', marca: limpio(v.marca, 40), modelo: limpio(v.modelo, 40), placa: String(v.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      }));
      if (vehiculos.filter(v => v.tipo === 'MOTO').length > MAX_VEHICULOS_TIPO || vehiculos.filter(v => v.tipo === 'CARRO').length > MAX_VEHICULOS_TIPO) return { ok: false, mensaje: 'Máximo 5 carros y 5 motos.' };
      const malo = vehiculos.find(v => !v.marca || !v.modelo || !(v.tipo === 'MOTO' ? /^[A-Z]{3}\d{2}[A-Z]$/ : /^[A-Z]{3}\d{3}$/).test(v.placa));
      if (malo) return { ok: false, mensaje: 'Revisa el vehículo ' + (malo.placa || malo.marca || '') + ': marca, modelo y placa (carro ABC123, moto ABC12D).' };
    }
    const escribirDatos = (g, nota) => {
      if (col['DATOS ENTREGA']) sheet.getRange(numFila, col['DATOS ENTREGA']).setValue(JSON.stringify(g));
      if (col['ULTIMO CAMBIO']) sheet.getRange(numFila, col['ULTIMO CAMBIO']).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss') + ' · ' + nota);
    };

    if (etapa === 'ENTREGA') {
      if (datosYa) return { ok: false, mensaje: 'Ya enviaste tus datos. Te avisamos por correo cuando el propietario responda.' };
      const guardar = { mudanza: '', horaMudanza: '', personas: personas, vehiculos: vehiculos, enviadoEntrega: true, actualizado: new Date().toISOString() };
      escribirDatos(guardar, 'el inquilino envió el formulario de la entrega');
      // Un solo correo al propietario: los horarios (si esperaban) + quién vive + vehículos
      try { avisarEntregaAlPropietario_(s, guardar); } catch (e) { Logger.log('⚠️ Aviso de la entrega: ' + e.message); }
      return { ok: true, mensaje: '¡Listo! Le enviamos al propietario tus horarios y tus datos. Cuando la entrega quede agendada, eliges el día de tu mudanza.' };
    }

    // ---- MUDANZA
    if (estado === ESTADO_POR_COORDINAR) return { ok: false, mensaje: 'Primero tiene que quedar agendada la entrega del inmueble.' };
    const mudanza = String(datos.mudanza || '');
    const horaMudanza = String(datos.horaMudanza || '');
    const tenia = !!(antes && antes.mudanza);
    if (tenia && proc.estado !== 'NO_POSIBLE') return { ok: false, mensaje: 'Ya enviaste tu mudanza. Te avisamos por correo cuando el propietario responda.' };
    if (tenia && antes.mudanza === mudanza && (antes.horaMudanza || '') === horaMudanza) return { ok: false, mensaje: 'Esa fecha el propietario dijo que no es posible. Elige otra.' };
    if (!tenia && proc.formato === 'SI') {
      const v = (proc.versiones || []).slice(-1)[0];
      if (!v || v.estado === 'CORREGIR') return { ok: false, mensaje: 'Primero carga el formato de la administración lleno.' };
    }
    const errorFecha = _validarMudanza_(s, mudanza, horaMudanza);
    if (errorFecha) return { ok: false, mensaje: errorFecha };
    const guardar = { mudanza: mudanza, horaMudanza: horaMudanza, personas: personas, vehiculos: vehiculos, enviadoEntrega: true, actualizado: new Date().toISOString() };
    escribirDatos(guardar, 'el inquilino propuso la mudanza');
    // Al propietario le llega la fecha de mudanza para aprobar
    try { alProponerMudanza_(s, guardar, tenia ? antes : null); } catch (e) { Logger.log('⚠️ Aviso de la mudanza: ' + e.message); }
    // La carta de bienvenida sale con la fecha de la mudanza (y se rehace si cambia)
    generarCartasEntrega_(sheet, col, numFila, sheet.getRange(numFila, 1, 1, sheet.getLastColumn()).getValues()[0]);
    return { ok: true, mensaje: '¡Listo! Le enviamos la fecha de tu mudanza al propietario para que la apruebe.' };
  } finally {
    lock.releaseLock();
  }
}

/** "Torre 3 - Apartamento 405" o "Apartamento 405", como se lee (decisión del 14-oct-2026). */
function _referenciaInmueble_(idInmueble, tipoInmueble) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  const datos = sheet.getDataRange().getValues();
  const h = datos[0].map(x => String(x).trim());
  const f = datos.find((r, k) => k > 0 && String(r[h.indexOf('ID DE REGISTRO')]).trim() === String(idInmueble));
  if (!f) return { referencia: '', cdr: '', admin: '', correoAdmin: '' };
  const v = (n) => { const c = h.indexOf(n); return c < 0 ? '' : String(f[c] || '').trim(); };
  const torre = v('N° o Letra de la Torre'), numero = v('N° de inmueble');
  const tipo = String(tipoInmueble || 'Apartamento');
  const conTorre = /torre/i.test(v('¿El inmueble solo lo describe el Número? o ¿Número y torre?')) && torre;
  return {
    referencia: numero ? (conTorre ? 'Torre ' + torre + ' - ' : '') + tipo + ' ' + numero : '',
    cdr: v('CODIGO DE REGISTRO'), admin: v('NOMBRE DEL INMUEBLE/ADMINISTRACION'), correoAdmin: v('Correo electrónico de la administración')
  };
}

const _fechaLarga_ = (d) => d.getDate() + ' de ' + ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][d.getMonth()] + ' de ' + d.getFullYear();

/**
 * Llena una copia de la plantilla: cada <<marcador>> con su valor; el renglón cuyos
 * marcadores quedan todos vacíos se quita (cupos sin usar), y entre `desde` y `hasta`
 * no quedan dos renglones vacíos seguidos.
 */
function _llenarCarta_(doc, valores, referencia, desde, hasta) {
  const body = doc.getBody();
  // La referencia del inmueble va como se lee, no "Torre y número: 3 - 405"
  if (referencia) body.replaceText('<<APTOYTORRE>>\\s*:\\s*<<#TORRE>>\\s*-\\s*<<#APTO>>', referencia);
  const valor = (tag) => Object.prototype.hasOwnProperty.call(valores, tag) ? String(valores[tag] == null ? '' : valores[tag]) : '';
  body.getParagraphs().forEach(p => {
    const texto = p.getText();
    const tags = (texto.match(/<<[^<>]+>>/g) || []).map(t => t.slice(2, -2));
    if (tags.length && tags.every(t => !valor(t).trim()) && !texto.replace(/<<[^<>]+>>/g, '').trim()) {
      try { p.removeFromParent(); } catch (e) { p.setText(''); }
    }
  });
  const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  const vistos = {};
  (body.getText().match(/<<[^<>]+>>/g) || []).forEach(m => {
    const tag = m.slice(2, -2);
    if (vistos[tag]) return;
    vistos[tag] = true;
    body.replaceText(escapar(m), valor(tag).replace(/\$/g, '\\$'));
  });
  if (desde && hasta) {
    let dentro = false, anteriorVacio = false;
    body.getParagraphs().forEach(p => {
      const t = p.getText();
      if (t.indexOf(desde) !== -1) { dentro = true; anteriorVacio = false; return; }
      if (t.indexOf(hasta) !== -1) { dentro = false; return; }
      if (!dentro) return;
      const vacio = !t.trim();
      if (vacio && anteriorVacio) { try { p.removeFromParent(); } catch (e) {} return; }
      anteriorVacio = vacio;
    });
  }
  doc.saveAndClose();
}

/** Genera (o rehace) las dos cartas y le avisa a Leonardo. Necesita entrega agendada y datos. */
function generarCartasEntrega_(sheet, col, numFila, fila, que) {
  que = que || 'BIENVENIDA';
  try {
    const mud = _datosMudanzaDe(fila, col);
    const inicio = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
    if (!mud || !inicio) return { ok: false, motivo: 'faltan datos o fecha' };
    const idInm = String(valorCita(fila, col, 'ID INMUEBLE'));
    const d = _datosEntregaInmueble_(idInm);
    const ref = _referenciaInmueble_(idInm, d.inm.tipoInmueble);
    const rc = recopilarDatosContrato(idInm);
    const c = rc && rc.success ? rc.data : { inquilino: {}, propietario: {} };
    const inq = c.inquilino || {}, prop = c.propietario || {};

    // Carpeta "4- VARIOS…" de la entrega del inquilino
    const carpetaContrato = buscarCarpetaContratoDinamica({ cdr: ref.cdr, tipoNegocio: 'Arriendo' });
    if (!carpetaContrato) throw new Error('No se encontró la carpeta de entrega del inquilino');
    const padre = carpetaContrato.getParents().next();
    let destino = null;
    const hijas = padre.getFolders();
    while (hijas.hasNext()) { const h = hijas.next(); if (/^4-\s*VARIOS/i.test(h.getName())) { destino = h; break; } }
    if (!destino) destino = padre;

    // Las versiones anteriores de esa carta (si el inquilino cambió algo) van a la papelera
    const previas = String(valorCita(fila, col, 'CARTAS ENTREGA') || '').split(',');
    const idPrevia = que === 'BIENVENIDA' ? previas[0] : previas[1];
    if (idPrevia) { try { DriveApp.getFileById(idPrevia).setTrashed(true); } catch (e) {} }

    const nombreInq = inq.nombre || d.inquilino;
    const base = {
      'FECHA DE ENTREGA': _fechaLarga_(inicio), 'FECHA': _fechaLarga_(new Date()), 'DÍA DE MUDANZA': _textoMudanza_(mud),
      'CIUDAD DE ENTREGA': d.inm.ciudad || 'Bogotá', 'NOMBRE ADMINISTRACIÓN': ref.admin, 'correo administración': ref.correoAdmin,
      'DIRECCIÓN INM': d.inm.direccion,
      'NOMBRE INQUILINO#1': nombreInq, 'NÚMERO DE DOCUMENTO#1': _documentoCorto_(inq.tipoDocumento, inq.numeroDocumento), 'CELULAR #1': inq.celular || d.celularInquilino, 'CORREO#1': inq.email || d.correoInquilino,
      'ARRENDATARIO #1': 'ARRENDATARIO #1', 'NOMBRE': 'NOMBRE:', 'DOCUMENTO#1': 'DOCUMENTO:', 'CELULAR-1': 'CELULAR:', 'CORREO-1': 'CORREO:',
      'NOMBRE PROPIETARIO': prop.nombre || d.inm.propietario || '', 'NÚMERO DE DOCUMENTO PROPIETARIO': prop.numeroDocumento || '',
      'CELULAR PROPIETARIO': prop.celular || d.inm.celularPropietario || '', 'CORREO DEL PROPIETARIO': prop.email || d.inm.correoPropietario || '',
      'NOMBRE DEL BANCO': prop.banco || '', 'TIPO DE CUENTA': prop.tipoCuenta || '', 'NÚMERO DE CUENTA': prop.numeroCuenta || '',
      'TITULAR DE LA CUENTA': prop.titularCuenta || prop.nombre || '', 'CÉDULA DEL TITULAR DE LA CUENTA': prop.documentoTitular || prop.numeroDocumento || ''
    };
    mud.personas.forEach((p, i) => {
      const k = i + 2;
      base['ARRENDATARIO #' + k] = 'ARRENDATARIO #' + k;
      base['NOMBRE#' + k] = 'NOMBRE:';
      base['NOMBRE INQUILINO#' + k] = p.nombre;
      base['DOCUMENTO#' + k] = 'DOCUMENTO:';
      base['NÚMERO DE DOCUMENTO#' + k] = _documentoCorto_(p.tipoDocumento || 'CC', p.documento);
      base['CELULAR-' + k] = p.celular ? 'CELULAR:' : '';
      base['CELULAR #' + k] = p.celular;
      base['CORREO-' + k] = p.correo ? 'CORREO:' : '';
      base['CORREO#' + k] = p.correo;
    });
    // La plantilla no es pareja en los nombres de los marcadores de vehículos: se llenan todas las variantes
    mud.vehiculos.filter(v => v.tipo === 'MOTO').forEach((v, i) => {
      const k = i + 1;
      base['MOTO#' + k] = 'MOTO';
      base['MARCA MOTO#' + k] = v.marca;
      base['MODELO MOTO #' + k] = v.modelo;
      base['MODELO MOTO#' + k] = v.modelo;
      base['PLACAMOTO#' + k] = 'PLACA:';
      base['PLACA MOTO#' + k] = 'PLACA:';
      base['DES PLACAMOTO#' + k] = v.placa;
      base['DES PLACA MOTO#' + k] = v.placa;
    });
    mud.vehiculos.filter(v => v.tipo === 'CARRO').forEach((v, i) => {
      const k = i + 1;
      base['CARRO#' + k] = 'CARRO';
      base['MARCA CARRO#' + k] = v.marca;
      base['MARCA CARRO #' + k] = v.marca;
      base['MODELO CARRO #' + k] = v.modelo;
      base['MODELO VEHÍCULO #' + k] = v.modelo;
      base['PLACA CARRO#' + k] = 'PLACA:';
      base['DES PLACA CARRO#' + k] = v.placa;
    });

    const sufijo = ' - ' + nombreInq + ' - ' + idInm;
    if (que === 'ADMINISTRACION') {
      // El acta de solicitud de mudanza: la genera el envío del propietario (MUDANZA_ENTREGA.js)
      const administracion = DriveApp.getFileById(PLANTILLA_CARTA_ADMINISTRACION).makeCopy('CARTA DE NUEVO INQUILINO PARA ADMINISTRACIÓN' + sufijo, destino);
      _llenarCarta_(DocumentApp.openById(administracion.getId()), base, ref.referencia, 'fue arrendado a', 'A quienes se les hace entrega');
      if (col['CARTAS ENTREGA']) sheet.getRange(numFila, col['CARTAS ENTREGA']).setValue((previas[0] || '') + ',' + administracion.getId());
      return { ok: true, id: administracion.getId(), url: administracion.getUrl() };
    }
    const bienvenida = DriveApp.getFileById(PLANTILLA_CARTA_BIENVENIDA).makeCopy('CARTA DE BIENVENIDA' + sufijo, destino);
    _llenarCarta_(DocumentApp.openById(bienvenida.getId()), base, ref.referencia);
    if (col['CARTAS ENTREGA']) sheet.getRange(numFila, col['CARTAS ENTREGA']).setValue(bienvenida.getId() + ',' + (previas[1] || ''));
    try {
      const detalle = [mud.personas.length ? mud.personas.length + ' persona(s) más' : '', mud.vehiculos.length ? mud.vehiculos.length + ' vehículo(s)' : ''].filter(Boolean).join(', ');
      enviarCorreoCita(correoAgenteCitas(), '📄 Carta de bienvenida lista para revisar · ' + idInm, 'CARTA DE BIENVENIDA', 'Agente',
        etiquetaTipoCitaHtml('ENTREGA') + '<strong>' + nombreInq + '</strong> dio los datos de la mudanza (' + _textoMudanza_(mud) +
        (detalle ? ', ' + detalle : '') + ').<br><br>Ya quedó la carta de bienvenida en la carpeta de la entrega. Revísala antes de la entrega. ' +
        'El acta para la administración la envía el propietario desde su sala (te llega copia).',
        htmlBotonesCorreo([{ texto: '📄 Carta de bienvenida', color: '#b8860b', url: bienvenida.getUrl() }]));
    } catch (e) { Logger.log('No se pudo avisar la carta: ' + e.message); }
    return { ok: true, bienvenida: bienvenida.getUrl() };
  } catch (e) {
    Logger.log('No se pudieron generar las cartas de entrega: ' + e.message);
    return { ok: false, motivo: e.message };
  }
}

/**
 * Reabre la fecha de una entrega (agendada mal, cancelada o que hay que mover): se borra
 * el evento, la cita vuelve a POR COORDINAR sin propuestas ni descartados, y al inquilino
 * y al propietario les llega el enlace para volver a elegir (23-oct-2026). La usan el
 * botón del correo de Leonardo y el panel. Los datos de la mudanza se conservan.
 */
function reabrirSalaEntrega_(sheet, col, numFila, fila, motivo) {
  const idCita = String(valorCita(fila, col, 'ID CITA'));
  const idEvento = valorCita(fila, col, 'ID EVENTO CALENDAR');
  if (idEvento) { try { const ev = CalendarApp.getDefaultCalendar().getEventById(idEvento); if (ev) ev.deleteEvent(); } catch (e) {} }
  const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
  escribir('ESTADO', ESTADO_POR_COORDINAR);
  ['ID EVENTO CALENDAR', 'HORARIOS PEDIDOS', 'PROPUESTO POR', 'HORARIOS DESCARTADOS', 'ULTIMO AVISO'].forEach(n => escribir(n, ''));
  escribir('FECHA ULTIMO AVISO', new Date());
  escribir('ULTIMO CAMBIO', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss') + ' · se reabrió la fecha de la entrega' + (motivo ? ': ' + motivo : ''));
  _cacheApartados = null;
  try { PropertiesService.getScriptProperties().deleteProperty('ENTREGA_SIN_CONFIRMAR_' + idCita); } catch (e) {}

  const d = _datosEntregaInmueble_(valorCita(fila, col, 'ID INMUEBLE'));
  if (!d) return { ok: false, mensaje: 'No encontramos el inmueble de esta entrega.' };
  const cuerpo = 'Necesitamos volver a elegir la fecha de la entrega del inmueble en <strong>' + d.direccion + '</strong>' +
    (motivo ? ' (' + motivo + ')' : '') + '.<br><br>Elige 3 horarios en que puedas y coordinamos con la otra parte. La fecha anterior ya no aplica.' +
    '<br><br>📌 <strong>Primero va la entrega y después la mudanza:</strong> la mudanza se aprueba cuando la entrega quede acordada y nunca puede ser antes de la entrega.';
  try {
    enviarCorreoCita(d.correoInquilino, '🔑 Volvamos a agendar la entrega - Gold Life', 'NUEVA FECHA DE ENTREGA', d.inquilino.split(' ')[0], cuerpo,
      htmlBotonesCorreo([{ texto: '🔑 Elegir la fecha', color: '#b8860b', url: urlSalaEntrega(idCita, 'i', String(valorCita(fila, col, 'TOKEN PROPIETARIO'))) }]));
  } catch (e) { Logger.log('No se pudo avisar al inquilino: ' + e.message); }
  try {
    if (d.inm.correoPropietario) enviarCorreoCita(d.inm.correoPropietario, '🔑 Volvamos a agendar la entrega - Gold Life', 'NUEVA FECHA DE ENTREGA',
      String(d.inm.propietario || '').split(' ')[0], cuerpo,
      htmlBotonesCorreo([{ texto: '🔑 Elegir la fecha', color: '#b8860b', url: urlSalaEntrega(idCita, 'p', _tokenPropietarioEntrega(idCita)) }]));
  } catch (e) { Logger.log('No se pudo avisar al propietario: ' + e.message); }
  return { ok: true, mensaje: 'Listo: le pedimos al inquilino y al propietario que vuelvan a elegir la fecha de la entrega.' };
}

/** La carta de nuevo inquilino para la administración (acta de solicitud de mudanza). */
function generarCartaAdministracion_(sheet, col, numFila, fila) {
  if (!fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA')) || String(valorCita(fila, col, 'ESTADO')).trim() === ESTADO_POR_COORDINAR) {
    return { ok: false, motivo: 'primero tiene que quedar acordada la fecha de entrega' };
  }
  return generarCartasEntrega_(sheet, col, numFila, fila, 'ADMINISTRACION');
}

/** Tipos de documento que se piden en la sala y su abreviatura en las cartas. */
const TIPOS_DOCUMENTO = { CC: 'C.C.', TI: 'T.I.', CE: 'C.E.', PA: 'Pasaporte', PPT: 'P.P.T.', RC: 'R.C.' };

/** "C.C. 1234567": el tipo puede venir como código (CC) o escrito ("Cédula de ciudadanía"). */
function _documentoCorto_(tipo, numero) {
  if (!numero) return '';
  const t = String(tipo || '').trim();
  const porTexto = /extranjer/i.test(t) ? 'CE' : /tarjeta/i.test(t) ? 'TI' : /pasaporte/i.test(t) ? 'PA' : /permiso|ppt/i.test(t) ? 'PPT' : /registro/i.test(t) ? 'RC' : /c[ée]dula|^c\.?c\.?$/i.test(t) ? 'CC' : '';
  const abrev = TIPOS_DOCUMENTO[t.toUpperCase()] || TIPOS_DOCUMENTO[porTexto] || '';
  return (abrev ? abrev + ' ' : '') + numero;
}
