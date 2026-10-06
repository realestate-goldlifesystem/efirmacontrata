// Prueba local de backend/AVISO_RONDA_CONTRATO.js: el correo que le llega al agente
// cuando TODAS las partes ya respondieron la versión vigente del borrador.
//
// Uso: node test_ronda_contrato.js          (pruebas)
//      node test_ronda_contrato.js --ver    (además guarda los 3 correos en HTML, en la carpeta temporal)
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ctx = {};
vm.createContext(ctx);
// Los correos usan la plantilla común de GESTOR_PLAZOS.js
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/GESTOR_PLAZOS.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/AVISO_RONDA_CONTRATO.js'), 'utf8'), ctx);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}
// Fila del registro: CDR | USUARIO | ACCION | COMENTARIOS | FECHA | HORA | EMAIL | VERSION
const fila = (usuario, accion, version, comentario, cdr) => [cdr || 'SK000001', usuario, accion, comentario || '', '2026-10-06', '10:00:00', '', version];
const enviado = (v) => fila('ADMIN', 'ENVIADO', v);
const R = (filas, n) => ctx.rondaResumen(filas, 'SK000001', n === undefined ? 1 : n);
const avisa = (filas, n) => ctx.rondaTocaAvisar(filas, 'SK000001', n === undefined ? 1 : n);

// --- Mientras falte alguien: nada ---
let f = [enviado(1), fila('inquilino', 'APROBADO', 1)];
igual('uno de tres → incompleta', [R(f).situacion, R(f).faltan], ['incompleta', ['propietario', 'codeudor1']]);
igual('uno de tres → no avisa', avisa(f), false);
f.push(fila('propietario', 'APROBADO', 1));
igual('dos de tres → no avisa', avisa(f), false);

// --- El último completa la ronda: avisa, y dice qué pasó ---
f.push(fila('codeudor1', 'APROBADO', 1));
igual('los tres aprobaron', [R(f).situacion, avisa(f)], ['todos_aprobaron', true]);

f = [enviado(1), fila('inquilino', 'CORREGIR', 1, 'la fecha'), fila('propietario', 'CORREGIR', 1, 'el canon'), fila('codeudor1', 'CORREGIR', 1, '')];
igual('los tres pidieron corrección', [R(f).situacion, R(f).corrigen.length, avisa(f)], ['todos_corrigen', 3, true]);

f = [enviado(1), fila('inquilino', 'APROBADO', 1), fila('propietario', 'RECHAZADO', 1, 'mi cédula está mal'), fila('codeudor1', 'APROBADO', 1)];
igual('dos aprueban, uno corrige', [R(f).situacion, R(f).aprobaron, R(f).corrigen, avisa(f)], ['mixto', ['inquilino', 'codeudor1'], ['propietario'], true]);
igual('conserva el comentario de quien pidió el cambio', R(f).veredictos.propietario.comentario, 'mi cédula está mal');
igual('"CAMBIOS_SOLICITADOS" también cuenta como corrección', R([enviado(1), fila('inquilino', 'CAMBIOS_SOLICITADOS', 1)]).corrigen, ['inquilino']);

// --- No se repite el aviso ---
const completa = [enviado(1), fila('inquilino', 'APROBADO', 1), fila('propietario', 'APROBADO', 1), fila('codeudor1', 'APROBADO', 1)];
igual('un comentario del agente después → no vuelve a avisar', avisa(completa.concat([fila('ADMIN', 'COMENTARIO', 1, 'ok')])), false);
igual('alguien repite el mismo veredicto → no vuelve a avisar', avisa(completa.concat([fila('inquilino', 'APROBADO', 1)])), false);
igual('alguien CAMBIA su veredicto con la ronda completa → sí avisa', avisa(completa.concat([fila('inquilino', 'CORREGIR', 1, 'me arrepentí')])), true);
igual('...y cuenta el último veredicto', R(completa.concat([fila('inquilino', 'CORREGIR', 1, 'x')])).situacion, 'mixto');

// --- Versiones: solo cuenta la vigente ---
f = completa.concat([enviado(2)]);
igual('se envía la versión 2 → la ronda vuelve a empezar', [R(f).version, R(f).situacion, R(f).faltan.length, avisa(f)], [2, 'incompleta', 3, false]);
f = f.concat([fila('inquilino', 'APROBADO', 2), fila('propietario', 'APROBADO', 2)]);
igual('versión 2 con dos respuestas → no avisa (lo de la v1 no cuenta)', avisa(f), false);
f.push(fila('codeudor1', 'CORREGIR', 2, 'falta mi segundo apellido'));
igual('versión 2 completa → avisa', [R(f).version, R(f).situacion, avisa(f)], [2, 'mixto', true]);

// --- Cuántas partes hay ---
f = [enviado(1), fila('inquilino', 'APROBADO', 1), fila('propietario', 'APROBADO', 1)];
igual('sin codeudores, bastan inquilino y propietario', [R(f, 0).situacion, avisa(f, 0)], ['todos_aprobaron', true]);
igual('con dos codeudores, falta el segundo', R(f.concat([fila('codeudor1', 'APROBADO', 1)]), 2).faltan, ['codeudor2']);
igual('un codeudor que el contrato no tiene no cuenta', R(f.concat([fila('codeudor3', 'CORREGIR', 1)]), 0).situacion, 'todos_aprobaron');

// --- No se mezclan registros ---
f = [enviado(1), fila('inquilino', 'APROBADO', 1), fila('propietario', 'APROBADO', 1), fila('codeudor1', 'APROBADO', 1, '', 'ZZ999999')];
igual('la respuesta de OTRO registro no completa este', [R(f).situacion, avisa(f)], ['incompleta', false]);
igual('sin filas o sin datos no rompe', [avisa([]), avisa(null), R([]).situacion], [false, false, 'incompleta']);

// --- El correo ---
const correo = (filas) => ctx.rondaCorreoAgente({ codigo: 'SK000001', direccion: 'Calle 1 #2-3', resumen: R(filas),
  nombres: { inquilino: 'ANA <b>PEREZ</b>', propietario: 'LUIS GOMEZ', codeudor1: 'MARIA RUIZ' }, urlHoja: 'https://docs.google.com/spreadsheets/d/x' });
const c1 = correo(completa);
igual('todos aprobaron: asunto', c1.asunto, '✅ Todos aprobaron la versión 1 del contrato - SK000001');
igual('todos aprobaron: dice qué sigue', /genera el contrato definitivo/.test(c1.html), true);
const c2 = correo([enviado(3), fila('inquilino', 'CORREGIR', 3, 'la fecha'), fila('propietario', 'CORREGIR', 3, 'el canon'), fila('codeudor1', 'CORREGIR', 3)]);
igual('todos corrigen: asunto', c2.asunto, '✏️ Todas las partes pidieron corrección en la versión 3 - SK000001');
igual('todos corrigen: manda a la versión siguiente', /versión 4/.test(c2.html), true);
igual('sin observaciones lo dice', /No escribió observaciones/.test(c2.html), true);
const c3 = correo([enviado(1), fila('inquilino', 'APROBADO', 1), fila('propietario', 'CORREGIR', 1, 'cambiar <script>alert(1)</script> la fecha'), fila('codeudor1', 'APROBADO', 1)]);
igual('mixto: asunto', c3.asunto, '✏️ Versión 1 respondida: 2 aprobaron, 1 pidió corrección - SK000001');
igual('mixto: dice quién aprobó y quién no', /Inquilino y Codeudor 1<\/strong> aprobaron; <strong>Propietario<\/strong> pidió corrección/.test(c3.html), true);
igual('las observaciones y los nombres no pueden meter HTML', [/<script>/.test(c3.html), /<b>PEREZ/.test(c3.html)], [false, false]);
igual('muestra la observación', /cambiar .* la fecha/.test(c3.html), true);

if (process.argv.includes('--ver')) {
  [['aprobaron', c1], ['corrigen', c2], ['mixto', c3]].forEach(([n, c]) => {
    const destino = path.join(os.tmpdir(), 'ronda_' + n + '.html');
    fs.writeFileSync(destino, c.html);
    console.log('  ' + c.asunto + '\n    → ' + destino);
  });
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
