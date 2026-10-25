// Prueba de punta a punta del bloque 5 (pagos del arriendo mes a mes, 25-oct-2026) con un
// inmueble de PRUEBA ("PRUEBA SISTEMA GOLD LIFE"): todos los correos van al correo del sistema.
//   Caso A: el propietario autorizó que Leonardo cobre el primer canon (revisa Leonardo + excedente).
//   Caso B: el inquilino le paga directo al propietario (revisa el propietario + honorarios).
// Requiere el endpoint temporal TEMP_pruebasPagos (preparar, subir, estado, recordar, cron, limpiar).
// Uso: node test_pagos_mensuales.js <ID inmueble de prueba> <A|B> [--sin-limpiar]
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
async function api(cuerpo) {
  for (let k = 0; k < 3; k++) {
    try {
      const r1 = await fetch(API, { method: 'POST', body: JSON.stringify(cuerpo), redirect: 'manual' });
      if (!r1.headers.get('location')) {
        const txt = (await r1.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        throw new Error('el servidor respondió con error: ' + txt.slice(0, 200));
      }
      const t = await (await fetch(r1.headers.get('location'))).text();
      return JSON.parse(t);
    } catch (e) { console.log('     (reintento: ' + e.message + ')'); if (k === 2) throw e; await new Promise(z => setTimeout(z, 8000)); }
  }
}
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const sheets = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', H11 = '1.1 - INMUEBLES REGISTRADOS';
const letra = (n) => { let t = ''; n++; while (n) { const m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };
// Fecha como la escribe el formulario (d/m/aaaa), a N días de hoy (negativo = atrás)
const fechaTexto = (dias, meses) => { const d = new Date(Date.now() - 5 * 3600000); if (meses) d.setUTCMonth(d.getUTCMonth() + meses); d.setUTCDate(d.getUTCDate() + dias); return d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
async function escribir(id, valores) {
  const v = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${H11}'` })).data.values;
  const h = v[0].map(x => String(x).trim()); const k = v.findIndex(r => r[h.indexOf('ID DE REGISTRO')] === id);
  for (const [col, val] of Object.entries(valores)) {
    const i = h.indexOf(col.trim()); if (i < 0) throw new Error('No existe la columna ' + col);
    await sheets.spreadsheets.values.update({ spreadsheetId: SHEET, range: `'${H11}'!${letra(i)}${k + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[val]] } });
  }
}
let fallas = 0;
const ok = (c, m) => { console.log(c ? '  OK ' : '  MAL', m); if (!c) fallas++; };
const isoDia = (ts) => new Date(ts - 5 * 3600000).toISOString().slice(0, 10);
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

(async () => {
  const [ID, CASO] = process.argv.slice(2);
  const T = (op, extra) => api(Object.assign({ accion: 'TEMP_pruebasPagos', op, id: ID, caso: CASO }, extra || {}));
  const revisa = CASO === 'A' ? 'AGENTE' : 'PROPIETARIO';
  console.log(`Caso ${CASO} · inmueble ${ID}\n\n1. Cargar el contrato autenticado`);
  const pr = await T('preparar');
  await escribir(ID, {
    'TIPO DE NEGOCIO': 'Corretaje', [pr.pregunta]: CASO === 'A' ? 'Sí' : 'No', [pr.pct]: '50%',
    'CANON FINAL DEL CONTRATO': 2000000, 'PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)': 200000,
    'FECHA INICIO DEL CONTRATO': fechaTexto(5), 'FECHA FINAL DEL CONTRATO': fechaTexto(369),
    'NOMBRE COMPLETO INQUILINO': 'INQUILINO PRUEBA SISTEMA', 'CORREO INQUILINO': 'realestate.goldlifesystem@gmail.com',
    'CELULAR INQUILINO': '3000000777', 'NUMERO DOCUMENTO INQUILINO': '1000000888', [pr.colFirma]: pr.firma
  });
  ok(pr.ok, 'datos del contrato listos');
  const sub = await T('subir');
  ok(sub.success, 'contrato cargado: ' + (sub.message || '').slice(0, 160));
  let e = await T('estado');
  ok(e.flujo && !e.acordada && !e.accProp && !e.pagos.length, 'solo se abre la sala: sin accesos ni cobros todavía');
  ok(e.cita, 'la sala de entrega está abierta');

  console.log('\n2. Se acuerda la fecha de entrega');
  const I = { c: e.cita.c, r: 'i', t: e.cita.ti }, P = { c: e.cita.c, r: 'p', t: e.cita.tp };
  let libres = [];
  for (let d = 2; libres.length < 3 && d < 9; d++) {
    const f = new Date(Date.now() + d * 86400000); if (f.getUTCDay() === 0) continue;
    libres = libres.concat(((await api({ accion: 'disponibilidadSalaEntrega', ...I, fecha: isoDia(f.getTime()) })).slots || []).map(x => x.timestamp));
  }
  await api({ accion: 'proponerSalaEntrega', ...I, pedidos: libres.slice(0, 3) });
  ok((await api({ accion: 'aceptarSalaEntrega', ...P, timestamp: libres[0] })).ok, 'el propietario acepta: entrega agendada');
  e = await T('estado');
  const m1 = e.pagos.find(x => x.mes === 1);
  ok(e.acordada && e.accProp, 'salen los accesos del propietario');
  ok(m1 && m1.revisa === revisa && m1.estado === 'PENDIENTE', 'mes 1 creado, lo revisa ' + revisa);
  console.log('     historial:', m1 && m1.historial.replace(/\n/g, ' | '));
  ok(m1 && /enviad/.test(m1.historial) && !/NO enviad/.test(m1.historial), CASO === 'A' ? 'cuenta de cobro a cuenta externa enviada' : 'cobro del mes 1 al inquilino y honorarios al propietario enviados');
  ok(!e.excedente, 'el excedente todavía no se pide');

  console.log('\n3. Recordatorio el día de la entrega');
  await T('recordar');
  e = await T('estado');
  ok(/ENTREGA_/.test(e.pagos.find(x => x.mes === 1).avisos), 'sale el recordatorio porque no ha cargado');

  console.log('\n4. Cargar y revisar el mes 1');
  const Pi = { p: m1.id, r: 'i', t: m1.token }, Pv = { p: m1.id, r: 'v', t: m1.tr };
  ok(!(await api({ accion: 'infoPagoMensual', p: m1.id, r: 'v', t: 'malo' })).ok, 'un enlace con token falso se rechaza');
  const info = await api({ accion: 'infoPagoMensual', ...Pi });
  ok(info.ok && info.valor === 2200000 && info.mes === 1, 'el inquilino ve el mes 1 por $2.200.000');
  const c1 = await api({ accion: 'cargarComprobanteMensual', ...Pi, base64: PNG, mimeType: 'image/png', nombre: 'comprobante.png' });
  ok(c1.ok, 'el inquilino carga el comprobante');
  const no = await api({ accion: 'revisarPagoMensual', ...Pv, decision: 'NO_ES', motivo: 'Es del mes pasado' });
  ok(no.ok, 'quien revisa dice "no es" con motivo');
  e = await T('estado');
  ok(e.pagos.find(x => x.mes === 1).estado === 'NO ES' && !e.accInq, 'queda "no es" y el inquilino aún sin carpeta');
  const infoNo = await api({ accion: 'infoPagoMensual', ...Pi });
  ok(infoNo.motivo === 'Es del mes pasado', 'el inquilino ve el motivo');
  ok((await api({ accion: 'cargarComprobanteMensual', ...Pi, base64: PNG, mimeType: 'image/png', nombre: 'otro.png' })).ok, 'carga el correcto');
  const si = await api({ accion: 'revisarPagoMensual', ...Pv, decision: 'VALIDAR' });
  ok(si.ok, 'quien revisa confirma "Recibí el pago"');
  e = await T('estado');
  ok(e.pagos.find(x => x.mes === 1).estado === 'VALIDADO' && e.accInq, 'mes 1 confirmado y el inquilino recibe su carpeta');
  if (CASO === 'A') ok(Number(e.excedente) === 1200000, 'ahora sí se pide el excedente: $' + e.excedente + ' (2.000.000 − 50% + 200.000)');
  ok(!(await api({ accion: 'cargarComprobanteMensual', ...Pi, base64: PNG, mimeType: 'image/png' })).ok, 'ya confirmado: no deja cargar otro');

  console.log('\n5. Mes 2 (días contados desde la fecha de inicio)');
  const inicioHace = async (meses, dias) => { await escribir(ID, { 'FECHA INICIO DEL CONTRATO': fechaTexto(-dias, -meses) }); };
  await inicioHace(1, 0); await T('cron');
  e = await T('estado');
  let m2 = e.pagos.find(x => x.mes === 2);
  ok(m2 && m2.revisa === 'PROPIETARIO' && /D1/.test(m2.avisos), 'día 1: se crea el mes 2 (revisa el propietario) y sale "ya puedes cargar"');
  await inicioHace(1, 4); await T('cron');
  e = await T('estado'); m2 = e.pagos.find(x => x.mes === 2);
  ok(/D5/.test(m2.avisos) && !/D6/.test(m2.avisos), 'día 5: "hoy es el último día"');
  await inicioHace(1, 5); await T('cron');
  e = await T('estado'); m2 = e.pagos.find(x => x.mes === 2);
  ok(/D6/.test(m2.avisos), 'día 6 sin comprobante: mora al inquilino, al propietario y el caso a Leonardo');
  await inicioHace(1, 5); await T('cron');
  e = await T('estado');
  ok(e.pagos.filter(x => x.mes === 2).length === 1 && (e.pagos.find(x => x.mes === 2).avisos.match(/D6/g) || []).length === 1, 'no repite avisos ni duplica el mes');
  const P2 = { p: m2.id, r: 'i', t: m2.token };
  ok((await api({ accion: 'cargarComprobanteMensual', ...P2, base64: PNG, mimeType: 'image/png' })).ok, 'el inquilino carga el del mes 2');
  await T('cron', { mes: 2, cargaHace: 49 });
  e = await T('estado');
  ok(/RECORDAR_REVISION/.test(e.pagos.find(x => x.mes === 2).avisos), 'a las 48 h sin revisar: recordatorio al propietario');
  console.log('     historial mes 2:', e.pagos.find(x => x.mes === 2).historial.replace(/\n/g, ' | '));

  if (!process.argv.includes('--sin-limpiar')) {
    const l = await T('limpiar');
    console.log('\nLimpieza:', l.log.join(', '), '|', l.limpieza.filter(x => /Correos|Fila|Carpetas/.test(x)).join(' · '));
  }
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO BIEN');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
