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

function recuperarPagosPerdidos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PAGOS_RECIBIDOS');
  
  if (!sheet) {
    Logger.log('Error: La pestaña PAGOS_RECIBIDOS no existe. Ejecuta crearPestanaPagos() primero.');
    return;
  }
  
  const MP_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN');
  if (!MP_ACCESS_TOKEN) {
    Logger.log('Error: No se encontró el Access Token de Mercado Pago.');
    return;
  }
  
  // Buscar los últimos pagos en Mercado Pago
  const url = 'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc';
  const options = {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + MP_ACCESS_TOKEN
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    
    if (json.results && json.results.length > 0) {
      // Obtener los IDs que ya tenemos anotados para no duplicar
      const dataRange = sheet.getDataRange().getValues();
      const idsExistentes = dataRange.map(row => String(row[1])); // Columna B: ID Mercado Pago
      
      let agregados = 0;
      
      // Recorrer los pagos desde el más antiguo al más reciente
      const pagos = json.results.reverse();
      
      pagos.forEach(pago => {
        const paymentId = String(pago.id);
        const estado = pago.status;
        const cdr = pago.external_reference;
        
        // Si el pago está aprobado, tiene CDR y no está en la hoja
        if (estado === 'approved' && cdr && !idsExistentes.includes(paymentId)) {
          // Escribir en la hoja
          sheet.appendRow([
            pago.date_approved || pago.date_created, 
            paymentId, 
            cdr, 
            pago.transaction_amount, 
            'APROBADO', 
            JSON.stringify(pago)
          ]);
          
          // Re-guardar en la caja fuerte del servidor por si acaso
          PropertiesService.getScriptProperties().setProperty('PAGO_APROBADO_' + cdr, 'true');
          
          agregados++;
        }
      });
      
      Logger.log('¡Sincronización completada! Se recuperaron ' + agregados + ' pagos aprobados.');
    } else {
      Logger.log('No se encontraron pagos en la cuenta de Mercado Pago.');
    }
  } catch (e) {
    Logger.log('Error conectando con Mercado Pago: ' + e.toString());
  }
}
