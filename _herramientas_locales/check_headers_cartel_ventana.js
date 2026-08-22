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
  const headers = res.data.values[0].map(h => h ? h.toString().trim() : '');

  console.log('--- 1. Coincidencia EXACTA (usada por indexOf en el código) ---');
  const exactos = ['TIPO DE NEGOCIO', 'PRECIO DE PROMOCION GENERAL', 'PRECIO DE PROMOCION EN VENTA'];
  exactos.forEach(req => {
    const idx = headers.indexOf(req);
    console.log(`${req}: ${idx !== -1 ? '✅ columna ' + (idx + 1) : '❌ NO ENCONTRADA'}`);
  });

  console.log('\n--- 2. Búsqueda flexible .includes() (usada por findCol) ---');
  const flexibles = {
    'tipo de inmueble': ['tipo de inmueble'],
    'habitacion': ['habitacion', 'habitaciones'],
    'bano/baño': ['bano', 'baño'],
    'garaje/parqueadero': ['garaje', 'parqueadero'],
    'dispone de deposito': ['dispone de deposito']
  };
  for (const [label, terms] of Object.entries(flexibles)) {
    const matches = headers
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => terms.some(t => h.toLowerCase().includes(t.toLowerCase())));
    console.log(`\n[${label}] -> ${matches.length} coincidencia(s):`);
    matches.forEach(m => console.log(`   col ${m.i + 1}: "${m.h}"`));
  }
}
run().catch(console.error);
