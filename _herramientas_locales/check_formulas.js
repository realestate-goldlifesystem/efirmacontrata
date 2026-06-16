const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

async function run() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ100",
    valueRenderOption: 'FORMULA'
  });
  
  const rows = res.data.values;
  const headers = rows[0];
  
  const zoneHeaders = [
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #1 Zona Residencial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #2 Zona Comercial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #3 Zona Industrial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #4 Zona Campestre]"
  ];
  
  const indices = zoneHeaders.map(zh => headers.indexOf(zh));
  
  console.log('--- REVISIÓN DE FORMULAS EN ZONAS ---');
  for (let idx = 0; idx < zoneHeaders.length; idx++) {
    const colIdx = indices[idx];
    const colLetter = String.fromCharCode(65 + (colIdx % 26)); // simplified
    console.log(`\nColumna ${colIdx + 1}: "${zoneHeaders[idx]}"`);
    
    // Check first 5 rows and last 5 rows formulas
    for (let r = 1; r < 5 && r < rows.length; r++) {
      console.log(`  Fila ${r + 1} (Fórmula): [${rows[r][colIdx] || ''}]`);
    }
    console.log('  ...');
    for (let r = Math.max(5, rows.length - 3); r < rows.length; r++) {
      console.log(`  Fila ${r + 1} (Fórmula): [${rows[r][colIdx] || ''}]`);
    }
  }
}
run().catch(console.error);
