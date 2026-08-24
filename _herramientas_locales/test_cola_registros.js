/**
 * Pruebas de la salud de la cola de registros (P3).
 *
 * Ejecuta las funciones REALES de backend/UTIL_Triggers.js
 * (asegurarTriggerWorker, contarTriggersDe, watchdogColaRegistros)
 * contra stubs de ScriptApp/PropertiesService.
 *
 * Uso: node _herramientas_locales/test_cola_registros.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'backend', 'UTIL_Triggers.js');

let triggers = [];   // [{fn}]
let propsStore = {};
let logs = [];

const sandbox = {
  console,
  Logger: { log: m => logs.push(String(m)) },
  ScriptApp: {
    getProjectTriggers: () => triggers.map(t => ({
      getHandlerFunction: () => t.fn,
      _raw: t
    })),
    deleteTrigger: h => { triggers = triggers.filter(t => t !== h._raw); },
    newTrigger: fn => ({
      timeBased: () => ({
        after: () => ({ create: () => { triggers.push({ fn }); } }),
        everyMinutes: () => ({ create: () => { triggers.push({ fn }); } })
      })
    })
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperties: () => Object.assign({}, propsStore),
      getProperty: (k) => (k in propsStore ? propsStore[k] : null),
      setProperty: (k, v) => { propsStore[k] = String(v); },
      deleteProperty: (k) => { delete propsStore[k]; }
    })
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: SRC });

// watchdogColaRegistros() llama a eliminarTriggerActual(), que vive en
// "1- REGISTRO DE INMUEBLE.js". Se extrae del fuente REAL (no se reimplementa)
// para que la prueba use exactamente el código de producción.
const SRC_REG1 = path.join(__dirname, '..', 'backend', '1- REGISTRO DE INMUEBLE.js');
const fuenteReg1 = fs.readFileSync(SRC_REG1, 'utf8');
const mEliminar = fuenteReg1.match(/function eliminarTriggerActual\(nombreFuncion\)\s*\{[\s\S]*?\n\}/);
if (!mEliminar) {
  console.error('❌ No se encontró eliminarTriggerActual() en 1- REGISTRO DE INMUEBLE.js');
  process.exit(1);
}
vm.runInContext(mEliminar[0], sandbox, { filename: SRC_REG1 });

let fallos = 0;
function check(nombre, cond, detalle) {
  console.log(`${cond ? '  ✅' : '  ❌'} ${nombre}${cond ? '' : '  -> ' + detalle}`);
  if (!cond) fallos++;
}
function reset() { triggers = []; propsStore = {}; logs = []; }

// ---------------------------------------------------------------
console.log('\n[1] asegurarTriggerWorker no duplica');
reset();
sandbox.asegurarTriggerWorker('workerA', 1000);
sandbox.asegurarTriggerWorker('workerA', 1000);
sandbox.asegurarTriggerWorker('workerA', 1000);
check('3 llamadas -> 1 solo trigger', triggers.length === 1, `hay ${triggers.length}`);

console.log('\n[2] respeta el tope de 20 triggers');
reset();
for (let i = 0; i < 19; i++) triggers.push({ fn: 'otroCron' + i });
const creado = sandbox.asegurarTriggerWorker('workerNuevo', 1000);
check('no crea al llegar al tope', creado === false && triggers.length === 19, `creado=${creado}, total=${triggers.length}`);

console.log('\n[3] sí crea cuando hay espacio');
reset();
for (let i = 0; i < 5; i++) triggers.push({ fn: 'otroCron' + i });
check('crea con espacio libre', sandbox.asegurarTriggerWorker('workerNuevo', 1000) === true && triggers.length === 6, `total=${triggers.length}`);

console.log('\n[4] watchdog revive una cola atascada');
reset();
propsStore['PROCESO_PARTE2_105'] = '{}';   // trabajo pendiente
propsStore['PROCESO_PARTE2_106'] = '{}';
// sin ningún trigger vivo -> escenario de cola congelada
sandbox.watchdogColaRegistros();
check('crea el trigger de Parte 2',
  triggers.filter(t => t.fn === 'continuarRegistroInmuebleParte2').length === 1,
  JSON.stringify(triggers));

console.log('\n[5] watchdog NO duplica si ya hay trigger vivo');
reset();
propsStore['PROCESO_PARTE2_105'] = '{}';
triggers.push({ fn: 'continuarRegistroInmuebleParte2' });
sandbox.watchdogColaRegistros();
check('sigue habiendo 1 solo',
  triggers.filter(t => t.fn === 'continuarRegistroInmuebleParte2').length === 1,
  `hay ${triggers.length}`);

console.log('\n[6] watchdog revive las 3 fases a la vez');
reset();
propsStore['PENDING_REGISTRATION_ROW_10'] = 'true';
propsStore['PROCESO_PARTE2_11'] = '{}';
propsStore['PROCESO_PARTE3_12'] = '{}';
sandbox.watchdogColaRegistros();
['procesarRegistrosPendientes', 'continuarRegistroInmuebleParte2', 'continuarRegistroInmuebleParte3']
  .forEach(fn => check(`revivió ${fn}`, triggers.some(t => t.fn === fn), JSON.stringify(triggers.map(t => t.fn))));

// ---- Ciclo de vida: se enciende con trabajo, se apaga solo al vaciarse -----
console.log('\n[7] APAGADO AUTOMÁTICO: cola vacía -> el watchdog no se reprograma');
reset();
triggers.push({ fn: 'watchdogColaRegistros' });   // watchdog corriendo
sandbox.watchdogColaRegistros();                  // cola vacía
check('el watchdog se borró a sí mismo',
  triggers.filter(t => t.fn === 'watchdogColaRegistros').length === 0,
  JSON.stringify(triggers.map(t => t.fn)));
check('no dejó ningún trigger colgando', triggers.length === 0, JSON.stringify(triggers.map(t => t.fn)));
check('lo reporta en el log', logs.some(l => l.indexOf('Se apaga') !== -1), logs.join('|'));

console.log('\n[8] SIGUE VIVO: con trabajo pendiente se vuelve a programar');
reset();
propsStore['PROCESO_PARTE3_20'] = '{}';
triggers.push({ fn: 'watchdogColaRegistros' });
sandbox.watchdogColaRegistros();
check('se reprogramó a sí mismo (exactamente 1)',
  triggers.filter(t => t.fn === 'watchdogColaRegistros').length === 1,
  JSON.stringify(triggers.map(t => t.fn)));

console.log('\n[9] armarWatchdogCola enciende sin duplicar');
reset();
sandbox.armarWatchdogCola();
sandbox.armarWatchdogCola();
sandbox.armarWatchdogCola();
check('3 llamadas -> 1 solo watchdog',
  triggers.filter(t => t.fn === 'watchdogColaRegistros').length === 1,
  `hay ${triggers.length}`);

console.log('\n[10] ciclo completo: encender -> trabajar -> apagarse');
reset();
propsStore['PENDING_REGISTRATION_ROW_30'] = 'true';
sandbox.armarWatchdogCola();                       // llega un registro
check('encendido', triggers.filter(t => t.fn === 'watchdogColaRegistros').length === 1, 'no encendió');
sandbox.watchdogColaRegistros();                   // corre, aún hay trabajo
check('sigue vivo mientras hay cola',
  triggers.filter(t => t.fn === 'watchdogColaRegistros').length === 1,
  JSON.stringify(triggers.map(t => t.fn)));
delete propsStore['PENDING_REGISTRATION_ROW_30']; // el worker terminó
sandbox.watchdogColaRegistros();                   // corre, cola vacía
check('se apagó solo al terminar',
  triggers.filter(t => t.fn === 'watchdogColaRegistros').length === 0,
  JSON.stringify(triggers.map(t => t.fn)));

// ---- Regresión del bloqueo visto en producción (21-ago-2026) --------------
// Había un trigger FANTASMA (un .after() ya gastado que sigue listado). El
// watchdog lo daba por vivo y jamás revivía la cola, que quedó con F1:2 parada.
console.log('\n[11] TRIGGER FANTASMA: la cola no avanza pero el trigger existe');
reset();
propsStore['PENDING_REGISTRATION_ROW_40'] = 'true';
propsStore['PENDING_REGISTRATION_ROW_41'] = 'true';
triggers.push({ fn: 'procesarRegistrosPendientes' }); // el fantasma
triggers.push({ fn: 'watchdogColaRegistros' });

sandbox.watchdogColaRegistros();                       // 1er vistazo: toma referencia
check('1er chequeo no toca nada (aún no sabe si avanza)',
  triggers.filter(t => t.fn === 'procesarRegistrosPendientes').length === 1,
  JSON.stringify(triggers.map(t => t.fn)));

sandbox.watchdogColaRegistros();                       // 2do: igual -> sin progreso (1)
sandbox.watchdogColaRegistros();                       // 3ro: igual -> sin progreso (2) -> actúa
check('tras 2 chequeos sin avance declara atasco',
  logs.some(l => l.includes('ATASCADA')), logs.slice(-3).join(' | '));
check('recreó el trigger de Fase 1 (mató al fantasma)',
  logs.some(l => l.includes('forzado')), logs.slice(-3).join(' | '));
check('sigue habiendo exactamente 1 trigger de Fase 1',
  triggers.filter(t => t.fn === 'procesarRegistrosPendientes').length === 1,
  JSON.stringify(triggers.map(t => t.fn)));

console.log('\n[12] Con avance real NO declara atasco');
reset();
propsStore['PENDING_REGISTRATION_ROW_50'] = 'true';
propsStore['PENDING_REGISTRATION_ROW_51'] = 'true';
propsStore['PENDING_REGISTRATION_ROW_52'] = 'true';
triggers.push({ fn: 'procesarRegistrosPendientes' });
sandbox.watchdogColaRegistros();
delete propsStore['PENDING_REGISTRATION_ROW_50'];   // el worker terminó uno
sandbox.watchdogColaRegistros();
delete propsStore['PENDING_REGISTRATION_ROW_51'];   // y otro
sandbox.watchdogColaRegistros();
check('nunca declara atasco mientras la cola encoge',
  !logs.some(l => l.includes('ATASCADA')), logs.filter(l => l.includes('ATASCADA')).join('|'));
check('reporta que la cola avanza',
  logs.some(l => l.includes('la cola avanza')), logs.slice(-2).join(' | '));

console.log('\n' + (fallos === 0 ? '✅ TODAS LAS PRUEBAS PASARON' : `❌ ${fallos} PRUEBA(S) FALLARON`) + '\n');
process.exit(fallos === 0 ? 0 : 1);
