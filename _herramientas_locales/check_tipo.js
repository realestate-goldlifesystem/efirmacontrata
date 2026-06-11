const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

async function run() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ",
  });
  const headers = res.data.values[0];
  const idxTipo = headers.indexOf('TIPO DE NEGOCIO');
  const idxEstado = headers.indexOf('ESTADO DEL INMUEBLE');
  
  const lastRow = res.data.values[res.data.values.length - 1];
  console.log(`Última fila (TIPO DE NEGOCIO: "${lastRow[idxTipo]}", ESTADO: "${lastRow[idxEstado]}")`);
}
run();
