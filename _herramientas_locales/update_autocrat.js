const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc'; // ID Real
const CREDENTIALS_PATH = path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json');

const mapIDs = {
  'CORRETAJE': '1b6aL71TyCNvgOVEh7krZNQIYJdbCA5Zx15BYD6FEnxE',
  'ADMINISTRACIÓN': '1C_IJXKdf031UyWo2fO9O775DYZeWpKFxX53r3afoxmE',
  'VENTA': '1uPe1pK_e1MPI87KiOepNAeqWYpxgG7wwhrKbgfa6UL8',
  'VENDI-RENTA': '1RJDKSlknlIa9cxyAVICDck3HfwLP6y9m5PvP2MbyZqM',
  'ADMI-VENTA': '1IKmt_elr6neRUdN3lUtYmIdfgVYti4ULvef9sEz_E90',
  'AUTORIZACIÓN DE INGRESO AL INMUEBLE': '1t4I70FYHWXVzN9HvYzFpjXQr5NrAkCeJqQvSAuz22Rs'
};

async function main() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Obtener los datos actuales de la hoja de Autocrat
        console.log('Obteniendo configuración actual de Autocrat...');
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'DO NOT DELETE - AutoCrat Job Settings'!A:D" // Get first 4 columns, Job Name is B (index 1), Template ID is C (index 2)
        });
        
        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found.');
            return;
        }

        let updates = 0;
        // 2. Modificar los rows en memoria
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const jobName = (row[1] || '').toString().trim().toUpperCase();
            
            if (mapIDs[jobName]) {
                if (row[2] !== mapIDs[jobName]) {
                    console.log(`Actualizando ${jobName}: ${row[2]} -> ${mapIDs[jobName]}`);
                    // Fill row array up to index 2 if necessary
                    while(row.length <= 2) row.push('');
                    row[2] = mapIDs[jobName];
                    updates++;
                } else {
                    console.log(`Job ${jobName} ya tiene el ID correcto: ${row[2]}`);
                }
            }
        }

        // 3. Escribir de vuelta
        if (updates > 0) {
            console.log(`Guardando ${updates} cambios en Google Sheets...`);
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: "'DO NOT DELETE - AutoCrat Job Settings'!A:D",
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: rows }
            });
            console.log('✅ Actualización completada.');
        } else {
            console.log('Ningún ID requería actualización.');
        }

    } catch (e) {
        console.error('ERROR:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

main();
