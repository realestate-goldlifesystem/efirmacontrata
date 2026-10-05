// Prueba local de las funciones PURAS de backend/GESTOR_CUENTA_COBRO.js:
// leer el canon del contrato, interpretar el porcentaje, calcular honorarios,
// pasar a letras y el control de cifras ajenas.
//
// Uso: node test_cuenta_cobro.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../backend/GESTOR_CUENTA_COBRO.js'), 'utf8');
// Solo la parte pura: desde el inicio hasta la sección de HOJA
const pura = fuente.slice(0, fuente.indexOf('// HOJA'));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(pura, ctx);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}

// --- Leer el canon del contrato ---
igual('canon: cláusula real', ctx.ccExtraerCanonDeTexto('QUINTA: PRECIO DEL CANON: $2.645.000 pesos m/cte. que el Arrendatario pagará'), 2645000);
igual('canon: con espacio tras $', ctx.ccExtraerCanonDeTexto('PRECIO DEL CANON: $ 3.100.000 pesos'), 3100000);
igual('canon: sin dos puntos', ctx.ccExtraerCanonDeTexto('PRECIO DEL CANON $2.500.000.'), 2500000);
igual('canon: punto final pegado', ctx.ccExtraerCanonDeTexto('PRECIO DEL CANON: $2.645.000. El arrendatario'), 2645000);
igual('canon: con centavos', ctx.ccExtraerCanonDeTexto('PRECIO DEL CANON: $2.645.000,00 pesos'), 2645000);
igual('canon: minúsculas y salto de línea', ctx.ccExtraerCanonDeTexto('quinta: precio del\ncanon: $1.800.000'), 1800000);
igual('canon: no toma la administración', ctx.ccExtraerCanonDeTexto('SEPTIMA: CUOTAS DE ADMINISTRACIÓN: la suma de $455.000 pesos'), 0);
igual('canon: marcador sin llenar', ctx.ccExtraerCanonDeTexto('PRECIO DEL CANON: {{PRECIO-DEL-CANON-EN-NUMERO}} pesos'), 0);
igual('canon: valor absurdo (muy bajo)', ctx.ccExtraerCanonDeTexto('PRECIO DEL CANON: $2.645 pesos'), 0);
igual('canon: valor absurdo (muy alto)', ctx.ccExtraerCanonDeTexto('PRECIO DEL CANON: $2.645.000.000 pesos'), 0);
igual('canon: texto vacío', ctx.ccExtraerCanonDeTexto(''), 0);

// --- Porcentaje ---
igual('pct "50%"', ctx.ccPorcentaje('50%'), 0.5);
igual('pct "68 %"', ctx.ccPorcentaje('68 %'), 0.68);
igual('pct 0.6 (número con formato %)', ctx.ccPorcentaje(0.6), 0.6);
igual('pct 60 (número)', ctx.ccPorcentaje(60), 0.6);
igual('pct "100%"', ctx.ccPorcentaje('100%'), 1);
igual('pct "12,5%"', ctx.ccPorcentaje('12,5%'), 0.125);
igual('pct vacío', ctx.ccPorcentaje(''), 0);
igual('pct texto', ctx.ccPorcentaje('N/A'), 0);
igual('pct 150% no es válido', ctx.ccPorcentaje('150%'), 0);

// --- Honorarios (casos reales de la hoja) ---
const h = (d) => { const r = ctx.ccCalcularHonorarios(d); return [r.aplica, r.valor]; };
igual('YX454035: 2.645.000 × 50%', h({ tipoNegocio: 'Corretaje', canon: 2645000, pctCorretaje: '50%' }), [true, 1322500]);
igual('SK142795: 2.459.300 × 60%', h({ tipoNegocio: 'Corretaje', canon: 2459300, pctCorretaje: '60%' }), [true, 1475580]);
igual('PA504607: 3.950.000 × 68%', h({ tipoNegocio: 'Corretaje', canon: 3950000, pctCorretaje: '68%' }), [true, 2686000]);
igual('Vendi-Renta usa SU columna', h({ tipoNegocio: 'Vendi-Renta', canon: 2000000, pctCorretaje: '', pctVendiRenta: '50%' }), [true, 1000000]);
igual('Vendi-Renta sin su columna no toma la de corretaje', h({ tipoNegocio: 'Vendi-Renta', canon: 2000000, pctCorretaje: '50%', pctVendiRenta: '' }), [false, 0]);
igual('sin canon → no aplica', h({ tipoNegocio: 'Corretaje', canon: '', pctCorretaje: '50%' }), [false, 0]);
igual('sin porcentaje → no aplica', h({ tipoNegocio: 'Corretaje', canon: 2645000, pctCorretaje: '' }), [false, 0]);
igual('Administración → no aplica', h({ tipoNegocio: 'Administración', canon: 2645000, pctCorretaje: '50%' }), [false, 0]);
igual('Venta → no aplica', h({ tipoNegocio: 'Venta', canon: 2645000, pctCorretaje: '50%' }), [false, 0]);
igual('Administración se marca como "no aplica por negocio"', !!ctx.ccCalcularHonorarios({ tipoNegocio: 'Venta' }).noAplicaPorNegocio, true);
igual('falta de canon NO es "no aplica por negocio"', !!ctx.ccCalcularHonorarios({ tipoNegocio: 'Corretaje', pctCorretaje: '50%' }).noAplicaPorNegocio, false);

// --- En letras ---
const L = ctx.ccEnLetras;
igual('letras 1.322.500', L(1322500), 'UN MILLÓN TRESCIENTOS VEINTIDÓS MIL QUINIENTOS');
igual('letras 1.475.580', L(1475580), 'UN MILLÓN CUATROCIENTOS SETENTA Y CINCO MIL QUINIENTOS OCHENTA');
igual('letras 2.686.000', L(2686000), 'DOS MILLONES SEISCIENTOS OCHENTA Y SEIS MIL');
igual('letras 2.402.400', L(2402400), 'DOS MILLONES CUATROCIENTOS DOS MIL CUATROCIENTOS');
igual('letras 1.126.250', L(1126250), 'UN MILLÓN CIENTO VEINTISÉIS MIL DOSCIENTOS CINCUENTA');
igual('letras 1.000.000', L(1000000), 'UN MILLÓN DE');
igual('letras 2.000.000', L(2000000), 'DOS MILLONES DE');
igual('letras 1.000', L(1000), 'MIL');
igual('letras 100.000', L(100000), 'CIEN MIL');
igual('letras 101.000', L(101000), 'CIENTO UN MIL');
igual('letras 21.000', L(21000), 'VEINTIÚN MIL');
igual('letras 31.000', L(31000), 'TREINTA Y UN MIL');
igual('letras 1.001.001', L(1001001), 'UN MILLÓN MIL UN');
igual('letras 85.000', L(85000), 'OCHENTA Y CINCO MIL');
igual('letras 999.999.999', L(999999999), 'NOVECIENTOS NOVENTA Y NUEVE MILLONES NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE');
igual('letras 16.000', L(16000), 'DIECISÉIS MIL');
igual('letras 0', L(0), 'CERO');

// --- Formatos ---
igual('miles', ctx.ccMiles(1322500), '1.322.500');
igual('cédula numérica', ctx.ccFormatoCedula(1136884928), '1.136.884.928');
igual('cédula ya con puntos', ctx.ccFormatoCedula('1.136.884.928'), '1.136.884.928');

// --- Control de cifras ajenas (lo que evita mandar la plantilla a medio llenar) ---
const docBueno = 'La suma de X pesos. ($1.322.500) ... HONORARIOS $ 1.322.500 ... TOTAL COBROS :: $ 1.322.500 Cuenta de ahorros: 91291940949';
const docMalo = 'La suma de X pesos. ($1.322.500) ... HONORARIOS $ 1.322.500 ASEO $ 85.000 ... TOTAL :: $ 1.322.500';
igual('cifras: doc limpio', ctx.ccCifrasEnPesos(docBueno), [1322500, 1322500, 1322500]);
igual('cifras: detecta el aseo de la plantilla', ctx.ccCifrasEnPesos(docMalo).filter(c => c !== 1322500), [85000]);
igual('cifras: la cuenta bancaria no cuenta como pesos', ctx.ccCifrasEnPesos('Cuenta de ahorros: 91291940949'), []);

// --- Recibo: fechas ---
igual('fecha 2026-10-05', ctx.ccPartesDeFecha('2026-10-05'), { dia: 5, mes: 'octubre', anio: 2026, corta: '05/10/2026' });
igual('fecha 2026-09-18', ctx.ccPartesDeFecha('2026-09-18'), { dia: 18, mes: 'septiembre', anio: 2026, corta: '18/09/2026' });
igual('fecha con hora', ctx.ccPartesDeFecha('2026-01-01T10:00:00').corta, '01/01/2026');
igual('fecha vacía', ctx.ccPartesDeFecha(''), null);
igual('fecha dd/mm/aaaa no es ISO', ctx.ccPartesDeFecha('05/10/2026'), null);
igual('fecha mes 13', ctx.ccPartesDeFecha('2026-13-01'), null);
igual('fecha texto', ctx.ccPartesDeFecha('ayer'), null);

// --- Recibo: fechas que la hoja entrega como número de serie ---
igual('serial 46296 → 2026-10-01', ctx.ccSerialAFechaISO(46296), '2026-10-01');
igual('serial 46283 → 2026-09-18', ctx.ccSerialAFechaISO(46283), '2026-09-18');
igual('serial 46300 → 2026-10-05', ctx.ccSerialAFechaISO(46300), '2026-10-05');
igual('serial con hora (46283.40)', ctx.ccSerialAFechaISO(46283.40474537037), '2026-09-18');
igual('serial como texto', ctx.ccSerialAFechaISO('46296'), '2026-10-01');
igual('serial vacío', ctx.ccSerialAFechaISO(''), '');
igual('un precio no es una fecha', ctx.ccSerialAFechaISO(2645000), '');
igual('serial muy viejo', ctx.ccSerialAFechaISO(100), '');

// --- Recibo: valores (gestión completa = un canon; lo no cobrado es descuento) ---
igual('recibo YX454035 (50%)', ctx.ccValoresRecibo(2645000, 1322500), { gestion: 2645000, descuento: 1322500, total: 1322500 });
igual('recibo al 60%', ctx.ccValoresRecibo(2459300, 1475580), { gestion: 2459300, descuento: 983720, total: 1475580 });
igual('recibo al 100% (sin descuento)', ctx.ccValoresRecibo(2000000, 2000000), { gestion: 2000000, descuento: 0, total: 2000000 });
igual('recibo: gestión − descuento = total', (() => { const r = ctx.ccValoresRecibo(3950000, 2686000); return r.gestion - r.descuento === r.total; })(), true);

// --- Recibo: el control de cifras acepta las tres del recibo y delata una ajena ---
const recibo = 'Pago de arriendo: $  2.645.000 Beneficio de descuento $    -1.322.500 Total con deducciones: $ 1.322.500';
igual('cifras del recibo', ctx.ccCifrasEnPesos(recibo), [2645000, 1322500, 1322500]);
igual('recibo con cifra vieja de la plantilla', ctx.ccCifrasEnPesos(recibo + ' $ 1.200.000').filter(c => [2645000, 1322500].indexOf(c) === -1), [1200000]);
igual('descuento cero', ctx.ccCifrasEnPesos('Beneficio de descuento $    0'), [0]);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
