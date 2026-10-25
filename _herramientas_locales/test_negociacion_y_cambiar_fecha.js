// Prueba de punta a punta (24-oct-2026) de dos cosas que faltaba ver en vivo:
//   1. La segunda ronda de la negociación de una visita con acompañamiento: el
//      propietario no puede, el interesado propone otros 3 (sin los descartados) y
//      el propietario acepta uno.
//   2. "Cambiar fecha" desde el correo: en la visita coordinada lleva a la negociación;
//      en la entrega reabre la sala (no la mueve sola).
// Usa un inmueble de PRUEBA ("PRUEBA SISTEMA GOLD LIFE"): todos los correos van al
// correo del sistema. Requiere el endpoint temporal TEMP_pruebas (token del propietario,
// abrir la sala de entrega y limpiar).
// Uso: node test_negociacion_y_cambiar_fecha.js <ID inmueble de prueba>
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
const s = google.sheets({ version: 'v4', auth });
const letra = (n) => { let t = ''; n++; while (n) { const m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };

async function api(cuerpo) {
  for (let k = 0; k < 3; k++) {
    try {
      const r1 = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), redirect: 'manual' });
      return JSON.parse(await (await fetch(r1.headers.get('location'))).text());
    } catch (e) { if (k === 2) throw e; await new Promise(z => setTimeout(z, 5000)); }
  }
}
async function hoja(nombre) {
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${nombre}'!A1:ZZ` });
  const [h, ...f] = r.data.values; return { h: h.map(x => String(x).trim()), f };
}
async function cita(id) {
  const { h, f } = await hoja('2 - AGENDA CITAS');
  const fila = f.find(x => x[h.indexOf('ID CITA')] === id);
  return (n) => fila ? (fila[h.indexOf(n)] || '') : '';
}
let fallas = 0;
const ok = (c, m) => { console.log(c ? '  OK ' : '  MAL', m); if (!c) fallas++; };
const isoDia = (ts) => new Date(ts - 5 * 3600000).toISOString().slice(0, 10);

(async () => {
  const ID = process.argv[2];
  // 0. Publicar el inmueble de prueba y ponerle inquilino (solo para la prueba)
  const inm = await hoja('1.1 - INMUEBLES REGISTRADOS');
  const k = inm.f.findIndex(x => x[inm.h.indexOf('ID DE REGISTRO')] === ID);
  if (k < 0) throw new Error('No está ' + ID);
  const fila = k + 2;
  for (const [c, v] of [['ESTADO DEL INMUEBLE', 'PUBLICADO ARRIENDO'], ['NOMBRE COMPLETO INQUILINO', 'INQUILINO PRUEBA SISTEMA'],
    ['CORREO INQUILINO', 'realestate.goldlifesystem@gmail.com'], ['CELULAR INQUILINO', '3000000777']]) {
    await s.spreadsheets.values.update({ spreadsheetId: SHEET, range: `'1.1 - INMUEBLES REGISTRADOS'!${letra(inm.h.indexOf(c))}${fila}`, valueInputOption: 'RAW', requestBody: { values: [[v]] } });
  }

  // Días con horarios libres de Leonardo (sin el cruce del propietario)
  const libres = [];
  for (let d = 2; libres.length < 12 && d < 12; d++) {
    const f = new Date(Date.now() + d * 86400000);
    if (f.getUTCDay() === 0) continue;
    const r = await api({ accion: 'disponibilidadVisitaCoordinada', i: ID, fecha: isoDia(f.getTime()) });
    (r.slots || []).filter(x => !x.cruce).forEach(x => libres.push(x.timestamp));
  }
  ok(libres.length >= 9, 'hay horarios libres para la prueba (' + libres.length + ')');
  const A = libres.slice(0, 3), B = libres.slice(3, 5), C = libres.slice(5, 8);

  console.log('\n1. Segunda ronda de la negociación');
  const sol = await api({ accion: 'agendarVisitaInteresado', i: ID, negocio: 'ARRIENDO', precalificacion: { personas: '2', ocupacion: 'Empleado' },
    nombre: 'INTERESADO PRUEBA SISTEMA', correo: 'realestate.goldlifesystem@gmail.com', celular: '+57 3000000777', pedidos: A });
  ok(sol.success && sol.idCita, 'el interesado pide 3 horarios');
  const tokInt = (await cita(sol.idCita))('TOKEN PROPIETARIO');
  const { t } = await api({ accion: 'TEMP_pruebas', op: 'token', id: ID });
  const lunes = (() => { const d = new Date(B[0] - 5 * 3600000); const dow = d.getUTCDay(); d.setUTCDate(d.getUTCDate() - (dow + 6) % 7); return d.toISOString().slice(0, 10); })();
  const g = await api({ accion: 'guardarDisponibilidadPropietario', i: ID, t, c: sol.idCita, lunes, bloques: B, quienAbre: '', celularAbre: '' });
  ok(g.ok, 'el propietario no puede y marca otros 2: ' + (g.mensaje || ''));
  let v = await cita(sol.idCita);
  ok(JSON.parse(v('HORARIOS DESCARTADOS') || '[]').length === 3, 'los 3 del interesado quedan descartados');
  const is = await api({ accion: 'infoSolicitudCoordinada', c: sol.idCita, t: tokInt });
  ok(is.ok && B.every(x => is.cruce.includes(x)) && is.descartados.length === 3, 'el interesado ve las opciones del propietario');
  const conDescartado = await api({ accion: 'elegirHorarioCoordinado', c: sol.idCita, t: tokInt, pedidos: [A[0], C[0], C[1]] });
  ok(!conDescartado.success, 'no deja volver a pedir uno descartado: ' + (conDescartado.error || ''));
  const disp = await api({ accion: 'disponibilidadVisitaCoordinada', i: ID, fecha: isoDia(A[0]), c: sol.idCita });
  ok((disp.slots || []).filter(x => A.includes(x.timestamp)).every(x => x.descartado), 'los descartados vienen marcados para ocultarlos');
  const ronda2 = await api({ accion: 'elegirHorarioCoordinado', c: sol.idCita, t: tokInt, pedidos: C });
  ok(ronda2.success && !ronda2.agendada, 'el interesado propone otros 3 (ronda 2)');
  const ip = await api({ accion: 'infoCoordinarPropietario', i: ID, t, c: sol.idCita });
  const pedidosProp = ((ip.solicitud && ip.solicitud.pedidos) || []).map(x => x.timestamp);
  ok(ip.solicitud && ip.solicitud.estado === 'PIDE' && C.every(x => pedidosProp.includes(x)), 'al propietario le llegan los 3 nuevos');
  const ac = await api({ accion: 'aceptarHorarioPropietario', i: ID, t, c: sol.idCita, timestamp: C[1] });
  ok(ac.ok, 'el propietario acepta uno: ' + (ac.mensaje || ''));
  v = await cita(sol.idCita);
  ok(v('ESTADO') === 'PENDIENTE' && v('ID EVENTO CALENDAR'), 'la visita queda agendada (por confirmar) con su evento');

  console.log('\n2. "Cambiar fecha" desde el correo');
  const rv = await api({ accion: 'infoReagendarCita', idCita: sol.idCita, t: tokInt });
  ok(rv.ok && rv.urlCoordinada && !rv.esEntrega, 'visita con acompañamiento: lleva a la negociación con el propietario');

  const e = await api({ accion: 'TEMP_pruebas', op: 'abrirEntrega', id: ID });
  ok(e.idCita, 'se abre la sala de entrega');
  const I = { c: e.idCita, r: 'i', t: e.ti }, P = { c: e.idCita, r: 'p', t: e.tp };
  const libresE = (await api({ accion: 'disponibilidadSalaEntrega', ...I, fecha: isoDia(libres[10] || libres[8]) })).slots.map(x => x.timestamp);
  await api({ accion: 'proponerSalaEntrega', ...I, pedidos: libresE.slice(0, 3) });
  const acE = await api({ accion: 'aceptarSalaEntrega', ...P, timestamp: libresE[0] });
  ok(acE.ok, 'la entrega queda agendada');
  const re = await api({ accion: 'infoReagendarCita', idCita: e.idCita, t: e.ti });
  ok(re.ok && re.esEntrega, 'entrega: la página pregunta en vez de mover sola');
  const ab = await api({ accion: 'reabrirEntregaDesdeCorreo', idCita: e.idCita, t: e.ti });
  ok(ab.ok && /sala_entrega\.html/.test(ab.url || ''), 'al aceptar, reabre la sala y lleva al inquilino a proponer');
  v = await cita(e.idCita);
  ok(v('ESTADO') === 'POR COORDINAR' && !v('ID EVENTO CALENDAR') && !v('HORARIOS PEDIDOS'), 'la entrega vuelve a negociarse, sin evento ni propuestas');
  const infoE = await api({ accion: 'infoSalaEntrega', ...P });
  ok(infoE.estado === 'NEGOCIANDO', 'el propietario también ve la sala abierta');

  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO BIEN');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
