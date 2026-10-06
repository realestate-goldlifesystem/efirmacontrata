// Prueba local de estadoLinkSegunEtapa (backend/GESTOR DE DOCUMENTOS.js): qué ve
// el inquilino o el propietario al abrir su formulario, según la etapa real del
// trámite. 'pendiente' y 'correccion' dejan entrar; lo demás muestra el estado.
//
// Uso: node test_estado_link.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../backend/GESTOR DE DOCUMENTOS.js'), 'utf8');
const i = fuente.indexOf('function estadoLinkSegunEtapa(');
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
const st = (estado, tipo) => { const r = ctx.estadoLinkSegunEtapa(estado, tipo); return r ? r.status : null; };
const entra = (estado, tipo) => ['pendiente', 'correccion'].includes(st(estado, tipo));

// --- Inquilino ---
igual('inq: sin etapa → decide la regla vieja', st('', 'inquilino'), null);
igual('inq: ya envió → validando, NO entra', [st('INQ_SUBMITTED', 'inquilino'), entra('INQ_SUBMITTED', 'inquilino')], ['diligenciado', false]);
igual('inq: en corrección → entra', [st('INQ_CORRECTION|cedula', 'inquilino'), entra('INQ_CORRECTION|cedula', 'inquilino')], ['correccion', true]);
igual('inq: corrigió y reenviado → NO entra', entra('INQ_SUBMITTED|cedula', 'inquilino'), false);
igual('inq: aprobado → NO entra', [st('INQ_VALIDATED', 'inquilino'), entra('INQ_VALIDATED', 'inquilino')], ['aprobado', false]);
// El caso que estaba roto: al cargar el propietario, el inquilino quedaba "disponible" otra vez
igual('inq: el propietario ya cargó → sigue SIN poder entrar', entra('PROP_SUBMITTED', 'inquilino'), false);
igual('inq: propietario en corrección → sigue SIN poder entrar', entra('PROP_CORRECTION|rut', 'inquilino'), false);
['PROP_VALIDATED', 'READY_CONTRACT', 'CONTRACT_GENERATED', 'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED'].forEach(e =>
  igual('inq: ' + e + ' → NO entra', entra(e, 'inquilino'), false));

// --- Propietario ---
igual('prop: sin etapa → decide la regla vieja', st('', 'propietario'), null);
igual('prop: inquilino aún en trámite → disponible (el agente puede enviárselo antes)', entra('INQ_SUBMITTED', 'propietario'), true);
igual('prop: inquilino aprobado → entra', [st('INQ_VALIDATED', 'propietario'), entra('INQ_VALIDATED', 'propietario')], ['pendiente', true]);
igual('prop: ya envió → validando, NO entra', [st('PROP_SUBMITTED', 'propietario'), entra('PROP_SUBMITTED', 'propietario')], ['diligenciado', false]);
igual('prop: en corrección → entra', [st('PROP_CORRECTION|rut', 'propietario'), entra('PROP_CORRECTION|rut', 'propietario')], ['correccion', true]);
igual('prop: corrigió y reenviado → NO entra', entra('PROP_SUBMITTED|rut', 'propietario'), false);
['PROP_VALIDATED', 'READY_CONTRACT', 'CONTRACT_GENERATED', 'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED'].forEach(e =>
  igual('prop: ' + e + ' → NO entra', entra(e, 'propietario'), false));

// --- Bordes ---
igual('etapa desconocida → decide la regla vieja', st('ALGO_RARO', 'inquilino'), null);
igual('tipo desconocido → null', st('INQ_VALIDATED', 'codeudor'), null);
igual('minúsculas y espacios', st('  inq_validated ', 'inquilino'), 'aprobado');
igual('todo mensaje de "no entra" explica qué sigue',
  ['INQ_SUBMITTED', 'INQ_VALIDATED', 'PROP_SUBMITTED', 'PROP_VALIDATED'].every(e => (ctx.estadoLinkSegunEtapa(e, 'inquilino').mensaje || '').length > 40), true);
igual('ningún mensaje habla de pólizas ni de "asegurado"',
  ['INQ_SUBMITTED', 'INQ_CORRECTION', 'INQ_VALIDATED', 'PROP_SUBMITTED', 'PROP_CORRECTION', 'PROP_VALIDATED'].some(e =>
    ['inquilino', 'propietario'].some(t => /asegur|p[oó]liza/i.test((ctx.estadoLinkSegunEtapa(e, t) || {}).mensaje || ''))), false);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
