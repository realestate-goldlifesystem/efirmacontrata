const { google } = require('googleapis');

const SERVICE_ACCOUNT_FILE = '../real-estate-ocr-468904-38d35bfd32d6.json';
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const SHEET_NAME = 'DO NOT DELETE - AutoCrat Job Settings';

async function main() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        // 1. Fetch the data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${SHEET_NAME}'!A1:Z10`
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found.");
            return;
        }

        let job3RowIndex = 3;
        let job3ColIndex = 14; // We know from before it's col 14 (O)

        let cellValue = rows[job3RowIndex][job3ColIndex];

        if (cellValue) {
            let mapping = JSON.parse(cellValue);
            
            console.log("Dumping tags for Job at row 3, col 14:");
            mapping.forEach(m => {
                if (m.tag && m.tag.includes('PRECIO')) {
                     console.log(m.tag);
                }
            });

        } else {
            console.log("Could not find mapping JSON cell for Job 3");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

main();
