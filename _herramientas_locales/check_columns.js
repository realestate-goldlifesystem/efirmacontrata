const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

async function run() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ1",
  });
  const headers = res.data.values[0];
  console.log("Columna FECHA INICIO DEL CONTRATO está en índice: " + headers.indexOf('FECHA INICIO DEL CONTRATO'));
  console.log("Columna FECHA FINAL DEL CONTRATO está en índice: " + headers.indexOf('FECHA FINAL DEL CONTRATO'));
  console.log("Total headers: " + headers.length);
}
run();
