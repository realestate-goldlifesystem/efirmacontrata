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
  if (!rows || rows.length === 0) {
    console.log('No rows found');
    return;
  }
  
  for (let i = 1; i < rows.length; i++) {
    const jobName = rows[i][1];
    const templateId = rows[i][2];
    const mappingsStr = rows[i][14];
    console.log(`\n========================================`);
    console.log(`Job Name: ${jobName}`);
    console.log(`Template ID: ${templateId}`);
    
    if (mappingsStr && mappingsStr.startsWith('[')) {
      try {
        const mappings = JSON.parse(mappingsStr);
        console.log(`Mappings found: ${mappings.length}`);
        mappings.forEach(m => {
          const tag = m.tag;
          const header = m.details?.headerMap || '';
          if (tag.toLowerCase().includes('porcent') || tag.toLowerCase().includes('comis') || header.toLowerCase().includes('porcent') || header.toLowerCase().includes('comis')) {
            console.log(`  <<${tag}>> -> "${header}"`);
          }
        });
      } catch (e) {
        console.log(`  Error parsing JSON: ${e.message}`);
      }
    } else {
      console.log(`  No mappings JSON found in column 14`);
    }
  }
}
run().catch(console.error);
