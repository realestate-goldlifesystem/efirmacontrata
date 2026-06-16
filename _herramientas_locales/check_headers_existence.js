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
  
  const required = [
    'CODIGO DE REGISTRO',
    'ID DE REGISTRO',
    'ESTADO DEL INMUEBLE',
    'DETALLES DEL ESTADO DEL INMUEBLE',
    'NOMBRES Y APELLIDOS DEL PROPIETARIO',
    'Número de documento',
    'TIPO DE NEGOCIO',
    'Ingrese la Dirección del inmueble',
    'N° o Letra de la Torre',
    'N° de inmueble',
    'LINK DE CARPETA RPR',
    'LINK DE CARPETA REG',
    'LINK CARPETA DE PROPIETARIO',
    'LINK CARPETA DE INQUILINO',
    'SOPORTES CONTABLES',
    'LINK CARPETA DE CONTENIDO',
    'INMUEBLES REGISTRADOS',
    'Merged Doc ID - CORRETAJE',
    'Merged Doc ID - ADMINISTRACIÓN',
    'Merged Doc ID - VENTA',
    'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
    'Merged Doc ID - ADMI-VENTA',
    'Merged Doc ID - VENDI-RENTA'
  ];
  
  console.log('--- AUDITORÍA DE CABECERAS ---');
  required.forEach(req => {
    const idx = headers.indexOf(req);
    console.log(`${req}: ${idx !== -1 ? '✅ Fila encontrada en columna ' + (idx + 1) : '❌ NO ENCONTRADA'}`);
  });
}
run().catch(console.error);
