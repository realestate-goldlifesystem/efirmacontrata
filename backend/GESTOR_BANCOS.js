/**
 * LISTA DE BANCOS SIEMPRE AL DÍA — oct-2026
 *
 * Fuente: las entidades de PSE que publica Mercado Pago
 * (GET /v1/payment_methods → el método "pse" → financial_institutions).
 *
 * NO usa ninguna tarea automática. La copia se guarda en la propiedad
 * CACHE_BANCOS_COLOMBIA y se refresca sola cuando alguien abre un formulario
 * (inquilino o propietario) y la copia ya tiene más de BANCOS_DIAS_VIGENCIA días.
 * Como el inquilino siempre entra antes que el propietario, cuando el
 * propietario llega la lista ya está al día.
 *
 * El formulario trae su propia lista fija y a esa le SUMA lo de aquí
 * (frontend/js/bancos.js). Si Mercado Pago falla, se sigue sirviendo la última
 * copia buena y, si no hay ninguna, el formulario se queda con la fija.
 *
 * Reemplaza a la simulación que había en UTIL_Triggers.js (12 bancos escritos a
 * mano, uno de ellos inventado: "Banco Nuevo Colombia (Test API)").
 */

const BANCOS_PROPIEDAD = 'CACHE_BANCOS_COLOMBIA';
const BANCOS_DIAS_VIGENCIA = 7;
const BANCOS_HORAS_ENTRE_REINTENTOS = 6;   // si Mercado Pago falla, no insistir en cada apertura
const BANCOS_MINIMO_CREIBLE = 10;          // menos que esto no es la lista de PSE: se descarta

// ---------- Puras (probadas en _herramientas_locales/test_bancos.js) ----------

/** De la respuesta de /v1/payment_methods, los nombres de las entidades de PSE. */
function bcoExtraerDeMercadoPago(metodos) {
  if (!Array.isArray(metodos)) return [];
  const pse = metodos.filter(m => m && String(m.id || '').toLowerCase() === 'pse')[0];
  const entidades = pse && Array.isArray(pse.financial_institutions) ? pse.financial_institutions : [];
  const vistos = {};
  const nombres = [];
  entidades.forEach(en => {
    const nombre = String((en && en.description) || '').replace(/\s+/g, ' ').trim();
    const k = nombre.toUpperCase();
    if (!nombre || nombre.length > 80 || vistos[k]) return;
    vistos[k] = true;
    nombres.push(nombre);
  });
  return nombres;
}

/**
 * Lee lo guardado. Devuelve { ts, intento, bancos } o null si no sirve.
 * El formato viejo de la simulación (un arreglo de {nombre}) NO sirve: se ignora.
 */
function bcoLeerCopia(texto) {
  try {
    const c = JSON.parse(texto);
    if (!c || Array.isArray(c) || !Array.isArray(c.bancos)) return null;
    const bancos = c.bancos.filter(b => typeof b === 'string' && b.trim());
    if (bancos.length < BANCOS_MINIMO_CREIBLE) return null;
    return { ts: Number(c.ts) || 0, intento: Number(c.intento) || 0, bancos: bancos };
  } catch (e) {
    return null;
  }
}

/** ¿Hay que ir a Mercado Pago ahora? */
function bcoTocaRefrescar(copia, ahoraMs) {
  const HORA = 3600000;
  if (!copia) return true;
  if (ahoraMs - copia.ts < BANCOS_DIAS_VIGENCIA * 24 * HORA) return false;
  return ahoraMs - copia.intento >= BANCOS_HORAS_ENTRE_REINTENTOS * HORA;
}

// ---------- Con servicios ----------

function bcoConsultarMercadoPago() {
  const res = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payment_methods', {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + MP_ACCESS_TOKEN },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Mercado Pago respondió ' + res.getResponseCode());
  const bancos = bcoExtraerDeMercadoPago(JSON.parse(res.getContentText()));
  if (bancos.length < BANCOS_MINIMO_CREIBLE) throw new Error('Mercado Pago devolvió solo ' + bancos.length + ' entidades');
  return bancos;
}

/**
 * Lo que llama el formulario (accion=obtenerBancos).
 * @param {boolean} forzar  ir a Mercado Pago aunque la copia esté vigente
 * @return {{success:boolean, bancos:string[], actualizado:string}}
 */
function obtenerBancosParaFormulario(forzar) {
  const props = PropertiesService.getScriptProperties();
  let copia = bcoLeerCopia(props.getProperty(BANCOS_PROPIEDAD));
  const ahora = Date.now();

  if (forzar || bcoTocaRefrescar(copia, ahora)) {
    try {
      copia = { ts: ahora, intento: ahora, bancos: bcoConsultarMercadoPago() };
      Logger.log('🏦 Bancos actualizados desde Mercado Pago: ' + copia.bancos.length);
    } catch (e) {
      Logger.log('⚠️ No se pudo actualizar la lista de bancos: ' + e.message);
      if (copia) copia.intento = ahora;        // se conserva la última buena y se espera para reintentar
    }
    if (copia) props.setProperty(BANCOS_PROPIEDAD, JSON.stringify(copia));
  }

  return {
    success: true,
    bancos: copia ? copia.bancos : [],
    actualizado: copia && copia.ts ? new Date(copia.ts).toISOString() : ''
  };
}

/** Para correr a mano desde el editor: trae la lista ya mismo y la muestra. */
function actualizarBancosAhora() {
  const r = obtenerBancosParaFormulario(true);
  Logger.log(r.bancos.length + ' entidades (actualizado ' + r.actualizado + '):\n' + r.bancos.join('\n'));
}
