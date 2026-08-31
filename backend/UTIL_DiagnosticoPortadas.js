/**
 * DIAGNÓSTICO de las plantillas de portada.
 *
 * Se escribió al fallar la carga de multimedia con:
 *   "Error en la solicitud para el código devuelto 400 de https://docs.google.com"
 *
 * Ese 400 sale de la exportación a PNG (export/png?id=...&pageid=...). La causa
 * habitual es que el `pageid` pedido ya no existe en la presentación: si alguien
 * edita la plantilla y rehace una diapositiva, su objectId cambia y el ID que
 * quedó escrito en CONFIG_MULTIMEDIA apunta a algo que ya no está.
 *
 * Como las portadas rotan (round-robin), un ID caducado no falla siempre: solo
 * cuando al contador le toca esa posición. De ahí que funcionara hasta hoy.
 *
 * Ejecutar desde el editor de Apps Script y mirar el registro.
 */
function diagnosticarPlantillasPortada() {
  var props = PropertiesService.getScriptProperties();
  var idxArr = parseInt(props.getProperty('IDX_TEMPLATE_ARRIENDO') || '0', 10);
  var idxVen = parseInt(props.getProperty('IDX_TEMPLATE_VENTA') || '0', 10);

  Logger.log('===== DIAGNÓSTICO DE PORTADAS =====');
  Logger.log('Contador ARRIENDO: ' + idxArr + '  -> posición ' + (idxArr % CONFIG_MULTIMEDIA.SLIDE_IDS_ARRIENDO.length));
  Logger.log('Contador VENTA:    ' + idxVen + '  -> posición ' + (idxVen % CONFIG_MULTIMEDIA.SLIDE_IDS_VENTA.length));

  var revisar = function (presId, etiqueta, listaIds) {
    Logger.log('');
    Logger.log('--- ' + etiqueta + ' (' + presId + ') ---');
    var reales;
    try {
      var pres = SlidesApp.openById(presId);
      reales = pres.getSlides().map(function (s) { return s.getObjectId(); });
    } catch (e) {
      Logger.log('❌ No se pudo abrir la presentación: ' + e.message);
      return;
    }
    Logger.log('Diapositivas reales (' + reales.length + '): ' + reales.join(', '));

    var faltan = 0;
    for (var i = 0; i < listaIds.length; i++) {
      var existe = reales.indexOf(listaIds[i]) !== -1;
      if (!existe) faltan++;
      Logger.log('  [' + i + '] ' + listaIds[i] + '  ' + (existe ? '✅ existe' : '❌ NO EXISTE'));
    }
    Logger.log(faltan === 0
      ? '✅ Todos los IDs configurados existen.'
      : '⚠️ ' + faltan + ' ID(s) configurados ya no existen: esa es la causa del error 400.');
  };

  revisar(CONFIG_MULTIMEDIA.TEMPLATE_SLIDES_ID, 'PLANTILLA PRINCIPAL — ARRIENDO',
          CONFIG_MULTIMEDIA.SLIDE_IDS_ARRIENDO);
  revisar(CONFIG_MULTIMEDIA.TEMPLATE_SLIDES_ID, 'PLANTILLA PRINCIPAL — VENTA',
          CONFIG_MULTIMEDIA.SLIDE_IDS_VENTA);
  revisar(CONFIG_MULTIMEDIA.TEMPLATE_SLIDES_YT, 'PLANTILLA MINIATURA YOUTUBE',
          [CONFIG_MULTIMEDIA.SLIDE_ID_YT]);

  Logger.log('');
  Logger.log('===== FIN =====');
}

/**
 * Comprueba si la foto de portada de un inmueble es apta para Slides.
 *
 * La otra sospecha del error 400: desde ago-2026 la portada se sube recortada
 * en 1:1 conservando la resolución original, así que ahora puede llegar a 3024
 * píxeles de lado. Slides rechaza imágenes de más de 25 megapíxeles o 50 MB.
 *
 * @param {string} cdr Código o ID del registro (el mismo que usa el formulario).
 */
function diagnosticarPortadaDeInmueble(cdr) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getDataRange().getValues();
  var colCdr = headers.indexOf('CODIGO DE REGISTRO');
  var colId = headers.indexOf('ID DE REGISTRO');
  var colFolder = headers.indexOf('LINK CARPETA DE CONTENIDO');

  var fila = -1;
  if (cdr) {
    for (var i = 1; i < data.length; i++) {
      if ((colCdr !== -1 && String(data[i][colCdr]).indexOf(cdr) !== -1) ||
          (colId !== -1 && data[i][colId] === cdr)) { fila = i; break; }
    }
    if (fila === -1) { Logger.log('No se encontró el registro ' + cdr); return; }
  } else {
    // Sin parámetro se toma el ÚLTIMO registro: el editor de Apps Script no
    // permite pasar argumentos al ejecutar una función a mano, y este
    // diagnóstico se usa justo después de que falle una carga.
    fila = data.length - 1;
    Logger.log('(sin parámetro: se revisa el último registro del Sheet)');
  }
  Logger.log('Registro en la fila ' + (fila + 1) + ': ' + data[fila][colCdr]);

  var formula = sheet.getRange(fila + 1, colFolder + 1).getFormula();
  var m = formula.match(/HYPERLINK\("([^"]+)"/i);
  var url = m ? m[1] : String(data[fila][colFolder]);
  var idm = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (!idm) { Logger.log('No se pudo sacar el ID de la carpeta de: ' + url); return; }

  var fotos = DriveApp.getFolderById(idm[1]).getFoldersByName('FOTOGRAFÍAS');
  if (!fotos.hasNext()) { Logger.log('No hay carpeta FOTOGRAFÍAS'); return; }
  var it = fotos.next().getFiles();
  var n = 0;
  Logger.log('--- archivos en FOTOGRAFÍAS ---');
  while (it.hasNext() && n < 30) {
    var f = it.next(); n++;
    var mb = f.getSize() / 1048576;
    var aviso = mb > 50 ? '  ⚠️ SUPERA los 50 MB que admite Slides' : '';
    Logger.log('  ' + f.getName() + '  ' + mb.toFixed(2) + ' MB  ' + f.getMimeType() + aviso);
  }
  Logger.log('total listados: ' + n);
}
