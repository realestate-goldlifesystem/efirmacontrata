// ==========================================
// VALOR DE LA ADMINISTRACIÓN DESDE EL PANEL DE VALIDACIÓN
// ==========================================
//
// En el recibo de administración el panel no lee ninguna referencia con OCR: muestra el
// valor de la administración que tiene el CRM para compararlo con el recibo y corregirlo.
// Ese valor es el que usa el contrato (cláusula de administración) y con él se calcula el
// canon: precio de promoción − administración (canonSinAdministracion, GESTOR_CONTRATOS.js).
//
// Las columnas se buscan SIEMPRE por su nombre en la fila de encabezados, nunca por posición.

const ADM_HOJA = '1.1 - INMUEBLES REGISTRADOS';
const ADM_COL_VALOR = 'PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)';
const ADM_COL_LETRA = 'PRECIO DE ADMINISTRACION PLENA EN LETRA';
const ADM_COL_PROMOCION = 'PRECIO DE PROMOCION GENERAL';

/** Posición (base 1) de una columna por su nombre; 0 si no existe. */
function admColumna(headers, nombre) {
  const buscado = nombre.trim().toUpperCase();
  return headers.findIndex(h => String(h || '').trim().toUpperCase() === buscado) + 1;
}

/** Lo que haya en la celda ($495.000, "495.000", 495000) → 495000. */
function admPesos(valor) {
  if (typeof valor === 'number') return isFinite(valor) && valor > 0 ? Math.round(valor) : 0;
  const s = String(valor === null || valor === undefined ? '' : valor).replace(/[,.]\d{1,2}\s*$/, ''); // centavos
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

/** Hoja, encabezados y fila del registro (CDR o ID de registro). */
function admUbicar(cdr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADM_HOJA);
  if (!sheet) throw new Error('No se encontró la hoja ' + ADM_HOJA);
  const fila = buscarFilaPorCDR(cdr);
  if (!fila) throw new Error('Registro no encontrado: ' + cdr);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colValor = admColumna(headers, ADM_COL_VALOR);
  if (!colValor) throw new Error('No existe la columna "' + ADM_COL_VALOR + '"');
  return {
    sheet: sheet,
    fila: fila,
    colValor: colValor,
    colLetra: admColumna(headers, ADM_COL_LETRA),
    colPromocion: admColumna(headers, ADM_COL_PROMOCION)
  };
}

/**
 * Valor de la administración y precio de promoción del registro, para el panel.
 * @param {string} cdr CDR o ID de registro
 * @return {{success: boolean, administracion: number, precioPromocion: number, message?: string}}
 */
function obtenerValorAdministracion(cdr) {
  try {
    const u = admUbicar(cdr);
    return {
      success: true,
      administracion: admPesos(u.sheet.getRange(u.fila, u.colValor).getValue()),
      precioPromocion: u.colPromocion ? admPesos(u.sheet.getRange(u.fila, u.colPromocion).getValue()) : 0
    };
  } catch (e) {
    Logger.log('obtenerValorAdministracion: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Corrige el valor de la administración en el CRM, con su versión en letras.
 * @param {string} cdr CDR o ID de registro
 * @param {number} valor pesos, sin decimales; 0 = el inmueble no paga administración
 * @return {{success: boolean, administracion: number, anterior: number, message?: string}}
 */
function actualizarValorAdministracion(cdr, valor) {
  const lock = LockService.getScriptLock();
  try {
    const n = Math.round(Number(valor));
    if (!isFinite(n) || n < 0) throw new Error('Valor inválido: ' + valor);

    lock.waitLock(15000);
    const u = admUbicar(cdr);
    const anterior = admPesos(u.sheet.getRange(u.fila, u.colValor).getValue());
    u.sheet.getRange(u.fila, u.colValor).setValue(n);
    // Mismo formato que dejó el registro del inmueble: "CUATROCIENTOS NOVENTA Y CINCO MIL PESOS COP"
    if (u.colLetra) u.sheet.getRange(u.fila, u.colLetra).setValue(n ? ccEnLetras(n) + ' PESOS COP' : '');

    Logger.log('💰 Administración de ' + cdr + ': ' + anterior + ' → ' + n + ' (desde el panel de validación)');
    return { success: true, administracion: n, anterior: anterior };
  } catch (e) {
    Logger.log('actualizarValorAdministracion: ' + e.message);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
