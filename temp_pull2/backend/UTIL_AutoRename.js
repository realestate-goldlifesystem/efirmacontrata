/**
 * ==========================================
 * UTILITY: AUTO-RENAME MEDIA TO JPG (CLOUD)
 * ==========================================
 * 
 * Reemplaza la funcionalidad del script local de PowerShell.
 * Busca archivos con extensiones específicas (.DNG, .HEIC, etc.)
 * en una carpeta específica (y subcarpetas) y les cambia la 
 * extensión a .JPG para que sean visibles en ciertos visores 
 * que requieren esa extensión.
 * 
 * NOTA: SOLO CAMBIA EL NOMBRE DE LA EXTENSIÓN, NO CONVIERTE 
 * EL FORMATO INTERNO DEL ARCHIVO.
 */

const CONFIG_AUTORENAME = {
    // Carpeta Raíz: '2- DOCUMENTOS DE PROPIETARIOS y CIERRES'
    TARGET_FOLDER_ID: '1mBbFORjuddMN8nwU1zY27_wLa9iZWfvX',
    EXTENSIONS_TARGET: ['.DNG', '.HEIC'],
    EXTENSION_NEW: '.JPG',
    MAX_EXECUTION_TIME_MS: 4.5 * 60 * 1000 // 4.5 minutos (límite seguro de Apps Script)
};

/**
 * Función Principal: Ejecutada por el Trigger de Tiempo
 * Nota: Mantiene el nombre 'autoRenameDNGtoJPG' para no 
 * romper los triggers ya creados en el servidor de Apps Script.
 */
function autoRenameDNGtoJPG() {
    const lock = LockService.getScriptLock();
    // Intentar obtener el bloqueo por 1 segundo. Si ya hay otro corriendo, salir.
    if (!lock.tryLock(1000)) {
        console.warn('⚠️ autoRenameDNGtoJPG ya está corriendo. Saliendo para evitar congestión de Apps Script.');
        return;
    }

    const startTime = new Date().getTime();
    console.log(`🔄 Iniciando AutoRename Multimedia (${CONFIG_AUTORENAME.EXTENSIONS_TARGET.join(', ')}) -> JPG...`);

    try {
        const rootFolder = DriveApp.getFolderById(CONFIG_AUTORENAME.TARGET_FOLDER_ID);
        let processedCount = 0;

        // Procesar carpeta raíz y recursivamente subcarpetas
        processedCount = processFolderRecursively(rootFolder, startTime);

        if (processedCount > 0) {
            console.log(`✅ Proceso completado. Archivos renombrados: ${processedCount}`);
        } else {
            console.log('ℹ️ No se encontraron archivos nuevos para renombrar.');
        }

    } catch (e) {
        console.error(`❌ Error crítico en AutoRename: ${e.toString()}`);
    } finally {
        lock.releaseLock();
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
    // Construir la consulta dinámica ('title contains '.DNG' or title contains '.HEIC'')
    const queryParts = CONFIG_AUTORENAME.EXTENSIONS_TARGET.map(ext => `title contains '${ext}'`);
    const query = `(${queryParts.join(' or ')}) and trashed = false`;
    const files = folder.searchFiles(query);

    while (files.hasNext()) {
        const file = files.next();
        const name = file.getName();
        const upperName = name.toUpperCase();

        // Verificar cuál extensión coincidió (Case Insensitive)
        const matchedExt = CONFIG_AUTORENAME.EXTENSIONS_TARGET.find(ext => upperName.endsWith(ext));
        if (matchedExt) {
            const newName = name.slice(0, -matchedExt.length) + CONFIG_AUTORENAME.EXTENSION_NEW;

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
