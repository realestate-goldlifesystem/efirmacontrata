/**
 * EXCEDENTE AL PROPIETARIO (etapa 4 de PLAN_EXCEDENTE_PRIMER_CANON.md, oct-2026)
 *
 * El inquilino le paga a Leonardo el primer mes (canon + administración) con la
 * cuenta de cobro a cuenta externa (GESTOR_CUENTA_EXTERNA.js). Leonardo se queda con
 * su comisión y le consigna al propietario el excedente:
 *
 *    excedente = canon − canon × % de comisión + administración
 *
 *  1. Al enviarse la cuenta de cobro al inquilino, a Leonardo le llega el valor
 *     exacto y el botón para cargar el comprobante (carga_comprobante_pago.html).
 *  2. Al cargarlo sale el recibo de corretaje (soporte de la comisión, "DESCONTADO
 *     DEL PRIMER CANON") y al propietario le llega el comprobante con un botón para
 *     validar en la sala de firmas (sala_firmas.html?modo=excedente).
 *  3. El propietario confirma o reporta un problema; Leonardo recibe el aviso y la
 *     fila queda marcada (VALIDACION EXCEDENTE).
 */

var EXCEDENTE = {
  COL_EXCEDENTE: 'EXCEDENTE PRIMER CANON',
  COL_VALIDACION: 'VALIDACION EXCEDENTE',
  URL_SALA: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/sala_firmas.html'
};

/** { canon, admin, porcentaje, comision, excedente } con los valores del contrato. null si falta algo. */
function ceCalcularExcedente(v) {
  var negocio = String(v('TIPO DE NEGOCIO') || '');
  var canon = Number(v(CUENTA_COBRO.COL_CANON_FINAL)) || 0;
  var admin = Number(v('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)')) || 0;
  var pct = ccPorcentaje(/Vendi-Renta/i.test(negocio) ? v(CUENTA_COBRO.COL_PCT_VENDI_RENTA) : v(CUENTA_COBRO.COL_PCT_CORRETAJE));
  if (!canon || !pct) return null;
  var comision = Math.round(canon * pct);
  return { canon: canon, admin: admin, porcentaje: pct, comision: comision, excedente: canon - comision + admin };
}

/** Token del enlace del propietario para validar el excedente (siempre el mismo para ese inmueble). */
function tokenExcedente(idRegistro) {
  var firma = Utilities.computeHmacSha256Signature('EXCEDENTE|' + idRegistro, _secretoCoordinar());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 32);
}

function urlValidarExcedente(idRegistro) {
  return EXCEDENTE.URL_SALA + '?modo=excedente&id=' + encodeURIComponent(idRegistro) + '&t=' + tokenExcedente(idRegistro);
}

/** Columna por nombre; si no existe la crea al final. */
function _ceColumna(sheet, headers, nombre) {
  var i = headers.indexOf(nombre);
  if (i !== -1) return i + 1;
  var col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue(nombre).setFontWeight('bold');
  headers.push(nombre);
  return col;
}

/** Correo al admin: cuánto consignarle al propietario y el botón para cargar el comprobante. */
function cePedirComprobanteExcedente(sheet, fila, headers, d, esPrueba) {
  var url = CUENTA_COBRO.URL_PAGINA_COMPROBANTE + '?id=' + encodeURIComponent(d.idRegistro) + (esPrueba ? '&prueba=1' : '');
  var tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tpl.TITULO = '💸 Excedente del primer canon al propietario';
  tpl.NOMBRE_CLIENTE = 'Equipo GoldLife';
  tpl.MENSAJE_PRINCIPAL = 'Al inquilino del inmueble <strong>' + d.direccion + '</strong> (' + d.idRegistro + ') ya le llegó la cuenta de cobro del primer mes por <strong>$ ' +
    ccMiles(d.ex.canon + d.ex.admin) + '</strong>.<br><br>Cuando te pague, consígnale a <strong>' + d.nombre + '</strong>:<br>' +
    '• Canon $ ' + ccMiles(d.ex.canon) + ' menos tu comisión (' + Math.round(d.ex.porcentaje * 100) + '%) de $ ' + ccMiles(d.ex.comision) + ': $ ' + ccMiles(d.ex.canon - d.ex.comision) + '<br>' +
    '• Administración: $ ' + ccMiles(d.ex.admin) + '<br>' +
    '<strong>Total a consignar: $ ' + ccMiles(d.ex.excedente) + '</strong>';
  tpl.MENSAJE_SECUNDARIO = 'Después carga el comprobante de esa transferencia: el sistema genera tu recibo de corretaje y le pide al propietario que confirme que lo recibió.' +
    (esPrueba ? '<br><br><strong>PRUEBA:</strong> el enlace está en modo prueba.' : '');
  tpl.URL_ACCION = url;
  tpl.TEXTO_BOTON = '💳 Cargar comprobante del excedente';
  MailApp.sendEmail({
    to: CUENTA_COBRO.CORREO_ADMIN,
    subject: (esPrueba ? '[PRUEBA] ' : '') + '💸 Excedente a consignar: $ ' + ccMiles(d.ex.excedente) + ' - ' + d.idRegistro,
    htmlBody: tpl.evaluate().getContent()
  });
  if (esPrueba) return;
  sheet.getRange(fila, _ceColumna(sheet, headers, EXCEDENTE.COL_EXCEDENTE)).setValue(d.ex.excedente);
  var col = headers.indexOf(CUENTA_COBRO.COL_RECIBO);
  if (col !== -1 && sheet.getRange(fila, col + 1).getFormula().indexOf('🧾') === -1) {
    sheet.getRange(fila, col + 1).setFormula('=HYPERLINK("' + url + '"; "📤")');
  }
}

/** Al propietario: el comprobante del excedente y el botón para validarlo en la sala. */
function ceAvisarExcedenteAlPropietario(d, comprobante, esPrueba) {
  var tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tpl.TITULO = '💸 Te consignamos el excedente del primer mes';
  tpl.NOMBRE_CLIENTE = d.nombre;
  tpl.MENSAJE_PRINCIPAL = 'Recibimos el primer mes de arriendo del inmueble en <strong>' + d.direccion + '</strong> y te consignamos el excedente:<br><br>' +
    '• Canon: $ ' + ccMiles(d.ex.canon) + '<br>' +
    '• Comisión de corretaje (' + Math.round(d.ex.porcentaje * 100) + '%): − $ ' + ccMiles(d.ex.comision) + '<br>' +
    '• Administración: $ ' + ccMiles(d.ex.admin) + '<br>' +
    '<strong>Total consignado: $ ' + ccMiles(d.ex.excedente) + '</strong> (' + d.formaPago + ', ' + d.fechaPago + ').';
  tpl.MENSAJE_SECUNDARIO = 'Te adjuntamos el comprobante de la transferencia. Por favor confirma que lo recibiste; si algo no cuadra, cuéntanos desde el mismo botón. ' +
    'El recibo de los honorarios te llega en un correo aparte.';
  tpl.URL_ACCION = urlValidarExcedente(d.idRegistro);
  tpl.TEXTO_BOTON = '✅ Validar el excedente';
  var mensaje = {
    to: esPrueba ? CUENTA_COBRO.CORREO_ADMIN : d.correo,
    subject: (esPrueba ? '[PRUEBA] ' : '') + '💸 Excedente consignado: $ ' + ccMiles(d.ex.excedente) + ' - ' + d.direccion,
    htmlBody: tpl.evaluate().getContent(),
    attachments: comprobante ? [comprobante] : []
  };
  if (!esPrueba) mensaje.bcc = CUENTA_COBRO.CORREO_ADMIN;
  MailApp.sendEmail(mensaje);
}

function _ceFilaPorId(id) {
  var sheet = _ccHoja(), headers = _ccEncabezados(sheet);
  var fila = _ccFilaDe(sheet, headers, id);
  if (fila === -1) return null;
  var valores = sheet.getRange(fila, 1, 1, headers.length).getValues()[0];
  return { sheet: sheet, headers: headers, fila: fila, v: function (n) { var i = headers.indexOf(n); return i === -1 ? '' : valores[i]; } };
}

/** Lo que ve el propietario en la sala (modo excedente). POST accion: infoExcedentePropietario */
function infoExcedentePropietario(datos) {
  var id = String(datos.id || '').trim();
  if (!id || String(datos.t || '') !== tokenExcedente(id)) return { ok: false, mensaje: 'Este enlace no es válido.' };
  var r = _ceFilaPorId(id);
  if (!r) return { ok: false, mensaje: 'No encontramos el inmueble.' };
  var ex = ceCalcularExcedente(r.v);
  if (!ex) return { ok: false, mensaje: 'Aún no hay valores del contrato para este inmueble.' };
  return {
    ok: true,
    nombre: String(r.v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || '').split(' ')[0],
    direccion: ccDireccionCertificado(r.v('CODIGO DE REGISTRO')) || String(r.v('Ingrese la Dirección del inmueble') || ''),
    canon: ccMiles(ex.canon), admin: ccMiles(ex.admin), porcentaje: Math.round(ex.porcentaje * 100),
    comision: ccMiles(ex.comision), excedente: ccMiles(ex.excedente),
    validacion: String(r.v(EXCEDENTE.COL_VALIDACION) || '')
  };
}

/** El propietario confirma o reporta un problema. POST accion: responderExcedentePropietario */
function responderExcedentePropietario(datos) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var id = String(datos.id || '').trim();
    if (!id || String(datos.t || '') !== tokenExcedente(id)) return { ok: false, mensaje: 'Este enlace no es válido.' };
    var r = _ceFilaPorId(id);
    if (!r) return { ok: false, mensaje: 'No encontramos el inmueble.' };
    var confirma = datos.respuesta === 'CONFIRMA';
    var comentario = String(datos.comentario || '').trim().slice(0, 500);
    if (!confirma && !comentario) return { ok: false, mensaje: 'Cuéntanos qué pasó.' };
    var ahora = Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy HH:mm');
    var texto = confirma ? '✅ CONFIRMADO ' + ahora : '⚠️ PROBLEMA ' + ahora + ': ' + comentario;
    r.sheet.getRange(r.fila, _ceColumna(r.sheet, r.headers, EXCEDENTE.COL_VALIDACION)).setValue(texto);
    var iDet = r.headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');
    if (iDet !== -1) {
      r.sheet.getRange(r.fila, iDet + 1).setValue(confirma
        ? '✅ El propietario confirmó que recibió el excedente del primer mes.'
        : '⚠️ El propietario reportó un problema con el excedente: ' + comentario);
    }
    MailApp.sendEmail({
      to: CUENTA_COBRO.CORREO_ADMIN,
      subject: (confirma ? '✅ Excedente confirmado' : '⚠️ Problema con el excedente') + ' - ' + id,
      htmlBody: '<p><strong>' + r.v('NOMBRES Y APELLIDOS DEL PROPIETARIO') + '</strong> ' +
        (confirma ? 'confirmó que recibió el excedente del primer mes.'
                  : 'reportó un problema con el excedente del primer mes:<br><br><em>' + comentario.replace(/</g, '&lt;') + '</em>') +
        '</p><p>Inmueble ' + id + '.</p>'
    });
    return { ok: true, mensaje: confirma ? '¡Gracias! Quedó registrado que recibiste el excedente.' : 'Gracias por contarnos. Leonardo te va a contactar para revisarlo.' };
  } finally {
    lock.releaseLock();
  }
}
