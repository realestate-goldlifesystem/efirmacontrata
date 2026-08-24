// ==========================================
// UTILIDAD DE TRIGGERS
// ==========================================

function instalarActivadores() {
    const ss = SpreadsheetApp.getActive();

    // Limpiar triggers existentes para evitar duplicados
    const triggers = ScriptApp.getUserTriggers(ss);
    triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'onEditEstados' ||
            trigger.getHandlerFunction() === 'onFormSubmitInmueble') {
            ScriptApp.deleteTrigger(trigger);
        }
    });

    // 1. Trigger para GESTOR DE ESTADOS (Al editar celdas)
    ScriptApp.newTrigger('onEditEstados')
        .forSpreadsheet(ss)
        .onEdit()
        .create();

    // 2. Trigger para REGISTRO DE INMUEBLE (Al enviar formulario) - REQUERIDO
    ScriptApp.newTrigger('onFormSubmitInmueble')
        .forSpreadsheet(ss)
        .onFormSubmit()
        .create();

    console.log('✅ Activadores instalados correctamente.');
    SpreadsheetApp.getUi().alert('Activadores instalados correctamente.');
}

/**
 * Instala el trigger para AutoRename DNG -> JPG
 * [DEPRECADO] - Ahora se renombra síncronamente al finalizar la carga multimedia.
 * Ejecute esta función para LIMPIAR triggers huérfanos del pasado.
 */
function instalarTriggerAutoRename() {
    desinstalarTriggerAutoRename(); // Limpieza previa

    SpreadsheetApp.getUi().alert('✅ Triggers de AutoRename eliminados. Ahora el renombrado es instantáneo al subir las fotos.');
}

/**
 * Desinstala el trigger para AutoRename DNG -> JPG
 */
function desinstalarTriggerAutoRename() {
    const triggers = ScriptApp.getProjectTriggers();
    let count = 0;

    triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'autoRenameDNGtoJPG') {
            ScriptApp.deleteTrigger(trigger);
            count++;
        }
    });

    if (count > 0) {
        SpreadsheetApp.getUi().alert('🛑 AutoRename desactivado.');
    } else {
        // Si no había triggers, no molestamos al usuario a menos que lo llame explícitamente
        console.log('No se encontraron triggers de AutoRename para borrar.');
    }
}

/**
 * Instala el Cron Job Diario para actualizar bancos en caché
 */
function instalarTriggerCacheBancos() {
    const fnName = 'cronJobActualizarBancos';
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
        if (t.getHandlerFunction() === fnName) ScriptApp.deleteTrigger(t);
    });

    // Se ejecutará todos los días a las 3:00 AM (Aprox)
    ScriptApp.newTrigger(fnName)
        .timeBased()
        .everyDays(1)
        .atHour(3)
        .create();

    SpreadsheetApp.getUi().alert('✅ Cron Trigger de Bancos activado (Ejecución Diaria 3:00 AM).');
}

/**
 * Este es el "Robot" que se ejecuta oculto cada día.
 * Descarga de la API y lo salva en PropertiesService para velocidad luz.
 */
function cronJobActualizarBancos() {
    try {
        const URL_API_BANCOS = 'https://ejemplo.com/api/bancos-colombia'; // Reemplazar con endpoint Wompi/PayZen
        
        // --- SIMULACIÓN SI NO HAY API OFICIAL CONFIGURADA AUN ---
        // (Aquí harías const res = UrlFetchApp.fetch(URL_API_BANCOS); const bancosApi = JSON.parse(res.getContentText());)
        
        // Simulación: La API retornó una lista fresca que incluye "Banco Nuevo Colombia"
        const bancosSimuladosDesdeAPI = [
            { nombre: "Bancolombia" },
            { nombre: "Nequi" },
            { nombre: "Daviplata" },
            { nombre: "Banco Davivienda" },
            { nombre: "Banco de Bogotá" },
            { nombre: "BBVA Colombia" },
            { nombre: "Itaú" },
            { nombre: "Lulo Bank" },
            { nombre: "RappiPay" },
            { nombre: "Banco Falabella" },
            { nombre: "Mibanco" },
            { nombre: "Banco Nuevo Colombia (Test API)" } // <-- Dato Nuevo
        ];
        
        const jsonBancos = JSON.stringify(bancosSimuladosDesdeAPI);
        
        // GUARDAMOS EN MEMORIA ULTRA-RAPIDA (Caché duradera)
        PropertiesService.getScriptProperties().setProperty('CACHE_BANCOS_COLOMBIA', jsonBancos);
        Logger.log('✅ CronJob: Bancos actualizados con éxito a las 3:00 AM');
        
    } catch (e) {
        Logger.log('❌ Error en CronJob Bancos: ' + e.message);
    }
}

/**
 * Lee la caché instantánea desde el Frontend
 * @returns {Array} Lista de Bancos (o null si está vacío)
 */
function obtenerBancosDesdeCaché() {
    try {
        const str = PropertiesService.getScriptProperties().getProperty('CACHE_BANCOS_COLOMBIA');
        if (str) {
            return JSON.parse(str);
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Función de rescate para forzar la autorización de YouTube y reinstalar triggers
 */
function repararPermisos() {
    try {
        // Llamada dummy a YouTube para forzar la ventana de permisos
        YouTube.Videos.list('snippet', {id: 'dQw4w9WgXcQ'});
    } catch(e) {
        // Ignoramos el error si el ID no existe, solo queremos el popup de Google
    }
    
    // Reinstalamos los triggers para que queden con los permisos nuevos
    instalarActivadores();
}

/**
 * Instala el Cron Job para reembolsos de Mercado Pago
 */
function instalarTriggerReembolsosMP() {
    const fnName = 'auditorDeContratosVencidos';
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
        if (t.getHandlerFunction() === fnName) ScriptApp.deleteTrigger(t);
    });

    // Se ejecutará cada 1 minuto
    ScriptApp.newTrigger(fnName)
        .timeBased()
        .everyMinutes(1)
        .create();

    SpreadsheetApp.getUi().alert('✅ Cron Trigger de Reembolsos activado (Ejecución optimizada cada 1 MINUTO).');
}

/**
 * Utilidad para limpiar propiedades obsoletas de ScriptProperties y liberar almacenamiento (500KB límite)
 */
function limpiarScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  let keysDeleted = 0;

  for (const key in allProps) {
    // Borrar de forma segura registros de cola antiguos que no sean secuencias históricas o configuraciones críticas
    if (key.indexOf('PAGO_APROBADO_') === 0 || key.indexOf('PENDING_REGISTRATION_') === 0) {
      props.deleteProperty(key);
      keysDeleted++;
    }
  }

  Logger.log(`🧹 Limpieza finalizada: Se eliminaron ${keysDeleted} propiedades obsoletas de la memoria.`);
  if (typeof SpreadsheetApp !== 'undefined') {
    SpreadsheetApp.getUi().alert(`🧹 Limpieza completa: Se eliminaron ${keysDeleted} claves obsoletas del ScriptProperties.`);
  }
}

function limpiarTriggersHuerfanos() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  triggers.forEach(function(t) {
    var f = t.getHandlerFunction();
    if (f === 'continuarRegistroInmuebleParte2' || f === 'continuarRegistroInmuebleParte3') {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  });
  if (typeof SpreadsheetApp !== 'undefined') SpreadsheetApp.getUi().alert('🧹 Se limpiaron ' + count + ' activadores atascados.');
  console.log('🧹 Se limpiaron ' + count + ' activadores atascados.');
}

/**
 * Instala el Cron Job para el Agente de Voz Andrea: revisa BUZÓN -> VOLVER A LLAMAR.
 * Solo debe ejecutarse una vez desde el editor.
 */
function instalarTriggerRevisarBuzon() {
  const fnName = 'revisarBuzonAndrea';
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === fnName) ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger(fnName)
    .timeBased()
    .everyMinutes(5)
    .create();

  SpreadsheetApp.getUi().alert('✅ Cron Trigger de BUZÓN activado (revisión cada 5 minutos).');
}

/**
 * Pasa toda fila que esté en BUZÓN a VOLVER A LLAMAR, en las dos pestañas de
 * captación del Agente de Voz Andrea. No deja mensaje en el buzón -- ese
 * cuelgue ya lo hace el servicio de Cloud Run al detectar el contestador.
 *
 * La columna ESTADO DE LLAMADA es la H en las dos pestañas (mismo layout de
 * 19 columnas, ver Robot Captador Fincaraiz/agente_voz_guion.md sección 2).
 */
function revisarBuzonAndrea() {
  const PESTANAS_ANDREA = ['1 - CAPTACIONES V', '1 - CAPTACIONES A'];
  const COL_ESTADO_LLAMADA = 8; // Columna H

  PESTANAS_ANDREA.forEach(nombrePestana => {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombrePestana);
      if (!sheet) return;

      const ultimaFila = sheet.getLastRow();
      if (ultimaFila < 2) return;

      const rango = sheet.getRange(2, COL_ESTADO_LLAMADA, ultimaFila - 1, 1);
      const valores = rango.getValues();
      let cambios = 0;

      for (let i = 0; i < valores.length; i++) {
        if (valores[i][0] === 'BUZÓN') {
          valores[i][0] = 'VOLVER A LLAMAR';
          cambios++;
        }
      }

      if (cambios > 0) {
        rango.setValues(valores);
        Logger.log(`✅ revisarBuzonAndrea: ${cambios} fila(s) actualizadas en '${nombrePestana}'.`);
      }
    } catch (e) {
      Logger.log(`❌ Error en revisarBuzonAndrea para '${nombrePestana}': ${e.message}`);
    }
  });
}

/**
 * Instala el Cron Job Semanal para sincronizar las tasas desde la SFC
 */
function instalarTriggerSincroTasasSFC() {
    const fnName = 'sincroTasasSFC';
    const triggers = ScriptApp.getProjectTriggers();
    
    // Limpiar si ya existía para evitar duplicados
    triggers.forEach(t => {
        if (t.getHandlerFunction() === fnName) ScriptApp.deleteTrigger(t);
    });

    // Se ejecutará cada semana (Los lunes a las 2 AM aprox)
    ScriptApp.newTrigger(fnName)
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(2)
        .create();

    SpreadsheetApp.getUi().alert('✅ Cron Trigger de SFC activado (Ejecución Semanal: Lunes 2:00 AM).');
}

// ==========================================
// SALUD DE LA COLA DE REGISTROS (P3)
// ==========================================

var CONFIG_WATCHDOG = {
  // Ritmo normal: la cola está encogiendo, no hay por qué molestar.
  // No es un cron: si la cola queda vacía, el watchdog no se reprograma y muere.
  INTERVALO_MS: 10 * 60 * 1000,        // 10 minutos

  // Ritmo de vigilancia: la cola no se movió desde el último chequeo.
  INTERVALO_SOSPECHA_MS: 2 * 60 * 1000, // 2 minutos

  // Cuántos chequeos seguidos sin avance antes de dar por atascada la cola.
  // No puede ser 1: un registro tarda 2-4 min, así que en un chequeo corto la
  // cola legítimamente no habrá encogido aunque todo vaya bien. Con 2 se distingue
  // "va lento" de "está trabado".
  CHEQUEOS_SIN_PROGRESO_PARA_ACTUAR: 2,

  PROP_ESTADO: 'WATCHDOG_ESTADO_COLA'
};

/**
 * Cuenta cuántos triggers vivos hay para una función dada.
 */
function contarTriggersDe(fnName) {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === fnName) n++;
  });
  return n;
}

/**
 * Garantiza que exista UN trigger pendiente para el worker indicado, sin duplicar
 * ni reventar el límite de 20 triggers por proyecto de Apps Script.
 *
 * Reemplaza los `ScriptApp.newTrigger(...).create()` sueltos: si ya hay uno
 * encolado no crea otro, y si el proyecto está cerca del tope no crea nada
 * (el watchdog lo recogerá después).
 *
 * @return {boolean} true si al terminar hay al menos un trigger vivo para fnName.
 */
function asegurarTriggerWorker(fnName, delayMs) {
  try {
    var propios = 0;
    var total = 0;
    ScriptApp.getProjectTriggers().forEach(function(t) {
      total++;
      if (t.getHandlerFunction() === fnName) propios++;
    });

    if (propios > 0) return true; // ya hay uno en camino

    if (total >= 19) {
      Logger.log('⚠️ asegurarTriggerWorker: proyecto al límite de triggers (' + total + '). No se creó "' + fnName + '".');
      return false;
    }

    ScriptApp.newTrigger(fnName).timeBased().after(delayMs || 1000).create();
    Logger.log('⏱️ Trigger programado para "' + fnName + '".');
    return true;
  } catch (e) {
    Logger.log('⚠️ asegurarTriggerWorker("' + fnName + '") falló: ' + e.message);
    return false;
  }
}

/**
 * WATCHDOG de la cola de registros. Pensado para correr cada 10 minutos.
 *
 * Revive la cadena si quedó trabajo encolado sin ningún trigger vivo que lo
 * atienda. Eso pasa cuando un worker no consigue el LockService, cuando se
 * agotó el tiempo de ejecución, o cuando alguien corrió limpiarTriggersHuerfanos()
 * con la cola a medias.
 *
 * Es la versión automática del botón manual limpiarTriggersHuerfanos().
 */
function watchdogColaRegistros() {
  // Borra su propio trigger al entrar (mismo patrón que Parte 2 y Parte 3).
  // Si al final queda trabajo pendiente, se vuelve a programar; si no, muere aquí.
  eliminarTriggerActual('watchdogColaRegistros');

  var props = PropertiesService.getScriptProperties().getProperties();

  var pendientes = { fase1: 0, parte2: 0, parte3: 0 };
  for (var key in props) {
    if (key.indexOf('PENDING_REGISTRATION_') === 0) pendientes.fase1++;
    else if (key.indexOf('PROCESO_PARTE2_') === 0) pendientes.parte2++;
    else if (key.indexOf('PROCESO_PARTE3_') === 0) pendientes.parte3++;
  }

  var totalPendiente = pendientes.fase1 + pendientes.parte2 + pendientes.parte3;
  var almacen = PropertiesService.getScriptProperties();

  // Cola vacía -> apagarse. No se reprograma: nada que vigilar.
  if (totalPendiente === 0) {
    almacen.deleteProperty(CONFIG_WATCHDOG.PROP_ESTADO);
    Logger.log('✅ Watchdog: cola vacía, no hay nada que vigilar. Se apaga (no se reprograma).');
    return;
  }

  // ¿La cola encogió desde el último vistazo?
  //
  // Antes se preguntaba "¿existe un trigger para este worker?", y eso resultó
  // insuficiente: un trigger .after() ya gastado sigue apareciendo en la lista, así
  // que el watchdog lo daba por vivo y nunca revivía nada. Medir el AVANCE no se
  // puede engañar con un trigger fantasma.
  var previo = null;
  try { previo = JSON.parse(almacen.getProperty(CONFIG_WATCHDOG.PROP_ESTADO) || 'null'); } catch (e) { previo = null; }

  var primeraVez = !previo || typeof previo.total !== 'number';
  var hayProgreso = primeraVez || (totalPendiente < previo.total);
  var sinProgreso = hayProgreso ? 0 : ((previo.sinProgreso || 0) + 1);
  var atascada = sinProgreso >= CONFIG_WATCHDOG.CHEQUEOS_SIN_PROGRESO_PARA_ACTUAR;

  // forzar=true borra los triggers existentes (que pueden ser fantasmas) y crea uno nuevo.
  var revivir = function (fnName, cuantos, etiqueta, forzar) {
    if (cuantos <= 0) return null;
    if (forzar) {
      eliminarTriggerActual(fnName);
      return asegurarTriggerWorker(fnName, 1000) ? etiqueta + ' (' + cuantos + ', forzado)' : null;
    }
    if (contarTriggersDe(fnName) === 0) {
      return asegurarTriggerWorker(fnName, 1000) ? etiqueta + ' (' + cuantos + ')' : null;
    }
    return null;
  };

  var revividos = [
    revivir('procesarRegistrosPendientes', pendientes.fase1, 'Fase 1', atascada),
    revivir('continuarRegistroInmuebleParte2', pendientes.parte2, 'Parte 2', atascada),
    revivir('continuarRegistroInmuebleParte3', pendientes.parte3, 'Parte 3', atascada)
  ].filter(function (x) { return x; });

  var resumen = 'F1:' + pendientes.fase1 + ' P2:' + pendientes.parte2 + ' P3:' + pendientes.parte3;

  if (atascada) {
    Logger.log('🚑 Watchdog: ' + sinProgreso + ' chequeos sin avance (' + resumen +
      '). Cola ATASCADA -> se recrearon los triggers: ' + (revividos.join(', ') || 'ninguno'));
    sinProgreso = 0; // se le da margen para que el arreglo surta efecto
  } else if (revividos.length > 0) {
    Logger.log('🚑 Watchdog: faltaban workers, se revivió -> ' + revividos.join(', '));
  } else if (hayProgreso) {
    Logger.log('👀 Watchdog: la cola avanza (' + resumen + '). Todo en orden.');
  } else {
    Logger.log('⏳ Watchdog: sin avance desde el último chequeo (' + resumen +
      '), lleva ' + sinProgreso + '. Puede ser lentitud normal; vigilando de cerca.');
  }

  almacen.setProperty(CONFIG_WATCHDOG.PROP_ESTADO, JSON.stringify({
    total: totalPendiente,
    sinProgreso: sinProgreso
  }));

  // Con avance se espacia; sin avance se vigila de cerca.
  //
  // En el PRIMER vistazo no hay con qué comparar. "Sin referencia" no es lo mismo
  // que "va bien": la cola podría llevar rato trabada. Por eso se vuelve pronto a
  // tomar la segunda medición, aunque este chequeo no cuente como falta de avance.
  var proximo = primeraVez
    ? CONFIG_WATCHDOG.INTERVALO_SOSPECHA_MS
    : (hayProgreso ? CONFIG_WATCHDOG.INTERVALO_MS : CONFIG_WATCHDOG.INTERVALO_SOSPECHA_MS);
  armarWatchdogCola(proximo);
}

/**
 * Enciende el watchdog si no está ya encendido.
 *
 * Se llama desde handleRegistrarInmueble al encolar un registro, y desde el
 * propio watchdog mientras quede trabajo. Al vaciarse la cola nadie lo vuelve a
 * llamar y el trigger desaparece solo — no queda un cron corriendo de gratis
 * cada 10 minutos (144 ejecuciones/día contra la cuota) ni ocupando un slot
 * de los 20 triggers disponibles.
 */
function armarWatchdogCola(delayMs) {
  return asegurarTriggerWorker('watchdogColaRegistros', delayMs || CONFIG_WATCHDOG.INTERVALO_MS);
}

/**
 * ⚠️ SOLO PARA PRUEBAS QA. Deja la cola de registros completamente en cero.
 *
 * Vacía TODO lo encolado, mata los triggers de los tres workers (incluidos los
 * "fantasma": .after() ya gastados que siguen listados y engañan a quien pregunte
 * si el worker está vivo) y borra el estado del watchdog.
 *
 * ORDEN OBLIGATORIO: correr esto ANTES de borrar filas de prueba del Sheet.
 * La cola guarda NÚMEROS DE FILA; si se borran filas con trabajo encolado, las de
 * abajo suben una posición y el worker termina procesando el inmueble equivocado.
 *
 * NO toca los contadores de secuencia (MAX_SEQ_*, LAST_RPR_SEQUENCE): eso va
 * aparte en restaurarContadoresQA(), porque tiene sus propios riesgos.
 */
function limpiarColaQA() {
  var props = PropertiesService.getScriptProperties();
  var todas = props.getProperties();
  var borradas = [];

  for (var k in todas) {
    if (k.indexOf('PENDING_REGISTRATION_') === 0 ||
        k.indexOf('PROCESO_PARTE2_') === 0 ||
        k.indexOf('PROCESO_PARTE3_') === 0 ||
        k.indexOf('REUTILIZAR_MULTIMEDIA_') === 0 ||
        k === CONFIG_WATCHDOG.PROP_ESTADO) {
      props.deleteProperty(k);
      borradas.push(k);
    }
  }

  var triggersMuertos = 0;
  ['procesarRegistrosPendientes', 'continuarRegistroInmuebleParte2',
   'continuarRegistroInmuebleParte3', 'watchdogColaRegistros'].forEach(function (fn) {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === fn) { ScriptApp.deleteTrigger(t); triggersMuertos++; }
    });
  });

  var msg = '🧹 Cola QA limpiada: ' + borradas.length + ' entrada(s) encolada(s) y ' +
            triggersMuertos + ' trigger(s) eliminados.\n\n' +
            (borradas.length ? borradas.join('\n') : '(la cola ya estaba vacía)');
  Logger.log(msg);
  if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  }
  return { encoladasBorradas: borradas, triggersMuertos: triggersMuertos };
}

/**
 * ⚠️ SOLO PARA PRUEBAS QA. Manda a la papelera las carpetas y documentos de prueba.
 *
 * Va aquí y no en un script local porque la Service Account NO puede tirar a la
 * papelera archivos que no le pertenecen ("insufficient permissions"): son del dueño
 * del script. Apps Script sí corre con esa identidad.
 *
 * Solo toca lo que lleve el nombre del propietario de prueba en el título, que es
 * literal e inequívoco. NO usa búsquedas difusas.
 */
function borrarDrivePruebasQA() {
  var PROPIETARIO_PRUEBA = 'PRUEBA QA BORRAR';
  var borrados = [];
  var omitidos = 0;

  // searchFiles/searchFolders usan `contains`, que es DIFUSO (tokeniza, ignora
  // puntuación). Sirve para encontrar candidatos, nunca para decidir el borrado:
  // cada resultado se vuelve a verificar contra el nombre literal.
  var query = "title contains '" + PROPIETARIO_PRUEBA + "' and trashed = false";

  var carpetas = DriveApp.searchFolders(query);
  while (carpetas.hasNext()) {
    var c = carpetas.next();
    if (c.getName().indexOf(PROPIETARIO_PRUEBA) === -1) { omitidos++; continue; }
    c.setTrashed(true);
    borrados.push('📁 ' + c.getName());
  }

  var archivos = DriveApp.searchFiles(query);
  while (archivos.hasNext()) {
    var a = archivos.next();
    if (a.getName().indexOf(PROPIETARIO_PRUEBA) === -1) { omitidos++; continue; }
    a.setTrashed(true);
    borrados.push('📄 ' + a.getName());
  }

  var msg = '🗑️ Drive QA: ' + borrados.length + ' elemento(s) a la papelera' +
            (omitidos ? ' (' + omitidos + ' omitidos por no coincidir exacto)' : '') + '.\n\n' +
            (borrados.length ? borrados.join('\n') : '(no había nada que borrar)');
  Logger.log(msg);
  if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  }
  return borrados;
}

/**
 * ⚠️ SOLO PARA PRUEBAS QA. Devuelve los contadores de secuencia a un valor dado.
 *
 * calcularSecuencia() toma el MÁXIMO entre lo que ve en el Sheet y lo que recuerda
 * aquí. Esa memoria existe para que, si se borra una fila, su número no se reutilice.
 * Por eso bajarla a mano SOLO es seguro cuando se acaba de borrar exactamente esas
 * filas y se conoce el valor previo.
 *
 * Correr DESPUÉS de borrar las filas de prueba del Sheet.
 * Si tienes dudas del valor previo, NO uses esto: dejar el contador alto solo produce
 * un hueco en la numeración (inofensivo), mientras que bajarlo de más puede repetir
 * un CDR histórico.
 */
function restaurarContadoresQA() {
  // Valores capturados ANTES de las pruebas del 21-ago-2026.
  var VALORES = { C: 46, A: 8, V: 12, VR: 3 };

  var props = PropertiesService.getScriptProperties();
  var lineas = [];

  for (var tipo in VALORES) {
    var clave = 'MAX_SEQ_' + tipo;
    var antes = props.getProperty(clave);
    props.setProperty(clave, String(VALORES[tipo]));
    lineas.push(clave + ': ' + (antes === null ? '(vacío)' : antes) + ' -> ' + VALORES[tipo]);
  }

  // LAST_RPR_SEQUENCE se BORRA en vez de fijarse: al faltar, getNextRPRSequence()
  // lo recalcula solo desde la columna LINK DE CARPETA RPR del Sheet, que ya
  // quedará sin las filas de prueba. Más seguro que adivinar un número.
  var rprAntes = props.getProperty('LAST_RPR_SEQUENCE');
  props.deleteProperty('LAST_RPR_SEQUENCE');
  lineas.push('LAST_RPR_SEQUENCE: ' + (rprAntes === null ? '(vacío)' : rprAntes) + ' -> se recalculará desde el Sheet');

  var msg = '🔢 Contadores restaurados:\n\n' + lineas.join('\n');
  Logger.log(msg);
  if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  }
  return lineas;
}

/**
 * YA NO HACE FALTA INSTALAR NADA: el watchdog se enciende solo al encolarse un
 * registro y se apaga solo al vaciarse la cola (ver armarWatchdogCola).
 *
 * Esta función queda como utilidad de limpieza para quitar el cron recurrente
 * de 10 minutos si alguna vez se llegó a instalar la versión anterior. Correrla
 * es seguro aunque no exista: si hay trabajo pendiente vuelve a armar el
 * watchdog en su modo bajo demanda.
 */
function limpiarWatchdogRecurrente() {
  var fnName = 'watchdogColaRegistros';
  var borrados = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === fnName) {
      ScriptApp.deleteTrigger(t);
      borrados++;
    }
  });

  // Si quedó trabajo en cola, dejarlo vigilado en el modo nuevo (bajo demanda).
  var props = PropertiesService.getScriptProperties().getProperties();
  var hayTrabajo = false;
  for (var key in props) {
    if (key.indexOf('PENDING_REGISTRATION_') === 0 ||
        key.indexOf('PROCESO_PARTE2_') === 0 ||
        key.indexOf('PROCESO_PARTE3_') === 0) { hayTrabajo = true; break; }
  }
  if (hayTrabajo) armarWatchdogCola(1000);

  var msg = '🧹 Se eliminaron ' + borrados + ' trigger(s) de watchdog. ' +
            (hayTrabajo
              ? 'Había trabajo en cola: se re-armó el watchdog bajo demanda.'
              : 'Cola vacía: el watchdog se encenderá solo cuando entre un registro.');
  Logger.log(msg);
  if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  }
}
