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

    var colGarajes = _lib_getColumnByName(sheet, 'N° de Garajes');
    var numGarajes = '';
    if (colGarajes > 0) {
        numGarajes = sheet.getRange(row, colGarajes).getValue();
    }

    var colDeposito = _lib_getColumnByName(sheet, '¿Dispone de deposito?');
    var tieneDeposito = false;
    if (colDeposito > 0) {
        var valDeposito = sheet.getRange(row, colDeposito).getValue();
        if (valDeposito && String(valDeposito).trim().indexOf('Deposito') !== -1) {
            tieneDeposito = true;
        }
    }

    // Tipo de inmueble: la plantilla dice "APTO" y "apartamento" aunque sea una casa.
    var colTipoInm = _lib_getColumnByName(sheet, 'Selecciona el tipo de inmueble');
    var tipoInmueble = colTipoInm > 0 ? String(sheet.getRange(row, colTipoInm).getValue() || '').trim() : '';

    var colCodigo = _lib_getColumnByName(sheet, 'ID DE REGISTRO');
    var codigoRegistro = '';
    if (colCodigo > 0) {
        codigoRegistro = sheet.getRange(row, colCodigo).getValue();
    }

    // NUEVO: Obtener precio de venta y tipo de negocio para Mixtos
    var colPrecioVenta = _lib_getColumnByName(sheet, 'PRECIO DE PROMOCION EN VENTA');
    var colTipoNegocio = _lib_getColumnByName(sheet, 'TIPO DE NEGOCIO');
    var precioVentaFormat = '';
    if (colPrecioVenta > 0 && colTipoNegocio > 0) {
        var tipoNeg = String(sheet.getRange(row, colTipoNegocio).getValue() || '');
        // Solo MIXTOS: su título trae el precio de ARRIENDO y se le antepone el de
        // venta en millones ("$425M/$3.100.000"). En Venta pura el título ya trae el
        // precio de venta completo; anteponerlo lo repetía ("$450M/$ 450.000.000").
        if (tipoNeg.includes('Vendi-Renta') || tipoNeg.includes('Admi-Venta')) {
            var precioCrudo = sheet.getRange(row, colPrecioVenta).getValue();
            var numStr = String(precioCrudo).replace(/[^\d]/g, '');
            if (numStr) {
                var num = parseFloat(numStr);
                var millones = num / 1000000;
                precioVentaFormat = millones % 1 === 0 ? `$${millones}M` : `$${millones.toFixed(1)}M`;
            }
        }
    }

    // 2. Buscar en cada columna hasta encontrar descripción
    for (var i = 0; i < columnasPosibles.length; i++) {
        var nombreCol = columnasPosibles[i];
        var colIndex = _lib_getColumnByName(sheet, nombreCol);

        if (colIndex > 0) {
            var pdfId = sheet.getRange(row, colIndex).getValue();
            // Validar ID básico (longitud > 10 para evitar vacíos o errores)
            if (pdfId && String(pdfId).length > 10) {
                Logger.log("🔎 Analizando PDF en columna '" + nombreCol + "' (ID: " + pdfId + ")...");
                var texto = extraerDescripcionDelPDF(pdfId, numGarajes, tieneDeposito, codigoRegistro, precioVentaFormat, tipoInmueble);
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
        var doc = DocumentApp.openById(docId);
        doc.getBody().setText(texto);
        _aplicarInterlineadoSencillo(doc);
    } else {
        Logger.log("✨ Creando nuevo documento: " + nombreDoc);
        var doc = DocumentApp.create(nombreDoc);
        doc.getBody().setText(texto);
        _aplicarInterlineadoSencillo(doc);
        var docId = doc.getId();

        // Mover a la carpeta correcta (DocumentApp.create lo deja en Root)
        var file = DriveApp.getFileById(docId);
        file.moveTo(folderDestino);
    }

    return true;
}

/**
 * Aplica interlineado sencillo a todo el documento
 */
function _aplicarInterlineadoSencillo(doc) {
    try {
        var paragraphs = doc.getBody().getParagraphs();
        for (var i = 0; i < paragraphs.length; i++) {
            paragraphs[i].setLineSpacing(1);
            paragraphs[i].setSpacingAfter(0);
            paragraphs[i].setSpacingBefore(0);
        }
    } catch (e) {
        Logger.log("⚠️ Error aplicando formato de interlineado: " + e.message);
    }
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
function extraerDescripcionDelPDF(pdfFileId, numGarajes, tieneDeposito, codigoRegistro, precioVentaFormat, tipoInmueble) {
    var MARCADOR_INICIO = "DESCRIPCIÓN DEL INMUEBLE";
    var MARCADOR_FIN = "y vive en el apartamento de tus sueños";

    // Desde que el motor nativo deja un GOOGLE DOC (no un PDF), se lee el Doc
    // DIRECTAMENTE, párrafo por párrafo. Pasarlo a PDF y reconvertirlo metía el
    // número de página ("3 de 4") en medio de los dormitorios, partía emojis y
    // aplastaba los saltos de línea que luego había que adivinar (18-09-2026).
    try {
        if (DriveApp.getFileById(pdfFileId).getMimeType() === MimeType.GOOGLE_DOCS) {
            var lineas = extraerLineasDeDoc(pdfFileId, MARCADOR_INICIO, MARCADOR_FIN);
            if (lineas && lineas.length) {
                return pulirDescripcion(lineas, {
                    numGarajes: numGarajes,
                    tieneDeposito: tieneDeposito,
                    codigoRegistro: codigoRegistro,
                    precioVentaFormat: precioVentaFormat,
                    tipoInmueble: tipoInmueble
                });
            }
        }
    } catch (eDoc) {
        Logger.log("⚠️ Lectura directa del Doc falló, se usa la ruta PDF: " + eDoc.message);
    }

    // Ruta antigua: actas viejas que sí son PDF.
    var textoCrudo = extraerTextoEntre(pdfFileId, MARCADOR_INICIO, MARCADOR_FIN);

    if (textoCrudo) {
        return limpiarTexto(textoCrudo, numGarajes, tieneDeposito, codigoRegistro, precioVentaFormat);
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
function limpiarTexto(texto, numGarajes, tieneDeposito, codigoRegistro, precioVentaFormat) {
    if (!texto) return "";

    // 1. Limpieza básica inicial
    var limpio = texto
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ') // Unificar espacios
        .replace(/[\uFFFD\uFFFC]/g, '') // Eliminar caracteres rotos de extracción PDF (emojis partidos como cuadros o signos de interrogación)
        .replace(/^\s*(?:P[aá]gina\s+)?\d+\s+de\s+\d+\s*/i, '') // Eliminar artefactos de paginación del PDF (ej: "2 de 4") al inicio
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
        { pattern: /Dormitorio terciario:/gi, replacement: '\n\nDormitorio terciario:' },
        { pattern: /Dormitorio Cuaternario:/gi, replacement: '\n\nDormitorio Cuaternario:' },
        { pattern: /Dormitorio Quinario:/gi, replacement: '\n\nDormitorio Quinario:' },

        // Mascotas (Limpiando el "3 de 4" heredado de forms)
        { pattern: /Mascotas:\s*(?:3 de 4)?/gi, replacement: '\n\n🐾 Mascotas:' },

        // Cierre
        { pattern: /todo está a tu alcance/gi, replacement: '\n\ntodo está a tu alcance' },
        { pattern: /Agenda tu cita ahora/gi, replacement: '\n\nAgenda tu cita ahora' },
        { pattern: /y vive en el apartamento/gi, replacement: '\ny vive en el apartamento' }
    ];

    // Aplicar reemplazos
    for (var i = 0; i < reemplazos.length; i++) {
        limpio = limpio.replace(reemplazos[i].pattern, reemplazos[i].replacement);
    }

    // 3. Formatear Título y Garajes
    var lineas = limpio.split('\n');
    if (lineas.length > 0) {
        var titulo = lineas[0];
        
        // 3a. Inyectar garajes si es un número válido y no existe ya
        if (numGarajes && numGarajes.toString().match(/^[1-9]$/)) {
            // Busca "Bañ/" (o algo similar) y mete "XGar/" antes del Mt²
            if (!/Gar\//i.test(titulo)) {
                titulo = titulo.replace(/(\d+Bañ\/)/i, '$1' + numGarajes + 'Gar/');
            }
        }

        // 3b. Inyectar depósito
        if (tieneDeposito && !/Dep\//i.test(titulo)) {
            // Busca Bañ/ (y opcionalmente Gar/ que acabamos de inyectar) y mete 1Dep/ después
            titulo = titulo.replace(/(\d+Bañ\/(?:\d+Gar\/)?)/i, '$11Dep/');
        }
        
        // 3b-2. Inyectar precio de Venta en Millones si aplica
        if (precioVentaFormat && titulo.indexOf(precioVentaFormat) === -1) {
            // Reemplaza algo como "$2.900.000" por "$425M/$2.900.000"
            titulo = titulo.replace(/(\$\s*\d[\d.,]*)/, precioVentaFormat + '/$1');
        }

        // 3c. Añadir salto de línea antes del tipo de inmueble (puede tener o no guion antes)
        titulo = titulo.replace(/\s+(APTO|CASA|LOCAL|OFICINA|LOTE|BODEGA|EDIFICIO|FINCA)\s+-/i, '\n$1 -');
        
        lineas[0] = titulo;
        limpio = lineas.join('\n');
    }

    // 4. Inyectar ID de registro al final de todo
    if (codigoRegistro) {
        // Nos aseguramos de limpiar espacios al final antes de inyectar
        limpio = limpio.trimRight() + '\n\nCODIGO:' + codigoRegistro;
    }

    // 5. Limpieza final de espacios extra generados
    limpio = limpio.replace(/\n\s+\n/g, '\n\n');

    return limpio;
}


// ==========================================
// LECTURA DIRECTA DEL GOOGLE DOC (ruta actual)
// ==========================================

/**
 * Devuelve las líneas del Doc entre los dos marcadores, respetando su
 * estructura: cada párrafo es una línea y cada elemento de lista lleva su
 * viñeta según el nivel (● primer nivel, ○ segundo). Sin PDF de por medio no
 * hay números de página ni emojis partidos.
 */
function extraerLineasDeDoc(docId, inicioTexto, finTexto) {
    var body = DocumentApp.openById(docId).getBody();
    var lineas = [];
    var dentro = false;
    for (var i = 0; i < body.getNumChildren(); i++) {
        var el = body.getChild(i);
        var tipo = el.getType();
        if (tipo !== DocumentApp.ElementType.PARAGRAPH && tipo !== DocumentApp.ElementType.LIST_ITEM) continue;
        var texto = el.getText();
        if (!dentro) {
            var pos = texto.indexOf(inicioTexto);
            if (pos === -1) continue;
            dentro = true;
            texto = texto.substring(pos + inicioTexto.length);
            if (!texto.trim()) continue;
        }
        if (tipo === DocumentApp.ElementType.LIST_ITEM) {
            texto = (el.getNestingLevel() > 0 ? '○ ' : '● ') + texto.trim();
        }
        var fin = texto.indexOf(finTexto);
        if (fin !== -1) {
            lineas.push(texto.substring(0, fin + finTexto.length));
            return lineas;
        }
        lineas.push(texto);
    }
    return dentro ? lineas : null;
}

/**
 * Deja la descripción lista para publicar. Función PURA (sin servicios de
 * Google): se prueba en local con _herramientas_locales/test_descripcion_inmueble.js
 *
 * Corrige lo que trae la plantilla genérica: plurales "(es)"/"(s)", "El/la",
 * "via", caracteres invisibles de Forms (ㅤ), viñetas y "$" repetidos, zonas
 * duplicadas y mayúsculas a mitad de frase.
 */
function pulirDescripcion(lineas, opciones) {
    opciones = opciones || {};
    var INVISIBLES = /[ㅤ​-‏⁠﻿‪-‮]/g;

    var plural = function (n, singular, pluralPalabra) {
        return n + ' ' + (parseInt(n, 10) === 1 ? singular : pluralPalabra);
    };
    var FEMENINOS = ['Casa', 'Oficina', 'Bodega', 'Finca', 'Habitación', 'Casa Lote'];

    var out = lineas.map(function (l) {
        var s = String(l)
            .replace(/^\t+/, '')
            .replace(INVISIBLES, ' ')
            .replace(/[  ]{2,}/g, ' ')
            .replace(/\s+$/, '');

        // Plurales de la plantilla
        s = s.replace(/(\d+) habitación\(es\)/gi, function (m, n) { return plural(n, 'habitación', 'habitaciones'); })
             .replace(/(\d+) baño\(s\)/gi, function (m, n) { return plural(n, 'baño', 'baños'); })
             .replace(/(\d+) parqueadero\(s\)/gi, function (m, n) { return plural(n, 'parqueadero', 'parqueaderos'); })
             .replace(/(habitaci[oó]n(?:es)?),\s+y\s+/gi, '$1 y ');

        // Sin cantidad: "Comunal parqueadero(s) ..." / "Ningun parqueadero(s) ..."
        s = s.replace(/dispone de Comunal parqueadero\(s\)(?: (?:Independiente|Servidumbre))?(?: (?:Cubierto|Descubierto))?/gi, 'dispone de parqueadero comunal')
             .replace(/dispone de Ning[uú]n[oa]? parqueadero\(s\)(?: (?:Independiente|Servidumbre))?(?: (?:Cubierto|Descubierto))?/gi, 'no dispone de parqueadero');

        // Parqueaderos: "2 parqueaderos Servidumbre Cubierto" -> "2 parqueaderos en servidumbre y cubiertos"
        s = s.replace(/(\d+) (parqueaderos?) (Independiente|Servidumbre) (Cubierto|Descubierto)/gi,
            function (m, n, palabra, tipo, techo) {
                var varios = parseInt(n, 10) !== 1;
                var t = /servidumbre/i.test(tipo) ? 'en servidumbre' : (varios ? 'independientes' : 'independiente');
                var c = techo.toLowerCase() + (varios ? 's' : '');
                return n + ' ' + palabra + ' ' + t + ' y ' + c;
            });

        // Artículo según el tipo de inmueble
        s = s.replace(/El\/la\s+([A-ZÁÉÍÓÚ][\wáéíóúñ]*)/g, function (m, tipo) {
            return (FEMENINOS.indexOf(tipo) !== -1 ? 'La ' : 'El ') + tipo;
        });

        // Vía
        s = s.replace(/sobre via (\w+)/gi, function (m, t) { return 'sobre una vía ' + t.toLowerCase() + '.'; })
             .replace(/\bvia\b/g, 'vía');

        // Mayúscula a mitad de frase tras coma
        s = s.replace(/, El (Apartamento|Apartaestudio|Casa|Local|Inmueble)/g, ', el $1');

        // Depósito sin viñeta (la columna trae "Deposito" sin "•")
        s = s.replace(/\s*\bDeposito\b/g, ' •Depósito');
        // Texto libre vacío o sin características internas
        s = s.replace(/\s*adicionando que\s*\.?\s*$/i, '')
             .replace(/características adicionales como:\s*adicionando que\s+(\S)/i, function (m, c) { return 'características adicionales: ' + c.toLowerCase(); });
        // "adicionando que Tiene persianas" -> minúscula
        // Tras una lista "•..." el texto libre va como frase aparte: "•Depósito. Además, tiene persianas"
        s = s.replace(/adicionando que\s+que\s+/gi, 'adicionando que ') // el propietario escribió "que ..."
             // Con lista (o texto propio) antes, el texto libre va como frase aparte:
             // "•Depósito. Además, tiene persianas". Justo tras "como:" no aplica.
             .replace(/([^\s:])\s+adicionando que\s+(\S)/, function (m, antes, c) { return antes + '. Además, ' + c.toLowerCase(); })
             .replace(/adicionando que ([A-ZÁÉÍÓÚ])/g, function (m, c) { return 'adicionando que ' + c.toLowerCase(); });

        // Listas en línea: "•A •B •A" -> sin repetidos y con espacio uniforme
        if (s.indexOf('•') !== -1) {
            var partes = s.split('•');
            var cabeza = partes.shift();
            var vistos = {};
            var items = [];
            partes.forEach(function (p) {
                var nombre = p.trim();
                if (!nombre) return;
                var clave = nombre.toLowerCase();
                if (vistos[clave]) return;
                vistos[clave] = true;
                items.push('•' + nombre);
            });
            s = (cabeza.trim() ? cabeza.trim() + ' ' : '') + items.join(' ');
        }

        // Viñetas y signos repetidos
        s = s.replace(/^([●○])\s*(?:[●○*]\s*)+/, '$1 ')
             .replace(/\$\s*\$/g, '$')
             .replace(/\s+([,.])/g, '$1');

        // Valores del formulario con marcas internas y mayúsculas a mitad de frase
        s = s.replace(/\(CO\)/g, '')
             .replace(/\b(tu|el|El|La|la) (Apartamento|Apartaestudio|Casa)\b/g, function (m, a, t) { return a + ' ' + t.toLowerCase(); })
             .replace(/vista (Interior y Exterior|Interior|Exterior)/g, function (m, v) { return 'vista ' + v.toLowerCase(); })
             .replace(/una Zona (Residencial|Comercial|Industrial|Campestre)/g, function (m, z) { return 'una zona ' + z.toLowerCase(); })
             // "cocina <estilo> <tipo>" -> "cocina integral americana", "cocina integral en U", "cocina semi-integral tipo isla"
             .replace(/cocina (Abierta|cerrada|Cerrada|Americana|Isla|U) (Integral|Semi-Integral)/g, function (m, estilo, tipo) {
                 var e = { 'Isla': 'tipo isla', 'U': 'en U' }[estilo] || estilo.toLowerCase();
                 return 'cocina ' + tipo.toLowerCase() + ' ' + e;
             });

        // Párrafo largo sin punto final
        // (no en listas "•...", viñetas ni medidas de dormitorios)
        if (s.length > 80 && !/^(•|[●○]|Dormitorio)/.test(s) && /[A-Za-zÁÉÍÓÚáéíóúñ0-9)]$/.test(s)) s += '.';
        s = s.replace(/\b(que|de|la|el|y) \1\b/gi, '$1'); // "que que" -> "que"

        return s.replace(/[ ]{2,}/g, ' ');
    });

    // Viñetas: la plantilla mezcla niveles de lista sin criterio. Regla única:
    // en cada grupo, el primer punto es "●" y los siguientes "○"
    // (● Espacio de la nevera / ○ Punto de AGUA). Viñetas vacías se quitan.
    var agrupadas = [];
    var enLista = false;
    out.forEach(function (s) {
        var m = s.match(/^[●○]\s*(.*)$/);
        if (!m) { enLista = false; agrupadas.push(s); return; }
        if (!m[1].trim()) return;
        agrupadas.push((enLista ? '○ ' : '● ') + m[1].trim());
        enLista = true;
    });
    // Sin ninguna característica interna ni texto libre, la frase queda colgando.
    out = agrupadas.filter(function (s) { return !/^pero con características adicionales(?: como)?:\s*$/i.test(s); });

    // Parqueadero + características en UNA frase. La plantilla las separa con un
    // salto y un "pero" que solo tiene sentido cuando NO hay parqueadero.
    for (var k = 0; k < out.length; k++) {
        if (!/dispone de .*parqueadero/i.test(out[k])) continue;
        var sig = out[k + 1] || '';
        var m2 = sig.match(/^pero con (características adicionales(?: como)?:.*)$/i);
        if (m2) {
            var enlace = /no dispone de parqueadero/i.test(out[k]) ? ', pero cuenta con ' : ', y cuenta con ';
            out[k] = out[k].replace(/[.\s]+$/, '') + enlace + m2[1];
            out.splice(k + 1, 1);
        }
        if (!/[.!?]$/.test(out[k])) out[k] += '.';
    }

    // Valores vacíos o poco naturales dentro de las secciones
    out = out.map(function (s) {
        if (/^● \$\s*0?$/.test(s)) return '';                       // administración sin valor
        if (/^● SI$/i.test(s)) return '● Se permiten mascotas';
        if (/^● NO$/i.test(s)) return '● No se permiten mascotas';
        return s;
    });

    // Secciones con encabezado (🏢 ..., 💰 ..., 🛏️ ...) que quedaron sin contenido:
    // se quita el encabezado para que no quede un título colgando.
    var esEncabezado = function (s) { return /^[^\wÁÉÍÓÚáéíóúñ•●○$]+.*:\s*$/.test(s) && !/^(pero|El|La)\b/.test(s); };
    out = out.filter(function (s, i) {
        if (!esEncabezado(s)) return true;
        for (var j = i + 1; j < out.length; j++) {
            if (!out[j].trim()) continue;
            return !esEncabezado(out[j]) && !/^todo está a tu alcance/i.test(out[j]);
        }
        return false;
    });

    // Aire antes del cierre aunque la línea anterior se haya quitado
    out = out.join('\n').replace(/\n(todo está a tu alcance)/i, '\n\n$1').split('\n');

    var texto = out.join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Título: garajes, depósito, precio de venta y salto antes del tipo.
    var partesTexto = texto.split('\n');
    var titulo = partesTexto[0] + (partesTexto[1] && /^(APTO|CASA|LOCAL|OFICINA|LOTE|BODEGA|EDIFICIO|FINCA|APARTAESTUDIO)\b/i.test(partesTexto[1]) ? '\n' + partesTexto[1] : '');
    var consumidas = titulo.split('\n').length;
    var n = String(opciones.numGarajes || '');
    if (/^[1-9]$/.test(n) && !/Gar\//i.test(titulo)) titulo = titulo.replace(/(\d+Bañ\/)/i, '$1' + n + 'Gar/');
    if (opciones.tieneDeposito && !/Dep\//i.test(titulo)) titulo = titulo.replace(/(\d+Bañ\/(?:\d+Gar\/)?)/i, '$11Dep/');
    if (opciones.precioVentaFormat && titulo.indexOf(opciones.precioVentaFormat) === -1) {
        titulo = titulo.replace(/(\$\s*\d[\d.,]*)/, opciones.precioVentaFormat + '/$1');
    }
    texto = [titulo].concat(partesTexto.slice(consumidas)).join('\n');

    // Tipo real del inmueble (la plantilla asume apartamento)
    var TIPOS = {
        'Casa': { abrev: 'CASA', este: 'esta casa', el: 'la casa' },
        'Apartaestudio': { abrev: 'APTOESTUDIO', este: 'este apartaestudio', el: 'el apartaestudio' }
    };
    var tipo = TIPOS[String(opciones.tipoInmueble || '').trim()];
    if (tipo) {
        texto = texto.replace(/^(APTO) - /m, tipo.abrev + ' - ')
                     .replace(/este apartamento/g, tipo.este)
                     .replace(/el apartamento de tus sueños/g, tipo.el + ' de tus sueños');
    }

    if (opciones.codigoRegistro) texto = texto.replace(/\s+$/, '') + '\n\nCODIGO:' + opciones.codigoRegistro;
    return texto;
}
