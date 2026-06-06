function debugID() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  const targetId = 'GA066736';
  const idCol = headers.indexOf('ID DE REGISTRO');
  const cdrCol = headers.indexOf('CODIGO DE REGISTRO');
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row[idCol] === targetId || row[cdrCol] === targetId) {
      const rowData = {};
      for (let j = 0; j < headers.length; j++) {
        rowData[headers[j]] = row[j];
      }
      Logger.log(JSON.stringify(rowData, null, 2));
      return JSON.stringify(rowData);
    }
  }
  Logger.log('ID not found');
  return 'ID not found';
}
