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

  const codeHeaders = [
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #1 Zona Residencial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #2 Zona Comercial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #3 Zona Industrial]",
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #4 Zona Campestre]"
  ];

  console.log('--- DETALLADO DE ZONAS ---');
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h && h.includes('zona se encuentra el inmueble')) {
      console.log(`\nColumna ${i + 1} en Sheet: "${h}"`);
      console.log(`Longitud: ${h.length}`);
      
      // Look for match in codeHeaders
      const matchIdx = codeHeaders.indexOf(h);
      if (matchIdx !== -1) {
        console.log(`✅ MATCH EXACTO con codeHeaders[${matchIdx}]`);
      } else {
        console.log(`❌ NO MATCH con codeHeaders. Comparando caractéres:`);
        // Find closest codeHeader
        const expected = codeHeaders.find(ch => ch.includes(h.substring(0, 10))) || codeHeaders[0];
        console.log(`Esperado (código): "${expected}"`);
        console.log(`Longitud esperado: ${expected.length}`);
        
        // Character level analysis
        const maxLen = Math.max(h.length, expected.length);
        for (let j = 0; j < maxLen; j++) {
          const charSheet = h[j] || '';
          const charCode = expected[j] || '';
          if (charSheet !== charCode) {
            console.log(`Diferencia en índice ${j}: Sheet='${charSheet}' (code: ${charSheet.charCodeAt(0)}), Código='${charCode}' (code: ${charCode.charCodeAt(0)})`);
            break;
          }
        }
      }
    }
  }
}
run().catch(console.error);
