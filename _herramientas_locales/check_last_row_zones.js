const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

async function run() {
  const resData = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'1.1 - INMUEBLES REGISTRADOS'!A:ZZ",
  });
  
  const rows = resData.data.values;
  const headers = rows[0];
  
  const zoneHeaders = [
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #1 Zona Residencial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #2 Zona Comercial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #3 Zona Industrial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #4 Zona Campestre]"
  ];
  
  const indices = zoneHeaders.map(zh => headers.indexOf(zh));
  const idIdx = headers.indexOf('ID DE REGISTRO');
  const cdrIdx = headers.indexOf('CODIGO DE REGISTRO');
  const tipoIdx = headers.indexOf('TIPO DE NEGOCIO');
  const estadoIdx = headers.indexOf('ESTADO DEL INMUEBLE');
  
  console.log('--- REVISIÓN DE ÚLTIMAS 5 FILAS ---');
  for (let i = Math.max(1, rows.length - 5); i < rows.length; i++) {
    const row = rows[i];
    console.log(`\nFila ${i + 1}:`);
    console.log(`  CDR: ${row[cdrIdx] || 'N/A'}`);
    console.log(`  ID: ${row[idIdx] || 'N/A'}`);
    console.log(`  Tipo: ${row[tipoIdx] || 'N/A'}`);
    console.log(`  Estado: ${row[estadoIdx] || 'N/A'}`);
    zoneHeaders.forEach((zh, idx) => {
      const colIdx = indices[idx];
      const val = colIdx !== -1 ? row[colIdx] : 'N/A';
      console.log(`  "${zh}": [${val}]`);
    });
  }
}
run().catch(console.error);
