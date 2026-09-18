// Muestra las últimas filas de '1.1 - INMUEBLES REGISTRADOS' para detectar
// registros enviados dos veces (misma dirección + mismo propietario).
// Solo lee: no modifica nada.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

const COLS = ['Marca temporal', 'ID DE REGISTRO', 'CODIGO DE REGISTRO', 'ESTADO DEL INMUEBLE',
  'DETALLES DEL ESTADO DEL INMUEBLE', 'Ingrese la Dirección del inmueble', 'NOMBRES Y APELLIDOS DEL PROPIETARIO',
  'TIPO DE NEGOCIO', 'LINK CARPETA DE CONTENIDO'];

async function run() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ",
  });
  const filas = res.data.values;
  const headers = filas[0];
  const idx = COLS.map(c => headers.findIndex(h => String(h).trim() === c));
  const n = Number(process.argv[2] || 5);
  for (let r = Math.max(1, filas.length - n); r < filas.length; r++) {
    console.log(`--- Fila ${r + 1}`);
    COLS.forEach((c, i) => console.log(`  ${c}: ${idx[i] === -1 ? '(sin columna)' : (filas[r][idx[i]] || '')}`));
  }
}
run().catch(e => console.error(e.message));
