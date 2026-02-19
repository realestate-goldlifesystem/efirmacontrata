/**
 * LIB_TextExtractor.js
 * Librería para extracción de texto de documentos PDF/Docs.
 * 
 * DEPENDENCIAS:
 * - Requiere servicio avanzado 'Drive' (v2) habilitado en appsscript.json
 * 
 * USO:
 * var descripcion = extraerDescripcionDelPDF(pdfFileId);
 * O función de alto nivel:
 * procesarYGuardarDescripcion(sheet, row, carpetaReg);
 */

/**
 * Función PRINCIPAL para orquestar la extracción y guardado.
 * Busca el PDF en las columnas de Autocrat, extrae la info y crea el Doc en la ruta especificada.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Hoja de cálculo activa.
 * @param {number} row - Fila del registro actual.
 * @param {GoogleAppsScript.Drive.Folder} carpetaReg - Carpeta raíz 'REG' del inmueble.
 * @return {boolean} true si se procesó correctamente, false si falló.
 */
function procesarYGuardarDescripcion(sheet, row, carpetaReg) {
    Logger.log("📝 Iniciando proceso de extracción de descripción...");

    // 1. Columnas donde Autocrat deja los IDs de los PDFs
    // Estas coinciden con las usadas en 'moverArchivosDesdeFilaADestino'
    var columnasPosibles = [
        'Merged Doc ID - ADMINISTRACIÓN',
        'Merged Doc ID - ADMI-VENTA',
        'Merged Doc ID - VENTA',
        'Merged Doc ID - CORRETAJE',
        'Merged Doc ID - VENDI-RENTA'
    ];

    var descripcionEncontrada = null;
    var pdfIdOrigen = null;

    // 2. Buscar en cada columna hasta encontrar descripción
    for (var i = 0; i < columnasPosibles.length; i++) {
        var nombreCol = columnasPosibles[i];
        var colIndex = _lib_getColumnByName(sheet, nombreCol);

        if (colIndex > 0) {
            var pdfId = sheet.getRange(row, colIndex).getValue();
            // Validar ID básico (longitud > 10 para evitar vacíos o errores)
            if (pdfId && String(pdfId).length > 10) {
                Logger.log("🔎 Analizando PDF en columna '" + nombreCol + "' (ID: " + pdfId + ")...");
                var texto = extraerDescripcionDelPDF(pdfId);
                if (texto && texto.length > 20) { // Validar longitud mínima
                    Logger.log("✅ Descripción hallada en columna: " + nombreCol);
                    descripcionEncontrada = texto;
                    pdfIdOrigen = pdfId;
                    break;
                }
            }
        }
    }

    if (!descripcionEncontrada) {
        Logger.log("⚠️ No se pudo extraer descripción de ningún PDF vinculado.");
        return false;
    }

    // 3. Guardar en el destino
    return guardarEnDestino(descripcionEncontrada, carpetaReg);
}

/**
 * Navega la estructura de carpetas y guarda el texto en un Doc.
 */
function guardarEnDestino(texto, carpetaReg) {
    // Ruta según log: ARCHIVOS DEL INMUEBLE > CONTENIDO DE PUBLICACIÓN > DESCRIPCIÓN DE LA PUBLICACIÓN
    // Nota: "DESCRIPCIÓN DE LA PUBLICACIÓN" es una CARPETA nivel 5
    var rutaCarpetas = [
        "ARCHIVOS DEL INMUEBLE",
        "CONTENIDO DE PUBLICACIÓN",
        "DESCRIPCIÓN DE LA PUBLICACIÓN"
    ];

    Logger.log("📂 Navegando a carpeta destino...");
    var folderDestino = _lib_navegarRuta(carpetaReg, rutaCarpetas);

    if (!folderDestino) {
        Logger.log("❌ No se encontró la ruta de carpetas para guardar la descripción.");
        // Fallback: Guardar en la raíz de REG si falla la ruta profunda
        Logger.log("⚠️ Guardando en raíz REG como fallback.");
        folderDestino = carpetaReg;
    }

    // Crear Doc
    var nombreDoc = "DESCRIPCIÓN DE INMUEBLE";
    // Verificar si ya existe para no duplicar
    var existentes = folderDestino.getFilesByName(nombreDoc);

    if (existentes.hasNext()) {
        var archivo = existentes.next();
        var docId = archivo.getId();
        Logger.log("✏️ Actualizando documento existente: " + nombreDoc);
        DocumentApp.openById(docId).getBody().setText(texto);
    } else {
        Logger.log("✨ Creando nuevo documento: " + nombreDoc);
        var doc = DocumentApp.create(nombreDoc);
        doc.getBody().setText(texto);
        var docId = doc.getId();

        // Mover a la carpeta correcta (DocumentApp.create lo deja en Root)
        var file = DriveApp.getFileById(docId);
        file.moveTo(folderDestino);
    }

    return true;
}

/**
 * Helper local para navegar carpetas por nombre (evita dependencia externa)
 */
function _lib_navegarRuta(origen, rutas) {
    var actual = origen;
    for (var i = 0; i < rutas.length; i++) {
        var iter = actual.getFoldersByName(rutas[i]);
        if (iter.hasNext()) {
            actual = iter.next();
        } else {
            Logger.log("🚫 No se encontró subcarpeta: " + rutas[i]);
            return null;
        }
    }
    return actual;
}

/**
 * Helper local para obtener índice de columna por nombre (safe)
 */
function _lib_getColumnByName(sheet, name) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
        if (headers[i] === name) return i + 1;
    }
    return -1;
}


// ==========================================
// LÓGICA DE EXTRACCIÓN (Validada previamente)
// ==========================================

/**
 * Extrae la descripción específica del inmueble basada en los marcadores conocidos.
 */
function extraerDescripcionDelPDF(pdfFileId) {
    var MARCADOR_INICIO = "DESCRIPCIÓN DEL INMUEBLE";
    var MARCADOR_FIN = "y vive en el apartamento de tus sueños";

    var textoCrudo = extraerTextoEntre(pdfFileId, MARCADOR_INICIO, MARCADOR_FIN);

    if (textoCrudo) {
        return limpiarTexto(textoCrudo);
    }
    return null;
}

/**
 * Convierte un PDF a Doc temporalmente y extrae el texto entre dos frases.
 */
function extraerTextoEntre(fileId, inicioTexto, finTexto) {
    var tempDocId = null;

    try {
        var archivoPdf = DriveApp.getFileById(fileId);
        var blob = archivoPdf.getBlob();

        var recurso = {
            title: 'TEMP_EXTRACT_' + new Date().getTime(),
            mimeType: MimeType.GOOGLE_DOCS
        };

        var tempFile = Drive.Files.insert(recurso, blob, { convert: true });
        tempDocId = tempFile.id;

        var doc = DocumentApp.openById(tempDocId);
        var body = doc.getBody();
        var textoCompleto = body.getText();

        var indexInicio = textoCompleto.indexOf(inicioTexto);
        if (indexInicio === -1) {
            return null;
        }

        indexInicio += inicioTexto.length;

        var indexFin = textoCompleto.indexOf(finTexto, indexInicio);
        var descripcion = "";

        if (indexFin === -1) {
            var finAlternativo = "Agenda tu cita ahora";
            var indexFinAlt = textoCompleto.indexOf(finAlternativo, indexInicio);

            if (indexFinAlt !== -1) {
                descripcion = textoCompleto.substring(indexInicio, indexFinAlt).trim();
            } else {
                descripcion = textoCompleto.substring(indexInicio).trim();
            }
        } else {
            descripcion = textoCompleto.substring(indexInicio, indexFin + finTexto.length).trim();
        }

        descripcion = descripcion.replace(/\s+/g, ' ').trim();
        return descripcion;

    } catch (e) {
        Logger.log("❌ Error en extracción: " + e.message);
        return null;
    } finally {
        if (tempDocId) {
            try {
                DriveApp.getFileById(tempDocId).setTrashed(true);
            } catch (e) { }
        }
    }
}

/**
 * Limpia y organiza el texto extraído para que se vea bonito en el Doc.
 * Reemplaza basura del PDF y restaura emojis y saltos de línea.
 */
function limpiarTexto(texto) {
    if (!texto) return "";

    // 1. Limpieza básica inicial
    var limpio = texto
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ') // Unificar espacios
        .trim();

    // 2. Mapa de sustituciones (Emojis y correcciones)
    var reemplazos = [
        // Encabezados principales con doble salto de línea antes
        { pattern: /Te damos la bienvenida/gi, replacement: '\n\nTe damos la bienvenida' },
        { pattern: /Al entrar,/gi, replacement: '\n\nAl entrar,' },
        { pattern: /Con su cocina/gi, replacement: '\n\nCon su cocina' },
        { pattern: /El\/la Apartamento dispone/gi, replacement: '\n\nEl/la Apartamento dispone' },
        { pattern: /pero con características/gi, replacement: '\npero con características' },

        // Secciones con Emojis y saltos
        { pattern: /Zonas Comunales\/Adicionales:/gi, replacement: '\n\n🏢 Zonas Comunales/Adicionales:\n' },
        { pattern: /Valor de la Administración:/gi, replacement: '\n\n💰 Valor de la Administración:\n●' },
        { pattern: /Zona de la Nevera:/gi, replacement: '\n\n❄️ Zona de la Nevera:\n●' },
        { pattern: /Zona de la Lavadora:/gi, replacement: '\n\n🧺 Zona de la Lavadora:\n●' },
        { pattern: /Cama ideal para el Cuarto:/gi, replacement: '\n\n🛏️📐 Cama ideal para el Cuarto:\n' },

        // Detalles de listas y viñetas
        { pattern: / Espacio de la nevera:/gi, replacement: ' Espacio de la nevera:' },
        { pattern: / Punto de AGUA:/gi, replacement: '\n○ Punto de AGUA:' },
        { pattern: / Espacio de la lavadora:/gi, replacement: ' Espacio de la lavadora:' },
        { pattern: / Punto de GAS:/gi, replacement: '\n○ Punto de GAS:' },

        // Dormitorios
        { pattern: /Dormitorio principal:/gi, replacement: 'Dormitorio principal:' },
        { pattern: /Dormitorio secundario:/gi, replacement: '\n\nDormitorio secundario:' },

        // Cierre
        { pattern: /todo está a tu alcance/gi, replacement: '\n\ntodo está a tu alcance' },
        { pattern: /Agenda tu cita ahora/gi, replacement: '\n\nAgenda tu cita ahora' },
        { pattern: /y vive en el apartamento/gi, replacement: '\ny vive en el apartamento' }
    ];

    // Aplicar reemplazos
    for (var i = 0; i < reemplazos.length; i++) {
        limpio = limpio.replace(reemplazos[i].pattern, reemplazos[i].replacement);
    }

    // 3. Limpieza final de espacios extra generados
    // (Opcional, pero ayuda a que no queden triples saltos)
    limpio = limpio.replace(/\n\s+\n/g, '\n\n');

    return limpio;
}
