// Credenciales de Prueba (Activas)
// const MP_ACCESS_TOKEN = 'APP_USR-996653389612421-060519-8c8f4b7e9d9eb7d87c56cf2c138ff2d5-1824932605';

// Credenciales de Producción (Reales - Para cuando estés listo para salir en vivo)
const MP_ACCESS_TOKEN = 'APP_USR-8777396757564882-052314-43723717a419b60b7e28e4b9a4638c6d-365464952';

// REGLA DEL PAGO (decisión de Leonardo, 05-oct-2026): el pago del inquilino es una garantía
// para él y solo se CONSOLIDA cuando los documentos del PROPIETARIO quedan aprobados. Antes
// de eso —formulario enviado, documentos del inquilino aprobados, propietario diligenciando o
// en corrección— el pago sigue reembolsable y el auditor lo devuelve a las 48 h.
//
// Valores de ESTADO DOCUMENTAL desde ese punto en adelante. Único punto de verdad: lo usan el
// auditor de 48 h (auditorDeContratosVencidos) y la consolidación inmediata (consolidarPagoSiAplica).
const ESTADOS_DOC_QUE_CONSOLIDAN_PAGO = [
  'PROP_VALIDATED', 'READY_CONTRACT', 'CONTRACT_GENERATED', 'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED'
];

/**
 * ¿El trámite ya pasó la aprobación de los documentos del propietario?
 *
 * Se compara contra valores exactos y no buscando palabras sueltas: antes bastaba con que
 * apareciera "APROBADO" en cualquier columna, y "ESTUDIO APROBADO" o "Documentos del
 * inquilino aprobados" consolidaban el pago antes de tiempo.
 * @param {string} estadoInmueble - ESTADO DEL INMUEBLE
 * @param {string} estadoDoc - ESTADO DOCUMENTAL (puede traer "|detalle" al final)
 * @param {string} detalles - DETALLES DEL ESTADO DEL INMUEBLE
 * @return {boolean}
 */
function tramiteConsolidaPago(estadoInmueble, estadoDoc, detalles) {
  const doc = String(estadoDoc || '').split('|')[0].trim().toUpperCase();
  if (ESTADOS_DOC_QUE_CONSOLIDAN_PAGO.indexOf(doc) !== -1) return true;

  // El contrato solo existe después de aprobar al propietario: "CONTRATO GENERADO",
  // "CONTRATO EN REVISION", "CONTRATO APROBADO", "CONTRATO ORIGINAL GENERADO"...
  const estado = String(estadoInmueble || '').trim().toUpperCase();
  if (estado.indexOf('CONTRATO') === 0 || estado === 'BORRADOR ENVIADO') return true;

  // Respaldo por si la hoja no tiene la columna ESTADO DOCUMENTAL: es el texto que deja
  // procesarValidacionPropietario al aprobar.
  return String(detalles || '').toUpperCase().indexOf('DOCUMENTOS COMPLETOS') !== -1;
}

// Estados de PAGOS_RECIBIDOS en los que el dinero está recibido y vigente.
const ESTADOS_PAGO_VIGENTE = ['APROBADO', 'CONSOLIDADO'];

/**
 * Un registro tiene dos nombres: el CDR largo ("REG_21-09-2026-VR4_(...)") y el ID corto
 * ("MN348696"). El pago queda guardado con el que traía el link del formulario (hoy el ID),
 * pero el panel y el motor de contratos preguntan a veces con el CDR. Comparar un nombre
 * contra el otro nunca coincide: el panel mostraba "PAGO PENDIENTE" con el pago ya hecho y
 * el auditor de 48 h no encontraba el inmueble. Todo el que cruce un pago con un registro
 * debe pasar por aquí.
 * @param {string} cdrOId - CDR o ID de registro
 * @return {string[]} Los nombres del registro, en mayúsculas y sin espacios sobrantes
 */
function clavesDeRegistroParaPago(cdrOId) {
  const claves = [];
  const agregar = function (v) {
    const s = String(v || '').trim().toUpperCase();
    if (s && claves.indexOf(s) === -1) claves.push(s);
  };
  agregar(cdrOId);
  if (!claves.length) return claves;

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
    const ultima = sheet ? sheet.getLastRow() : 0;
    if (ultima < 2) return claves;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colCdr = headers.indexOf('CODIGO DE REGISTRO') + 1;
    const colId = headers.indexOf('ID DE REGISTRO') + 1;
    if (!colCdr || !colId) return claves;

    const cdrs = sheet.getRange(2, colCdr, ultima - 1, 1).getValues();
    const ids = sheet.getRange(2, colId, ultima - 1, 1).getValues();
    for (let i = 0; i < cdrs.length; i++) {
      const c = String(cdrs[i][0] || '').trim().toUpperCase();
      const d = String(ids[i][0] || '').trim().toUpperCase();
      if (c === claves[0] || d === claves[0]) {
        agregar(c);
        agregar(d);
        break;
      }
    }
  } catch (e) {
    Logger.log('⚠️ No se pudieron resolver los nombres del registro ' + cdrOId + ': ' + e.message);
  }
  return claves;
}

/**
 * Busca el pago vigente de un registro en PAGOS_RECIBIDOS, por CDR o por ID.
 * @param {string} cdrOId - CDR o ID de registro
 * @return {{pagado: boolean, monto: *, fecha: string, paymentId: string, estado: string}}
 *         Si no hay pago vigente, `estado` trae el de la última fila del registro (ej.
 *         "REEMBOLSADO POR TIEMPO") o '' si nunca hubo ninguna.
 */
function buscarPagoDeRegistro(cdrOId) {
  const sinPago = { pagado: false, monto: '', fecha: '', paymentId: '', estado: '' };
  const claves = clavesDeRegistroParaPago(cdrOId);
  if (!claves.length) return sinPago;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PAGOS_RECIBIDOS');
  if (!sheet) return sinPago;

  const data = sheet.getDataRange().getValues();
  // Al revés: si hay varias filas del mismo registro, manda la más reciente.
  for (let i = data.length - 1; i >= 1; i--) {
    if (claves.indexOf(String(data[i][2] || '').trim().toUpperCase()) === -1) continue;

    const estado = String(data[i][4] || '').trim().toUpperCase();
    if (ESTADOS_PAGO_VIGENTE.indexOf(estado) !== -1) {
      const f = data[i][0];
      return {
        pagado: true,
        monto: data[i][3],
        fecha: f instanceof Date ? Utilities.formatDate(f, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : String(f || ''),
        paymentId: String(data[i][1] || ''),
        estado: estado
      };
    }
    if (!sinPago.estado) sinPago.estado = estado;
  }
  return sinPago;
}

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
            // Mercado Pago avisa VARIAS veces del mismo pago (payment.created,
            // payment.updated y reintentos). Antes cada aviso sumaba una fila:
            // el pago 181563322027 de SK142795 quedó anotado 5 veces
            // (05-oct-2026). Ahora un pago = una fila. El candado es porque dos
            // avisos llegan con 2 segundos de diferencia y ambos verían la hoja
            // "sin ese pago".
            const candado = LockService.getScriptLock();
            let conCandado = false;
            try { candado.waitLock(20000); conCandado = true; } catch (eLock) { /* se anota igual: mejor repetido que perdido */ }
            try {
              const encabezados = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
              const colIdMP = encabezados.indexOf('ID Mercado Pago') + 1;
              let yaAnotado = false;
              if (colIdMP > 0 && sheet.getLastRow() > 1) {
                yaAnotado = sheet.getRange(2, colIdMP, sheet.getLastRow() - 1, 1).getValues()
                  .some(function (r) { return String(r[0]).trim() === String(paymentId).trim(); });
              }
              if (!yaAnotado) {
                sheet.appendRow([new Date(), paymentId, externalReference, paymentData.transaction_amount, 'APROBADO', JSON.stringify(paymentData)]);
              }
            } finally {
              if (conCandado) candado.releaseLock();
            }
          }

          // Acaba de entrar un pago que habrá que vigilar hasta las 48 h: se
          // enciende el auditor. Si ya estaba encendido, no se crea otro.
          try {
            asegurarAuditorPagos();
          } catch (errAud) {
            console.error('No se pudo encender el auditor de pagos: ' + errAud);
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

// Cada cuánto revisa el auditor mientras hay pagos vivos.
//
// 30 minutos y no 1: el cron NO sirve para detectar los pagos que SÍ se
// formalizan — de eso se encarga consolidarPagoSiAplica(), que corre en el
// momento en que el contrato avanza. Aquí solo se decide el reembolso de las
// 48 h, y para eso da igual enterarse al minuto o media hora después.
// Bajó de 1.440 ejecuciones diarias a 48 mientras hay trabajo, y a CERO cuando
// no lo hay.
var MINUTOS_AUDITOR_PAGOS = 30;
var FN_AUDITOR_PAGOS = 'auditorDeContratosVencidos';

/**
 * Enciende el auditor si hay pagos que vigilar. No crea uno si ya existe.
 *
 * Se llama desde el webhook al entrar un pago. La alternativa —un trigger por
 * cada pago— agotaría las 20 plazas de Apps Script con unos pocos pagos a la
 * vez, y llegar al tope no solo falla: rompe procesos a medias (el 08-09-2026
 * dejó un inmueble duplicado por eso).
 */
function asegurarAuditorPagos() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === FN_AUDITOR_PAGOS) return false; // ya vigila
  }
  if (triggers.length >= 19) {
    console.error('No hay sitio para el auditor de pagos: ' + triggers.length + '/20 triggers.');
    return false;
  }
  ScriptApp.newTrigger(FN_AUDITOR_PAGOS).timeBased().everyMinutes(MINUTOS_AUDITOR_PAGOS).create();
  console.log('Auditor de pagos encendido (cada ' + MINUTOS_AUDITOR_PAGOS + ' min).');
  return true;
}

/** Apaga el auditor. Se llama cuando ya no queda ningún pago que vigilar. */
function apagarAuditorPagos() {
  var triggers = ScriptApp.getProjectTriggers();
  var n = 0;
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === FN_AUDITOR_PAGOS) { ScriptApp.deleteTrigger(t); n++; }
  });
  if (n) console.log('Auditor de pagos apagado: no quedan pagos que vigilar.');
  return n;
}

/**
 * ¿Queda algún pago vivo? Solo los APROBADO necesitan vigilancia: son los que
 * todavía pueden acabar en reembolso. CONSOLIDADO, REEMBOLSADO y ERROR ya están
 * resueltos y no se vuelven a mirar.
 */
function hayPagosPendientesDeAuditar() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PAGOS_RECIBIDOS');
  if (!sheet) return false;
  var ultima = sheet.getLastRow();
  if (ultima < 2) return false;
  var estados = sheet.getRange(2, 5, ultima - 1, 1).getValues();   // columna E
  for (var i = 0; i < estados.length; i++) {
    if (String(estados[i][0] || '').trim().toUpperCase() === 'APROBADO') return true;
  }
  return false;
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
    const colIdInmuebles = headersInmuebles.indexOf('ID DE REGISTRO');
    const colEstadoInmuebles = headersInmuebles.indexOf('ESTADO DEL INMUEBLE');
    const colEstadoDocInmuebles = headersInmuebles.indexOf('ESTADO DOCUMENTAL');
    const colDetallesInmuebles = headersInmuebles.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');
    const dataInmuebles = sheetInmuebles.getDataRange().getValues();

    const dataPagos = sheetPagos.getDataRange().getValues();
    const now = new Date();

    for (let i = 1; i < dataPagos.length; i++) {
      const row = dataPagos[i];
      const fechaPago = new Date(row[0]); // Columna A: Timestamp
      const paymentId = row[1]; // Columna B: Payment ID
      const cdr = row[2]; // Columna C: CDR
      const estadoPago = row[4]; // Columna E: Estado

      if (estadoPago === 'APROBADO') {
        const minutesDiff = (now - fechaPago) / (1000 * 60);
        
        // Antes este bloque solo corría pasadas 48 h del pago, y esa era toda la regla.
        // Ahora corre siempre: el plazo depende de la ETAPA del trámite (GESTOR_PLAZOS.js),
        // y de paso se consolida apenas se puede y se le recuerda al agente lo que tiene
        // sin revisar.
        {
          // Buscar el estado del CDR en la hoja de inmuebles revisando todas las columnas relevantes
          // El pago puede venir guardado con el CDR o con el ID del registro: se busca por los dos.
          // Buscando solo por CDR, un pago guardado con el ID no encontraba su inmueble y se
          // mandaba a reembolso aunque el trámite ya estuviera en curso.
          let esEstadoSeguro = false;
          let filaInmueble = -1;   // fila (1-based) del inmueble de este pago
          // Nombres del registro tal como están escritos (CDR e ID), para borrar su marca
          // de "pagó" si se reembolsa.
          const nombresRegistro = [String(cdr || '').trim()];
          const clavePago = String(cdr || '').trim().toUpperCase();
          for (let j = 1; j < dataInmuebles.length; j++) {
            const cdrFila = colCdrInmuebles !== -1 ? String(dataInmuebles[j][colCdrInmuebles] || '').trim().toUpperCase() : '';
            const idFila = colIdInmuebles !== -1 ? String(dataInmuebles[j][colIdInmuebles] || '').trim().toUpperCase() : '';
            if (clavePago && (cdrFila === clavePago || idFila === clavePago)) {
              filaInmueble = j + 1;
              if (colCdrInmuebles !== -1) nombresRegistro.push(String(dataInmuebles[j][colCdrInmuebles] || '').trim());
              if (colIdInmuebles !== -1) nombresRegistro.push(String(dataInmuebles[j][colIdInmuebles] || '').trim());
              esEstadoSeguro = tramiteConsolidaPago(
                colEstadoInmuebles !== -1 ? dataInmuebles[j][colEstadoInmuebles] : '',
                colEstadoDocInmuebles !== -1 ? dataInmuebles[j][colEstadoDocInmuebles] : '',
                colDetallesInmuebles !== -1 ? dataInmuebles[j][colDetallesInmuebles] : ''
              );
              break;
            }
          }

          // ¿Se venció el plazo de la etapa en la que está el trámite?
          //  - Con el inmueble ubicado: lo decide GESTOR_PLAZOS (48 h para que el inquilino
          //    envíe, 48 h para que el propietario CARGUE, 24 h para una corrección; mientras
          //    le toca revisar al agente el reloj está detenido).
          //  - Sin inmueble ubicado, o sin ese módulo: la regla de siempre, 48 h desde el pago.
          let plazoVencido = minutesDiff >= 2880;
          if (!esEstadoSeguro && filaInmueble > 0 && typeof plzPagoVencido === 'function') {
            plazoVencido = plzPagoVencido(sheetInmuebles, filaInmueble, headersInmuebles, fechaPago.getTime(), now.getTime());
          }

          if (!esEstadoSeguro && !plazoVencido) {
            // Todavía está en plazo (o le toca al agente): no se hace nada en esta ronda.
          } else if (!esEstadoSeguro) {
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
              // Mercado Pago avisa varias veces del mismo pago y cada aviso deja su fila. El
              // pago se devolvió una sola vez: se marcan todas sus filas de una. Si quedaran
              // en APROBADO, el panel lo seguiría mostrando pagado y, al cumplir cada una sus
              // 48 h, se le pediría a MP otro reembolso que termina en "ERROR REEMBOLSO (MP)".
              for (let k = i; k < dataPagos.length; k++) {
                if (String(dataPagos[k][1]) === String(paymentId) && dataPagos[k][4] === 'APROBADO') {
                  sheetPagos.getRange(k + 1, 5).setValue('REEMBOLSADO POR TIEMPO');
                  sheetPagos.getRange(k + 1, 5).setBackground('#ffcccc'); // Rojo claro
                  dataPagos[k][4] = 'REEMBOLSADO POR TIEMPO';
                }
              }
              // La plata ya se devolvió: se borra la marca de "pagó". Si no, el formulario
              // del inquilino seguiría abierto sin pago. Para retomar el trámite tendrá que
              // pagar otra vez; ese pago nuevo vuelve a crear la marca y su propia fila.
              const propsPago = PropertiesService.getScriptProperties();
              nombresRegistro.forEach(function (nombre) {
                if (nombre) propsPago.deleteProperty('PAGO_APROBADO_' + nombre);
              });
              console.log('Reembolsado automáticamente el pago ' + paymentId + ' para CDR ' + cdr);
              // Avisarles al inquilino y al propietario: antes el reembolso era silencioso.
              if (filaInmueble > 0 && typeof plzAvisarReembolso === 'function') {
                plzAvisarReembolso(sheetInmuebles, filaInmueble, headersInmuebles);
              }
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
    // Terminada la ronda: si ya no queda ningún pago vivo, el auditor se apaga
    // solo y libera su plaza. Volverá a encenderse en cuanto entre otro pago.
    //
    // Va aquí dentro del try y no en un finally a propósito: si la ronda falló a
    // media, puede haber pagos sin revisar y apagarse los dejaría sin vigilancia.
    if (!hayPagosPendientesDeAuditar()) {
      apagarAuditorPagos();
    }
  } catch (e) {
    console.error('Error en auditorDeContratosVencidos:', e);
  }
}

/**
 * Consolida el pago de un registro de inmediato, en el momento en que se aprueban los
 * documentos del propietario (o el trámite ya va más adelante), en vez de esperar a que el
 * auditor de 48 h lo detecte. Una vez consolidado no se vuelve a evaluar para reembolso,
 * aunque el estado cambie después.
 * @param {string} cdr - CDR o ID de registro
 * @param {string} estadoInmueble - El ESTADO DEL INMUEBLE que se acaba de escribir ('' si no cambió)
 * @param {string} [estadoDoc] - El ESTADO DOCUMENTAL que se acaba de escribir
 */
function consolidarPagoSiAplica(cdr, estadoInmueble, estadoDoc) {
  try {
    if (!cdr || !tramiteConsolidaPago(estadoInmueble, estadoDoc, '')) return;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPagos = ss.getSheetByName('PAGOS_RECIBIDOS');
    if (!sheetPagos) return;

    const claves = clavesDeRegistroParaPago(cdr);
    const dataPagos = sheetPagos.getDataRange().getValues();
    for (let i = 1; i < dataPagos.length; i++) {
      const filaCdr = String(dataPagos[i][2] || '').trim().toUpperCase();
      const estadoPago = dataPagos[i][4];
      if (claves.indexOf(filaCdr) !== -1 && estadoPago === 'APROBADO') {
        sheetPagos.getRange(i + 1, 5).setValue('CONSOLIDADO');
        sheetPagos.getRange(i + 1, 5).setBackground('#d9ead3'); // Verde claro
        Logger.log('💰 Pago consolidado de inmediato para CDR ' + cdr + ' (estado: ' + (estadoInmueble || estadoDoc) + '), ya no aplica reembolso por tiempo.');
      }
    }
  } catch (e) {
    Logger.log('⚠️ Error consolidando pago de inmediato para CDR ' + cdr + ': ' + e.message);
  }
}

function verificarPagoPorCDR(cdr) {
  try {
    // Verificación de máxima seguridad usando ScriptProperties
    const properties = PropertiesService.getScriptProperties();
    if (properties.getProperty('PAGO_APROBADO_' + cdr) === 'true') {
      return true;
    }

    return buscarPagoDeRegistro(cdr).pagado;
  } catch (e) {
    return false;
  }
}
