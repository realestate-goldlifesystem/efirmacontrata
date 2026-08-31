/** Mira si CHECK YT usa casillas de verificacion o texto, para imitarlo. */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

(async () => {
  const auth = new google.auth.GoogleAuth({ credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const v = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${HOJA}'!1:1` });
  const headers = v.data.values[0];
  const colYt = headers.indexOf('CHECK YT') + 1;
  const colMm = headers.indexOf('CHECK MULTIMEDIA') + 1;
  const L = n => { let s=''; while(n>0){const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26);} return s; };

  for (const [nombre, col] of [['CHECK YT', colYt], ['CHECK MULTIMEDIA', colMm]]) {
    const rango = `'${HOJA}'!${L(col)}1:${L(col)}12`;
    const g = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID, ranges: [rango],
      fields: 'sheets(data(rowData(values(effectiveValue,dataValidation,userEnteredFormat/backgroundColor))))',
      includeGridData: true });
    const filas = g.data.sheets[0].data[0].rowData || [];
    console.log(`\n=== ${nombre} (columna ${col} = ${L(col)}) ===`);
    filas.slice(1, 8).forEach((f, i) => {
      const c = (f.values && f.values[0]) || {};
      const val = c.effectiveValue ? JSON.stringify(c.effectiveValue) : '(vacia)';
      const dv = c.dataValidation ? c.dataValidation.condition.type : 'sin validacion';
      console.log(`  fila ${i + 2}: valor=${val}  validacion=${dv}`);
    });
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
