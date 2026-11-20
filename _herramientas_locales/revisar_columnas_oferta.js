// Cuenta valores y busca referencias a las columnas "% DE OFERTA A/V" de las
// pestañas de captaciones (sin imprimir datos personales).
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
(async () => {
  for (const t of ['1 - CAPTACIONES A', '1 - CAPTACIONES V']) {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${t}'!P2:Q`, valueRenderOption: 'FORMULA' });
    const filas = r.data.values || [];
    const cuenta = (i) => { const m = {}; filas.forEach(f => { const v = String(f[i] ?? '').trim(); if (v) m[v] = (m[v] || 0) + 1; }); return m; };
    console.log(t, 'P (% A):', JSON.stringify(cuenta(0)), '| Q (% V):', JSON.stringify(cuenta(1)));
  }
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ID, fields: 'sheets(properties(title,sheetId),conditionalFormats(ranges),protectedRanges(range),filterViews(range),basicFilter(range))' });
  meta.data.sheets.filter(s => s.properties.title.startsWith('1 - CAPT')).forEach(s => {
    console.log(s.properties.title, 'formatos condicionales:', (s.conditionalFormats || []).length, 'protegidos:', (s.protectedRanges || []).length, 'filtro:', !!s.basicFilter, 'vistas:', (s.filterViews || []).length);
  });
  // Validaciones de datos en P y Q (fila 2)
  const g = await sheets.spreadsheets.get({ spreadsheetId: ID, ranges: ["'1 - CAPTACIONES A'!P2:Q3", "'1 - CAPTACIONES V'!P2:Q3"], fields: 'sheets(properties(title),data(rowData(values(dataValidation,userEnteredFormat(numberFormat)))))' });
  g.data.sheets.forEach(s => console.log(s.properties.title, JSON.stringify(s.data[0].rowData?.[0])));
  // ¿Otras pestañas con fórmulas que miren las captaciones?
  const todas = await sheets.spreadsheets.get({ spreadsheetId: ID, fields: 'sheets(properties(title))' });
  const titulos = todas.data.sheets.map(s => s.properties.title);
  const rangos = titulos.map(x => `'${x}'!A1:AZ5`);
  const vals = await sheets.spreadsheets.values.batchGet({ spreadsheetId: ID, ranges: rangos, valueRenderOption: 'FORMULA' });
  vals.data.valueRanges.forEach((vr, i) => {
    const txt = JSON.stringify(vr.values || []);
    if (/CAPTACIONES/i.test(txt)) console.log('Referencia en', titulos[i]);
  });
})().catch(e => console.error(e.message));
