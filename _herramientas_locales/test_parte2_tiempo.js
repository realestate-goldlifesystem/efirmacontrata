// Prueba del corte por tiempo de la Parte 2 del registro, SIN tocar Drive.
//
// Usa la función REAL copiarContenidoFaltante de backend/2- REGISTRO DE INMUEBLE.js
// con carpetas simuladas y un reloj falso, para comprobar que:
//   1. corta antes de los 6 minutos en vez de morir,
//   2. la siguiente pasada continúa donde quedó,
//   3. al terminar la copia es EXACTA (sin duplicados ni faltantes),
//   4. ninguna pasada se pasa del límite de Google.
const fs = require('fs');
const path = require('path');

const SEIS_MIN = 6 * 60 * 1000;
const PRESUPUESTO = 4.5 * 60 * 1000;   // el mismo margen que usa la Parte 2
// Ritmo medido en producción el 21-09-2026: PLANTILLA #1 tardó ~4 min (1:06:59
// a 1:10:57) para ~125 elementos ≈ 1,9 s por operación.
const MS_POR_OPERACION = 1900;

// ---- Reloj falso -----------------------------------------------------------
let ahora = 0;
class RelojFalso {
  constructor() { this.t = ahora; }
  getTime() { return this.t; }
}

// ---- Carpetas simuladas ----------------------------------------------------
const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };

class CarpetaFalsa {
  constructor(nombre) { this.nombre = nombre; this.carpetas = []; this.archivos = []; }
  getName() { return this.nombre; }
  getFiles() { return iter(this.archivos.slice()); }
  getFolders() { return iter(this.carpetas.slice()); }
  getFoldersByName(n) { return iter(this.carpetas.filter(c => c.nombre === n)); }
  createFolder(n) { ahora += MS_POR_OPERACION; const c = new CarpetaFalsa(n); this.carpetas.push(c); return c; }
  agregarArchivo(n) { this.archivos.push({ getName: () => n, makeCopy: (nombre, destino) => { ahora += MS_POR_OPERACION; destino.archivos.push({ getName: () => nombre, makeCopy: () => {} }); } }); return this; }
}

// Molde parecido al real: 125 carpetas repartidas en varios niveles + archivos
function construirMolde() {
  const raiz = new CarpetaFalsa('PLANTILLA #2');
  const archivos = raiz.createFolder('ARCHIVOS DEL INMUEBLE');
  ['CERTIFICADO DE LIBERTAD Y TRADICIÓN', 'AUTORIZACIONES DE COMERCIALIZACIÓN', 'CONTRATO DE ADMINISTRACIÓN'].forEach(n => archivos.createFolder(n));
  const contenido = archivos.createFolder('CONTENIDO DE PUBLICACIÓN');
  ['VIDEO', 'DESCRIPCIÓN DE LA PUBLICACIÓN', 'FOTOGRAFÍAS', 'CARTEL DE VENTANILLA'].forEach(n => contenido.createFolder(n));
  const cobro = archivos.createFolder('CUENTA DE COBRO A CUENTA EXTERNA');
  cobro.agregarArchivo('CUENTA DE COBRO A CUENTA EXTERNA');

  const entregas = raiz.createFolder('ENTREGAS DEL INMUEBLE');
  const anio = entregas.createFolder('XXXX');
  const soportes = anio.createFolder('SOPORTES CONTABLES');
  ['1- RECIBOS', '2- COMPROBANTES DE PAGO - ADMINISTRACIÓN DEL INMUEBLE', '3- RECIBOS DE GESTION - REAL ESTATE Gold Life System'].forEach(n => {
    const c = soportes.createFolder(n);
    for (let m = 1; m <= 12; m++) c.createFolder('MES #' + m);
  });
  const inquilino = anio.createFolder('DOCUMENTOS DE ENTREGA - INQUILINO');
  const pagos = inquilino.createFolder('1- COMPROBANTES DE PAGO DEL INMUEBLE');
  const arriendo = pagos.createFolder('COMPROBANTES DE ARRIENDO');
  for (let m = 1; m <= 12; m++) arriendo.createFolder('MES #' + m);
  const servicios = pagos.createFolder('COMPROBANTES DE SERVICIOS PÚBLICOS');
  ['1. AGUA', '2. LUZ', '3. GAS'].forEach(s => { const c = servicios.createFolder(s); for (let m = 1; m <= 12; m++) c.createFolder('MES #' + m); });
  const inv = inquilino.createFolder('3- INVENTARIO Y MANUAL DE CONVIVENCIA').createFolder('INVENTARIO');
  ['1- INVENTARIO', 'FOTOGRAFIAS', 'VIDEOS'].forEach(n => inv.createFolder(n));
  anio.createFolder('DOCUMENTOS DE LA ASEGURADORA');
  anio.createFolder('ACTAS DE ENTREGA A PROPIETARIO');
  return raiz;
}

const contar = (c) => c.carpetas.reduce((n, h) => n + contar(h), c.carpetas.length);
const rutas = (c, ruta = '') => c.carpetas.flatMap(h => [ruta + '/' + h.nombre, ...rutas(h, ruta + '/' + h.nombre)]);

// ---- Función REAL del backend, con el reloj y los globales inyectados ------
const src = fs.readFileSync(path.join(__dirname, '../backend/2- REGISTRO DE INMUEBLE.js'), 'utf8');
const ini = src.indexOf('function copiarContenidoFaltante(');
const fin = src.indexOf('\n}', ini) + 2;
const sandbox = new Function('Date', `
  var LIMITE_PARTE2 = 0;
  var CORTE_POR_TIEMPO = '__TIEMPO_PARTE2__';
  ${src.slice(ini, fin)}
  return { copiar: copiarContenidoFaltante, fijarLimite: function (v) { LIMITE_PARTE2 = v; }, CORTE: CORTE_POR_TIEMPO };
`)(RelojFalso);

// ---- La prueba -------------------------------------------------------------
// Caso REAL que falló: TIPO 1 (propietario nuevo) = PLANTILLA #1 al RPR y
// después PLANTILLA #2 al REG, todo dentro de la misma ejecución.
const moldeRpr = construirMolde();
const moldeReg = construirMolde();
const totalMolde = contar(moldeRpr) + contar(moldeReg);
ahora = 0;                                   // el reloj falso arranca limpio

const rpr = new CarpetaFalsa('RPR-99-0001');
const destino = new CarpetaFalsa('REG_NUEVO');
const copiado = () => contar(rpr) + contar(destino);
let pasadas = 0, duracionMax = 0;
while (pasadas < 20) {
  pasadas++;
  const inicioPasada = ahora;
  sandbox.fijarLimite(inicioPasada + PRESUPUESTO);
  let cortada = false;
  try {
    sandbox.copiar(moldeRpr, rpr);           // plantilla del propietario
    sandbox.copiar(moldeReg, destino);       // plantilla del inmueble
  }
  catch (e) {
    if (e.message !== sandbox.CORTE) throw e;
    cortada = true;
  }
  const duracion = ahora - inicioPasada;
  duracionMax = Math.max(duracionMax, duracion);
  console.log(`Pasada ${pasadas}: ${(duracion / 1000).toFixed(0)}s · carpetas copiadas: ${copiado()}/${totalMolde}${cortada ? ' · CORTADA por tiempo, se relanza' : ' · completada'}`);
  if (!cortada) break;
  ahora += 1000;                             // espera del relanzamiento (1 s)
}

const faltan = rutas(moldeRpr).filter(r => !rutas(rpr).includes(r))
  .concat(rutas(moldeReg).filter(r => !rutas(destino).includes(r)));
// Los duplicados se miran DENTRO de cada carpeta por separado: RPR y REG
// copian el mismo molde, así que sus rutas coinciden entre sí sin ser un error.
const hayRepetidas = (c) => { const r = rutas(c); return r.length !== new Set(r).size; };
const duplicadas = hayRepetidas(rpr) || hayRepetidas(destino);

console.log('\n--- Resultado');
const ok = [
  ['termina', pasadas < 20],
  ['estructura completa (sin faltantes)', faltan.length === 0],
  ['sin carpetas duplicadas', !duplicadas],
  ['ninguna pasada supera los 6 min de Google', duracionMax < SEIS_MIN],
];
ok.forEach(([n, v]) => console.log(`${v ? '✅' : '❌'} ${n}`));
console.log(`\nPasadas necesarias: ${pasadas} · pasada más larga: ${(duracionMax / 1000).toFixed(0)}s · carpetas: ${copiado()}/${totalMolde}`);
const okEscenario1 = ok.every(([, v]) => v);

// ============================================================
// ESCENARIO 2: dos registros casi al mismo tiempo
// ============================================================
// La Parte 2 toma SOLO el primero de la cola (el más antiguo por marca de
// llegada) y hay un candado que impide dos ejecuciones a la vez. Se comprueba
// que el segundo espera su turno y que ninguno queda a medias ni mezclado.
console.log('\n\n=== ESCENARIO 2: dos registros seguidos ===');
ahora = 0;
const cola = [
  { id: 'REG-A', llegada: 0, moldes: [construirMolde(), construirMolde()], destinos: [new CarpetaFalsa('RPR-A'), new CarpetaFalsa('REG-A')] },
  { id: 'REG-B', llegada: 30 * 1000, moldes: [construirMolde(), construirMolde()], destinos: [new CarpetaFalsa('RPR-B'), new CarpetaFalsa('REG-B')] },
];
const pendientes = () => cola.filter(r => !r.listo).sort((a, b) => a.llegada - b.llegada);
const orden = [];
let pasada = 0;
while (pendientes().length && pasada < 30) {
  pasada++;
  const r = pendientes()[0];                 // igual que el código: solo el primero
  const inicio = ahora;
  sandbox.fijarLimite(inicio + PRESUPUESTO);
  let cortada = false;
  try { r.moldes.forEach((m, i) => sandbox.copiar(m, r.destinos[i])); }
  catch (e) { if (e.message !== sandbox.CORTE) throw e; cortada = true; }
  if (!cortada) r.listo = true;
  orden.push(r.id);
  console.log(`Pasada ${pasada} → ${r.id} · ${((ahora - inicio) / 1000).toFixed(0)}s${cortada ? ' · pausada' : ' · TERMINADO'}`);
  ahora += 1000;
}

const completo = (r) => r.moldes.every((m, i) => rutas(m).every(x => rutas(r.destinos[i]).includes(x)));
const sinRepetir = (r) => r.destinos.every(d => { const x = rutas(d); return x.length === new Set(x).size; });
const seIntercalaron = orden.join(',').includes('REG-B,REG-A');

console.log('\n--- Resultado escenario 2');
[
  ['los dos terminan', cola.every(r => r.listo)],
  ['ninguno queda a medias', cola.every(completo)],
  ['sin carpetas duplicadas', cola.every(sinRepetir)],
  ['el segundo espera al primero (no se intercalan)', !seIntercalaron],
].forEach(([n, v]) => console.log(`${v ? '✅' : '❌'} ${n}`));
console.log(`Orden de atención: ${orden.join(' → ')}`);

const okEscenario2 = cola.every(r => r.listo) && cola.every(completo) && cola.every(sinRepetir) && !seIntercalaron;
process.exit(okEscenario1 && okEscenario2 ? 0 : 1);
