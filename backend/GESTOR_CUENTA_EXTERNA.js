/**
 * CUENTA DE COBRO A CUENTA EXTERNA (etapa 3 de PLAN_EXCEDENTE_PRIMER_CANON.md, oct-2026)
 *
 * Cuando el propietario autorizó que el agente reciba el primer canon (Corretaje y
 * Vendi-Renta), al cargar el contrato AUTENTICADO y entregarle las carpetas al
 * inquilino se genera la "cuenta de cobro a cuenta externa": el PROPIETARIO le
 * cobra al INQUILINO el primer mes (canon + administración), para que lo consigne
 * a la cuenta de Leonardo. Lleva la firma del propietario (la de la sala).
 *
 *  - Plantilla: la MAESTRA (Z1- PLANTILLA #1 / … / CUENTA DE COBRO A CUENTA EXTERNA),
 *    con llaves <<…>>. Las copias viejas de cada carpeta traen datos de otro
 *    inmueble, por eso no se usan.
 *  - Valores: los del contrato firmado (CANON FINAL DEL CONTRATO + administración),
 *    no los del acta. El mes es el de FECHA INICIO DEL CONTRATO.
 *  - Dirección: la del certificado de tradición (ccDireccionCertificado); si no
 *    la hay, la del registro.
 *  - El PDF queda en SOPORTES CONTABLES del año y se envía al inquilino en un
 *    correo aparte. Si falta algo, NO se envía nada y se devuelve el motivo.
 *  - Los datos bancarios están escritos en la plantilla de Drive (el repo es público).
 */

var CUENTA_EXTERNA = {
  PLANTILLA_MAESTRA_ID: '1b2fJDmOkhJbPoT_N2afB-ibMGWOkIXcTXHdQyKnbB_E',
  COL_FIRMA: 'FIRMA PROPIETARIO',
  PREGUNTA: '¿Desea que el agente reciba el cobro del canon UNICAMENTE del primer mes para que se pueda cobrar directamente la comisión?',
  ANCHO_FIRMA: 180,
  MESES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
};

/** ¿El propietario de esa fila autorizó el cobro del primer canon? (Corretaje o Vendi-Renta) */
function ceAutorizoPrimerCanon(v) {
  var negocio = String(v('TIPO DE NEGOCIO') || '');
  if (!/Corretaje|Vendi-Renta/i.test(negocio)) return false;
  var resp = /Vendi-Renta/i.test(negocio) ? v(CUENTA_EXTERNA.PREGUNTA + '  (V-R)') : v(CUENTA_EXTERNA.PREGUNTA);
  return /^s[ií]/i.test(String(resp || '').trim());
}

/** "15 de octubre de 2026" */
function ceFechaLarga(fecha) {
  var d = fecha instanceof Date ? fecha : new Date(fecha);
  var dia = Number(Utilities.formatDate(d, 'America/Bogota', 'd'));
  var mes = CUENTA_EXTERNA.MESES[Number(Utilities.formatDate(d, 'America/Bogota', 'M')) - 1];
  return dia + ' de ' + mes + ' de ' + Utilities.formatDate(d, 'America/Bogota', 'yyyy');
}

/** Datos del inquilino desde el Cerebro del contrato (como el contrato), o desde la hoja. */
function ceDatosInquilino(cdr, v) {
  var texto = '';
  try { var doc = abrirDocCerebro(String(cdr).trim()); if (doc) texto = doc.getBody().getText(); } catch (e) {}
  var bloque = texto ? texto.split('DATOS DEL PROPIETARIO:')[0] : '';
  var campo = function (etiqueta) { var m = bloque.match(new RegExp(etiqueta + '[ \\t]*([^\\r\\n]+)')); return m ? m[1].trim() : ''; };
  return {
    nombre: campo('NOMBRES::') || String(v('NOMBRE COMPLETO INQUILINO') || '').trim(),
    cedula: campo('NÚMERO DE IDENTIFICACIÓN::') || String(v('NUMERO DOCUMENTO INQUILINO') || '').trim(),
    correo: campo('CORREO::') || String(v('CORREO INQUILINO') || '').trim()
  };
}

/** Carpeta SOPORTES CONTABLES del año vigente (el link está en la fila). */
function ceCarpetaSoportes(headers, valores, formulas) {
  var i = headers.indexOf('SOPORTES CONTABLES');
  var m = i === -1 ? null : String(formulas[i] || valores[i] || '').match(/folders\/([\w-]+)/);
  return m ? DriveApp.getFolderById(m[1]) : null;
}

/**
 * Genera y envía la cuenta de cobro a cuenta externa de esa fila.
 * @param {Object=} opciones { soloAdmin: true } → se envía solo al correo del sistema (prueba)
 * @return {{enviada:boolean, noAplica?:boolean, motivo:string, urlPdf?:string}}
 */
function ceGenerarYEnviar(sheet, fila, opciones) {
  opciones = opciones || {};
  try {
    var rango = sheet.getRange(fila, 1, 1, sheet.getLastColumn());
    var valores = rango.getValues()[0], formulas = rango.getFormulas()[0];
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    var v = function (n) { var i = headers.indexOf(String(n).trim()); return i === -1 ? '' : valores[i]; };
    var falla = function (motivo) { return { enviada: false, motivo: motivo }; };

    if (!ceAutorizoPrimerCanon(v)) return { enviada: false, noAplica: true, motivo: 'El propietario no autorizó el cobro del primer canon.' };

    var cdr = String(v('CODIGO DE REGISTRO') || '').trim();
    var idRegistro = String(v('ID DE REGISTRO') || '').trim();
    var nombreProp = String(v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || '').trim().toUpperCase();
    var cedulaProp = ccFormatoCedula(v('Número de documento'));
    var canon = Number(v(CUENTA_COBRO.COL_CANON_FINAL)) || 0;
    var admin = Number(v('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)')) || 0;
    var inicio = v('FECHA INICIO DEL CONTRATO');
    var direccion = ccDireccionCertificado(cdr) || String(v('Ingrese la Dirección del inmueble') || '').trim();
    var ciudad = String(v('Ingrese la Ciudad del inmueble') || 'BOGOTÁ').trim().toUpperCase();
    var inq = ceDatosInquilino(cdr, v);
    var idFirma = String(v(CUENTA_EXTERNA.COL_FIRMA) || '').trim();

    if (!nombreProp || !cedulaProp) return falla('Faltan el nombre o la cédula del propietario.');
    if (!canon) return falla('Falta el CANON FINAL DEL CONTRATO.');
    if (!(inicio instanceof Date)) return falla('Falta la FECHA INICIO DEL CONTRATO.');
    if (!inq.nombre || !inq.cedula) return falla('Faltan el nombre o la cédula del inquilino.');
    if (!opciones.soloAdmin && inq.correo.indexOf('@') === -1) return falla('El inquilino no tiene correo.');
    if (!idFirma) return falla('No hay firma guardada del propietario (firmó antes de que se guardara): hazla a mano.');
    var firma;
    try { firma = DriveApp.getFileById(idFirma).getBlob(); } catch (e) { return falla('No se encontró la imagen de la firma del propietario.'); }
    var carpeta = ceCarpetaSoportes(headers, valores, formulas);
    if (!carpeta) return falla('La fila no tiene el link de SOPORTES CONTABLES.');

    var valor = canon + admin;
    var hoy = new Date();
    var llaves = {
      '<<FECHA>>': ceFechaLarga(hoy),
      '<<NOMBRE PROPIETARIO>>': nombreProp,
      '<<CEDULA PROPIETARIO>>': cedulaProp,
      '<<NOMBRE INQUILINO>>': inq.nombre.toUpperCase(),
      '<<CEDULA INQUILINO>>': ccFormatoCedula(inq.cedula),
      '<<VALOR EN LETRA>>': ccEnLetras(valor) + ' PESOS COLOMBIANOS',
      '<<VALOR>>': ccMiles(valor),
      '<<MES>>': CUENTA_EXTERNA.MESES[Number(Utilities.formatDate(inicio, 'America/Bogota', 'M')) - 1],
      '<<DIRECCION>>': direccion.toUpperCase(),
      '<<CIUDAD>>': ciudad,
      '<<SOLICITUD>>': idRegistro,
      '<<FECHA CONTRATO>>': ceFechaLarga(inicio)
    };

    // --- Copia de la maestra, llena ---
    var nombreDoc = 'Cuenta de cobro primer mes - ' + direccion + ' - ' + idRegistro;
    var copia = DriveApp.getFileById(CUENTA_EXTERNA.PLANTILLA_MAESTRA_ID).makeCopy(nombreDoc, carpeta);
    var doc = DocumentApp.openById(copia.getId());
    var body = doc.getBody();
    Object.keys(llaves).forEach(function (k) { body.replaceText(k.replace(/[<>]/g, function (c) { return '\\' + c; }), llaves[k]); });

    // Firma del propietario en el lugar de <<FIRMA PROPIETARIO>>
    var marca = body.findText('<<FIRMA PROPIETARIO>>');
    if (!marca) { copia.setTrashed(true); return falla('La plantilla maestra no tiene <<FIRMA PROPIETARIO>>.'); }
    var texto0 = marca.getElement().asText();
    var par = texto0.getParent().asParagraph();
    var img = par.insertInlineImage(0, firma);
    texto0.deleteText(marca.getStartOffset(), marca.getEndOffsetInclusive());
    var escala = CUENTA_EXTERNA.ANCHO_FIRMA / img.getWidth();
    img.setWidth(CUENTA_EXTERNA.ANCHO_FIRMA).setHeight(Math.round(img.getHeight() * escala));

    // --- Control: ninguna llave sin reemplazar y el valor correcto ---
    var texto = body.getText();
    if (/<<[^>]+>>/.test(texto) || texto.indexOf(ccMiles(valor)) === -1 || texto.indexOf(nombreProp) === -1) {
      doc.saveAndClose(); copia.setTrashed(true);
      return falla('La cuenta de cobro quedó con datos sin llenar. No se envió: revísala a mano.');
    }
    doc.saveAndClose();

    // --- PDF (reemplaza el anterior si se repite) ---
    var nombrePdf = nombreDoc + '.pdf';
    var viejos = carpeta.getFilesByName(nombrePdf);
    while (viejos.hasNext()) viejos.next().setTrashed(true);
    var pdfBlob = copia.getAs(MimeType.PDF).setName(nombrePdf);
    var pdf = carpeta.createFile(pdfBlob);
    copia.setTrashed(true);

    // --- Correo al inquilino ---
    var tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
    tpl.TITULO = '📄 Cuenta de cobro del primer mes de arriendo';
    tpl.NOMBRE_CLIENTE = inq.nombre;
    tpl.MENSAJE_PRINCIPAL = 'Te enviamos la cuenta de cobro del <strong>primer mes de arriendo</strong> del inmueble en <strong>' + direccion + '</strong>, ' +
      'por <strong>$ ' + ccMiles(valor) + '</strong> (canon y administración).';
    tpl.MENSAJE_SECUNDARIO = 'Por autorización del propietario, <strong>únicamente el primer mes</strong> se paga a la cuenta indicada en el documento adjunto. ' +
      'Desde el segundo mes el pago se hace como lo indica tu contrato. Cuando pagues, sube el comprobante en tu carpeta de comprobantes de pago.';
    tpl.URL_ACCION = pdf.getUrl();
    tpl.TEXTO_BOTON = '📄 Ver cuenta de cobro';
    var mensaje = {
      to: opciones.soloAdmin ? CUENTA_COBRO.CORREO_ADMIN : inq.correo,
      subject: (opciones.soloAdmin ? '[PRUEBA] ' : '') + '📄 Cuenta de cobro · Primer mes de arriendo - ' + direccion,
      htmlBody: tpl.evaluate().getContent(),
      attachments: [pdfBlob]
    };
    if (!opciones.soloAdmin) mensaje.bcc = CUENTA_COBRO.CORREO_ADMIN;
    MailApp.sendEmail(mensaje);
    Logger.log('📩 Cuenta de cobro a cuenta externa enviada a ' + mensaje.to + ' por $' + ccMiles(valor));

    // Etapa 4 (GESTOR_EXCEDENTE.js): cuánto consignarle al propietario y el botón del comprobante
    try {
      var ex = ceCalcularExcedente(v);
      if (ex) cePedirComprobanteExcedente(sheet, fila, headers, { idRegistro: idRegistro, direccion: direccion, nombre: nombreProp, ex: ex }, !!opciones.soloAdmin);
    } catch (eEx) { Logger.log('⚠️ No se pudo pedir el comprobante del excedente: ' + eEx.message); }
    return { enviada: true, motivo: '', valor: valor, urlPdf: pdf.getUrl() };

  } catch (e) {
    Logger.log('❌ Error generando la cuenta de cobro a cuenta externa: ' + e.message + '\n' + e.stack);
    return { enviada: false, motivo: 'Error técnico: ' + e.message };
  }
}

/**
 * Guarda la imagen de la firma del propietario (al firmar en la sala) en la carpeta
 * del acta y anota su ID en la fila. La usa la cuenta de cobro a cuenta externa.
 */
function ceGuardarFirmaPropietario(sheet, fila, blobFirma, carpeta, idRegistro) {
  try {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    var col = headers.indexOf(CUENTA_EXTERNA.COL_FIRMA) + 1;
    if (!col) { col = headers.length + 1; sheet.getRange(1, col).setValue(CUENTA_EXTERNA.COL_FIRMA).setFontWeight('bold'); }
    var archivo = carpeta.createFile(blobFirma.copyBlob().setName('FIRMA PROPIETARIO - ' + (idRegistro || 'sin ID') + ' - ' +
      Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd') + '.png'));
    sheet.getRange(fila, col).setValue(archivo.getId());
    return archivo.getId();
  } catch (e) {
    Logger.log('⚠️ No se pudo guardar la firma del propietario: ' + e.message);
    return '';
  }
}
