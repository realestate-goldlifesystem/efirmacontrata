// Prueba local de listaServiciosDelContrato (backend/GESTOR_CONTRATOS.js): qué
// servicios públicos se nombran en la cláusula DÉCIMA PRIMERA del contrato.
// Regla: solo los que tienen su recibo APROBADO en la validación.
//
// Uso: node test_servicios_contrato.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../backend/GESTOR_CONTRATOS.js'), 'utf8');
const i = fuente.indexOf('function listaServiciosDelContrato(');
let nivel = 0, j = fuente.indexOf('{', i);
for (; j < fuente.length; j++) { if (fuente[j] === '{') nivel++; else if (fuente[j] === '}' && --nivel === 0) break; }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fuente.slice(i, j + 1), ctx);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}
const l = ctx.listaServiciosDelContrato;
const A = 'APROBADO';

igual('agua, luz y gas aprobados', l({ 'BUZON FACTURA AGUA': A, 'BUZON FACTURA LUZ': A, 'BUZON FACTURA GAS': A }), 'Acueducto, Gas y Luz');
igual('solo agua y luz (lo mínimo obligatorio)', l({ 'BUZON FACTURA AGUA': A, 'BUZON FACTURA LUZ': A }), 'Acueducto y Luz');
igual('solo agua', l({ 'BUZON FACTURA AGUA': A }), 'Acueducto');
igual('con teléfono', l({ 'BUZON FACTURA AGUA': A, 'BUZON FACTURA LUZ': A, 'BUZON FACTURA TELEFONO': A }), 'Acueducto, Luz y Teléfono');

// Lo que NO está aprobado no se nombra
igual('gas en corrección → no sale', l({ 'BUZON FACTURA AGUA': A, 'BUZON FACTURA LUZ': A, 'BUZON FACTURA GAS': 'ACTUALIZANDO' }), 'Acueducto y Luz');
igual('recibido sin revisar → no sale', l({ 'BUZON FACTURA AGUA': 'RECIBIDO', 'BUZON FACTURA LUZ': A }), 'Luz');
igual('"RECIBIDO (CORRECCIÓN)" → no sale', l({ 'BUZON FACTURA GAS': 'RECIBIDO (CORRECCIÓN)' }), '');

// Lo que no es de esta cláusula
igual('internet aprobado NO entra (la cláusula lo trata como servicio privado)', l({ 'BUZON FACTURA AGUA': A, 'BUZON FACTURA INTERNET': A }), 'Acueducto');
igual('otros buzones aprobados no se confunden', l({ 'BUZON CERTIFICADO TRADICION': A, 'BUZON SARLAFT': A, 'BUZON PROPIETARIO FRONTAL': A }), '');

// Bordes
igual('ninguno aprobado → vacío (la cláusula usa su texto de respaldo)', [l({}), l(null), l(undefined)], ['', '', '']);
igual('minúsculas y espacios en el Cerebro', l({ ' buzon factura agua ': ' aprobado ' }), 'Acueducto');
igual('la caldera nunca se nombra: no tiene recibo', /caldera/i.test(l({ 'BUZON FACTURA AGUA': A, 'BUZON FACTURA LUZ': A, 'BUZON FACTURA GAS': A, 'BUZON FACTURA TELEFONO': A })), false);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
