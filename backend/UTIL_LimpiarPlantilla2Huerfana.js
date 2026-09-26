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
  var rango = sheet.getDataRange();
  var datos = rango.getValues();
  // El link de la RPR casi siempre es un =HYPERLINK(...): getValues() devuelve
  // solo el texto visible, así que hay que mirar también la fórmula y, si
  // tampoco, el enlace enriquecido de la celda.
  var formulas = rango.getFormulas();
  var enriquecido = rango.getRichTextValues();
  var encabezados = datos[0];

  var colRpr = encabezados.indexOf('LINK DE CARPETA RPR');
  var colId = encabezados.indexOf('ID DE REGISTRO');
  if (colRpr === -1 || colId === -1) {
    throw new Error('No se encontraron las columnas LINK DE CARPETA RPR / ID DE REGISTRO');
  }

  // Un RPR por propietario, aunque tenga varios inmuebles
  var rprs = {};
  var sinLink = 0;
  for (var i = 1; i < datos.length; i++) {
    var id = String(datos[i][colId] || '').trim();
    if (!id) continue;

    var folderId = _idDeCarpeta(formulas[i][colRpr]) ||
                   _idDeCarpeta(datos[i][colRpr]) ||
                   _idDeCarpeta(_urlEnriquecida(enriquecido[i][colRpr]));
    if (!folderId) { sinLink++; continue; }

    if (!rprs[folderId]) rprs[folderId] = [];
    rprs[folderId].push(id);
  }
  if (sinLink) Logger.log('⚠️ Filas con ID pero sin link de RPR legible: ' + sinLink);

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

/** Saca el ID de carpeta de un texto que contenga .../folders/<id>. */
function _idDeCarpeta(texto) {
  var m = String(texto || '').match(/folders\/([\w-]+)/);
  return m ? m[1] : '';
}

/** URL del enlace enriquecido de una celda (cuando no es fórmula). */
function _urlEnriquecida(rich) {
  if (!rich) return '';
  var url = rich.getLinkUrl();
  if (url) return url;
  var partes = rich.getRuns();
  for (var i = 0; i < partes.length; i++) {
    var u = partes[i].getLinkUrl();
    if (u) return u;
  }
  return '';
}

/**
 * Busca la PLANTILLA #2 sobrante donde de verdad puede estar: colgando del RPR
 * o dentro de INMUEBLES/<negocio>/. Se mira solo ahí a propósito — recorrer los
 * RPR completos (125 subcarpetas cada uno × 18) se pasa de los 6 minutos, y más
 * abajo no puede aparecer: viene de copiar PLANTILLA #1, que la trae en
 * INMUEBLES/ARRIENDO.
 */
function _buscarPlantilla2(rpr, ruta, hallazgos) {
  _plantilla2Directa(rpr, ruta, hallazgos);

  var inmuebles = rpr.getFoldersByName('INMUEBLES');
  while (inmuebles.hasNext()) {
    var inm = inmuebles.next();
    _plantilla2Directa(inm, ruta + '/INMUEBLES', hallazgos);

    var negocios = inm.getFolders();
    while (negocios.hasNext()) {
      var neg = negocios.next();
      if (neg.getName() === 'PLANTILLA #2') continue;   // ya la tomó la línea de arriba
      _plantilla2Directa(neg, ruta + '/INMUEBLES/' + neg.getName(), hallazgos);
    }
  }
}

/** Hijas directas de una carpeta que se llamen PLANTILLA #2. */
function _plantilla2Directa(carpeta, ruta, hallazgos) {
  var it = carpeta.getFoldersByName('PLANTILLA #2');
  while (it.hasNext()) {
    hallazgos.push({ carpeta: it.next(), ruta: ruta + '/PLANTILLA #2' });
  }
}
