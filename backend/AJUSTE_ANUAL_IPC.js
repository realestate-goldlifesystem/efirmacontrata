/**
 * ===== El año nuevo de un contrato renovado: canon con IPC (etapa 3, parte 2 · 28-oct-2026) =====
 *
 * Cuando las dos partes renuevan (RENOVACION_CONTRATO.js):
 *  1. Solo el canon sube con el IPC del año calendario anterior al nuevo año. El IPC lo escribe
 *     Leonardo una vez por año (Script Property IPC_<año>) y sirve para todos los contratos.
 *  2. El propietario ve el canon nuevo, escribe la administración plena del nuevo año y carga el recibo.
 *  3. Leonardo revisa y aprueba (o pide corrección) antes de avisarle al inquilino.
 *  4. Al aprobar: "acta de notificación de incremento IPC" desde la plantilla maestra (solo se llenan
 *     los espacios, el porcentaje y el año) y correo al inquilino y al propietario. Los meses de ese
 *     año (13…24, 25…36) toman los valores nuevos (valoresDelMes_).
 *
 * Estado: AJUSTE_<id>_<año del contrato> en Script Properties. Página: frontend/ajuste_anual.html
 * (?k=<id>&a=<año del contrato>&r=p|a&t=<token>).
 */

const PLANTILLA_ACTA_IPC_ID = '1_yLQrHpqLVaUEfiFpHyvIzHGMx4pSdQrpFlDVqMhusg';
const URL_PAGINA_AJUSTE = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/ajuste_anual.html';
const ROL_AJUSTE = { p: 'PROPIETARIO', a: 'AGENTE' };

function _claveAjuste_(idInm, anio) { return 'AJUSTE_' + idInm + '_' + anio; }
function _leerAjuste_(idInm, anio) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(_claveAjuste_(idInm, anio)) || 'null'); } catch (e) { return null; }
}
function _guardarAjuste_(idInm, anio, a) { PropertiesService.getScriptProperties().setProperty(_claveAjuste_(idInm, anio), JSON.stringify(a)); }

function tokenAjuste(idInm, anio, rol) {
  const firma = Utilities.computeHmacSha256Signature('AJUSTE:' + idInm + ':' + anio + ':' + rol, _secretoCoordinar());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 32);
}
function urlAjuste(idInm, anio, rol) {
  return URL_PAGINA_AJUSTE + '?k=' + encodeURIComponent(idInm) + '&a=' + anio + '&r=' + (rol === 'AGENTE' ? 'a' : 'p') + '&t=' + tokenAjuste(idInm, anio, rol);
}

const _ipcDe_ = (anioIpc) => { const v = PropertiesService.getScriptProperties().getProperty('IPC_' + anioIpc); return v === null ? null : Number(v); };
const _redondear100_ = (n) => Math.round(n / 100) * 100;

/**
 * Canon y administración de un mes del contrato: el año 1 sale de la hoja; desde el año 2,
 * del ajuste aprobado de ese año (si aún no está aprobado, siguen los del año anterior).
 */
function valoresDelMes_(idInm, c, mes) {
  let canon = Number(c.v('CANON FINAL DEL CONTRATO')) || 0;
  let admin = Number(c.v('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)')) || 0;
  const anio = Math.floor((Number(mes) - 1) / 12) + 1;
  for (let k = 2; k <= anio; k++) {
    const a = _leerAjuste_(idInm, k);
    if (a && a.estado === 'APROBADO') { canon = a.canonNuevo; admin = a.adminNueva; }
  }
  return { canon: canon, admin: admin };
}

// ---------- 1. Arranca al renovarse el contrato ----------

/** f: fechas del periodo que se renovó (cvFechasClave). */
function iniciarAjusteAnual_(idInm, c, partes, f) {
  const nuevoInicio = cvSumarDias(f.fin, 1);
  const inicioContrato = cvLeerFecha(c.v('FECHA INICIO DEL CONTRATO'));
  const mesNuevo = cvPeriodo(inicioContrato, nuevoInicio).numero;
  const anio = Math.floor((mesNuevo - 1) / 12) + 1;
  if (_leerAjuste_(idInm, anio)) return;
  const antes = valoresDelMes_(idInm, c, mesNuevo - 1);
  const a = {
    anio: anio, mesDesde: mesNuevo, desde: cvTexto(nuevoInicio), anioIpc: nuevoInicio.y - 1,
    canonAnterior: antes.canon, adminAnterior: antes.admin, historial: []
  };
  if (_ipcDe_(a.anioIpc) === null) sincroIPC(a.anioIpc); // si el DANE ya lo publicó, no hay que esperar
  _ajusteConIpc_(a, _ipcDe_(a.anioIpc));
  if (a.ipc !== undefined) a.historial.push(_ahoraTxt_() + ' · IPC ' + a.anioIpc + ': ' + a.ipc + '% (DANE)');
  _guardarAjuste_(idInm, anio, a);
  _avisarSegunEstado_(idInm, a, partes);
}

function _ajusteConIpc_(a, ipc) {
  if (ipc === null || isNaN(ipc)) { a.estado = 'ESPERANDO_IPC'; return; }
  a.ipc = ipc;
  a.canonNuevo = _redondear100_(a.canonAnterior * (1 + ipc / 100));
  if (!a.estado || a.estado === 'ESPERANDO_IPC') a.estado = 'ESPERANDO_PROPIETARIO';
}

const _miles_ = (n) => '$ ' + ccMiles(Math.round(Number(n) || 0));

function _avisarSegunEstado_(idInm, a, partes) {
  const fechaDesde = _textoCv_(cvLeerFecha(a.desde));
  if (a.estado === 'ESPERANDO_IPC') {
    _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '📈 Falta el IPC ' + a.anioIpc + ' para el canon de ' + idInm, 'IPC DEL AÑO ' + a.anioIpc, 'Leonardo',
      `El contrato del inmueble <strong>${idInm}</strong> (${partes.direccion}) se renovó y empieza su nuevo año el <strong>${fechaDesde}</strong>.<br><br>` +
      `Para calcular el canon nuevo falta el <strong>IPC del año ${a.anioIpc}</strong>. El DANE aún no lo publica (sale hacia el 8 de enero): ` +
      'el sistema lo revisa solo cada día y sigue el proceso apenas salga. Si lo quieres adelantar, puedes escribirlo tú.',
      htmlBotonesCorreo([{ texto: '📈 Escribir el IPC', color: '#b8860b', url: urlAjuste(idInm, a.anio, 'AGENTE') }]));
  } else if (a.estado === 'ESPERANDO_PROPIETARIO' || a.estado === 'CORREGIR') {
    const p = partes.PROPIETARIO;
    if (String(p.correo).indexOf('@') === -1) return;
    _correoCitaSeguro(p.correo, (a.estado === 'CORREGIR' ? '✏️ Corrige los valores del nuevo año' : '📈 Valores del nuevo año de tu contrato') + ' - Gold Life',
      a.estado === 'CORREGIR' ? 'CORRIGE LOS VALORES' : 'NUEVO AÑO DEL CONTRATO', _primerNombre_(p.nombre),
      (a.estado === 'CORREGIR' ? `Leonardo revisó los valores del nuevo año y te pide una corrección:<br><em>“${a.comentario || ''}”</em><br><br>` :
        `Tu contrato del inmueble en <strong>${partes.direccion}</strong> se renovó. El nuevo año empieza el <strong>${fechaDesde}</strong>.<br><br>`) +
      `📈 El canon sube con el IPC de ${a.anioIpc} (<strong>${Number(a.ipc).toFixed(2)}%</strong>): de <strong>${_miles_(a.canonAnterior)}</strong> a <strong>${_miles_(a.canonNuevo)}</strong>.<br><br>` +
      'Escribe el valor de la <strong>administración plena del nuevo año</strong> y carga el recibo de administración para validarlo.',
      htmlBotonesCorreo([{ texto: '📝 Completar los valores', color: '#b8860b', url: urlAjuste(idInm, a.anio, 'PROPIETARIO') }]));
  } else if (a.estado === 'REVISION') {
    _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '📈 Revisa los valores del nuevo año · ' + idInm, 'REVISA EL NUEVO AÑO', 'Leonardo',
      `<strong>${partes.PROPIETARIO.nombre}</strong> completó los valores del nuevo año del inmueble <strong>${idInm}</strong> (${partes.direccion}), desde el <strong>${fechaDesde}</strong>:<br><br>` +
      `Canon: ${_miles_(a.canonAnterior)} → <strong>${_miles_(a.canonNuevo)}</strong> (IPC ${a.anioIpc}: ${Number(a.ipc).toFixed(2)}%)<br>` +
      `Administración: ${_miles_(a.adminAnterior)} → <strong>${_miles_(a.adminNueva)}</strong><br><br>Revisa el recibo y apruébalo para avisarle al inquilino.`,
      htmlBotonesCorreo([{ texto: '🔎 Revisar y aprobar', color: '#b8860b', url: urlAjuste(idInm, a.anio, 'AGENTE') }]));
  }
}

/** Ajustes de todos los contratos detenidos esperando el IPC. */
function _ajustesEsperandoIpc_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(props).filter(k => /^AJUSTE_/.test(k)).map(k => {
    let a = null; try { a = JSON.parse(props[k]); } catch (e) {}
    const m = k.match(/^AJUSTE_(.+)_(\d+)$/);
    return a && m && a.estado === 'ESPERANDO_IPC' ? { idInm: m[1], anio: Number(m[2]), a: a } : null;
  }).filter(Boolean);
}

/** Cuando ya está el IPC (del DANE o escrito a mano), cada ajuste que lo esperaba sigue al propietario. */
function _destrabarAjustesConIpc_() {
  _ajustesEsperandoIpc_().forEach(x => {
    const ipc = _ipcDe_(x.a.anioIpc);
    if (ipc === null) return;
    const lock = LockService.getScriptLock(), antes = _SIN_CORREO_; lock.waitLock(20000);
    try {
      const a = _leerAjuste_(x.idInm, x.anio);
      if (!a || a.estado !== 'ESPERANDO_IPC') return;
      const c = _contratoDe(x.idInm);
      if (!c) return;
      activarSinCorreoFila_(x.idInm);
      _ajusteConIpc_(a, ipc);
      a.historial.push(_ahoraTxt_() + ' · IPC ' + a.anioIpc + ': ' + ipc + '% (DANE)');
      _guardarAjuste_(x.idInm, x.anio, a);
      _avisarSegunEstado_(x.idInm, a, _partesContrato_(x.idInm, c));
    } catch (e) { Logger.log('Ajuste ' + x.idInm + ': ' + e.message); }
    finally { _SIN_CORREO_ = antes; lock.releaseLock(); }
  });
}

// ---------- 2. La página ----------

function _ajusteDesdeEnlace_(datos) {
  const rol = ROL_AJUSTE[datos.r];
  const idInm = String(datos.k || ''), anio = Number(datos.a);
  if (!rol || !idInm || !anio || !datos.t || String(datos.t) !== tokenAjuste(idInm, anio, rol)) return { error: 'Este enlace no es válido.' };
  const a = _leerAjuste_(idInm, anio);
  if (!a) return { error: 'No encontramos el ajuste de este año.' };
  const c = _contratoDe(idInm);
  if (!c) return { error: 'No encontramos el contrato.' };
  return { rol: rol, idInm: idInm, anio: anio, a: a, c: c };
}

function infoAjusteAnual(datos) {
  const s = _ajusteDesdeEnlace_(datos);
  if (s.error) return { ok: false, mensaje: s.error };
  const partes = _partesContrato_(s.idInm, s.c);
  const a = s.a;
  return {
    ok: true, rol: s.rol, idInm: s.idInm, direccion: partes.direccion, propietario: partes.PROPIETARIO.nombre, inquilino: partes.INQUILINO.nombre,
    estado: a.estado, anioIpc: a.anioIpc, ipc: a.ipc === undefined ? null : a.ipc, desdeTexto: _textoCv_(cvLeerFecha(a.desde)), mesDesde: a.mesDesde,
    canonAnterior: a.canonAnterior, canonNuevo: a.canonNuevo || null, adminAnterior: a.adminAnterior, adminNueva: a.adminNueva === undefined ? null : a.adminNueva,
    recibo: s.rol === 'AGENTE' ? (a.recibo || '') : (a.recibo ? 'cargado' : ''), comentario: a.comentario || '', acta: s.rol === 'AGENTE' ? (a.acta || '') : ''
  };
}

/** Leonardo escribe el IPC del año (sirve para todos los contratos de ese año). */
function guardarIpcAjuste(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = _ajusteDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'AGENTE') return { ok: false, mensaje: 'El IPC lo escribe Leonardo.' };
    if (s.a.estado !== 'ESPERANDO_IPC') return { ok: false, mensaje: 'El IPC de este año ya está.' };
    const ipc = Number(String(datos.ipc || '').replace(',', '.'));
    if (!(ipc > 0 && ipc < 30)) return { ok: false, mensaje: 'Escribe el IPC como porcentaje, por ejemplo 5.2.' };
    PropertiesService.getScriptProperties().setProperty('IPC_' + s.a.anioIpc, String(ipc));
    _ajusteConIpc_(s.a, ipc);
    s.a.historial.push(_ahoraTxt_() + ' · IPC ' + s.a.anioIpc + ': ' + ipc + '%');
    _guardarAjuste_(s.idInm, s.anio, s.a);
    _avisarSegunEstado_(s.idInm, s.a, _partesContrato_(s.idInm, s.c));
    return { ok: true, mensaje: 'Listo: con el IPC de ' + s.a.anioIpc + ' el canon queda en ' + _miles_(s.a.canonNuevo) + '. Le pedimos al propietario la administración nueva.' };
  } finally { lock.releaseLock(); }
}

/** El propietario escribe la administración nueva y carga el recibo. */
function enviarAjustePropietario(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    _prog_(datos, 10, 'Revisando los valores');
    const s = _ajusteDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'PROPIETARIO') return { ok: false, mensaje: 'Esto lo completa el propietario.' };
    if (['ESPERANDO_PROPIETARIO', 'CORREGIR'].indexOf(s.a.estado) === -1) return { ok: false, mensaje: s.a.estado === 'APROBADO' ? 'Los valores del nuevo año ya quedaron aprobados.' : 'Ya enviaste los valores. Leonardo los está revisando.' };
    const admin = Math.round(Number(String(datos.admin || '').replace(/\D/g, '')));
    if (!(admin >= 0) || String(datos.admin || '').trim() === '') return { ok: false, mensaje: 'Escribe el valor de la administración.' };
    if (!datos.base64 && !s.a.recibo) return { ok: false, mensaje: 'Carga el recibo de administración.' };
    if (datos.base64) {
      _prog_(datos, 35, 'Guardando el recibo de administración');
      const nombre = 'RECIBO ADMINISTRACIÓN AÑO ' + s.anio + ' - ' + s.idInm + (/pdf/.test(datos.mimeType) ? '.pdf' : '.jpg');
      const archivo = _carpetaDelContrato_(s.c, '1- RECIBO HE INSTRUCTIVO DE PAGO DE ADMINISTRACION')
        .createFile(Utilities.newBlob(Utilities.base64Decode(datos.base64), datos.mimeType || 'image/jpeg', nombre));
      s.a.recibo = archivo.getUrl();
    }
    s.a.adminNueva = admin;
    s.a.estado = 'REVISION';
    delete s.a.comentario;
    s.a.historial.push(_ahoraTxt_() + ' · el propietario envió la administración ' + _miles_(admin));
    _guardarAjuste_(s.idInm, s.anio, s.a);
    _prog_(datos, 70, 'Avisándole a Leonardo');
    _avisarSegunEstado_(s.idInm, s.a, _partesContrato_(s.idInm, s.c));
    _prog_(datos, 96, 'Terminando');
    return { ok: true, mensaje: 'Listo: Leonardo revisa los valores y le avisamos al inquilino.' };
  } finally { lock.releaseLock(); }
}

/** Leonardo aprueba (sale el acta al inquilino) o pide corrección al propietario. */
function revisarAjusteAnual(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    _prog_(datos, 8, 'Revisando');
    const s = _ajusteDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'AGENTE') return { ok: false, mensaje: 'Esto lo revisa Leonardo.' };
    if (s.a.estado !== 'REVISION') return { ok: false, mensaje: s.a.estado === 'APROBADO' ? 'Ya está aprobado.' : 'No hay valores por revisar.' };
    const partes = _partesContrato_(s.idInm, s.c);
    if (datos.decision === 'CORREGIR') {
      const comentario = String(datos.comentario || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!comentario) return { ok: false, mensaje: 'Escribe qué hay que corregir.' };
      s.a.estado = 'CORREGIR'; s.a.comentario = comentario;
      s.a.historial.push(_ahoraTxt_() + ' · Leonardo pidió corrección: ' + comentario);
      _guardarAjuste_(s.idInm, s.anio, s.a);
      _avisarSegunEstado_(s.idInm, s.a, partes);
      return { ok: true, mensaje: 'Le pedimos la corrección al propietario.' };
    }
    if (datos.decision !== 'APROBAR') return { ok: false, mensaje: 'Acción no válida.' };
    s.a.estado = 'APROBADO';
    s.a.historial.push(_ahoraTxt_() + ' · Leonardo aprobó');
    _guardarAjuste_(s.idInm, s.anio, s.a);
    _prog_(datos, 30, 'Preparando el acta de incremento');
    let acta = null;
    try { acta = _actaIncrementoIpc_(s.c, partes, s.a); s.a.acta = acta.url; _guardarAjuste_(s.idInm, s.anio, s.a); }
    catch (e) { Logger.log('⚠️ Acta de incremento de ' + s.idInm + ': ' + e.message); }
    _prog_(datos, 65, 'Avisándoles al inquilino y al propietario');
    _correosAjusteAprobado_(partes, s.a, acta);
    _prog_(datos, 96, 'Terminando');
    return { ok: true, mensaje: 'Aprobado: le enviamos al inquilino el acta con los valores del nuevo año.' + (acta ? '' : ' (El acta no se pudo generar: hazla a mano.)') };
  } finally { lock.releaseLock(); }
}

const _ahoraTxt_ = () => Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy HH:mm');

/** Una carpeta con ese nombre subiendo desde la carpeta del contrato; si no está, la del contrato. */
function _carpetaDelContrato_(c, nombre) {
  const cdr = String(c.v('CODIGO DE REGISTRO') || c.v('ID DE REGISTRO'));
  const base = buscarCarpetaContratoDinamica({ cdr: cdr, tipoNegocio: 'Arriendo' });
  let carpeta = base;
  for (let k = 0; k < 7 && carpeta; k++) {
    const it = carpeta.getFoldersByName(nombre);
    if (it.hasNext()) return it.next();
    const ps = carpeta.getParents(); carpeta = ps.hasNext() ? ps.next() : null;
  }
  return base;
}

// ---------- 3. Acta y correos ----------

function _actaIncrementoIpc_(c, partes, a) {
  const carpeta = _carpetaDelContrato_(c, 'ACTAS DE ENTREGA A PROPIETARIO');
  const nombreArchivo = 'ACTA DE INCREMENTO IPC - ' + c.v('ID DE REGISTRO') + ' - AÑO ' + a.anio;
  const copia = DriveApp.getFileById(PLANTILLA_ACTA_IPC_ID).makeCopy(nombreArchivo, carpeta);
  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();
  const poner = (buscar, valor) => body.replaceText(buscar, String(valor === undefined || valor === null ? '' : valor).replace(/\$/g, '\\$'));
  const miles = (n) => ccMiles(Math.round(n));
  const prop = partes.PROPIETARIO;
  poner('\\[Ciudad y Fecha\\]', (partes.ciudad ? partes.ciudad + ', ' : '') + _fechaLarga_(new Date()));
  poner('\\[Nombre del Arrendatario\\]', partes.INQUILINO.nombre);
  poner('\\[Dirección del Inmueble\\]', partes.direccion);
  // El porcentaje y el año vienen escritos en la plantilla: se cambian por los de este ajuste
  poner('incremento del [0-9]+([.,][0-9]+)?%', 'incremento del ' + Number(a.ipc).toFixed(2) + '%');
  poner('IPC \\(Índice de Precios al Consumidor\\) del año [0-9]{4}', 'IPC (Índice de Precios al Consumidor) del año ' + a.anioIpc);
  poner('\\[fecha de incremento\\]', _textoCv_(cvLeerFecha(a.desde)));
  poner('\\[valor actual\\]', miles(a.canonAnterior));
  poner('\\[diferencia\\]', miles(a.canonNuevo - a.canonAnterior));
  // "[nuevo valor]" sale dos veces: el canon nuevo y el total con la administración
  [a.canonNuevo, a.canonNuevo + a.adminNueva].forEach(v => {
    const r = body.findText('\\[nuevo valor\\]');
    if (r) r.getElement().asText().deleteText(r.getStartOffset(), r.getEndOffsetInclusive()).insertText(r.getStartOffset(), miles(v));
  });
  // La firma viene en un solo párrafo: queda una línea por dato, con el mismo formato
  const r = body.findText('\\[Nombre del Arrendador\\]');
  if (r) {
    const p = r.getElement().getParent().asParagraph();
    const lineas = [prop.nombre, prop.documento ? 'C.C. ' + prop.documento : '', prop.celular, prop.correo].filter(Boolean);
    const attrs = p.getAttributes(), idx = body.getChildIndex(p);
    p.setText(lineas[0]);
    lineas.slice(1).forEach((l, k) => body.insertParagraph(idx + 1 + k, l).setAttributes(attrs));
  }
  doc.saveAndClose();
  const pdf = copia.getAs(MimeType.PDF).setName(nombreArchivo + '.pdf');
  carpeta.createFile(pdf);
  return { url: copia.getUrl(), pdf: pdf };
}

function _correosAjusteAprobado_(partes, a, acta) {
  const desde = _textoCv_(cvLeerFecha(a.desde));
  const tabla = `Desde el <strong>${desde}</strong> (mes ${a.mesDesde} del contrato):<br><br>` +
    `🏠 Canon: ${_miles_(a.canonAnterior)} → <strong>${_miles_(a.canonNuevo)}</strong> (IPC ${a.anioIpc}: ${Number(a.ipc).toFixed(2)}%)<br>` +
    `🏢 Administración: <strong>${_miles_(a.adminNueva)}</strong><br>` +
    `💳 Total mensual: <strong>${_miles_(a.canonNuevo + a.adminNueva)}</strong>`;
  const adj = acta ? [acta.pdf] : null;
  [['INQUILINO', 'Estos son los valores del nuevo año de tu contrato de arrendamiento del inmueble en <strong>' + partes.direccion + '</strong>.'],
   ['PROPIETARIO', 'Quedaron aprobados los valores del nuevo año del inmueble en <strong>' + partes.direccion + '</strong> y se los enviamos al inquilino.']].forEach(([rol, intro]) => {
    const p = partes[rol];
    if (String(p.correo).indexOf('@') === -1) return;
    try {
      enviarCorreoCita(p.correo, '📈 Valores del nuevo año de tu contrato - Gold Life', 'NUEVO AÑO DEL CONTRATO', _primerNombre_(p.nombre),
        intro + '<br><br>' + tabla + (adj ? '<br><br>📄 Adjuntamos el acta de notificación del incremento.' : ''), '', adj);
    } catch (e) { Logger.log('⚠️ Correo del nuevo año a ' + rol + ': ' + e.message); }
  });
}
