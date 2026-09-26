/**
 * Pone al día las actas que se firmaron ANTES del 26-sep-2026, cuando la firma
 * todavía dejaba el Doc borrador al lado de su PDF firmado.
 *
 * Por cada acta de negocio (CORRETAJE, ADMINISTRACIÓN, VENTA, ADMI-VENTA,
 * VENDI-RENTA) cuyo Doc ya tiene su "- FIRMADO.pdf":
 *   1. "Link to merged Doc - <negocio>" pasa a apuntar al PDF firmado.
 *   2. Si "DOCUMENTO FIRMADO" está vacío, se llena con ese PDF. Si ya tiene
 *      algo, se respeta: la firma lo actualiza y siempre es el más reciente.
 *   3. El Doc se manda a la PAPELERA (30 días de respaldo).
 *
 * Es lo mismo que ya hace la firma desde ahora (GESTOR_CONTRATOS.js).
 *
 * NO toca:
 *   - "Merged Doc ID": con él la firma encuentra la fila y la sala reconoce el link.
 *   - La autorización de ingreso: no se firma, su Doc es la única versión.
 *   - Actas SIN firmar: su Doc se necesita para firmar.
 *   - Filas donde "Merged Doc ID" ya es un PDF (quedaron así del MVP).
 *   - Ningún PDF: todos los firmados se conservan como historial.
 *
 * Uso:
 *   revisarActasFirmadas()             → solo mira y reporta
 *   limpiarActasFirmadas_CONFIRMADO()  → escribe la hoja y manda los Doc a la papelera
 */

var NEGOCIOS_CON_FIRMA = ['CORRETAJE', 'ADMINISTRACIÓN', 'VENTA', 'ADMI-VENTA', 'VENDI-RENTA'];

function revisarActasFirmadas() {
  _actasFirmadas(false);
}

function limpiarActasFirmadas_CONFIRMADO() {
  _actasFirmadas(true);
}

function _actasFirmadas(aplicar) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_INMUEBLES.HOJA_PRINCIPAL);
  var datos = sheet.getDataRange().getValues();
  var formulas = sheet.getDataRange().getFormulas();
  var headers = datos[0].map(function (h) { return String(h).trim(); });

  var colId = headers.indexOf('ID DE REGISTRO');
  var colFirmado = headers.indexOf('DOCUMENTO FIRMADO');
  if (colId === -1 || colFirmado === -1) throw new Error('Faltan ID DE REGISTRO / DOCUMENTO FIRMADO');

  Logger.log(aplicar ? '🧹 APLICANDO' : '🔎 SIMULACIÓN');

  var actas = 0, sinFirmar = 0, noEsDoc = 0, yaFuera = 0, errores = 0;

  for (var r = 1; r < datos.length; r++) {
    var id = String(datos[r][colId] || '').trim();
    if (!id) continue;

    for (var n = 0; n < NEGOCIOS_CON_FIRMA.length; n++) {
      var negocio = NEGOCIOS_CON_FIRMA[n];
      var colDoc = headers.indexOf('Merged Doc ID - ' + negocio);
      var colLink = headers.indexOf('Link to merged Doc - ' + negocio);
      if (colDoc === -1) continue;

      var docId = String(datos[r][colDoc] || '').trim();
      if (!docId) continue;

      try {
        var doc;
        try { doc = DriveApp.getFileById(docId); }
        catch (e) { yaFuera++; continue; }                 // ya no existe: nada que hacer

        if (doc.isTrashed()) { yaFuera++; continue; }
        if (doc.getMimeType() !== MimeType.GOOGLE_DOCS) { noEsDoc++; continue; }

        var pdfUrl = buscarPdfFirmadoDeDoc(doc);           // GESTOR_CONTRATOS.js
        if (!pdfUrl) { sinFirmar++; continue; }            // sin firmar: el Doc se necesita

        actas++;
        var firmadoVacio = !formulas[r][colFirmado] && !String(datos[r][colFirmado] || '').trim();
        Logger.log('📄 fila ' + (r + 1) + ' — ' + id + ' [' + negocio + ']');
        Logger.log('     Doc a la papelera: ' + doc.getName());
        if (firmadoVacio) Logger.log('     DOCUMENTO FIRMADO estaba vacío: se llena');

        if (aplicar) {
          var pdfNombre = doc.getName() + ' - FIRMADO.pdf';
          if (colLink !== -1) {
            sheet.getRange(r + 1, colLink + 1)
              .setFormula('=HYPERLINK("' + pdfUrl + '"; "' + pdfNombre.replace(/"/g, "'") + '")');
          }
          if (firmadoVacio) {
            sheet.getRange(r + 1, colFirmado + 1)
              .setFormula('=HYPERLINK("' + pdfUrl + '"; "📄✅ FIRMADO")');
          }
          doc.setTrashed(true);
          Logger.log('     ✅ hecho');
        }
      } catch (e) {
        errores++;
        Logger.log('❌ fila ' + (r + 1) + ' — ' + id + ' [' + negocio + ']: ' + e.message);
      }
    }
  }

  Logger.log('───────────────────────────────');
  Logger.log('Actas firmadas con Doc de sobra: ' + actas +
             ' | sin firmar (se dejan): ' + sinFirmar +
             ' | Merged Doc ID que ya es PDF (se dejan): ' + noEsDoc +
             ' | Doc que ya no existe: ' + yaFuera +
             ' | errores: ' + errores);
  if (!aplicar && actas) {
    Logger.log('(simulación: ejecuta limpiarActasFirmadas_CONFIRMADO para hacerlo de verdad)');
  }
}
