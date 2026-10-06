// Deja UNA fila por pago en PAGOS_RECIBIDOS.
//
// Mercado Pago avisa varias veces del mismo pago y, hasta el 05-oct-2026, el
// webhook anotaba una fila por cada aviso (un pago llegó a quedar 9 veces).
// Desde @511 el webhook ya no duplica; esto limpia lo que quedó de antes.
//
// De cada grupo con el mismo "ID Mercado Pago" se conserva la fila de estado más
// avanzado (lo que ya decidió el auditor: CONSOLIDADO / REEMBOLSADO pesan más
// que APROBADO) y, a igualdad, la más antigua. Las demás se borran.
//
// Uso:
//   node limpiar_pagos_duplicados.js            → SIMULACIÓN
//   node limpiar_pagos_duplicados.js --borrar   → borra las repetidas
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = 'PAGOS_RECIBIDOS';
const BORRAR = process.argv.includes('--borrar');

// Cuanto más alto, más "definitivo" es el estado
const peso = (estado) => {
  const e = String(estado || '').toUpperCase();
  if (/REEMBOLS/.test(e)) return 3;
  if (/CONSOLID/.test(e)) return 3;
  if (/APROB/.test(e)) return 1;
  return 2;                     // cualquier otro estado que haya puesto el sistema: no perderlo
};

(async () => {
  console.log(BORRAR ? '🧹 BORRANDO' : '🔎 SIMULACIÓN');
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET, fields: 'sheets(properties(title,sheetId))' });
  const sheetId = meta.data.sheets.find(s => s.properties.title === HOJA).properties.sheetId;

  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${HOJA}'!A1:E` });
  const [h, ...filas] = r.data.values;
  const enc = h.map(x => String(x).trim());
  const cIdMP = enc.indexOf('ID Mercado Pago'), cEstado = enc.indexOf('Estado'), cCdr = enc.findIndex(x => /^CDR/.test(x));
  if (cIdMP === -1 || cEstado === -1) throw new Error('No encontré las columnas ID Mercado Pago / Estado');

  const grupos = new Map();
  filas.forEach((f, i) => {
    const id = String(f[cIdMP] || '').trim();
    if (!id) return;
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push({ fila: i + 2, estado: String(f[cEstado] || '').trim(), cdr: f[cCdr], fecha: f[0] });
  });

  const aBorrar = [];
  for (const [id, g] of grupos) {
    // estado más avanzado primero; a igualdad, la fila más antigua (número de fila menor)
    const orden = g.slice().sort((a, b) => peso(b.estado) - peso(a.estado) || a.fila - b.fila);
    const queda = orden[0];
    const estados = [...new Set(g.map(x => x.estado))].join(' / ');
    console.log(`${g.length > 1 ? '🔁' : '  '} ${id} | ${queda.cdr} | ${g.length} fila(s) | estados: ${estados}`);
    console.log(`      se conserva: fila ${queda.fila} (${queda.estado}, ${queda.fecha})`);
    orden.slice(1).forEach(x => aBorrar.push(x.fila));
  }

  console.log(`\nPagos reales: ${grupos.size} | filas repetidas a borrar: ${aBorrar.length}`);
  if (!aBorrar.length) return;
  if (!BORRAR) { console.log('(simulación: agrega --borrar para hacerlo)'); return; }

  // De MAYOR a MENOR: al revés, cada borrado correría las filas siguientes.
  aBorrar.sort((a, b) => b - a);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET,
    requestBody: { requests: aBorrar.map(f => ({ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: f - 1, endIndex: f } } })) },
  });
  console.log('✅ Filas repetidas borradas.');
})().catch(e => { console.error(e.message); process.exit(1); });
