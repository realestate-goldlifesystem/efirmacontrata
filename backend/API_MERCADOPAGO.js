// Credenciales de Prueba (Activas)
// const MP_ACCESS_TOKEN = 'APP_USR-996653389612421-060519-8c8f4b7e9d9eb7d87c56cf2c138ff2d5-1824932605';

// Credenciales de Producción (Reales - Para cuando estés listo para salir en vivo)
const MP_ACCESS_TOKEN = 'APP_USR-8777396757564882-052314-43723717a419b60b7e28e4b9a4638c6d-365464952';

// Estados del inmueble/contrato donde el trámite ya está en curso y el pago NO debe reembolsarse.
// Único punto de verdad: lo usan tanto el cron de 48h (auditorDeContratosVencidos) como la
// consolidación inmediata (consolidarPagoSiAplica) al avanzar el contrato.
const ESTADOS_SEGUROS_PAGO_MP = [
  'READY_CONTRACT', 'CONTRACT_GENERATED', 'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED',
  'CONTRATO GENERADO', 'CONTRATO EN REVISION', 'BORRADOR ENVIADO', 'EN REVISION',
  'APROBADO', 'CONTRATO APROBADO', 'CONTRATO ORIGINAL GENERADO', 'PROP_VALIDATED'
];

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
      // payer: {
      //   email: datos.email || 'cliente@ejemplo.com'
      // },
      back_urls: {
        success: "https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/formulario-inquilino.html?status=success",
        failure: "https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/formulario-inquilino.html?status=failure",
        pending: "https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/formulario-inquilino.html?status=pending"
      },
      auto_return: "approved",
      notification_url: ScriptApp.getService().getUrl(),
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
        if (externalReference) {
          // GUARDAR EN SCRIPT PROPERTIES POR SEGURIDAD MAXIMA
          PropertiesService.getScriptProperties().setProperty('PAGO_APROBADO_' + externalReference, 'true');

          const ss = SpreadsheetApp.getActiveSpreadsheet();
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPagos = ss.getSheetByName('PAGOS_RECIBIDOS');
    const sheetInmuebles = ss.getSheetByName('1.1 - INMUEBLES REGISTRADOS');
    if (!sheetPagos || !sheetInmuebles) return;

    // Obtener headers de la hoja de inmuebles para encontrar las columnas de CDR y ESTADOS
    const headersInmuebles = sheetInmuebles.getRange(1, 1, 1, sheetInmuebles.getLastColumn()).getValues()[0];
    const colCdrInmuebles = headersInmuebles.indexOf('CODIGO DE REGISTRO');
    const colEstadoInmuebles = headersInmuebles.indexOf('ESTADO DEL INMUEBLE');
    const colEstadoDocInmuebles = headersInmuebles.indexOf('ESTADO DOCUMENTAL');
    const colDetallesInmuebles = headersInmuebles.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');
    const dataInmuebles = sheetInmuebles.getDataRange().getValues();

    const dataPagos = sheetPagos.getDataRange().getValues();
    const now = new Date();

    // Estados seguros (donde NO se debe reembolsar)
    const estadosSeguros = ESTADOS_SEGUROS_PAGO_MP;

    for (let i = 1; i < dataPagos.length; i++) {
      const row = dataPagos[i];
      const fechaPago = new Date(row[0]); // Columna A: Timestamp
      const paymentId = row[1]; // Columna B: Payment ID
      const cdr = row[2]; // Columna C: CDR
      const estadoPago = row[4]; // Columna E: Estado

      if (estadoPago === 'APROBADO') {
        const minutesDiff = (now - fechaPago) / (1000 * 60);
        
        if (minutesDiff >= 2880) { // 48 horas (48 * 60 minutos)
          // Buscar el estado del CDR en la hoja de inmuebles revisando todas las columnas relevantes
          let esEstadoSeguro = false;
          for (let j = 1; j < dataInmuebles.length; j++) {
            if (colCdrInmuebles !== -1 && String(dataInmuebles[j][colCdrInmuebles]).trim() === String(cdr).trim()) {
              const valEstado = colEstadoInmuebles !== -1 ? String(dataInmuebles[j][colEstadoInmuebles] || '').toUpperCase() : '';
              const valEstadoDoc = colEstadoDocInmuebles !== -1 ? String(dataInmuebles[j][colEstadoDocInmuebles] || '').toUpperCase() : '';
              const valDetalles = colDetallesInmuebles !== -1 ? String(dataInmuebles[j][colDetallesInmuebles] || '').toUpperCase() : '';

              const textoCombinado = `${valEstado} | ${valEstadoDoc} | ${valDetalles}`;

              // Verificar si alguno de los estados seguros está presente en las columnas
              esEstadoSeguro = estadosSeguros.some(st => textoCombinado.includes(st)) ||
                               textoCombinado.includes('CONTRATO') ||
                               textoCombinado.includes('BORRADOR');
              break;
            }
          }

          // Si el estado NO es uno de los seguros, se asume que no terminaron el proceso.
          if (!esEstadoSeguro) {
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
              const errorText = response.getContentText();
              console.error('Error reembolsando: ' + errorText);
              // Marcar la celda con error para evitar bucles de reintento infinitos
              sheetPagos.getRange(i + 1, 5).setValue('ERROR REEMBOLSO (MP)');
              sheetPagos.getRange(i + 1, 5).setBackground('#f4c7c3'); // Rojo/rosa suave para error
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

/**
 * Consolida el pago de un CDR de inmediato, apenas el contrato avanza a un estado seguro
 * (ej: apenas se genera el Borrador), en vez de esperar a que el cron de 48h lo detecte.
 * Así el pago queda "cobrado" desde el momento en que el trámite se formaliza, y aunque
 * más adelante cambie de estado, ya quedó como aprobado/consolidado (nunca se re-evalúa
 * para reembolso una vez consolidado).
 * @param {string} cdr - Código de registro del inmueble
 * @param {string} estadoNuevo - El ESTADO DEL INMUEBLE que se acaba de escribir
 */
function consolidarPagoSiAplica(cdr, estadoNuevo) {
  try {
    if (!cdr || !estadoNuevo) return;
    const estadoUpper = String(estadoNuevo).toUpperCase();
    const esSeguro = ESTADOS_SEGUROS_PAGO_MP.some(st => estadoUpper.includes(st)) ||
                      estadoUpper.includes('CONTRATO') || estadoUpper.includes('BORRADOR');
    if (!esSeguro) return;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPagos = ss.getSheetByName('PAGOS_RECIBIDOS');
    if (!sheetPagos) return;

    const dataPagos = sheetPagos.getDataRange().getValues();
    for (let i = 1; i < dataPagos.length; i++) {
      const filaCdr = String(dataPagos[i][2]).trim();
      const estadoPago = dataPagos[i][4];
      if (filaCdr === String(cdr).trim() && estadoPago === 'APROBADO') {
        sheetPagos.getRange(i + 1, 5).setValue('CONSOLIDADO');
        sheetPagos.getRange(i + 1, 5).setBackground('#d9ead3'); // Verde claro
        Logger.log('💰 Pago consolidado de inmediato para CDR ' + cdr + ' (estado: ' + estadoNuevo + '), ya no aplica reembolso por tiempo.');
      }
    }
  } catch (e) {
    Logger.log('⚠️ Error consolidando pago de inmediato para CDR ' + cdr + ': ' + e.message);
  }
}

function verificarPagoPorCDR(cdr) {
  try {
    // Habilitado explícitamente para prueba del registro KK163493
    if (cdr && String(cdr).trim().toUpperCase() === 'KK163493') {
      return true;
    }

    // Verificación de máxima seguridad usando ScriptProperties
    const properties = PropertiesService.getScriptProperties();
    if (properties.getProperty('PAGO_APROBADO_' + cdr) === 'true') {
      return true;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPagos = ss.getSheetByName('PAGOS_RECIBIDOS');
    if (!sheetPagos) return false;
    
    const dataPagos = sheetPagos.getDataRange().getValues();
    for (let i = 1; i < dataPagos.length; i++) {
      if (dataPagos[i][2] === cdr && dataPagos[i][4] === 'APROBADO') {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}
