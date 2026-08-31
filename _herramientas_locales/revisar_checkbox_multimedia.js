/**
 * Revisa (y opcionalmente arregla) las casillas de CHECK MULTIMEDIA.
 *
 * ⚠️ TODO se resuelve por NOMBRE de columna. Las herramientas anteriores usaban
 * la letra fija "IK" y quedaron apuntando a otra columna en cuanto CHECK
 * MULTIMEDIA se movio de sitio en el Sheet.
 *
 * Uso: node _herramientas_locales/revisar_checkbox_multimedia.js [--aplicar]
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const HASTA = 2000;
const APLICAR = process.argv.includes('--aplicar');
const L = n => { let s=''; while(n>0){const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26);} return s; };

(async () => {
  const auth = new google.auth.GoogleAuth({ credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ID });
  const sheetId = meta.data.sheets.find(s => s.properties.title === HOJA).properties.sheetId;

  const v = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${HOJA}'!1:1` });
  const h = v.data.values[0].map(x => (x || '').trim());

  const idx = (nombre) => { const i = h.indexOf(nombre); if (i === -1) throw new Error('falta ' + nombre); return i; };
  const iMm = idx('CHECK MULTIMEDIA'), iYt = idx('CHECK YT');

  const estado = async (i, nombre) => {
    const g = await sheets.spreadsheets.get({ spreadsheetId: ID,
      ranges: [`'${HOJA}'!${L(i + 1)}2:${L(i + 1)}67`],
      fields: 'sheets(data(rowData(values(dataValidation))))', includeGridData: true });
    const filas = (g.data.sheets[0].data[0].rowData) || [];
    let con = 0;
    filas.forEach(f => { const c = (f.values && f.values[0]) || {};
      if (c.dataValidation && c.dataValidation.condition.type === 'BOOLEAN') con++; });
    console.log(`  ${nombre.padEnd(20)} columna ${i + 1} (${L(i + 1)})  con casilla: ${con}/${filas.length}`);
    return con;
  };

  console.log('=== estado actual (resuelto por nombre) ===');
  await estado(iYt, 'CHECK YT');
  const antes = await estado(iMm, 'CHECK MULTIMEDIA');

  // La columna vecina no debe haber quedado con casillas por error
  const iVecina = h.indexOf('Document Merge Status - AUTORIZACIÓN DE INGRESO AL INMUEBLE');
  if (iVecina !== -1) { console.log('  --- comprobando que no se toco otra columna ---'); await estado(iVecina, 'Document Merge St.'); }

  if (!APLICAR) { console.log('\n🔎 SIMULACION. Para aplicar casillas: --aplicar'); return; }

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ID, requestBody: { requests: [{
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: HASTA, startColumnIndex: iMm, endColumnIndex: iMm + 1 },
      rule: { condition: { type: 'BOOLEAN' }, showCustomUi: true, strict: true }
    } }] } });
  console.log('\n✅ casillas aplicadas. Verificando...');
  await estado(iMm, 'CHECK MULTIMEDIA');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

/* --- materializar: ver notas al pie del archivo --- */
