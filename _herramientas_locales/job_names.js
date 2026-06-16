const { google } = require('googleapis');

const path = require('path');
const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../real-estate-ocr-468904-38d35bfd32d6.json');
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

async function main() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'DO NOT DELETE - AutoCrat Job Settings'!A1:Z10"
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found.");
            return;
        }

        // Just log Job Names
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][1] === 'AUTORIZACIÓN DE INGRESO AL INMUEBLE') {
                console.log(`FOUND JOB:`, rows[i]);
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
