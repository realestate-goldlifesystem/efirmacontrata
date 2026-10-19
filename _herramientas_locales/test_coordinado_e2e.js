// Prueba de punta a punta del agendamiento coordinado (bloque 2) contra el sistema real,
// con un inmueble de PRUEBA ("PRUEBA SISTEMA GOLD LIFE"): todos los correos van al
// correo del sistema. Requiere el endpoint temporal TEMP_tokenCoordinar / TEMP_correrMotorAgenda.
// Uso: node test_coordinado_e2e.js <ID inmueble de prueba>
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
const s = google.sheets({ version: 'v4', auth });
const letra = (n) => { let t = ''; n++; while (n) { const m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };

async function api(cuerpo) {
  const r1 = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), redirect: 'manual' });
  const t = await (await fetch(r1.headers.get('location'))).text();
  try { return JSON.parse(t); } catch (e) { throw new Error('Respuesta no JSON: ' + t.slice(0, 200)); }
}
async function hoja(nombre) {
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${nombre}'!A1:ZZ` });
  const [h, ...f] = r.data.values; return { h: h.map(x => String(x).trim()), f };
}
async function cita(id) {
  const { h, f } = await hoja('2 - AGENDA CITAS');
  const fila = f.find(x => x[h.indexOf('ID CITA')] === id);
  const v = (n) => fila ? (fila[h.indexOf(n)] || '') : '';
  return { v, numFila: f.indexOf(fila) + 2, h };
}
async function poner(nombreHoja, numFila, columna, valor) {
  const { h } = await hoja(nombreHoja);
  await s.spreadsheets.values.update({ spreadsheetId: SHEET, range: `'${nombreHoja}'!${letra(h.indexOf(columna))}${numFila}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[valor]] } });
}
let fallas = 0;
const ok = (c, m) => { console.log(c ? '  OK ' : '  MAL', m); if (!c) fallas++; };
const isoDia = (ts) => new Date(ts - 5 * 3600000).toISOString().slice(0, 10);

(async () => {
  const ID = process.argv[2];
  // 0. Publicar el inmueble de prueba (solo para la prueba)
  const inmuebles = await hoja('1.1 - INMUEBLES REGISTRADOS');
  const k = inmuebles.f.findIndex(x => x[inmuebles.h.indexOf('ID DE REGISTRO')] === ID);
  if (k < 0) throw new Error('No está ' + ID);
  if (!String(inmuebles.f[k][inmuebles.h.indexOf('NOMBRES Y APELLIDOS DEL PROPIETARIO')]).includes('PRUEBA SISTEMA')) throw new Error('No es de prueba');
  await poner('1.1 - INMUEBLES REGISTRADOS', k + 2, 'ESTADO DEL INMUEBLE', 'PUBLICADO ARRIENDO');

  console.log('1. Página pública');
  const info = await api({ accion: 'infoInmuebleVisita', i: ID });
  ok(info.ok && info.modo === 'COORDINADO', 'inmueble coordinado (modo=' + info.modo + ')');
  ok(Array.isArray(info.cruce) && info.cruce.length === 0, 'sin horarios del propietario todavía');
  ok(!('correoPropietario' in info) && !('celularPropietario' in info), 'la página pública no trae datos del propietario');

  // Un día hábil con horarios: desde pasado mañana
  let dia, slots = [];
  for (let d = 2; d < 10 && slots.length < 6; d++) {
    const f = new Date(Date.now() + d * 86400000); if (f.getUTCDay() === 0) continue;
    dia = isoDia(f.getTime());
    const r = await api({ accion: 'disponibilidadVisitaCoordinada', i: ID, fecha: dia });
    slots = (r.slots || []);
  }
  ok(slots.length >= 6 && slots.every(x => x.cruce === false), `día ${dia}: ${slots.length} horarios, ninguno en cruce`);

  console.log('2. El interesado pide 3 horarios');
  const pedidos = [slots[0].timestamp, slots[2].timestamp, slots[4].timestamp];
  const sol = await api({ accion: 'agendarVisitaInteresado', i: ID, negocio: 'ARRIENDO', precalificacion: { personas: '2', ocupacion: 'Empleado' },
    nombre: 'INTERESADO PRUEBA SISTEMA', correo: 'realestate.goldlifesystem@gmail.com', celular: '+57 3000000777', pedidos });
  ok(sol.success && sol.agendada === false, 'solicitud creada ' + (sol.idCita || JSON.stringify(sol)));
  let c = await cita(sol.idCita);
  ok(c.v('ESTADO') === 'POR COORDINAR' && c.v('MODO VISITA') === 'COORDINADO', 'fila POR COORDINAR / COORDINADO');
  ok(JSON.parse(c.v('HORARIOS PEDIDOS') || '[]').length === 3, 'guardó los 3 horarios pedidos');
  const dispTras = await api({ accion: 'obtenerDisponibilidad', fecha: dia, tipo: 'INTERESADO' });
  ok(!pedidos.some(t => dispTras.slots.some(x => x.timestamp === t)), 'los pedidos quedaron apartados (nadie más los ve)');
  const dispPropia = await api({ accion: 'disponibilidadVisitaCoordinada', i: ID, fecha: dia, c: sol.idCita });
  ok(pedidos.every(t => dispPropia.slots.some(x => x.timestamp === t)), 'pero la propia solicitud sí los ve');

  console.log('3. Página del propietario');
  const { t } = await api({ accion: 'TEMP_tokenCoordinar', id: ID });
  const malo = await api({ accion: 'infoCoordinarPropietario', i: ID, t: 'x' + t.slice(1), c: sol.idCita });
  ok(malo.ok === false, 'token falso rechazado');
  const ip = await api({ accion: 'infoCoordinarPropietario', i: ID, t, c: sol.idCita });
  ok(ip.ok && ip.solicitud && ip.solicitud.estado === 'PIDE' && ip.solicitud.pedidos.length === 3, 've la solicitud con 3 horarios');
  const lunes = (() => { const d = new Date(pedidos[0] - 5 * 3600000); const dow = d.getUTCDay(); d.setUTCDate(d.getUTCDate() + (dow === 0 ? 1 : 1 - dow)); return d.toISOString().slice(0, 10); })();
  const sem = await api({ accion: 'semanaCoordinarPropietario', i: ID, t, c: sol.idCita, lunes });
  ok(sem.success && sem.dias.length === 6, 'semana con 6 días');
  const todos = sem.dias.flatMap(d => d.slots);
  ok(todos.filter(x => x.pedido).length === 3, 'los 3 pedidos salen marcados como "pedido"');

  console.log('4. El propietario no acepta y marca otros horarios');
  const otros = todos.filter(x => !x.pedido).slice(0, 4).map(x => x.timestamp);
  const g = await api({ accion: 'guardarDisponibilidadPropietario', i: ID, t, c: sol.idCita, lunes, bloques: otros, quienAbre: 'PORTERO PRUEBA', celularAbre: '3001112233' });
  ok(g.ok && /elija/.test(g.mensaje), 'guardó y le pidió al interesado que elija: ' + g.mensaje);
  c = await cita(sol.idCita);
  ok(c.v('ULTIMO AVISO') === 'ELEGIR' && !c.v('HORARIOS PEDIDOS'), 'pedidos liberados, esperando al interesado');
  ok(/PORTERO PRUEBA/.test(c.v('QUIEN ABRE')), 'quién abre: ' + c.v('QUIEN ABRE'));
  const info2 = await api({ accion: 'infoInmuebleVisita', i: ID });
  ok(otros.every(x => info2.cruce.includes(x)), 'la página pública ya muestra esos días con horarios del propietario');

  console.log('5. El interesado elige del cruce');
  const tokInt = c.v('TOKEN PROPIETARIO');
  const is = await api({ accion: 'infoSolicitudCoordinada', c: sol.idCita, t: tokInt });
  ok(is.ok && is.cruce.length === otros.length, 've el cruce (' + (is.cruce || []).length + ')');
  const fuera = await api({ accion: 'elegirHorarioCoordinado', c: sol.idCita, t: tokInt, timestamp: pedidos[0] });
  ok(!fuera.success, 'no puede elegir un horario que el propietario no marcó');
  const el = await api({ accion: 'elegirHorarioCoordinado', c: sol.idCita, t: tokInt, timestamp: otros[1] });
  ok(el.success && el.agendada, 'visita agendada');
  c = await cita(sol.idCita);
  ok(c.v('ESTADO') === 'PENDIENTE' && c.v('ID EVENTO CALENDAR'), 'PENDIENTE (agendar no es confirmar) y con evento en Calendar');
  const ip2 = await api({ accion: 'infoCoordinarPropietario', i: ID, t, c: sol.idCita });
  ok(ip2.solicitud.estado === 'AGENDADA', 'el propietario la ve agendada: ' + ip2.solicitud.agendada);

  console.log('6. Otro interesado: horario del cruce se agenda directo');
  const sol2 = await api({ accion: 'agendarVisitaInteresado', i: ID, negocio: 'ARRIENDO', precalificacion: { personas: '1', ocupacion: 'Estudiante' },
    nombre: 'INTERESADO2 PRUEBA SISTEMA', correo: 'realestate.goldlifesystem@gmail.com', celular: '+57 3000000778', timestamp: otros[2] });
  ok(sol2.success && sol2.agendada, 'agendada de una ' + sol2.idCita);

  console.log('7. Tercer interesado: el propietario acepta un pedido');
  const libres = (await api({ accion: 'disponibilidadVisitaCoordinada', i: ID, fecha: dia })).slots.filter(x => !x.cruce);
  const sol3 = await api({ accion: 'agendarVisitaInteresado', i: ID, negocio: 'ARRIENDO', precalificacion: { personas: '3', ocupacion: 'Independiente' },
    nombre: 'INTERESADO3 PRUEBA SISTEMA', correo: 'realestate.goldlifesystem@gmail.com', celular: '+57 3000000779', pedidos: [libres[0].timestamp, libres[1].timestamp] });
  ok(sol3.success && !sol3.agendada, 'solicitud ' + sol3.idCita);
  const ac = await api({ accion: 'aceptarHorarioPropietario', i: ID, t, c: sol3.idCita, timestamp: libres[1].timestamp });
  ok(ac.ok, 'aceptó: ' + ac.mensaje);
  c = await cita(sol3.idCita);
  ok(c.v('ESTADO') === 'PENDIENTE' && !c.v('HORARIOS PEDIDOS'), 'agendada y el otro pedido liberado');

  console.log('8. Tarea automática');
  const libres2 = (await api({ accion: 'disponibilidadVisitaCoordinada', i: ID, fecha: dia })).slots.filter(x => !x.cruce);
  const sol4 = await api({ accion: 'agendarVisitaInteresado', i: ID, negocio: 'ARRIENDO', precalificacion: { personas: '1', ocupacion: 'Otro' },
    nombre: 'INTERESADO4 PRUEBA SISTEMA', correo: 'realestate.goldlifesystem@gmail.com', celular: '+57 3000000780', pedidos: [libres2[0].timestamp] });
  c = await cita(sol4.idCita);
  // 31 min sin respuesta → aviso LLAMAR
  await poner('2 - AGENDA CITAS', c.numFila, 'FECHA ULTIMO AVISO', new Date(Date.now() - 31 * 60000 - 5 * 3600000).toISOString().slice(0, 19).replace('T', ' '));
  await api({ accion: 'TEMP_correrMotorAgenda' });
  c = await cita(sol4.idCita);
  ok(c.v('ULTIMO AVISO') === 'LLAMAR', 'a los 30 min se avisa a Leonardo para llamar');
  // pedido a menos de 2 h → se cae y se cancela
  await poner('2 - AGENDA CITAS', c.numFila, 'HORARIOS PEDIDOS', JSON.stringify([Date.now() + 90 * 60000]));
  await api({ accion: 'TEMP_correrMotorAgenda' });
  c = await cita(sol4.idCita);
  ok(c.v('ESTADO') === 'CANCELADA' && !c.v('HORARIOS PEDIDOS'), 'el pedido a menos de 2 h se cayó y la solicitud se canceló');

  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ Todo bien');
  console.log('Citas de prueba:', [sol.idCita, sol2.idCita, sol3.idCita, sol4.idCita].join(' '));
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
