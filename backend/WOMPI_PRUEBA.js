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
  const firma = _sha256Hex_(ref + centavos + 'COP' + WOMPI_LLAVES.integridad);
  const url = 'https://checkout.wompi.co/p/?public-key=' + encodeURIComponent(WOMPI_LLAVES.publica) +
    '&currency=COP&amount-in-cents=' + centavos + '&reference=' + encodeURIComponent(ref) +
    '&signature:integrity=' + firma +
    (datos.volver ? '&redirect-url=' + encodeURIComponent(datos.volver) : '');
  return { success: true, referencia: ref, url: url };
}

function wompiEventoWebhook_(ev) {
  const tx = (ev.data && ev.data.transaction) || {};
  let valida = false;
  try {
    const props = (ev.signature && ev.signature.properties) || [];
    const cadena = props.map(function (p) {
      return p.split('.').reduce(function (o, k) { return o == null ? '' : o[k]; }, ev.data);
    }).join('') + ev.timestamp + WOMPI_LLAVES.eventos;
    valida = _sha256Hex_(cadena) === String(ev.signature.checksum).toLowerCase();
  } catch (e) { valida = false; }
  _hojaEventosWompi_().appendRow([new Date(), tx.reference || '', tx.id || '', tx.status || '',
    (tx.amount_in_cents || 0) / 100, tx.payment_method_type || '', valida ? 'SÍ' : 'NO', ev.environment || '', JSON.stringify(ev)]);
  return { success: true };
}

function wompiPruebaEstado_(datos) {
  const ref = String(datos.referencia || '');
  const filas = _hojaEventosWompi_().getDataRange().getValues();
  for (let i = filas.length - 1; i >= 1; i--) {
    if (String(filas[i][1]) === ref) {
      return { success: true, llego: true, estado: filas[i][3], monto: filas[i][4], medio: filas[i][5], firmaValida: filas[i][6] === 'SÍ', idWompi: filas[i][2] };
    }
  }
  return { success: true, llego: false };
}
