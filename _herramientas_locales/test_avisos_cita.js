// Prueba local de la línea de tiempo de avisos de una cita (backend/CORREOS_CITA.js).
// Uso: node test_avisos_cita.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/CORREOS_CITA.js'), 'utf8'), ctx);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}
const toca = ctx.avisoQueTocaCita;

// Al agendar con 3 días: ningún aviso vigente todavía
igual('3 días', ctx.avisoVigenteCita(3 * 1440), '');
// Agendada con 40 h: el de 48 h ya "pasó" (lo cubre el correo de agendada)
igual('vigente con 40 h', ctx.avisoVigenteCita(40 * 60), 'H48');

// Recorrido completo de una cita pendiente, revisando cada 5 minutos
const enviados = [];
let ultimo = '';
for (let min = 4 * 1440; min > 0; min -= 5) {
  const p = toca(min, ultimo, false);
  if (p) { enviados.push(p); ultimo = p; }
}
igual('pendiente recibe todos', enviados, ['H48', 'H24', 'H3', 'H2', 'M60', 'M45', 'M30']);

// Confirmada: solo los informativos
const conf = []; ultimo = '';
for (let min = 4 * 1440; min > 0; min -= 5) {
  const p = toca(min, ultimo, true);
  if (p) { conf.push(p); ultimo = p; }
}
igual('confirmada sin avisos de confirmar', conf, ['H48', 'H24', 'H3', 'H2']);

// Interesado: empieza 3 días antes
const inter = []; ultimo = '';
for (let min = 5 * 1440; min > 0; min -= 5) {
  const p = toca(min, ultimo, false, 'INTERESADO');
  if (p) { inter.push(p); ultimo = p; }
}
igual('interesado desde 72 h', inter, ['H72', 'H48', 'H24', 'H3', 'H2', 'M60', 'M45', 'M30']);
igual('propietario no recibe 72 h', toca(70 * 60, '', false, 'PROPIETARIO'), null);

// Motor atrasado: con 50 min y último H2, manda solo M60 (no H... ni varios)
igual('atraso: uno solo', toca(50, 'H2', false), 'M60');
igual('atraso grande: el más reciente', toca(40, 'H24', false), 'M45');
// Ya enviado: nada
igual('no repite', toca(44, 'M45', false), null);
// Cita pasada: nada
igual('pasada', toca(-3, 'M30', false), null);

// Liberar
const lib = ctx.debeLiberarCita;
igual('libera a los 25 con 5 min de margen', lib(25, 'M30', 5, true), true);
igual('no libera sin margen', lib(25, 'M30', 3, true), false);
igual('no libera a los 28', lib(28, 'M30', 6, true), false);
igual('no libera confirmada', lib(20, 'M30', 10, false), false);
igual('no libera si nunca se pidió confirmar', lib(20, 'H2', 60, true), false);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
