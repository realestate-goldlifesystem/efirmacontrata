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
    const cdr = params.cdr;
    if (!cdr) throw new Error("Falta el parámetro CDR");

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1.1 - INMUEBLES REGISTRADOS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO');
    const folderCol = headers.indexOf('CARPETA CDR');

    if (cdrCol === -1 || folderCol === -1) throw new Error("Columnas necesarias no encontradas en 1.1");

    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][cdrCol] === cdr) {
            rowIdx = i;
            break;
        }
    }

    if (rowIdx === -1) throw new Error("CDR no encontrado: " + cdr);

    const folderUrl = data[rowIdx][folderCol];
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
    let descripcionText = "Inmueble " + cdr; // Fallback
    const searchDocs = cdrFolder.searchFiles("title contains 'DESCRIPCIÓN DE INMUEBLE' and trashed = false");
    if (searchDocs.hasNext()) {
        const docFile = searchDocs.next();
        if (docFile.getMimeType() === MimeType.GOOGLE_DOCS) {
            const doc = DocumentApp.openById(docFile.getId());
            descripcionText = doc.getBody().getText();
        }
    }

    return {
        success: true,
        fotosFolderId: fotosFolderId,
        descripcionText: descripcionText
    };
}

/**
 * Función llamada por doPost ('action=finalizeMultimedia')
 * Genera plantillas y actualiza el Excel.
 */
function handleFinalizeMultimedia(datos) {
    const cdr = datos.cdr;
    const youtubeId = datos.youtubeId; // p.ej. 'dQw4w9WgXcQ'
    const portadaId = datos.portadaId; // ID en Drive de la foto principal

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1.1 - INMUEBLES REGISTRADOS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Obtener fila del CDR
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO');
    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    let rowData = null;
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][cdrCol] === cdr) {
            rowIdx = i;
            rowData = data[i];
            break;
        }
    }
    
    if (rowIdx === -1) throw new Error("CDR no encontrado para finalizar");

    const tipoNegocio = rowData[headers.indexOf('TIPO DE NEGOCIO')] || '';
    
    // Generar plantillas según tipo de negocio
    let urlArriendo = null;
    let urlVenta = null;
    
    const esArriendo = tipoNegocio.includes('Arriendo') || tipoNegocio.includes('Administración') || tipoNegocio.includes('Corretaje') || tipoNegocio.includes('Admi-Venta') || tipoNegocio.includes('Vendi-Renta');
    const esVenta = tipoNegocio.includes('Venta') || tipoNegocio.includes('Admi-Venta') || tipoNegocio.includes('Vendi-Renta');

    const folderUrl = rowData[headers.indexOf('CARPETA CDR')];
    let folderId = folderUrl.match(/id=([a-zA-Z0-9_-]+)/) || folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    folderId = folderId ? folderId[1] : null;
    let fotosFolder = DriveApp.getFolderById(folderId).getFoldersByName("FOTOGRAFÍAS").next();

    if (esArriendo) {
        urlArriendo = generarPortada(rowData, headers, CONFIG_MULTIMEDIA.SLIDE_ID_ARRIENDO, portadaId, fotosFolder, 'Arriendo', cdr);
    }
    if (esVenta) {
        urlVenta = generarPortada(rowData, headers, CONFIG_MULTIMEDIA.SLIDE_ID_VENTA, portadaId, fotosFolder, 'Venta', cdr);
    }

    // Actualizar columnas en Excel (Falta añadir lógica de Youtube URL en las columnas pertinentes)
    // Por ahora retornamos éxito
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
 * Función interna para clonar y exportar PDF/PNG de Slide
 */
function generarPortada(rowData, headers, targetSlideId, portadaDriveId, targetFolder, tipo, cdr) {
    // 1. Duplicar la presentación maestra
    const masterFile = DriveApp.getFileById(CONFIG_MULTIMEDIA.TEMPLATE_SLIDES_ID);
    const tempFile = masterFile.makeCopy(`TEMP_PORTADA_${tipo}_${cdr}`, targetFolder);
    const presId = tempFile.getId();
    
    // 2. Extraer valores del Excel
    const colLoc = headers.indexOf('Selecciona la localidad del inmueble');
    const colHab = headers.indexOf('No. de habitaciones');
    const colBan = headers.indexOf('No. de banos');
    const colArea = headers.indexOf('Area  M²');
    const colGar = headers.indexOf('N° de Garajes');
    const colDir = headers.indexOf('Ingrese la Dirección del inmueble');
    
    // Lógica Precios
    const precioGen = rowData[headers.indexOf('PRECIO DE PROMOCION GENERAL')];
    const precioVen = rowData[headers.indexOf('PRECIO DE PROMOCION EN VENTA')];
    
    let precioFinal = "";
    let precioMas20 = "";
    
    if (tipo === 'Arriendo') {
        precioFinal = precioGen;
    } else {
        // Venta
        let baseVenta = rowData[headers.indexOf('TIPO DE NEGOCIO')].includes('Admi-Venta') || rowData[headers.indexOf('TIPO DE NEGOCIO')].includes('Vendi-Renta') ? precioVen : precioGen;
        precioFinal = baseVenta;
        
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
    
    const mapReemplazos = {
        '{{Localidad}}': rowData[colLoc] || '',
        '{{#H}}': rowData[colHab] || '',
        '{{#B}}': rowData[colBan] || '',
        '{{#M}}': rowData[colArea] || '',
        '{{#G}}': garajes,
        '{{DIRECCIÓN}}': rowData[colDir] || '',
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
        for (let img of images) {
            if (img.getTitle() === 'FondoPrincipal') {
                img.replace(portadaBlob);
                break;
            }
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
    
    const pngBlob = response.getBlob().setName(`Portada_${tipo}_${cdr}.png`);
    const pngFile = targetFolder.createFile(pngBlob);
    
    // Eliminar temporal
    tempFile.setTrashed(true);
    
    return pngFile.getUrl();
}
