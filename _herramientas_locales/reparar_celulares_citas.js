// Deja toda la columna CELULAR de '2 - AGENDA CITAS' como texto plano: formato @ y cada valor
// reescrito tal cual (RAW). Arregla los "+57 …" que la hoja tomaba por fórmula (#ERROR!). 27-oct-2026.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', HOJA = '2 - AGENDA CITAS';
const letra = n => { let s = ''; for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
(async () => {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ID, fields: 'sheets(properties(sheetId,title))' });
  const sheetId = meta.data.sheets.find(s => s.properties.title === HOJA).properties.sheetId;
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${HOJA}'`, valueRenderOption: 'FORMULA' });
  const v = r.data.values, i = v[0].indexOf('CELULAR');
  if (i < 0) throw new Error('No está la columna CELULAR');
  // 1) Toda la columna (sin el encabezado) con formato de texto plano
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ID, requestBody: { requests: [{ repeatCell: {
    range: { sheetId, startRowIndex: 1, startColumnIndex: i, endColumnIndex: i + 1 },
    cell: { userEnteredFormat: { numberFormat: { type: 'TEXT' } } }, fields: 'userEnteredFormat.numberFormat' } }] } });
  // 2) Cada valor reescrito como texto, sin "=" de fórmula
  const valores = v.slice(1).map(f => [String(f[i] === undefined ? '' : f[i]).replace(/^=/, '')]);
  await sheets.spreadsheets.values.update({ spreadsheetId: ID, range: `'${HOJA}'!${letra(i)}2:${letra(i)}${valores.length + 1}`,
    valueInputOption: 'RAW', requestBody: { values: valores } });
  // 3) Verificación: ninguno con error
  const c = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${HOJA}'!${letra(i)}2:${letra(i)}`, valueRenderOption: 'UNFORMATTED_VALUE' });
  const vals = (c.data.values || []).map(x => x[0]);
  console.log('filas:', vals.length, '· con error:', vals.filter(x => /#ERROR|#NAME|#VALUE/.test(String(x))).length, '· tipos:', [...new Set(vals.map(x => typeof x))].join(','));
})();
