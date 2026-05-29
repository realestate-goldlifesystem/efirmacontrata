// ==========================================
// API HELPER - REMOTE EXECUTION
// Funciones para ser ejecutadas desde local vía 'clasp run' O Web App
// ==========================================

const API_SECRET = 'GoldLifeRemote2024'; // Token simple para seguridad

function handleRemoteExecution(e) {
    try {
        const func = e.parameter.func;
        let data = null;

        if (func === 'getSheetNames') {
            data = getSheetNames();
        } else if (func === 'testInquilinos') {
            data = obtenerRegistrosInquilinos();
        } else if (func === 'readRange') {
            const rangeConfig = {
                sheet: e.parameter.sheet,
                range: e.parameter.range
            };
            data = readRange(rangeConfig);
        } else {
            data = { message: 'Función no soportada', func: func };
        }

        return ContentService.createTextOutput(JSON.stringify({
            status: 'ok',
            user: Session.getActiveUser().getEmail(),
            timestamp: new Date().toString(),
            data: data
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: err.message
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function testConnection() {
    console.log('✅ Conexión exitosa desde local -> Apps Script -> Sheet');
    return 'Conexión OK: ' + Session.getActiveUser().getEmail();
}

function getSheetNames() {
    var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    return sheets.map(function (s) { return { name: s.getName(), id: s.getSheetId() }; });
}

function readRange(rangeConfig) {
    // rangeConfig = { sheet: 'Nombre', range: 'A1:B2' }
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(rangeConfig.sheet);
    if (!sheet) return { error: 'Hoja no encontrada: ' + rangeConfig.sheet };
    return { values: sheet.getRange(rangeConfig.range).getValues() };
}

function writeRange(writeConfig) {
    // writeConfig = { sheet: 'Nombre', range: 'A1', values: [['a','b']] }
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(writeConfig.sheet);
    if (!sheet) return { error: 'Hoja no encontrada: ' + writeConfig.sheet };

    var range = sheet.getRange(writeConfig.range);
    // Verificar dimensiones
    var rows = writeConfig.values.length;
    var cols = writeConfig.values[0].length;
    if (rows === 0) return { status: 'empty' };

    sheet.getRange(range.getRow(), range.getColumn(), rows, cols).setValues(writeConfig.values);
    return { status: 'ok', written: rows + 'x' + cols };
}

function debugAutoRename() {
    console.log('🐞 Iniciando Debug Remoto de AutoRename...');
    try {
        autoRenameDNGtoJPG();
        return 'Ejecución completada. Revisa los logs en Stackdriver.';
    } catch (e) {
        return 'Error: ' + e.message;
    }
}
