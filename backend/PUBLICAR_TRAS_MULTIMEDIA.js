// ==========================================
// PUBLICAR SOLO TRAS CARGAR EL CONTENIDO (21-nov-2026)
// ==========================================
// Al firmar el acuerdo el inmueble queda en ACTIVO y no se publica hasta tener
// fotos y video. Cuando la carga de multimedia termina (o se reutiliza la de una
// renovación), a los 30 segundos el estado pasa a ACTUALIZAR, que publica según
// el tipo de negocio (PUBLICADO ARRIENDO / VENTA / VENTA-RENTA), igual que si el
// agente lo cambiara a mano en el Sheet.
//
// La espera va en un trigger de un solo uso, no en Utilities.sleep: así la
// página de carga recibe su respuesta enseguida. Los inmuebles en espera viven en
// una cola en las propiedades del script, por si se cargan varios seguidos.

var PUBLICAR_TRAS_MM = {
  PROP: 'PUBLICAR_TRAS_MULTIMEDIA',
  ESPERA_MS: 30000,
  FUNCION: 'publicarTrasMultimedia',
  ESTADO_ORIGEN: 'ACTIVO'
};

function colaPublicarTrasMm_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(PUBLICAR_TRAS_MM.PROP) || '[]') || []; }
  catch (e) { return []; }
}

function guardarColaPublicarTrasMm_(cola) {
  const props = PropertiesService.getScriptProperties();
  if (cola.length) props.setProperty(PUBLICAR_TRAS_MM.PROP, JSON.stringify(cola));
  else props.deleteProperty(PUBLICAR_TRAS_MM.PROP);
}

/** Deja un solo trigger en camino, que corra dentro de ms milisegundos. */
function programarTriggerPublicarTrasMm_(ms) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === PUBLICAR_TRAS_MM.FUNCION) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger(PUBLICAR_TRAS_MM.FUNCION).timeBased().after(Math.max(1000, ms)).create();
}

/**
 * Lo llaman handleFinalizeMultimedia y handleReutilizarMultimedia (API_MULTIMEDIA.js)
 * al terminar. Solo actúa si el inmueble sigue en ACTIVO: uno ya publicado (por
 * ejemplo, al subir solo el video que faltaba) no se toca.
 */
function programarPublicacionTrasMultimedia_(sheet, fila, id) {
  try {
    const cEstado = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.ESTADO);
    const estado = String(sheet.getRange(fila, cEstado).getValue() || '').trim().toUpperCase();
    if (estado !== PUBLICAR_TRAS_MM.ESTADO_ORIGEN) return false;
    const cola = colaPublicarTrasMm_().filter(x => x.id !== String(id));
    cola.push({ id: String(id), cuando: Date.now() + PUBLICAR_TRAS_MM.ESPERA_MS });
    guardarColaPublicarTrasMm_(cola);
    programarTriggerPublicarTrasMm_(Math.min.apply(null, cola.map(x => x.cuando)) - Date.now());
    const cDet = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.DETALLES);
    if (cDet > 0) sheet.getRange(fila, cDet).setValue('✅ Contenido cargado. ⏳ Se publica en unos segundos…');
    return true;
  } catch (e) {
    Logger.log('No se pudo programar la publicación tras la multimedia: ' + e.message);
    return false;
  }
}

/** Fila por ID DE REGISTRO o CODIGO DE REGISTRO (la página de carga manda cualquiera de los dos). */
function filaPorIdRegistro_(sheet, id) {
  const enc = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
  const cols = ['ID DE REGISTRO', 'CODIGO DE REGISTRO'].map(n => enc.indexOf(n)).filter(c => c !== -1);
  if (!cols.length || sheet.getLastRow() < 2) return -1;
  const vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, enc.length).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (cols.some(c => String(vals[i][c]).trim() === id)) return i + 2;
  }
  return -1;
}

/** Trigger: pasa a ACTUALIZAR los inmuebles cuya espera ya terminó. */
function publicarTrasMultimedia() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === PUBLICAR_TRAS_MM.FUNCION) ScriptApp.deleteTrigger(t);
  });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) { programarTriggerPublicarTrasMm_(30000); return; }
  let resto = [];
  try {
    const ahora = Date.now();
    const cola = colaPublicarTrasMm_();
    const listos = cola.filter(x => x.cuando <= ahora + 2000);
    resto = cola.filter(x => x.cuando > ahora + 2000);
    if (!listos.length) return;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ESTADOS_CONFIG.HOJA_PRINCIPAL);
    const cEstado = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.ESTADO);
    const cDet = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.DETALLES);
    listos.forEach(x => {
      try {
        const fila = filaPorIdRegistro_(sheet, x.id);
        if (fila < 2) return;
        const estado = String(sheet.getRange(fila, cEstado).getValue() || '').trim().toUpperCase();
        // Si alguien ya lo movió a mano en estos 30 segundos, se respeta
        if (estado !== PUBLICAR_TRAS_MM.ESTADO_ORIGEN) return;
        sheet.getRange(fila, cEstado).setValue(ESTADOS_SISTEMA.ACTUALIZAR);
        // El onEdit no corre con escrituras por código: se aplica a mano
        procesarCambioEstado(sheet, fila, ESTADOS_SISTEMA.ACTUALIZAR, cEstado, cDet);
        SpreadsheetApp.flush();
        Logger.log('📣 ' + x.id + ' publicado tras cargar la multimedia.');
      } catch (e) {
        Logger.log('No se pudo publicar ' + x.id + ' tras la multimedia: ' + e.message);
      }
    });
  } finally {
    guardarColaPublicarTrasMm_(resto);
    if (resto.length) programarTriggerPublicarTrasMm_(Math.min.apply(null, resto.map(x => x.cuando)) - Date.now());
    lock.releaseLock();
  }
}
