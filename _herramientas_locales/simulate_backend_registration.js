const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

async function run() {
  // 1. Fetch headers and last row
  const resMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetName = '1.1 - INMUEBLES REGISTRADOS';
  
  const resData = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A:ZZ`,
  });
  
  const rows = resData.data.values;
  const headers = rows[0].map(h => h ? h.toString().trim() : '');
  const lastRowIdx = rows.length; // 1-based index
  const lastRowData = rows[lastRowIdx - 1];
  
  console.log(`Last row index: ${lastRowIdx}`);
  console.log(`Headers count: ${headers.length}`);
  
  function getColumnByName(name) {
    const idx = headers.indexOf(name.trim());
    if (idx === -1) {
      console.log(`❌ Column not found: [${name}]`);
      return null;
    }
    return idx + 1;
  }
  
  // Let's simulate the lookups in extraerDatosInmueble
  const lookups = [
    'NOMBRES Y APELLIDOS DEL PROPIETARIO',
    'Número de documento',
    'TIPO DE NEGOCIO',
    'Ingrese la Dirección del inmueble',
    'N° o Letra de la Torre',
    'N° de inmueble',
    'CODIGO DE REGISTRO',
    'ID DE REGISTRO',
    'ESTADO DEL INMUEBLE',
    'DETALLES DEL ESTADO DEL INMUEBLE',
    'LINK DE CARPETA RPR'
  ];
  
  console.log('\n--- SIMULANDO LOOKUPS ---');
  let hasNull = false;
  lookups.forEach(col => {
    const colIdx = getColumnByName(col);
    if (colIdx === null) {
      hasNull = true;
    } else {
      const val = lastRowData[colIdx - 1];
      console.log(`Column [${col}] (col index ${colIdx}) -> Value: [${val}]`);
    }
  });
  
  // Let's also check if there are other lookups in Part 2
  const part2Lookups = [
    'Correo electrónico',
    'LINK DE CARPETA REG',
    'LINK CARPETA DE PROPIETARIO',
    'LINK CARPETA DE INQUILINO',
    'SOPORTES CONTABLES',
    'INMUEBLES REGISTRADOS',
    'LINK CARPETA DE CONTENIDO'
  ];
  
  console.log('\n--- LOOKUPS DE PARTE 2 ---');
  part2Lookups.forEach(col => {
    const colIdx = getColumnByName(col);
    if (colIdx === null) {
      hasNull = true;
    } else {
      const val = lastRowData[colIdx - 1];
      console.log(`Column [${col}] (col index ${colIdx}) -> Value: [${val}]`);
    }
  });
  
  if (hasNull) {
    console.log('\n⚠️ ERROR: Uno o más lookups retornaron null!');
  } else {
    console.log('\n✅ Todos los lookups principales son válidos.');
  }
}

run().catch(console.error);
