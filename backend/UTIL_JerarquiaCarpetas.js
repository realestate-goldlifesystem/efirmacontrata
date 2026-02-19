const MASTER_FOLDER_ID = '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH'; // ID de PLANTILLA #1 (Maestra)

function mostrarEstructuraCarpetasPlantilla() {
    const carpetaRaiz = DriveApp.getFolderById(MASTER_FOLDER_ID);
    console.log(`📁 [RAÍZ] ${carpetaRaiz.getName()} (ID: ${MASTER_FOLDER_ID})`);
    recorrerCarpetas(carpetaRaiz, 0);
}

function recorrerCarpetas(carpeta, nivel) {
    const espacios = '   '.repeat(nivel);
    const prefijoNivel = `[NIVEL ${nivel}]`;

    // 1. Listar Subcarpetas
    const subcarpetas = carpeta.getFolders();
    while (subcarpetas.hasNext()) {
        const sub = subcarpetas.next();
        console.log(`${espacios}📂 ${prefijoNivel} [CARPETA] ${sub.getName()} (ID: ${sub.getId()})`);
        // Recursividad
        recorrerCarpetas(sub, nivel + 1);
    }

    // 2. Listar Archivos en la carpeta actual
    const archivos = carpeta.getFiles();
    while (archivos.hasNext()) {
        const archivo = archivos.next();
        const icon = getFileIcon(archivo.getMimeType());
        console.log(`${espacios}   ${icon} ${prefijoNivel} ${archivo.getName()} (ID: ${archivo.getId()})`);
    }
}

function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return '📕 [PDF]';
    if (mimeType.includes('document')) return '📘 [DOC]';
    if (mimeType.includes('spreadsheet')) return '📗 [SHEET]';
    if (mimeType.includes('folder')) return '📂 [CARPETA]';
    if (mimeType.includes('image')) return '🖼️ [IMG]';
    return '📄 [ARCHIVO]';
}
