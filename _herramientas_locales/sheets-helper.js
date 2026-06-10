// ==========================================
// GOOGLE SHEETS API HELPER (LOCAL)
// Conexión directa usando token OAuth2 local
// Real Estate Gold Life System
// ==========================================

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuración
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc'; // ID Real
const CREDENTIALS_PATH = path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json');

// Cargar Auth Client
function getAuth() {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth;
}

// Obtener Servicio Sheets
function getSheets() {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
}

// ==========================================
// OPERACIONES
// ==========================================

async function listarHojas() {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
    });

    const hojas = res.data.sheets.map(s => ({
        title: s.properties.title,
        id: s.properties.sheetId
    }));
    return hojas;
}

async function leer(rango) {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: rango
    });
    return res.data.values;
}

async function escribir(rango, valores) {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: rango,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: valores }
    });
    return res.data;
}

// ==========================================
// CLI HANDLER
// ==========================================

const [, , comando, ...args] = process.argv;

async function main() {
    try {
        switch (comando) {
            case 'test':
            case 'hojas':
                console.log('Obteniendo hojas...');
                console.log(await listarHojas());
                break;

            case 'leer':
                if (!args[0]) throw new Error('Falta el rango (Ej: Hoja1!A1:B2)');
                console.log(JSON.stringify(await leer(args[0]), null, 2));
                break;

            case 'escribir':
                if (!args[0] || !args[1]) throw new Error('Faltan argumentos (Ej: Hoja1!A1 \'[["valor"]]\')');
                // Parsear JSON seguro para Windows CMD
                const val = JSON.parse(args[1].replace(/'/g, '"'));
                console.log(await escribir(args[0], val));
                break;

            case 'leer-inquilinos':
                // Simular la funcion obtenerRegistrosInquilinos() de GESTOR DE DOCUMENTOS.js
                const dataInq = await leer(args[0] + '!A:AC'); // Hasta estado del inmueble
                const headersInq = dataInq[0];
                const registrosInq = [];
                for (let i = 1; i < dataInq.length; i++) {
                    const row = dataInq[i];
                    if (!row || row.length < 5) continue;
                    const detalles = (row[4] || '').toString();
                    const detallesLower = detalles.toLowerCase();

                    const esDeInquilino = detallesLower.includes('inquilino');
                    const esPendiente = detallesLower.includes('recibida') || detallesLower.includes('diligenciado') || detallesLower.includes('correcci');
                    const esAprobado = detallesLower.includes('aprobado') || detallesLower.includes('firmado');

                    if (esDeInquilino && esPendiente && !esAprobado) {
                        registrosInq.push({
                            cdr: row[0],
                            detalles: detalles
                        });
                    }
                }
                console.log(JSON.stringify(registrosInq, null, 2));
                break;
                const numFilas = parseInt(args[1] || '5', 10);
                const data = await leer(args[0] + '!A:AC'); // Hasta estado del inmueble
                const headers = data[0];
                const ultimas = data.slice(-numFilas);
                ultimas.forEach((fila, i) => {
                    console.log(`\n--- FILA -${numFilas - i} ---`);
                    console.log(`CDR: ${fila[0]}`);
                    console.log(`ESTADO (Col E): ${fila[4]}`);
                    console.log(`ESTADO DOC (Col G): ${fila[6]}`);
                    console.log(`ESTADO INMUEBLE (Col AC): ${fila[28]}`);
                });
                break;

            default:
                console.log('Uso: node sheets-helper.js [hojas | leer <rango> | escribir <rango> <json> | leer-ultimos <Hoja> <num>]');
        }
    } catch (e) {
        console.error('ERROR:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

main();
