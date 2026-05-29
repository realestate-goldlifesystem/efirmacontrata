function debugToSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  try {
    const registros = obtenerRegistrosInquilinos();
    sheet.getRange(1, 30).setValue(JSON.stringify(registros));
    return 'OK: ' + registros.length;
  } catch (e) {
    sheet.getRange(1, 30).setValue('ERROR: ' + e.message);
    return 'ERROR: ' + e.message;
  }
}
