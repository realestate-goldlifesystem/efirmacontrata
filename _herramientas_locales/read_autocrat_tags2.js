const { google } = require('googleapis');

const SERVICE_ACCOUNT_FILE = '../real-estate-ocr-468904-38d35bfd32d6.json';
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

        // Search every cell in the jobs for a JSON array
        for (let i = 1; i < rows.length; i++) {
            for (let j = 0; j < rows[i].length; j++) {
                const cell = rows[i][j];
                if (cell && cell.startsWith('[') && cell.includes('headerMap')) {
                    const mapping = JSON.parse(cell);
                    console.log(`\n=== JOB ROW ${i} COL ${j} ===`);
                    mapping.forEach(m => {
                        const headerMap = m.details?.headerMap || '';
                        if (headerMap.toLowerCase().includes("precio")) {
                            console.log(`Tag: <<${m.tag}>> -> Header: "${headerMap}"`);
                        }
                    });
                }
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
