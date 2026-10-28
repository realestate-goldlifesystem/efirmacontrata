// Validación del pago mes a mes (bloque 5) sobre el inmueble de PRUEBA, en modo prueba sin correos
// (MODO_PRUEBA_SIN_CORREO.js): nada sale; va listando los correos que habrían salido.
// Requiere el endpoint temporal TEMP_controlPrueba (on/off/log/tokens/estado/recordar/cron/reiniciar).
// Restaura la FECHA INICIO DEL CONTRATO y deja la sala reiniciada. 28-oct-2026.
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
async function api(o) {
  for (let k = 0; k < 3; k++) {
    try { const r1 = await fetch(API, { method: 'POST', body: JSON.stringify(o), redirect: 'manual' }); return JSON.parse(await (await fetch(r1.headers.get('location'))).text()); }
    catch (e) { if (k === 2) throw e; await new Promise(z => setTimeout(z, 6000)); }
  }
}
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const sheets = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', H11 = '1.1 - INMUEBLES REGISTRADOS', ID = 'ZA471452', CITA = 'CIT-692477';
const letra = n => { let t = ''; n++; while (n) { const m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };
async function celdaInicio(valor) {
  const v = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${H11}'` })).data.values;
  const h = v[0].map(x => String(x).trim()), k = v.findIndex(r => r[h.indexOf('ID DE REGISTRO')] === ID), i = h.indexOf('FECHA INICIO DEL CONTRATO');
  if (valor === undefined) return v[k][i];
  await sheets.spreadsheets.values.update({ spreadsheetId: SHEET, range: `'${H11}'!${letra(i)}${k + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[valor]] } });
}
const fechaTexto = (dias, meses) => { const d = new Date(Date.now() - 5 * 3600000); if (meses) d.setUTCMonth(d.getUTCMonth() + meses); d.setUTCDate(d.getUTCDate() + dias); return d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
const isoDia = ts => new Date(ts - 5 * 3600000).toISOString().slice(0, 10);
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
let fallas = 0, nLog = 0;
const ok = (c, m) => { console.log(c ? '  OK ' : '  MAL', m); if (!c) fallas++; };
const T = (que, extra) => api(Object.assign({ accion: 'TEMP_controlPrueba', que, id: ID }, extra || {}));
async function correos() {
  const l = (await T('log')).correos || []; const n = l.slice(nLog); nLog = l.length;
  n.forEach(c => console.log('     ✉', String(c.para).replace(/@.*/, '@…') + (c.bcc ? ' +bcc' : ''), '| adj', c.adjuntos, '|', c.asunto));
}

(async () => {
  const inicioOriginal = await celdaInicio();
  console.log('Fecha de inicio original guardada para restaurarla.');
  try {
    ok((await T('on')).on === ID, 'modo prueba sin correos activo para ' + ID);
    await T('reiniciar'); await correos();
    let e = await T('estado');
    ok(e.flujo && !e.acordada && !e.pagos.length, 'punto de partida: contrato con flujo nuevo, sin entrega acordada ni pagos');

    console.log('\n1. Se acuerda la entrega (sala)');
    const tk = await T('tokens'); const I = { c: CITA, r: 'i', t: tk.i }, P = { c: CITA, r: 'p', t: tk.p };
    let libres = [];
    for (let d = 2; libres.length < 3 && d < 9; d++) {
      const f = new Date(Date.now() + d * 86400000); if (f.getUTCDay() === 0) continue;
      const r = await api({ accion: 'disponibilidadSalaEntrega', ...I, fecha: isoDia(f.getTime()) });
      libres = [...new Set(libres.concat((JSON.stringify(r).match(/17\d{11}/g) || []).map(Number)))];
    }
    await api({ accion: 'proponerSalaEntrega', ...I, pedidos: libres.slice(0, 3) });
    await api({ accion: 'guardarDatosEntrega', ...I, etapa: 'ENTREGA', personas: [], vehiculos: [] });
    ok((await api({ accion: 'aceptarSalaEntrega', ...P, timestamp: libres[0] })).ok, 'el propietario acepta: entrega agendada');
    await correos();
    e = await T('estado');
    const m1 = e.pagos.find(x => x.mes === 1);
    ok(e.acordada && e.accProp, 'salen los accesos del propietario');
    ok(m1 && m1.estado === 'PENDIENTE', 'mes 1 creado · lo revisa ' + (m1 && m1.revisa) + ' (caso ' + (m1 && m1.revisa === 'AGENTE' ? 'A: cobras tú' : 'B: cobra el propietario') + ')');
    console.log('     historial:', m1 && m1.historial.replace(/\n/g, ' | '));
    ok(m1 && /enviad/.test(m1.historial) && !/NO enviad/.test(m1.historial), 'el cobro del primer mes salió');

    console.log('\n2. Recordatorio el día de la entrega');
    await T('recordar'); await correos();
    e = await T('estado');
    ok(/ENTREGA_/.test(e.pagos.find(x => x.mes === 1).avisos), 'sale el recordatorio porque no ha cargado');
    await T('recordar');
    e = await T('estado');
    ok((e.pagos.find(x => x.mes === 1).avisos.match(/ENTREGA_/g) || []).length === 1, 'no lo repite el mismo día');

    console.log('\n3. Cargar y revisar el mes 1');
    const Pi = { p: m1.id, r: 'i', t: m1.token }, Pv = { p: m1.id, r: 'v', t: m1.tr };
    ok(!(await api({ accion: 'infoPagoMensual', p: m1.id, r: 'v', t: 'malo' })).ok, 'un enlace con token falso se rechaza');
    const info = await api({ accion: 'infoPagoMensual', ...Pi });
    ok(info.ok && info.mes === 1, 'el inquilino ve el mes 1 por $' + info.valor);
    ok((await api({ accion: 'cargarComprobanteMensual', ...Pi, base64: PNG, mimeType: 'image/png', nombre: 'comprobante.png' })).ok, 'el inquilino carga el comprobante');
    ok(!(await api({ accion: 'cargarComprobanteMensual', ...Pi, base64: PNG, mimeType: 'image/png', nombre: 'doble.png' })).ok, 'cargado: no deja subir otro mientras se revisa');
    ok((await api({ accion: 'revisarPagoMensual', ...Pv, decision: 'NO_ES', motivo: 'Es del mes pasado' })).ok, 'quien revisa dice "no es" con motivo');
    await correos();
    e = await T('estado');
    ok(e.pagos.find(x => x.mes === 1).estado === 'NO ES' && !e.accInq, 'queda "no es" y el inquilino aún sin carpeta');
    ok((await api({ accion: 'infoPagoMensual', ...Pi })).motivo === 'Es del mes pasado', 'el inquilino ve el motivo');
    ok((await api({ accion: 'cargarComprobanteMensual', ...Pi, base64: PNG, mimeType: 'image/png', nombre: 'otro.png' })).ok, 'carga el correcto');
    ok((await api({ accion: 'revisarPagoMensual', ...Pv, decision: 'VALIDAR' })).ok, 'quien revisa confirma "Recibí el pago"');
    await correos();
    e = await T('estado');
    ok(e.pagos.find(x => x.mes === 1).estado === 'VALIDADO' && e.accInq, 'mes 1 confirmado y el inquilino recibe su carpeta');
    ok(!(await api({ accion: 'cargarComprobanteMensual', ...Pi, base64: PNG, mimeType: 'image/png' })).ok, 'ya confirmado: no deja cargar otro');

    console.log('\n4. Mes 2 (días contados desde la fecha de inicio)');
    const paso = async (dias) => { await celdaInicio(fechaTexto(-dias, -1)); await T('cron'); await correos(); return (await T('estado')).pagos.find(x => x.mes === 2); };
    let m2 = await paso(0);
    ok(m2 && m2.revisa === 'PROPIETARIO' && /D1/.test(m2.avisos), 'día 1: se crea el mes 2 (revisa el propietario) y sale "ya puedes cargar"');
    m2 = await paso(3);
    ok(m2 && /D4/.test(m2.avisos) && !/D5/.test(m2.avisos), 'día 4: recordatorio');
    m2 = await paso(4);
    ok(m2 && /D5/.test(m2.avisos) && !/D6/.test(m2.avisos), 'día 5: "hoy es el último día"');
    m2 = await paso(5);
    ok(m2 && /D6/.test(m2.avisos), 'día 6 sin comprobante: mora al inquilino, al propietario y el caso a ti');
    await paso(5);
    e = await T('estado');
    ok(e.pagos.filter(x => x.mes === 2).length === 1 && (e.pagos.find(x => x.mes === 2).avisos.match(/D6/g) || []).length === 1, 'no repite avisos ni duplica el mes');
    ok((await api({ accion: 'cargarComprobanteMensual', p: m2.id, r: 'i', t: m2.token, base64: PNG, mimeType: 'image/png' })).ok, 'el inquilino carga el del mes 2');
    await correos();
    await T('cron', { mes: 2, cargaHace: 49 }); await correos();
    e = await T('estado');
    ok(/RECORDAR_REVISION/.test(e.pagos.find(x => x.mes === 2).avisos), 'a las 48 h sin revisar: recordatorio al propietario');
    console.log('     historial mes 2:', e.pagos.find(x => x.mes === 2).historial.replace(/\n/g, ' | '));
    const caso = ((await T('log')).correos || []).find(c => /Mora mes 2/.test(c.asunto));
    ok(caso && /WhatsApp inquilino/.test(caso.texto) && /Llamar al propietario/.test(caso.texto), 'tu correo del caso de mora trae WhatsApp y llamar');
  } finally {
    await celdaInicio(inicioOriginal);
    await T('reiniciar');
    const off = await T('off');
    console.log('\nFecha de inicio restaurada · sala reiniciada sin correos · modo prueba ' + (off.on ? 'SIGUE ACTIVO' : 'apagado'));
    console.log('Correos que habrían salido en total:', nLog);
  }
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO BIEN');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
