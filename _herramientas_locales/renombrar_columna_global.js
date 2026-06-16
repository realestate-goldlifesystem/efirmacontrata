const { google } = require('googleapis');

const SERVICE_ACCOUNT_FILE = '../real-estate-ocr-468904-38d35bfd32d6.json';
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const DB_SHEET_NAME = '1.1 - INMUEBLES REGISTRADOS';
const AUTOCRAT_SHEET_NAME = 'DO NOT DELETE - AutoCrat Job Settings';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Uso: node renombrar_columna_global.js \"Nombre Viejo\" \"Nombre Nuevo\"");
        process.exit(1);
    }
    
    const oldName = args[0];
    const newName = args[1];

    console.log(`\n=== INICIANDO RENOMBRAMIENTO GLOBAL ===`);
    console.log(`De: "${oldName}"\nA: "${newName}"\n`);

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        // -------------------------------------------------------------
        // FASE 1: Renombrar en la Hoja de Base de Datos Principal
        // -------------------------------------------------------------
        console.log(`[Fase 1] Buscando en ${DB_SHEET_NAME}...`);
        const dbResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${DB_SHEET_NAME}'!A1:ZZ1` // Solo la fila 1
        });

        const headers = dbResponse.data.values ? dbResponse.data.values[0] : [];
        let headerColIndex = -1;

        for (let j = 0; j < headers.length; j++) {
            if (headers[j] === oldName) {
                headerColIndex = j;
                break;
            }
        }

        if (headerColIndex !== -1) {
            // Found it. Calculate A1 notation.
            // Support columns up to ZZ (Index 0 to 701)
            let colLetter = "";
            let temp = headerColIndex;
            while (temp >= 0) {
                colLetter = String.fromCharCode((temp % 26) + 65) + colLetter;
                temp = Math.floor(temp / 26) - 1;
            }

            const headerA1 = `'${DB_SHEET_NAME}'!${colLetter}1`;
            console.log(`   -> Columna encontrada en ${colLetter}1. Actualizando a "${newName}"...`);

            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: headerA1,
                valueInputOption: 'RAW',
                requestBody: { values: [[newName]] }
            });
            console.log(`   -> ¡Cabezal actualizado en la BD!`);
        } else {
            console.log(`   -> Advertencia: No se encontró la columna "${oldName}" en la base de datos.`);
        }

        // -------------------------------------------------------------
        // FASE 2: Renombrar en Autocrat Job Settings
        // -------------------------------------------------------------
        console.log(`\n[Fase 2] Buscando en ${AUTOCRAT_SHEET_NAME}...`);
        const autoResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${AUTOCRAT_SHEET_NAME}'!A1:Z50`
        });

        const rows = autoResponse.data.values || [];
        let jobsUpdated = 0;

        for (let i = 1; i < rows.length; i++) {
            for (let j = 0; j < rows[i].length; j++) {
                let cellValue = rows[i][j];
                if (cellValue && cellValue.startsWith('[') && cellValue.includes('headerMap')) {
                    try {
                        let mapping = JSON.parse(cellValue);
                        let updated = false;

                        mapping.forEach(m => {
                            if (m.details && m.details.headerMap === oldName) {
                                m.details.headerMap = newName;
                                updated = true;
                                console.log(`   -> Job Fila ${i+1}: Tag <<${m.tag}>> remapeado.`);
                            }
                        });

                        if (updated) {
                            const newJson = JSON.stringify(mapping);
                            const colLetter = String.fromCharCode(65 + j);
                            const a1Notation = `'${AUTOCRAT_SHEET_NAME}'!${colLetter}${i + 1}`;
                            
                            await sheets.spreadsheets.values.update({
                                spreadsheetId: SPREADSHEET_ID,
                                range: a1Notation,
                                valueInputOption: 'RAW',
                                requestBody: { values: [[newJson]] }
                            });
                            jobsUpdated++;
                        }
                    } catch(e) {
                        // Ignorar errores de parseo en celdas irrelevantes
                    }
                }
            }
        }

        if (jobsUpdated > 0) {
            console.log(`   -> ¡${jobsUpdated} Job(s) de Autocrat actualizados!`);
        } else {
            console.log(`   -> No se encontraron referencias a "${oldName}" en Autocrat.`);
        }

        console.log(`\n=== PROCESO COMPLETADO EXITOSAMENTE ===`);
        console.log(`Recuerda: ¡Aún debes actualizar la llave en el código Frontend (React Payload) manualmente!`);

    } catch (err) {
        console.error("Error crítico durante la ejecución:", err);
    }
}

main();
