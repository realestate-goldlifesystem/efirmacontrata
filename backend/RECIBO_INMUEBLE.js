/**
 * ===== Sala de recibo del inmueble (etapa 3, parte 3 · 29-oct-2026) =====
 *
 * Cuando el contrato se terminó (RENOVACION_CONTRATO.js → TERMINADO), 15 días antes del final
 * se abre la sala de recibo:
 *   - El inquilino propone 3 horarios (entre la apertura y el tope de devolución, libres en la
 *     agenda de Leonardo, tipo DEVOLUCION) y carga los recibos pagados de agua, luz y gas.
 *   - El propietario elige uno ("Me sirve" + deslizar) o dice que ninguno le sirve: vuelven a
 *     proponer y esos ya no se ofrecen.
 *   - Leonardo revisa los recibos (aprobar / no es) y marca el inventario por espacios
 *     (conforme o novedad, con nota y foto). Con la barra "Se recibió el inmueble" se cierra:
 *       · informe de revisión en PDF (solo hechos, sin cláusulas);
 *       · paz y salvo (PAZ_Y_SALVO.js) solo si no hay novedades y los recibos están aprobados.
 *         Firma Leonardo si el negocio es de administración; si no, el propietario;
 *       · correo de cierre a las dos partes con los PDF;
 *       · se apagan los cobros mes a mes y el inmueble queda PENDIENTE para volver a publicarse.
 *   - Pasa el tope de devolución sin recibirse → a Leonardo le llega el caso, una vez.
 *
 * Estado en Script Properties: RECIBO_<id>_<fin>. Página: frontend/sala_recibo.html
 * (?k=<id>&f=<fin>&r=i|p|a&t=<token>). El motor de pagos llama a revisarRecibo_.
 */

const URL_SALA_RECIBO = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/sala_recibo.html';
const ROL_RECIBO = { i: 'INQUILINO', p: 'PROPIETARIO', a: 'AGENTE' };
const DIAS_ABRE_RECIBO = 15;
const SERVICIOS_RECIBO = { AGUA: 'Agua', LUZ: 'Luz', GAS: 'Gas' };
const CARPETA_RECIBO = '5- RECIBO DEL INMUEBLE';

// ---------- Estado y enlaces ----------

function _claveRecibo_(idInm, fin) { return 'RECIBO_' + idInm + '_' + cvTexto(fin); }
function _leerRecibo_(idInm, fin) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(_claveRecibo_(idInm, fin)) || '{}'); } catch (e) { return {}; }
}
function _guardarRecibo_(idInm, fin, rec) { PropertiesService.getScriptProperties().setProperty(_claveRecibo_(idInm, fin), JSON.stringify(rec)); }
function _historialRecibo_(rec, texto) {
  rec.historial = (rec.historial || []).concat(Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy HH:mm') + ' · ' + texto).slice(-40);
}

function tokenRecibo(idInm, finTxt, rol) {
  const firma = Utilities.computeHmacSha256Signature('RECIBO:' + idInm + ':' + finTxt + ':' + rol, _secretoCoordinar());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 32);
}
function urlRecibo(idInm, fin, rol) {
  const r = Object.keys(ROL_RECIBO).find(k => ROL_RECIBO[k] === rol);
  return URL_SALA_RECIBO + '?k=' + encodeURIComponent(idInm) + '&f=' + cvTexto(fin) + '&r=' + r + '&t=' + tokenRecibo(idInm, cvTexto(fin), rol);
}

/** ¿El inmueble ya se recibió? (el motor de pagos deja de cobrar) */
function inmuebleRecibido_(idInm, c) {
  const fechas = fechasContratoVigente_(idInm, c);
  return !!fechas && _leerRecibo_(idInm, fechas.fin).estado === 'RECIBIDO';
}

const _hoyCv_ = () => cvLeerFecha(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd'));

/** Desde cuándo y hasta cuándo se puede hacer el recibo. */
function _ventanaRecibo_(f) {
  const hoy = _hoyCv_(), abre = cvSumarDias(f.fin, -DIAS_ABRE_RECIBO);
  return { desde: cvNum(hoy) > cvNum(abre) ? hoy : abre, hasta: f.topeDevolucion };
}

// ---------- 1. El motor: abrir la sala y el aviso del tope ----------

function revisarRecibo_(idInm, c, hoy) {
  const fechas = fechasContratoVigente_(idInm, c);
  if (!fechas || _leerRenov_(idInm, fechas.fin).resultado !== 'TERMINADO') return;
  const f = cvFechasClave(fechas.inicioContrato, fechas.fin);
  const rec = _leerRecibo_(idInm, f.fin);
  if (rec.estado === 'RECIBIDO') return;
  if (cvDiasEntre(hoy, f.fin) > DIAS_ABRE_RECIBO) return;
  const partes = _partesContrato_(idInm, c);

  if (!rec.estado) {
    Object.assign(rec, { estado: 'ABIERTA', abierta: cvTexto(hoy), pedidos: [], descartados: [], recibos: {}, espacios: [], avisos: [] });
    _historialRecibo_(rec, 'se abrió la sala de recibo');
    _guardarRecibo_(idInm, f.fin, rec);
    _correosAperturaRecibo_(idInm, partes, f);
    return;
  }
  if (cvDiasEntre(hoy, f.topeDevolucion) < 0 && (rec.avisos || []).indexOf('TOPE') === -1) {
    _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '📞 Inmueble sin recibir · ' + idInm, 'INMUEBLE SIN RECIBIR', 'Leonardo',
      `Pasó el tope de devolución (<strong>${_textoCv_(f.topeDevolucion)}</strong>) y el inmueble <strong>${idInm}</strong> (${partes.direccion}) no se ha recibido.<br><br>` +
      `Estado de la sala: <strong>${rec.estado === 'AGENDADA' ? 'recibo agendado para el ' + _textoHorario(rec.cita.ts) : 'sin horario acordado'}</strong>.<br><br>Llámalos para cerrarlo.`,
      botonesContacto_([{ quien: 'inquilino', cel: partes.INQUILINO.celular }, { quien: 'propietario', cel: partes.PROPIETARIO.celular }]) +
      htmlBotonesCorreo([{ texto: '📋 Abrir la sala de recibo', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'AGENTE') }]));
    rec.avisos.push('TOPE');
    _guardarRecibo_(idInm, f.fin, rec);
  }
}

function _correosAperturaRecibo_(idInm, partes, f) {
  const fin = _textoCv_(f.fin), tope = _textoCv_(f.topeDevolucion);
  const inq = partes.INQUILINO, prop = partes.PROPIETARIO;
  if (String(inq.correo).indexOf('@') !== -1) _correoCitaSeguro(inq.correo, '🔑 Prepara la entrega del inmueble - Gold Life', 'ENTREGA DEL INMUEBLE', _primerNombre_(inq.nombre),
    `Tu contrato del inmueble en <strong>${partes.direccion}</strong> termina el <strong>${fin}</strong> y tienes como máximo hasta el <strong>${tope}</strong> para entregarlo.<br><br>` +
    'En tu sala de recibo haces dos cosas:<br>🗓️ <strong>Propones 3 horarios</strong> para la entrega; el propietario elige uno.<br>' +
    '🧾 <strong>Cargas los recibos pagados</strong> de agua, luz y gas: son los que permiten darte el paz y salvo.<br><br>' +
    '📋 El inmueble se revisa contra el inventario con el que lo recibiste.',
    htmlBotonesCorreo([{ texto: '🔑 Abrir mi sala de recibo', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'INQUILINO') }]));
  if (String(prop.correo).indexOf('@') !== -1) _correoCitaSeguro(prop.correo, '🔑 Se acerca el recibo de tu inmueble - Gold Life', 'RECIBO DEL INMUEBLE', _primerNombre_(prop.nombre),
    `El contrato del inmueble en <strong>${partes.direccion}</strong> termina el <strong>${fin}</strong>. Le pedimos a ${_primerNombre_(inq.nombre)} que proponga horarios para la entrega ` +
    `(como máximo el <strong>${tope}</strong>). Te llega un correo para que elijas el que te sirva.<br><br>Leonardo revisa el inventario y los recibos de servicios en el recibo.`, '');
  _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '🔑 Se abrió la sala de recibo · ' + idInm, 'SALA DE RECIBO ABIERTA', 'Leonardo',
    `Se abrió la sala de recibo del inmueble <strong>${idInm}</strong> (${partes.direccion}). Termina el <strong>${fin}</strong> · tope <strong>${tope}</strong>.<br><br>` +
    'Desde tu enlace revisas los recibos, marcas el inventario y cierras con "Se recibió el inmueble".',
    htmlBotonesCorreo([{ texto: '📋 Mi sala de recibo', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'AGENTE') }]));
}

// ---------- 2. La página ----------

function _reciboDesdeEnlace_(datos) {
  const rol = ROL_RECIBO[datos.r];
  const idInm = String(datos.k || '');
  if (!rol || !idInm || !datos.t || String(datos.t) !== tokenRecibo(idInm, String(datos.f || ''), rol)) return { error: 'Este enlace no es válido.' };
  activarSinCorreoFila_(idInm);
  const c = _contratoDe(idInm);
  if (!c) return { error: 'No encontramos el contrato.' };
  const inicio = cvLeerFecha(c.v('FECHA INICIO DEL CONTRATO')), fin = cvLeerFecha(String(datos.f));
  if (!inicio || !fin) return { error: 'El contrato no tiene fechas.' };
  const rec = _leerRecibo_(idInm, fin);
  if (!rec.estado) return { error: 'La sala de recibo todavía no está abierta.' };
  return { rol: rol, idInm: idInm, c: c, f: cvFechasClave(inicio, fin), rec: rec };
}

const _rolTxt_ = (rol) => rol === 'INQUILINO' ? 'el inquilino' : rol === 'PROPIETARIO' ? 'el propietario' : 'Leonardo';
const _novedades_ = (rec) => (rec.espacios || []).filter(e => e.estado === 'NOVEDAD');
const _recibosListos_ = (rec) => Object.keys(SERVICIOS_RECIBO).every(s => {
  const x = (rec.recibos || {})[s]; return x && (x.estado === 'APROBADO' || x.estado === 'NO_APLICA');
});
const _firmantePazYSalvo_ = (c) => /administraci/i.test(String(c.v('TIPO DE NEGOCIO') || '')) ? 'AGENTE' : 'PROPIETARIO';

function infoRecibo(datos) {
  const s = _reciboDesdeEnlace_(datos);
  if (s.error) return { ok: false, mensaje: s.error };
  const { rol, rec, f } = s;
  const partes = _partesContrato_(s.idInm, s.c);
  const v = _ventanaRecibo_(f);
  const recibos = {};
  Object.keys(SERVICIOS_RECIBO).forEach(k => {
    const x = (rec.recibos || {})[k];
    recibos[k] = x ? { estado: x.estado, motivo: x.motivo || '', url: rol === 'AGENTE' ? x.url || '' : '' } : null;
  });
  const out = {
    ok: true, rol: rol, nombre: rol === 'AGENTE' ? 'Leonardo' : partes[rol].nombre,
    inquilino: partes.INQUILINO.nombre, propietario: partes.PROPIETARIO.nombre, direccion: partes.direccion,
    finTexto: _textoCv_(f.fin), topeTexto: _textoCv_(f.topeDevolucion), desde: cvTexto(v.desde), hasta: cvTexto(v.hasta),
    estado: rec.estado, pedidos: (rec.pedidos || []).filter(t => t > Date.now()), cita: rec.cita ? rec.cita.ts : null,
    servicios: SERVICIOS_RECIBO, recibos: recibos
  };
  if (rol === 'AGENTE') {
    out.espacios = rec.espacios || [];
    out.inventario = _urlInventario_(s.c);
    out.firmante = _firmantePazYSalvo_(s.c);
    out.historial = rec.historial || [];
  }
  if (rec.estado === 'RECIBIDO') out.cierre = rec.cierre || {};
  return out;
}

/** Horarios libres de Leonardo para el recibo en un día de la ventana (sin los descartados). */
function disponibilidadRecibo(datos) {
  const s = _reciboDesdeEnlace_(datos);
  if (s.error) return { success: false, error: s.error };
  const dia = cvLeerFecha(String(datos.fecha || '')), v = _ventanaRecibo_(s.f);
  if (!dia || cvNum(dia) < cvNum(v.desde) || cvNum(dia) > cvNum(v.hasta)) return { success: true, slots: [] };
  const disp = obtenerDisponibilidadAgenda(cvTexto(dia), 'DEVOLUCION', {});
  if (!disp.success) return disp;
  const fuera = (s.rec.descartados || []).concat(s.rec.pedidos || []);
  disp.slots = disp.slots.filter(x => fuera.indexOf(x.timestamp) === -1);
  return disp;
}

/** El inquilino propone 3 horarios. */
function proponerRecibo(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _reciboDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { idInm, rec, f } = s;
    if (s.rol !== 'INQUILINO') return { ok: false, mensaje: 'Los horarios los propone el inquilino.' };
    if (rec.estado !== 'ABIERTA') return { ok: false, mensaje: 'El recibo ya quedó agendado.' };
    if ((rec.pedidos || []).some(t => t > Date.now())) return { ok: false, mensaje: 'Ya enviaste tus horarios. Te avisamos cuando el propietario elija.' };
    let pedidos = Array.from(new Set((Array.isArray(datos.pedidos) ? datos.pedidos : []).map(Number).filter(isFinite))).sort((a, b) => a - b);
    if (pedidos.length !== MAX_PEDIDOS_COORDINADO) return { ok: false, mensaje: 'Elige 3 horarios.' };
    const v = _ventanaRecibo_(f);
    const diaDe = (t) => cvLeerFecha(Utilities.formatDate(new Date(t), 'America/Bogota', 'yyyy-MM-dd'));
    if (pedidos.some(t => cvNum(diaDe(t)) < cvNum(v.desde) || cvNum(diaDe(t)) > cvNum(v.hasta))) return { ok: false, mensaje: 'Los horarios deben quedar entre el ' + _textoCv_(v.desde) + ' y el ' + _textoCv_(v.hasta) + '.' };
    if (pedidos.some(t => (rec.descartados || []).indexOf(t) !== -1)) return { ok: false, mensaje: 'Uno de esos horarios ya se descartó. Elige otro.' };
    const ocupado = pedidos.find(t => !_horarioLibreTipo_(t, 'DEVOLUCION'));
    if (ocupado) return { ok: false, mensaje: 'El horario del ' + _textoHorario(ocupado) + ' acaba de ser ocupado. Elige otro.' };
    rec.pedidos = pedidos;
    _historialRecibo_(rec, 'el inquilino propuso ' + pedidos.map(_textoHorario).join(', '));
    _guardarRecibo_(idInm, f.fin, rec);

    const partes = _partesContrato_(idInm, s.c);
    const lista = pedidos.map(t => '• <strong>' + _textoHorario(t) + '</strong>').join('<br>');
    if (String(partes.PROPIETARIO.correo).indexOf('@') !== -1) _correoCitaSeguro(partes.PROPIETARIO.correo, '🔑 Elige el horario para recibir tu inmueble - Gold Life', 'ELIGE EL HORARIO',
      _primerNombre_(partes.PROPIETARIO.nombre),
      `<strong>${partes.INQUILINO.nombre}</strong> propuso estos horarios para entregarte el inmueble en <strong>${partes.direccion}</strong>:<br><br>${lista}<br><br>` +
      'Elige el que te sirva. Si ninguno te sirve, se lo decimos para que proponga otros.',
      htmlBotonesCorreo([{ texto: '🔑 Ver los horarios', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'PROPIETARIO') }]));
    _correoCitaSeguro(correoAgenteCitas(), `🔑 Recibo ${idInm}: el inquilino propuso horarios`, 'RECIBO POR COORDINAR', 'Agente',
      `${partes.INQUILINO.nombre} propuso para el recibo de <strong>${partes.direccion}</strong>:<br>${lista}`, '');
    return { ok: true, mensaje: 'Listo. Le enviamos tus horarios al propietario y te avisamos cuando elija.' };
  } finally { lock.releaseLock(); }
}

/** El propietario elige un horario o dice que ninguno le sirve. */
function responderRecibo(datos) {
  _prog_(datos, 5, 'Revisando los horarios');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _reciboDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { idInm, rec, f } = s;
    if (s.rol !== 'PROPIETARIO') return { ok: false, mensaje: 'El horario lo elige el propietario.' };
    if (rec.estado !== 'ABIERTA') return { ok: false, mensaje: 'El recibo ya quedó agendado.' };
    const partes = _partesContrato_(idInm, s.c);
    const inq = partes.INQUILINO, prop = partes.PROPIETARIO;

    if (datos.ninguno) {
      if (!(rec.pedidos || []).length) return { ok: false, mensaje: 'No hay horarios propuestos.' };
      rec.descartados = Array.from(new Set((rec.descartados || []).concat(rec.pedidos)));
      rec.pedidos = [];
      _historialRecibo_(rec, 'al propietario no le sirvió ninguno');
      _guardarRecibo_(idInm, f.fin, rec);
      if (String(inq.correo).indexOf('@') !== -1) _correoCitaSeguro(inq.correo, '🗓️ Propón otros horarios para la entrega - Gold Life', 'OTROS HORARIOS', _primerNombre_(inq.nombre),
        `A ${_primerNombre_(prop.nombre)} no le sirvió ninguno de los horarios que propusiste para la entrega del inmueble. Por favor propón otros 3.`,
        htmlBotonesCorreo([{ texto: '🗓️ Proponer otros', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'INQUILINO') }]));
      return { ok: true, mensaje: 'Listo. Le pedimos a ' + _primerNombre_(inq.nombre) + ' que proponga otros horarios.' };
    }

    const ts = Number(datos.timestamp);
    if ((rec.pedidos || []).indexOf(ts) === -1 || ts <= Date.now()) return { ok: false, mensaje: 'Ese horario ya no está en la propuesta.' };
    if (!_horarioLibreTipo_(ts, 'DEVOLUCION')) return { ok: false, mensaje: 'Ese horario acaba de ser ocupado. Pide otros.' };
    _prog_(datos, 30, 'Creando el evento en el calendario');
    const inicio = new Date(ts), finEv = new Date(ts + TIPOS_AGENDA.DEVOLUCION.duracionMin * 60000);
    let idEvento = '';
    try {
      idEvento = CalendarApp.getDefaultCalendar().createEvent(`🔑 RECIBO DEL INMUEBLE ${idInm} - ${inq.nombre}`, inicio, finEv, {
        description: `Recibo del inmueble ${idInm}\nInquilino: ${inq.nombre} · ${inq.celular} · ${inq.correo}\nPropietario: ${prop.nombre} · ${prop.celular} · ${prop.correo}\n\nSala: ${urlRecibo(idInm, f.fin, 'AGENTE')}`,
        location: partes.direccion
      }).getId();
    } catch (e) { Logger.log('⚠️ Evento del recibo ' + idInm + ': ' + e.message); }
    rec.estado = 'AGENDADA';
    rec.cita = { ts: ts, evento: idEvento };
    rec.descartados = Array.from(new Set((rec.descartados || []).concat(rec.pedidos.filter(t => t !== ts))));
    rec.pedidos = [];
    _historialRecibo_(rec, 'el propietario eligió ' + _textoHorario(ts));
    _guardarRecibo_(idInm, f.fin, rec);

    _prog_(datos, 60, 'Avisándoles a las dos partes');
    const cuando = `🗓️ <strong>${_textoHorario(ts)}</strong> (alrededor de una hora)<br>📍 ${partes.direccion}`;
    if (String(inq.correo).indexOf('@') !== -1) _correoCitaSeguro(inq.correo, `🔑 Entrega agendada: ${_textoHorario(ts)} - Gold Life`, 'ENTREGA AGENDADA', _primerNombre_(inq.nombre),
      `Quedó agendada la entrega del inmueble:<br><br>${cuando}<br><br>Se revisa contra el inventario. Si aún no has cargado los recibos pagados de agua, luz y gas, hazlo antes en tu sala.`,
      htmlBotonesCorreo([{ texto: '🧾 Mi sala de recibo', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'INQUILINO') }]));
    if (String(prop.correo).indexOf('@') !== -1) _correoCitaSeguro(prop.correo, `🔑 Recibo agendado: ${_textoHorario(ts)} - Gold Life`, 'RECIBO AGENDADO', _primerNombre_(prop.nombre),
      `Quedó agendado el recibo de tu inmueble:<br><br>${cuando}<br><br>Leonardo va a estar en el recibo.`, '');
    _correoCitaSeguro(correoAgenteCitas(), `🔑 Recibo agendado: ${idInm} · ${_textoHorario(ts)}`, 'RECIBO AGENDADO', 'Agente',
      `${cuando}<br>👤 Inquilino: ${inq.nombre} · ${inq.celular}<br>🏠 Propietario: ${prop.nombre} · ${prop.celular}`,
      htmlBotonesCorreo([{ texto: '📋 Sala de recibo', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'AGENTE') }]));
    _prog_(datos, 96, 'Terminando');
    return { ok: true, mensaje: 'Listo: el recibo quedó para el ' + _textoHorario(ts) + '. Les enviamos los detalles por correo.' };
  } finally { lock.releaseLock(); }
}

// ---------- 3. Recibos de servicios ----------

function _carpetaRecibo_(c) {
  const cdr = String(c.v('CODIGO DE REGISTRO') || c.v('ID DE REGISTRO'));
  const inq = _carpetasEntrega(cdr).folderInq;
  const it = inq.getFoldersByName(CARPETA_RECIBO);
  return it.hasNext() ? it.next() : inq.createFolder(CARPETA_RECIBO);
}

function _urlInventario_(c) {
  try {
    const cdr = String(c.v('CODIGO DE REGISTRO') || c.v('ID DE REGISTRO'));
    const buscar = (carpeta, nivel) => {
      const hs = carpeta.getFolders();
      while (hs.hasNext()) {
        const h = hs.next();
        if (/^1-\s*INVENTARIO/i.test(h.getName())) {
          let mejor = null; const fs = h.getFiles();
          while (fs.hasNext()) { const x = fs.next(); if (!mejor || x.getLastUpdated() > mejor.getLastUpdated()) mejor = x; }
          if (mejor) return mejor.getUrl();
        }
        if (nivel < 3 && /INVENTARIO/i.test(h.getName())) { const r = buscar(h, nivel + 1); if (r) return r; }
      }
      return '';
    };
    return buscar(_carpetasEntrega(cdr).folderInq, 0);
  } catch (e) { Logger.log('Inventario de ' + c.v('ID DE REGISTRO') + ': ' + e.message); return ''; }
}

/** El inquilino carga el recibo pagado de un servicio (o dice que el inmueble no tiene gas). */
function cargarReciboServicio(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _reciboDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { idInm, rec, f } = s;
    if (s.rol !== 'INQUILINO') return { ok: false, mensaje: 'Los recibos los carga el inquilino.' };
    if (rec.estado === 'RECIBIDO') return { ok: false, mensaje: 'El inmueble ya se recibió.' };
    const serv = String(datos.servicio || '');
    if (!SERVICIOS_RECIBO[serv]) return { ok: false, mensaje: 'Servicio no válido.' };
    const actual = (rec.recibos || {})[serv];
    if (actual && actual.estado === 'APROBADO') return { ok: false, mensaje: 'Ese recibo ya está aprobado.' };
    rec.recibos = rec.recibos || {};
    if (datos.noAplica) {
      if (serv !== 'GAS') return { ok: false, mensaje: 'Solo el gas puede no aplicar.' };
      rec.recibos[serv] = { estado: 'NO_APLICA', fecha: new Date().toISOString() };
      _historialRecibo_(rec, 'el inquilino indicó que el inmueble no tiene gas');
    } else {
      const mime = String(datos.mimeType || '').toLowerCase();
      if (!datos.base64 || !/^image\/|application\/pdf/.test(mime)) return { ok: false, mensaje: 'Sube un PDF o una foto del recibo.' };
      const ext = mime === 'application/pdf' ? 'pdf' : (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const nombre = 'Recibo ' + SERVICIOS_RECIBO[serv] + ' - ' + idInm + ' - ' + Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd HHmm') + '.' + ext;
      const archivo = _carpetaRecibo_(s.c).createFile(Utilities.newBlob(Utilities.base64Decode(datos.base64), mime, nombre));
      rec.recibos[serv] = { estado: 'CARGADO', url: archivo.getUrl(), fecha: new Date().toISOString() };
      _historialRecibo_(rec, 'el inquilino cargó el recibo de ' + SERVICIOS_RECIBO[serv].toLowerCase());
    }
    _guardarRecibo_(idInm, f.fin, rec);
    if (!datos.noAplica) _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '🧾 Recibo de ' + SERVICIOS_RECIBO[serv].toLowerCase() + ' por revisar · ' + idInm, 'RECIBO POR REVISAR', 'Leonardo',
      `El inquilino del inmueble <strong>${idInm}</strong> cargó el recibo pagado de <strong>${SERVICIOS_RECIBO[serv].toLowerCase()}</strong>.`,
      htmlBotonesCorreo([{ texto: '🧾 Revisarlo', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'AGENTE') }]));
    return { ok: true, mensaje: datos.noAplica ? 'Anotamos que el inmueble no tiene gas.' : 'Listo. Leonardo revisa el recibo y te avisamos si hace falta algo.' };
  } finally { lock.releaseLock(); }
}

/** Leonardo aprueba un recibo o dice que no es (con motivo; al inquilino le llega para cargarlo de nuevo). */
function revisarReciboServicio(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _reciboDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { idInm, rec, f } = s;
    if (s.rol !== 'AGENTE') return { ok: false, mensaje: 'Solo Leonardo revisa los recibos.' };
    const serv = String(datos.servicio || ''), x = (rec.recibos || {})[serv];
    if (!x || x.estado !== 'CARGADO') return { ok: false, mensaje: 'No hay un recibo cargado por revisar.' };
    if (datos.aprobar) { x.estado = 'APROBADO'; _historialRecibo_(rec, 'Leonardo aprobó el recibo de ' + SERVICIOS_RECIBO[serv].toLowerCase()); }
    else {
      const motivo = String(datos.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!motivo) return { ok: false, mensaje: 'Escribe qué le falta al recibo.' };
      x.estado = 'NO_ES'; x.motivo = motivo;
      _historialRecibo_(rec, 'el recibo de ' + SERVICIOS_RECIBO[serv].toLowerCase() + ' no es: ' + motivo);
      const inq = _partesContrato_(idInm, s.c).INQUILINO;
      if (String(inq.correo).indexOf('@') !== -1) _correoCitaSeguro(inq.correo, '🧾 Vuelve a cargar el recibo de ' + SERVICIOS_RECIBO[serv].toLowerCase() + ' - Gold Life', 'RECIBO POR CORREGIR',
        _primerNombre_(inq.nombre), `El recibo de <strong>${SERVICIOS_RECIBO[serv].toLowerCase()}</strong> que cargaste no sirve todavía:<br><br><em>${motivo}</em><br><br>Por favor carga el correcto.`,
        htmlBotonesCorreo([{ texto: '🧾 Cargar de nuevo', color: '#b8860b', url: urlRecibo(idInm, f.fin, 'INQUILINO') }]));
    }
    _guardarRecibo_(idInm, f.fin, rec);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

// ---------- 4. Inventario y cierre ----------

/** Leonardo sube una foto de un espacio: devuelve su enlace para guardarla con el inventario. */
function subirFotoRecibo(datos) {
  const s = _reciboDesdeEnlace_(datos);
  if (s.error) return { ok: false, mensaje: s.error };
  if (s.rol !== 'AGENTE') return { ok: false, mensaje: 'Solo Leonardo marca el inventario.' };
  const mime = String(datos.mimeType || '').toLowerCase();
  if (!datos.base64 || !/^image\//.test(mime)) return { ok: false, mensaje: 'Sube una foto.' };
  const nombre = 'Foto ' + String(datos.espacio || 'espacio').replace(/[^\wÁÉÍÓÚáéíóúñÑ ]/g, '').slice(0, 40) + ' - ' + Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd HHmmss') + '.jpg';
  const a = _carpetaRecibo_(s.c).createFile(Utilities.newBlob(Utilities.base64Decode(datos.base64), mime, nombre));
  return { ok: true, url: a.getUrl(), id: a.getId() };
}

function guardarInventarioRecibo(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _reciboDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'AGENTE') return { ok: false, mensaje: 'Solo Leonardo marca el inventario.' };
    if (s.rec.estado === 'RECIBIDO') return { ok: false, mensaje: 'El inmueble ya se recibió.' };
    const limpio = (t, n) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);
    const espacios = (Array.isArray(datos.espacios) ? datos.espacios : []).slice(0, 40).map(e => ({
      nombre: limpio(e.nombre, 60), estado: e.estado === 'NOVEDAD' ? 'NOVEDAD' : 'CONFORME', nota: limpio(e.nota, 500),
      fotos: (Array.isArray(e.fotos) ? e.fotos : []).filter(u => /^https:\/\/drive\.google\.com\//.test(String(u))).slice(0, 6)
    })).filter(e => e.nombre);
    if (espacios.some(e => e.estado === 'NOVEDAD' && !e.nota)) return { ok: false, mensaje: 'Cada novedad necesita una nota.' };
    s.rec.espacios = espacios;
    _guardarRecibo_(s.idInm, s.f.fin, s.rec);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/** "Se recibió el inmueble": informe, paz y salvo si aplica, correos, cobros apagados e inmueble disponible. */
function cerrarRecibo(datos) {
  _prog_(datos, 5, 'Revisando el recibo');
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const s = _reciboDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { idInm, rec, f, c } = s;
    if (s.rol !== 'AGENTE') return { ok: false, mensaje: 'Solo Leonardo cierra el recibo.' };
    if (rec.estado === 'RECIBIDO') return { ok: false, mensaje: 'El inmueble ya se recibió.' };
    if (!(rec.espacios || []).length) return { ok: false, mensaje: 'Marca el inventario antes de cerrar.' };
    const partes = _partesContrato_(idInm, c);
    const novedades = _novedades_(rec), recibosOk = _recibosListos_(rec);
    const carpeta = _carpetaRecibo_(c);
    const hoy = new Date();
    rec.cierre = { fecha: hoy.toISOString(), novedades: novedades.length, recibosOk: recibosOk };

    _prog_(datos, 20, 'Preparando el informe de revisión');
    const informe = _informeRecibo_(idInm, partes, rec, f, hoy);
    rec.cierre.informe = carpeta.createFile(informe).getUrl();
    const adj = [informe];

    let pazYSalvo = null, sinPaz = '';
    if (novedades.length) sinPaz = 'hay ' + novedades.length + (novedades.length === 1 ? ' novedad' : ' novedades') + ' en el inventario';
    else if (!recibosOk) sinPaz = 'faltan recibos de servicios aprobados';
    else {
      _prog_(datos, 40, 'Generando el paz y salvo');
      try {
        pazYSalvo = generarPazYSalvo_(idInm, c, partes, _firmantePazYSalvo_(c), carpeta);
        carpeta.createFile(pazYSalvo.pdf);
        rec.cierre.pazYSalvo = pazYSalvo.url;
        adj.push(pazYSalvo.pdf);
      } catch (e) { sinPaz = 'no se pudo generar: ' + e.message; Logger.log('⚠️ Paz y salvo de ' + idInm + ': ' + e.message); }
    }
    rec.estado = 'RECIBIDO';
    _historialRecibo_(rec, 'Leonardo marcó el inmueble como recibido' + (pazYSalvo ? ' (con paz y salvo)' : ' (sin paz y salvo: ' + sinPaz + ')'));
    _guardarRecibo_(idInm, f.fin, rec);

    _prog_(datos, 65, 'Dejando el inmueble disponible');
    try {
      const col = (n) => c.headers.indexOf(n) + 1;
      if (col('ESTADO DEL INMUEBLE')) c.sheet.getRange(c.fila, col('ESTADO DEL INMUEBLE')).setValue(ESTADOS_SISTEMA.PENDIENTE);
      if (col('DETALLES DEL ESTADO DEL INMUEBLE')) c.sheet.getRange(c.fila, col('DETALLES DEL ESTADO DEL INMUEBLE'))
        .setValue('📌 Recibido del inquilino el ' + _fechaLarga_(hoy) + ': listo para volver a publicar.');
    } catch (e) { Logger.log('⚠️ Estado del inmueble ' + idInm + ': ' + e.message); }

    _prog_(datos, 80, 'Enviando el cierre a las dos partes');
    const resumen = novedades.length
      ? '<br><br>📋 En la revisión se encontraron estas novedades:<br>' + novedades.map(e => `• <strong>${e.nombre}</strong>: ${e.nota}`).join('<br>')
      : '<br><br>📋 En la revisión todos los espacios quedaron conformes con el inventario.';
    ['INQUILINO', 'PROPIETARIO'].forEach(rol => {
      const p = partes[rol];
      if (String(p.correo).indexOf('@') === -1) return;
      try {
        enviarCorreoCita(p.correo, '🔑 Se recibió el inmueble - Gold Life', 'INMUEBLE RECIBIDO', _primerNombre_(p.nombre),
          `El ${_fechaLarga_(hoy)} se recibió el inmueble en <strong>${partes.direccion}</strong>.` + resumen +
          '<br><br>📄 Adjuntamos el informe de revisión' + (pazYSalvo ? ' y el paz y salvo.' : '.') +
          (!pazYSalvo && rol === 'INQUILINO' ? '<br><br>El paz y salvo sale cuando ' + (novedades.length ? 'se resuelvan las novedades' : 'estén aprobados los recibos de servicios') + '; Leonardo te contacta.' : ''), '', adj);
      } catch (e) { Logger.log('⚠️ Correo de cierre a ' + rol + ': ' + e.message); }
    });
    _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '🔑 Inmueble recibido · ' + idInm, 'INMUEBLE RECIBIDO', 'Leonardo',
      `Se cerró el recibo del inmueble <strong>${idInm}</strong> (${partes.direccion}).` + resumen +
      `<br><br>Paz y salvo: <strong>${pazYSalvo ? 'enviado' : 'no salió (' + sinPaz + ')'}</strong>.<br>Los cobros mes a mes quedaron apagados y el inmueble quedó <strong>PENDIENTE</strong> para volver a publicarse.`,
      htmlBotonesCorreo([{ texto: '📄 Informe', color: '#555555', url: rec.cierre.informe }].concat(pazYSalvo ? [{ texto: '📄 Paz y salvo', color: '#b8860b', url: pazYSalvo.url }] : [])));
    _prog_(datos, 96, 'Terminando');
    return { ok: true, mensaje: 'Listo: el inmueble quedó recibido.' + (pazYSalvo ? ' Salió el paz y salvo.' : ' Sin paz y salvo: ' + sinPaz + '.') };
  } finally { lock.releaseLock(); }
}

/** Informe de revisión: solo hechos (qué se revisó y cómo quedó), sin cláusulas. */
function _informeRecibo_(idInm, partes, rec, f, hoy) {
  const e = (t) => String(t || '').replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const estadoRec = { APROBADO: 'Aprobado', NO_APLICA: 'No aplica', CARGADO: 'Cargado, sin revisar', NO_ES: 'Devuelto' };
  const filasRecibos = Object.keys(SERVICIOS_RECIBO).map(k => {
    const x = (rec.recibos || {})[k];
    return `<tr><td>${SERVICIOS_RECIBO[k]}</td><td>${x ? estadoRec[x.estado] || x.estado : 'No cargado'}</td></tr>`;
  }).join('');
  const filasEsp = (rec.espacios || []).map(x => `<tr><td>${e(x.nombre)}</td><td class="${x.estado === 'NOVEDAD' ? 'nov' : ''}">${x.estado === 'NOVEDAD' ? 'Novedad' : 'Conforme'}</td>` +
    `<td>${e(x.nota)}${(x.fotos || []).map((u, i) => ` <a href="${e(u)}">foto ${i + 1}</a>`).join('')}</td></tr>`).join('');
  const html = `<html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;font-size:11pt;color:#222;margin:30px} h1{font-size:16pt;text-align:center;margin:0 0 4px} .sub{text-align:center;color:#666;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;margin:8px 0 16px} td,th{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top} th{background:#f2ede0}
    h2{font-size:12pt;margin:14px 0 4px} .nov{color:#b4413a;font-weight:bold}</style></head><body>
    <h1>INFORME DE REVISIÓN DEL INMUEBLE</h1><div class="sub">Recibo del inmueble al terminar el contrato de arrendamiento</div>
    <table><tr><th>Inmueble</th><td>${e(partes.direccion)} (${e(idInm)})</td></tr>
    <tr><th>Inquilino</th><td>${e(partes.INQUILINO.nombre)}</td></tr><tr><th>Propietario</th><td>${e(partes.PROPIETARIO.nombre)}</td></tr>
    <tr><th>Fin del contrato</th><td>${_textoCv_(f.fin)}</td></tr><tr><th>Fecha del recibo</th><td>${_fechaLarga_(hoy)}</td></tr></table>
    <h2>Recibos de servicios públicos</h2><table><tr><th>Servicio</th><th>Estado</th></tr>${filasRecibos}</table>
    <h2>Revisión contra el inventario</h2><table><tr><th>Espacio</th><th>Estado</th><th>Nota</th></tr>${filasEsp}</table>
    <p style="color:#666;font-size:9pt">Generado por la plataforma Gold Life el ${Utilities.formatDate(hoy, 'America/Bogota', 'dd/MM/yyyy HH:mm')}.</p></body></html>`;
  return Utilities.newBlob(html, 'text/html', 'informe.html').getAs(MimeType.PDF).setName('Informe de revisión - ' + partes.direccion + ' - ' + idInm + '.pdf');
}
