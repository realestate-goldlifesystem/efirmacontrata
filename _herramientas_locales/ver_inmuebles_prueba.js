// Lista los inmuebles de PRUEBA en 1.1 (propietario "PRUEBA SISTEMA") con su estado
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const sheets = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }) });
(async () => {
  const v = (await sheets.spreadsheets.values.get({ spreadsheetId: '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', range: "'1.1 - INMUEBLES REGISTRADOS'" })).data.values;
  const h = v[0].map(x => String(x).trim()), c = n => h.indexOf(n);
  v.slice(1).forEach(r => { if (/PRUEBA/i.test(r[c('NOMBRES Y APELLIDOS DEL PROPIETARIO')] || '')) console.log(r[c('ID DE REGISTRO')], '|', r[c('ESTADO')] || r[c('ESTADO DEL INMUEBLE')] || '', '|', r[c('NOMBRE COMPLETO INQUILINO')] || '', '|', r[c('FECHA INICIO DEL CONTRATO')] || ''); });
})();
