// ==========================================
// UTIL_LimpiarPruebasSistema.js
// Borra TODO lo de las pruebas de punta a punta con el propietario de prueba
// "PRUEBA SISTEMA GOLD LIFE" (dirección "… PRUEBA SISTEMA", cédula 1000000777)
// y deja los contadores donde deben quedar.
//
//   1. revisarLimpiezaPruebasSistema()            → SOLO muestra lo que haría.
//   2. limpiarPruebasSistema_CONFIRMADO()         → lo hace.
//
// Qué hace:
//   - Filas de '1.1 - INMUEBLES REGISTRADOS' del propietario de prueba.
//   - Archivos y carpetas de Drive con "PRUEBA SISTEMA" en el nombre (carpeta del
//     propietario, carpetas REG, actas, carteles) → papelera, recuperable 30 días.
//   - Memoria del script ligada a esos inmuebles y actas (rollback, triggers,
//     DOC_REEMPLAZADO_…) y sus triggers de recordatorio/reversión.
//   - Contadores MAX_SEQ_*: baja cada uno hasta el mayor número que queda en la
//     hoja, pero SOLO por números que en Drive no tienen ninguna carpeta REG real
//     (viva o en papelera). Si un número lo usó un inmueble real borrado, ahí se
//     detiene: repetir un código histórico es peor que dejar un hueco.
//   - LAST_RPR_SEQUENCE se borra: el sistema lo recalcula solo desde la hoja.
//
// No corre si hay registros a medio procesar (la cola guarda números de fila y
// borrar filas en ese momento haría procesar el inmueble equivocado).
//
// Va en Apps Script porque la Service Account no puede mandar a la papelera
// archivos que no le pertenecen.
// ==========================================

var LIMPIEZA_PRUEBAS = {
  HOJA: '1.1 - INMUEBLES REGISTRADOS',
  PROPIETARIO: 'PRUEBA SISTEMA GOLD LIFE',
  MARCA: 'PRUEBA SISTEMA',
  CEDULA: '1000000777',
  TIPOS: ['C', 'A', 'V', 'VR', 'AV']
};

function revisarLimpiezaPruebasSistema() {
  return limpiarPruebasSistema_(false);
}

function limpiarPruebasSistema_CONFIRMADO() {
  return limpiarPruebasSistema_(true);
}

function limpiarPruebasSistema_(borrar) {
  var C = LIMPIEZA_PRUEBAS;
  var log = [borrar ? '🧹 LIMPIEZA REAL' : '🔎 SIMULACIÓN (no se borra nada)'];
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(C.HOJA);
    var datos = sheet.getDataRange().getValues();
    var h = datos[0].map(function (x) { return String(x).trim(); });
    var col = function (n) { var i = h.indexOf(n); if (i === -1) throw new Error('Falta la columna ' + n); return i; };
    var cId = col('ID DE REGISTRO'), cProp = col('NOMBRES Y APELLIDOS DEL PROPIETARIO'), cCed = col('Número de documento');
    var cDir = col('Ingrese la Dirección del inmueble'), cCdr = col('CODIGO DE REGISTRO'), cEst = col('ESTADO DEL INMUEBLE');

    // 0. Nada a medio procesar
    for (var k = 1; k < datos.length; k++) {
      if (/REGISTRANDO|COLA|PROCESANDO/i.test(String(datos[k][cEst]))) {
        throw new Error('La fila ' + (k + 1) + ' (' + datos[k][cId] + ') está "' + datos[k][cEst] +
          '". Espera a que termine y vuelve a correr esto. No se tocó nada.');
      }
    }

    // 1. Filas de prueba: propietario de prueba Y (cédula o dirección de prueba)
    var filas = [], ids = [];
    for (var i = 1; i < datos.length; i++) {
      var esPrueba = String(datos[i][cProp]).trim() === C.PROPIETARIO &&
        (String(datos[i][cCed]).trim() === C.CEDULA || String(datos[i][cDir]).indexOf(C.MARCA) !== -1);
      if (!esPrueba) continue;
      filas.push(i + 1); ids.push(String(datos[i][cId]).trim());
      log.push('📄 Fila ' + (i + 1) + ' → ' + datos[i][cId] + ' | ' + datos[i][cCdr]);
    }
    if (!filas.length) log.push('📄 Filas de prueba: ninguna');

    // 2. Drive: todo lo que lleve la marca en el nombre
    var archivos = [], idsDocs = [];
    var it = DriveApp.searchFiles("title contains '" + C.MARCA + "' and trashed = false");
    while (it.hasNext()) { var f = it.next(); archivos.push(f); idsDocs.push(f.getId()); }
    var carpetas = [];
    var itC = DriveApp.searchFolders("title contains '" + C.MARCA + "' and trashed = false");
    while (itC.hasNext()) carpetas.push(itC.next());
    log.push('📁 Carpetas a la papelera: ' + carpetas.length);
    carpetas.forEach(function (c) { log.push('     ' + c.getName()); });
    log.push('📑 Archivos sueltos a la papelera: ' + archivos.length);

    // 3. Memoria y triggers ligados a esos inmuebles o actas
    var props = PropertiesService.getScriptProperties();
    var todas = props.getProperties();
    var marcas = ids.filter(String);
    var clavesMemoria = Object.keys(todas).filter(function (key) {
      if (marcas.some(function (id) { return key.indexOf(id) !== -1; })) return true;
      if (key.indexOf('DOC_REEMPLAZADO_') === 0) {
        var a = key.slice('DOC_REEMPLAZADO_'.length), b = todas[key];
        return idsDocs.indexOf(a) !== -1 || idsDocs.indexOf(b) !== -1 || esArchivoDePrueba_(a);
      }
      return false;
    });
    var idsTriggers = clavesMemoria.filter(function (key) { return /^TRIGGERS_/.test(key); })
      .map(function (key) { return todas[key]; });
    log.push('🧠 Memoria a borrar: ' + (clavesMemoria.length ? clavesMemoria.join(', ') : '(ninguna)'));
    log.push('⏰ Triggers a borrar: ' + idsTriggers.length);

    // 4. Contadores, calculados sin las filas de prueba
    var maxEnHoja = {};
    for (var j = 1; j < datos.length; j++) {
      if (filas.indexOf(j + 1) !== -1) continue;
      var m = String(datos[j][cCdr]).match(/^REG_\d{2}-\d{2}-\d{4}-([A-Z]+)(\d+)_/);
      if (m) maxEnHoja[m[1]] = Math.max(maxEnHoja[m[1]] || 0, parseInt(m[2], 10));
    }
    var nuevosContadores = {};
    C.TIPOS.forEach(function (tipo) {
      var clave = 'MAX_SEQ_' + tipo;
      var actual = parseInt(props.getProperty(clave), 10);
      var enHoja = maxEnHoja[tipo] || 0;
      if (isNaN(actual) || actual <= enHoja) {
        log.push('🔢 ' + clave + ': ' + (isNaN(actual) ? '(vacío)' : actual) + ' → no se toca (mayor en la hoja: ' + enHoja + ')');
        return;
      }
      // Bajar de uno en uno mientras ese número no lo tenga una carpeta REG real
      var nuevo = actual;
      while (nuevo > enHoja && !numeroUsadoPorReal_(tipo, nuevo, C.MARCA)) nuevo--;
      if (nuevo === actual) {
        log.push('🔢 ' + clave + ': ' + actual + ' → no se toca (' + tipo + actual + ' lo usó un inmueble real)');
      } else {
        nuevosContadores[clave] = nuevo;
        log.push('🔢 ' + clave + ': ' + actual + ' → ' + nuevo + ' (el próximo será ' + tipo + (nuevo + 1) + ')');
      }
    });
    log.push('🔢 LAST_RPR_SEQUENCE: ' + (props.getProperty('LAST_RPR_SEQUENCE') || '(vacío)') +
      ' → se borra y se recalcula desde la hoja');

    if (borrar) {
      carpetas.forEach(function (c) { c.setTrashed(true); });
      archivos.forEach(function (f) { try { f.setTrashed(true); } catch (e) {} });
      ScriptApp.getProjectTriggers().forEach(function (t) {
        if (idsTriggers.indexOf(t.getUniqueId()) !== -1) ScriptApp.deleteTrigger(t);
      });
      clavesMemoria.forEach(function (key) { props.deleteProperty(key); });
      filas.sort(function (a, b) { return b - a; }).forEach(function (f) { sheet.deleteRow(f); });
      Object.keys(nuevosContadores).forEach(function (key) { props.setProperty(key, String(nuevosContadores[key])); });
      props.deleteProperty('LAST_RPR_SEQUENCE');
      SpreadsheetApp.flush();
      log.push('✅ Listo.');
    } else {
      log.push('\nSi todo se ve bien, ejecuta limpiarPruebasSistema_CONFIRMADO.');
    }
  } finally {
    lock.releaseLock();
  }
  Logger.log(log.join('\n'));
  return log;
}

// ¿Hay alguna carpeta REG que NO sea de prueba con ese tipo y número (viva o en
// la papelera)? Ej.: "REG_16-10-2026-C54_(…)". El guion inicial evita que "-V8_"
// coincida con "-AV8_".
function numeroUsadoPorReal_(tipo, numero, marca) {
  var it = DriveApp.searchFolders("title contains '-" + tipo + numero + "_'");
  while (it.hasNext()) {
    var nombre = it.next().getName();
    if (nombre.indexOf('-' + tipo + numero + '_') !== -1 && nombre.indexOf(marca) === -1) return true;
  }
  return false;
}

function esArchivoDePrueba_(id) {
  try { return DriveApp.getFileById(id).getName().indexOf(LIMPIEZA_PRUEBAS.MARCA) !== -1; } catch (e) { return false; }
}
