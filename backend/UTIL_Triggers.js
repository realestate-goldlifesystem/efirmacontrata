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
