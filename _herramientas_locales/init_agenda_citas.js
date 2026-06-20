const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const CREDENTIALS_PATH = path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json');

async function initAgendaCitas() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const sheetName = '2 - AGENDA CITAS';

        console.log(`Borrando formato antiguo de ${sheetName}...`);
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'`,
        });

        const headers = [
            "ID DE CITA",
            "FECHA CREACION",
            "ESTADO",
            "FECHA CITA",
            "HORA CITA",
            "NOMBRE CLIENTE",
            "CELULAR",
            "CORREO",
            "TIPO SERVICIO",
            "DIRECCION (Opcional)",
            "EVENTO CALENDAR ID",
            "DETALLES/NOTAS"
        ];

        console.log("Escribiendo nuevas cabeceras planas...");
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [headers] }
        });

        console.log("✅ Pestaña formateada exitosamente como base de datos plana.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

initAgendaCitas();
