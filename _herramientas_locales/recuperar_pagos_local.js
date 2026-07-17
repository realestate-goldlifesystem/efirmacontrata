const { google } = require('googleapis');
const path = require('path');
const https = require('https');

const KEY_FILE = path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json');
const SHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const MP_ACCESS_TOKEN = 'APP_USR-8777396757564882-052314-43723717a419b60b7e28e4b9a4638c6d-365464952';

function getAuth() {
    return new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

function getSheets() {
    return google.sheets({ version: 'v4', auth: getAuth() });
}

function fetchMercadoPagoPayments() {
    return new Promise((resolve, reject) => {
        const url = 'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50';
        const options = {
            headers: {
                'Authorization': 'Bearer ' + MP_ACCESS_TOKEN
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log('Consultando últimos pagos en Mercado Pago...');
    const mpData = await fetchMercadoPagoPayments();
    if (!mpData.results || mpData.results.length === 0) {
        console.log('No se encontraron pagos en Mercado Pago.');
        return;
    }

    console.log(`Se encontraron ${mpData.results.length} pagos. Leyendo hoja PAGOS_RECIBIDOS...`);
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'PAGOS_RECIBIDOS!A:F'
    });

    const rows = res.data.values || [];
    const existingIds = rows.map(r => String(r[1])); // Columna B: ID Mercado Pago
    console.log(`Total pagos registrados en la hoja: ${rows.length - 1}`);

    console.log('\n=== ÚLTIMOS 10 PAGOS EN MERCADO PAGO ===');
    mpData.results.slice(0, 10).forEach(p => {
        console.log(`ID: ${p.id} | Fecha: ${p.date_created} | CDR: ${p.external_reference} | Monto: ${p.transaction_amount} | Estado: ${p.status} | Detalle: ${p.status_detail}`);
    });

    let count = 0;
    const pendingAppends = [];

    // Recorrer los pagos de Mercado Pago
    for (const pago of mpData.results) {
        const paymentId = String(pago.id);
        const estado = pago.status;
        const cdr = pago.external_reference;

        if (estado === 'approved' && cdr && !existingIds.includes(paymentId)) {
            console.log(`\n[NUEVO PAGO ENCONTRADO] ID: ${paymentId} | CDR: ${cdr} | Monto: ${pago.transaction_amount}`);
            pendingAppends.push([
                pago.date_approved || pago.date_created,
                paymentId,
                cdr,
                pago.transaction_amount,
                'APROBADO',
                JSON.stringify(pago)
            ]);
            count++;
        }
    }

    if (pendingAppends.length > 0) {
        console.log(`\nInsertando ${pendingAppends.length} pagos faltantes en Google Sheets...`);
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'PAGOS_RECIBIDOS!A:F',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: pendingAppends
            }
        });
        console.log('¡Pagos insertados exitosamente!');
    } else {
        console.log('\nNo hay pagos aprobados nuevos para registrar.');
    }
}

run().catch(console.error);
