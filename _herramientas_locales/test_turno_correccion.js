// Prueba local de turnoParaCorregir (backend/GESTOR DE DOCUMENTOS.js): cuándo el
// agente puede enviar una corrección. Regla: una sola corrección abierta a la vez.
//
// Uso: node test_turno_correccion.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../backend/GESTOR DE DOCUMENTOS.js'), 'utf8');
const i = fuente.indexOf('function turnoParaCorregir(');
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
const t = (estado, tipo) => { const r = ctx.turnoParaCorregir(estado, tipo); return r.permitido ? 'SI' : r.motivo; };

// --- Inquilino ---
igual('inq: acaba de cargar → se puede corregir', t('INQ_SUBMITTED', 'inquilino'), 'SI');
igual('inq: ya hay corrección abierta → NO se envía otra', t('INQ_CORRECTION|cedula,extractos', 'inquilino'), 'abierta');
igual('inq: corrigió y reenvió → se puede corregir otra vez (ronda nueva)', t('INQ_SUBMITTED|cedula', 'inquilino'), 'SI');
['INQ_VALIDATED', 'PROP_SUBMITTED', 'PROP_CORRECTION', 'PROP_VALIDATED', 'READY_CONTRACT', 'CONTRACT_GENERATED', 'COMPLETED'].forEach(e =>
  igual('inq: ' + e + ' → ya aprobado', t(e, 'inquilino'), 'ya_aprobado'));

// --- Propietario ---
igual('prop: acaba de cargar → se puede corregir', t('PROP_SUBMITTED', 'propietario'), 'SI');
igual('prop: ya hay corrección abierta → NO se envía otra', t('PROP_CORRECTION|certTradicion', 'propietario'), 'abierta');
igual('prop: corrigió y reenvió → ronda nueva', t('PROP_SUBMITTED|certTradicion', 'propietario'), 'SI');
['INQ_SUBMITTED', 'INQ_CORRECTION', 'INQ_VALIDATED'].forEach(e =>
  igual('prop: ' + e + ' → todavía no ha cargado', t(e, 'propietario'), 'no_ha_cargado'));
['PROP_VALIDATED', 'READY_CONTRACT', 'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED'].forEach(e =>
  igual('prop: ' + e + ' → ya aprobado', t(e, 'propietario'), 'ya_aprobado'));

// --- Bordes: ante la duda, no se estorba ---
igual('fila vieja sin etapa → se permite', [t('', 'inquilino'), t(null, 'propietario')], ['SI', 'SI']);
igual('etapa desconocida → se permite', t('ALGO_RARO', 'inquilino'), 'SI');
igual('tipo desconocido → se permite', t('INQ_CORRECTION', 'codeudor'), 'SI');
igual('minúsculas y espacios', t('  prop_correction|rut ', 'propietario'), 'abierta');

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
