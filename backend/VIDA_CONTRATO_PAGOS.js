/**
 * PAGOS DEL ARRIENDO MES A MES — bloque 5 del plan de agendas (25-oct-2026)
 * PLAN_AGENDAS_Y_RECORDATORIOS.md, 6.3.1 ("Flujo acordado el 25-oct-2026").
 *
 * Orden de los correos de un contrato nuevo:
 *  1. Al cargar el contrato autenticado solo se abre la sala de entrega (AGENDA_ENTREGA.js).
 *  2. Cuando inquilino y propietario acuerdan la fecha de entrega (alAcordarEntrega_):
 *     - al propietario, el acceso a su carpeta de entregas;
 *     - si el propietario autorizó el cobro del primer canon al agente: al inquilino la
 *       cuenta de cobro a cuenta externa (GESTOR_CUENTA_EXTERNA.js) con el botón para
 *       cargar el comprobante; lo revisa Leonardo.
 *     - si no: al propietario la cuenta de cobro de honorarios (GESTOR_CUENTA_COBRO.js) y
 *       al inquilino el cobro del primer mes a la cuenta del propietario, con el botón;
 *       lo revisa el propietario.
 *  3. El día de la entrega, si el inquilino no ha cargado el comprobante, recordatorio.
 *  4. Al cargarlo, quien recibió el pago lo revisa: "Sí es" (deslizar → "Recibí el pago")
 *     o "No es" (con motivo; al inquilino se le pide el correcto). Al confirmar, constancia
 *     al inquilino; con el primero, el acceso a su carpeta; en el mes 1 cobrado por
 *     Leonardo, se le pide el comprobante del excedente al propietario.
 *  5. Desde el mes 2 (días contados desde FECHA INICIO DEL CONTRATO): días 1, 4 y 5 con el
 *     botón; día 6 sin confirmar, mora al inquilino y al propietario y el caso a Leonardo.
 *     Si nadie revisa en 2 días, recordatorio a quien revisa.
 *
 * Cada mes de cada contrato es una fila de "3 - PAGOS MENSUALES". Solo entran los
 * contratos cargados desde que esto existe (marca FLUJO_PAGOS_NUEVO_<id>).
 */

const HOJA_PAGOS = '3 - PAGOS MENSUALES';
const COLUMNAS_PAGOS = ['ID PAGO', 'ID INMUEBLE', 'MES', 'DIA 1', 'ESTADO', 'REVISA', 'ARCHIVO', 'FECHA CARGA', 'MOTIVO', 'AVISOS', 'TOKEN', 'HISTORIAL', 'ACTUALIZADO'];
const ESTADOS_PAGO = { PENDIENTE: 'PENDIENTE', CARGADO: 'CARGADO', VALIDADO: 'VALIDADO', NO_ES: 'NO ES' };
const URL_PAGINA_PAGO = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/comprobante_mes.html';
const HORAS_RECORDAR_REVISION = 48;

// ---------- Hoja ----------

function _hojaPagos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(HOJA_PAGOS);
  if (!sheet) {
    sheet = ss.insertSheet(HOJA_PAGOS);
    sheet.getRange(1, 1, 1, COLUMNAS_PAGOS.length).setValues([COLUMNAS_PAGOS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  const h = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(x => String(x).trim());
  const col = {};
  h.forEach((n, i) => { if (n) col[n] = i + 1; });
  return { sheet: sheet, col: col };
}

function _filasPagos() {
  const { sheet, col } = _hojaPagos();
  const ultima = sheet.getLastRow();
  const filas = ultima < 2 ? [] : sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
  const v = (f, n) => col[n] ? f[col[n] - 1] : '';
  return { sheet: sheet, col: col, filas: filas, v: v };
}

function _pagoPorId(idPago) {
  const t = _filasPagos();
  const i = t.filas.findIndex(f => String(t.v(f, 'ID PAGO')) === String(idPago));
  if (i === -1) return null;
  return { sheet: t.sheet, col: t.col, numFila: i + 2, fila: t.filas[i], v: (n) => t.v(t.filas[i], n) };
}

function _pagoDe(idInm, mes) {
  const t = _filasPagos();
  const i = t.filas.findIndex(f => String(t.v(f, 'ID INMUEBLE')) === String(idInm) && Number(t.v(f, 'MES')) === Number(mes));
  return i === -1 ? null : _pagoPorId(t.v(t.filas[i], 'ID PAGO'));
}

function _escribirPago(p, n, valor) { if (p.col[n]) p.sheet.getRange(p.numFila, p.col[n]).setValue(valor); }

function _celdaPago(p, n) { return p.col[n] ? p.sheet.getRange(p.numFila, p.col[n]).getValue() : ''; }

function _historialPago(p, texto) {
  const antes = String(_celdaPago(p, 'HISTORIAL') || '');
  const linea = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm') + ' · ' + texto;
  _escribirPago(p, 'HISTORIAL', antes ? antes + '\n' + linea : linea);
  _escribirPago(p, 'ACTUALIZADO', new Date());
}

function _crearPago(idInm, mes, dia1, revisa) {
  const ya = _pagoDe(idInm, mes);
  if (ya) return ya;
  const { sheet, col } = _hojaPagos();
  const fila = new Array(Math.max(sheet.getLastColumn(), COLUMNAS_PAGOS.length)).fill('');
  const poner = (n, valor) => { if (col[n]) fila[col[n] - 1] = valor; };
  poner('ID PAGO', 'PAG-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'));
  poner('ID INMUEBLE', idInm);
  poner('MES', mes);
  poner('DIA 1', dia1);
  poner('ESTADO', ESTADOS_PAGO.PENDIENTE);
  poner('REVISA', revisa);
  poner('TOKEN', Utilities.getUuid());
  poner('HISTORIAL', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm') + ' · mes ' + mes + ' creado (revisa: ' + revisa.toLowerCase() + ')');
  poner('ACTUALIZADO', new Date());
  sheet.appendRow(fila);
  if (col['DIA 1']) sheet.getRange(sheet.getLastRow(), col['DIA 1']).setNumberFormat('dd/MM/yyyy');
  return _pagoDe(idInm, mes);
}

function _avisoDado(p, clave) { return String(_celdaPago(p, 'AVISOS') || '').split(',').indexOf(clave) !== -1; }
function _marcarAviso(p, clave) {
  const lista = String(_celdaPago(p, 'AVISOS') || '').split(',').filter(Boolean);
  if (lista.indexOf(clave) === -1) lista.push(clave);
  _escribirPago(p, 'AVISOS', lista.join(','));
}

// Un correo que no sale (p. ej. se acabó el cupo diario de Gmail) no puede dejar el pago a medias
function _correoSeguro(mensaje) { try { enviarCorreo_(mensaje); } catch (e) { Logger.log('⚠️ Correo no enviado (' + mensaje.subject + '): ' + e.message); } }
function _correoCitaSeguro() { try { enviarCorreoCita.apply(null, arguments); } catch (e) { Logger.log('⚠️ Correo no enviado: ' + e.message); } }

// ---------- Enlaces ----------

function tokenRevisorPago(idPago) {
  const firma = Utilities.computeHmacSha256Signature('PAGO:' + String(idPago), _secretoCoordinar());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 32);
}
function urlCargarPago(p) { return URL_PAGINA_PAGO + '?p=' + encodeURIComponent(p.v('ID PAGO')) + '&r=i&t=' + encodeURIComponent(p.v('TOKEN')); }
function urlRevisarPago(p) { return URL_PAGINA_PAGO + '?p=' + encodeURIComponent(p.v('ID PAGO')) + '&r=v&t=' + tokenRevisorPago(p.v('ID PAGO')); }

// ---------- Contrato y carpetas ----------

/** Fila del inmueble en 1.1 con un lector por nombre de columna. */
function _contratoDe(idInm) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  const datos = sheet.getDataRange().getValues();
  const headers = datos[0].map(x => String(x).trim());
  const i = datos.findIndex((r, k) => k > 0 && String(r[headers.indexOf('ID DE REGISTRO')]).trim() === String(idInm));
  if (i < 1) return null;
  const valores = datos[i];
  const v = (n) => { const c = headers.indexOf(String(n).trim()); return c === -1 ? '' : valores[c]; };
  return { sheet: sheet, fila: i + 1, headers: headers, v: v };
}

function _carpetasEntrega(cdr) {
  const contrato = buscarCarpetaContratoDinamica({ cdr: cdr, tipoNegocio: 'Arriendo' });
  if (!contrato) throw new Error('No se encontró la carpeta del contrato de ' + cdr);
  const folderInq = contrato.getParents().next();            // DOCUMENTOS DE ENTREGA - INQUILINO
  const folderProp = folderInq.getParents().next().getParents().next();   // {año} → ENTREGAS DEL INMUEBLE
  const sub = folderInq.getFoldersByName('1- COMPROBANTES DE PAGO DEL INMUEBLE');
  const folderPagos = sub.hasNext() ? sub.next() : folderInq.createFolder('1- COMPROBANTES DE PAGO DEL INMUEBLE');
  return { folderInq: folderInq, folderProp: folderProp, folderPagos: folderPagos };
}

/** Permiso sin el correo de Drive (mismo criterio que guardarContratoAutenticado). */
function _permisoSilencioso(folder, email, role) {
  try { Drive.Permissions.insert({ role: role, type: 'user', value: email }, folder.getId(), { sendNotificationEmails: false, supportsAllDrives: true }); return true; } catch (e) {}
  try { Drive.Permissions.insert({ role: role, type: 'user', value: email }, folder.getId(), { sendNotificationEmails: false }); return true; } catch (e) {}
  try { if (role === 'writer') folder.addEditor(email); else folder.addViewer(email); return true; } catch (e) { Logger.log('Permiso fallido para ' + email + ': ' + e.message); return false; }
}

const TUTORIAL_PROPIETARIO_CARPETA = 'https://www.youtube.com/watch?v=7JwBk8z4Mx8&feature=youtu.be';
const TUTORIAL_INQUILINO_CARPETA = 'https://www.youtube.com/watch?v=CyeoHA7zOjU&feature=youtu.be';

function _plantillaCorreo(titulo, nombre, principal, secundario, url, boton) {
  const tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tpl.TITULO = titulo; tpl.NOMBRE_CLIENTE = nombre; tpl.MENSAJE_PRINCIPAL = principal; tpl.MENSAJE_SECUNDARIO = secundario;
  tpl.URL_ACCION = url; tpl.TEXTO_BOTON = boton;
  return tpl.evaluate().getContent();
}

/** El propietario recibe el acceso de lectura a "ENTREGAS DEL INMUEBLE" (una sola vez). */
function enviarAccesosPropietario_(idInm) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('ACC_PROP_' + idInm)) return;
  const c = _contratoDe(idInm);
  const correo = String(c.v('Correo electrónico') || '').trim();
  if (correo.indexOf('@') === -1) return;
  const carpetas = _carpetasEntrega(String(c.v('CODIGO DE REGISTRO')));
  _permisoSilencioso(carpetas.folderProp, correo, 'reader');
  const direccion = String(c.v('Ingrese la Dirección del inmueble') || '');
  _correoSeguro({
    to: correo,
    subject: '📂 Accesos Habilitados: Entregas del Inmueble - ' + direccion,
    htmlBody: _plantillaCorreo('📂 Carpeta de Entregas del Inmueble', String(c.v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || ''),
      `Ya quedó acordada la entrega del inmueble en <strong>${direccion}</strong>.`,
      'Puedes acceder a tu carpeta de entregas en Google Drive en modo de lectura con el siguiente botón.' +
      '<br><br>▶️ <strong>Antes de entrar, mira este breve tutorial de cómo usar tu carpeta:</strong>' +
      '<br><a href="' + TUTORIAL_PROPIETARIO_CARPETA + '" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">Ver tutorial para propietarios en YouTube</a>',
      carpetas.folderProp.getUrl(), '📂 Abrir Carpeta de Entregas')
  });
  props.setProperty('ACC_PROP_' + idInm, new Date().toISOString());
}

/** El inquilino recibe el acceso a su carpeta (al confirmarse su primer pago; una sola vez). */
function enviarAccesosInquilino_(idInm) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('ACC_INQ_' + idInm)) return;
  const c = _contratoDe(idInm);
  const correo = String(c.v('CORREO INQUILINO') || '').trim();
  if (correo.indexOf('@') === -1) return;
  const carpetas = _carpetasEntrega(String(c.v('CODIGO DE REGISTRO')));
  _permisoSilencioso(carpetas.folderInq, correo, 'reader');
  _permisoSilencioso(carpetas.folderPagos, correo, 'writer');
  const direccion = String(c.v('Ingrese la Dirección del inmueble') || '');
  _correoSeguro({
    to: correo,
    subject: '📂 Accesos Habilitados: Documentos de Entrega y Pagos - ' + direccion,
    htmlBody: _plantillaCorreo('📂 Documentos de Entrega y Comprobantes de Pago', String(c.v('NOMBRE COMPLETO INQUILINO') || ''),
      `Tu primer pago del inmueble en <strong>${direccion}</strong> quedó confirmado. Ya tienes tu carpeta.`,
      'Ahí están tu contrato, los documentos de la entrega y, mes a mes, tus comprobantes de pago (en <strong>1- COMPROBANTES DE PAGO DEL INMUEBLE</strong>). ' +
      'Cada mes te llega un correo con el botón para cargar el comprobante: no tienes que subirlo a mano.' +
      '<br><br>▶️ <strong>Antes de entrar, mira este breve tutorial de cómo usar tu carpeta:</strong>' +
      '<br><a href="' + TUTORIAL_INQUILINO_CARPETA + '" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">Ver tutorial para inquilinos en YouTube</a>',
      carpetas.folderInq.getUrl(), '📂 Abrir mis documentos')
  });
  props.setProperty('ACC_INQ_' + idInm, new Date().toISOString());
}

// ---------- 2. Se acordó la fecha de entrega ----------

/**
 * Lo llama la sala de entrega al quedar acordada la fecha (y el panel al reagendarla).
 * Corre una sola vez por contrato y solo para los contratos del flujo nuevo.
 */
function alAcordarEntrega_(idInm) {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('FLUJO_PAGOS_NUEVO_' + idInm) || props.getProperty('ENT_ACORDADA_' + idInm)) return;
  props.setProperty('ENT_ACORDADA_' + idInm, new Date().toISOString());
  const c = _contratoDe(idInm);
  if (!c) return;
  try { enviarAccesosPropietario_(idInm); } catch (e) { Logger.log('⚠️ Accesos del propietario: ' + e.message); }

  const inicio = c.v('FECHA INICIO DEL CONTRATO');
  const cobroYo = ceAutorizoPrimerCanon(c.v);
  const p = _crearPago(idInm, 1, inicio instanceof Date ? inicio : '', cobroYo ? 'AGENTE' : 'PROPIETARIO');
  try {
    if (cobroYo) {
      // La cuenta de cobro a cuenta externa, con el botón para cargar el comprobante.
      // El excedente se pide después, cuando Leonardo confirme que recibió el pago.
      const r = ceGenerarYEnviar(c.sheet, c.fila, { sinExcedente: true, urlComprobante: urlCargarPago(p) });
      _historialPago(p, r.enviada ? 'cuenta de cobro a cuenta externa enviada al inquilino' : 'cuenta de cobro NO enviada: ' + r.motivo);
      // Si no salió (falta un dato), Leonardo la hace a mano y le reenvía al inquilino el botón
      if (!r.enviada) _alertaCobroManual_(c, p, r.motivo);
    } else {
      const r = ccGenerarYEnviar(c.sheet, c.fila);
      _historialPago(p, r.enviada ? 'cuenta de cobro de honorarios enviada al propietario' : 'cuenta de cobro de honorarios NO enviada: ' + (r.motivo || ''));
      if (!r.enviada && !r.noAplicaPorNegocio) _alertaCobroManual_(c, p, 'cuenta de cobro de honorarios: ' + (r.motivo || ''));
      _correoCobroPrimerMesAlPropietario_(c, p);
    }
  } catch (e) { Logger.log('⚠️ Cobro del primer mes de ' + idInm + ': ' + e.message); _historialPago(p, 'error en el cobro: ' + e.message); }
}

function _alertaCobroManual_(c, p, motivo) {
  _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '⚠️ Cuenta de cobro sin enviar · ' + c.v('ID DE REGISTRO'), 'COBRO DEL PRIMER MES', 'Leonardo',
    'Se acordó la entrega del inmueble <strong>' + c.v('ID DE REGISTRO') + '</strong> pero la cuenta de cobro no salió:<br><em>' + motivo + '</em><br><br>' +
    'Hazla a mano. Si es la del primer mes, envíale al inquilino también el botón para cargar su comprobante:',
    htmlBotonesCorreo([{ texto: '💳 Enlace para cargar el comprobante', color: '#b8860b', url: urlCargarPago(p) }]));
}

/** Al inquilino: el primer mes se le paga al propietario, a la cuenta del contrato. */
function _correoCobroPrimerMesAlPropietario_(c, p) {
  const correo = String(c.v('CORREO INQUILINO') || '').trim();
  if (correo.indexOf('@') === -1) return;
  const rc = recopilarDatosContrato(String(c.v('ID DE REGISTRO')));
  const prop = rc && rc.success ? rc.data.propietario : {};
  const canon = Number(c.v('CANON FINAL DEL CONTRATO')) || 0;
  const admin = Number(c.v('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)')) || 0;
  const direccion = String(c.v('Ingrese la Dirección del inmueble') || '');
  const cuenta = prop.numeroCuenta
    ? `🏦 <strong>${prop.banco || ''}</strong> · ${prop.tipoCuenta || ''} <strong>${prop.numeroCuenta}</strong><br>a nombre de <strong>${prop.titularCuenta || prop.nombre || ''}</strong>${prop.documentoTitular ? ' (CC ' + prop.documentoTitular + ')' : ''}`
    : 'la cuenta del propietario que indica tu contrato';
  _correoSeguro({
    to: correo, bcc: CUENTA_COBRO.CORREO_ADMIN,
    subject: '💳 Pago del primer mes de arriendo - ' + direccion,
    htmlBody: _plantillaCorreo('💳 Pago del primer mes de arriendo', String(c.v('NOMBRE COMPLETO INQUILINO') || ''),
      `Ya quedó acordada la entrega del inmueble en <strong>${direccion}</strong>. El primer mes de arriendo` +
      (canon ? ` es de <strong>$ ${ccMiles(canon + admin)}</strong>` + (admin ? ` (canon $ ${ccMiles(canon)} y administración $ ${ccMiles(admin)})` : '') : '') +
      ` y se paga directamente al propietario:<br><br>${cuenta}`,
      'Cuando pagues, carga aquí tu comprobante (antes o durante la entrega; sin él no se entregan las llaves). ' +
      'Al confirmarse el pago te llega el acceso a tu carpeta, donde quedan tus documentos y tus comprobantes. ' +
      'Cada mes te llegará este mismo botón para cargar el comprobante del mes.',
      urlCargarPago(p), '💳 Cargar comprobante')
  });
  _historialPago(p, 'cobro del primer mes enviado al inquilino (cuenta del propietario)');
}

// ---------- 3. Recordatorio el día de la entrega ----------

/** Lo llama el motor de la agenda por cada entrega: el día de la entrega, si no hay comprobante. */
function recordarPagoDiaEntrega_(fila, col, forzar) {
  const idInm = String(valorCita(fila, col, 'ID INMUEBLE') || '');
  const inicio = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
  if (!idInm || !inicio) return;
  const tz = 'America/Bogota';
  const hoy = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  if (Utilities.formatDate(inicio, tz, 'yyyy-MM-dd') !== hoy || (!forzar && Number(Utilities.formatDate(new Date(), tz, 'H')) < 7)) return;
  const p = _pagoDe(idInm, 1);
  if (!p || [ESTADOS_PAGO.PENDIENTE, ESTADOS_PAGO.NO_ES].indexOf(String(p.v('ESTADO'))) === -1) return;
  const clave = 'ENTREGA_' + hoy;
  if (_avisoDado(p, clave)) return;
  const c = _contratoDe(idInm);
  const correo = String(c.v('CORREO INQUILINO') || '').trim();
  if (correo.indexOf('@') === -1) return;
  _correoSeguro({
    to: correo, bcc: CUENTA_COBRO.CORREO_ADMIN,
    subject: '🔑 Hoy recibes tu inmueble: carga el soporte de pago',
    htmlBody: _plantillaCorreo('🔑 Hoy es la entrega', String(c.v('NOMBRE COMPLETO INQUILINO') || ''),
      `Hoy a las <strong>${formatAmPm(inicio)}</strong> te entregamos el inmueble en <strong>${String(c.v('Ingrese la Dirección del inmueble') || '')}</strong>.`,
      'Para entregarte las llaves necesitamos el soporte del pago del primer mes. Si aún no lo has cargado, hazlo antes o durante la entrega con este botón.',
      urlCargarPago(p), '💳 Cargar comprobante')
  });
  _marcarAviso(p, clave);
  _historialPago(p, 'recordatorio del día de la entrega');
}

// ---------- 4. Cargar y revisar ----------

function _validarEnlacePago(datos) {
  const p = _pagoPorId(datos.p);
  if (!p) return { error: 'No encontramos este pago.' };
  const rol = datos.r === 'i' ? 'INQUILINO' : datos.r === 'v' ? 'REVISOR' : '';
  const esperado = rol === 'INQUILINO' ? String(p.v('TOKEN')) : rol === 'REVISOR' ? tokenRevisorPago(datos.p) : null;
  if (!rol || !datos.t || String(datos.t) !== esperado) return { error: 'Este enlace no es válido.' };
  return { p: p, rol: rol, c: _contratoDe(String(p.v('ID INMUEBLE'))) };
}

/** Lo que ve cada uno al abrir su enlace. */
function infoPagoMensual(datos) {
  const s = _validarEnlacePago(datos);
  if (s.error) return { ok: false, mensaje: s.error };
  const { p, c } = s;
  const dia1 = p.v('DIA 1');
  // Desde el año 2, los valores aprobados del ajuste con IPC (AJUSTE_ANUAL_IPC.js)
  const { canon, admin } = valoresDelMes_(String(p.v('ID INMUEBLE')), c, Number(p.v('MES')));
  return {
    ok: true, rol: s.rol, mes: Number(p.v('MES')), estado: String(p.v('ESTADO')),
    dia1: dia1 instanceof Date ? dia1.getTime() : null,
    valor: canon + admin,
    inquilino: String(c.v('NOMBRE COMPLETO INQUILINO') || ''),
    propietario: String(c.v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || ''),
    revisa: String(p.v('REVISA')),
    direccion: String(c.v('Ingrese la Dirección del inmueble') || ''),
    motivo: String(p.v('MOTIVO') || ''),
    // El revisor ve el archivo; el inquilino solo si ya lo cargó
    archivo: String(p.v('ARCHIVO') || ''),
    fechaCarga: p.v('FECHA CARGA') instanceof Date ? p.v('FECHA CARGA').getTime() : null
  };
}

/** El inquilino carga el comprobante (un solo archivo; si estaba "no es", lo reemplaza). */
function cargarComprobanteMensual(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = _validarEnlacePago(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'INQUILINO') return { ok: false, mensaje: 'El comprobante lo carga el inquilino.' };
    const { p, c } = s;
    if (String(p.v('ESTADO')) === ESTADOS_PAGO.VALIDADO) return { ok: false, mensaje: 'Este pago ya quedó confirmado.' };
    if (String(p.v('ESTADO')) === ESTADOS_PAGO.CARGADO) return { ok: false, mensaje: 'Ya cargaste el comprobante: está en revisión. Te avisamos por correo.' };
    const mime = String(datos.mimeType || '').toLowerCase();
    if (!/^image\/|application\/pdf/.test(mime) || !datos.base64) return { ok: false, mensaje: 'Sube una foto o un PDF del comprobante.' };

    const mes = Number(p.v('MES'));
    const carpetas = _carpetasEntrega(String(c.v('CODIGO DE REGISTRO')));
    const nombreMes = 'MES #' + (((mes - 1) % 12) + 1);
    const sub = carpetas.folderPagos.getFoldersByName(nombreMes);
    const carpetaMes = sub.hasNext() ? sub.next() : carpetas.folderPagos.createFolder(nombreMes);
    // Si había uno anterior (rechazado), va a la papelera
    const previo = String(p.v('ARCHIVO') || '').match(/[-\w]{25,}/);
    if (previo) { try { DriveApp.getFileById(previo[0]).setTrashed(true); } catch (e) {} }
    const ext = mime === 'application/pdf' ? 'pdf' : (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const archivo = carpetaMes.createFile(Utilities.newBlob(Utilities.base64Decode(datos.base64), mime,
      'Comprobante mes ' + mes + ' - ' + p.v('ID INMUEBLE') + ' - ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm') + '.' + ext));

    _escribirPago(p, 'ARCHIVO', archivo.getUrl());
    _escribirPago(p, 'FECHA CARGA', new Date());
    _escribirPago(p, 'ESTADO', ESTADOS_PAGO.CARGADO);
    _escribirPago(p, 'MOTIVO', '');
    _historialPago(p, 'el inquilino cargó el comprobante');

    // A quien recibió el pago: revisar
    const pp = _pagoPorId(p.v('ID PAGO'));
    _correoRevisarPago_(pp, c, false);
    return { ok: true, mensaje: '¡Listo! Recibimos tu comprobante. Te avisamos cuando quede confirmado.' };
  } finally {
    lock.releaseLock();
  }
}

function _correoRevisarPago_(p, c, esRecordatorio) {
  const mes = Number(p.v('MES'));
  const agente = String(p.v('REVISA')) === 'AGENTE';
  const para = agente ? CUENTA_COBRO.CORREO_ADMIN : String(c.v('Correo electrónico') || '').trim();
  if (para.indexOf('@') === -1) return;
  const inq = String(c.v('NOMBRE COMPLETO INQUILINO') || 'El inquilino');
  const direccion = String(c.v('Ingrese la Dirección del inmueble') || '');
  const mensaje = {
    to: para,
    subject: (esRecordatorio ? '⏰ Recordatorio: ' : '🧾 ') + 'Revisa el comprobante del mes ' + mes + ' - ' + direccion,
    htmlBody: _plantillaCorreo('🧾 Comprobante del mes ' + mes, agente ? 'Leonardo' : String(c.v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || ''),
      (esRecordatorio ? 'Todavía no has revisado el comprobante que cargó ' : '') + `<strong>${inq}</strong>` + (esRecordatorio ? '' : ' cargó el comprobante') +
      ` del <strong>mes ${mes}</strong> de arriendo del inmueble en <strong>${direccion}</strong>.`,
      'Ábrelo y dinos si sí es el pago. Si no lo es, cuéntanos por qué y le pedimos el correcto.',
      urlRevisarPago(p), '🧾 Revisar comprobante')
  };
  if (!agente) mensaje.bcc = CUENTA_COBRO.CORREO_ADMIN;
  _correoSeguro(mensaje);
}

/** Quien recibió el pago dice si es o no es el comprobante. */
function revisarPagoMensual(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = _validarEnlacePago(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    if (s.rol !== 'REVISOR') return { ok: false, mensaje: 'Este enlace no es para revisar.' };
    const { p, c } = s;
    const estado = String(p.v('ESTADO'));
    if (estado === ESTADOS_PAGO.VALIDADO) return { ok: true, mensaje: 'Este pago ya estaba confirmado.' };
    if (estado !== ESTADOS_PAGO.CARGADO) return { ok: false, mensaje: 'No hay un comprobante nuevo por revisar.' };
    const mes = Number(p.v('MES'));
    const idInm = String(p.v('ID INMUEBLE'));
    const correoInq = String(c.v('CORREO INQUILINO') || '').trim();
    const nombreInq = String(c.v('NOMBRE COMPLETO INQUILINO') || '');
    const direccion = String(c.v('Ingrese la Dirección del inmueble') || '');
    const quien = String(p.v('REVISA')) === 'AGENTE' ? 'Leonardo' : 'el propietario';

    if (datos.decision === 'VALIDAR') {
      _escribirPago(p, 'ESTADO', ESTADOS_PAGO.VALIDADO);
      _historialPago(p, quien + ' confirmó: recibió el pago');
      if (correoInq.indexOf('@') !== -1) {
        _correoSeguro({
          to: correoInq, bcc: CUENTA_COBRO.CORREO_ADMIN,
          subject: '✅ Tu pago del mes ' + mes + ' quedó confirmado - ' + direccion,
          htmlBody: _plantillaCorreo('✅ Pago confirmado', nombreInq,
            `Tu pago del <strong>mes ${mes}</strong> de arriendo del inmueble en <strong>${direccion}</strong> quedó confirmado. ¡Gracias!`,
            mes === 1 ? 'En un correo aparte te llega el acceso a tu carpeta.' : 'El próximo mes te llega de nuevo el botón para cargar el comprobante.',
            urlCargarPago(p), '🧾 Ver mi pago')
        });
      }
      try { enviarAccesosInquilino_(idInm); } catch (e) { Logger.log('⚠️ Accesos del inquilino: ' + e.message); }
      // Mes 1 cobrado por Leonardo: ahora sí, el excedente al propietario
      if (mes === 1 && String(p.v('REVISA')) === 'AGENTE') {
        try {
          const ex = ceCalcularExcedente(c.v);
          if (ex) cePedirComprobanteExcedente(c.sheet, c.fila, c.headers, {
            idRegistro: idInm, direccion: ccDireccionCertificado(c.v('CODIGO DE REGISTRO')) || direccion,
            nombre: String(c.v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || '').toUpperCase(), ex: ex
          }, false);
        } catch (e) { Logger.log('⚠️ No se pudo pedir el excedente: ' + e.message); }
      }
      return { ok: true, mensaje: '¡Listo! El pago del mes ' + mes + ' quedó confirmado y le avisamos a ' + nombreInq.split(' ')[0] + '.' };
    }

    if (datos.decision === 'NO_ES') {
      const motivo = String(datos.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      _escribirPago(p, 'ESTADO', ESTADOS_PAGO.NO_ES);
      _escribirPago(p, 'MOTIVO', motivo);
      _historialPago(p, quien + ' dijo que NO es el comprobante' + (motivo ? ': ' + motivo : ''));
      if (correoInq.indexOf('@') !== -1) {
        _correoSeguro({
          to: correoInq, bcc: CUENTA_COBRO.CORREO_ADMIN,
          subject: '⚠️ Necesitamos el comprobante correcto del mes ' + mes + ' - ' + direccion,
          htmlBody: _plantillaCorreo('⚠️ Revisemos tu comprobante', nombreInq,
            `El comprobante que cargaste del <strong>mes ${mes}</strong> no corresponde al pago` + (motivo ? `:<br><br><em>“${motivo}”</em>` : '.'),
            'Por favor carga el comprobante correcto con este botón.', urlCargarPago(p), '💳 Cargar el comprobante correcto')
        });
      }
      return { ok: true, mensaje: 'Listo. Le pedimos a ' + nombreInq.split(' ')[0] + ' el comprobante correcto.' };
    }
    return { ok: false, mensaje: 'Acción no válida.' };
  } finally {
    lock.releaseLock();
  }
}

// ---------- 5. Mes a mes (tarea automática) ----------

/**
 * La llama ejecutarMotorAgenda cada 15 min; trabaja como mucho una vez por hora y solo
 * de 7 a. m. a 8 p. m. Recorre los contratos del flujo nuevo (los que tienen su mes 1).
 */
function revisarPagosMensuales_(forzar) {
  const tz = 'America/Bogota';
  const ahora = new Date();
  const hora = Number(Utilities.formatDate(ahora, tz, 'H'));
  if (!forzar && (hora < 7 || hora >= 20)) return;
  const props = PropertiesService.getScriptProperties();
  const marca = Utilities.formatDate(ahora, tz, 'yyyy-MM-dd HH');
  if (!forzar && props.getProperty('PAGOS_ULTIMA_REVISION') === marca) return;
  props.setProperty('PAGOS_ULTIMA_REVISION', marca);

  const t = _filasPagos();
  const contratos = Array.from(new Set(t.filas.filter(f => Number(t.v(f, 'MES')) === 1).map(f => String(t.v(f, 'ID INMUEBLE')))));
  const hoy = cvLeerFecha(Utilities.formatDate(ahora, tz, 'yyyy-MM-dd'));
  contratos.forEach(idInm => {
    try {
      activarSinCorreoFila_(idInm);
      const c = _contratoDe(idInm);
      if (!c) return;
      const inicio = cvLeerFecha(c.v('FECHA INICIO DEL CONTRATO'));
      if (!inicio) return;
      // Con los años renovados ya sumados: un contrato renovado sigue con el mes 13, 14… (RENOVACION_CONTRATO.js)
      const fechas = fechasContratoVigente_(idInm, c);
      if (cvMomento(fechas, hoy) !== 'vigente') return;
      try { revisarRenovacion_(idInm, c, hoy); } catch (e) { Logger.log('⚠️ Renovación de ' + idInm + ': ' + e.message); }
      const periodo = cvPeriodo(inicio, hoy);
      if (!periodo) return;
      // Recordatorio a quien revisa, en cualquier mes
      t.filas.forEach(f => {
        if (String(t.v(f, 'ID INMUEBLE')) !== idInm || String(t.v(f, 'ESTADO')) !== ESTADOS_PAGO.CARGADO) return;
        const carga = t.v(f, 'FECHA CARGA');
        const p = _pagoPorId(t.v(f, 'ID PAGO'));
        if (carga instanceof Date && ahora - carga >= HORAS_RECORDAR_REVISION * 3600000 && !_avisoDado(p, 'RECORDAR_REVISION')) {
          _correoRevisarPago_(p, c, true);
          _marcarAviso(p, 'RECORDAR_REVISION');
          _historialPago(p, 'recordatorio a quien revisa (2 días sin respuesta)');
        }
      });
      if (periodo.numero < 2) return;   // el mes 1 lo llevan el cobro y la entrega
      const dia1 = new Date(periodo.inicio.y, periodo.inicio.m - 1, periodo.inicio.d);
      const p = _crearPago(idInm, periodo.numero, dia1, 'PROPIETARIO');
      _avisosDelMes_(p, c, periodo.dia);
    } catch (e) { Logger.log('⚠️ Pagos de ' + idInm + ': ' + e.message); }
  });
  _SIN_CORREO_ = false;
}

/** Al caso de mora: WhatsApp y llamar a cada parte (27-oct-2026). */
function _botonesContactoMora_(c) {
  const b = botonesContacto_([{ quien: 'inquilino', cel: c.v('CELULAR INQUILINO') }, { quien: 'propietario', cel: c.v('Celular') }]);
  return b ? '<br>' + b : '';
}

/** Días 1, 4 y 5 (solo el más reciente si el motor se atrasó) y la mora del día 6. */
function _avisosDelMes_(p, c, dia) {
  const estado = String(p.v('ESTADO'));
  const mes = Number(p.v('MES'));
  const correo = String(c.v('CORREO INQUILINO') || '').trim();
  const nombre = String(c.v('NOMBRE COMPLETO INQUILINO') || '');
  const direccion = String(c.v('Ingrese la Dirección del inmueble') || '');
  if (correo.indexOf('@') === -1) return;
  const sinCargar = estado === ESTADOS_PAGO.PENDIENTE || estado === ESTADOS_PAGO.NO_ES;

  if (dia >= 6) {
    if (estado === ESTADOS_PAGO.VALIDADO || _avisoDado(p, 'D6')) return;
    // Texto aprobado por Leonardo (6.3.1): el sistema no sabe si pagó, solo que no hay comprobante confirmado
    _correoSeguro({
      to: correo, bcc: CUENTA_COBRO.CORREO_ADMIN,
      subject: '⚠️ No hemos recibido tu comprobante del mes ' + mes + ' - ' + direccion,
      htmlBody: _plantillaCorreo('⚠️ Comprobante pendiente', nombre,
        `No hemos recibido tu comprobante del <strong>mes ${mes}</strong> de arriendo del inmueble en <strong>${direccion}</strong>.`,
        'Si ya pagaste, cárgalo ahora con este botón. De lo contrario se notificará al propietario y aplica la cláusula penal del contrato.',
        urlCargarPago(p), '💳 Cargar comprobante')
    });
    const correoProp = String(c.v('Correo electrónico') || '').trim();
    if (correoProp.indexOf('@') !== -1) {
      _correoCitaSeguro(correoProp, '⚠️ Pago del mes ' + mes + ' sin confirmar - ' + direccion, 'PAGO SIN CONFIRMAR',
        String(c.v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || '').split(' ')[0],
        `Al cierre del día 5 del <strong>mes ${mes}</strong> no hay un comprobante confirmado del arriendo del inmueble en <strong>${direccion}</strong>.<br><br>` +
        'Ya le escribimos al inquilino. Leonardo revisa el caso y te contacta.', '');
    }
    // A Leonardo, el caso completo para ver quién hizo qué
    _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '⚠️ Mora mes ' + mes + ' · ' + p.v('ID INMUEBLE') + ' · ' + nombre, 'PAGO SIN CONFIRMAR: EL CASO', 'Leonardo',
      `Inmueble <strong>${p.v('ID INMUEBLE')}</strong> (${direccion}) · mes <strong>${mes}</strong> · estado: <strong>${estado}</strong>` +
      (p.v('MOTIVO') ? `<br>Motivo de "no es": <em>${p.v('MOTIVO')}</em>` : '') +
      '<br><br><strong>Lo que pasó:</strong><br>' + String(_celdaPago(p, 'HISTORIAL') || '').split('\n').map(l => '• ' + l).join('<br>') +
      '<br><br>Al inquilino le llegó el aviso de mora y al propietario el aviso de pago sin confirmar.',
      _botonesContactoMora_(c) + (p.v('ARCHIVO') ? htmlBotonesCorreo([{ texto: '🧾 Ver lo que se cargó', color: '#555555', url: String(p.v('ARCHIVO')) }]) : ''));
    _marcarAviso(p, 'D6');
    _historialPago(p, 'aviso de mora (día 6) al inquilino, al propietario y a Leonardo');
    return;
  }
  if (!sinCargar) return;
  const clave = dia >= 5 ? 'D5' : dia >= 4 ? 'D4' : 'D1';
  if (_avisoDado(p, clave)) return;
  const textos = {
    D1: ['💳 Ya puedes cargar tu comprobante del mes ' + mes, `Empieza el <strong>mes ${mes}</strong> de arriendo del inmueble en <strong>${direccion}</strong>.`, 'Tienes hasta el día 5 del periodo para pagar y cargar el comprobante.'],
    D4: ['⏰ Recordatorio: comprobante del mes ' + mes, `Te recordamos cargar el comprobante del <strong>mes ${mes}</strong> de arriendo.`, 'Mañana es el último día del plazo.'],
    D5: ['⏰ Hoy es el último día: comprobante del mes ' + mes, `Hoy es el último día para cargar el comprobante del <strong>mes ${mes}</strong> de arriendo.`, 'Si ya pagaste, cárgalo ahora con este botón.']
  }[clave];
  _correoSeguro({
    to: correo, subject: textos[0] + ' - ' + direccion,
    htmlBody: _plantillaCorreo(textos[0], nombre, textos[1], textos[2], urlCargarPago(p), '💳 Cargar comprobante')
  });
  ['D1', 'D4', 'D5'].slice(0, ['D1', 'D4', 'D5'].indexOf(clave) + 1).forEach(k => _marcarAviso(p, k));
  _historialPago(p, 'aviso ' + clave + ' al inquilino');
}
