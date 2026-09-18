// ==========================================
// UTIL_LimpiarRegistroTN846551.js
// Limpieza puntual del registro del 18-09-2026 que quedó con la dirección
// "Cl 143 ##9-55" (doble numeral) y de su envío repetido.
//
//   1. revisarLimpiezaTN846551()            → SOLO muestra lo que haría.
//   2. limpiarRegistroTN846551_CONFIRMADO() → lo hace.
//
// Qué borra:
//   - Filas TN846551 y DUPLICADO-WT943479 de '1.1 - INMUEBLES REGISTRADOS'.
//   - La carpeta REG_18-09-2026-C48_(Cl 143 ##9-55)_APTO-912 (va a la
//     papelera de Drive, recuperable 30 días) con TODO lo que tiene dentro:
//     actas, contenido de publicación, entregas, cuenta de cobro.
//   - Memoria del script ligada a esos IDs.
//   - Devuelve MAX_SEQ_C de 48 a 47 para que el registro nuevo vuelva a ser C48.
//
// Qué NO toca: la carpeta RPR-18-1075 del propietario CIENCUADRAS, que la
// comparten otros 13 inmuebles.
//
// Va en Apps Script (no en un script local) porque la Service Account no puede
// mandar a la papelera archivos que no le pertenecen.
// ==========================================

var LIMPIEZA_TN846551 = {
  HOJA: '1.1 - INMUEBLES REGISTRADOS',
  IDS: ['TN846551', 'DUPLICADO-WT943479'],
  IDS_MEMORIA: ['TN846551', 'WT943479'],
  DIRECCION: 'Cl 143 ##9-55',
  CARPETA_REG_ID: '1QdJBfNdUHt9ItcKsrH9pEUQ2WVd5V4c7',
  CARPETA_REG_NOMBRE: 'REG_18-09-2026-C48_(Cl 143 ##9-55)_APTO-912',
  CONTADOR: 'MAX_SEQ_C',
  CONTADOR_ANTES: 48,
  CONTADOR_DESPUES: 47
};

function revisarLimpiezaTN846551() {
  limpiarRegistroTN846551_(false);
}

function limpiarRegistroTN846551_CONFIRMADO() {
  limpiarRegistroTN846551_(true);
}

function limpiarRegistroTN846551_(borrar) {
  var C = LIMPIEZA_TN846551;
  var log = [borrar ? '🧹 LIMPIEZA REAL' : '🔎 SIMULACIÓN (no se borra nada)'];

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(C.HOJA);
    var datos = sheet.getDataRange().getValues();
    var h = datos[0];
    var colId = h.indexOf('ID DE REGISTRO');
    var colDir = h.indexOf('Ingrese la Dirección del inmueble');
    var colCdr = h.indexOf('CODIGO DE REGISTRO');
    if (colId === -1 || colDir === -1 || colCdr === -1) throw new Error('Faltan columnas por nombre.');

    // 1. Localizar filas por ID y verificar que de verdad son las de la dirección mala.
    var filas = [];
    for (var i = 1; i < datos.length; i++) {
      var id = String(datos[i][colId]).trim();
      if (C.IDS.indexOf(id) === -1) continue;
      if (String(datos[i][colDir]).trim() !== C.DIRECCION) {
        throw new Error('La fila ' + (i + 1) + ' (' + id + ') no tiene la dirección esperada. Abortado sin tocar nada.');
      }
      filas.push(i + 1);
      log.push('📄 Fila ' + (i + 1) + ' → ' + id + ' | ' + datos[i][colCdr]);
    }
    if (filas.length === 0) log.push('   (no hay filas: quizá ya se limpiaron)');

    // 2. Carpeta REG (verificada por ID Y por nombre exacto).
    var carpeta = null;
    try {
      carpeta = DriveApp.getFolderById(C.CARPETA_REG_ID);
      if (carpeta.isTrashed()) { log.push('📁 Carpeta REG ya estaba en la papelera.'); carpeta = null; }
      else if (carpeta.getName() !== C.CARPETA_REG_NOMBRE) {
        throw new Error('La carpeta ' + C.CARPETA_REG_ID + ' se llama "' + carpeta.getName() + '", no la esperada. Abortado.');
      } else {
        log.push('📁 Carpeta a la papelera: ' + carpeta.getName() + ' (con todo su contenido)');
      }
    } catch (eDrive) {
      if (String(eDrive.message).indexOf('Abortado') !== -1) throw eDrive;
      log.push('📁 Carpeta REG no accesible: ' + eDrive.message);
    }

    // 3. Memoria del script ligada a estos IDs.
    var props = PropertiesService.getScriptProperties();
    var todas = props.getProperties();
    var clavesMemoria = Object.keys(todas).filter(function (k) {
      return C.IDS_MEMORIA.some(function (id) { return k.indexOf(id) !== -1; });
    });
    log.push('🧠 Memoria a borrar: ' + (clavesMemoria.length ? clavesMemoria.join(', ') : '(ninguna)'));

    // 4. Contador: solo se baja si está exactamente en el valor esperado y, sin
    //    estas filas, ningún otro registro usa ya ese número.
    var contadorActual = parseInt(props.getProperty(C.CONTADOR) || '0', 10);
    var maxEnHoja = 0;
    for (var j = 1; j < datos.length; j++) {
      if (filas.indexOf(j + 1) !== -1) continue;
      var m = String(datos[j][colCdr]).match(/REG_\d{2}-\d{2}-\d{4}-C(\d+)/);
      if (m) maxEnHoja = Math.max(maxEnHoja, parseInt(m[1], 10));
    }
    var bajarContador = contadorActual === C.CONTADOR_ANTES && maxEnHoja <= C.CONTADOR_DESPUES;
    log.push('🔢 ' + C.CONTADOR + ': ' + contadorActual + ' (máximo C en la hoja sin estas filas: ' + maxEnHoja + ') → ' +
      (bajarContador ? 'se baja a ' + C.CONTADOR_DESPUES : 'NO se toca'));

    if (borrar) {
      if (carpeta) carpeta.setTrashed(true);
      clavesMemoria.forEach(function (k) { props.deleteProperty(k); });
      filas.sort(function (a, b) { return b - a; }).forEach(function (f) { sheet.deleteRow(f); });
      if (bajarContador) props.setProperty(C.CONTADOR, String(C.CONTADOR_DESPUES));
      SpreadsheetApp.flush();
      log.push('✅ Listo. El próximo registro de corretaje saldrá como C' + (bajarContador ? C.CONTADOR_DESPUES + 1 : contadorActual + 1) + '.');
    }
  } finally {
    lock.releaseLock();
  }
  Logger.log(log.join('\n'));
  return log;
}

// ==========================================
// RESTOS DEL REINTENTO (registro nuevo YX454035)
// La primera ejecución de la Parte 2 murió por tiempo (9:51) y el reintento
// (9:55) corrió con la versión anterior al arreglo: dejó una segunda carpeta
// REG-C48 a medio copiar y las 2 actas de la primera ejecución sueltas.
//
//   1. revisarRestosYX454035()            → SOLO muestra.
//   2. limpiarRestosYX454035_CONFIRMADO() → manda a la papelera.
//
// Se conserva SIEMPRE lo que enlaza la hoja (carpeta y actas vigentes).
// ==========================================

var RESTOS_YX454035 = {
  ID: 'YX454035',
  CARPETA_HUERFANA_ID: '1g1NoilAlSMAd6L-RWJhCvhMUCJcD1QZA',
  NOMBRE_REG: 'REG_18-09-2026-C48_(Cl 143 #9-55)_APTO-912',
  ACTAS: ['Acta de acuerdo para promoción de inmueble en arriendo de CIENCUADRAS',
          'Acta de autorización de ingreso al inmueble de CIENCUADRAS'],
  // Ventana de la primera ejecución (9:45 - 9:47 del 18-09-2026, hora Colombia)
  DESDE: new Date('2026-09-18T14:45:00Z'),
  HASTA: new Date('2026-09-18T14:47:00Z')
};

function revisarRestosYX454035() { limpiarRestosYX454035_(false); }
function limpiarRestosYX454035_CONFIRMADO() { limpiarRestosYX454035_(true); }

function limpiarRestosYX454035_(borrar) {
  var R = RESTOS_YX454035;
  var log = [borrar ? '🧹 LIMPIEZA REAL' : '🔎 SIMULACIÓN (no se borra nada)'];
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  var fila = buscarFilaPorIdRegistro(sheet, R.ID);
  if (fila < 2) throw new Error('No encontré la fila de ' + R.ID + '. Abortado.');

  // Lo vigente según la hoja (nunca se toca).
  var formulaReg = sheet.getRange(fila, getColumnByName(sheet, 'LINK DE CARPETA REG')).getFormula();
  var mReg = formulaReg.match(/folders\/([a-zA-Z0-9_-]+)/);
  var regVigente = mReg ? mReg[1] : '';
  var actasVigentes = ['Merged Doc ID - CORRETAJE', 'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE'].map(function (c) {
    return String(sheet.getRange(fila, getColumnByName(sheet, c)).getValue() || '').trim();
  });
  log.push('✅ Se conserva REG vigente: ' + regVigente);
  log.push('✅ Se conservan actas vigentes: ' + actasVigentes.join(', '));
  if (!regVigente || regVigente === R.CARPETA_HUERFANA_ID) throw new Error('La hoja apunta a la carpeta huérfana. Abortado.');

  // 1. Carpeta huérfana: verificada por ID, nombre y que no sea la vigente.
  var aBorrar = [];
  try {
    var c = DriveApp.getFolderById(R.CARPETA_HUERFANA_ID);
    if (c.isTrashed()) log.push('📁 La carpeta huérfana ya estaba en la papelera.');
    else if (c.getName() !== R.NOMBRE_REG) throw new Error('La carpeta huérfana se llama "' + c.getName() + '". Abortado.');
    else { aBorrar.push(c); log.push('📁 Carpeta huérfana (a medio copiar): ' + c.getName() + ' [' + c.getId() + ']'); }
  } catch (e) {
    if (String(e.message).indexOf('Abortado') !== -1) throw e;
    log.push('📁 Carpeta huérfana no accesible: ' + e.message);
  }

  // 2. Actas de la primera ejecución: nombre exacto + creadas en su ventana + no vigentes.
  R.ACTAS.forEach(function (nombre) {
    var it = DriveApp.getFilesByName(nombre);
    while (it.hasNext()) {
      var f = it.next();
      if (f.isTrashed() || actasVigentes.indexOf(f.getId()) !== -1) continue;
      var creado = f.getDateCreated();
      if (creado < R.DESDE || creado > R.HASTA) continue;
      aBorrar.push(f);
      log.push('📄 Acta huérfana: ' + nombre + ' [' + f.getId() + '] creada ' + creado);
    }
  });

  if (borrar) {
    aBorrar.forEach(function (x) { x.setTrashed(true); });
    log.push('✅ ' + aBorrar.length + ' elemento(s) a la papelera.');
  } else {
    log.push('→ ' + aBorrar.length + ' elemento(s) irían a la papelera.');
  }
  Logger.log(log.join('\n'));
  return log;
}
