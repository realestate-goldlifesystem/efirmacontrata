// Validación del año nuevo con IPC (AJUSTE_ANUAL_IPC.js) en el inmueble de PRUEBA, en modo prueba sin correos.
// Corre el contrato para que se pueda renovar hoy, las dos partes renuevan y se recorre: IPC → propietario →
// corrección → aprobación → acta. Restaura FECHA INICIO / FECHA FINAL (originales de ZA471452: 1/11/2026 y
// 31/10/2027), borra lo creado y el IPC de prueba. Requiere TEMP_controlPrueba. 28-oct-2026.
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
const ORIGINALES = ['1/11/2026', '31/10/2027'];
const letra = n => { let t = ''; n++; while (n) { const m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };
async function celdas(valores) {
  const v = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${H11}'` })).data.values;
  const h = v[0].map(x => String(x).trim()), k = v.findIndex(r => r[h.indexOf('ID DE REGISTRO')] === ID);
  const cols = ['FECHA INICIO DEL CONTRATO', 'FECHA FINAL DEL CONTRATO'];
  for (let j = 0; j < cols.length; j++)
    await sheets.spreadsheets.values.update({ spreadsheetId: SHEET, range: `'${H11}'!${letra(h.indexOf(cols[j]))}${k + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[valores[j]]] } });
}
const dmy = d => d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
const masDias = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const masMeses = (d, n) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
let fallas = 0, nLog = 0;
const ok = (c, m) => { console.log(c ? '  OK ' : '  MAL', m); if (!c) fallas++; };
const T = (que, extra) => api(Object.assign({ accion: 'TEMP_controlPrueba', que, id: ID }, extra || {}));
async function correos() {
  const l = (await T('log')).correos || []; const n = l.slice(nLog); nLog = l.length;
  n.forEach(c => console.log('     ✉', String(c.para).replace(/@.*/, '@…'), '| adj', c.adjuntos, '|', c.asunto));
  return n;
}
const enlace = (u, extra) => { const q = new URL(u).searchParams; const o = {}; for (const [k, v] of q) o[k] = v; return Object.assign(o, extra || {}); };

(async () => {
  let anioIpc = null;
  try {
    ok((await T('on')).on === ID, 'modo prueba sin correos activo');
    await T('renovLimpiar');
    const hoy = new Date(Date.now() - 5 * 3600000); hoy.setUTCHours(12, 0, 0, 0);
    const limite = masDias(hoy, 15), siguiente = masMeses(masDias(limite, 1), 3);
    await celdas([dmy(masMeses(siguiente, -12)), dmy(masDias(siguiente, -1))]);
    anioIpc = siguiente.getUTCFullYear() - 1;
    const f = await T('renovFechas');
    let a = await T('ajuste', { anioIpc });
    ok(!a.ipcGuardado, `todavía no hay IPC ${anioIpc} guardado (si lo hubiera, la prueba lo borraría al final)`);

    console.log('\n1. Las dos partes renuevan');
    ok((await api({ accion: 'decidirRenovacion', ...enlace(f.urlI), decision: 'RENOVAR' })).ok, 'el inquilino renueva');
    ok((await api({ accion: 'decidirRenovacion', ...enlace(f.urlP), decision: 'RENOVAR' })).ok, 'el propietario renueva');
    await correos();
    a = await T('ajuste', { anioIpc });
    ok(a.ajuste && a.ajuste.estado === 'ESPERANDO_IPC' && a.ajuste.mesDesde === 13, `se crea el ajuste del año 2 desde el mes ${a.ajuste && a.ajuste.mesDesde}, esperando el IPC ${anioIpc}`);
    const Ag = enlace(a.urlA), Pr = enlace(a.urlP);

    console.log('\n2. Escribes el IPC');
    ok(!(await api({ accion: 'enviarAjustePropietario', ...Pr, admin: '250000', base64: PNG, mimeType: 'image/png' })).ok, 'el propietario no puede enviar antes del IPC');
    ok(!(await api({ accion: 'guardarIpcAjuste', ...Pr, ipc: '5' })).ok, 'el propietario no puede escribir el IPC');
    ok(!(await api({ accion: 'guardarIpcAjuste', ...Ag, ipc: '80' })).ok, 'un IPC absurdo (80%) se rechaza');
    const g = await api({ accion: 'guardarIpcAjuste', ...Ag, ipc: '5,2' });
    ok(g.ok, g.mensaje || '');
    await correos();
    a = await T('ajuste', { anioIpc });
    const esperado = Math.round(a.ajuste.canonAnterior * 1.052 / 100) * 100;
    ok(a.ajuste.estado === 'ESPERANDO_PROPIETARIO' && a.ajuste.canonNuevo === esperado, `canon ${a.ajuste.canonAnterior} → ${a.ajuste.canonNuevo} (5,2%, redondeado a la centena)`);
    ok(Number(a.ipcGuardado) === 5.2, `IPC_${anioIpc} queda guardado para los demás contratos`);

    console.log('\n3. El propietario completa, pides corrección y lo vuelve a enviar');
    ok(!(await api({ accion: 'enviarAjustePropietario', ...Pr, admin: '250000' })).ok, 'sin recibo no deja enviar');
    ok((await api({ accion: 'enviarAjustePropietario', ...Pr, admin: '250000', base64: PNG, mimeType: 'image/png' })).ok, 'el propietario envía administración $250.000 y el recibo');
    await correos();
    ok(!(await api({ accion: 'enviarAjustePropietario', ...Pr, admin: '1' })).ok, 'en revisión: no deja enviar otra vez');
    ok(!(await api({ accion: 'revisarAjusteAnual', ...Ag, decision: 'CORREGIR' })).ok, 'la corrección necesita comentario');
    ok((await api({ accion: 'revisarAjusteAnual', ...Ag, decision: 'CORREGIR', comentario: 'El recibo no se ve completo' })).ok, 'pides la corrección');
    await correos();
    let info = await api({ accion: 'infoAjusteAnual', ...Pr });
    ok(info.estado === 'CORREGIR' && info.comentario === 'El recibo no se ve completo' && info.recibo === 'cargado', 'el propietario ve tu comentario (y el recibo anterior sigue cargado)');
    ok((await api({ accion: 'enviarAjustePropietario', ...Pr, admin: '260000' })).ok, 'lo corrige a $260.000 sin volver a subir el recibo');
    await correos();

    console.log('\n4. Apruebas');
    const r = await api({ accion: 'revisarAjusteAnual', ...Ag, decision: 'APROBAR' });
    ok(r.ok, r.mensaje || '');
    const n = await correos();
    ok(n.filter(c => c.adjuntos === 1 && /nuevo año/.test(c.asunto)).length === 2, 'al inquilino y al propietario les llega el acta');
    a = await T('ajuste', { anioIpc });
    ok(a.ajuste.estado === 'APROBADO' && a.mes13.canon === a.ajuste.canonNuevo && a.mes13.admin === 260000 && a.mes12.canon === a.ajuste.canonAnterior,
      `el mes 12 sigue en ${a.mes12.canon} + ${a.mes12.admin} y el mes 13 pasa a ${a.mes13.canon} + ${a.mes13.admin}`);
    ok(!(await api({ accion: 'revisarAjusteAnual', ...Ag, decision: 'APROBAR' })).ok, 'no se aprueba dos veces');
    if (a.ajuste.acta) {
      const d = await T('docTexto', { url: a.ajuste.acta });
      const t = d.texto;
      console.log('     carpeta del acta:', d.carpeta);
      ok(/incremento del 5.20%/.test(t) && new RegExp('del año ' + anioIpc).test(t) && !/5\.20%|año 2025/.test(t), `porcentaje y año corregidos: 5.20% del año ${anioIpc}`);
      const fmt = x => Math.round(x).toLocaleString('es-CO');
      ok(t.includes(fmt(a.ajuste.canonAnterior)) && t.includes(fmt(a.ajuste.canonNuevo)) && t.includes(fmt(a.ajuste.canonNuevo + 260000)), 'valor actual, nuevo y total con administración');
      const quedan = t.match(/\[[^\]]{2,}\]/g) || [];
      ok(!quedan.length, 'no quedan espacios sin llenar' + (quedan.length ? ': ' + quedan.join(' ') : ''));
      console.log('\n----- texto del acta -----\n' + t.trim() + '\n--------------------------');
    } else ok(false, 'no se generó el acta');
  } finally {
    await celdas(ORIGINALES);
    await T('renovLimpiar', { borrarIpc: anioIpc });
    await T('off');
    console.log('\nFechas restauradas · casos, archivos e IPC de prueba borrados · modo prueba apagado');
  }
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO BIEN');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
