/**
 * Revisa si la columna ESTADO DEL INMUEBLE tiene validación de datos (desplegable)
 * y qué valores admite. Necesario antes de introducir un estado nuevo como "EN COLA":
 * si la validación es estricta, un valor fuera de la lista se rechaza.
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

(async () => {
  const sheets = google.sheets({ version: 'v4', auth });

  const cab = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${HOJA}'!A1:ZZ1`
  });
  const headers = cab.data.values[0].map(h => (h || '').toString().trim());
  const idx = headers.indexOf('ESTADO DEL INMUEBLE');
  if (idx === -1) { console.error('No se encontró la columna'); process.exit(1); }
  const colNum = idx + 1;
  console.log(`Columna "ESTADO DEL INMUEBLE" -> nº ${colNum}`);

  // Traer la validación y los valores de una franja de filas con datos
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [`'${HOJA}'!R2C${colNum}:R80C${colNum}`],
    includeGridData: true,
    fields: 'sheets(data(rowData(values(userEnteredValue,dataValidation))))'
  });

  const filas = res.data.sheets[0].data[0].rowData || [];
  let validacion = null;
  const valores = new Set();

  filas.forEach(f => {
    const c = (f.values || [])[0];
    if (!c) return;
    if (c.dataValidation && !validacion) validacion = c.dataValidation;
    const v = c.userEnteredValue && c.userEnteredValue.stringValue;
    if (v) valores.add(v);
  });

  console.log('\n=== VALIDACIÓN DE DATOS ===');
  if (!validacion) {
    console.log('  Ninguna: la columna acepta texto libre. Se puede usar "EN COLA" sin problema.');
  } else {
    console.log('  Tipo        :', validacion.condition && validacion.condition.type);
    console.log('  strict      :', validacion.strict === true ? 'SÍ (rechaza valores fuera de lista)' : 'no (solo advierte)');
    const vals = (validacion.condition && validacion.condition.values) || [];
    console.log('  Admitidos   :', vals.map(v => v.userEnteredValue).join(' | '));
  }

  console.log('\n=== ESTADOS QUE YA APARECEN EN LOS DATOS ===');
  [...valores].forEach(v => console.log('  -', v));
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
