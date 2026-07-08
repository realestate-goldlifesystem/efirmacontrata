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
