const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

// Anclado por NOMBRE de columna, nunca por número.
const COLUMNAS = [
  'N° de Garajes',
  '¿Dispone de deposito?',
  'Selecciona el tipo de inmueble',
  'TIPO DE NEGOCIO'
];

async function run() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ200",
  });
  const rows = res.data.values;
  const headers = rows[0].map(h => (h || '').toString().trim());

  for (const nombre of COLUMNAS) {
    const idx = headers.indexOf(nombre);
    if (idx === -1) {
      console.log(`\n### "${nombre}" -> ❌ NO ENCONTRADA`);
      continue;
    }
    const conteo = {};
    for (let i = 1; i < rows.length; i++) {
      const v = (rows[i][idx] === undefined || rows[i][idx] === null) ? '' : String(rows[i][idx]).trim();
      conteo[v] = (conteo[v] || 0) + 1;
    }
    const ordenado = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    console.log(`\n### "${nombre}" (col ${idx + 1}) -> ${ordenado.length} valores distintos:`);
    ordenado.forEach(([val, n]) => {
      console.log(`   ${String(n).padStart(4)}x  ${val === '' ? '(vacío)' : '"' + val + '"'}`);
    });
  }
}
run().catch(console.error);
