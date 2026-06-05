function debug_estados() {
  const cdr = "REG_28-05-2026-C43_Cra_8_170-92_TORRE-9_APTO-702"; // Yo supongo que es algo asi
  
  // Imprimir todas las filas de LOG_APROBACIONES_CONTRATO
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LOG_APROBACIONES_CONTRATO');
  const data = sheet.getDataRange().getValues();
  
  let output = [];
  for (let i = 0; i < data.length; i++) {
    output.push(`Fila ${i}: [${data[i][0]}] [${data[i][1]}] [${data[i][2]}]`);
  }
  
  console.log(output.join('\n'));
  return output;
}
