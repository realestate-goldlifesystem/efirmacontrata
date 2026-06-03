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
const CREDENTIALS_PATH = path.join(__dirname, 'backend', 'creds.json');
const TOKEN_PATH = path.join(__dirname, 'backend', 'sheet_token.json');

// Cargar Auth Client
function getAuth() {
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const keys = JSON.parse(content).installed || JSON.parse(content).web;

    const client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        keys.redirect_uris[0]
    );

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        client.setCredentials(token);
    } else {
        throw new Error('No se encontró el token. Ejecuta "node backend/simple_auth.js" primero.');
    }

    return client;
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

            default:
                console.log('Uso: node sheets-helper.js [hojas | leer <rango> | escribir <rango> <json>]');
        }
    } catch (e) {
        console.error('ERROR:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

main();
