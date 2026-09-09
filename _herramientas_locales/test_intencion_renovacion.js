/**
 * Prueba la logica REAL de "respetar lo que pidio el formulario", extraida de
 * backend/1- REGISTRO DE INMUEBLE.js. No es una copia: se lee del archivo.
 *
 * Lo que se protege aqui: que una renovacion NUNCA acabe creando un inmueble
 * nuevo, y que si el inmueble elegido no se puede confirmar NO se escriba sobre
 * una fila cualquiera (mejor no resolver que resolver mal).
 */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../backend/1- REGISTRO DE INMUEBLE.js'), 'utf8');
const ini = src.indexOf('function leerFlujoSolicitado');
const fin = src.indexOf('// DETERMINACIÓN DEL TIPO DE REGISTRO');
if (ini === -1 || fin === -1) { console.error('No se encontraron las funciones'); process.exit(1); }
const codigo = src.slice(ini, fin);

// --- entorno simulado de Apps Script ---
const props = {};
const Logger = { log() {} };
const PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = v; },
  deleteProperty: k => { delete props[k]; }
})};

const carpeta = (nombre, hijas = []) => ({
  _n: nombre, _h: hijas,
  getName() { return this._n; },
  getId() { return 'id_' + this._n; },
  getFolders() { let i = 0; const h = this._h; return { hasNext: () => i < h.length, next: () => h[i++] }; }
});

let sheetFilas = [];
const hoja = {
  getLastColumn: () => 3,
  getRange: (fila, col) => ({
    getValues: () => [['CODIGO DE REGISTRO', 'ID DE REGISTRO', 'OTRA']],
    getValue: () => (sheetFilas[fila] ? sheetFilas[fila][col - 1] : ''),
    setValue: () => {}
  })
};

const fab = new Function('Logger','PropertiesService','getFolderByName','determinarCarpetaNegocio',
  'buscarFilaPorIdRegistro','buscarFilaPorCDRParcial','leerIdRegistroDeFila','getColumnByName',
  codigo + '; return {leerFlujoSolicitado, resolverPorIntencion, buscarREGPorCDREnTodasLasCarpetas, marcarAvisoRenovacionNoResuelta};');

let fallos = 0;
const t = (n, real, esp) => {
  const ok = JSON.stringify(real) === JSON.stringify(esp);
  if (!ok) fallos++;
  console.log(`${ok ? '✅' : '❌'} ${n}`);
  if (!ok) { console.log('     esperado:', JSON.stringify(esp)); console.log('     real    :', JSON.stringify(real)); }
};

// ---------- montaje ----------
const CDR = 'REG_01-09-2025-C23_(TV 57 #104B-65/85)_APTO-203';
const regReal = carpeta(CDR);
const inmuebles = carpeta('INMUEBLES', [
  carpeta('ARRIENDO', [carpeta('PLANTILLA #2'), regReal]),
  carpeta('VENTA', []), carpeta('BI-NEGOCIO', [])
]);
const getFolderByName = (padre, n) => padre._h.find(x => x._n === n) || null;
const determinarCarpetaNegocio = tn => tn === 'Venta' ? 'VENTA'
  : (tn === 'Admi-Venta' || tn === 'Vendi-Renta') ? 'BI-NEGOCIO' : 'ARRIENDO';

const armar = (opts = {}) => fab(Logger, PropertiesService, getFolderByName, determinarCarpetaNegocio,
  opts.porId || (() => 28), opts.porCdr || (() => -1), () => 'NH579616', () => 0);

// ---------- 1. leer la intencion ----------
let F = armar();
t('sin intencion guardada -> null', F.leerFlujoSolicitado('IX730362'), null);
props['FLUJO_SOLICITADO_IX730362'] = JSON.stringify({flujo:'renovacion', idOriginal:'NH579616', cdrOriginal:CDR});
t('lee la intencion', F.leerFlujoSolicitado('IX730362').flujo, 'renovacion');
t('se consume: la segunda vez ya no esta', F.leerFlujoSolicitado('IX730362'), null);

// ---------- 2. localizar la carpeta REG ----------
t('encuentra el REG por CDR', F.buscarREGPorCDREnTodasLasCarpetas(inmuebles, CDR).carpeta, 'ARRIENDO');
t('CDR inexistente -> null', F.buscarREGPorCDREnTodasLasCarpetas(inmuebles, 'REG_NO_EXISTE'), null);
t('no confunde con PLANTILLA #2', F.buscarREGPorCDREnTodasLasCarpetas(inmuebles, 'PLANTILLA #2'), null);

// ---------- 3. resolver la intencion ----------
sheetFilas = []; sheetFilas[28] = [CDR, 'NH579616', ''];
const rpr = { folder: carpeta('RPR', [inmuebles]) };

let r = armar().resolverPorIntencion(hoja, rpr, {tipoNegocio:'Administración'},
  {flujo:'renovacion', idOriginal:'NH579616', cdrOriginal:CDR});
t('renovacion -> TIPO_2', r.tipo, 'TIPO_2');
t('   apunta a la fila original', r.filaOriginal, 28);
t('   reutiliza el REG existente', r.regExistenteNombre, CDR);

r = armar().resolverPorIntencion(hoja, rpr, {tipoNegocio:'Venta'},
  {flujo:'cambio_negocio', idOriginal:'NH579616', cdrOriginal:CDR});
t('cambio a Venta -> TIPO_4', r.tipo, 'TIPO_4');
t('   de ARRIENDO a VENTA', r.carpetaOrigen + '->' + r.carpetaDestino, 'ARRIENDO->VENTA');

r = armar().resolverPorIntencion(hoja, rpr, {tipoNegocio:'Administración'},
  {flujo:'cambio_negocio', idOriginal:'NH579616', cdrOriginal:CDR});
t('cambio que NO cambia de carpeta -> TIPO_2', r.tipo, 'TIPO_2');

// ---------- 4. lo que NO se debe resolver ----------
r = armar({porId: () => -1, porCdr: () => -1}).resolverPorIntencion(hoja, rpr, {tipoNegocio:'Administración'},
  {flujo:'renovacion', idOriginal:'NO_EXISTE', cdrOriginal:''});
t('fila original inexistente -> null (no inventa)', r, null);

sheetFilas[28] = ['', 'NH579616', ''];   // fila sin CDR
r = armar().resolverPorIntencion(hoja, rpr, {tipoNegocio:'Administración'},
  {flujo:'renovacion', idOriginal:'NH579616', cdrOriginal:CDR});
t('fila sin CODIGO DE REGISTRO -> null', r, null);

sheetFilas[28] = ['REG_OTRO_INMUEBLE', 'NH579616', ''];
r = armar().resolverPorIntencion(hoja, rpr, {tipoNegocio:'Administración'},
  {flujo:'renovacion', idOriginal:'NH579616', cdrOriginal:CDR});
t('el REG de esa fila ya no existe en Drive -> null', r, null);

sheetFilas[28] = [CDR, 'NH579616', ''];
r = armar().resolverPorIntencion(hoja, {folder: carpeta('RPR', [])}, {tipoNegocio:'Administración'},
  {flujo:'renovacion', idOriginal:'NH579616', cdrOriginal:CDR});
t('RPR sin carpeta INMUEBLES -> null', r, null);

console.log(fallos === 0 ? '\nTODAS PASAN' : `\n${fallos} FALLAN`);
process.exit(fallos ? 1 : 0);
