const { google } = require('googleapis');
const path = require('path');

const KEY_FILE = path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json');
const SHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

async function validarSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Listar todas las pestañas
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  console.log('\n=== PESTAÑAS DEL SHEET ===');
  meta.data.sheets.forEach(s => {
    console.log(' -', s.properties.title, '| hidden:', s.properties.hidden || false);
  });

  // 2. Últimos 50 registros de PAGOS_RECIBIDOS
  try {
    const pagos = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'PAGOS_RECIBIDOS!A1:E500' // Leer hasta 500 filas
    });
    console.log('\n=== PAGOS_RECIBIDOS (últimos 50 registros) ===');
    const rows = pagos.data.values || [];
    console.log('Total registros:', rows.length - 1);
    const last50 = rows.slice(-50);
    last50.forEach((row, i) => {
      console.log(`Row ${rows.length - last50.length + i}: Fecha: ${row[0]} | PaymentID: ${row[1]} | CDR: ${row[2]} | Monto: ${row[3]} | Estado: ${row[4]}`);
    });
  } catch(e) {
    console.log('PAGOS_RECIBIDOS error:', e.message);
  }

  // 3. Encabezados de 1.1 - INMUEBLES REGISTRADOS (columnas clave)
  try {
    const inm = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: '1.1 - INMUEBLES REGISTRADOS!A1:BZ1'
    });
    const headers = inm.data.values[0] || [];
    console.log('\n=== ENCABEZADOS INMUEBLES (total:', headers.length, ') ===');
    headers.forEach((h, i) => {
      if (h) console.log(`  Col ${i} (${String.fromCharCode(65 + i)}): ${h}`);
    });
  } catch(e) {
    console.log('Error leyendo inmuebles:', e.message);
  }
}

validarSheet().catch(console.error);
