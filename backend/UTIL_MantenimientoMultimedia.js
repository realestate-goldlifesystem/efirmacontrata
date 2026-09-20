// ==========================================
// UTIL_MantenimientoMultimedia.js
// Puesta al día de inmuebles YA registrados (sep-2026).
//
//   1. revisarMantenimientoMultimedia()      → SOLO informa qué haría.
//   2. regenerarDescripciones_CONFIRMADO()   → rehace "DESCRIPCIÓN DE INMUEBLE"
//                                              con el formato nuevo.
//   3. normalizarFotosJpg_CONFIRMADO()       → deja todas las fotos con .jpg.
//
// ⚠️ Apps Script corta a los 6 minutos. Las dos funciones van por LOTES: se
// detienen a los 4:30, guardan en qué fila iban y SE PROGRAMAN SOLAS para
// seguir 1 minuto después, hasta terminar. No hay que volver a pulsar nada;
// basta mirar el registro de ejecuciones para ver cuándo dice TERMINADO.
// Si el tope de 20 triggers impidiera programarla, el avance igual queda
// guardado y basta ejecutar la misma función a mano.
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

/**
 * Programa la siguiente pasada dentro de 1 minuto para que el trabajo se
 * complete solo, sin que nadie tenga que volver a pulsar Ejecutar.
 *
 * Devuelve true si quedó programada. Si falla (tope de 20 triggers), el trabajo
 * NO se pierde: el avance sigue guardado y basta volver a ejecutar a mano.
 */
function _mantProgramarSiguiente(nombreFuncion) {
  try {
    // El trigger .after() es de un solo uso pero sigue LISTADO hasta que se
    // borra; sin esta limpieza se van acumulando hasta topar el límite.
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === nombreFuncion) ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger(nombreFuncion).timeBased().after(60 * 1000).create();
    return true;
  } catch (e) {
    Logger.log('⚠️ No se pudo programar la continuación automática: ' + e.message);
    return false;
  }
}

/** Motor común de los dos mantenimientos: recorre filas por lotes. */
function _mantRecorrer(clavePropiedad, etiqueta, accion, nombreFuncion) {
  var inicio = new Date().getTime();

  // Si esta pasada viene de un trigger programado, se borra ya mismo: gastado
  // igual sigue ocupando una de las 20 plazas.
  if (nombreFuncion) {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === nombreFuncion) ScriptApp.deleteTrigger(t);
    });
  }
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
      var programado = nombreFuncion ? _mantProgramarSiguiente(nombreFuncion) : false;
      Logger.log([
        '⏸️ ' + etiqueta + ': pausa por tiempo en la fila ' + fila + ' de ' + ultima + '.',
        'Hechos en esta pasada: ' + hechos + ' | omitidos: ' + omitidos + ' | errores: ' + errores,
        detalle.join('\n'),
        '',
        programado
          ? '⏱️ Continúa SOLO en 1 minuto desde la fila ' + fila + ' (quedan ' + (ultima - fila + 1) + '). No hay que hacer nada.'
          : '➡️ VUELVE A EJECUTAR esta misma función para continuar (quedan ' + (ultima - fila + 1) + ' filas).'
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
  }, 'regenerarDescripciones_CONFIRMADO');
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
  }, 'normalizarFotosJpg_CONFIRMADO');
}

/** Si hace falta empezar de cero, borra el avance guardado. */
function reiniciarAvanceMantenimiento() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(MANTENIMIENTO.PROP_CURSOR_DESC);
  props.deleteProperty(MANTENIMIENTO.PROP_CURSOR_JPG);
  // Si quedó una continuación programada, también se cancela.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'regenerarDescripciones_CONFIRMADO' || f === 'normalizarFotosJpg_CONFIRMADO') ScriptApp.deleteTrigger(t);
  });
  Logger.log('🔄 Avance borrado y continuaciones canceladas: la próxima ejecución empieza en la fila 2.');
}
