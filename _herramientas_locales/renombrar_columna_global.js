const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const SERVICE_ACCOUNT_FILE = '../real-estate-ocr-468904-38d35bfd32d6.json';
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const DB_SHEET_NAME = '1.1 - INMUEBLES REGISTRADOS';
const AUTOCRAT_SHEET_NAME = 'DO NOT DELETE - AutoCrat Job Settings';

// Helper for validating syntax of a file
function validateSyntax(filePath) {
    const ext = path.extname(filePath);
    try {
        if (ext === '.json') {
            const content = fs.readFileSync(filePath, 'utf8');
            JSON.parse(content);
            return { valid: true };
        } else if (ext === '.js') {
            // Check syntax using node --check
            const result = child_process.spawnSync('node', ['--check', filePath]);
            if (result.status !== 0) {
                return { valid: false, error: result.stderr.toString().trim() };
            }
            return { valid: true };
        }
        // For other files, we assume basic read validation is enough
        return { valid: true };
    } catch (err) {
        return { valid: false, error: err.message };
    }
}

// Worker function
async function runWorker(filesArg, oldText, newText) {
    const files = filesArg.split(',');
    const results = [];
    
    for (const filePath of files) {
        if (!fs.existsSync(filePath)) continue;
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(oldText)) {
                const updatedContent = content.split(oldText).join(newText);
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                
                // Validate after modification
                const validation = validateSyntax(filePath);
                results.push({
                    file: filePath,
                    modified: true,
                    validated: validation.valid,
                    error: validation.error || null
                });
            } else {
                results.push({
                    file: filePath,
                    modified: false,
                    validated: true,
                    error: null
                });
            }
        } catch (err) {
            results.push({
                file: filePath,
                modified: false,
                validated: false,
                error: err.message
            });
        }
    }
    
    console.log(JSON.stringify(results));
    process.exit(0);
}

async function main() {
    // Check if running as a worker
    const args = process.argv.slice(2);
    if (args.includes('--worker')) {
        const filesIdx = args.findIndex(a => a.startsWith('--files='));
        const oldIdx = args.findIndex(a => a.startsWith('--old='));
        const newIdx = args.findIndex(a => a.startsWith('--new='));
        
        if (filesIdx === -1 || oldIdx === -1 || newIdx === -1) {
            console.error("Worker parameters missing.");
            process.exit(1);
        }
        
        const files = args[filesIdx].split('=')[1];
        const oldText = args[oldIdx].split('=')[1];
        const newText = args[newIdx].split('=')[1];
        
        await runWorker(files, oldText, newText);
        return;
    }

    if (args.length < 2) {
        console.error("Uso: node renombrar_columna_global.js \"Nombre Viejo\" \"Nombre Nuevo\"");
        process.exit(1);
    }
    
    const oldName = args[0];
    const newName = args[1];

    console.log(`\n======================================================`);
    console.log(`  INICIANDO ORQUESTACIÓN DE REFACCIÓN GLOBAL`);
    console.log(`======================================================`);
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
        console.log(`[Fase 1] Buscando cabezal en ${DB_SHEET_NAME}...`);
        const dbResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${DB_SHEET_NAME}'!A1:ZZ1`
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
            console.log(`   -> ¡Cabezal de la hoja de cálculo actualizado!`);
        } else {
            console.log(`   -> Columna "${oldName}" no encontrada en la fila 1 de la hoja principal.`);
        }

        // -------------------------------------------------------------
        // FASE 2: Renombrar en Autocrat Job Settings
        // -------------------------------------------------------------
        console.log(`\n[Fase 2] Buscando mapeos en ${AUTOCRAT_SHEET_NAME}...`);
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
                    } catch(e) { }
                }
            }
        }

        if (jobsUpdated > 0) {
            console.log(`   -> ¡${jobsUpdated} Job(s) de Autocrat actualizados!`);
        } else {
            console.log(`   -> No se encontraron referencias a "${oldName}" en Autocrat.`);
        }

        // -------------------------------------------------------------
        // FASE 3: Renombrar localmente con sub-agentes paralelos
        // -------------------------------------------------------------
        console.log(`\n[Fase 3] Iniciando refactor local de archivos...`);
        const rootDir = path.resolve(__dirname, '..');
        
        const ignoreDirs = new Set(['.git', 'node_modules', 'poppler', 'imagenes del proyecto', 'temp_pull']);
        const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.txt']);
        
        const allFiles = [];
        
        function traverseSync(currentDir) {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (!ignoreDirs.has(entry.name)) {
                        traverseSync(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (allowedExtensions.has(ext)) {
                        allFiles.push(fullPath);
                    }
                }
            }
        }
        
        traverseSync(rootDir);
        console.log(`   -> Encontrados ${allFiles.length} archivos para escaneo profundo.`);

        // Chunk files for parallel workers
        const numWorkers = Math.min(4, Math.ceil(allFiles.length / 10)); // Max 4 workers
        const chunks = Array.from({ length: numWorkers }, () => []);
        allFiles.forEach((file, index) => {
            chunks[index % numWorkers].push(file);
        });

        console.log(`   -> Lanzando ${numWorkers} sub-agentes de procesamiento paralelo...`);
        
        const workerPromises = chunks.map((chunk, idx) => {
            if (chunk.length === 0) return Promise.resolve([]);
            return new Promise((resolve, reject) => {
                const chunkStr = chunk.join(',');
                const child = child_process.fork(__filename, [
                    '--worker',
                    `--files=${chunkStr}`,
                    `--old=${oldName}`,
                    `--new=${newName}`
                ], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });

                let outputData = '';
                child.stdout.on('data', (data) => {
                    outputData += data.toString();
                });

                child.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Worker ${idx} falló con código ${code}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(outputData.trim());
                        resolve(parsed);
                    } catch (e) {
                        resolve([]);
                    }
                });
            });
        });

        const workerResults = await Promise.all(workerPromises);
        const flatResults = workerResults.flat();

        let scannedCount = flatResults.length;
        let modifiedCount = 0;
        let errorCount = 0;
        const modifiedFiles = [];
        const brokenFiles = [];

        flatResults.forEach(r => {
            if (r.modified) {
                modifiedCount++;
                modifiedFiles.push(r.file);
                if (!r.validated) {
                    errorCount++;
                    brokenFiles.push(r);
                }
            }
        });

        console.log(`\n======================================================`);
        console.log(`   REPORTE DE EJECUCIÓN GLOBAL`);
        console.log(`======================================================`);
        console.log(`📂 Archivos locales analizados: ${scannedCount}`);
        console.log(`✏️ Archivos locales modificados: ${modifiedCount}`);
        
        if (modifiedCount > 0) {
            console.log('\nDetalle de archivos modificados:');
            modifiedFiles.forEach(f => {
                console.log(` - ${path.relative(rootDir, f)}`);
            });
        }

        if (errorCount > 0) {
            console.log(`\n⚠️ ADVERTENCIA: Se encontraron ${errorCount} archivo(s) con errores tras el cambio:`);
            brokenFiles.forEach(b => {
                console.log(` ❌ ${path.relative(rootDir, b.file)}: ${b.error}`);
            });
        } else {
            console.log('\n✅ Validación: ¡Todos los archivos modificados pasaron la verificación de sintaxis!');
        }

    } catch (err) {
        console.error("Error crítico durante la ejecución del refactor:", err);
    }
}

main();
