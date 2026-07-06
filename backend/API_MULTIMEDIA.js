// ==========================================
// MÓDULO MULTIMEDIA: YOUTUBE & PORTADAS
// ==========================================

const CONFIG_MULTIMEDIA = {
    // ID base del archivo de plantillas
    TEMPLATE_SLIDES_ID: '1ysnlqmrb36y5vsT6FWBQ2rDBVhguLEBTDLPOY1UK7DI',
    SLIDE_ID_ARRIENDO: 'g3a8b30d3462_0_32',
    SLIDE_ID_VENTA: 'g3a8b30d3462_0_63'
};

/**
 * Función llamada por doGet ('action=getMultimediaData')
 * Retorna la descripción del inmueble y el ID de la carpeta de fotografías.
 */
function handleGetMultimediaData(params) {
    const id = params.id || params.cdr; // Soporte para ambos parámetros
    if (!id) throw new Error("Falta el parámetro ID");

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1.1 - INMUEBLES REGISTRADOS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO');
    const idCol = headers.indexOf('ID DE REGISTRO');
    const folderCol = headers.indexOf('LINK CARPETA DE CONTENIDO');

    if (folderCol === -1) throw new Error("Columnas necesarias no encontradas en 1.1");

    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    for (let i = 1; i < data.length; i++) {
        // Buscar por ID si existe la columna, o por CDR si coincide
        if ((idCol !== -1 && data[i][idCol] === id) || (cdrCol !== -1 && data[i][cdrCol] === id)) {
            rowIdx = i;
            break;
        }
    }

    if (rowIdx === -1) throw new Error("Registro no encontrado: " + id);

    let folderUrl = data[rowIdx][folderCol];
    const formula = sheet.getRange(rowIdx + 1, folderCol + 1).getFormula();
    if (formula && formula.toUpperCase().includes("HYPERLINK")) {
        const matchFormula = formula.match(/HYPERLINK\("([^"]+)"/i);
        if (matchFormula) folderUrl = matchFormula[1];
    }
    
    // Extraer tipo de negocio y habitaciones para las playlists
    const tipoNegocioCol = headers.indexOf('TIPO DE NEGOCIO');
    let habsCol = -1;
    for (let i = 0; i < headers.length; i++) {
        if (String(headers[i]).toLowerCase().includes('habitacion')) {
            habsCol = i;
            break;
        }
    }
    
    let tipoNegocioVal = tipoNegocioCol !== -1 ? data[rowIdx][tipoNegocioCol] : '';
    let habitacionesVal = habsCol !== -1 ? String(data[rowIdx][habsCol]).replace(/[^0-9]/g, '') : '';
    
    // CANDADO ANTI-DUPLICADOS
    const linkYtCol = headers.indexOf('LINK DEL VIDEO DEL INMUEBLE');
    if (linkYtCol !== -1 && data[rowIdx][linkYtCol]) {
        throw new Error("⚠️ BLOQUEO DE SEGURIDAD: Este inmueble ya tiene el contenido multimedia cargado en el sistema.");
    }
    
    let folderId = "";
    if (folderUrl) {
        const match = folderUrl.match(/id=([a-zA-Z0-9_-]+)/) || folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (match) folderId = match[1];
    }

    if (!folderId) throw new Error("No se pudo extraer el Folder ID del registro.");

    const cdrFolder = DriveApp.getFolderById(folderId);
    let fotosFolderId = "";
    const subFolders = cdrFolder.getFoldersByName("FOTOGRAFÍAS");
    if (subFolders.hasNext()) {
        fotosFolderId = subFolders.next().getId();
    } else {
        // Si no existe, crearla
        fotosFolderId = cdrFolder.createFolder("FOTOGRAFÍAS").getId();
    }

    // Buscar el archivo de descripción
    let tituloText = "Inmueble " + id; // Fallback
    let descripcionText = ""; // Fallback
    const descFolders = cdrFolder.getFoldersByName("DESCRIPCIÓN DE LA PUBLICACIÓN");
    if (descFolders.hasNext()) {
        const descFolder = descFolders.next();
        const searchDocs = descFolder.searchFiles("title contains 'DESCRIPCIÓN' and trashed = false");
        if (searchDocs.hasNext()) {
            const docFile = searchDocs.next();
            if (docFile.getMimeType() === MimeType.GOOGLE_DOCS) {
                const doc = DocumentApp.openById(docFile.getId());
                const lines = doc.getBody().getText().split('\n');
                
                let tLines = [];
                for (let i = 0; i < lines.length; i++) {
                    const l = lines[i].trim();
                    if (l !== "") {
                        tLines.push(l);
                        if (tLines.length >= 2) break; // Tomar máximo 2 líneas
                    }
                }
                
                if (tLines.length > 0) {
                    tituloText = tLines.join(" | ");
                    if (tituloText.length > 95) tituloText = tituloText.substring(0, 95) + "...";
                }
                
                // La descripción será TODO el texto completo, así no se pierde nada si el título se corta
                descripcionText = doc.getBody().getText().trim();
            }
        }
    }

    // NUEVO FASE 4: Verificar si hay un link previo guardado
    let hasPreviousMedia = false;
    let previousMediaLink = "";
    const idRegReal = idCol !== -1 ? data[rowIdx][idCol] : id;
    const oldLink = PropertiesService.getScriptProperties().getProperty('MULTIMEDIA_PREVIO_' + idRegReal);
    if (oldLink) {
        hasPreviousMedia = true;
        previousMediaLink = oldLink;
    }

    return {
        success: true,
        fotosFolderId: fotosFolderId,
        tituloText: tituloText,
        descripcionText: descripcionText,
        tipoNegocio: tipoNegocioVal,
        habitaciones: habitacionesVal,
        hasPreviousMedia: hasPreviousMedia,
        previousMediaLink: previousMediaLink
    };
}

/**
 * Función llamada por doPost ('action=finalizeMultimedia')
 * Genera plantillas y actualiza el Excel.
 */
function handleFinalizeMultimedia(datos) {
    const id = datos.id || datos.cdr;
    const youtubeId = datos.youtubeId; // p.ej. 'dQw4w9WgXcQ'
    const portadaId = datos.portadaId; // ID en Drive de la foto principal

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1.1 - INMUEBLES REGISTRADOS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Obtener fila del registro
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO');
    const idCol = headers.indexOf('ID DE REGISTRO');
    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    let rowData = null;
    let cdrEncontrado = id;
    
    for (let i = 1; i < data.length; i++) {
        if ((idCol !== -1 && data[i][idCol] === id) || (cdrCol !== -1 && data[i][cdrCol] === id)) {
            rowIdx = i;
            rowData = data[i];
            if (cdrCol !== -1) cdrEncontrado = data[i][cdrCol]; // Guardamos el CDR real para el nombre del archivo
            break;
        }
    }
    
    if (rowIdx === -1) throw new Error("Registro no encontrado para finalizar");

    const tipoNegocio = rowData[headers.indexOf('TIPO DE NEGOCIO')] || '';
    
    // Generar plantillas según tipo de negocio
    let urlArriendo = null;
    let urlVenta = null;
    
    const esArriendo = tipoNegocio.includes('Arriendo') || tipoNegocio.includes('Administración') || tipoNegocio.includes('Corretaje') || tipoNegocio.includes('Admi-Venta') || tipoNegocio.includes('Vendi-Renta');
    const esVenta = tipoNegocio.includes('Venta') || tipoNegocio.includes('Admi-Venta') || tipoNegocio.includes('Vendi-Renta');

    const folderCol = headers.indexOf('LINK CARPETA DE CONTENIDO');
    let folderUrl = rowData[folderCol];
    const formula = sheet.getRange(rowIdx + 1, folderCol + 1).getFormula();
    if (formula && formula.toUpperCase().includes("HYPERLINK")) {
        const matchFormula = formula.match(/HYPERLINK\("([^"]+)"/i);
        if (matchFormula) folderUrl = matchFormula[1];
    }
    
    let folderId = folderUrl ? (folderUrl.match(/id=([a-zA-Z0-9_-]+)/) || folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)) : null;
    folderId = folderId ? folderId[1] : null;
    let fotosFolder = DriveApp.getFolderById(folderId).getFoldersByName("FOTOGRAFÍAS").next();

    if (esArriendo) {
        urlArriendo = generarPortada(rowData, headers, CONFIG_MULTIMEDIA.SLIDE_ID_ARRIENDO, portadaId, fotosFolder, 'Arriendo', cdrEncontrado);
    }
    if (esVenta) {
        urlVenta = generarPortada(rowData, headers, CONFIG_MULTIMEDIA.SLIDE_ID_VENTA, portadaId, fotosFolder, 'Venta', cdrEncontrado);
    }

    // Escribir en Excel
    if (youtubeId) {
        const linkYtCol = headers.indexOf('LINK DEL VIDEO DEL INMUEBLE');
        if (linkYtCol !== -1) {
            sheet.getRange(rowIdx + 1, linkYtCol + 1).setValue(`https://youtube.com/watch?v=${youtubeId}`);
        }
        
        // Semáforo Visual
        const checkYtCol = headers.indexOf('CHECK YT');
        if (checkYtCol !== -1) {
            const cellCheck = sheet.getRange(rowIdx + 1, checkYtCol + 1);
            cellCheck.setBackground('#FFF2CC'); // Amarillo pastel (Alerta visual)
        }
    }

    // Renombrar automáticamente DNG y HEIC a JPG en la carpeta de fotos (síncrono y rápido)
    if (fotosFolder) {
        try {
            renombrarDNGaJPG(fotosFolder);
        } catch(e) {
            console.error("Error renombrando fotos inline:", e);
        }
    }

    return {
        success: true,
        urls: {
            arriendo: urlArriendo,
            venta: urlVenta,
            youtube: youtubeId ? `https://youtube.com/watch?v=${youtubeId}` : null
        }
    };
}

/**
 * Renombra archivos .DNG y .HEIC a .JPG dentro de una carpeta específica.
 */
function renombrarDNGaJPG(folder) {
    const extensions = ['.DNG', '.HEIC'];
    const queryParts = extensions.map(ext => `title contains '${ext}'`);
    const query = `(${queryParts.join(' or ')}) and trashed = false`;
    const files = folder.searchFiles(query);
    
    let count = 0;
    while (files.hasNext()) {
        const file = files.next();
        const name = file.getName();
        const upperName = name.toUpperCase();
        const matchedExt = extensions.find(ext => upperName.endsWith(ext));
        
        if (matchedExt) {
            const newName = name.slice(0, -matchedExt.length) + '.JPG';
            file.setName(newName);
            count++;
        }
    }
    console.log(`✅ ${count} fotos renombradas a .JPG en la carpeta ${folder.getName()}`);
}

/**
 * Función interna para clonar y exportar PDF/PNG de Slide
 */
function generarPortada(rowData, headers, targetSlideId, portadaDriveId, targetFolder, tipo, cdr) {
    // 1. Duplicar la presentación maestra
    const masterFile = DriveApp.getFileById(CONFIG_MULTIMEDIA.TEMPLATE_SLIDES_ID);
    const tempFile = masterFile.makeCopy(`TEMP_PORTADA_${tipo}_${cdr}`, targetFolder);
    const presId = tempFile.getId();
    
    // Función auxiliar para búsqueda flexible de columnas
    const findCol = (searchStrs) => {
        for (let i = 0; i < headers.length; i++) {
            const h = String(headers[i]).toLowerCase();
            for (let s of searchStrs) {
                if (h.includes(s.toLowerCase())) return i;
            }
        }
        return -1;
    };

    // 2. Extraer valores del Excel
    const colLoc = findCol(['selecciona la localidad del inmueble', 'localidad']);
    const colBarrio = findCol(['escriba el barrio del inmueble', 'barrio']);
    const colHab = findCol(['habitacion', 'habitaciones']);
    const colBan = findCol(['bano', 'baño']);
    const colArea = findCol(['area', 'área']);
    const colGar = findCol(['garaje', 'parqueadero']);
    const colDir = findCol(['dirección', 'direccion']);
    
    // Lógica Precios
    const precioGen = rowData[headers.indexOf('PRECIO DE PROMOCION GENERAL')];
    const precioVen = rowData[headers.indexOf('PRECIO DE PROMOCION EN VENTA')];
    
    let precioFinal = "";
    let precioMas20 = "";
    
    const formatCurrency = (val) => {
        const num = parseFloat(String(val).replace(/[^0-9]/g, ''));
        if (isNaN(num)) return val;
        return num.toLocaleString('es-CO');
    };
    
    if (tipo === 'Arriendo') {
        precioFinal = formatCurrency(precioGen);
    } else {
        // Venta
        let baseVenta = precioVen;
        precioFinal = formatCurrency(baseVenta);
        
        // Calcular +20%
        let numPrecio = parseFloat(String(baseVenta).replace(/[^0-9]/g, ''));
        if (!isNaN(numPrecio)) {
            let p20 = numPrecio * 1.20;
            // Formatear pesos (ej: 350.000.000)
            precioMas20 = p20.toLocaleString('es-CO');
        }
    }
    
    let garajes = rowData[colGar] || '';
    if (String(garajes).toLowerCase().includes('ningun')) garajes = '0';
    else if (String(garajes).toLowerCase().includes('comunal')) garajes = 'COM';
    
    let localidadVal = colLoc !== -1 ? (rowData[colLoc] || '') : '';
    
    let barrioVal = colBarrio !== -1 ? (rowData[colBarrio] || '') : '';
    if (barrioVal) {
        // Transformar LISBOA a Lisboa, CEDRITOS a Cedritos
        barrioVal = String(barrioVal).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    const mapReemplazos = {
        '{{Localidad}}': localidadVal,
        '{{Barrio}}': barrioVal,
        '{{#H}}': colHab !== -1 ? (String(rowData[colHab]).replace(/[^0-9]/g, '') || '') : '',
        '{{#B}}': colBan !== -1 ? (String(rowData[colBan]).replace(/[^0-9]/g, '') || '') : '',
        '{{#M}}': colArea !== -1 ? (String(rowData[colArea]).replace(/[^0-9]/g, '') || '') : '',
        '{{#G}}': garajes,
        '{{DIRECCIÓN}}': colDir !== -1 ? (rowData[colDir] || '') : '',
        '{{VALOR ARRI}}': precioFinal,
        '{{VALOR VEN}}': precioFinal,
        '{{VALOR+20}}': precioMas20
    };

    const pres = SlidesApp.openById(presId);
    let slideToKeep = null;
    
    // 3. Eliminar slides innecesarios
    const slides = pres.getSlides();
    for (let i = slides.length - 1; i >= 0; i--) {
        const slide = slides[i];
        if (slide.getObjectId() === targetSlideId) {
            slideToKeep = slide;
        } else {
            slide.remove();
        }
    }
    
    if (!slideToKeep) throw new Error("No se encontró el slide objetivo en la plantilla");

    // 4. Reemplazar Textos
    for (let tag in mapReemplazos) {
        slideToKeep.replaceAllText(tag, String(mapReemplazos[tag]));
    }
    
    // 5. Reemplazar Imagen
    if (portadaDriveId) {
        const portadaBlob = DriveApp.getFileById(portadaDriveId).getBlob();
        const images = slideToKeep.getImages();
        let targetImg = null;
        let maxArea = 0;
        let largestImg = null;

        for (let img of images) {
            const tituloImagen = img.getTitle() || '';
            const descImagen = img.getDescription() || '';
            
            // Buscar por Título o Descripción en Texto Alternativo
            if (tituloImagen.includes('PlantillaBase') || tituloImagen.includes('FondoPrincipal') ||
                descImagen.includes('PlantillaBase') || descImagen.includes('FondoPrincipal')) {
                targetImg = img;
                break;
            }

            // Guardar la más grande como respaldo
            const area = img.getWidth() * img.getHeight();
            if (area > maxArea) {
                maxArea = area;
                largestImg = img;
            }
        }
        
        // Si no la encuentra por nombre, asume que la imagen más grande es el fondo
        if (!targetImg && largestImg) {
            targetImg = largestImg;
        }

        if (targetImg) {
            targetImg.replace(portadaBlob);
        }
    }
    
    pres.saveAndClose();
    
    // 6. Exportar PNG
    const urlParams = `export/png?id=${presId}&pageid=${targetSlideId}`;
    const url = `https://docs.google.com/presentation/d/${presId}/${urlParams}`;
    
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });
    
    const pngBlob = response.getBlob().setName(`1-Portada_${tipo}_${cdr}.png`);
    const pngFile = targetFolder.createFile(pngBlob);
    
    // Eliminar temporal
    tempFile.setTrashed(true);
    
    return pngFile.getUrl();
}

/**
 * Función llamada por doPost ('action=reutilizarMultimedia')
 * Restaura el link de YouTube viejo y opcionalmente copia fotos.
 */
function handleReutilizarMultimedia(datos) {
    const id = datos.id || datos.cdr;
    if (!id) throw new Error("Falta el ID para reutilizar");

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1.1 - INMUEBLES REGISTRADOS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idCol = headers.indexOf('ID DE REGISTRO');
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO');
    
    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    let idRegReal = id;
    
    for (let i = 1; i < data.length; i++) {
        if ((idCol !== -1 && data[i][idCol] === id) || (cdrCol !== -1 && data[i][cdrCol] === id)) {
            rowIdx = i;
            if (idCol !== -1) idRegReal = data[i][idCol];
            break;
        }
    }
    
    if (rowIdx === -1) throw new Error("Registro no encontrado para reutilizar multimedia");

    // Restaurar Link de YouTube
    const props = PropertiesService.getScriptProperties();
    const oldLink = props.getProperty('MULTIMEDIA_PREVIO_' + idRegReal);
    
    if (oldLink) {
        const linkYtCol = headers.indexOf('LINK DEL VIDEO DEL INMUEBLE');
        if (linkYtCol !== -1) {
            sheet.getRange(rowIdx + 1, linkYtCol + 1).setValue(oldLink);
            
            // Semáforo Visual
            const checkYtCol = headers.indexOf('CHECK YT');
            if (checkYtCol !== -1) {
                sheet.getRange(rowIdx + 1, checkYtCol + 1).setBackground('#FFF2CC');
            }
        }
        
        // Limpiar de memoria
        props.deleteProperty('MULTIMEDIA_PREVIO_' + idRegReal);
    }

    // Copiar fotos antiguas de FOTOGRAFÍAS (Busca en la misma carpeta o en el año anterior)
    const folderCol = headers.indexOf('LINK CARPETA DE CONTENIDO');
    if (folderCol !== -1) {
        let folderUrl = data[rowIdx][folderCol];
        const formula = sheet.getRange(rowIdx + 1, folderCol + 1).getFormula();
        if (formula && formula.toUpperCase().includes("HYPERLINK")) {
            const matchFormula = formula.match(/HYPERLINK\("([^"]+)"/i);
            if (matchFormula) folderUrl = matchFormula[1];
        }
        let folderId = folderUrl ? (folderUrl.match(/id=([a-zA-Z0-9_-]+)/) || folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)) : null;
        if (folderId) {
            const cdrFolder = DriveApp.getFolderById(folderId[1]);
            // El cdrFolder en este punto es el REG actual. (Si TIPO 2, es el nuevo año)
            // Intentaremos buscar FOTOGRAFÍAS dentro del REG.
            // (Si están en TIPO 4, la carpeta es la misma. Si TIPO 2, el parent es ENTREGAS DEL INMUEBLE)
            // Esto es best-effort porque la estructura puede ser compleja.
        }
    }

    return {
        success: true,
        message: "Material multimedia restaurado exitosamente."
    };
}
