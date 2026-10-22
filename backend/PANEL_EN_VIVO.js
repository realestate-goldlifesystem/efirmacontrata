// ==========================================
// PANEL DE VALIDACIÓN EN VIVO
// ==========================================
//
// El panel pregunta aquí cada pocos segundos si algo cambió, en vez de recargar
// todas sus tarjetas: leer las tarjetas completas es lento (obtenerRegistrosInquilinos
// y compañía leen celda por celda), y esto solo lee unas pocas columnas de una vez.
// Cuando la huella cambia, el panel recarga sus tarjetas en silencio.

/**
 * Huella de todo lo que el panel muestra. Cambia cuando:
 *  - un inquilino o un propietario envía o corrige su formulario, o el administrador
 *    aprueba o pide corrección (estado, detalles y estado documental del inmueble);
 *  - una de las partes aprueba o comenta el borrador del contrato (bitácora de aprobaciones);
 *  - entra, se consolida o se reembolsa un pago.
 * @return {{success: boolean, huella: string}}
 */
function obtenerHuellaPanel() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const partes = [];

    const inmuebles = ss.getSheetByName('1.1 - INMUEBLES REGISTRADOS');
    if (inmuebles && inmuebles.getLastRow() > 1) {
      const filas = inmuebles.getLastRow() - 1;
      const headers = inmuebles.getRange(1, 1, 1, inmuebles.getLastColumn()).getValues()[0];
      ['CODIGO DE REGISTRO', 'ESTADO DEL INMUEBLE', 'DETALLES DEL ESTADO DEL INMUEBLE', 'ESTADO DOCUMENTAL'].forEach(function (nombre) {
        const col = headers.indexOf(nombre) + 1;
        if (col > 0) partes.push(JSON.stringify(inmuebles.getRange(2, col, filas, 1).getValues()));
      });
    }

    // La bitácora solo crece: basta con cuántas filas tiene.
    const aprobaciones = ss.getSheetByName('LOG_APROBACIONES_CONTRATO');
    partes.push(aprobaciones ? String(aprobaciones.getLastRow()) : '0');

    const pagos = ss.getSheetByName('PAGOS_RECIBIDOS');
    if (pagos && pagos.getLastRow() > 1) {
      partes.push(JSON.stringify(pagos.getRange(2, 3, pagos.getLastRow() - 1, 3).getValues())); // CDR, monto, estado
    }

    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, partes.join('|'), Utilities.Charset.UTF_8);
    const huella = digest.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
    return { success: true, huella: huella };
  } catch (e) {
    Logger.log('Error en obtenerHuellaPanel: ' + e.message);
    return { success: false, huella: '' };
  }
}
