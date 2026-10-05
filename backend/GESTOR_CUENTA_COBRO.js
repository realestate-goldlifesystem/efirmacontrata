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
    return { enviada: true, motivo: '', valor: calc.valor, urlPdf: pdf.getUrl() };

  } catch (e) {
    Logger.log('❌ Error generando la cuenta de cobro: ' + e.message + '\n' + e.stack);
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
