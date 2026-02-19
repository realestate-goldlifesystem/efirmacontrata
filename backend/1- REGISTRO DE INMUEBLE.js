// ==========================================
// REGISTRO DE INMUEBLES - PARTE 1
// Sistema de Gestión Inmobiliaria
// Versión: v10.1-corregido
// Archivo 1 de 2 (Procesamiento inicial)
// ==========================================

// CONFIGURACIÓN GLOBAL
const CONFIG_INMUEBLES = {
  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  TEMPLATE_FOLDER_ID: '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH',
  PARENT_FOLDER_ID: '1mBbFORjuddMN8nwU1zY27_wLa9iZWfvX',
  VERSION: 'v10.1-corregido',
  TIEMPO_ESPERA_PARTE2: 2000 // 2 segundos
};

// ==========================================
// FUNCIÓN PRINCIPAL - DISPARO DEL FORMULARIO
// ==========================================

function onFormSubmitInmueble(e) {
  var tiempoInicio = new Date().getTime();
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  Logger.log('🔵 ARCHIVO 1 - INICIO DEL PROCESAMIENTO');
  Logger.log('🔵 ═══════════════════════════════════════════════════');

  try {
    // PASO 1: Obtener hoja y validar
    var sheet = getSheet();
    var row = sheet.getLastRow();

    if (row <= 1) {
      Logger.log('⚠️ No hay suficientes filas de datos');
      return;
    }

    Logger.log(`📊 Procesando fila: ${row}`);

    // PASO 2: Copiar formato de fila anterior
    Logger.log('🎨 Copiando formato...');
    copiarFormatoFila(sheet, row);

    // PASO 3: Generar CDR (Código de Registro)
    Logger.log('🔢 Generando Código de Registro...');
    var cdr = generarCodigoRegistro(sheet, row);
    Logger.log(`✅ CDR generado: ${cdr}`);

    // PASO 4: Asignar estado inicial "REGISTRANDO"
    Logger.log('📌 Asignando estado inicial...');
    asignarEstadoRegistrando(sheet, row);

    // PASO 5: Extraer datos del inmueble
    Logger.log('📋 Extrayendo datos del inmueble...');
    var datosInmueble = extraerDatosInmueble(sheet, row);

    // PASO 6: Procesar RPR (Buscar o Crear)
    Logger.log('🔍 Procesando Registro de Propietario (RPR)...');
    var resultadoRPR = procesarRPR(datosInmueble);
    Logger.log(`✅ RPR: ${resultadoRPR.codigo}`);

    // PASO 7: Guardar link RPR en la hoja
    Logger.log('🔗 Guardando link de RPR...');
    guardarLinkRPR(sheet, row, resultadoRPR);

    // PASO 8: Determinar tipo de registro
    Logger.log('🔍 Determinando tipo de registro...');
    var tipoRegistro = determinarTipoRegistro(sheet, row, resultadoRPR, datosInmueble);
    Logger.log(`📊 Tipo detectado: ${tipoRegistro.tipo}`);

    // PASO 9: Guardar datos para Archivo 2
    Logger.log('💾 Guardando datos para procesamiento posterior...');
    var datosParaParte2 = {
      fila: row,
      cdr: cdr,
      tipoRegistro: tipoRegistro,
      rprFolderId: resultadoRPR.folderId,
      rprCodigo: resultadoRPR.codigo,
      datosInmueble: datosInmueble,
      timestamp: tiempoInicio
    };

    PropertiesService.getScriptProperties().setProperty(
      'PROCESO_PARTE2_' + row,
      JSON.stringify(datosParaParte2)
    );

    // PASO 10: Crear trigger para Archivo 2
    Logger.log('⏰ Programando ejecución de Archivo 2...');
    ScriptApp.newTrigger('continuarRegistroInmuebleParte2')
      .timeBased()
      .after(CONFIG_INMUEBLES.TIEMPO_ESPERA_PARTE2)
      .create();

    var tiempoTotal = (new Date().getTime() - tiempoInicio) / 1000;
    Logger.log('🔵 ═══════════════════════════════════════════════════');
    Logger.log(`✅ ARCHIVO 1 - COMPLETO en ${tiempoTotal} segundos`);
    Logger.log('⏱️ Archivo 2 se ejecutará en 2 segundos');
    Logger.log('🔵 ═══════════════════════════════════════════════════');

  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO en Archivo 1: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);

    try {
      var sheet = getSheet();
      var row = sheet.getLastRow();
      marcarErrorEnFila(sheet, row, error.message);
    } catch (e) {
      Logger.log('❌ No se pudo marcar error en la hoja: ' + e.message);
    }
  }
}

// ==========================================
// FUNCIONES DE UTILIDAD BÁSICAS
// ==========================================

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG_INMUEBLES.HOJA_PRINCIPAL);
}

function getColumnByName(sheet, columnName) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var col = 0; col < headers.length; col++) {
    if (headers[col].toString().trim() === columnName.trim()) {
      return col + 1;
    }
  }
  Logger.log(`⚠️ Columna no encontrada: ${columnName}`);
  return null;
}

function copiarFormatoFila(sheet, row) {
  try {
    var previousRow = row - 1;
    var sourceRange = sheet.getRange(previousRow, 1, 1, sheet.getLastColumn());
    sourceRange.copyFormatToRange(sheet, 1, sheet.getLastColumn(), row, row);
    Logger.log('✅ Formato copiado correctamente');
  } catch (error) {
    Logger.log('⚠️ Error al copiar formato: ' + error.message);
  }
}

// ==========================================
// GENERACIÓN DE CÓDIGO DE REGISTRO (CDR)
// ==========================================

function generarCodigoRegistro(sheet, row) {
  // Obtener columnas necesarias
  var tipoNegocioCol = getColumnByName(sheet, 'TIPO DE NEGOCIO');
  var direccionCol = getColumnByName(sheet, 'Ingrese la Dirección del inmueble');
  var torreCol = getColumnByName(sheet, 'N° o Letra de la Torre');
  var aptoCol = getColumnByName(sheet, 'N° de inmueble');
  var cdrCol = getColumnByName(sheet, 'CODIGO DE REGISTRO');

  // Leer datos
  var tipoNegocio = sheet.getRange(row, tipoNegocioCol).getValue();
  var direccion = sheet.getRange(row, direccionCol).getValue();
  var torre = sheet.getRange(row, torreCol).getValue();
  var apto = sheet.getRange(row, aptoCol).getValue();

  // Generar fecha
  var date = new Date();
  var formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd-MM-yyyy');

  // Determinar código del tipo de negocio
  var tipoNegocioCode = obtenerCodigoTipoNegocio(tipoNegocio);

  // Calcular secuencia
  var secuencia = calcularSecuencia(sheet, row, tipoNegocioCode);

  // Construir CDR
  var cdr = `REG_${formattedDate}-${tipoNegocioCode}${secuencia}_(${direccion})`;

  if (torre) {
    cdr += `_TORRE-${torre}`;
  }

  cdr += `_APTO-${apto}`;

  // Guardar en la hoja
  sheet.getRange(row, cdrCol).setValue(cdr);

  return cdr;
}

function obtenerCodigoTipoNegocio(tipoNegocio) {
  var codigo = '';

  switch (tipoNegocio) {
    case 'Administración':
      codigo = 'A';
      break;
    case 'Corretaje':
      codigo = 'C';
      break;
    case 'Venta':
      codigo = 'V';
      break;
    case 'Admi-Venta':
      codigo = 'AV';
      break;
    case 'Vendi-Renta':
      codigo = 'VR';
      break;
    default:
      codigo = tipoNegocio.charAt(0).toUpperCase();
  }

  return codigo;
}

function calcularSecuencia(sheet, currentRow, tipoNegocioCode) {
  var cdrCol = getColumnByName(sheet, 'CODIGO DE REGISTRO');
  var registros = sheet.getRange(2, cdrCol, currentRow - 2, 1).getValues();

  var secuencias = { 'A': 0, 'C': 0, 'V': 0, 'AV': 0, 'VR': 0 };

  registros.forEach(function (registro) {
    var cdrValue = registro[0];
    if (!cdrValue) return;

    var match = cdrValue.toString().match(/REG_\d{2}-\d{2}-\d{4}-([ACV]{1,2}|VR)(\d+)/);
    if (match) {
      var tipo = match[1];
      var seq = parseInt(match[2], 10);
      if (!isNaN(seq) && seq > (secuencias[tipo] || 0)) {
        secuencias[tipo] = seq;
      }
    }
  });

  secuencias[tipoNegocioCode] = (secuencias[tipoNegocioCode] || 0) + 1;

  return secuencias[tipoNegocioCode];
}

// ==========================================
// ASIGNAR ESTADO INICIAL
// ==========================================

function asignarEstadoRegistrando(sheet, row) {
  var estadoCol = getColumnByName(sheet, 'ESTADO DEL INMUEBLE');
  var detallesCol = getColumnByName(sheet, 'DETALLES DEL ESTADO DEL INMUEBLE');

  sheet.getRange(row, estadoCol).setValue('REGISTRANDO');
  sheet.getRange(row, detallesCol).setValue('🔄 Verificando y completando registro...');

  SpreadsheetApp.flush();
}

// ==========================================
// EXTRAER DATOS DEL INMUEBLE
// ==========================================

function extraerDatosInmueble(sheet, row) {
  return {
    nombrePropietario: sheet.getRange(row, getColumnByName(sheet, 'Ingrese Nombres y Apellidos')).getValue(),
    numeroDocumento: sheet.getRange(row, getColumnByName(sheet, 'Número de documento')).getValue(),
    tipoNegocio: sheet.getRange(row, getColumnByName(sheet, 'TIPO DE NEGOCIO')).getValue(),
    direccion: sheet.getRange(row, getColumnByName(sheet, 'Ingrese la Dirección del inmueble')).getValue(),
    torre: sheet.getRange(row, getColumnByName(sheet, 'N° o Letra de la Torre')).getValue(),
    apto: sheet.getRange(row, getColumnByName(sheet, 'N° de inmueble')).getValue()
  };
}
// ==========================================
// REGISTRO DE INMUEBLES - PARTE 2
// Continuación del Archivo 1
// Líneas 301-600
// ==========================================

// ==========================================
// PROCESAMIENTO DE RPR (REGISTRO DE PROPIETARIO)
// ==========================================

function procesarRPR(datosInmueble) {
  var parentFolder = DriveApp.getFolderById(CONFIG_INMUEBLES.PARENT_FOLDER_ID);
  var templateFolder = DriveApp.getFolderById(CONFIG_INMUEBLES.TEMPLATE_FOLDER_ID);

  // Buscar si ya existe RPR con esta cédula
  Logger.log(`🔍 Buscando RPR con cédula: ${datosInmueble.numeroDocumento}`);
  var carpetaPropietario = buscarPropietarioPorCedula(parentFolder, datosInmueble.numeroDocumento);

  if (carpetaPropietario) {
    // RPR existe - reutilizar
    Logger.log('♻️ RPR existente encontrado, reutilizando...');
    var nombreCarpeta = carpetaPropietario.getName();
    var matchRPR = nombreCarpeta.match(/RPR-\d+-\d+/);
    var codigoRPR = matchRPR ? matchRPR[0] : 'RPR-ERROR';

    return {
      codigo: codigoRPR,
      folderId: carpetaPropietario.getId(),
      folder: carpetaPropietario,
      esNuevo: false
    };
  } else {
    // RPR no existe - crear nuevo
    Logger.log('🆕 Creando nuevo RPR...');
    var secuenciaRPR = getNextRPRSequence(parentFolder);
    var codigoRPR = generarCodigoRPR(secuenciaRPR, datosInmueble.numeroDocumento);
    var folderName = `${secuenciaRPR}- ${datosInmueble.nombrePropietario}: CC ${datosInmueble.numeroDocumento}/${codigoRPR}`;

    carpetaPropietario = parentFolder.createFolder(folderName);
    Logger.log(`📁 Carpeta RPR creada: ${folderName}`);

    // Copiar estructura completa de la plantilla
    Logger.log('📋 Copiando estructura de PLANTILLA #1 (esto puede tardar 1-2 min)...');
    copiarContenidoCompleto(templateFolder, carpetaPropietario);
    Logger.log('✅ Estructura copiada completamente');

    return {
      codigo: codigoRPR,
      folderId: carpetaPropietario.getId(),
      folder: carpetaPropietario,
      esNuevo: true
    };
  }
}

function buscarPropietarioPorCedula(parentFolder, cedula) {
  var cedulaStr = cedula.toString().trim();
  var folders = parentFolder.getFolders();

  while (folders.hasNext()) {
    var folder = folders.next();
    var folderName = folder.getName();

    var match = folderName.match(/CC\s*(\d+)/i);
    if (match && match[1] === cedulaStr) {
      Logger.log(`✅ Carpeta RPR existente encontrada: ${folderName}`);
      return folder;
    }
  }

  Logger.log('📌 No se encontró carpeta RPR existente');
  return null;
}

function getNextRPRSequence(parentFolder) {
  var folders = parentFolder.getFolders();
  var highestNumber = 0;

  while (folders.hasNext()) {
    var folder = folders.next();
    var folderName = folder.getName();

    var match = folderName.match(/^(\d+)-/);
    if (match) {
      var number = parseInt(match[1], 10);
      if (number > highestNumber) {
        highestNumber = number;
      }
    }
  }

  var nextNumber = highestNumber + 1;
  Logger.log(`📊 Siguiente secuencia RPR: ${nextNumber}`);
  return nextNumber;
}

function generarCodigoRPR(secuencia, cedula) {
  var digitosCedula = extraer4DigitosCedula(cedula);
  return `RPR-${secuencia}-${digitosCedula}`;
}

function extraer4DigitosCedula(cedula) {
  var cedulaStr = cedula.toString().replace(/\D/g, '');
  if (cedulaStr.length < 4) {
    return cedulaStr.padStart(4, '0');
  }
  var primeros2 = cedulaStr.substring(0, 2);
  var ultimos2 = cedulaStr.substring(cedulaStr.length - 2);
  return primeros2 + ultimos2;
}

function copiarContenidoCompleto(sourceFolder, destinationFolder) {
  try {
    // Copiar archivos
    var files = sourceFolder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      file.makeCopy(file.getName(), destinationFolder);
    }

    // Copiar carpetas recursivamente
    var folders = sourceFolder.getFolders();
    while (folders.hasNext()) {
      var folder = folders.next();
      var newSubFolder = destinationFolder.createFolder(folder.getName());
      copiarContenidoCompleto(folder, newSubFolder);
    }
  } catch (error) {
    Logger.log(`⚠️ Error al copiar contenido: ${error.message}`);
  }
}

// ==========================================
// GUARDAR LINK DE RPR EN LA HOJA
// ==========================================

function guardarLinkRPR(sheet, row, resultadoRPR) {
  var linkColumn = getColumnByName(sheet, 'LINK DE CARPETA RPR');

  var folderLink = `https://drive.google.com/drive/folders/${resultadoRPR.folderId}`;
  var formula = `=HYPERLINK("${folderLink}";"${resultadoRPR.codigo}")`;

  sheet.getRange(row, linkColumn).setFormula(formula);
  Logger.log(`✅ Link RPR guardado: ${resultadoRPR.codigo}`);
}

// ==========================================
// DETERMINACIÓN DEL TIPO DE REGISTRO
// ==========================================

function determinarTipoRegistro(sheet, row, resultadoRPR, datosInmueble) {
  // Si RPR es nuevo, es TIPO 4 automáticamente
  if (resultadoRPR.esNuevo) {
    Logger.log('📊 TIPO 1: NUEVO PROPIETARIO (RPR recién creado)');
    return {
      tipo: 'TIPO_1',
      registroExistente: null,
      propietarioExistente: null
    };
  }

  // RPR existe - validar más a fondo
  Logger.log('🔍 RPR existe, validando si hay REG existente...');

  var rprFolder = resultadoRPR.folder;
  var inmueblesFolder = getFolderByName(rprFolder, 'INMUEBLES');

  if (!inmueblesFolder) {
    Logger.log('⚠️ No se encontró carpeta INMUEBLES en RPR');
    return {
      tipo: 'TIPO_1',
      descripcion: 'RPR sin INMUEBLES - Crear estructura',
      filaOriginal: null,
      regExistenteId: null
    };
  }

  // Asegurar que existan las 3 carpetas de tipo de negocio
  asegurarCarpetasTipoNegocio(inmueblesFolder);

  // Determinar carpeta de tipo de negocio
  var carpetaNegocio = determinarCarpetaNegocio(datosInmueble.tipoNegocio);
  var carpetaNegocioFolder = getFolderByName(inmueblesFolder, carpetaNegocio);

  if (!carpetaNegocioFolder) {
    Logger.log(`⚠️ No se encontró carpeta ${carpetaNegocio}`);
    return {
      tipo: 'TIPO_3',
      registroExistente: null,
      propietarioExistente: null,
      carpetaNegocio: carpetaNegocio
    };
  }

  // Buscar REG que coincida con dirección + torre + apto
  Logger.log('🔍 Buscando REG con misma dirección, torre y apto...');
  var regExistente = buscarREGPorDireccion(
    carpetaNegocioFolder,
    datosInmueble.direccion,
    datosInmueble.torre,
    datosInmueble.apto
  );

  if (regExistente) {
    // Encontró REG con misma dirección+torre+apto en el mismo tipo de negocio
    Logger.log(`✅ REG existente encontrado: ${regExistente.nombre}`);

    // Buscar fila original en la hoja
    var filaOriginal = buscarFilaPorCDRParcial(sheet, regExistente.nombre);

    Logger.log('📊 TIPO 2: RENOVACIÓN (mismo inmueble)');
    return {
      tipo: 'TIPO_2',
      descripcion: 'Renovación - Crear año nuevo',
      filaOriginal: filaOriginal,
      regExistenteId: regExistente.folder.getId(),
      regExistenteNombre: regExistente.nombre,
      carpetaNegocio: carpetaNegocio
    };
  }

  // Verificar si existe en OTRA carpeta de negocio (cambio de tipo)
  Logger.log('🔍 Verificando si existe en otro tipo de negocio...');
  var otrosNegociosResult = buscarEnOtrasCarpetasNegocio(
    inmueblesFolder,
    carpetaNegocio,
    datosInmueble
  );

  if (otrosNegociosResult) {
    Logger.log(`✅ REG encontrado en ${otrosNegociosResult.carpetaOrigen}: ${otrosNegociosResult.regFolder.getName()}`);

    var filaOriginal = buscarFilaPorCDRParcial(sheet, otrosNegociosResult.regFolder.getName());

    Logger.log('📊 TIPO 4: CAMBIO DE TIPO DE NEGOCIO');
    return {
      tipo: 'TIPO_4',
      descripcion: 'Cambio de tipo de negocio - Renombrar y mover REG',
      filaOriginal: filaOriginal,
      regExistenteId: otrosNegociosResult.regFolder.getId(),
      regExistenteNombre: otrosNegociosResult.regFolder.getName(),
      carpetaOrigen: otrosNegociosResult.carpetaOrigen,
      carpetaDestino: carpetaNegocio
    };
  }

  // No encontró REG - es un nuevo inmueble del mismo propietario
  Logger.log('📊 TIPO 3: NUEVO INMUEBLE DEL MISMO PROPIETARIO');
  return {
    tipo: 'TIPO_3',
    registroExistente: null,
    propietarioExistente: null,
    carpetaNegocio: carpetaNegocio
  };
}

function asegurarCarpetasTipoNegocio(inmueblesFolder) {
  var carpetasNecesarias = ['ARRIENDO', 'VENTA', 'BI-NEGOCIO'];

  carpetasNecesarias.forEach(function (nombreCarpeta) {
    var carpetaIterator = inmueblesFolder.getFoldersByName(nombreCarpeta);
    if (!carpetaIterator.hasNext()) {
      inmueblesFolder.createFolder(nombreCarpeta);
      Logger.log(`✅ Carpeta ${nombreCarpeta} creada`);
    }
  });
}

function determinarCarpetaNegocio(tipoNegocio) {
  if (tipoNegocio === 'Venta') {
    return 'VENTA';
  } else if (tipoNegocio === 'Administración' || tipoNegocio === 'Corretaje') {
    return 'ARRIENDO';
  } else if (tipoNegocio === 'Admi-Venta' || tipoNegocio === 'Vendi-Renta') {
    return 'BI-NEGOCIO';
  }
  return 'ARRIENDO'; // Default
}

function getFolderByName(parentFolder, folderName) {
  var folderIterator = parentFolder.getFoldersByName(folderName);
  return folderIterator.hasNext() ? folderIterator.next() : null;
}
// ==========================================
// REGISTRO DE INMUEBLES - PARTE 3 (FINAL)
// Continuación del Archivo 1
// Líneas 601-final
// ==========================================

// ==========================================
// BÚSQUEDA DE REG POR DIRECCIÓN
// ==========================================

function buscarREGPorDireccion(carpetaNegocioFolder, direccion, torre, apto) {
  var folders = carpetaNegocioFolder.getFolders();

  // Normalizar datos de búsqueda
  var direccionNorm = normalizarTexto(direccion);
  var torreNorm = torre ? normalizarTexto(torre.toString()) : '';
  var aptoNorm = normalizarTexto(apto.toString());

  Logger.log(`🔍 Buscando: Dirección="${direccionNorm}", Torre="${torreNorm}", Apto="${aptoNorm}"`);

  while (folders.hasNext()) {
    var folder = folders.next();
    var folderName = folder.getName();

    // Ignorar PLANTILLA #2
    if (folderName === 'PLANTILLA #2') {
      continue;
    }

    // Extraer componentes del nombre de carpeta REG
    var componentes = extraerComponentesREG(folderName);

    if (!componentes) {
      continue;
    }

    // Comparar dirección
    if (componentes.direccion !== direccionNorm) {
      continue;
    }

    // Comparar torre (puede estar vacía en ambos)
    var torreCoincide = false;
    if (!torreNorm && !componentes.torre) {
      // Ambos sin torre
      torreCoincide = true;
    } else if (torreNorm && componentes.torre && torreNorm === componentes.torre) {
      // Ambos con torre y coinciden
      torreCoincide = true;
    }

    if (!torreCoincide) {
      continue;
    }

    // Comparar apto
    if (componentes.apto !== aptoNorm) {
      continue;
    }

    // ¡Coincidencia encontrada!
    Logger.log(`✅ Coincidencia encontrada: ${folderName}`);
    return {
      folder: folder,
      nombre: folderName,
      componentes: componentes
    };
  }

  Logger.log('📌 No se encontró REG con esas características');
  return null;
}

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto.toString().trim().toUpperCase().replace(/\s+/g, ' ');
}

function extraerComponentesREG(nombreREG) {
  // Patrón: REG_DD-MM-YYYY-XXX_(DIRECCION)_TORRE-X_APTO-X
  // o:      REG_DD-MM-YYYY-XXX_(DIRECCION)_APTO-X (sin torre)

  try {
    // Extraer dirección
    var matchDireccion = nombreREG.match(/\(([^)]+)\)/);
    if (!matchDireccion) return null;
    var direccion = normalizarTexto(matchDireccion[1]);

    // Extraer torre (opcional)
    var matchTorre = nombreREG.match(/_TORRE-([^_]+)/);
    var torre = matchTorre ? normalizarTexto(matchTorre[1]) : '';

    // Extraer apto
    var matchApto = nombreREG.match(/_APTO-([^_\s]+)/);
    if (!matchApto) return null;
    var apto = normalizarTexto(matchApto[1]);

    return {
      direccion: direccion,
      torre: torre,
      apto: apto
    };
  } catch (e) {
    Logger.log(`⚠️ Error al extraer componentes de: ${nombreREG}`);
    return null;
  }
}

// ==========================================
// BÚSQUEDA EN OTRAS CARPETAS DE NEGOCIO
// ==========================================

function buscarEnOtrasCarpetasNegocio(inmueblesFolder, carpetaActual, datosInmueble) {
  var todasLasCarpetas = ['ARRIENDO', 'VENTA', 'BI-NEGOCIO'];
  var carpetasABuscar = todasLasCarpetas.filter(function (c) {
    return c !== carpetaActual;
  });

  Logger.log(`🔍 Buscando en otras carpetas: ${carpetasABuscar.join(', ')}`);

  for (var i = 0; i < carpetasABuscar.length; i++) {
    var nombreCarpeta = carpetasABuscar[i];
    var carpetaFolder = getFolderByName(inmueblesFolder, nombreCarpeta);

    if (!carpetaFolder) {
      continue;
    }

    var regEncontrado = buscarREGPorDireccion(
      carpetaFolder,
      datosInmueble.direccion,
      datosInmueble.torre,
      datosInmueble.apto
    );

    if (regEncontrado) {
      return {
        regFolder: regEncontrado.folder,
        carpetaOrigen: nombreCarpeta,
        componentes: regEncontrado.componentes
      };
    }
  }

  Logger.log('📌 No se encontró REG en otras carpetas de negocio');
  return null;
}

// ==========================================
// BÚSQUEDA DE FILA POR CDR
// ==========================================

function buscarFilaPorCDRParcial(sheet, nombreREG) {
  var cdrCol = getColumnByName(sheet, 'CODIGO DE REGISTRO');
  if (!cdrCol) return -1;

  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(2, cdrCol, lastRow - 1, 1).getValues();

  // Extraer el identificador único del REG (sin la parte de fecha)
  // REG_08-11-2025-C34_(CRA. 10 #172b - 50)_TORRE-1_APTO-606
  // Buscar por la parte: C34_(CRA. 10 #172b - 50)_TORRE-1_APTO-606

  var parteBusqueda = extraerParteUnicaREG(nombreREG);

  if (!parteBusqueda) {
    Logger.log(`⚠️ No se pudo extraer parte única de: ${nombreREG}`);
    return -1;
  }

  Logger.log(`🔍 Buscando fila con: ${parteBusqueda}`);

  for (var i = 0; i < values.length; i++) {
    var cdrValue = values[i][0];
    if (!cdrValue) continue;

    var cdrStr = cdrValue.toString();

    if (cdrStr.indexOf(parteBusqueda) !== -1) {
      var fila = i + 2;
      Logger.log(`✅ Fila encontrada: ${fila} (CDR: ${cdrStr})`);
      return fila;
    }
  }

  Logger.log('⚠️ No se encontró fila con ese CDR');
  return -1;
}

function extraerParteUnicaREG(nombreREG) {
  // De: REG_08-11-2025-C34_(CRA. 10 #172b - 50)_TORRE-1_APTO-606
  // Extraer: C34_(CRA. 10 #172b - 50)_TORRE-1_APTO-606

  var match = nombreREG.match(/REG_\d{2}-\d{2}-\d{4}-(.+)/);
  return match ? match[1] : null;
}

// ==========================================
// MARCAR ERROR EN FILA
// ==========================================

function marcarErrorEnFila(sheet, row, mensajeError) {
  try {
    var estadoCol = getColumnByName(sheet, 'ESTADO DEL INMUEBLE');
    var detallesCol = getColumnByName(sheet, 'DETALLES DEL ESTADO DEL INMUEBLE');

    if (estadoCol) {
      sheet.getRange(row, estadoCol).setValue('ERROR');
    }

    if (detallesCol) {
      var mensajeCompleto = `⚠️ ERROR: ${mensajeError}\n\nContacte al administrador o revise los logs de ejecución.`;
      sheet.getRange(row, detallesCol).setValue(mensajeCompleto);
    }

    SpreadsheetApp.flush();
    Logger.log(`❌ Error marcado en fila ${row}`);
  } catch (e) {
    Logger.log(`❌ No se pudo marcar error en fila: ${e.message}`);
  }
}

// ==========================================
// FUNCIÓN AUXILIAR: ELIMINAR TRIGGER
// ==========================================

function eliminarTriggerActual(nombreFuncion) {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var eliminados = 0;

    triggers.forEach(function (trigger) {
      if (trigger.getHandlerFunction() === nombreFuncion) {
        ScriptApp.deleteTrigger(trigger);
        eliminados++;
      }
    });

    if (eliminados > 0) {
      Logger.log(`🗑️ ${eliminados} trigger(s) eliminado(s): ${nombreFuncion}`);
    }
  } catch (e) {
    Logger.log(`⚠️ Error al eliminar triggers: ${e.message}`);
  }
}

// ==========================================
// FUNCIÓN PARA TIPO 4 (FLUJO NORMAL)
// ==========================================

function procesarTipo4Inmediato(sheet, row, datosInmueble, resultadoRPR) {
  // Para TIPO 4, el RPR ya se creó en procesarRPR()
  // Solo falta manejar la carpeta REG

  Logger.log('🔧 Procesando TIPO 4 - Configurando carpeta REG...');

  var rprFolder = resultadoRPR.folder;
  var inmueblesFolder = getFolderByName(rprFolder, 'INMUEBLES');

  if (!inmueblesFolder) {
    Logger.log('⚠️ No se encontró carpeta INMUEBLES (¿estructura incorrecta?)');
    return;
  }

  // Asegurar carpetas de tipo de negocio
  asegurarCarpetasTipoNegocio(inmueblesFolder);

  // Determinar carpeta destino
  var carpetaNegocio = determinarCarpetaNegocio(datosInmueble.tipoNegocio);
  var carpetaNegocioFolder = getFolderByName(inmueblesFolder, carpetaNegocio);

  if (!carpetaNegocioFolder) {
    Logger.log(`⚠️ No se encontró carpeta ${carpetaNegocio}`);
    return;
  }

  // Buscar PLANTILLA #2 en ARRIENDO
  var arriendoFolder = getFolderByName(inmueblesFolder, 'ARRIENDO');
  if (!arriendoFolder) {
    Logger.log('⚠️ No se encontró carpeta ARRIENDO');
    return;
  }

  var plantillaFolder = getFolderByName(arriendoFolder, 'PLANTILLA #2');
  if (!plantillaFolder) {
    Logger.log('⚠️ No se encontró PLANTILLA #2');
    return;
  }

  // Mover a carpeta destino si es necesario
  if (carpetaNegocio !== 'ARRIENDO') {
    plantillaFolder.moveTo(carpetaNegocioFolder);
    Logger.log(`✅ PLANTILLA #2 movida a: ${carpetaNegocio}`);
  }

  // Renombrar a CDR
  var cdr = sheet.getRange(row, getColumnByName(sheet, 'CODIGO DE REGISTRO')).getValue();
  plantillaFolder.setName(cdr);
  Logger.log(`✅ PLANTILLA #2 renombrada a: ${cdr}`);

  // Renombrar carpeta XXXX a año actual
  renombrarCarpetaAnioEnREG(plantillaFolder);
}

function renombrarCarpetaAnioEnREG(regFolder) {
  try {
    var entregasFolder = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
    if (!entregasFolder) {
      Logger.log('⚠️ No se encontró carpeta ENTREGAS DEL INMUEBLE');
      return;
    }

    var carpetaXXXX = getFolderByName(entregasFolder, 'XXXX');
    if (!carpetaXXXX) {
      Logger.log('⚠️ No se encontró carpeta XXXX');
      return;
    }

    var anioActual = new Date().getFullYear().toString();
    carpetaXXXX.setName(anioActual);
    Logger.log(`✅ Carpeta XXXX renombrada a: ${anioActual}`);
  } catch (e) {
    Logger.log(`⚠️ Error al renombrar carpeta año: ${e.message}`);
  }
}

// ==========================================
// FIN DEL ARCHIVO 1
// ==========================================

Logger.log('📄 Archivo 1 cargado correctamente - v10.1-corregido');