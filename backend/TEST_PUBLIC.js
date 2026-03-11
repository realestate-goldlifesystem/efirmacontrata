function doGetTestPublic(e) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1- REGISTROS PRINCIPALES");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const cdrCol = headers.indexOf('NÚMERO DE RADICADO (CDR)');
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');
    const estadoDocCol = headers.indexOf('ESTADO DOCUMENTAL');

    const lastRows = data.slice(-5).map(row => ({
        cdr: row[cdrCol],
        detalles: row[detallesCol],
        estadoDocumental: row[estadoDocCol]
    }));

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", lastRows }, null, 2)).setMimeType(ContentService.MimeType.JSON);
}

function testEstadoDoc() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1- REGISTROS PRINCIPALES");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const cdrCol = headers.indexOf('NÚMERO DE RADICADO (CDR)');
    const estadoDocCol = headers.indexOf('ESTADO DOCUMENTAL');
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');

    const lastRows = data.slice(-5).map(row => ({
        cdr: row[cdrCol],
        detalles: row[detallesCol],
        estadoDocumental: row[estadoDocCol]
    }));

    Logger.log(JSON.stringify(lastRows, null, 2));
}

function testObtenerDocsCerebro() {
    // Tomar un CDR reciente (necesito buscar uno en el log anterior o usar uno genérico)
    // Para simplificar, obtenemos el primer CDR de la hoja
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1- REGISTROS PRINCIPALES");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const cdrCol = headers.indexOf('NÚMERO DE RADICADO (CDR)');

    // Buscar un registro de hoy (última fila)
    const ultimoCdr = data[data.length - 1][cdrCol];
    Logger.log("Probando con CDR: " + ultimoCdr);

    try {
        const result = obtenerDocumentosDelCDR(ultimoCdr);
        Logger.log("✅ ÉXITO: " + JSON.stringify(result).substring(0, 500) + "...");
    } catch (e) {
        Logger.log("❌ ERROR en obtenerDocumentosDelCDR: " + e.message);
        Logger.log(e.stack);
    }
}
