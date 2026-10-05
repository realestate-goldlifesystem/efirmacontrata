/**
 * CUENTA DE COBRO AUTOMÁTICA AL PROPIETARIO (oct-2026)
 *
 * Flujo:
 *  1. Al generar el contrato ORIGINAL (GESTOR_CONTRATOS.js) se lee el canon de
 *     la cláusula "PRECIO DEL CANON: $…" del Doc y se guarda en la columna
 *     "CANON FINAL DEL CONTRATO".
 *     ¿Por qué del Doc y no de la hoja? Porque el contrato se puede editar desde
 *     el panel O a mano en el Doc; lo único cierto es lo que quedó escrito justo
 *     antes de mandarlo a firmar. Es texto de un Google Doc: no hace falta OCR.
 *  2. Al cargar el contrato AUTENTICADO (guardarContratoAutenticado) se llena la
 *     plantilla "CUENTA DE COBRO A PROPIETARIO" de la carpeta del inmueble, se
 *     saca el PDF y se le envía al propietario en un correo aparte.
 *
 *     honorarios = canon final × porcentaje de comercialización de la hoja
 *
 * Reglas:
 *  - Nunca se inventa un valor. Si falta el canon o el porcentaje, NO se envía
 *    nada y se devuelve el motivo para que se haga a mano.
 *  - Antes de enviar se revisa que TODAS las cifras en pesos del documento sean
 *    el valor calculado. La plantilla viene con datos de ejemplo de otro
 *    propietario: si quedara alguno sin reemplazar, se aborta.
 *  - Solo arriendo por Corretaje y Vendi-Renta. Administración se cobra distinto
 *    (porcentaje mensual) y Venta no tiene contrato de arrendamiento.
 *  - Los datos bancarios viven en la plantilla de Drive, no en este código
 *    (el repo es público).
 */

var CUENTA_COBRO = {
  HOJA: '1.1 - INMUEBLES REGISTRADOS',
  COL_CANON_FINAL: 'CANON FINAL DEL CONTRATO',
  COL_PCT_CORRETAJE: 'PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO',
  COL_PCT_VENDI_RENTA: 'PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO (Vendi-Renta)',
  CARPETA_PLANTILLA: 'CUENTA DE COBRO A PROPIETARIO',
  // Recibo de pago (se envía cuando el admin sube el comprobante del propietario)
  COL_RECIBO: 'RECIBO DE CORRETAJE',
  CARPETA_RECIBOS: '3- RECIBOS DE GESTION',                       // empieza por
  CARPETA_COMPROBANTES: 'COMPROBANTES DE PAGO - ADICIONALES',     // empieza por
  PLANTILLA_RECIBO: '3- RECIBO DE PRESTACIÓN DE SERVICIOS DE CORRETAJE',   // empieza por
  URL_PAGINA_COMPROBANTE: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/carga_comprobante_pago.html',
  // Client ID público del botón de Google de las páginas de carga (ya está en el frontend)
  GOOGLE_CLIENT_ID: '825455387668-asnkq57s4voon63c38b41e4q8qvc0b2e.apps.googleusercontent.com',
  CORREO_ADMIN: 'realestate.goldlifesystem@gmail.com',
  CANON_MINIMO: 100000,
  CANON_MAXIMO: 100000000
};

// ==========================================
// FUNCIONES PURAS (sin servicios de Google)
// Prueba: node _herramientas_locales/test_cuenta_cobro.js
// ==========================================

/** Canon de la cláusula "PRECIO DEL CANON: $2.645.000 …". 0 si no se encuentra o no es creíble. */
function ccExtraerCanonDeTexto(texto) {
  var m = String(texto || '').match(/PRECIO\s+DEL\s+CANON\s*:?\s*\$\s*([\d.,]+)/i);
  if (!m) return 0;
  var crudo = m[1].replace(/[.,]+$/, '');            // puntuación de la frase pegada al número
  crudo = crudo.replace(/,\d{1,2}$/, '');           // centavos "2.645.000,00"
  var n = parseInt(crudo.replace(/[^\d]/g, ''), 10);
  if (!n || n < CUENTA_COBRO.CANON_MINIMO || n > CUENTA_COBRO.CANON_MAXIMO) return 0;
  return n;
}

/** "50%", "50", 50 o 0.5 → 0.5. 0 si no es un porcentaje válido. */
function ccPorcentaje(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  var n;
  if (typeof valor === 'number') {
    n = valor <= 1 ? valor : valor / 100;
  } else {
    var limpio = String(valor).replace(',', '.').replace(/[^\d.]/g, '');
    if (!limpio) return 0;
    n = parseFloat(limpio);
    if (isNaN(n)) return 0;
    n = (String(valor).indexOf('%') !== -1 || n > 1) ? n / 100 : n;
  }
  return (n > 0 && n <= 1) ? n : 0;
}

/**
 * ¿Aplica cuenta de cobro automática y por cuánto?
 * @return {{aplica:boolean, motivo:string, porcentaje:number, valor:number}}
 */
function ccCalcularHonorarios(d) {
  var negocio = String(d.tipoNegocio || '').trim().toLowerCase();
  var pct;
  if (negocio === 'corretaje') pct = ccPorcentaje(d.pctCorretaje);
  else if (negocio === 'vendi-renta') pct = ccPorcentaje(d.pctVendiRenta);
  else return { aplica: false, noAplicaPorNegocio: true, motivo: 'El tipo de negocio "' + d.tipoNegocio + '" no tiene cuenta de cobro automática.', porcentaje: 0, valor: 0 };

  var canon = Number(d.canon) || 0;
  if (canon < CUENTA_COBRO.CANON_MINIMO || canon > CUENTA_COBRO.CANON_MAXIMO) {
    return { aplica: false, motivo: 'No hay un canon final del contrato guardado para este inmueble.', porcentaje: pct, valor: 0 };
  }
  if (!pct) {
    return { aplica: false, motivo: 'El inmueble no tiene porcentaje de comercialización en la hoja.', porcentaje: 0, valor: 0 };
  }
  return { aplica: true, motivo: '', porcentaje: pct, valor: Math.round(canon * pct) };
}

/** 1322500 → "1.322.500" */
function ccMiles(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1322500 → "UN MILLÓN TRESCIENTOS VEINTIDÓS MIL QUINIENTOS" (sin la palabra PESOS). */
function ccEnLetras(numero) {
  var n = Math.round(Number(numero) || 0);
  if (n === 0) return 'CERO';

  var U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE',
           'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO',
           'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  var D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  var C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS',
           'OCHOCIENTOS', 'NOVECIENTOS'];

  // apocopar: "UNO" → "UN" cuando va antes de un sustantivo (MIL, MILLONES, PESOS)
  var hasta999 = function (x, apocopar) {
    if (x === 100) return 'CIEN';
    var partes = [];
    if (x >= 100) { partes.push(C[Math.floor(x / 100)]); x = x % 100; }
    if (x > 0) {
      var t;
      if (x < 30) t = U[x];
      else t = D[Math.floor(x / 10)] + (x % 10 ? ' Y ' + U[x % 10] : '');
      if (apocopar) t = t.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN');
      partes.push(t);
    }
    return partes.join(' ');
  };

  var millones = Math.floor(n / 1000000);
  var miles = Math.floor((n % 1000000) / 1000);
  var resto = n % 1000;
  var out = [];

  if (millones) out.push(millones === 1 ? 'UN MILLÓN' : hasta999(millones, true) + ' MILLONES');
  if (miles) out.push(miles === 1 ? 'MIL' : hasta999(miles, true) + ' MIL');
  if (resto) out.push(hasta999(resto, true));

  var texto = out.join(' ');
  if (millones && !miles && !resto) texto += ' DE';     // "DOS MILLONES DE pesos"
  return texto;
}

/** Todas las cifras "$ 1.234.567" de un texto, como números. */
function ccCifrasEnPesos(texto) {
  var out = [];
  var re = /\$\s*(-?[\d.]+)/g, m;
  while ((m = re.exec(String(texto || ''))) !== null) {
    var n = parseInt(m[1].replace(/[^\d]/g, ''), 10);
    if (!isNaN(n)) out.push(n);
  }
  return out;
}

/** 1136884928 → "1.136.884.928" (si ya trae puntos o letras, se deja como está). */
function ccFormatoCedula(valor) {
  var s = String(valor === null || valor === undefined ? '' : valor).trim();
  return /^\d+$/.test(s) ? ccMiles(s) : s;
}

var CC_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-10-05" → {dia:5, mes:'octubre', anio:2026, corta:'05/10/2026'}. null si no es una fecha válida. */
function ccPartesDeFecha(iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  var anio = +m[1], mes = +m[2], dia = +m[3];
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || anio < 2020 || anio > 2100) return null;
  return { dia: dia, mes: CC_MESES[mes - 1], anio: anio, corta: m[3] + '/' + m[2] + '/' + m[1] };
}

/**
 * Número de serie de Sheets (días desde 1899-12-30) → "2026-10-01".
 * Una celda de fecha SIN formato de fecha llega como número (46296), no como
 * Date. '' si no parece una fecha razonable (2020–2100).
 */
function ccSerialAFechaISO(n) {
  var x = Number(n);
  if (!isFinite(x) || x < 43831 || x > 73050) return '';
  var d = new Date(Math.round((Math.floor(x) - 25569) * 86400000));
  var dos = function (v) { return ('0' + v).slice(-2); };
  return d.getUTCFullYear() + '-' + dos(d.getUTCMonth() + 1) + '-' + dos(d.getUTCDate());
}

/**
 * Valores del recibo. La gestión completa vale un canon; lo que no se cobra va
 * como "beneficio de descuento" (regla de Leonardo, oct-2026):
 *   canon 2.645.000 al 50 % → gestión 2.645.000, descuento -1.322.500, total 1.322.500
 */
function ccValoresRecibo(canon, valor) {
  var descuento = Math.max(0, Math.round(canon) - Math.round(valor));
  return { gestion: Math.round(canon), descuento: descuento, total: Math.round(valor) };
}

// ==========================================
// HOJA
// ==========================================

function _ccHoja() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CUENTA_COBRO.HOJA);
}

function _ccEncabezados(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
}

/** Fila (1-based) por CODIGO DE REGISTRO o por ID DE REGISTRO. -1 si no está. */
function _ccFilaDe(sheet, headers, cdrOId) {
  var buscado = String(cdrOId || '').trim();
  if (!buscado) return -1;
  var cCdr = headers.indexOf('CODIGO DE REGISTRO');
  var cId = headers.indexOf('ID DE REGISTRO');
  var datos = sheet.getRange(1, 1, sheet.getLastRow(), Math.max(cCdr, cId) + 1).getValues();
  for (var r = 1; r < datos.length; r++) {
    if ((cCdr !== -1 && String(datos[r][cCdr]).trim() === buscado) ||
        (cId !== -1 && String(datos[r][cId]).trim() === buscado)) return r + 1;
  }
  return -1;
}

/**
 * Guarda el canon leído del contrato ORIGINAL. Lo llama GESTOR_CONTRATOS.js.
 * @return {boolean} true si quedó guardado
 */
function ccGuardarCanonFinal(cdrOId, canon) {
  if (!canon) return false;
  var sheet = _ccHoja();
  var headers = _ccEncabezados(sheet);
  var col = headers.indexOf(CUENTA_COBRO.COL_CANON_FINAL);
  if (col === -1) {
    Logger.log('⚠️ No existe la columna "' + CUENTA_COBRO.COL_CANON_FINAL + '": el canon final no se guardó.');
    return false;
  }
  var fila = _ccFilaDe(sheet, headers, cdrOId);
  if (fila === -1) return false;
  sheet.getRange(fila, col + 1).setValue(canon);
  Logger.log('💰 Canon final del contrato guardado: $' + ccMiles(canon));
  return true;
}

/**
 * Red de seguridad para contratos cuyo ORIGINAL se generó antes de este cambio:
 * si la fila no tiene canon final, se lee del Doc "… - FINAL" que todavía está en
 * la carpeta del contrato. Hay que llamarla ANTES de que
 * guardarContratoAutenticado mande esos documentos a la papelera.
 */
function ccAsegurarCanonFinalDesdeCarpeta(sheet, fila, carpetaContrato) {
  var headers = _ccEncabezados(sheet);
  var col = headers.indexOf(CUENTA_COBRO.COL_CANON_FINAL);
  if (col === -1) return;
  if (Number(sheet.getRange(fila, col + 1).getValue()) > 0) return;      // ya lo tiene

  var files = carpetaContrato.getFilesByType(MimeType.GOOGLE_DOCS);
  var elegido = null;
  while (files.hasNext()) {
    var f = files.next();
    if (f.isTrashed()) continue;
    if (f.getName().indexOf(' - FINAL') === -1) continue;               // el borrador no sirve
    if (!elegido || f.getLastUpdated() > elegido.getLastUpdated()) elegido = f;
  }
  if (!elegido) return;

  var canon = ccExtraerCanonDeTexto(DocumentApp.openById(elegido.getId()).getBody().getText());
  if (canon) {
    sheet.getRange(fila, col + 1).setValue(canon);
    Logger.log('💰 Canon final leído del Doc FINAL antes de archivarlo: $' + ccMiles(canon));
  }
}

// ==========================================
// GENERAR Y ENVIAR
// ==========================================

/**
 * Llena la plantilla, saca el PDF y lo envía. No lanza: siempre devuelve
 * { enviada, motivo, valor, urlPdf } para que quien la llame decida qué mostrar.
 *
 * @param {Sheet}  sheet
 * @param {number} fila
 * @param {Object} [opciones]  { soloAdmin: true } → el correo va solo al admin (pruebas)
 */
function ccGenerarYEnviar(sheet, fila, opciones) {
  opciones = opciones || {};
  try {
    var headers = _ccEncabezados(sheet);
    var rango = sheet.getRange(fila, 1, 1, headers.length);
    var valores = rango.getValues()[0];
    var formulas = rango.getFormulas()[0];
    var v = function (nombre) { var i = headers.indexOf(nombre); return i === -1 ? '' : valores[i]; };

    var calc = ccCalcularHonorarios({
      tipoNegocio: v('TIPO DE NEGOCIO'),
      canon: v(CUENTA_COBRO.COL_CANON_FINAL),
      pctCorretaje: v(CUENTA_COBRO.COL_PCT_CORRETAJE),
      pctVendiRenta: v(CUENTA_COBRO.COL_PCT_VENDI_RENTA)
    });
    if (!calc.aplica) return { enviada: false, noAplicaPorNegocio: !!calc.noAplicaPorNegocio, motivo: calc.motivo, valor: 0 };

    var nombre = String(v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || '').trim();
    var cedula = ccFormatoCedula(v('Número de documento'));
    var correo = String(v('Correo electrónico') || '').trim();
    var direccion = String(v('Ingrese la Dirección del inmueble') || '').trim();
    var idRegistro = String(v('ID DE REGISTRO') || '').trim();
    var canon = Number(v(CUENTA_COBRO.COL_CANON_FINAL));
    if (!nombre || !cedula) return { enviada: false, motivo: 'Faltan el nombre o la cédula del propietario en la hoja.', valor: 0 };
    if (!opciones.soloAdmin && correo.indexOf('@') === -1) {
      return { enviada: false, motivo: 'El propietario no tiene correo en la hoja.', valor: 0 };
    }

    // Plantilla: SOPORTES CONTABLES (del año vigente) / CUENTA DE COBRO A PROPIETARIO / <Doc>
    var iSop = headers.indexOf('SOPORTES CONTABLES');
    var mSop = iSop === -1 ? null : String(formulas[iSop] || valores[iSop] || '').match(/folders\/([\w-]+)/);
    if (!mSop) return { enviada: false, motivo: 'La fila no tiene el link de SOPORTES CONTABLES.', valor: 0 };
    var carpetas = DriveApp.getFolderById(mSop[1]).getFoldersByName(CUENTA_COBRO.CARPETA_PLANTILLA);
    if (!carpetas.hasNext()) return { enviada: false, motivo: 'No existe la carpeta ' + CUENTA_COBRO.CARPETA_PLANTILLA + '.', valor: 0 };
    var carpeta = carpetas.next();
    var docs = carpeta.getFilesByType(MimeType.GOOGLE_DOCS);
    if (!docs.hasNext()) return { enviada: false, motivo: 'No está la plantilla de la cuenta de cobro en su carpeta.', valor: 0 };
    var plantilla = docs.next();

    var hoy = new Date();
    var zona = 'America/Bogota';
    var valorTxt = ccMiles(calc.valor);
    var letras = ccEnLetras(calc.valor);

    // --- Llenar el Doc ---
    var doc = DocumentApp.openById(plantilla.getId());
    var body = doc.getBody();

    body.replaceText('Bogotá D\\.C\\., *\\d{1,2}/\\d{1,2}/\\d{4}', 'Bogotá D.C., ' + Utilities.formatDate(hoy, zona, 'dd/MM/yyyy'));
    body.replaceText('La suma de .* pesos\\. *\\(\\$ *[\\d\\.]+\\)', 'La suma de ' + letras + ' pesos. ($' + valorTxt + ')');
    body.replaceText('arrendamiento de \\d{4}', 'arrendamiento de ' + Utilities.formatDate(hoy, zona, 'yyyy'));
    body.replaceText('::\\s*\\$\\s*[\\d\\.]+', ':: $ ' + valorTxt);

    // Deudor: el párrafo "C.C: …" y, justo encima, el del nombre.
    // (El del agente dice "C.C. No:", así que no se confunde.)
    var parrafos = body.getParagraphs();
    var deudorPuesto = false;
    for (var p = 0; p < parrafos.length; p++) {
      if (!/^\s*C\.C:\s/.test(parrafos[p].getText())) continue;
      parrafos[p].replaceText('C\\.C: *[\\d\\.]+', 'C.C: ' + cedula);
      for (var q = p - 1; q >= 0; q--) {
        if (parrafos[q].getText().trim()) { parrafos[q].setText(nombre.toUpperCase()); deudorPuesto = true; break; }
      }
      break;
    }
    if (!deudorPuesto) { doc.saveAndClose(); return { enviada: false, motivo: 'La plantilla no tiene el bloque del deudor (C.C:).', valor: calc.valor }; }

    // Tabla de conceptos: encabezado + una sola fila de honorarios
    var tablas = body.getTables();
    if (!tablas.length || tablas[0].getNumRows() < 2) { doc.saveAndClose(); return { enviada: false, motivo: 'La plantilla no tiene la tabla de conceptos.', valor: calc.valor }; }
    var tabla = tablas[0];
    while (tabla.getNumRows() > 2) tabla.removeRow(tabla.getNumRows() - 1);
    tabla.getCell(1, 1).editAsText().setText(letras + ' PESOS');
    tabla.getCell(1, 2).editAsText().setText('$ ' + valorTxt);

    // --- Control: ninguna cifra ajena puede sobrevivir de la plantilla ---
    var textoFinal = body.getText();
    var cifras = ccCifrasEnPesos(textoFinal);
    var ajenas = cifras.filter(function (c) { return c !== calc.valor; });
    if (cifras.length < 3 || ajenas.length || textoFinal.indexOf(nombre.toUpperCase()) === -1) {
      doc.saveAndClose();
      return {
        enviada: false, valor: calc.valor,
        motivo: 'La cuenta de cobro quedó con datos que no cuadran (cifras encontradas: ' +
                cifras.map(ccMiles).join(', ') + '). No se envió: revísala a mano.'
      };
    }
    doc.saveAndClose();

    // --- PDF en la misma carpeta (reemplaza el anterior si se repite) ---
    var nombrePdf = 'Cuenta de cobro - ' + (direccion || idRegistro) + ' - ' + idRegistro + '.pdf';
    var viejos = carpeta.getFilesByName(nombrePdf);
    while (viejos.hasNext()) viejos.next().setTrashed(true);
    var pdfBlob = DriveApp.getFileById(plantilla.getId()).getAs(MimeType.PDF).setName(nombrePdf);
    var pdf = carpeta.createFile(pdfBlob);

    // --- Correo independiente ---
    var tpl = HtmlService.createTemplateFromFile('backend/email_cuenta_cobro');
    tpl.NOMBRE_CLIENTE = nombre;
    tpl.DIRECCION = direccion;
    tpl.CANON = '$ ' + ccMiles(canon);
    tpl.PORCENTAJE = String(Math.round(calc.porcentaje * 1000) / 10).replace('.', ',') + ' %';
    tpl.VALOR = '$ ' + valorTxt;
    tpl.VALOR_LETRAS = letras + ' PESOS';

    var mensaje = {
      to: opciones.soloAdmin ? CUENTA_COBRO.CORREO_ADMIN : correo,
      subject: (opciones.soloAdmin ? '[PRUEBA] ' : '') + '📄 Cuenta de cobro · Honorarios de arrendamiento - ' + direccion,
      htmlBody: tpl.evaluate().getContent(),
      attachments: [pdfBlob]
    };
    if (!opciones.soloAdmin) mensaje.bcc = CUENTA_COBRO.CORREO_ADMIN;
    MailApp.sendEmail(mensaje);

    Logger.log('📩 Cuenta de cobro enviada a ' + mensaje.to + ' por $' + valorTxt);

    // Siguiente paso: pedirle al admin el comprobante de pago del propietario.
    // Aparte y sin tumbar nada: la cuenta de cobro ya salió.
    try {
      ccPedirComprobanteAlAdmin(sheet, fila, headers, {
        idRegistro: idRegistro, nombre: nombre, direccion: direccion, valorTxt: valorTxt
      }, !!opciones.soloAdmin);
    } catch (ePedir) {
      Logger.log('⚠️ No se pudo enviar el correo que pide el comprobante: ' + ePedir.message);
    }

    return { enviada: true, motivo: '', valor: calc.valor, urlPdf: pdf.getUrl() };

  } catch (e) {
    Logger.log('❌ Error generando la cuenta de cobro: ' + e.message + '\n' + e.stack);
    return { enviada: false, motivo: 'Error técnico: ' + e.message, valor: 0 };
  }
}

// ==========================================
// COMPROBANTE DE PAGO → RECIBO AL PROPIETARIO
// ==========================================
//
//  1. Tras enviar la cuenta de cobro, al admin le llega un correo con un botón
//     hacia frontend/carga_comprobante_pago.html?id=<ID> (mismo patrón que el
//     de "Cargar Contrato Autenticado").
//  2. El admin entra con el correo del sistema, sube el comprobante y dice cómo
//     y cuándo le pagaron.
//  3. El backend guarda el comprobante, llena la plantilla del recibo de
//     corretaje, saca el PDF y se lo envía al propietario.
//
// La columna "RECIBO DE CORRETAJE" lleva el estado: 📤 (falta el comprobante)
// → 🧾✅ (recibo enviado, con link al PDF). También evita enviarlo dos veces.

/** Correo al admin pidiendo el comprobante, y 📤 en la hoja. */
function ccPedirComprobanteAlAdmin(sheet, fila, headers, d, esPrueba) {
  var url = CUENTA_COBRO.URL_PAGINA_COMPROBANTE + '?id=' + encodeURIComponent(d.idRegistro) + (esPrueba ? '&prueba=1' : '');

  var tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tpl.TITULO = '💳 Cargar comprobante de pago del propietario';
  tpl.NOMBRE_CLIENTE = 'Equipo GoldLife';
  tpl.MENSAJE_PRINCIPAL = 'Ya se le envió a <strong>' + d.nombre + '</strong> la cuenta de cobro por <strong>$ ' + d.valorTxt +
    '</strong> del inmueble <strong>' + d.direccion + '</strong> (' + d.idRegistro + ').<br><br>' +
    'Cuando recibas el pago, haz clic en el botón y sube el comprobante.';
  tpl.MENSAJE_SECUNDARIO = 'Al cargarlo, el sistema genera el recibo de pago y se lo envía al propietario automáticamente.' +
    (esPrueba ? '<br><br><strong>PRUEBA:</strong> este enlace está en modo prueba; el recibo te llegará solo a ti.' : '');
  tpl.URL_ACCION = url;
  tpl.TEXTO_BOTON = '💳 Cargar comprobante de pago';

  MailApp.sendEmail({
    to: CUENTA_COBRO.CORREO_ADMIN,
    subject: (esPrueba ? '[PRUEBA] ' : '') + '💳 REQUERIDO: Cargar comprobante de pago - ' + d.idRegistro,
    htmlBody: tpl.evaluate().getContent()
  });

  if (esPrueba) return;
  var col = headers.indexOf(CUENTA_COBRO.COL_RECIBO);
  if (col === -1) return;
  var celda = sheet.getRange(fila, col + 1);
  if (celda.getFormula().indexOf('🧾') !== -1) return;          // ya hay recibo: no se pisa
  celda.setFormula('=HYPERLINK("' + url + '"; "📤")');
}

/**
 * ¿El token de Google es del correo del sistema? Se valida CONTRA GOOGLE, no se
 * confía en lo que diga la página: esta acción le manda un documento a un
 * cliente, y la URL del backend es pública.
 */
function _ccVerificarAdmin(credential) {
  if (!credential) return { ok: false, motivo: 'Falta iniciar sesión con Google.' };
  var resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo', {
    method: 'post', payload: { id_token: String(credential) }, muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) return { ok: false, motivo: 'La sesión de Google venció. Vuelve a iniciar sesión.' };
  var info = JSON.parse(resp.getContentText());
  if (info.aud !== CUENTA_COBRO.GOOGLE_CLIENT_ID) return { ok: false, motivo: 'Sesión de Google no válida para esta página.' };
  if (String(info.email_verified) !== 'true') return { ok: false, motivo: 'Correo de Google sin verificar.' };
  if (String(info.email || '').toLowerCase() !== CUENTA_COBRO.CORREO_ADMIN) {
    return { ok: false, motivo: 'Solo ' + CUENTA_COBRO.CORREO_ADMIN + ' puede cargar comprobantes.' };
  }
  return { ok: true, motivo: '' };
}

/** Fecha de una celda (Date, número de serie, "2026-10-01" o "01/10/2026") → "2026-10-01". '' si no se entiende. */
function _ccFechaISO(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return Utilities.formatDate(valor, 'America/Bogota', 'yyyy-MM-dd');
  if (typeof valor === 'number') return ccSerialAFechaISO(valor);
  var s = String(valor || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

/** Datos del inmueble para la página de carga. POST accion: contextoComprobantePago */
function ccContextoComprobante(datos) {
  try {
    var auth = _ccVerificarAdmin(datos.credential);
    if (!auth.ok) return { success: false, message: auth.motivo };

    var sheet = _ccHoja();
    var headers = _ccEncabezados(sheet);
    var fila = _ccFilaDe(sheet, headers, datos.id);
    if (fila === -1) return { success: false, message: 'No encontré el registro ' + datos.id + '.' };

    var rango = sheet.getRange(fila, 1, 1, headers.length);
    var valores = rango.getValues()[0];
    var formulas = rango.getFormulas()[0];
    var v = function (n) { var i = headers.indexOf(n); return i === -1 ? '' : valores[i]; };

    var calc = ccCalcularHonorarios({
      tipoNegocio: v('TIPO DE NEGOCIO'), canon: v(CUENTA_COBRO.COL_CANON_FINAL),
      pctCorretaje: v(CUENTA_COBRO.COL_PCT_CORRETAJE), pctVendiRenta: v(CUENTA_COBRO.COL_PCT_VENDI_RENTA)
    });
    if (!calc.aplica) return { success: false, message: 'No se puede generar el recibo: ' + calc.motivo };

    var iRec = headers.indexOf(CUENTA_COBRO.COL_RECIBO);
    var fRec = iRec === -1 ? '' : String(formulas[iRec] || '');
    var mUrl = fRec.match(/HYPERLINK\("([^"]+)"/i);

    return {
      success: true,
      yaRegistrado: fRec.indexOf('🧾') !== -1,
      urlRecibo: fRec.indexOf('🧾') !== -1 && mUrl ? mUrl[1] : '',
      datos: {
        id: String(v('ID DE REGISTRO')),
        direccion: String(v('Ingrese la Dirección del inmueble') || ''),
        propietario: String(v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || ''),
        correoPropietario: String(v('Correo electrónico') || ''),
        canon: '$ ' + ccMiles(v(CUENTA_COBRO.COL_CANON_FINAL)),
        porcentaje: String(Math.round(calc.porcentaje * 1000) / 10).replace('.', ',') + ' %',
        valor: '$ ' + ccMiles(calc.valor)
      }
    };
  } catch (e) {
    return { success: false, message: 'Error técnico: ' + e.message };
  }
}

/**
 * Guarda el comprobante y envía el recibo. POST accion: registrarPagoPropietario
 * datos: { id, credential, base64, nombreArchivo, mimeType, formaPago, fechaPago (yyyy-mm-dd), prueba }
 */
function ccRegistrarPago(datos) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); }
  catch (e) { return { success: false, message: 'Hay otro proceso en curso. Espera un momento y vuelve a intentar.' }; }

  try {
    var auth = _ccVerificarAdmin(datos.credential);
    if (!auth.ok) return { success: false, message: auth.motivo };

    var esPrueba = !!datos.prueba;
    var formaPago = String(datos.formaPago || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!formaPago) return { success: false, message: 'Falta la forma de pago.' };
    if (!ccPartesDeFecha(datos.fechaPago)) return { success: false, message: 'La fecha de pago no es válida.' };

    var TIPOS = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    var ext = TIPOS[String(datos.mimeType || '').toLowerCase()];
    if (!ext || !datos.base64) return { success: false, message: 'El comprobante debe ser un PDF o una imagen (JPG, PNG, WEBP).' };

    var sheet = _ccHoja();
    var headers = _ccEncabezados(sheet);
    var fila = _ccFilaDe(sheet, headers, datos.id);
    if (fila === -1) return { success: false, message: 'No encontré el registro ' + datos.id + '.' };

    var iRec = headers.indexOf(CUENTA_COBRO.COL_RECIBO);
    if (!esPrueba && iRec !== -1 && sheet.getRange(fila, iRec + 1).getFormula().indexOf('🧾') !== -1) {
      return { success: false, yaRegistrado: true, message: 'El recibo de este inmueble ya fue enviado. No se envía dos veces.' };
    }

    var carpetaRecibos = _ccCarpetaRecibos(sheet, fila, headers);
    if (!carpetaRecibos) return { success: false, message: 'No encontré la carpeta de recibos del inmueble en SOPORTES CONTABLES.' };

    // Comprobante → "COMPROBANTES DE PAGO - ADICIONALES, TRABAJOS, OBRA, ASEO, Etc...":
    // es la carpeta donde quedan los pagos del propietario por los servicios que
    // adquiere con Gold Life. (En prueba no se guarda nada.)
    var idRegistro = String(sheet.getRange(fila, headers.indexOf('ID DE REGISTRO') + 1).getValue()).trim();
    if (!esPrueba) {
      var carpetaComprobantes = _ccSubcarpetaDeSoportes(sheet, fila, headers, CUENTA_COBRO.CARPETA_COMPROBANTES);
      if (!carpetaComprobantes) {
        return { success: false, message: 'No encontré la carpeta "' + CUENTA_COBRO.CARPETA_COMPROBANTES + '…" en SOPORTES CONTABLES. No se guardó ni se envió nada.' };
      }
      var nombreComprobante = 'Comprobante de pago del propietario - Honorarios de corretaje - ' + idRegistro + '.' + ext;
      // Si un intento anterior guardó el comprobante pero el recibo falló, no se duplica
      var previos = carpetaComprobantes.getFilesByName(nombreComprobante);
      while (previos.hasNext()) previos.next().setTrashed(true);
      carpetaComprobantes.createFile(Utilities.newBlob(Utilities.base64Decode(datos.base64),
                                                       String(datos.mimeType).toLowerCase(), nombreComprobante));
    }

    var r = ccGenerarYEnviarRecibo(sheet, fila, { formaPago: formaPago, fechaPago: datos.fechaPago, soloAdmin: esPrueba });
    if (!r.enviada) {
      return { success: false, message: (esPrueba ? '' : 'El comprobante quedó guardado, pero el recibo NO se envió: ') + r.motivo };
    }

    if (!esPrueba) {
      // El recibo ya salió: se retiran los moldes y queda solo el recibo.
      // Va en try: un tropiezo ordenando no puede hacer parecer que el envío falló.
      try { ccOrdenarCarpetaDeRecibos(carpetaRecibos, r.idPdf); }
      catch (eOrden) { Logger.log('⚠️ No se pudo ordenar la carpeta de recibos: ' + eOrden.message); }

      if (iRec !== -1) sheet.getRange(fila, iRec + 1).setFormula('=HYPERLINK("' + r.urlPdf + '"; "🧾✅")');
      var iDet = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');
      if (iDet !== -1) sheet.getRange(fila, iDet + 1).setValue('✅ Pago del propietario recibido. 🧾 Recibo enviado por $' + ccMiles(r.valor) + '.');
    }
    return {
      success: true, urlRecibo: r.urlPdf,
      message: esPrueba ? 'PRUEBA: el recibo se envió solo al correo del sistema.' : 'Recibo enviado al propietario por $' + ccMiles(r.valor) + '.'
    };
  } catch (e) {
    Logger.log('❌ Error registrando el pago: ' + e.message + '\n' + e.stack);
    return { success: false, message: 'Error técnico: ' + e.message };
  } finally {
    lock.releaseLock();
  }
}

/** SOPORTES CONTABLES (año vigente) / "3- RECIBOS DE GESTION…". null si no está. */
function _ccCarpetaRecibos(sheet, fila, headers) {
  return _ccSubcarpetaDeSoportes(sheet, fila, headers, CUENTA_COBRO.CARPETA_RECIBOS);
}

/** Subcarpeta de SOPORTES CONTABLES (año vigente) cuyo nombre EMPIEZA por el prefijo. null si no está. */
function _ccSubcarpetaDeSoportes(sheet, fila, headers, prefijo) {
  var iSop = headers.indexOf('SOPORTES CONTABLES');
  if (iSop === -1) return null;
  var celda = sheet.getRange(fila, iSop + 1);
  var m = String(celda.getFormula() || celda.getValue() || '').match(/folders\/([\w-]+)/);
  if (!m) return null;
  var hijas = DriveApp.getFolderById(m[1]).getFolders();
  while (hijas.hasNext()) {
    var h = hijas.next();
    if (!h.isTrashed() && h.getName().indexOf(prefijo) === 0) return h;
  }
  return null;
}

/** ¿La carpeta (y todo lo que cuelga de ella) no tiene ni un archivo? */
function _ccCarpetaSinArchivos(carpeta) {
  if (carpeta.getFiles().hasNext()) return false;
  var hijas = carpeta.getFolders();
  while (hijas.hasNext()) {
    if (!_ccCarpetaSinArchivos(hijas.next())) return false;
  }
  return true;
}

/**
 * Deja la carpeta de recibos solo con el recibo enviado (decisión de Leonardo,
 * oct-2026): lo demás que trae de PLANTILLA #2 son moldes que en un corretaje
 * no se usan — las plantillas "N- RECIBO DE PRESTACIÓN…" y las carpetas MES #1…#12.
 *
 * Solo se retira lo que es molde, y a la PAPELERA (30 días de respaldo):
 *   - Docs cuyo nombre empieza por "<número>- RECIBO DE PRESTACI".
 *   - Subcarpetas que no tengan NINGÚN archivo dentro.
 * Cualquier otra cosa (un PDF, una carpeta con algo adentro) se deja y se anota:
 * no es plantilla, alguien la puso ahí.
 *
 * ⚠️ `comparar_carpetas_con_plantilla.js` / `completarCarpetasFaltantes` verán
 * estas carpetas como "faltantes": es a propósito, no hay que reponerlas.
 */
function ccOrdenarCarpetaDeRecibos(carpeta, idPdfRecibo) {
  var retirados = 0, dejados = [];

  var files = carpeta.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.getId() === idPdfRecibo) continue;
    if (f.getMimeType() === MimeType.GOOGLE_DOCS && /^\d+- RECIBO DE PRESTACI/i.test(f.getName())) {
      f.setTrashed(true); retirados++;
    } else {
      dejados.push(f.getName());
    }
  }

  var hijas = carpeta.getFolders();
  while (hijas.hasNext()) {
    var h = hijas.next();
    if (_ccCarpetaSinArchivos(h)) { h.setTrashed(true); retirados++; }
    else dejados.push(h.getName() + '/');
  }

  Logger.log('🧹 Carpeta de recibos ordenada: ' + retirados + ' moldes a la papelera' +
             (dejados.length ? '. Se dejó (no es plantilla): ' + dejados.join(' | ') : '.'));
  return { retirados: retirados, dejados: dejados };
}

/**
 * Llena la plantilla del recibo de corretaje, saca el PDF y lo envía.
 * No lanza: devuelve { enviada, motivo, valor, urlPdf }.
 * @param {Object} op { formaPago, fechaPago:'yyyy-mm-dd', soloAdmin }
 */
function ccGenerarYEnviarRecibo(sheet, fila, op) {
  op = op || {};
  try {
    var headers = _ccEncabezados(sheet);
    var valores = sheet.getRange(fila, 1, 1, headers.length).getValues()[0];
    var v = function (n) { var i = headers.indexOf(n); return i === -1 ? '' : valores[i]; };
    var falla = function (motivo, valor) { return { enviada: false, motivo: motivo, valor: valor || 0 }; };

    var calc = ccCalcularHonorarios({
      tipoNegocio: v('TIPO DE NEGOCIO'), canon: v(CUENTA_COBRO.COL_CANON_FINAL),
      pctCorretaje: v(CUENTA_COBRO.COL_PCT_CORRETAJE), pctVendiRenta: v(CUENTA_COBRO.COL_PCT_VENDI_RENTA)
    });
    if (!calc.aplica) return falla(calc.motivo);

    var canon = Number(v(CUENTA_COBRO.COL_CANON_FINAL));
    var val = ccValoresRecibo(canon, calc.valor);
    var nombre = String(v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || '').trim().toUpperCase();
    var cedula = ccFormatoCedula(v('Número de documento'));
    var correo = String(v('Correo electrónico') || '').trim();
    var direccion = String(v('Ingrese la Dirección del inmueble') || '').trim();
    var idRegistro = String(v('ID DE REGISTRO') || '').trim();
    var pago = ccPartesDeFecha(op.fechaPago);
    var desde = ccPartesDeFecha(_ccFechaISO(v('Fecha de registro del inmueble.')));
    var hasta = ccPartesDeFecha(_ccFechaISO(v('FECHA INICIO DEL CONTRATO')));
    var hoy = ccPartesDeFecha(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd'));

    if (!nombre || !cedula) return falla('Faltan el nombre o la cédula del propietario en la hoja.');
    if (!direccion) return falla('Falta la dirección del inmueble en la hoja.');
    if (!pago) return falla('La fecha de pago no es válida.');
    if (!desde) return falla('Falta la "Fecha de registro del inmueble." en la hoja (inicio del periodo del servicio).');
    if (!hasta) return falla('Falta la "FECHA INICIO DEL CONTRATO" en la hoja (fin del periodo del servicio). Escríbela en la fila y vuelve a intentar.');
    if (!op.formaPago) return falla('Falta la forma de pago.');
    if (!op.soloAdmin && correo.indexOf('@') === -1) return falla('El propietario no tiene correo en la hoja.');

    var carpeta = _ccCarpetaRecibos(sheet, fila, headers);
    if (!carpeta) return falla('No encontré la carpeta de recibos del inmueble.');
    var docs = carpeta.getFilesByType(MimeType.GOOGLE_DOCS), plantilla = null;
    while (docs.hasNext()) {
      var f = docs.next();
      if (f.getName().indexOf(CUENTA_COBRO.PLANTILLA_RECIBO) === 0) { plantilla = f; break; }
    }
    if (!plantilla) return falla('No está la plantilla del recibo de corretaje en su carpeta.');

    var TIPOS_DOC = { 'CC': 'CEDULA DE CIUDADANIA', 'CE': 'CEDULA DE EXTRANJERIA', 'NIT': 'NIT', 'PA': 'PASAPORTE', 'PASAPORTE': 'PASAPORTE' };
    var tipoDoc = String(v('TIPO DOCUMENTO PROPIETARIO') || '').trim().toUpperCase();
    var mesMayus = function (m) { return m.charAt(0).toUpperCase() + m.slice(1); };

    // --- Llenar el Doc ---
    var doc = DocumentApp.openById(plantilla.getId());
    var body = doc.getBody();

    // Bloque del cliente: SOLO la celda derecha de la primera tabla (la izquierda es el prestador)
    var tablas = body.getTables();
    if (!tablas.length || tablas[0].getNumRows() < 2 || tablas[0].getRow(1).getNumCells() < 2) {
      doc.saveAndClose(); return falla('La plantilla del recibo no tiene el cuadro de prestador y cliente.', calc.valor);
    }
    var cliente = tablas[0].getCell(1, 1);
    cliente.replaceText('Nombre completo: .*', 'Nombre completo: ' + nombre);
    if (TIPOS_DOC[tipoDoc]) cliente.replaceText('Tipo de documento: .*', 'Tipo de documento: ' + TIPOS_DOC[tipoDoc]);
    cliente.replaceText('Ciudad expedición: .*', 'Ciudad expedición: ' + (String(v('Ciudad de Expedicion') || '').trim().toUpperCase() || '—'));
    cliente.replaceText('Número de documento: .*', 'Número de documento: ' + cedula);
    cliente.replaceText('Celular: .*', 'Celular: ' + String(v('Celular') || '').trim());
    cliente.replaceText('Correo electrónico: .*', 'Correo electrónico: ' + correo);

    var direccionPuesta = false;
    var parrafos = body.getParagraphs();
    for (var p = 0; p < parrafos.length; p++) {
      var par = parrafos[p];
      var t = par.getText().replace(/^\s+/, '');
      if (/^Fecha:\s/.test(t)) {
        par.replaceText('Fecha: .*', 'Fecha: ' + hoy.dia + ' de ' + mesMayus(hoy.mes) + ' de ' + hoy.anio);
      } else if (/^Del dia:/.test(t)) {
        par.replaceText('Del dia: .*', 'Del dia: ' + desde.dia + ' del mes ' + desde.mes + ' del ' + desde.anio + ' ');
      } else if (/^hasta el dia:/.test(t)) {
        par.replaceText('hasta el dia: .*', 'hasta el dia: ' + hasta.dia + ' del mes ' + hasta.mes + ' del ' + hasta.anio + ' ');
      } else if (t.indexOf('ubicado en:') !== -1) {
        // La dirección es el último renglón del párrafo (va tras dos saltos de línea)
        par.replaceText('[^\\x0B\\r\\n]+$', direccion);
        direccionPuesta = par.getText().indexOf('ubicado en:') !== -1 && par.getText().indexOf(direccion) !== -1;
      } else if (t.indexOf('Pago de arriendo del mes en mención') !== -1) {
        par.replaceText('\\$\\s*-?[\\d\\.]+', '$  ' + ccMiles(val.gestion));
      } else if (t.indexOf('Beneficio de descuento') !== -1) {
        par.replaceText('\\$\\s*-?[\\d\\.]+', '$    ' + (val.descuento ? '-' + ccMiles(val.descuento) : '0'));
      } else if (/^Total con deducciones:/.test(t)) {
        par.replaceText('Total con deducciones: .*', 'Total con deducciones: $ ' + ccMiles(val.total));
      } else if (/^Forma de pago:/.test(t)) {
        par.replaceText('Forma de pago: .*', 'Forma de pago: ' + String(op.formaPago).toUpperCase());
      } else if (/^Pago recibido:/.test(t)) {
        par.replaceText('Pago recibido: .*', 'Pago recibido: COMPLETO');
      } else if (/^Fecha de pago:/.test(t)) {
        par.replaceText('Fecha de pago: .*', 'Fecha de pago: ' + pago.corta);
      }
    }

    // --- Control: nada de la plantilla de ejemplo puede sobrevivir ---
    var texto = body.getText();
    var permitidas = [val.gestion, val.descuento, val.total];
    var cifras = ccCifrasEnPesos(texto);
    var ajenas = cifras.filter(function (c) { return permitidas.indexOf(c) === -1; });
    var problemas = [];
    if (!direccionPuesta) problemas.push('no pude ubicar la dirección');
    if (cifras.length < 3 || ajenas.length) problemas.push('cifras que no cuadran (' + cifras.map(ccMiles).join(', ') + ')');
    if (cliente.getText().indexOf(nombre) === -1 || cliente.getText().indexOf(cedula) === -1) problemas.push('el cliente no quedó bien');
    if (texto.indexOf('Fecha de pago: ' + pago.corta) === -1) problemas.push('la fecha de pago no quedó');
    if (texto.indexOf('Total con deducciones: $ ' + ccMiles(val.total)) === -1) problemas.push('el total no quedó');
    doc.saveAndClose();
    if (problemas.length) return falla('El recibo no quedó bien llenado: ' + problemas.join('; ') + '. No se envió: revísalo a mano.', calc.valor);

    // --- PDF ---
    var nombrePdf = 'Recibo de pago corretaje - ' + direccion + ' - ' + idRegistro + '.pdf';
    var viejos = carpeta.getFilesByName(nombrePdf);
    while (viejos.hasNext()) viejos.next().setTrashed(true);
    var pdfBlob = DriveApp.getFileById(plantilla.getId()).getAs(MimeType.PDF).setName(nombrePdf);
    var pdf = carpeta.createFile(pdfBlob);

    // --- Correo ---
    var tpl = HtmlService.createTemplateFromFile('backend/email_recibo_pago');
    tpl.NOMBRE_CLIENTE = nombre;
    tpl.DIRECCION = direccion;
    tpl.VALOR = '$ ' + ccMiles(val.total);
    tpl.FORMA_PAGO = String(op.formaPago).toUpperCase();
    tpl.FECHA_PAGO = pago.dia + ' de ' + pago.mes + ' de ' + pago.anio;

    var mensaje = {
      to: op.soloAdmin ? CUENTA_COBRO.CORREO_ADMIN : correo,
      subject: (op.soloAdmin ? '[PRUEBA] ' : '') + '🧾 Recibo de pago · Honorarios de arrendamiento - ' + direccion,
      htmlBody: tpl.evaluate().getContent(),
      attachments: [pdfBlob]
    };
    if (!op.soloAdmin) mensaje.bcc = CUENTA_COBRO.CORREO_ADMIN;
    MailApp.sendEmail(mensaje);

    Logger.log('🧾 Recibo enviado a ' + mensaje.to + ' por $' + ccMiles(val.total));
    return { enviada: true, motivo: '', valor: val.total, urlPdf: pdf.getUrl(), idPdf: pdf.getId() };

  } catch (e) {
    Logger.log('❌ Error generando el recibo: ' + e.message + '\n' + e.stack);
    return { enviada: false, motivo: 'Error técnico: ' + e.message, valor: 0 };
  }
}

// ==========================================
// PRUEBA MANUAL (editor de Apps Script)
// ==========================================

/**
 * Genera la cuenta de cobro del inmueble indicado y la manda SOLO al correo del
 * sistema, con [PRUEBA] en el asunto. El propietario no recibe nada.
 * OJO: sí reescribe el Doc de la cuenta de cobro de ese inmueble y su PDF.
 */
var CUENTA_COBRO_ID_DE_PRUEBA = 'YX454035';

function probarCuentaDeCobro() {
  var sheet = _ccHoja();
  var fila = _ccFilaDe(sheet, _ccEncabezados(sheet), CUENTA_COBRO_ID_DE_PRUEBA);
  if (fila === -1) throw new Error('No encontré el registro ' + CUENTA_COBRO_ID_DE_PRUEBA);
  var r = ccGenerarYEnviar(sheet, fila, { soloAdmin: true });
  Logger.log(JSON.stringify(r, null, 2));
}

/**
 * Genera el recibo de pago del inmueble de prueba y lo manda SOLO al correo del
 * sistema, con [PRUEBA] en el asunto. No guarda comprobante ni marca la hoja.
 * OJO: sí reescribe el Doc del recibo de ese inmueble y su PDF.
 */
function probarReciboDePago() {
  var sheet = _ccHoja();
  var fila = _ccFilaDe(sheet, _ccEncabezados(sheet), CUENTA_COBRO_ID_DE_PRUEBA);
  if (fila === -1) throw new Error('No encontré el registro ' + CUENTA_COBRO_ID_DE_PRUEBA);
  var r = ccGenerarYEnviarRecibo(sheet, fila, {
    formaPago: 'TRANSFERENCIA BANCOLOMBIA',
    fechaPago: Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd'),
    soloAdmin: true
  });
  Logger.log(JSON.stringify(r, null, 2));
}
