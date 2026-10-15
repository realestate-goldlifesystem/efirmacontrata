// Prueba local del bloque 0 del plan de agendas:
//  - backend/AGENDA_MOTOR.js       (horarios libres por tipo de agenda)
//  - backend/CONTRATOS_VIGENTES.js (periodos y fechas clave de cada contrato)
// Uso: node test_bloque0_agendas.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/AGENDA_MOTOR.js'), 'utf8') + '\nthis.TIPOS_AGENDA = TIPOS_AGENDA;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/CONTRATOS_VIGENTES.js'), 'utf8'), ctx);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}

// ================= Motor de horarios =================
const jue = ctx.agLeerDia('2026-10-15');   // jueves
const sab = ctx.agLeerDia('2026-10-17');
const dom = ctx.agLeerDia('2026-10-18');
const h = (dia, hh, mm) => ctx.agMs(dia, hh, mm || 0);
const horas = (r) => r.slots.map(s => s.horaAmPm);
const antes = h(ctx.agLeerDia('2026-10-14'), 8);   // el día anterior: sin límite de anticipación

igual('fecha inválida', ctx.agLeerDia('2026-02-30'), null);
igual('domingo', ctx.agHorariosLibres({ dia: dom, tipo: 'INTERESADO', ahoraMs: antes }).libre, false);
igual('festivo', ctx.agHorariosLibres({ dia: jue, tipo: 'INTERESADO', ahoraMs: antes, festivo: 'X' }).motivo, 'Día festivo: X');
igual('tipo desconocido', ctx.agHorariosLibres({ dia: jue, tipo: 'NADA' }).libre, false);

// Día vacío, interesado (40 min, cada 30): de 8:00 hasta 17:00 (17:30 + 40 > 18:00)
let r = ctx.agHorariosLibres({ dia: jue, tipo: 'INTERESADO', ahoraMs: antes });
igual('interesado primer', horas(r)[0], '8:00 AM');
igual('interesado último', horas(r).slice(-1)[0], '5:00 PM');
igual('interesado cantidad (sin almuerzo)', r.slots.length, 16);
igual('almuerzo: nada entre 12:30 y 1:30', horas(r).filter(x => ['12:30 PM', '1:00 PM', '1:30 PM'].includes(x)), []);
igual('a las 2:00 ya se puede', horas(r).includes('2:00 PM'), true);

// Propietario (60 min): último 5:00 PM
r = ctx.agHorariosLibres({ dia: jue, tipo: 'PROPIETARIO', ahoraMs: antes });
igual('propietario último', horas(r).slice(-1)[0], '5:00 PM');

// Sábado: 8 a 13 → entrega de 60 min, último 12:00 PM
r = ctx.agHorariosLibres({ dia: sab, tipo: 'ENTREGA', ahoraMs: antes });
igual('sábado', [horas(r)[0], horas(r).slice(-1)[0]], ['8:00 AM', '12:00 PM']);

// Colchón antes y después: cita 10:00–11:00, entrega 60 min, colchón 30
// Bloqueo efectivo 9:30–11:30 → 8:00 y 8:30 sirven (8:30+60 = 9:30), 9:00 no; 11:30 sí
r = ctx.agHorariosLibres({ dia: jue, tipo: 'ENTREGA', ahoraMs: antes, ocupados: [{ inicio: h(jue, 10), fin: h(jue, 11) }] });
igual('colchón', horas(r).slice(0, 4), ['8:00 AM', '8:30 AM', '11:30 AM', '12:00 PM']);

// Apartados cuentan igual que ocupados
r = ctx.agHorariosLibres({ dia: jue, tipo: 'ENTREGA', ahoraMs: antes, apartados: [{ inicio: h(jue, 10), fin: h(jue, 11) }] });
igual('apartados', horas(r).slice(0, 3), ['8:00 AM', '8:30 AM', '11:30 AM']);

// Anticipación: interesado 1 h; son las 9:10 → primero 10:30 (10:10 no es múltiplo)
r = ctx.agHorariosLibres({ dia: jue, tipo: 'INTERESADO', ahoraMs: h(jue, 9, 10) });
igual('anticipación interesado', horas(r)[0], '10:30 AM');
// Entrega 2 h; son las 9:00 → primero 11:00
r = ctx.agHorariosLibres({ dia: jue, tipo: 'ENTREGA', ahoraMs: h(jue, 9) });
igual('anticipación entrega', horas(r)[0], '11:00 AM');

// Día lleno de captación: 6 citas entre semana, 3 el sábado
const llenar = (dia) => { const oc = []; for (;;) { const x = ctx.agHorariosLibres({ dia, tipo: 'PROPIETARIO', ahoraMs: antes, ocupados: oc }); if (!x.slots.length) return oc.map(b => ctx.agHoraAmPm(b.inicio)); const t = x.slots[0].timestamp; oc.push({ inicio: t, fin: t + 3600000 }); } };
igual('6 citas entre semana', llenar(jue), ['8:00 AM', '9:30 AM', '11:00 AM', '2:00 PM', '3:30 PM', '5:00 PM']);
igual('3 citas el sábado', llenar(sab), ['8:00 AM', '9:30 AM', '11:00 AM']);

// Anticipación propia (panel del agente): propietario con 1 h en vez de 12 h
r = ctx.agHorariosLibres({ dia: jue, tipo: 'PROPIETARIO', ahoraMs: h(jue, 9), anticipacionMin: 60 });
igual('anticipación del panel', horas(r)[0], '10:00 AM');
r = ctx.agHorariosLibres({ dia: jue, tipo: 'PROPIETARIO', ahoraMs: h(jue, 9) });
igual('propietario: 2 h de anticipación', horas(r)[0], '11:00 AM');

// ================= Contratos vigentes =================
const F = (s) => ctx.cvLeerFecha(s);
const T = ctx.cvTexto;

igual('leer d/m/a', F('16/10/2026'), { y: 2026, m: 10, d: 16 });
igual('leer iso', F('2026-10-16'), { y: 2026, m: 10, d: 16 });
igual('leer inválida', F('31/02/2026'), null);
igual('leer vacío', F(''), null);

// Contrato SK142795: inicia 16/10/2026
let fc = ctx.cvFechasClave(F('16/10/2026'));
igual('fin', T(fc.fin), '2027-10-15');
igual('tope devolución', T(fc.topeDevolucion), '2027-10-20');
igual('límite aviso', T(fc.limiteAviso), '2027-07-15');
igual('recordatorios aviso', fc.recordatoriosAviso.map(x => T(x.fecha)), ['2027-06-15', '2027-06-30', '2027-07-10', '2027-07-15']);

// Fecha final registrada manda
fc = ctx.cvFechasClave(F('16/10/2026'), F('30/04/2027'));
igual('fin registrado', T(fc.fin), '2027-04-30');

// Periodos
let p = ctx.cvPeriodo(F('16/10/2026'), F('16/10/2026'));
igual('periodo 1 día 1', [p.numero, p.dia, T(p.fin)], [1, 1, '2026-11-15']);
p = ctx.cvPeriodo(F('16/10/2026'), F('15/11/2026'));
igual('último día periodo 1', [p.numero, p.dia], [1, 31]);
p = ctx.cvPeriodo(F('16/10/2026'), F('20/11/2026'));
igual('periodo 2 día 5', [p.numero, p.dia], [2, 5]);
igual('antes de empezar', ctx.cvPeriodo(F('16/10/2026'), F('15/10/2026')), null);

// Día 31: el periodo de febrero arranca el 28 (o 29)
p = ctx.cvPeriodo(F('31/01/2027'), F('28/02/2027'));
igual('clamp febrero', [p.numero, T(p.inicio), p.dia], [2, '2027-02-28', 1]);
p = ctx.cvPeriodo(F('31/01/2027'), F('31/03/2027'));
igual('vuelve al 31', [p.numero, T(p.inicio)], [3, '2027-03-31']);
p = ctx.cvPeriodo(F('31/01/2027'), F('30/03/2027'));
igual('30 de marzo sigue en periodo 2', [p.numero, p.dia], [2, 31]);
igual('fin con 31', T(ctx.cvFechasClave(F('31/01/2027')).fin), '2028-01-30');

// Momentos
fc = ctx.cvFechasClave(F('16/10/2026'));
igual('momentos', ['2026-10-15', '2026-10-16', '2027-10-15', '2027-10-20', '2027-10-21'].map(s => ctx.cvMomento(fc, F(s))),
  ['por_empezar', 'vigente', 'vigente', 'en_devolucion', 'terminado']);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
