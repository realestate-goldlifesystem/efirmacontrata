/**
 * ==========================================
 * UTILITY: AUTO-RENAME DNG TO JPG (CLOUD)
 * ==========================================
 * 
 * Reemplaza la funcionalidad del script local de PowerShell.
 * Busca archivos .DNG en una carpeta específica (y subcarpetas)
 * y les cambia la extensión a .JPG para que sean visibles en ciertos visores.
 * 
 * NOTA: SOLO CAMBIA EL NOMBRE, NO CONVIERTE EL FORMATO.
 */

const CONFIG_AUTORENAME = {
    // Carpeta Raíz: '2- DOCUMENTOS DE PROPIETARIOS y CIERRES'
    TARGET_FOLDER_ID: '1mBbFORjuddMN8nwU1zY27_wLa9iZWfvX',
    EXTENSION_TARGET: '.DNG',
    EXTENSION_NEW: '.JPG',
    MAX_EXECUTION_TIME_MS: 4.5 * 60 * 1000 // 4.5 minutos (límite seguro de Apps Script)
};

/**
 * Función Principal: Ejecutada por el Trigger de Tiempo
 */
function autoRenameDNGtoJPG() {
    const startTime = new Date().getTime();
    console.log('🔄 Iniciando AutoRename DNG -> JPG...');

    try {
        const rootFolder = DriveApp.getFolderById(CONFIG_AUTORENAME.TARGET_FOLDER_ID);
        let processedCount = 0;

        // Procesar carpeta raíz y recursivamente subcarpetas
        processedCount = processFolderRecursively(rootFolder, startTime);

        if (processedCount > 0) {
            console.log(`✅ Proceso completado. Archivos renombrados: ${processedCount}`);
        } else {
            console.log('ℹ️ No se encontraron archivos nuevos .DNG para renombrar.');
        }

    } catch (e) {
        console.error(`❌ Error crítico en AutoRename: ${e.toString()}`);
    }
}

/**
 * Recorre carpetas recursivamente buscando y renombrando archivos
 */
function processFolderRecursively(folder, startTime) {
    let count = 0;

    // 1. Verificar tiempo límite para evitar TimeOut
    if (new Date().getTime() - startTime > CONFIG_AUTORENAME.MAX_EXECUTION_TIME_MS) {
        console.warn('⚠️ Límite de tiempo alcanzado. Deteniendo ejecución recursiva.');
        return count;
    }

    // 2. Procesar archivos en la carpeta actual
    // OPTIMIZACIÓN: Usamos searchFiles para obtener SOLO los .DNG y no iterar miles de .JPG
    // Note: 'title contains' is case-insensitive in Drive API query
    const files = folder.searchFiles(`title contains '${CONFIG_AUTORENAME.EXTENSION_TARGET}' and trashed = false`);

    while (files.hasNext()) {
        const file = files.next();
        const name = file.getName();

        // Verificar extensión (Case Insensitive)
        if (name.toUpperCase().endsWith(CONFIG_AUTORENAME.EXTENSION_TARGET)) {
            const newName = name.slice(0, -4) + CONFIG_AUTORENAME.EXTENSION_NEW;

            try {
                file.setName(newName);
                console.log(`✏️ Renombrado: [${folder.getName()}] ${name} -> ${newName}`);
                count++;
            } catch (err) {
                console.error(`Error renombrando ${name}: ${err.message}`);
            }
        }
    }

    // 3. Recorrer subcarpetas
    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
        // Chequeo de tiempo nuevamente antes de entrar a otra carpeta
        if (new Date().getTime() - startTime > CONFIG_AUTORENAME.MAX_EXECUTION_TIME_MS) {
            break;
        }
        const subfolder = subfolders.next();
        count += processFolderRecursively(subfolder, startTime);
    }

    return count;
}
