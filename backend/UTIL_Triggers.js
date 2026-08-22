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
    if (key.indexOf('PAGO_APROBADO_') === 0 || key.indexOf('PENDING_REGISTRATION_ROW_') === 0) {
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
  // Cada cuánto vuelve a mirar el watchdog MIENTRAS haya trabajo en cola.
  // No es un cron: si la cola queda vacía, el watchdog no se reprograma y muere.
  INTERVALO_MS: 10 * 60 * 1000 // 10 minutos
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
    if (key.indexOf('PENDING_REGISTRATION_ROW_') === 0) pendientes.fase1++;
    else if (key.indexOf('PROCESO_PARTE2_') === 0) pendientes.parte2++;
    else if (key.indexOf('PROCESO_PARTE3_') === 0) pendientes.parte3++;
  }

  var totalPendiente = pendientes.fase1 + pendientes.parte2 + pendientes.parte3;

  // Cola vacía -> apagarse. No se reprograma: nada que vigilar.
  if (totalPendiente === 0) {
    Logger.log('✅ Watchdog: cola vacía, no hay nada que vigilar. Se apaga (no se reprograma).');
    return;
  }

  var revividos = [];

  if (pendientes.fase1 > 0 && contarTriggersDe('procesarRegistrosPendientes') === 0) {
    if (asegurarTriggerWorker('procesarRegistrosPendientes', 1000)) revividos.push('Fase 1 (' + pendientes.fase1 + ')');
  }
  if (pendientes.parte2 > 0 && contarTriggersDe('continuarRegistroInmuebleParte2') === 0) {
    if (asegurarTriggerWorker('continuarRegistroInmuebleParte2', 1000)) revividos.push('Parte 2 (' + pendientes.parte2 + ')');
  }
  if (pendientes.parte3 > 0 && contarTriggersDe('continuarRegistroInmuebleParte3') === 0) {
    if (asegurarTriggerWorker('continuarRegistroInmuebleParte3', 1000)) revividos.push('Parte 3 (' + pendientes.parte3 + ')');
  }

  if (revividos.length > 0) {
    Logger.log('🚑 Watchdog: cola atascada, se revivió -> ' + revividos.join(', '));
  } else {
    Logger.log('👀 Watchdog: hay trabajo en curso y sus workers están vivos (F1:' +
      pendientes.fase1 + ' P2:' + pendientes.parte2 + ' P3:' + pendientes.parte3 + '). Nada que revivir.');
  }

  // Sigue habiendo trabajo -> volver a mirar. Solo mientras la cola no esté vacía.
  armarWatchdogCola(CONFIG_WATCHDOG.INTERVALO_MS);
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
    if (key.indexOf('PENDING_REGISTRATION_ROW_') === 0 ||
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
