// Credenciales de Prueba (Activas)
const MP_ACCESS_TOKEN = 'APP_USR-996653389612421-060519-8c8f4b7e9d9eb7d87c56cf2c138ff2d5-1824932605';

// Credenciales de ProducciÃ³n (Reales - Para cuando estÃ©s listo para salir en vivo)
// const MP_ACCESS_TOKEN = 'APP_USR-8777396757564882-052314-43723717a419b60b7e28e4b9a4638c6d-365464952';

function crearPreferenciaPago(datos) {
  try {
    const url = 'https://api.mercadopago.com/checkout/preferences';
    
    // Configurar la preferencia
    const payload = {
      items: [
          {
            title: 'Elaboración y Autenticación de Contrato - E-FirmaContrata',
            description: 'Estudio para solicitud de arrendamiento',
            quantity: 1,
            currency_id: 'COP',
            unit_price: 85000
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

function auditorDeContratosVencidos() {
  try {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1B9I3y3E3qI7FwXJ5W-xMhLw2pXWkE1W0w4x1kR0fRj0/edit';
    const ss = SpreadsheetApp.openByUrl(sheetUrl);
    const sheetPagos = ss.getSheetByName('PAGOS_RECIBIDOS');
    const sheetInmuebles = ss.getSheetByName('1.1 - INMUEBLES REGISTRADOS');
    if (!sheetPagos || !sheetInmuebles) return;

    // Obtener headers de la hoja de inmuebles para encontrar la columna de CDR y ESTADO DOCUMENTAL
    const headersInmuebles = sheetInmuebles.getRange(1, 1, 1, sheetInmuebles.getLastColumn()).getValues()[0];
    const colCdrInmuebles = headersInmuebles.indexOf('CODIGO DE REGISTRO');
    const colEstadoDocInmuebles = headersInmuebles.indexOf('ESTADO DOCUMENTAL');
    const dataInmuebles = sheetInmuebles.getDataRange().getValues();

    const dataPagos = sheetPagos.getDataRange().getValues();
    const now = new Date();

    // Estados seguros (donde NO se debe reembolsar)
    const estadosSeguros = [
      'READY_CONTRACT', 'CONTRACT_GENERATED', 
      'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED'
    ];

    for (let i = 1; i < dataPagos.length; i++) {
      const row = dataPagos[i];
      const fechaPago = new Date(row[0]); // Columna A: Timestamp
      const paymentId = row[1]; // Columna B: Payment ID
      const cdr = row[2]; // Columna C: CDR
      const estadoPago = row[4]; // Columna E: Estado

      if (estadoPago === 'APROBADO') {
        const minutesDiff = (now - fechaPago) / (1000 * 60);
        
        if (minutesDiff >= 2) {
          // Buscar el estado documental del CDR en la hoja de inmuebles
          let estadoDocumental = '';
          for (let j = 1; j < dataInmuebles.length; j++) {
            if (colCdrInmuebles !== -1 && dataInmuebles[j][colCdrInmuebles] === cdr) {
              estadoDocumental = dataInmuebles[j][colEstadoDocInmuebles] || '';
              break;
            }
          }

          // Si el estado NO es uno de los seguros, se asume que el propietario o admin no terminaron el proceso.
          // Por lo tanto, se activa la Garantía de Satisfacción 100%.
          if (!estadosSeguros.includes(estadoDocumental)) {
            // Reembolsar usando MP API
            const url = 'https://api.mercadopago.com/v1/payments/' + paymentId + '/refunds';
            const options = {
              method: 'post',
              headers: {
                'Authorization': 'Bearer ' + MP_ACCESS_TOKEN,
                'X-Idempotency-Key': paymentId + '-' + Date.now()
              },
              muteHttpExceptions: true
            };

            const response = UrlFetchApp.fetch(url, options);
            if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
              sheetPagos.getRange(i + 1, 5).setValue('REEMBOLSADO POR TIEMPO');
              sheetPagos.getRange(i + 1, 5).setBackground('#ffcccc'); // Rojo claro
              console.log('Reembolsado automáticamente el pago ' + paymentId + ' para CDR ' + cdr);
            } else {
              console.error('Error reembolsando: ' + response.getContentText());
            }
          } else {
            // El proceso se formalizó correctamente, el dinero se consolida.
            sheetPagos.getRange(i + 1, 5).setValue('CONSOLIDADO');
            sheetPagos.getRange(i + 1, 5).setBackground('#d9ead3'); // Verde claro
          }
        }
      }
    }
  } catch (e) {
    console.error('Error en auditorDeContratosVencidos:', e);
  }
}

