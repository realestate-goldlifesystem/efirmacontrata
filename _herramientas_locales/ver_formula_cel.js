// Fórmula guardada en CELULAR de las citas con #ERROR! (enmascarada)
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', range: "'2 - AGENDA CITAS'", valueRenderOption: 'FORMULA' });
  const v = r.data.values, i = v[0].indexOf('CELULAR');
  console.log(v.slice(-8).map(f => String(f[i]).replace(/d(?=d{3})/g, '*')));
  let n = 0; v.slice(1).forEach((f, k) => { if (/^=/.test(String(f[i]))) { n++; if (n <= 3) console.log(k + 2, String(f[i]).replace(/\d(?=\d{3})/g, '•')); } });
  console.log('filas con fórmula:', n, 'de', v.length - 1);
})();
