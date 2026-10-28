// Lee el IPC total del año (variación anual a diciembre) del anexo en Excel que publica el DANE
// hacia el 8 de enero. Es el número que fija el tope del aumento del canon (Ley 820, art. 20).
// Devuelve { ok, ipc, url, filas } o { ok:false, mensaje }. 28-oct-2026.

function urlAnexoIpcDane_(anio) {
  var m = 'dic' + anio;
  return 'https://www.dane.gov.co/files/operaciones/IPC/' + m + '/anex-IPC-Variacion-' + m + '.xlsx';
}

// Filas de la primera hoja del .xlsx como arreglos de texto (sin librerías: es un zip de XML).
function filasXlsx_(blob) {
  var partes = Utilities.unzip(blob.setContentType('application/zip')), xml = {};
  partes.forEach(function (p) { xml[p.getName()] = p; });
  var textos = [];
  if (xml['xl/sharedStrings.xml']) {
    var raiz = XmlService.parse(xml['xl/sharedStrings.xml'].getDataAsString()).getRootElement(), ns = raiz.getNamespace();
    raiz.getChildren('si', ns).forEach(function (si) {
      var t = '';
      si.getDescendants().forEach(function (d) { var e = d.asElement && d.asElement(); if (e && e.getName() === 't') t += e.getText(); });
      textos.push(t);
    });
  }
  var hoja = Object.keys(xml).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); }).sort()[0];
  var r = XmlService.parse(xml[hoja].getDataAsString()).getRootElement(), n = r.getNamespace();
  return r.getChild('sheetData', n).getChildren('row', n).map(function (row) {
    var fila = [];
    row.getChildren('c', n).forEach(function (c) {
      var ref = c.getAttribute('r').getValue().replace(/\d+/g, ''), col = 0;
      for (var i = 0; i < ref.length; i++) col = col * 26 + ref.charCodeAt(i) - 64;
      var v = c.getChild('v', n), is = c.getChild('is', n), tipo = c.getAttribute('t') && c.getAttribute('t').getValue();
      var val = v ? v.getText() : (is ? is.getValue() : '');
      if (tipo === 's') val = textos[Number(val)];
      fila[col - 1] = String(val).trim();
    });
    return fila;
  });
}

function leerIpcDane_(anio) {
  var url = urlAnexoIpcDane_(anio);
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() !== 200) return { ok: false, mensaje: 'El DANE respondió ' + r.getResponseCode(), url: url };
  var filas = filasXlsx_(r.getBlob());
  // El anexo trae una columna por año y la fila "En año corrido"; en el anexo de diciembre esa fila es el IPC del año.
  var completo = filas.some(function (f) { return new RegExp('AÑO\\s*' + anio + ',\\s*MES\\s*12\\b', 'i').test(f[0] || ''); });
  var enc = filas.filter(function (f) { return /^mes$/i.test(f[0] || ''); })[0];
  var corrido = filas.filter(function (f) { return /a[ñn]o corrido/i.test(f[0] || ''); })[0];
  var col = enc ? enc.indexOf(String(anio)) : -1;
  if (!completo || col < 1 || !corrido) return { ok: false, mensaje: 'El anexo no trae el año ' + anio + ' completo a diciembre', url: url, filas: filas };
  var ipc = Math.round(Number(corrido[col]) * 100) / 100;
  if (!(ipc > -5 && ipc < 40)) return { ok: false, mensaje: 'Valor raro en el anexo: ' + corrido[col], url: url };
  return { ok: true, ipc: ipc, url: url, filas: filas };
}
