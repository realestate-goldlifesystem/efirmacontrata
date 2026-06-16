const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

async function run() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'DO NOT DELETE - AutoCrat Job Settings'!A1:Z10",
  });
  const rows = res.data.values;
  
  for (let i = 1; i < rows.length; i++) {
    const jobName = rows[i][1];
    const mappingsStr = rows[i][14];
    
    if (mappingsStr && mappingsStr.startsWith('[')) {
      try {
        const mappings = JSON.parse(mappingsStr);
        mappings.forEach(m => {
          const tag = m.tag;
          const header = m.details?.headerMap || '';
          if (header.toLowerCase().includes('zona se encuentra')) {
            console.log(`Job: "${jobName}" -> Tag: <<${tag}>> -> Header: "${header}"`);
          }
        });
      } catch (e) {}
    }
  }
}
run().catch(console.error);
