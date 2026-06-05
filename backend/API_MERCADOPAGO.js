const MP_ACCESS_TOKEN = 'APP_USR-996653389612421-060519-8c8f4b7e9d9eb7d87c56cf2c138ff2d5-1824932605';

function crearPreferenciaPago(datos) {
  try {
    const url = 'https://api.mercadopago.com/checkout/preferences';
    
    // Configurar la preferencia
    const payload = {
      items: [
        {
          title: 'Derechos de Estudio de Perfil - E-FirmaContrata',
          description: 'Estudio para solicitud de arrendamiento',
          quantity: 1,
          currency_id: 'COP',
          unit_price: 60000
        }
      ],
      payer: {
        email: datos.email || 'cliente@ejemplo.com'
      },
      back_urls: {
        success: "https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/formulario-inquilino.html?status=success",
        failure: "https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/formulario-inquilino.html?status=failure",
        pending: "https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/formulario-inquilino.html?status=pending"
      },
      auto_return: "approved",
      external_reference: datos.cdr || 'TEST-CDR'
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200 && response.getResponseCode() !== 201) {
      console.error('Error MP:', json);
      return { success: false, error: json.message || 'Error creando preferencia' };
    }
    
    return { success: true, preferenceId: json.id, init_point: json.init_point };
  } catch (e) {
    console.error('Exception MP:', e);
    return { success: false, error: e.toString() };
  }
}


function handleMercadoPagoWebhook(datos) {
  try {
    if (datos.type === 'payment' || datos.action === 'payment.created' || datos.action === 'payment.updated') {
      const paymentId = datos.data ? datos.data.id : null;
      if (!paymentId) return { success: true };

      const url = 'https://api.mercadopago.com/v1/payments/' + paymentId;
      const options = {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + MP_ACCESS_TOKEN
        },
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const paymentData = JSON.parse(response.getContentText());

      if (paymentData.status === 'approved') {
        const externalReference = paymentData.external_reference; // This is the CDR
        if (externalReference && externalReference.startsWith('RI')) {
          const sheetUrl = 'https://docs.google.com/spreadsheets/d/1B9I3y3E3qI7FwXJ5W-xMhLw2pXWkE1W0w4x1kR0fRj0/edit';
          const ss = SpreadsheetApp.openByUrl(sheetUrl);
          const sheet = ss.getSheetByName('PAGOS_RECIBIDOS');
          if (sheet) {
            sheet.appendRow([new Date(), paymentId, externalReference, paymentData.transaction_amount, 'APROBADO', JSON.stringify(paymentData)]);
          }
        }
      }
    }
    return { success: true };
  } catch (e) {
    console.error('Webhook error:', e);
    return { success: false, error: e.toString() };
  }
}
