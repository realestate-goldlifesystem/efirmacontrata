// Validación de "renovar o terminar el contrato" (RENOVACION_CONTRATO.js) en el inmueble de PRUEBA,
// en modo prueba sin correos. Corre el contrato para que el último día para decidir caiga en 15 días,
// simula los días de aviso y prueba los tres caminos (renovar, terminar, sin respuesta).
// Restaura FECHA INICIO / FECHA FINAL y borra lo que crea. Requiere TEMP_controlPrueba. 28-oct-2026.
// Uso: node validar_renovacion.js [--dejar]   (--dejar: deja el contrato corrido y el caso abierto para verlo en la página)
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
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', H11 = '1.1 - INMUEBLES REGISTRADOS', ID = 'ZA471452';
const letra = n => { let t = ''; n++; while (n) { const m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };
async function celdas(valores) {
  const v = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${H11}'` })).data.values;
  const h = v[0].map(x => String(x).trim()), k = v.findIndex(r => r[h.indexOf('ID DE REGISTRO')] === ID);
  const cols = ['FECHA INICIO DEL CONTRATO', 'FECHA FINAL DEL CONTRATO'];
  if (!valores) return cols.map(n => v[k][h.indexOf(n)] || '');
  for (let j = 0; j < cols.length; j++)
    await sheets.spreadsheets.values.update({ spreadsheetId: SHEET, range: `'${H11}'!${letra(h.indexOf(cols[j]))}${k + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[valores[j]]] } });
}
const dmy = d => d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
const iso = d => d.toISOString().slice(0, 10);
const masDias = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const masMeses = (d, n) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };
let fallas = 0, nLog = 0;
const ok = (c, m) => { console.log(c ? '  OK ' : '  MAL', m); if (!c) fallas++; };
const T = (que, extra) => api(Object.assign({ accion: 'TEMP_controlPrueba', que, id: ID }, extra || {}));
async function correos() {
  const l = (await T('log')).correos || []; const n = l.slice(nLog); nLog = l.length;
  n.forEach(c => console.log('     ✉', String(c.para).replace(/@.*/, '@…'), '| adj', c.adjuntos, '|', c.asunto));
  return n;
}
const enlace = u => { const q = new URL(u).searchParams; return { k: q.get('k'), f: q.get('f'), r: q.get('r'), t: q.get('t') }; };

(async () => {
  const dejar = process.argv.includes('--dejar');
  const originales = await celdas();
  console.log('Fechas originales guardadas para restaurarlas.');
  try {
    ok((await T('on')).on === ID, 'modo prueba sin correos activo');
    await T('renovLimpiar');
    // El último día para decidir cae en 15 días: fin = (límite + 1 día + 3 meses) − 1 día
    const hoy = new Date(Date.now() - 5 * 3600000); hoy.setUTCHours(12, 0, 0, 0);
    const limite = masDias(hoy, 15), siguiente = masMeses(masDias(limite, 1), 3);
    await celdas([dmy(masMeses(siguiente, -12)), dmy(masDias(siguiente, -1))]);
    let f = await T('renovFechas');
    ok(f.limite === iso(limite), `último día para decidir: ${f.limite} · termina ${f.fin} · entrega máxima ${f.tope}`);

    console.log('\n1. Avisos (faltando 15, 5, 3, 1 día y el día límite)');
    for (const d of [15, 14, 5, 3, 1, 0]) {
      await T('renovRevisar', { hoy: iso(masDias(limite, -d)) });
      const n = await correos();
      if (d === 14) ok(n.length === 0, 'al día siguiente no repite el aviso');
      else ok(n.length === 2, `faltando ${d} día(s): sale a las dos partes`);
    }
    const ult = ((await T('log')).correos || []).filter(c => /Hoy es el último día/.test(c.asunto));
    ok(ult.length === 2 && /Terminar/.test(ult[0].texto) && /Renovar/.test(ult[0].texto), 'el del día límite trae los botones Terminar y Renovar');

    console.log('\n2. Renovar: los dos renuevan');
    const I = enlace(f.urlI), P = enlace(f.urlP);
    const info = await api({ accion: 'infoRenovacion', ...I });
    ok(info.ok && info.rol === 'INQUILINO' && info.faltan === 15 && info.motivos.length === 4, `la página abre: faltan ${info.faltan} días, mes final ${info.mesFinal}`);
    ok(!(await api({ accion: 'infoRenovacion', ...I, t: 'malo' })).ok, 'un enlace con token falso se rechaza');
    const r1 = await api({ accion: 'decidirRenovacion', ...I, decision: 'RENOVAR' });
    ok(r1.ok && /cuando/.test(r1.mensaje), 'el inquilino renueva: queda esperando al propietario');
    ok(!(await api({ accion: 'decidirRenovacion', ...I, decision: 'TERMINAR', motivo: 'Mudanza' })).ok, 'ya decidió: no puede cambiar');
    const r2 = await api({ accion: 'decidirRenovacion', ...P, decision: 'RENOVAR' });
    ok(r2.ok && /renovaron/.test(r2.mensaje), 'el propietario renueva: contrato renovado');
    await correos();
    const f2 = await T('renovFechas');
    ok(f2.fin > f.fin && f2.fin.slice(0, 4) - f.fin.slice(0, 4) === 1, 'el periodo vigente pasa al año siguiente: termina ' + f2.fin);
    ok(/ya se renovó/.test((await api({ accion: 'infoRenovacion', ...I })).mensaje || ''), 'el enlace del año anterior dice que ya se renovó');
    await T('renovLimpiar');

    console.log('\n3. Terminar: el propietario termina con motivo propio');
    f = await T('renovFechas');
    const P3 = enlace(f.urlP), I3 = enlace(f.urlI);
    ok(!(await api({ accion: 'decidirRenovacion', ...P3, decision: 'TERMINAR', motivo: 'Otro' })).ok, '"Otro" sin escribir el motivo no pasa');
    const t1 = await api({ accion: 'decidirRenovacion', ...P3, decision: 'TERMINAR', motivo: 'Otro', motivoOtro: 'Remodelación del inmueble' });
    ok(t1.ok, 'el propietario termina: ' + (t1.mensaje || ''));
    const n3 = await correos();
    ok(n3.filter(c => c.adjuntos === 1).length === 2, 'a las dos partes les llega la notificación con el documento');
    const inq = ((await T('log')).correos || []).find(c => /Terminación del contrato/.test(c.asunto) && /inventario/.test(c.texto) && /máximo hasta/.test(c.texto));
    ok(!!inq, 'al inquilino: entregar acorde al inventario, máximo 5 días después');
    ok(/ya se terminó/.test((await api({ accion: 'decidirRenovacion', ...I3, decision: 'RENOVAR' })).mensaje || ''), 'el inquilino ya no puede decidir: el contrato ya se terminó');
    const est = (await T('renovFechas')).estado;
    ok(est.resultado === 'TERMINADO' && est.terminadoPor === 'PROPIETARIO' && !!est.documento, 'queda TERMINADO por el propietario, con documento');
    if (est.documento) {
      const d = await T('docTexto', { url: est.documento });
      const t = d.texto;
      console.log('     carpeta del documento:', d.carpeta);
      ok(!/\[PARA ARRENDATARIO\]|PÁRRAFO OPCIONAL PARA ARRENDATARIO|Me comprometo a entregar/.test(t), 'no quedó el párrafo del arrendatario');
      ok(/Para efectos de la entrega del inmueble/.test(t) && /Remodelación del inmueble/.test(t), 'quedó el párrafo del arrendador con el motivo');
      ok(/en mi calidad de ARRENDADOR/.test(t) && /\[la entrega\/recepción\]/.test(t) === false, 'calidad ARRENDADOR y "la recepción" llenos');
      const quedan = t.match(/\[[^\]]{2,}\]/g) || [];
      ok(!quedan.length, 'no quedan espacios sin llenar' + (quedan.length ? ': ' + quedan.join(' ') : ''));
    }
    await T('renovLimpiar');

    console.log('\n4. Sin respuesta: pasa el día límite');
    await T('renovRevisar', { hoy: iso(masDias(limite, 1)) });
    let n4 = await correos();
    ok(n4.length === 1 && /sin respuesta/.test(n4[0].asunto), 'a ti te llega el caso para llamar');
    await T('renovRevisar', { hoy: iso(masDias(limite, 2)) });
    n4 = await correos();
    ok(n4.length === 0, 'no lo repite');
    const caso = ((await T('log')).correos || []).find(c => /sin respuesta/.test(c.asunto));
    ok(caso && /WhatsApp inquilino/.test(caso.texto) && /Llamar al propietario/.test(caso.texto), 'trae WhatsApp y llamar de los dos');
    if (dejar) { await T('renovLimpiar'); f = await T('renovFechas'); console.log('\nPara ver la página:\n  inquilino:   ' + f.urlI + '\n  propietario: ' + f.urlP); }
  } finally {
    if (!dejar) { await celdas(originales); await T('renovLimpiar'); await T('off'); console.log('\nFechas restauradas · casos borrados · modo prueba apagado'); }
    else console.log('\n(--dejar) contrato corrido y modo prueba ACTIVO: restaurar después');
  }
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO BIEN');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
