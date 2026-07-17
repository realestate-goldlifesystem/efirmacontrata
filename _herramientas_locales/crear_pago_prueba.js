const { google } = require('googleapis');
const path = require('path');

const KEY_FILE = path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json');
const SHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

function getAuth() {
    return new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

function getSheets() {
    return google.sheets({ version: 'v4', auth: getAuth() });
}

async function run() {
    const sheets = getSheets();
    const cdr = 'WC815980';
    console.log(`Buscando si ya existe un pago registrado para el CDR ${cdr}...`);

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'PAGOS_RECIBIDOS!A:F'
    });

    const rows = res.data.values || [];
    const existingPayment = rows.find(r => String(r[2]) === cdr);

    if (existingPayment) {
        console.log(`Ya existe un pago registrado para ${cdr}:`, existingPayment);
        // Si no está aprobado, lo actualizamos a APROBADO
        if (existingPayment[4] !== 'APROBADO') {
            const rowIndex = rows.indexOf(existingPayment) + 1;
            console.log(`Actualizando estado del pago existente a APROBADO en la fila ${rowIndex}...`);
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `PAGOS_RECIBIDOS!E${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [['APROBADO']]
                }
            });
            console.log('¡Pago actualizado!');
        }
    } else {
        console.log(`Registrando nuevo pago APROBADO para el CDR de prueba ${cdr}...`);
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'PAGOS_RECIBIDOS!A:F',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    new Date().toISOString(),
                    'TEST-PAYMENT-' + Date.now(),
                    cdr,
                    85000,
                    'APROBADO',
                    JSON.stringify({ test: true })
                ]]
            }
        });
        console.log('¡Pago de prueba creado exitosamente!');
    }
}

run().catch(console.error);
