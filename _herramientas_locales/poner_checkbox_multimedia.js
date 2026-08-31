/**
 * Convierte CHECK MULTIMEDIA en casilla de verificacion, igual que CHECK YT.
 *
 * Se hace por script y no a mano para que quede igual en todas las filas, tambien
 * en las futuras: el rango llega mas alla de la ultima fila con datos.
 *
 * Uso: node _herramientas_locales/poner_checkbox_multimedia.js [--aplicar]
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const HASTA_FILA = 2000;               // margen para registros futuros
const APLICAR = process.argv.includes('--aplicar');

(async () => {
  const auth = new google.auth.GoogleAuth({ credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const hoja = meta.data.sheets.find(s => s.properties.title === HOJA);
  const sheetId = hoja.properties.sheetId;

  const v = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${HOJA}'!1:1` });
  const headers = v.data.values[0];
  const col = headers.indexOf('CHECK MULTIMEDIA');   // por NOMBRE, no por numero
  if (col === -1) throw new Error('No existe la columna CHECK MULTIMEDIA');
  console.log(`CHECK MULTIMEDIA esta en la columna ${col + 1}`);
  console.log(`Se pondra casilla de verificacion en filas 2..${HASTA_FILA}`);

  if (!APLICAR) { console.log('\n🔎 SIMULACION. Para aplicarlo: --aplicar'); return; }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: HASTA_FILA,
                 startColumnIndex: col, endColumnIndex: col + 1 },
        rule: { condition: { type: 'BOOLEAN' }, showCustomUi: true, strict: true }
      }
    }] }
  });
  console.log('✅ Casillas de verificacion aplicadas.');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
