/**
 * DIAGNÓSTICO de un registro que quedó duplicado o atascado.
 *
 * Se escribió el 09-09-2026: una renovación (mismo propietario, misma dirección
 * y mismo apartamento) creó una fila nueva en vez de renovar la existente, y esa
 * fila se quedó en estado REGISTRANDO.
 *
 * Hay dos explicaciones posibles y este diagnóstico las separa:
 *   A) La clasificación falló y lo tomó por inmueble nuevo (TIPO_1).
 *   B) La clasificación acertó (TIPO_2) pero la Parte 2 nunca terminó, así que
 *      la fila temporal no se transfirió ni se borró.
 *
 * No modifica nada: solo lee la cola, los triggers y repite la búsqueda.
 * Ejecutar desde el editor de Apps Script y mirar el registro.
 */
/**
 * Borra la fila duplicada que dejó una renovación fallida.
 *
 * COMPRUEBA ANTES DE BORRAR, siempre:
 *   1. Que la fila esté a medias (no terminada) y sin carpeta de contenido.
 *   2. Que NO quede trabajo suyo en la cola. Si lo hubiera y se borrara la
 *      fila, un worker podría despertar y escribir sobre otro inmueble.
 *   3. Que exista OTRA fila con la misma dirección y apartamento, o sea que el
 *      inmueble de verdad no se pierde al borrar esta.
 *
 * Sin --confirmar solo informa. Para borrar: borrarFilaDuplicada(69, true)
 *
 * @param {number} fila     Fila a borrar.
 * @param {boolean} borrar  true para borrar de verdad.
 */
function borrarFilaDuplicada(fila, borrar) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var datos = sheet.getDataRange().getValues();
  var col = function (n) { return headers.indexOf(n); };
  var v = function (f, n) {
    var i = col(n);
    return i === -1 ? '' : String(datos[f - 1][i] || '').trim();
  };

  if (!fila || fila < 2 || fila > datos.length) { Logger.log('❌ Fila fuera de rango: ' + fila); return; }

  var idReg = v(fila, 'ID DE REGISTRO');
  var cdr = v(fila, 'CODIGO DE REGISTRO');
  var estado = v(fila, 'ESTADO DEL INMUEBLE');
  var carpeta = v(fila, 'LINK CARPETA DE CONTENIDO');
  var dir = v(fila, 'Ingrese la Dirección del inmueble');
  var apto = v(fila, 'N° de inmueble');

  Logger.log('===== BORRADO DE FILA DUPLICADA =====');
  Logger.log('Fila ' + fila + ': ' + cdr + '  (ID ' + idReg + ')');
  Logger.log('Estado: "' + estado + '"  |  Carpeta de contenido: ' + (carpeta ? 'SÍ' : 'no'));

  var problemas = [];

  // 1. ¿Terminó? Una fila terminada NO se toca.
  if (estado && estado.toUpperCase().indexOf('REGISTRANDO') === -1) {
    problemas.push('la fila NO está a medias (estado "' + estado + '"): puede ser un registro válido.');
  }
  if (carpeta) {
    problemas.push('la fila YA tiene carpeta de contenido: se procesó, no es un resto.');
  }

  // 2. ¿Queda trabajo encolado suyo?
  var props = PropertiesService.getScriptProperties().getProperties();
  var enCola = [];
  for (var k in props) {
    if (idReg && k.indexOf(idReg) !== -1) enCola.push(k);
    if (k === 'PROCESO_PARTE2_ROW_' + fila || k === 'PROCESO_PARTE3_ROW_' + fila) enCola.push(k);
  }
  if (enCola.length) {
    problemas.push('queda trabajo en la cola: ' + enCola.join(', ') +
                   '. Borrar la fila ahora haría que un worker escriba sobre otro inmueble.');
  } else {
    Logger.log('✅ Sin trabajo pendiente en la cola para este registro.');
  }

  // 3. ¿El inmueble sobrevive en otra fila?
  var gemelas = [];
  for (var i = 1; i < datos.length; i++) {
    var f = i + 1;
    if (f === fila) continue;
    if (v(f, 'Ingrese la Dirección del inmueble') === dir && v(f, 'N° de inmueble') === apto) {
      gemelas.push('fila ' + f + ' → ' + v(f, 'CODIGO DE REGISTRO'));
    }
  }
  if (!gemelas.length) {
    problemas.push('NO existe otra fila con esa dirección y apartamento: borrarla perdería el inmueble.');
  } else {
    Logger.log('✅ El inmueble se conserva en: ' + gemelas.join(' | '));
  }

  if (problemas.length) {
    Logger.log('');
    Logger.log('🛑 NO SE BORRA. Motivos:');
    problemas.forEach(function (p) { Logger.log('   · ' + p); });
    return;
  }

  if (!borrar) {
    Logger.log('');
    Logger.log('✅ Todas las comprobaciones pasan. Es seguro borrarla.');
    Logger.log('   Para hacerlo: borrarFilaDuplicada(' + fila + ', true)');
    return;
  }

  sheet.deleteRow(fila);
  Logger.log('');
  Logger.log('🗑️ Fila ' + fila + ' borrada (' + cdr + ').');
  Logger.log('   El inmueble sigue en: ' + gemelas.join(' | '));
  Logger.log('   ⚠️ Revisa si hay que devolver el contador de la secuencia usada por ' + cdr + '.');
}

function diagnosticarUltimoRegistro() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  var fila = sheet.getLastRow();
  diagnosticarRegistroEnFila(fila);
}

function diagnosticarRegistroEnFila(fila) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = function (n) { return headers.indexOf(n) + 1; };   // por NOMBRE, nunca por número
  var val = function (n) {
    var c = col(n);
    return c > 0 ? String(sheet.getRange(fila, c).getValue() || '').trim() : '(sin columna)';
  };

  var idReg = val('ID DE REGISTRO');
  var cdr = val('CODIGO DE REGISTRO');

  Logger.log('===== DIAGNÓSTICO DE LA FILA ' + fila + ' =====');
  Logger.log('CDR:          ' + cdr);
  Logger.log('ID REGISTRO:  ' + idReg);
  Logger.log('Propietario:  ' + val('NOMBRES Y APELLIDOS DEL PROPIETARIO') + '  CC ' + val('Número de documento'));
  Logger.log('Dirección:    ' + val('Ingrese la Dirección del inmueble'));
  Logger.log('Torre / Apto: "' + val('N° o Letra de la Torre') + '" / "' + val('N° de inmueble') + '"');
  Logger.log('Negocio:      ' + val('TIPO DE NEGOCIO'));
  Logger.log('ESTADO:       ' + val('ESTADO DEL INMUEBLE') + ' — ' + val('DETALLES DEL ESTADO DEL INMUEBLE'));

  // ---- 1. ¿Quedó trabajo pendiente en la cola? ----
  Logger.log('');
  Logger.log('--- COLA Y TRIGGERS ---');
  var props = PropertiesService.getScriptProperties();
  var todas = props.getProperties();
  var pendientes = [];
  for (var k in todas) {
    if (k.indexOf('PROCESO_PARTE2_') === 0 || k.indexOf('PROCESO_PARTE3_') === 0 ||
        k.indexOf('PENDING_REGISTRATION_') === 0) {
      pendientes.push(k);
    }
  }
  Logger.log('Claves pendientes en la cola: ' + (pendientes.length ? pendientes.join(', ') : '(ninguna)'));
  Logger.log('¿Hay trabajo encolado para ESTE registro (' + idReg + ')? ' +
    (pendientes.some(function (k) { return k.indexOf(idReg) !== -1; }) ? 'SÍ' : 'NO'));

  var triggers = ScriptApp.getProjectTriggers();
  var resumen = {};
  triggers.forEach(function (t) {
    var f = t.getHandlerFunction();
    resumen[f] = (resumen[f] || 0) + 1;
  });
  var lineas = [];
  for (var f in resumen) lineas.push(f + ' x' + resumen[f]);
  Logger.log('Triggers activos (' + triggers.length + '/20): ' + (lineas.join(' | ') || '(ninguno)'));

  // ---- 2. ¿Qué habría detectado la clasificación? ----
  Logger.log('');
  Logger.log('--- CLASIFICACIÓN (se repite la búsqueda, sin modificar nada) ---');
  var datos = {
    nombrePropietario: val('NOMBRES Y APELLIDOS DEL PROPIETARIO'),
    numeroDocumento: val('Número de documento'),
    tipoNegocio: val('TIPO DE NEGOCIO'),
    direccion: val('Ingrese la Dirección del inmueble'),
    torre: val('N° o Letra de la Torre'),
    apto: val('N° de inmueble')
  };

  var parent = DriveApp.getFolderById(CONFIG_INMUEBLES.PARENT_FOLDER_ID);
  var rpr = buscarPropietarioPorCedula(parent, datos.numeroDocumento);
  if (!rpr) {
    Logger.log('❌ No se encontró RPR para la cédula ' + datos.numeroDocumento);
    Logger.log('   => se habría clasificado como TIPO_1 (propietario nuevo).');
    return;
  }
  Logger.log('✅ RPR encontrado: ' + rpr.getName());

  var inmuebles = getFolderByName(rpr, 'INMUEBLES');
  if (!inmuebles) { Logger.log('❌ El RPR no tiene carpeta INMUEBLES => TIPO_1'); return; }

  var carpetaNegocio = determinarCarpetaNegocio(datos.tipoNegocio);
  Logger.log('Carpeta de negocio para "' + datos.tipoNegocio + '": ' + carpetaNegocio);
  var carpetaNegocioFolder = getFolderByName(inmuebles, carpetaNegocio);
  if (!carpetaNegocioFolder) { Logger.log('❌ No existe la carpeta ' + carpetaNegocio + ' => TIPO_3'); return; }

  // Qué hay dentro y cómo se compara cada una
  Logger.log('Contenido de ' + carpetaNegocio + ':');
  var it = carpetaNegocioFolder.getFolders();
  var dirBuscada = normalizarTexto(datos.direccion);
  var aptoBuscado = normalizarTexto(datos.apto.toString());
  var torreBuscada = datos.torre ? normalizarTexto(datos.torre.toString()) : '';
  var hallado = null;
  while (it.hasNext()) {
    var f = it.next();
    var n = f.getName();
    if (n === 'PLANTILLA #2') { Logger.log('   (se ignora PLANTILLA #2)'); continue; }
    var comp = extraerComponentesREG(n);
    if (!comp) { Logger.log('   ⚠️ no se pudo interpretar el nombre: ' + n); continue; }
    var okDir = comp.direccion === dirBuscada;
    var okApto = comp.apto === aptoBuscado;
    var okTorre = (!torreBuscada && !comp.torre) || (torreBuscada && comp.torre && torreBuscada === comp.torre);
    Logger.log('   ' + n);
    Logger.log('      dir "' + comp.direccion + '" ' + (okDir ? '=' : '≠') + ' "' + dirBuscada + '"' +
               ' | torre "' + comp.torre + '" ' + (okTorre ? 'ok' : 'NO') +
               ' | apto "' + comp.apto + '" ' + (okApto ? '=' : '≠') + ' "' + aptoBuscado + '"');
    if (okDir && okApto && okTorre) hallado = n;
  }

  Logger.log('');
  if (hallado) {
    Logger.log('✅ COINCIDE con: ' + hallado);
    Logger.log('   => la clasificación DEBERÍA haber dado TIPO_2 (renovación).');
    Logger.log('   Si aun así se creó una fila nueva, el problema NO es la detección:');
    Logger.log('   es que la Parte 2 no llegó a transferir ni a borrar la fila temporal.');
  } else {
    Logger.log('❌ NINGUNA carpeta coincide => se clasificó como inmueble nuevo.');
    Logger.log('   El problema SÍ es la detección; arriba se ve qué campo no cuadra.');
  }
  Logger.log('===== FIN =====');
}
