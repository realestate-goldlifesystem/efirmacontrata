const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
(async () => {
  const r = await sheets.spreadsheets.values.batchGet({ spreadsheetId: ID, ranges: ["'1 - CAPTACIONES A'!1:1", "'1 - CAPTACIONES V'!1:1"] });
  const [a, v] = r.data.valueRanges.map(x => x.values[0]);
  console.log('A:', JSON.stringify(a)); console.log('V:', JSON.stringify(v));
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ID, fields: 'sheets(properties(title,sheetId,gridProperties))' });
  meta.data.sheets.filter(s => s.properties.title.startsWith('1 - CAPT')).forEach(s => console.log(JSON.stringify(s.properties)));
})().catch(e => console.error(e.message));
