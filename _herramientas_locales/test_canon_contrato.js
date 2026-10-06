// Prueba local de canonSinAdministracion (backend/GESTOR_CONTRATOS.js): el canon que
// va en la cláusula del contrato es el precio de promoción MENOS la administración.
// También comprueba que la cláusula resultante la lee la cuenta de cobro.
//
// Uso: node test_canon_contrato.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function funcion(archivo, nombre) {
  const fuente = fs.readFileSync(path.join(__dirname, '../backend/' + archivo), 'utf8');
  const i = fuente.indexOf('function ' + nombre + '(');
  let nivel = 0, j = fuente.indexOf('{', i);
  for (; j < fuente.length; j++) { if (fuente[j] === '{') nivel++; else if (fuente[j] === '}' && --nivel === 0) break; }
  return fuente.slice(i, j + 1);
}
const ctx = { CUENTA_COBRO: { CANON_MINIMO: 100000, CANON_MAXIMO: 100000000 } };
vm.createContext(ctx);
vm.runInContext(funcion('GESTOR_CONTRATOS.js', 'canonSinAdministracion') + funcion('GESTOR_CONTRATOS.js', 'formatearMoneda') + funcion('GESTOR_CUENTA_COBRO.js', 'ccExtraerCanonDeTexto'), ctx);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}
const c = ctx.canonSinAdministracion;

// Casos reales de la hoja (valores, sin datos de personas)
igual('3.100.000 − 455.000 = 2.645.000 (el canon con que se liquidó YX454035)', c(' $3.100.000', ' $455.000'), 2645000);
igual('2.850.000 − 390.700', c(' $2.850.000', ' $390.700'), 2459300);
igual('2.500.000 − 315.000', c(' $2.500.000', ' $315.000'), 2185000);

// Sin administración
igual('sin administración → precio completo', [c('$1.800.000', ''), c('$1.800.000', null), c('$1.800.000', '$0'), c('$1.800.000', undefined)], [1800000, 1800000, 1800000, 1800000]);

// Formatos
igual('números puros', c(3100000, 455000), 2645000);
igual('con centavos ",00"', c('$3.100.000,00', '$455.000,00'), 2645000);
igual('texto con COP y espacios', c('3.100.000 COP', ' 455.000 '), 2645000);

// Datos malos: no se inventa
igual('sin precio → 0', [c('', '$455.000'), c(null, null), c('N/A', '$455.000')], [0, 0, 0]);
igual('administración mayor o igual al precio → no se resta', [c('$400.000', '$455.000'), c('$455.000', '$455.000')], [400000, 455000]);
igual('administración ilegible → precio completo', c('$3.100.000', 'por definir'), 3100000);

// La cláusula que queda la lee la cuenta de cobro (necesita "PRECIO DEL CANON: $…")
const clausula = (titulo, valor) => `QUINTA: ${titulo}: ${ctx.formatearMoneda(valor)} pesos m/cte. que el Arrendatario pagará en su totalidad`;
igual('con el título nuevo, la cuenta de cobro encuentra el canon', ctx.ccExtraerCanonDeTexto(clausula('PRECIO DEL CANON', c(' $3.100.000', ' $455.000'))), 2645000);
igual('con el título viejo NO lo encontraba', ctx.ccExtraerCanonDeTexto(clausula('PRECIO DEL ARRENDAMIENTO', 2645000)), 0);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
