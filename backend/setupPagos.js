function crearPestanaPagos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('PAGOS_RECIBIDOS');
  
  if (sheet) {
    Logger.log('¡La caja fuerte PAGOS_RECIBIDOS ya existe!');
    return;
  }
  
  // 1. Crear la pestaña
  sheet = ss.insertSheet('PAGOS_RECIBIDOS');
  
  // 2. Colocar los encabezados
  const headers = ['Fecha de Pago', 'ID Mercado Pago', 'CDR (Código Registro)', 'Monto Pagado', 'Estado', 'Data Bruta'];
  sheet.appendRow(headers);
  
  // 3. Ponerle un estilo bonito (Negrita y fondo dorado)
  sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#d4af37").setFontColor("#000000");
  
  // 4. Ocultarla para que sea la caja fuerte secreta
  sheet.hideSheet();
  
  Logger.log('¡Caja fuerte PAGOS_RECIBIDOS creada, configurada y ocultada con éxito!');
}
