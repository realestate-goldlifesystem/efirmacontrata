// ==========================================
// VALOR DE LA ADMINISTRACIÓN DESDE EL PANEL DE VALIDACIÓN
// ==========================================
//
// En el recibo de administración el panel no lee ninguna referencia con OCR: muestra el
// valor de la administración que tiene el CRM para compararlo con el recibo y corregirlo.
// La pestaña "Valor del arriendo" confirma canon y administración (con o sin administración).
// El canon se guarda en CANON FINAL DEL CONTRATO; si está vacío, el contrato lo calcula
// como precio de promoción − administración (canonSinAdministracion, GESTOR_CONTRATOS.js).
//
// Las columnas se buscan SIEMPRE por su nombre en la fila de encabezados, nunca por posición.

const ADM_HOJA = '1.1 - INMUEBLES REGISTRADOS';
const ADM_COL_VALOR = 'PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)';
const ADM_COL_LETRA = 'PRECIO DE ADMINISTRACION PLENA EN LETRA';
const ADM_COL_PROMOCION = 'PRECIO DE PROMOCION GENERAL';
const ADM_COL_CANON_FINAL = 'CANON FINAL DEL CONTRATO';

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
    colPromocion: admColumna(headers, ADM_COL_PROMOCION),
    colCanonFinal: admColumna(headers, ADM_COL_CANON_FINAL)
  };
}

/** Canon que va al contrato: CANON FINAL DEL CONTRATO; si está vacío, promoción − administración. */
function admCanonDe(u) {
  const final = u.colCanonFinal ? admPesos(u.sheet.getRange(u.fila, u.colCanonFinal).getValue()) : 0;
  if (final) return final;
  const promo = u.colPromocion ? admPesos(u.sheet.getRange(u.fila, u.colPromocion).getValue()) : 0;
  const admin = admPesos(u.sheet.getRange(u.fila, u.colValor).getValue());
  return canonSinAdministracion(promo, admin);
}

/**
 * Canon y administración del registro, para la pestaña "Valor del arriendo".
 * @param {string} cdr CDR o ID de registro
 * @return {{success: boolean, administracion: number, canon: number, precioPromocion: number, message?: string}}
 */
function obtenerValorAdministracion(cdr) {
  try {
    const u = admUbicar(cdr);
    return {
      success: true,
      administracion: admPesos(u.sheet.getRange(u.fila, u.colValor).getValue()),
      canon: admCanonDe(u),
      precioPromocion: u.colPromocion ? admPesos(u.sheet.getRange(u.fila, u.colPromocion).getValue()) : 0
    };
  } catch (e) {
    Logger.log('obtenerValorAdministracion: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Guarda canon y administración confirmados en el panel.
 * - El canon va a CANON FINAL DEL CONTRATO: el contrato lo toma de ahí. Si luego se
 *   edita en el contrato, al generar el original se sobrescribe con lo que quedó
 *   escrito en el documento (GESTOR_CONTRATOS.js), y de ahí salen la cuenta de cobro
 *   y el excedente. El precio de promoción (lo que se publica) no se toca.
 * - La administración va a su columna, con su versión en letras.
 * @param {string} cdr CDR o ID de registro
 * @param {number} valor administración en pesos; 0 = el inmueble no paga administración
 * @param {number=} canon canon en pesos; si no llega, el canon no se toca
 * @return {{success: boolean, administracion: number, anterior: number, canon: number, message?: string}}
 */
function actualizarValorAdministracion(cdr, valor, canon) {
  const lock = LockService.getScriptLock();
  try {
    const n = Math.round(Number(valor));
    if (!isFinite(n) || n < 0) throw new Error('Valor inválido: ' + valor);
    const conCanon = canon !== undefined && canon !== null && canon !== '';
    const c = conCanon ? Math.round(Number(canon)) : 0;
    if (conCanon && (!isFinite(c) || c <= 0)) throw new Error('Canon inválido: ' + canon);

    lock.waitLock(15000);
    const u = admUbicar(cdr);
    if (conCanon && !u.colCanonFinal) throw new Error('No existe la columna "' + ADM_COL_CANON_FINAL + '"');
    const anterior = admPesos(u.sheet.getRange(u.fila, u.colValor).getValue());
    u.sheet.getRange(u.fila, u.colValor).setValue(n);
    // Mismo formato que dejó el registro del inmueble: "CUATROCIENTOS NOVENTA Y CINCO MIL PESOS COP"
    if (u.colLetra) u.sheet.getRange(u.fila, u.colLetra).setValue(n ? ccEnLetras(n) + ' PESOS COP' : '');

    if (conCanon) {
      u.sheet.getRange(u.fila, u.colCanonFinal).setValue(c);
      Logger.log('🏠 Canon de ' + cdr + ' confirmado en el panel: ' + c);
    }

    Logger.log('💰 Administración de ' + cdr + ': ' + anterior + ' → ' + n + ' (desde el panel de validación)');
    return { success: true, administracion: n, anterior: anterior, canon: admCanonDe(u) };
  } catch (e) {
    Logger.log('actualizarValorAdministracion: ' + e.message);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
