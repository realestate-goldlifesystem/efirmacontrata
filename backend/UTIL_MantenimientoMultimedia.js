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
  PROP_CURSOR_CARPETAS: 'MANT_CURSOR_CARPETAS',
  PROP_CURSOR_REVISION: 'MANT_CURSOR_REVISION',
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
      if (e.message === '__TIEMPO__') {
        // Se acabó el tiempo a mitad de este inmueble: se guarda ESTA fila para
        // retomarla (lo ya creado no se repite) y se programa la continuación.
        props.setProperty(clavePropiedad, String(fila));
        var sigue = nombreFuncion ? _mantProgramarSiguiente(nombreFuncion) : false;
        Logger.log([
          '⏸️ ' + etiqueta + ': pausa DENTRO del inmueble ' + id + ' (fila ' + fila + ' de ' + ultima + ').',
          'Hechos en esta pasada: ' + hechos + ' | omitidos: ' + omitidos,
          detalle.join('\n'),
          '',
          sigue ? '⏱️ Continúa SOLO en 1 minuto y termina ese inmueble. No hay que hacer nada.'
                : '➡️ VUELVE A EJECUTAR esta misma función para continuar.'
        ].join('\n'));
        return;
      }
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
  props.deleteProperty(MANTENIMIENTO.PROP_CURSOR_CARPETAS);
  props.deleteProperty(MANTENIMIENTO.PROP_CURSOR_REVISION);
  // Si quedó una continuación programada, también se cancela.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'regenerarDescripciones_CONFIRMADO' || f === 'normalizarFotosJpg_CONFIRMADO' || f === 'completarCarpetasFaltantes_CONFIRMADO' || f === 'revisarCarpetasFaltantes') ScriptApp.deleteTrigger(t);
  });
  Logger.log('🔄 Avance borrado y continuaciones canceladas: la próxima ejecución empieza en la fila 2.');
}

// ==========================================
// COMPLETAR CARPETAS QUE FALTAN (registros viejos)
// ==========================================
// Los primeros inmuebles se crearon cuando la PLANTILLA #2 tenía menos
// subcarpetas. Esto compara cada REG contra la plantilla maestra de HOY y crea
// SOLO lo que falte.
//
// Reglas:
//  - Nunca borra, nunca renombra, nunca mueve nada de lo que ya existe.
//  - La carpeta de año NO se duplica: si el inmueble ya tiene su "2024", se
//    completa DENTRO de ese año (la plantilla la llama "XXXX"). Solo si no hay
//    ninguna se crea, y con el año DEL REGISTRO, no con el año actual.
//  - Solo carpetas: los documentos de la plantilla no se copian (un acta o una
//    cuenta de cobro nueva en un inmueble viejo confundiría más que ayudar).
//
//   1. revisarCarpetasFaltantes()            → SOLO lista lo que falta.
//   2. completarCarpetasFaltantes_CONFIRMADO() → las crea.
// ==========================================

// Momento en que hay que parar, aunque se esté a mitad de un inmueble. Crear
// 105 carpetas tarda ~2,5 min: si se empieza uno cerca del límite, la ejecución
// se pasa de los 6 minutos y Google la mata (visto el 20-09-2026). Al cortar se
// deja el inmueble a medias A PROPÓSITO: la siguiente pasada retoma esa misma
// fila y crea solo lo que le falte.
var _mantLimite = 0;

/** PLANTILLA #2 de la maestra: el molde con el que se compara. */
function _mantPlantilla2() {
  var maestra = DriveApp.getFolderById(CONFIG_INMUEBLES.TEMPLATE_FOLDER_ID);
  var inmuebles = getFolderByName(maestra, 'INMUEBLES');
  if (!inmuebles) throw new Error('No se encontró INMUEBLES en la plantilla maestra');
  var arriendo = getFolderByName(inmuebles, 'ARRIENDO');
  if (!arriendo) throw new Error('No se encontró ARRIENDO en la plantilla maestra');
  var p2 = getFolderByName(arriendo, 'PLANTILLA #2');
  if (!p2) throw new Error('No se encontró PLANTILLA #2 en la plantilla maestra');
  return p2;
}

/** Año del registro: del CDR (REG_14-12-2024-C1...) y si no, de la marca temporal. */
function _mantAnioDelRegistro(sheet, fila) {
  var colCdr = getColumnByName(sheet, 'CODIGO DE REGISTRO');
  var cdr = colCdr ? String(sheet.getRange(fila, colCdr).getValue() || '') : '';
  var m = cdr.match(/REG_\d{2}-\d{2}-(\d{4})/);
  if (m) return m[1];

  var colFecha = getColumnByName(sheet, 'Marca temporal');
  var fecha = colFecha ? sheet.getRange(fila, colFecha).getValue() : null;
  if (fecha instanceof Date) return String(fecha.getFullYear());
  return String(new Date().getFullYear());
}

/**
 * Recorre la plantilla y crea en el destino lo que falte.
 * 'XXXX' se resuelve contra la carpeta de año que YA tenga el inmueble.
 * Devuelve la lista de rutas creadas (vacía si no faltaba nada).
 */
function _mantCompletarNivel(plantilla, destino, anio, ruta, crear, creadas, archivos, copiarArchivos) {
  // Archivos del molde que faltan. El registro de hoy SÍ los copia
  // (copiarContenidoFaltante en 2- REGISTRO), por eso se cuentan aparte: así se
  // ve cuánto falta sin meterle documentos nuevos a un inmueble viejo salvo que
  // se pida expresamente.
  var arch = plantilla.getFiles();
  while (arch.hasNext()) {
    var archivoPlantilla = arch.next();
    if (destino.getFilesByName(archivoPlantilla.getName()).hasNext()) continue;
    archivos.push(ruta + '/' + archivoPlantilla.getName());
    if (crear && copiarArchivos) archivoPlantilla.makeCopy(archivoPlantilla.getName(), destino);
  }

  var sub = plantilla.getFolders();
  while (sub.hasNext()) {
    var carpetaPlantilla = sub.next();
    var nombre = carpetaPlantilla.getName();
    var nombreDestino = nombre;

    if (nombre === 'XXXX') {
      // ¿Ya hay una carpeta de año (4 dígitos) en este punto? Se usa ESA.
      var existentes = destino.getFolders();
      var anioExistente = null;
      while (existentes.hasNext()) {
        var c = existentes.next();
        if (/^\d{4}$/.test(c.getName())) { anioExistente = c.getName(); break; }
      }
      nombreDestino = anioExistente || anio;
    }

    if (crear && _mantLimite && new Date().getTime() > _mantLimite) throw new Error('__TIEMPO__');

    var hija = getFolderByName(destino, nombreDestino);
    if (!hija) {
      creadas.push(ruta + '/' + nombreDestino);
      if (!crear) continue;            // en simulación no se puede seguir hacia abajo
      hija = destino.createFolder(nombreDestino);
    }
    _mantCompletarNivel(carpetaPlantilla, hija, anio, ruta + '/' + nombreDestino, crear, creadas, archivos, copiarArchivos);
  }
  return creadas;
}

function revisarCarpetasFaltantes() {
  // Va por LOTES como las demás: recorrer 69 inmuebles × ~134 carpetas se pasa
  // de los 6 minutos (se comprobó el 20-09-2026). Solo lee, no crea nada, y
  // continúa sola hasta terminar.
  var plantilla = _mantPlantilla2();
  _mantRecorrer(MANTENIMIENTO.PROP_CURSOR_REVISION, 'Revisión de carpetas (simulación)', function (sheet, fila, carpeta) {
    var archivosFaltantes = [];
    var anio = _mantAnioDelRegistro(sheet, fila);
    var faltan = _mantCompletarNivel(plantilla, carpeta, anio, '', false, [], archivosFaltantes, false);
    if (!faltan.length && !archivosFaltantes.length) return null;
    return 'año ' + anio + ' → faltan ' + faltan.length + ' carpeta(s) y ' + archivosFaltantes.length + ' archivo(s)' +
      (faltan.length ? '\n     ' + faltan.join('\n     ') : '');
  }, 'revisarCarpetasFaltantes');
}

function completarCarpetasFaltantes_CONFIRMADO() {
  var plantilla = _mantPlantilla2();
  _mantLimite = new Date().getTime() + MANTENIMIENTO.MAX_MS;
  _mantRecorrer(MANTENIMIENTO.PROP_CURSOR_CARPETAS, 'Carpetas faltantes', function (sheet, fila, carpeta) {
    var creadas = _mantCompletarNivel(plantilla, carpeta, _mantAnioDelRegistro(sheet, fila), '', true, [], [], false);
    // Solo el conteo: listar las 105 rutas por inmueble desbordaba el registro
    // de Apps Script ("Logging output too large") y tapaba el avance real.
    return creadas.length ? creadas.length + ' carpeta(s) creada(s)' : null;
  }, 'completarCarpetasFaltantes_CONFIRMADO');
}

// ==========================================
// CARPETA DEL PROPIETARIO (RPR)
// ==========================================
// Lo anterior solo mira la carpeta REG del inmueble. La RPR (la del
// propietario, con DOCUMENTOS DEL PROPIETARIO e INMUEBLES) nace de PLANTILLA #1
// y hasta ahora nadie la revisaba.
//
// ⚠️ "PLANTILLA #2" NO se copia a la RPR. Ese molde vive dentro de ARRIENDO en
// la plantilla maestra y es de un solo uso: si quedara dentro del RPR de un
// propietario, el segundo inmueble de esa persona fallaría (ver el comentario
// de crearREGDesdePlantillaMaestra en 2- REGISTRO DE INMUEBLE).
//
//   1. revisarCarpetasRPR()            → SOLO lista lo que falta.
//   2. completarCarpetasRPR_CONFIRMADO() → las crea.

/** Recorre las RPR sin repetir: varios inmuebles comparten la del mismo dueño. */
function _mantRecorrerRPR(etiqueta, crear) {
  var plantilla1 = DriveApp.getFolderById(CONFIG_INMUEBLES.TEMPLATE_FOLDER_ID);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MANTENIMIENTO.HOJA);
  var ultima = sheet.getLastRow();
  var colId = getColumnByName(sheet, 'ID DE REGISTRO');
  var colRpr = getColumnByName(sheet, 'LINK DE CARPETA RPR');
  var vistas = {}, detalle = [], conFaltantes = 0, completas = 0;

  for (var fila = 2; fila <= ultima; fila++) {
    var id = String(sheet.getRange(fila, colId).getValue() || '').trim();
    if (!id || !colRpr) continue;
    var m = String(sheet.getRange(fila, colRpr).getFormula() || '').match(/folders\/([a-zA-Z0-9_-]+)/);
    if (!m || vistas[m[1]]) continue;      // misma RPR de otro inmueble: ya revisada
    vistas[m[1]] = true;

    try {
      var rpr = DriveApp.getFolderById(m[1]);
      if (rpr.isTrashed()) continue;
      var faltan = _mantCompletarNivelRPR(plantilla1, rpr, '', crear, []);
      if (faltan.length) {
        conFaltantes++;
        detalle.push('📁 ' + rpr.getName() + ': ' + faltan.length + ' carpeta(s)\n     ' + faltan.join('\n     '));
      } else {
        completas++;
      }
    } catch (e) {
      detalle.push('❌ ' + id + ': ' + e.message);
    }
  }

  Logger.log([
    (crear ? '🧹 ' : '🔎 ') + etiqueta,
    'Carpetas de propietario revisadas: ' + Object.keys(vistas).length,
    'Completas: ' + completas + ' | con faltantes: ' + conFaltantes,
    '',
    detalle.length ? detalle.join('\n') : '(nada que reportar)'
  ].join('\n'));
}

/** Como _mantCompletarNivel pero para la RPR: salta PLANTILLA #2 y no toca años. */
function _mantCompletarNivelRPR(plantilla, destino, ruta, crear, creadas) {
  var sub = plantilla.getFolders();
  while (sub.hasNext()) {
    var carpetaPlantilla = sub.next();
    var nombre = carpetaPlantilla.getName();
    if (nombre === 'PLANTILLA #2') continue;     // ⚠️ nunca dentro de un RPR

    var hija = getFolderByName(destino, nombre);
    if (!hija) {
      creadas.push(ruta + '/' + nombre);
      if (!crear) continue;
      hija = destino.createFolder(nombre);
    }
    _mantCompletarNivelRPR(carpetaPlantilla, hija, ruta + '/' + nombre, crear, creadas);
  }
  return creadas;
}

function revisarCarpetasRPR() {
  _mantRecorrerRPR('CARPETAS DEL PROPIETARIO (simulación, no se creó nada)', false);
}

function completarCarpetasRPR_CONFIRMADO() {
  _mantRecorrerRPR('CARPETAS DEL PROPIETARIO: creando lo que falta', true);
}
