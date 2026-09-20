// ==========================================
// UTIL_MantenimientoMultimedia.js
// Puesta al día de inmuebles YA registrados (sep-2026).
//
//   1. revisarMantenimientoMultimedia()      → SOLO informa qué haría.
//   2. regenerarDescripciones_CONFIRMADO()   → rehace "DESCRIPCIÓN DE INMUEBLE"
//                                              con el formato nuevo.
//   3. normalizarFotosJpg_CONFIRMADO()       → deja todas las fotos con .jpg.
//
// ⚠️ Apps Script corta a los 6 minutos. Las dos funciones van por LOTES y
// recuerdan dónde quedaron: si el registro dice "quedan N", se vuelve a
// ejecutar la MISMA función hasta que diga que terminó. Cada pasada sigue
// desde la siguiente fila, nunca repite trabajo.
//
// No tocan el acta ni la hoja: solo el Doc de descripción y los nombres de las
// fotos dentro de la carpeta del inmueble.
// ==========================================

var MANTENIMIENTO = {
  HOJA: '1.1 - INMUEBLES REGISTRADOS',
  MAX_MS: 4.5 * 60 * 1000,          // margen antes del corte de Google
  PROP_CURSOR_DESC: 'MANT_CURSOR_DESCRIPCIONES',
  PROP_CURSOR_JPG: 'MANT_CURSOR_JPG',
  RUTA_FOTOS: ['ARCHIVOS DEL INMUEBLE', 'CONTENIDO DE PUBLICACIÓN', 'FOTOGRAFÍAS']
};

/** Carpeta REG de una fila, sacada del hipervínculo de la hoja. */
function _mantCarpetaReg(sheet, fila) {
  var col = getColumnByName(sheet, 'LINK DE CARPETA REG');
  if (!col) return null;
  var formula = sheet.getRange(fila, col).getFormula();
  var m = formula && formula.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  try {
    var carpeta = DriveApp.getFolderById(m[1]);
    return carpeta.isTrashed() ? null : carpeta;
  } catch (e) {
    return null;
  }
}

function revisarMantenimientoMultimedia() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MANTENIMIENTO.HOJA);
  var ultima = sheet.getLastRow();
  var colId = getColumnByName(sheet, 'ID DE REGISTRO');
  var conCarpeta = 0, sinCarpeta = 0;

  for (var fila = 2; fila <= ultima; fila++) {
    if (!String(sheet.getRange(fila, colId).getValue() || '').trim()) continue;
    if (_mantCarpetaReg(sheet, fila)) conCarpeta++; else sinCarpeta++;
  }

  var props = PropertiesService.getScriptProperties();
  Logger.log([
    '🔎 MANTENIMIENTO (simulación, no se tocó nada)',
    'Filas con datos: ' + (ultima - 1),
    'Con carpeta REG accesible: ' + conCarpeta,
    'Sin carpeta REG (se omitirán): ' + sinCarpeta,
    '',
    'Avance guardado:',
    '  descripciones → fila ' + (props.getProperty(MANTENIMIENTO.PROP_CURSOR_DESC) || '2 (sin empezar)'),
    '  fotos .jpg    → fila ' + (props.getProperty(MANTENIMIENTO.PROP_CURSOR_JPG) || '2 (sin empezar)')
  ].join('\n'));
}

/** Motor común de los dos mantenimientos: recorre filas por lotes. */
function _mantRecorrer(clavePropiedad, etiqueta, accion) {
  var inicio = new Date().getTime();
  var props = PropertiesService.getScriptProperties();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MANTENIMIENTO.HOJA);
  var ultima = sheet.getLastRow();
  var colId = getColumnByName(sheet, 'ID DE REGISTRO');
  var fila = parseInt(props.getProperty(clavePropiedad) || '2', 10);
  var hechos = 0, omitidos = 0, errores = 0;
  var detalle = [];

  for (; fila <= ultima; fila++) {
    if (new Date().getTime() - inicio > MANTENIMIENTO.MAX_MS) {
      props.setProperty(clavePropiedad, String(fila));
      Logger.log([
        '⏸️ ' + etiqueta + ': pausa por tiempo en la fila ' + fila + ' de ' + ultima + '.',
        'Hechos en esta pasada: ' + hechos + ' | omitidos: ' + omitidos + ' | errores: ' + errores,
        detalle.join('\n'),
        '',
        '➡️ VUELVE A EJECUTAR esta misma función para continuar (quedan ' + (ultima - fila + 1) + ' filas).'
      ].join('\n'));
      return;
    }

    var id = String(sheet.getRange(fila, colId).getValue() || '').trim();
    if (!id) { omitidos++; continue; }

    var carpeta = _mantCarpetaReg(sheet, fila);
    if (!carpeta) { omitidos++; detalle.push('⏭️ ' + id + ': sin carpeta REG'); continue; }

    try {
      var resultado = accion(sheet, fila, carpeta, id);
      if (resultado) { hechos++; detalle.push('✅ ' + id + ': ' + resultado); }
      else { omitidos++; detalle.push('⏭️ ' + id + ': nada que hacer'); }
    } catch (e) {
      errores++;
      detalle.push('❌ ' + id + ': ' + e.message);
    }
  }

  props.deleteProperty(clavePropiedad);
  Logger.log([
    '🏁 ' + etiqueta + ': TERMINADO (se recorrió hasta la fila ' + ultima + ').',
    'Actualizados: ' + hechos + ' | omitidos: ' + omitidos + ' | errores: ' + errores,
    '',
    detalle.join('\n')
  ].join('\n'));
}

/** Rehace el Doc "DESCRIPCIÓN DE INMUEBLE" con el formato nuevo. */
function regenerarDescripciones_CONFIRMADO() {
  _mantRecorrer(MANTENIMIENTO.PROP_CURSOR_DESC, 'Descripciones', function (sheet, fila, carpeta) {
    return procesarYGuardarDescripcion(sheet, fila, carpeta) ? 'descripción actualizada' : null;
  });
}

/** Renombra a .jpg las fotos de versiones viejas (FOTOGRAFÍAS y TOP 10). */
function normalizarFotosJpg_CONFIRMADO() {
  _mantRecorrer(MANTENIMIENTO.PROP_CURSOR_JPG, 'Fotos .jpg', function (sheet, fila, carpeta) {
    var fotos = navegarRutaCarpetas(carpeta, MANTENIMIENTO.RUTA_FOTOS, false);
    if (!fotos) return null;

    var renombradas = normalizarImagenesAJpg(fotos) || 0;

    // La subcarpeta TOP 10 guarda copias con su propio nombre: también van.
    var itTop = fotos.getFoldersByName('TOP 10');
    if (itTop.hasNext()) renombradas += (normalizarImagenesAJpg(itTop.next()) || 0);

    return renombradas ? renombradas + ' foto(s) renombrada(s)' : null;
  });
}

/** Si hace falta empezar de cero, borra el avance guardado. */
function reiniciarAvanceMantenimiento() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(MANTENIMIENTO.PROP_CURSOR_DESC);
  props.deleteProperty(MANTENIMIENTO.PROP_CURSOR_JPG);
  Logger.log('🔄 Avance borrado: la próxima ejecución empieza en la fila 2.');
}
