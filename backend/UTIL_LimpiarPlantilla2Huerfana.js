/**
 * Limpia la carpeta "PLANTILLA #2" que quedó de sobra dentro de los RPR de
 * propietario.
 *
 * De dónde salió: al registrar un propietario NUEVO se copiaba PLANTILLA #1
 * entera en su RPR, y PLANTILLA #1 trae dentro INMUEBLES/ARRIENDO/PLANTILLA #2.
 * Ese molde ya no se usa (el REG se crea siempre desde la maestra con
 * crearREGDesdePlantillaMaestra), así que el propietario quedaba con dos
 * carpetas: el REG bueno y un molde sobrante de ~125 subcarpetas vacías.
 *
 * Desde el 26-sep-2026 copiarContenidoFaltante ya no la trae. Esto solo limpia
 * los RPR que se crearon antes.
 *
 * ⚠️ No se puede hacer con la cuenta de servicio: Drive no la deja mandar a la
 * papelera archivos que no le pertenecen. Por eso vive aquí.
 *
 * Uso:
 *   revisarPlantilla2Huerfana()             → solo mira y reporta
 *   limpiarPlantilla2Huerfana_CONFIRMADO()  → manda a la papelera (recuperable)
 */

function revisarPlantilla2Huerfana() {
  _plantilla2Huerfana(false);
}

function limpiarPlantilla2Huerfana_CONFIRMADO() {
  _plantilla2Huerfana(true);
}

function _plantilla2Huerfana(borrar) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG_INMUEBLES.HOJA_PRINCIPAL);
  var datos = sheet.getDataRange().getValues();
  var encabezados = datos[0];

  var colRpr = encabezados.indexOf('LINK DE CARPETA RPR');
  var colId = encabezados.indexOf('ID DE REGISTRO');
  if (colRpr === -1 || colId === -1) {
    throw new Error('No se encontraron las columnas LINK DE CARPETA RPR / ID DE REGISTRO');
  }

  // Un RPR por propietario, aunque tenga varios inmuebles
  var rprs = {};
  for (var i = 1; i < datos.length; i++) {
    var id = String(datos[i][colId] || '').trim();
    var m = String(datos[i][colRpr] || '').match(/folders\/([\w-]+)/);
    if (!id || !m) continue;
    if (!rprs[m[1]]) rprs[m[1]] = [];
    rprs[m[1]].push(id);
  }

  Logger.log(borrar ? '🧹 BORRANDO (a la papelera)' : '🔎 SIMULACIÓN');
  Logger.log('Propietarios (RPR) a revisar: ' + Object.keys(rprs).length);

  var limpias = 0, conHuerfana = 0, borradas = 0, errores = 0;

  for (var rprId in rprs) {
    try {
      var rpr = DriveApp.getFolderById(rprId);
      if (rpr.isTrashed()) continue;

      var hallazgos = [];
      _buscarPlantilla2(rpr, '', hallazgos);

      if (!hallazgos.length) { limpias++; continue; }
      conHuerfana++;

      for (var j = 0; j < hallazgos.length; j++) {
        Logger.log('📁 ' + rpr.getName() + ' [' + rprs[rprId].join(', ') + ']');
        Logger.log('     ' + hallazgos[j].ruta);
        if (borrar) {
          hallazgos[j].carpeta.setTrashed(true);
          borradas++;
          Logger.log('     → enviada a la papelera');
        }
      }
    } catch (e) {
      errores++;
      Logger.log('❌ ' + rprId + ': ' + e.message);
    }
  }

  Logger.log('───────────────────────────────');
  Logger.log('RPR limpias: ' + limpias + ' | con PLANTILLA #2: ' + conHuerfana +
             ' | borradas: ' + borradas + ' | errores: ' + errores);
  if (!borrar && conHuerfana) {
    Logger.log('(simulación: ejecuta limpiarPlantilla2Huerfana_CONFIRMADO para hacerlo de verdad)');
  }
}

/** Recorre el RPR completo buscando cualquier carpeta llamada PLANTILLA #2. */
function _buscarPlantilla2(carpeta, ruta, hallazgos) {
  var hijas = carpeta.getFolders();
  while (hijas.hasNext()) {
    var hija = hijas.next();
    var nombre = hija.getName();
    if (nombre === 'PLANTILLA #2') {
      hallazgos.push({ carpeta: hija, ruta: ruta + '/PLANTILLA #2' });
      continue;                       // no hace falta entrar: se va entera
    }
    _buscarPlantilla2(hija, ruta + '/' + nombre, hallazgos);
  }
}
