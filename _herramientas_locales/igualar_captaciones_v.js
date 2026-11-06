// Inserta en 1 - CAPTACIONES V las columnas que tiene A y le faltan (antes de ID DE LEAD), con el formato vecino.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', SID = 331089647;
(async () => {
  const enc = (await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: "'1 - CAPTACIONES V'!1:1" })).data.values[0];
  if (enc.includes('CORREO DEL PROPIETARIO')) return console.log('Ya estaban.');
  const i = enc.indexOf('ID DE LEAD');
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ID, requestBody: { requests: [
    { insertDimension: { range: { sheetId: SID, dimension: 'COLUMNS', startIndex: i, endIndex: i + 2 }, inheritFromBefore: true } }] } });
  const L = String.fromCharCode(65 + i), L2 = String.fromCharCode(66 + i);
  await sheets.spreadsheets.values.update({ spreadsheetId: ID, range: `'1 - CAPTACIONES V'!${L}1:${L2}1`, valueInputOption: 'RAW', requestBody: { values: [['CORREO DEL PROPIETARIO', 'ID CITA']] } });
  console.log((await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: "'1 - CAPTACIONES V'!1:1" })).data.values[0].join(' | '));
})().catch(e => console.error(e.message));
