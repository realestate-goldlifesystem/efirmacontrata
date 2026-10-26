/**
 * MUDANZA EN LA SALA DE ENTREGA — versión 2 (26-oct-2026)
 * PLAN_AGENDAS_Y_RECORDATORIOS.md, "Sala de entrega, versión 2".
 *
 * Dos momentos: recibir el inmueble (la cita de entrega, AGENDA_ENTREGA.js) y la mudanza.
 *  - El inquilino propone día y hora de la mudanza (reglasMudanza_) y el propietario la
 *    aprueba o dice "no es posible" con motivo.
 *  - Apartamento: el propietario dice si el conjunto tiene formato propio de mudanza.
 *      · No: el sistema genera el acta (la carta de nuevo inquilino para la administración).
 *      · Sí: el propietario carga el formato, el inquilino lo descarga, lo llena y lo carga, y
 *        el propietario lo aprueba por versiones (aprobar o pedir corrección con comentario).
 *    Con el documento listo, el propietario lo envía "desde el sistema" (correo de la
 *    administración; si no estaba en el registro, queda guardado) o "lo envío yo".
 *    A Leonardo le llega copia de lo que se envía.
 *  - Cada uno avanza cuando entra, sin importar el orden.
 *
 * Estado del proceso: columna MUDANZA de "2 - AGENDA CITAS" (JSON).
 */

const MUDANZA_HORAS_APTO = { 1: [8, 16], 2: [8, 16], 3: [8, 16], 4: [8, 16], 5: [8, 16], 6: [8, 11] };   // hora de inicio permitida
const MUDANZA_HORAS_CASA = { 1: [7, 18], 2: [7, 18], 3: [7, 18], 4: [7, 18], 5: [7, 18], 6: [7, 18] };
const MUDANZA_DIAS_HABILES = 2;

function _procesoMudanza_(fila, col) {
  try { return JSON.parse(valorCita(fila, col, 'MUDANZA') || 'null') || {}; } catch (e) { return {}; }
}
function _guardarProcesoMudanza_(cita, proceso, nota) {
  proceso.historial = (proceso.historial || []).concat(nota ? [Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm') + ' · ' + nota] : []).slice(-40);
  if (cita.col['MUDANZA']) cita.sheet.getRange(cita.numFila, cita.col['MUDANZA']).setValue(JSON.stringify(proceso));
}
const _esCasa_ = (d) => /casa/i.test(String(d.inm.tipoInmueble || ''));

/** Primer día permitido: 2 días hábiles después de hoy (lunes → miércoles), sin festivos. */
function _minFechaMudanza_() {
  const tz = 'America/Bogota';
  const hoy = new Date(Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd') + 'T12:00:00-05:00');
  let festivos = {};
  try {
    const cal = CalendarApp.getCalendarById(CONFIG_AGENDA.CALENDARIO_FESTIVOS_COLOMBIA);
    (cal ? cal.getEvents(hoy, new Date(hoy.getTime() + 20 * 86400000)) : []).forEach(e => { festivos[Utilities.formatDate(e.getStartTime(), tz, 'yyyy-MM-dd')] = true; });
  } catch (e) {}
  let d = new Date(hoy), habiles = 0;
  while (habiles < MUDANZA_DIAS_HABILES) {
    d = new Date(d.getTime() + 86400000);
    const dow = Number(Utilities.formatDate(d, tz, 'u'));   // 1 lunes … 7 domingo
    if (dow <= 5 && !festivos[Utilities.formatDate(d, tz, 'yyyy-MM-dd')]) habiles++;
  }
  return { fecha: Utilities.formatDate(d, tz, 'yyyy-MM-dd'), festivos: Object.keys(festivos) };
}

/** Horarios de entrega que cuentan para la regla "no antes de recibir": el acordado o los propuestos. */
function _horariosEntrega_(fila, col) {
  const estado = String(valorCita(fila, col, 'ESTADO') || '').trim();
  if (estado !== ESTADO_POR_COORDINAR) {
    const ini = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
    return ini ? [ini.getTime()] : [];
  }
  return _pedidosDe(fila, col);
}

/** Lo que el inquilino necesita para elegir: días y horas permitidos. */
function reglasMudanza_(s) {
  const min = _minFechaMudanza_();
  return {
    esCasa: _esCasa_(s.d),
    minFecha: min.fecha, festivos: min.festivos,
    horas: _esCasa_(s.d) ? MUDANZA_HORAS_CASA : MUDANZA_HORAS_APTO,
    entregas: _horariosEntrega_(s.cita.fila, s.cita.col)
  };
}

/** ¿Vale ese día y hora de mudanza? '' si sí; si no, el motivo. */
function _validarMudanza_(s, fecha, hora) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) || !/^\d{2}:\d{2}$/.test(String(hora))) return 'Elige el día y la hora de la mudanza.';
  const r = reglasMudanza_(s);
  if (fecha < r.minFecha) return 'La mudanza se puede desde el ' + r.minFecha.split('-').reverse().join('/') + ' (2 días hábiles).';
  const ts = new Date(fecha + 'T' + hora + ':00-05:00').getTime();
  const dow = Number(Utilities.formatDate(new Date(ts), 'America/Bogota', 'u'));
  const h = Number(hora.slice(0, 2));
  const rango = r.horas[dow];
  if (!rango || h < rango[0] || h > rango[1]) return r.esCasa ? 'La mudanza es de lunes a sábado.' : 'En propiedad horizontal la mudanza es de lunes a viernes de 8 a. m. a 5 p. m. y sábados de 8 a. m. a 12 m.';
  if (r.festivos.indexOf(fecha) !== -1) return 'Ese día es festivo.';
  // Nunca antes de recibir el inmueble: como mínimo 1 hora después del último horario de entrega
  if (r.entregas.length) {
    const ultima = Math.max.apply(null, r.entregas);
    if (ts < ultima + 60 * 60000) {
      const f = new Date(ultima + 60 * 60000);
      return 'La mudanza tiene que ser después de recibir el inmueble: desde el ' + Utilities.formatDate(f, 'America/Bogota', 'dd/MM') + ' a las ' + formatAmPm(f) + '.';
    }
  }
  return '';
}

const _textoMudanza_ = (m) => m && m.mudanza ? _fechaLarga_(new Date(m.mudanza + 'T12:00:00')) + (m.horaMudanza ? ' a las ' + formatAmPm(new Date(m.mudanza + 'T' + m.horaMudanza + ':00-05:00')) : '') : '';

/** Al inquilino o al propietario, con su enlace de la sala. */
function _correoSala_(s, rol, asunto, titulo, cuerpo, boton) {
  try {
    const esInq = rol === 'INQUILINO';
    const para = esInq ? s.d.correoInquilino : s.d.inm.correoPropietario;
    if (!para) return;
    const idCita = String(valorCita(s.cita.fila, s.cita.col, 'ID CITA'));
    const url = esInq ? urlSalaEntrega(idCita, 'i', String(valorCita(s.cita.fila, s.cita.col, 'TOKEN PROPIETARIO'))) : urlSalaEntrega(idCita, 'p', _tokenPropietarioEntrega(idCita));
    enviarCorreoCita(para, asunto, titulo, String(esInq ? s.d.inquilino : (s.d.inm.propietario || '')).split(' ')[0], cuerpo,
      htmlBotonesCorreo([{ texto: boton || '🔑 Abrir la sala de entrega', color: '#b8860b', url: url }]));
  } catch (e) { Logger.log('⚠️ Correo de la sala no enviado: ' + e.message); }
}

/** Lo nuevo de la mudanza que ve cada parte en la sala. */
function infoMudanza_(s) {
  const p = _procesoMudanza_(s.cita.fila, s.cita.col);
  const datos = _datosMudanzaDe(s.cita.fila, s.cita.col);
  const ultimaVersion = (p.versiones || []).slice(-1)[0] || null;
  return {
    reglas: s.rol === 'INQUILINO' ? reglasMudanza_(s) : { esCasa: _esCasa_(s.d) },
    propuesta: datos ? { fecha: datos.mudanza, hora: datos.horaMudanza || '', texto: _textoMudanza_(datos), personas: (datos.personas || []).length, vehiculos: (datos.vehiculos || []).length } : null,
    estado: p.estado || (datos ? 'PROPUESTA' : ''),
    motivo: p.motivo || '',
    formato: p.formato || '',                      // '' | 'NO' | 'SI'
    plantilla: p.plantilla ? { nombre: p.plantilla.nombre } : null,
    version: ultimaVersion ? { numero: (p.versiones || []).length, estado: ultimaVersion.estado, comentario: ultimaVersion.comentario || '', fecha: ultimaVersion.fecha } : null,
    envio: p.envio ? { modo: p.envio.modo, correo: p.envio.correo || '', fecha: p.envio.fecha } : null,
    correoAdmin: s.rol === 'PROPIETARIO' ? (_referenciaInmueble_(s.d.inm.id, s.d.inm.tipoInmueble).correoAdmin || '') : ''
  };
}

/** El inquilino propuso (o cambió) el día y la hora: al propietario le llega para aprobar. */
function alProponerMudanza_(s, datosNuevos, datosAntes) {
  const p = _procesoMudanza_(s.cita.fila, s.cita.col);
  const cambio = !datosAntes || datosAntes.mudanza !== datosNuevos.mudanza || datosAntes.horaMudanza !== datosNuevos.horaMudanza;
  if (!cambio && p.estado && !p.horariosPendientes) return;
  // Un solo correo al propietario: los horarios de entrega (si esperaban) + la mudanza + quiénes y vehículos
  const fila = s.cita.sheet.getRange(s.cita.numFila, 1, 1, s.cita.sheet.getLastColumn()).getValues()[0];
  const conHorarios = p.horariosPendientes && String(valorCita(fila, s.cita.col, 'ESTADO') || '').trim() === ESTADO_POR_COORDINAR &&
    String(valorCita(fila, s.cita.col, 'PROPUESTO POR') || '') === 'INQUILINO';
  const pedidos = conHorarios ? _pedidosDe(fila, s.cita.col) : [];
  delete p.horariosPendientes;
  if (cambio || !p.estado) { p.estado = 'PROPUESTA'; p.motivo = ''; }
  _guardarProcesoMudanza_(s.cita, p, 'el inquilino propuso mudarse el ' + _textoMudanza_(datosNuevos) + (pedidos.length ? ' (junto con sus horarios de entrega)' : ''));
  const personas = (datosNuevos.personas || []).map(x => x.nombre).filter(Boolean);
  const vehiculos = (datosNuevos.vehiculos || []).map(v => (v.tipo === 'MOTO' ? 'Moto ' : 'Carro ') + v.marca + ' ' + v.modelo + ' · ' + v.placa);
  const cuerpo = (pedidos.length
      ? `<strong>${s.d.inquilino}</strong> terminó su parte de la entrega.<br><br><strong>🔑 Horarios para recibir el inmueble</strong> (elige uno):<br>` +
        pedidos.map(t => '• ' + _textoHorario(t)).join('<br>') + '<br><br>'
      : `<strong>${s.d.inquilino}</strong> propone su mudanza.<br><br>`) +
    `<strong>🚚 Mudanza:</strong> ${_textoMudanza_(datosNuevos)}<br>` +
    `<strong>👥 También viven:</strong> ${personas.length ? personas.join(', ') : 'nadie más'}<br>` +
    `<strong>🚗 Vehículos:</strong> ${vehiculos.length ? vehiculos.join('; ') : 'ninguno'}<br>` +
    (p.formato === 'SI' && (p.versiones || []).length ? '<strong>📄 Formato de la administración:</strong> ya lo llenó y cargó; revísalo en la sala.<br>' : '') + '<br>' +
    (_esCasa_(s.d) ? 'Confírmanos si el día de la mudanza está bien.' : 'Valida la mudanza con la administración del conjunto (a veces hay que reservar el ascensor) y apruébala en la sala.');
  _correoSala_(s, 'PROPIETARIO', pedidos.length ? '🔑 El inquilino eligió horarios de entrega y su mudanza - Gold Life' : '🚚 Propuesta de mudanza: ' + _textoMudanza_(datosNuevos) + ' - Gold Life',
    pedidos.length ? 'ENTREGA Y MUDANZA' : 'FECHA DE MUDANZA', cuerpo, pedidos.length ? '🔑 Abrir la sala de entrega' : '🚚 Revisar la fecha de mudanza');
}

/** El propietario aprueba la fecha de mudanza o dice que no es posible. */
function responderMudanza(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'PROPIETARIO') return { ok: false, mensaje: 'La fecha de mudanza la aprueba el propietario.' };
    const m = _datosMudanzaDe(s.cita.fila, s.cita.col);
    if (!m || !m.mudanza) return { ok: false, mensaje: 'El inquilino todavía no propone la fecha de mudanza.' };
    const p = _procesoMudanza_(s.cita.fila, s.cita.col);
    if (p.estado && p.estado !== 'PROPUESTA') return { ok: false, mensaje: p.estado === 'APROBADA' ? 'Ya aprobaste esta fecha de mudanza.' : 'Ya le pediste otra fecha al inquilino.' };
    if (datos.decision === 'APROBAR') {
      p.estado = 'APROBADA'; p.motivo = '';
      _guardarProcesoMudanza_(s.cita, p, 'el propietario aprobó la mudanza');
      _correoSala_(s, 'INQUILINO', '✅ Tu mudanza quedó aprobada: ' + _textoMudanza_(m) + ' - Gold Life', 'MUDANZA APROBADA',
        `El propietario aprobó tu mudanza para el <strong>${_textoMudanza_(m)}</strong>.` +
        (_esCasa_(s.d) ? '' : '<br><br>Si la administración pide algún formato, te llega en tu sala de entrega.'));
      return { ok: true, mensaje: 'Listo: la mudanza quedó aprobada y le avisamos a ' + s.d.inquilino.split(' ')[0] + '.' };
    }
    if (datos.decision === 'NO_POSIBLE') {
      const motivo = String(datos.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      p.estado = 'NO_POSIBLE'; p.motivo = motivo;
      _guardarProcesoMudanza_(s.cita, p, 'el propietario dijo que la mudanza no es posible' + (motivo ? ': ' + motivo : ''));
      _correoSala_(s, 'INQUILINO', '🚚 Elige otra fecha para tu mudanza - Gold Life', 'NUEVA FECHA DE MUDANZA',
        `La mudanza del <strong>${_textoMudanza_(m)}</strong> no es posible` + (motivo ? `:<br><br><em>“${motivo}”</em>` : '.') + '<br><br>Por favor propón otra fecha en tu sala de entrega.',
        '🚚 Elegir otra fecha');
      return { ok: true, mensaje: 'Listo: le pedimos a ' + s.d.inquilino.split(' ')[0] + ' otra fecha.' };
    }
    return { ok: false, mensaje: 'Acción no válida.' };
  } finally { lock.releaseLock(); }
}

function _carpetaVarios_(s) {
  const ref = _referenciaInmueble_(s.d.inm.id, s.d.inm.tipoInmueble);
  const contrato = buscarCarpetaContratoDinamica({ cdr: ref.cdr, tipoNegocio: 'Arriendo' });
  if (!contrato) throw new Error('No se encontró la carpeta de la entrega');
  const padre = contrato.getParents().next();
  const hijas = padre.getFolders();
  while (hijas.hasNext()) { const h = hijas.next(); if (/^4-\s*VARIOS/i.test(h.getName())) return h; }
  return padre;
}

function _guardarArchivoSala_(s, datos, nombre) {
  const mime = String(datos.mimeType || '').toLowerCase();
  const permitido = /^image\/|application\/pdf|officedocument|msword/.test(mime);
  if (!datos.base64 || !permitido) throw new Error('Sube un PDF, una foto o un documento de Word.');
  const ext = (String(datos.nombre || '').match(/\.([a-z0-9]{2,5})$/i) || [])[1] || (mime === 'application/pdf' ? 'pdf' : 'jpg');
  return _carpetaVarios_(s).createFile(Utilities.newBlob(Utilities.base64Decode(datos.base64), mime, nombre + '.' + ext));
}

/** El propietario dice si el conjunto tiene formato propio (y si sí, lo carga). */
function definirFormatoMudanza(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'PROPIETARIO') return { ok: false, mensaje: 'Esto lo responde el propietario.' };
    const p = _procesoMudanza_(s.cita.fila, s.cita.col);
    if (p.envio || (p.versiones || []).length) return { ok: false, mensaje: 'El formato ya está en curso con el inquilino.' };
    if (p.formato === 'NO' && datos.tiene === 'NO') return { ok: false, mensaje: 'Ya quedó: se usa el acta del sistema.' };
    if (datos.tiene === 'NO') {
      p.formato = 'NO';
      _guardarProcesoMudanza_(s.cita, p, 'el conjunto no tiene formato propio: se usa el acta del sistema');
      return { ok: true, mensaje: 'Listo: usamos el acta de solicitud de mudanza del sistema.' };
    }
    if (datos.tiene === 'SI') {
      const archivo = _guardarArchivoSala_(s, datos, 'FORMATO DE MUDANZA DE LA ADMINISTRACIÓN (en blanco) - ' + s.d.inm.id);
      if (p.plantilla && p.plantilla.id) { try { DriveApp.getFileById(p.plantilla.id).setTrashed(true); } catch (e) {} }
      p.formato = 'SI'; p.plantilla = { id: archivo.getId(), nombre: archivo.getName(), mime: archivo.getMimeType() };
      _guardarProcesoMudanza_(s.cita, p, 'el propietario cargó el formato de la administración');
      // Al inquilino le llega cuando el propietario ya hizo su parte de la entrega (propuso horarios o la acordó);
      // si no, va dentro del correo con los horarios del propietario (proponerSalaEntrega)
      if (_propietarioYaRespondio_(s.cita.fila, s.cita.col)) {
        avisarFormatoAlInquilino_(s);
        return { ok: true, mensaje: 'Listo: le pedimos a ' + s.d.inquilino.split(' ')[0] + ' que lo llene.' };
      }
      return { ok: true, mensaje: 'Listo: el formato quedó cargado. Le llega a ' + s.d.inquilino.split(' ')[0] + ' junto con tus horarios de entrega.' };
    }
    return { ok: false, mensaje: 'Acción no válida.' };
  } finally { lock.releaseLock(); }
}

/** Descargar un archivo de la sala: el formato en blanco o la última versión (ambas partes). */
function descargarArchivoSala(datos) {
  const s = _salaEntrega_(datos);
  if (s.error) return { ok: false, mensaje: s.error };
  const p = _procesoMudanza_(s.cita.fila, s.cita.col);
  const ref = datos.cual === 'version' ? (p.versiones || []).slice(-1)[0] : p.plantilla;
  if (!ref || !ref.id) return { ok: false, mensaje: 'Todavía no hay archivo.' };
  const f = DriveApp.getFileById(ref.id);
  return { ok: true, nombre: f.getName(), mimeType: f.getMimeType(), base64: Utilities.base64Encode(f.getBlob().getBytes()) };
}

/** El inquilino carga el formato lleno (una versión nueva). */
function cargarFormatoMudanza(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'INQUILINO') return { ok: false, mensaje: 'El formato lleno lo carga el inquilino.' };
    const p = _procesoMudanza_(s.cita.fila, s.cita.col);
    if (p.formato !== 'SI') return { ok: false, mensaje: 'Aún no hay formato de la administración.' };
    if (p.envio) return { ok: false, mensaje: 'El formato ya se envió a la administración.' };
    const ultima = (p.versiones || []).slice(-1)[0];
    // Antes de enviar el paso a paso todavía puede reemplazarlo (el propietario no lo ha visto)
    const sinEnviar = !_datosMudanzaDe(s.cita.fila, s.cita.col);
    if (ultima && ultima.estado !== 'CORREGIR' && !sinEnviar) return { ok: false, mensaje: ultima.estado === 'APROBADA' ? 'El propietario ya aprobó tu formato.' : 'Ya cargaste el formato: el propietario lo está revisando.' };
    if (ultima && sinEnviar) { try { DriveApp.getFileById(ultima.id).setTrashed(true); } catch (e) {} p.versiones.pop(); }
    const n = (p.versiones || []).length + 1;
    const archivo = _guardarArchivoSala_(s, datos, 'FORMATO DE MUDANZA - versión ' + n + ' - ' + s.d.inm.id);
    p.versiones = (p.versiones || []).concat([{ id: archivo.getId(), fecha: new Date().toISOString(), estado: 'EN_REVISION' }]);
    _guardarProcesoMudanza_(s.cita, p, 'el inquilino cargó la versión ' + n + ' del formato');
    // Si todavía no termina el paso a paso, el formato va en el correo único al propietario
    if (sinEnviar) return { ok: true, mensaje: '¡Listo! Quedó cargado. Ahora revisa el resumen y envíale todo al propietario.' };
    _correoSala_(s, 'PROPIETARIO', '📄 Revisa el formato de mudanza (versión ' + n + ') - Gold Life', 'FORMATO DE MUDANZA',
      `<strong>${s.d.inquilino}</strong> cargó el formato de mudanza lleno (versión ${n}). Revísalo: si le falta algún dato o firma, pídele la corrección.`,
      '📄 Revisar el formato');
    return { ok: true, mensaje: '¡Listo! El propietario lo revisa y te avisamos.' };
  } finally { lock.releaseLock(); }
}

/** El propietario aprueba la versión del formato o pide corrección. */
function revisarFormatoMudanza(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'PROPIETARIO') return { ok: false, mensaje: 'El formato lo revisa el propietario.' };
    const p = _procesoMudanza_(s.cita.fila, s.cita.col);
    const v = (p.versiones || []).slice(-1)[0];
    if (!v || v.estado !== 'EN_REVISION') return { ok: false, mensaje: 'No hay una versión nueva por revisar.' };
    const n = p.versiones.length;
    if (datos.decision === 'APROBAR') {
      v.estado = 'APROBADA';
      _guardarProcesoMudanza_(s.cita, p, 'el propietario aprobó la versión ' + n + ' del formato');
      _correoSala_(s, 'INQUILINO', '✅ Tu formato de mudanza quedó aprobado - Gold Life', 'FORMATO APROBADO',
        'El propietario aprobó tu formato de mudanza. Ahora se envía a la administración.');
      return { ok: true, mensaje: 'Listo: la versión ' + n + ' quedó aprobada. Ahora elige cómo enviarla a la administración.' };
    }
    if (datos.decision === 'CORREGIR') {
      const comentario = String(datos.comentario || '').replace(/\s+/g, ' ').trim().slice(0, 400);
      if (!comentario) return { ok: false, mensaje: 'Cuéntale al inquilino qué debe corregir.' };
      v.estado = 'CORREGIR'; v.comentario = comentario;
      _guardarProcesoMudanza_(s.cita, p, 'el propietario pidió corregir la versión ' + n + ': ' + comentario);
      _correoSala_(s, 'INQUILINO', '✏️ Corrige el formato de mudanza - Gold Life', 'CORRECCIÓN DEL FORMATO',
        `El propietario revisó tu formato (versión ${n}) y pide esta corrección:<br><br><em>“${comentario}”</em><br><br>Corrígelo y cárgalo de nuevo en tu sala de entrega.`,
        '📄 Cargar el formato corregido');
      return { ok: true, mensaje: 'Listo: le pedimos la corrección a ' + s.d.inquilino.split(' ')[0] + '.' };
    }
    return { ok: false, mensaje: 'Acción no válida.' };
  } finally { lock.releaseLock(); }
}

/** El acta del sistema (sin formato propio) en PDF, generada con los datos actuales. */
function _actaSistemaPdf_(s) {
  const r = generarCartaAdministracion_(s.cita.sheet, s.cita.col, s.cita.numFila, s.cita.sheet.getRange(s.cita.numFila, 1, 1, s.cita.sheet.getLastColumn()).getValues()[0]);
  if (!r.ok) throw new Error('No se pudo generar el acta: ' + r.motivo);
  return DriveApp.getFileById(r.id).getAs(MimeType.PDF).setName('Acta de solicitud de mudanza - ' + s.d.inm.id + '.pdf');
}

/** El propietario envía el documento a la administración: desde el sistema o él mismo. */
function enviarActaMudanza(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const s = _salaEntrega_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'PROPIETARIO') return { ok: false, mensaje: 'El envío lo hace el propietario.' };
    const p = _procesoMudanza_(s.cita.fila, s.cita.col);
    if (p.estado !== 'APROBADA') return { ok: false, mensaje: 'Primero aprueba la fecha de mudanza.' };
    if (p.envio) return { ok: false, mensaje: 'Ya se envió a la administración.' };
    let adjunto;
    if (p.formato === 'SI') {
      const v = (p.versiones || []).slice(-1)[0];
      if (!v || v.estado !== 'APROBADA') return { ok: false, mensaje: 'Primero aprueba el formato que llenó el inquilino.' };
      adjunto = DriveApp.getFileById(v.id).getBlob();
    } else if (p.formato === 'NO') {
      adjunto = _actaSistemaPdf_(s);
    } else return { ok: false, mensaje: 'Primero dinos si el conjunto tiene formato propio.' };

    const ref = _referenciaInmueble_(s.d.inm.id, s.d.inm.tipoInmueble);
    const m = _datosMudanzaDe(s.cita.fila, s.cita.col);
    const asunto = 'Solicitud de mudanza · ' + (ref.referencia || s.d.direccion) + ' · ' + _textoMudanza_(m);
    if (datos.modo === 'SISTEMA') {
      const correo = String(datos.correo || ref.correoAdmin || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return { ok: false, mensaje: 'Escribe el correo de la administración.' };
      // Si el registro no lo tenía, queda guardado
      if (!ref.correoAdmin) {
        const c = _contratoDe(s.d.inm.id);
        const i = c.headers.indexOf('Correo electrónico de la administración');
        if (i !== -1) c.sheet.getRange(c.fila, i + 1).setValue(correo);
      }
      MailApp.sendEmail({
        to: correo, cc: s.d.inm.correoPropietario || '', bcc: CUENTA_COBRO.CORREO_ADMIN, subject: asunto,
        htmlBody: _plantillaCorreo('🚚 Solicitud de mudanza', 'Administración ' + (ref.admin || ''),
          `En nombre del propietario <strong>${s.d.inm.propietario || ''}</strong>, les enviamos la solicitud de mudanza del inmueble <strong>${ref.referencia || s.d.direccion}</strong> ` +
          `para el <strong>${_textoMudanza_(m)}</strong>, del nuevo arrendatario <strong>${s.d.inquilino}</strong>.`,
          'Adjuntamos el documento. Quedamos atentos a cualquier requisito adicional (reserva de ascensor, horarios, etc.).', '', ''),
        attachments: [adjunto]
      });
      p.envio = { modo: 'SISTEMA', correo: correo, fecha: new Date().toISOString() };
      _guardarProcesoMudanza_(s.cita, p, 'enviado a la administración desde el sistema (' + correo + ')');
    } else if (datos.modo === 'YO') {
      MailApp.sendEmail({
        to: s.d.inm.correoPropietario, bcc: CUENTA_COBRO.CORREO_ADMIN, subject: '📄 ' + asunto + ' (para que lo envíes)',
        htmlBody: _plantillaCorreo('📄 Documento de mudanza', String(s.d.inm.propietario || '').split(' ')[0],
          `Te adjuntamos el documento de mudanza de <strong>${s.d.inquilino}</strong> para el <strong>${_textoMudanza_(m)}</strong>.`,
          'Reenvíalo a la administración del conjunto cuando quieras.', '', ''),
        attachments: [adjunto]
      });
      p.envio = { modo: 'YO', fecha: new Date().toISOString() };
      _guardarProcesoMudanza_(s.cita, p, 'enviado al propietario para que él lo envíe a la administración');
    } else return { ok: false, mensaje: 'Acción no válida.' };
    _correoSala_(s, 'INQUILINO', '🚚 Tu solicitud de mudanza va para la administración - Gold Life', 'MUDANZA',
      `La solicitud de tu mudanza del <strong>${_textoMudanza_(m)}</strong> ${datos.modo === 'SISTEMA' ? 'ya se envió a la administración del conjunto' : 'la envía el propietario a la administración'}.`);
    return { ok: true, mensaje: datos.modo === 'SISTEMA' ? 'Listo: lo enviamos a la administración y a ti te llegó copia.' : 'Listo: te lo enviamos a tu correo para que lo reenvíes.' };
  } finally { lock.releaseLock(); }
}

/** ¿El propietario ya hizo su parte de la entrega? (propuso horarios o la entrega quedó acordada) */
function _propietarioYaRespondio_(fila, col) {
  return String(valorCita(fila, col, 'ESTADO') || '').trim() !== ESTADO_POR_COORDINAR ||
    String(valorCita(fila, col, 'PROPUESTO POR') || '') === 'PROPIETARIO';
}

/** ¿Hay un formato cargado que el inquilino todavía no conoce por correo? */
function formatoPendienteDeAviso_(fila, col) {
  const p = _procesoMudanza_(fila, col);
  return p.formato === 'SI' && !p.formatoAvisado && !(p.versiones || []).length;
}

/** Marca el formato como avisado; con correo propio, salvo que vaya dentro de otro correo. */
function avisarFormatoAlInquilino_(s, sinCorreo) {
  const fila = s.cita.sheet.getRange(s.cita.numFila, 1, 1, s.cita.sheet.getLastColumn()).getValues()[0];
  if (!formatoPendienteDeAviso_(fila, s.cita.col)) return;
  const p = _procesoMudanza_(fila, s.cita.col);
  p.formatoAvisado = true;
  _guardarProcesoMudanza_(Object.assign({}, s.cita, { fila: fila }), p, 'se le avisó al inquilino del formato de la administración');
  if (sinCorreo) return;
  _correoSala_(s, 'INQUILINO', '📄 Llena el formato de mudanza de la administración - Gold Life', 'FORMATO DE MUDANZA',
    'La administración del conjunto tiene su propio formato de mudanza. Descárgalo en tu sala de entrega, llénalo y cárgalo; el propietario lo revisa antes de enviarlo.',
    '📄 Descargar y cargar el formato');
}
