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
 */
function instalarTriggerAutoRename() {
    desinstalarTriggerAutoRename(); // Limpieza previa

    ScriptApp.newTrigger('autoRenameDNGtoJPG')
        .timeBased()
        .everyMinutes(1)
        .create();

    SpreadsheetApp.getUi().alert('✅ AutoRename activado: Se ejecutará cada 1 minuto (Casi en tiempo real).');
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
