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

    console.log('âœ… Activadores instalados correctamente.');
    SpreadsheetApp.getUi().alert('Activadores instalados correctamente.');
}

/**
 * Instala el trigger para AutoRename DNG -> JPG
 */
function instalarTriggerAutoRename() {
    desinstalarTriggerAutoRename(); // Limpieza previa

    ScriptApp.newTrigger('autoRenameDNGtoJPG')
        .timeBased()
        .everyMinutes(1)
        .create();

    SpreadsheetApp.getUi().alert('âœ… AutoRename activado: Se ejecutarÃ¡ cada 1 minuto (Casi en tiempo real).');
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
        SpreadsheetApp.getUi().alert('ðŸ›‘ AutoRename desactivado.');
    } else {
        // Si no habÃ­a triggers, no molestamos al usuario a menos que lo llame explÃ­citamente
        console.log('No se encontraron triggers de AutoRename para borrar.');
    }
}

/**
 * Instala el Cron Job Diario para actualizar bancos en cachÃ©
 */
function instalarTriggerCacheBancos() {
    const fnName = 'cronJobActualizarBancos';
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
        if (t.getHandlerFunction() === fnName) ScriptApp.deleteTrigger(t);
    });

    // Se ejecutarÃ¡ todos los dÃ­as a las 3:00 AM (Aprox)
    ScriptApp.newTrigger(fnName)
        .timeBased()
        .everyDays(1)
        .atHour(3)
        .create();

    SpreadsheetApp.getUi().alert('âœ… Cron Trigger de Bancos activado (EjecuciÃ³n Diaria 3:00 AM).');
}

/**
 * Este es el "Robot" que se ejecuta oculto cada dÃ­a.
 * Descarga de la API y lo salva en PropertiesService para velocidad luz.
 */
function cronJobActualizarBancos() {
    try {
        const URL_API_BANCOS = 'https://ejemplo.com/api/bancos-colombia'; // Reemplazar con endpoint Wompi/PayZen
        
        // --- SIMULACIÃ“N SI NO HAY API OFICIAL CONFIGURADA AUN ---
        // (AquÃ­ harÃ­as const res = UrlFetchApp.fetch(URL_API_BANCOS); const bancosApi = JSON.parse(res.getContentText());)
        
        // SimulaciÃ³n: La API retornÃ³ una lista fresca que incluye "Banco Nuevo Colombia"
        const bancosSimuladosDesdeAPI = [
            { nombre: "Bancolombia" },
            { nombre: "Nequi" },
            { nombre: "Daviplata" },
            { nombre: "Banco Davivienda" },
            { nombre: "Banco de BogotÃ¡" },
            { nombre: "BBVA Colombia" },
            { nombre: "ItaÃº" },
            { nombre: "Lulo Bank" },
            { nombre: "RappiPay" },
            { nombre: "Banco Falabella" },
            { nombre: "Mibanco" },
            { nombre: "Banco Nuevo Colombia (Test API)" } // <-- Dato Nuevo
        ];
        
        const jsonBancos = JSON.stringify(bancosSimuladosDesdeAPI);
        
        // GUARDAMOS EN MEMORIA ULTRA-RAPIDA (CachÃ© duradera)
        PropertiesService.getScriptProperties().setProperty('CACHE_BANCOS_COLOMBIA', jsonBancos);
        Logger.log('âœ… CronJob: Bancos actualizados con Ã©xito a las 3:00 AM');
        
    } catch (e) {
        Logger.log('âŒ Error en CronJob Bancos: ' + e.message);
    }
}

/**
 * Lee la cachÃ© instantÃ¡nea desde el Frontend
 * @returns {Array} Lista de Bancos (o null si estÃ¡ vacÃ­o)
 */
function obtenerBancosDesdeCachÃ©() {
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
 * FunciÃ³n de rescate para forzar la autorizaciÃ³n de YouTube y reinstalar triggers
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

    // Se ejecutará cada minuto (PRUEBAS)
    ScriptApp.newTrigger(fnName)
        .timeBased()
        .everyMinutes(1)
        .create();

    SpreadsheetApp.getUi().alert('✅ Cron Trigger de Reembolsos activado (Ejecución PRUEBA 1 MINUTO).');
}
