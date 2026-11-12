/**
 * Wompi — prueba de recaudo (modo pruebas). Página: frontend/prueba-wompi.html
 *  1) wompiPruebaIniciar_: arma referencia + firma de integridad y devuelve el link del Web Checkout.
 *  2) wompiEventoWebhook_: recibe el evento transaction.updated, verifica la firma con el secreto
 *     de eventos y lo anota en la pestaña oculta WOMPI_EVENTOS. Nadie mira nada: el sistema valida solo.
 *  3) wompiPruebaEstado_: la página consulta si ya llegó el evento de su referencia.
 * Llaves en WOMPI_LLAVES.js (fuera de git).
 */

function _sha256Hex_(txt) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function _hojaEventosWompi_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById('1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc');
  let h = ss.getSheetByName('WOMPI_EVENTOS');
  if (!h) {
    h = ss.insertSheet('WOMPI_EVENTOS');
    h.appendRow(['Recibido', 'Referencia', 'ID Wompi', 'Estado', 'Monto', 'Medio', 'Firma válida', 'Ambiente', 'Data bruta']);
    h.hideSheet();
  }
  return h;
}

function wompiPruebaIniciar_(datos) {
  const monto = Math.max(1500, Math.round(Number(datos.monto) || 85000));
  const centavos = monto * 100;
  const ref = 'PRUEBA-' + Date.now();
  const admin = Math.max(0, Math.min(monto, Math.round(Number(datos.admin) || 0)));
  PropertiesService.getScriptProperties().setProperty('WOMPI_PRUEBA_' + ref, JSON.stringify({ admin: admin, pct: 8 }));
  const firma = _sha256Hex_(ref + centavos + 'COP' + WOMPI_LLAVES.integridad);
  const url = 'https://checkout.wompi.co/p/?public-key=' + encodeURIComponent(WOMPI_LLAVES.publica) +
    '&currency=COP&amount-in-cents=' + centavos + '&reference=' + encodeURIComponent(ref) +
    '&signature:integrity=' + firma +
    (datos.volver ? '&redirect-url=' + encodeURIComponent(datos.volver) : '');
  return { success: true, referencia: ref, url: url };
}

function wompiEventoWebhook_(ev) {
  if (ev.event === 'payout.updated' || (ev.data && ev.data.transaction && ev.data.transaction.amountInCents !== undefined)) return wompiEventoDispersion_(ev);
  const tx = (ev.data && ev.data.transaction) || {};
  let valida = false;
  try {
    const props = (ev.signature && ev.signature.properties) || [];
    const cadena = props.map(function (p) {
      return p.split('.').reduce(function (o, k) { return o == null ? '' : o[k]; }, ev.data);
    }).join('') + ev.timestamp + WOMPI_LLAVES.eventos;
    valida = _sha256Hex_(cadena) === String(ev.signature.checksum).toLowerCase();
  } catch (e) { valida = false; }
  // Apps Script responde con redirección (no 200), así que Wompi reintenta el mismo aviso.
  // Se anota una sola vez por transacción + estado.
  const hoja = _hojaEventosWompi_();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ya = hoja.getDataRange().getValues().some(function (f) { return String(f[2]) === String(tx.id) && String(f[3]) === String(tx.status); });
    if (ya) return { success: true, repetido: true };
    hoja.appendRow([new Date(), tx.reference || '', tx.id || '', tx.status || '',
    (tx.amount_in_cents || 0) / 100, tx.payment_method_type || '', valida ? 'SÍ' : 'NO', ev.environment || '', JSON.stringify(ev)]);
  } finally { lock.releaseLock(); }
  if (valida && tx.status === 'APPROVED') { try { wompiDispersarPrueba_(tx); } catch (e) { console.error('Dispersión prueba: ' + e); } }
  return { success: true };
}

function wompiPruebaEstado_(datos) {
  const ref = String(datos.referencia || '');
  const filas = _hojaEventosWompi_().getDataRange().getValues();
  for (let i = filas.length - 1; i >= 1; i--) {
    if (String(filas[i][1]) === ref) {
      const disp = _hojaDispersionesWompi_().getDataRange().getValues().filter(function (f) { return String(f[2]).indexOf('DISP-' + ref) === 0; }).map(function (f) { return { monto: f[5], estado: f[6], firma: f[7] }; });
      return { success: true, llego: true, dispersion: disp, estado: filas[i][3], monto: filas[i][4], medio: filas[i][5], firmaValida: filas[i][6] === 'SÍ', idWompi: filas[i][2] };
    }
  }
  return { success: true, llego: false };
}

/* ───────── Pagos a Terceros (dispersión) — SOLO SANDBOX ───────── */
const WOMPI_PT_SANDBOX_ = 'https://api.sandbox.payouts.wompi.co/v1';

function _hojaDispersionesWompi_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById('1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc');
  let h = ss.getSheetByName('WOMPI_DISPERSIONES');
  if (!h) {
    h = ss.insertSheet('WOMPI_DISPERSIONES');
    h.appendRow(['Fecha', 'Ref. recaudo', 'Ref. dispersión', 'ID lote', 'ID transacción', 'Monto', 'Estado', 'Firma válida', 'Respuesta']);
    h.hideSheet();
  }
  return h;
}

function _ptFetch_(metodo, ruta, cuerpo, idem) {
  const base = WOMPI_LLAVES.pagosTercerosBase;
  if (base !== WOMPI_PT_SANDBOX_) throw new Error('Pagos a Terceros solo habilitado en sandbox');
  const h = { 'x-api-key': WOMPI_LLAVES.pagosTercerosApiKey, 'user-principal-id': WOMPI_LLAVES.pagosTercerosUsuario };
  if (idem) h['idempotency-key'] = idem;
  const r = UrlFetchApp.fetch(base + ruta, { method: metodo, headers: h, contentType: 'application/json',
    payload: cuerpo ? JSON.stringify(cuerpo) : undefined, muteHttpExceptions: true });
  return { code: r.getResponseCode(), json: JSON.parse(r.getContentText() || '{}') };
}

/** Prueba: tras un recaudo aprobado, gira el 92 % (comisión 8 %) a un propietario ficticio. */
function wompiDispersarPrueba_(tx) {
  const total = Math.round((tx.amount_in_cents || 0) / 100);
  // Reparto: total = canon + administración. Comisión = 8 % del canon. Al propietario: canon − comisión.
  let cfg = { admin: 0, pct: 8 };
  try { cfg = JSON.parse(PropertiesService.getScriptProperties().getProperty('WOMPI_PRUEBA_' + tx.reference)) || cfg; } catch (e) {}
  const canon = total - (cfg.admin || 0);
  const alPropietario = Math.round(canon * (100 - cfg.pct) / 100);
  const refDisp = 'DISP-' + String(tx.reference || tx.id).replace(/[^A-Za-z0-9-]/g, '');
  const cuerpo = {
    reference: refDisp, accountId: 'WOMPI_ACCOUNT', paymentType: 'OTHER', transactionStatus: 'APPROVED',
    transactions: [{ legalIdType: 'CC', legalId: '1000000000', bankId: 'fe0dc841-b057-4349-a6dc-a88d29d2605a',
      accountType: 'AHORROS', accountNumber: '1234567890', name: 'Propietario Prueba', email: 'propietario.prueba@example.com',
      amount: alPropietario * 100, reference: refDisp + '-1' }]
  };
  const r = _ptFetch_('post', '/payouts', cuerpo, refDisp);
  const d = r.json.data || {};
  _hojaDispersionesWompi_().appendRow([new Date(), tx.reference || '', refDisp, d.payoutId || d.id || '', '', alPropietario,
    r.code < 300 ? 'ENVIADO' : 'ERROR ' + r.code, '', JSON.stringify(r.json).slice(0, 5000)]);
  _asegurarTriggerGirosWompi_();
  Utilities.sleep(4000);
  wompiConfirmarGiros();
}

/**
 * Constancia de cada giro: le pregunta a Wompi el estado de los giros sin confirmar y guarda
 * ID de transacción, estado final, fecha de confirmación y la respuesta completa de Wompi.
 * No depende del aviso automático (en sandbox no llega). Corre también cada 10 minutos.
 */
function wompiConfirmarGiros() {
  const hoja = _hojaDispersionesWompi_();
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  if (enc.indexOf('Confirmado por Wompi') < 0) { hoja.getRange(1, enc.length + 1, 1, 2).setValues([['Confirmado por Wompi', 'Constancia Wompi']]); }
  const filas = hoja.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    const lote = String(filas[i][3] || ''), estado = String(filas[i][6] || '');
    if (!lote || !/^(ENVIADO|PENDING|PROCESSING)/.test(estado)) continue;
    const r = _ptFetch_('get', '/payouts/' + lote + '/transactions');
    const t = ((r.json.data || {}).records || [])[0];
    if (!t) continue;
    hoja.getRange(i + 1, 5).setValue(t.id);
    hoja.getRange(i + 1, 7).setValue(t.status);
    if (/APPROVED|FAILED|CANCELLED|REJECTED/.test(t.status)) {
      hoja.getRange(i + 1, 10, 1, 2).setValues([[new Date(), JSON.stringify(t).slice(0, 5000)]]);
    }
  }
}

function _asegurarTriggerGirosWompi_() {
  const ya = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'wompiConfirmarGiros'; });
  if (!ya) ScriptApp.newTrigger('wompiConfirmarGiros').timeBased().everyMinutes(10).create();
}

/** Evento de Pagos a Terceros (payout.updated / transaction.updated con amountInCents). */
function wompiEventoDispersion_(ev) {
  let valida = false;
  try {
    const props = (ev.signature && ev.signature.properties) || [];
    const cadena = props.map(function (p) { return p.split('.').reduce(function (o, k) { return o == null ? '' : o[k]; }, ev.data); }).join('') +
      ev.timestamp + WOMPI_LLAVES.pagosTercerosEventos;
    valida = _sha256Hex_(cadena) === String(ev.signature.checksum).toLowerCase();
  } catch (e) { valida = false; }
  const o = (ev.data && (ev.data.transaction || ev.data.payout)) || {};
  const hoja = _hojaDispersionesWompi_();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ya = hoja.getDataRange().getValues().some(function (f) { return String(f[4]) === String(o.id) && String(f[6]) === (ev.event || '') + ': ' + (o.status || ''); });
    if (ya) return { success: true, repetido: true };
    hoja.appendRow([new Date(), '', o.reference || '', o.payoutId || (ev.event === 'payout.updated' ? o.id : ''), o.id || '',
      o.amountInCents ? o.amountInCents / 100 : (o.totalAmountInCents || 0) / 100, (ev.event || '') + ': ' + (o.status || ''), valida ? 'SÍ' : 'NO', JSON.stringify(ev).slice(0, 5000)]);
  } finally { lock.releaseLock(); }
  return { success: true };
}
