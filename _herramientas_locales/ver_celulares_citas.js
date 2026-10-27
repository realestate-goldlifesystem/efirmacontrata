// Muestra cómo está guardado el celular de las últimas citas (tipo y forma, sin datos completos)
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
(async () => {
  const hoja = process.argv[2];
  for (const modo of ['UNFORMATTED_VALUE', 'FORMATTED_VALUE']) {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', range: `'${hoja}'`, valueRenderOption: modo });
    const v = r.data.values, h = v[0], i = h.indexOf('CELULAR'), t = h.indexOf('TIPO AGENDA');
    console.log(modo, v.slice(-8).map(f => `${f[t]} ${typeof f[i]} ${String(f[i]).replace(/\d(?=\d{3})/g, '•')}`));
  }
})();
