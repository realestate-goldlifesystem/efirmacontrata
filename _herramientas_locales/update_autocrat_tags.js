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

        for (let j = 0; j < rows[job3RowIndex].length; j++) {
            let cellValue = rows[job3RowIndex][j];
            if (cellValue && cellValue.startsWith('[') && cellValue.includes('headerMap')) {
                let mapping = JSON.parse(cellValue);
                let updated = false;

                mapping.forEach(m => {
                    if (!m.tag) return;
                    if (m.tag === 'PRECIO DE VENTA EN LETRA') {
                        m.details.headerMap = "PRECIO DE PROMOCION EN VENTA EN LETRA";
                        updated = true;
                    }
                    if (m.tag === 'PRECIO DE VENTA EN NUM') {
                        m.details.headerMap = "PRECIO DE PROMOCION EN VENTA";
                        updated = true;
                    }
                });

                if (updated) {
                    const newJson = JSON.stringify(mapping);
                    const colLetter = String.fromCharCode(65 + j);
                    const a1Notation = `'${SHEET_NAME}'!${colLetter}${job3RowIndex + 1}`;
                    
                    console.log(`Writing back to ${a1Notation}...`);
                    
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: a1Notation,
                        valueInputOption: 'RAW',
                        requestBody: {
                            values: [[newJson]]
                        }
                    });
                    
                    console.log("Successfully updated the Autocrat tags!");
                }
            }
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

main();
