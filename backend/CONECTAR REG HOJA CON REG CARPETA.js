// ==========================================
// CONECTAR REG HOJA CON REG CARPETA - PARTE 1
// Sistema con continuación automática
// Versión: v2.0
// ==========================================

const CONFIG_CONECTAR = {
  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  CARPETA_PADRE_ID: '1mBbFORjuddMN8nwU1zY27_wLa9iZWfvX',
  VERSION: 'v2.0',
  TIEMPO_LIMITE_MS: 300000, // 5 minutos en milisegundos
  TIEMPO_ESPERA_PARTE2: 10000 // 10 segundos
};

// ==========================================
// FUNCIÓN PRINCIPAL - INICIO
// ==========================================

function conectarREGsConHoja() {
  var tiempoInicio = new Date().getTime();
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  Logger.log('🔵 CONECTAR REGs - PARTE 1 - INICIO DEL PROCESO');
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  
  try {
    // Limpiar estado previo
    PropertiesService.getScriptProperties().deleteProperty('CONECTAR_REG_PROGRESO');
    PropertiesService.getScriptProperties().deleteProperty('CONECTAR_REG_ERRORES');
    
    // 1. Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_CONECTAR.HOJA_PRINCIPAL);
    
    if (!sheet) {
      throw new Error('No se encontró la hoja: ' + CONFIG_CONECTAR.HOJA_PRINCIPAL);
    }
    
    Logger.log('✅ Hoja encontrada');
    
    // 2. Obtener columnas
    var cdrCol = getColumnByName(sheet, 'CODIGO DE REGISTRO');
    var linkREGCol = getColumnByName(sheet, 'LINK DE CARPETA REG');
    var linkInmueblesCol = getColumnByName(sheet, 'INMUEBLES REGISTRADOS');
    
    if (!cdrCol || !linkREGCol || !linkInmueblesCol) {
      throw new Error('No se encontraron todas las columnas necesarias');
    }
    
    Logger.log('✅ Columnas identificadas');
    
    // 3. Obtener carpeta padre
    var carpetaPadre = DriveApp.getFolderById(CONFIG_CONECTAR.CARPETA_PADRE_ID);
    Logger.log('✅ Carpeta padre accedida\n');
    
    // 4. Procesar filas con límite de tiempo
    var lastRow = sheet.getLastRow();
    var filaInicio = 2; // Empezar desde fila 2
    
    var resultado = procesarFilasConLimite(
      sheet, 
      filaInicio, 
      lastRow, 
      carpetaPadre, 
      cdrCol, 
      linkREGCol, 
      linkInmueblesCol,
      tiempoInicio
    );
    
    // 5. Guardar progreso y decidir si continuar
    if (resultado.necesitaContinuar) {
      Logger.log('\n⏰ Límite de tiempo alcanzado');
      Logger.log(`📊 Procesadas: ${resultado.filasExitosas} exitosas, ${resultado.filasConError.length} con errores`);
      Logger.log(`📍 Última fila procesada: ${resultado.ultimaFilaProcesada}`);
      
      // Guardar progreso
      guardarProgreso(resultado);
      
      // Crear trigger para continuar
      Logger.log('⏳ Programando continuación en 10 segundos...');
      ScriptApp.newTrigger('continuarConectarREGsParte2')
        .timeBased()
        .after(CONFIG_CONECTAR.TIEMPO_ESPERA_PARTE2)
        .create();
      
      Logger.log('🔵 ═══════════════════════════════════════════════════');
      Logger.log('⏸️ PARTE 1 - PAUSADO - Continuará en Parte 2');
      Logger.log('🔵 ═══════════════════════════════════════════════════');
    } else {
      // Proceso completado
      mostrarResumenFinal(resultado, tiempoInicio);
    }
    
  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);
  }
}

// ==========================================
// PROCESAR FILAS CON LÍMITE DE TIEMPO
// ==========================================

function procesarFilasConLimite(sheet, filaInicio, lastRow, carpetaPadre, cdrCol, linkREGCol, linkInmueblesCol, tiempoInicio) {
  var filasExitosas = 0;
  var filasConError = [];
  var ultimaFilaProcesada = filaInicio - 1;
  
  Logger.log(`📋 Procesando desde fila ${filaInicio} hasta ${lastRow}...\n`);
  
  for (var row = filaInicio; row <= lastRow; row++) {
    // Verificar tiempo
    var tiempoTranscurrido = new Date().getTime() - tiempoInicio;
    if (tiempoTranscurrido >= CONFIG_CONECTAR.TIEMPO_LIMITE_MS) {
      Logger.log(`\n⏰ Límite de tiempo alcanzado (${tiempoTranscurrido / 1000}s)`);
      return {
        necesitaContinuar: true,
        filasExitosas: filasExitosas,
        filasConError: filasConError,
        ultimaFilaProcesada: ultimaFilaProcesada,
        lastRow: lastRow
      };
    }
    
    var cdr = sheet.getRange(row, cdrCol).getValue();
    
    if (!cdr) {
      Logger.log(`⚠️ Fila ${row}: Sin CDR, omitiendo`);
      ultimaFilaProcesada = row;
      continue;
    }
    
    Logger.log(`🔍 [Fila ${row}] Procesando: ${cdr}`);
    
    var resultado = procesarFilaREG(sheet, row, cdr, carpetaPadre, linkREGCol, linkInmueblesCol);
    
    if (resultado.exito) {
      filasExitosas++;
      Logger.log(`✅ [Fila ${row}] Completado exitosamente\n`);
    } else {
      filasConError.push({
        fila: row,
        cdr: cdr,
        error: resultado.error
      });
      Logger.log(`❌ [Fila ${row}] Error: ${resultado.error}\n`);
    }
    
    ultimaFilaProcesada = row;
  }
  
  // Todas las filas procesadas
  return {
    necesitaContinuar: false,
    filasExitosas: filasExitosas,
    filasConError: filasConError,
    ultimaFilaProcesada: ultimaFilaProcesada,
    lastRow: lastRow
  };
}

// ==========================================
// PROCESAR FILA INDIVIDUAL
// ==========================================

function procesarFilaREG(sheet, row, cdr, carpetaPadre, linkREGCol, linkInmueblesCol) {
  try {
    // 1. Extraer tipo de negocio del CDR
    var tipoNegocioCode = extraerTipoNegocioDeCDR(cdr);
    if (!tipoNegocioCode) {
      return { exito: false, error: 'No se pudo extraer tipo de negocio del CDR' };
    }
    
    Logger.log(`   Tipo de negocio: ${tipoNegocioCode}`);
    
    // 2. Determinar carpeta de tipo de negocio
    var carpetaNegocio = determinarCarpetaNegocioPorCodigo(tipoNegocioCode);
    Logger.log(`   Carpeta de negocio: ${carpetaNegocio}`);
    
    // 3. Buscar RPR que contenga el REG
    var resultadoBusqueda = buscarREGEnRPRs(carpetaPadre, cdr, carpetaNegocio);
    
    if (!resultadoBusqueda.encontrado) {
      return { exito: false, error: resultadoBusqueda.error };
    }
    
    Logger.log(`   ✓ REG encontrado en: ${resultadoBusqueda.rprNombre}`);
    
    // 4. Insertar link de REG
    var codigoCorto = extraerCodigoCortoREG(cdr);
    var regUrl = `https://drive.google.com/drive/folders/${resultadoBusqueda.regFolder.getId()}`;
    var formulaREG = `=HYPERLINK("${regUrl}";"${codigoCorto}")`;
    
    sheet.getRange(row, linkREGCol).setFormula(formulaREG);
    Logger.log(`   ✓ Link REG insertado: ${codigoCorto}`);
    
    // 5. Insertar link de INMUEBLES
    var inmueblesUrl = `https://drive.google.com/drive/folders/${resultadoBusqueda.inmueblesFolder.getId()}`;
    var formulaInmuebles = `=HYPERLINK("${inmueblesUrl}";"INMUEBLES")`;
    
    sheet.getRange(row, linkInmueblesCol).setFormula(formulaInmuebles);
    Logger.log(`   ✓ Link INMUEBLES insertado`);
    
    return { exito: true };
    
  } catch (e) {
    return { exito: false, error: e.message };
  }
}

// ==========================================
// GUARDAR PROGRESO
// ==========================================

function guardarProgreso(resultado) {
  var props = PropertiesService.getScriptProperties();
  
  var progreso = {
    ultimaFilaProcesada: resultado.ultimaFilaProcesada,
    lastRow: resultado.lastRow,
    filasExitosas: resultado.filasExitosas,
    filasConError: resultado.filasConError,
    timestamp: new Date().getTime()
  };
  
  props.setProperty('CONECTAR_REG_PROGRESO', JSON.stringify(progreso));
  Logger.log('💾 Progreso guardado');
}

// ==========================================
// MOSTRAR RESUMEN FINAL
// ==========================================

function mostrarResumenFinal(resultado, tiempoInicio) {
  var tiempoTotal = (new Date().getTime() - tiempoInicio) / 1000;
  
  Logger.log('\n🔵 ═══════════════════════════════════════════════════');
  Logger.log('📊 RESUMEN FINAL DEL PROCESO');
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  Logger.log(`📁 Total filas procesadas: ${resultado.ultimaFilaProcesada - 1}`);
  Logger.log(`✅ Exitosas: ${resultado.filasExitosas}`);
  Logger.log(`❌ Con errores: ${resultado.filasConError.length}`);
  Logger.log(`⏱️ Tiempo total: ${tiempoTotal} segundos`);
  
  if (resultado.filasConError.length > 0) {
    Logger.log('\n⚠️ DETALLE DE ERRORES:');
    Logger.log('═══════════════════════════════════════════════════');
    resultado.filasConError.forEach(function(item) {
      Logger.log(`Fila ${item.fila}: ${item.cdr}`);
      Logger.log(`   Error: ${item.error}`);
    });
  }
  
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  Logger.log('✅ PROCESO COMPLETADO');
  Logger.log('🔵 ═══════════════════════════════════════════════════');
}

// ==========================================
// FUNCIONES AUXILIARES (Continuación en comentario siguiente)
// ==========================================
// ==========================================
// FUNCIONES AUXILIARES - PARTE 1
// (Agregar al final del archivo anterior)
// ==========================================

// ==========================================
// BUSCAR REG EN TODAS LAS CARPETAS RPR
// ==========================================

function buscarREGEnRPRs(carpetaPadre, cdr, carpetaNegocio) {
  var rprs = carpetaPadre.getFolders();
  
  while (rprs.hasNext()) {
    var rprFolder = rprs.next();
    var rprNombre = rprFolder.getName();
    
    // Solo procesar carpetas con formato /RPR-XX-XXXX
    if (!/\/RPR-\d+-\d{4}$/.test(rprNombre)) {
      continue;
    }
    
    // Buscar INMUEBLES en este RPR
    var inmueblesFolder = getFolderByName(rprFolder, 'INMUEBLES');
    if (!inmueblesFolder) {
      continue;
    }
    
    // Buscar carpeta de tipo de negocio
    var tipoNegocioFolder = getFolderByName(inmueblesFolder, carpetaNegocio);
    if (!tipoNegocioFolder) {
      continue;
    }
    
    // Buscar carpeta REG con nombre exacto
    var regFolder = getFolderByName(tipoNegocioFolder, cdr);
    if (regFolder) {
      // Validar que tenga jerarquía mínima
      if (validarJerarquiaREG(regFolder)) {
        return {
          encontrado: true,
          regFolder: regFolder,
          inmueblesFolder: inmueblesFolder,
          rprFolder: rprFolder,
          rprNombre: rprNombre
        };
      }
    }
  }
  
  return {
    encontrado: false,
    error: `No se encontró REG "${cdr}" en ningún RPR con formato correcto o sin jerarquía válida`
  };
}

// ==========================================
// VALIDAR JERARQUÍA DEL REG
// ==========================================

function validarJerarquiaREG(regFolder) {
  // Validar que existan carpetas principales
  var archivosFolder = getFolderByName(regFolder, 'ARCHIVOS DEL INMUEBLE');
  var entregasFolder = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
  
  return (archivosFolder !== null && entregasFolder !== null);
}

// ==========================================
// EXTRAER TIPO DE NEGOCIO DEL CDR
// ==========================================

function extraerTipoNegocioDeCDR(cdr) {
  // Patrón: REG_DD-MM-YYYY-XXX_(...)
  var match = cdr.match(/REG_\d{2}-\d{2}-\d{4}-([A-Z]{1,2})\d+/);
  return match ? match[1] : null;
}

// ==========================================
// DETERMINAR CARPETA DE NEGOCIO POR CÓDIGO
// ==========================================

function determinarCarpetaNegocioPorCodigo(codigo) {
  switch (codigo) {
    case 'A':
    case 'C':
      return 'ARRIENDO';
    case 'V':
      return 'VENTA';
    case 'AV':
    case 'VR':
      return 'BI-NEGOCIO';
    default:
      return 'ARRIENDO';
  }
}

// ==========================================
// EXTRAER CÓDIGO CORTO DEL REG
// ==========================================

function extraerCodigoCortoREG(cdrCompleto) {
  // De: REG_10-12-2025-C37_(CRA 8)_APTO-3
  // A: REG-C37
  var match = cdrCompleto.match(/REG_\d{2}-\d{2}-\d{4}-([A-Z]{1,2}\d+)/);
  if (match && match[1]) {
    return `REG-${match[1]}`;
  }
  return cdrCompleto;
}

// ==========================================
// FUNCIONES AUXILIARES BÁSICAS
// ==========================================

function getColumnByName(sheet, columnName) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var col = 0; col < headers.length; col++) {
    if (headers[col].toString().trim() === columnName.trim()) {
      return col + 1;
    }
  }
  return null;
}

function getFolderByName(parentFolder, folderName) {
  var folderIterator = parentFolder.getFoldersByName(folderName);
  return folderIterator.hasNext() ? folderIterator.next() : null;
}

// ==========================================
// FIN DEL ARCHIVO 1
// ==========================================

Logger.log('📄 CONECTAR REG - Parte 1 cargado correctamente - v2.0');