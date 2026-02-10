// ==========================================
// CONECTAR REG - PARTE 2
// Continuación automática del proceso
// Versión: v2.0
// ==========================================

const CONFIG_CONECTAR_P2 = {
  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  CARPETA_PADRE_ID: '1mBbFORjuddMN8nwU1zY27_wLa9iZWfvX',
  VERSION: 'v2.0',
  TIEMPO_LIMITE_MS: 300000, // 5 minutos
  TIEMPO_ESPERA_REINICIO: 10000 // 10 segundos
};

// ==========================================
// FUNCIÓN PRINCIPAL - CONTINUACIÓN
// ==========================================

function continuarConectarREGsParte2() {
  var tiempoInicio = new Date().getTime();
  Logger.log('🟢 ═══════════════════════════════════════════════════');
  Logger.log('🟢 CONECTAR REGs - PARTE 2 - CONTINUACIÓN');
  Logger.log('🟢 ═══════════════════════════════════════════════════');
  
  try {
    // 1. Recuperar progreso guardado
    var props = PropertiesService.getScriptProperties();
    var progresoStr = props.getProperty('CONECTAR_REG_PROGRESO');
    
    if (!progresoStr) {
      Logger.log('⚠️ No hay progreso guardado para continuar');
      eliminarTrigger('continuarConectarREGsParte2');
      return;
    }
    
    var progreso = JSON.parse(progresoStr);
    Logger.log(`📍 Continuando desde fila: ${progreso.ultimaFilaProcesada + 1}`);
    Logger.log(`📊 Progreso anterior: ${progreso.filasExitosas} exitosas, ${progreso.filasConError.length} errores\n`);
    
    // 2. Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_CONECTAR_P2.HOJA_PRINCIPAL);
    
    if (!sheet) {
      throw new Error('No se encontró la hoja');
    }
    
    // 3. Obtener columnas
    var cdrCol = getColumnByName(sheet, 'CODIGO DE REGISTRO');
    var linkREGCol = getColumnByName(sheet, 'LINK DE CARPETA REG');
    var linkInmueblesCol = getColumnByName(sheet, 'INMUEBLES REGISTRADOS');
    
    // 4. Obtener carpeta padre
    var carpetaPadre = DriveApp.getFolderById(CONFIG_CONECTAR_P2.CARPETA_PADRE_ID);
    
    // 5. Continuar procesamiento
    var filaInicio = progreso.ultimaFilaProcesada + 1;
    var lastRow = progreso.lastRow;
    
    var resultado = procesarFilasConLimiteP2(
      sheet,
      filaInicio,
      lastRow,
      carpetaPadre,
      cdrCol,
      linkREGCol,
      linkInmueblesCol,
      tiempoInicio,
      progreso
    );
    
    // 6. Decidir si continuar o finalizar
    if (resultado.necesitaContinuar) {
      Logger.log('\n⏰ Límite de tiempo alcanzado nuevamente');
      Logger.log(`📊 Total acumulado: ${resultado.filasExitosas} exitosas, ${resultado.filasConError.length} errores`);
      Logger.log(`📍 Última fila procesada: ${resultado.ultimaFilaProcesada}`);
      
      // Actualizar progreso
      actualizarProgreso(resultado);
      
      // Relanzar PARTE 2
      Logger.log('⏳ Relanzando Parte 2 en 10 segundos...');
      ScriptApp.newTrigger('continuarConectarREGsParte2')
        .timeBased()
        .after(CONFIG_CONECTAR_P2.TIEMPO_ESPERA_REINICIO)
        .create();
      
      Logger.log('🟢 ═══════════════════════════════════════════════════');
      Logger.log('⏸️ PARTE 2 - PAUSADO - Se relanzará automáticamente');
      Logger.log('🟢 ═══════════════════════════════════════════════════');
    } else {
      // Proceso completado
      var tiempoTotalProceso = (new Date().getTime() - progreso.timestamp) / 1000;
      mostrarResumenFinalP2(resultado, tiempoTotalProceso);
      
      // Limpiar progreso y triggers
      limpiarProcesoCompleto();
    }
    
  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO en Parte 2: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);
    limpiarProcesoCompleto();
  }
}

// ==========================================
// PROCESAR FILAS CON LÍMITE (PARTE 2)
// ==========================================

function procesarFilasConLimiteP2(sheet, filaInicio, lastRow, carpetaPadre, cdrCol, linkREGCol, linkInmueblesCol, tiempoInicio, progresoAnterior) {
  var filasExitosas = progresoAnterior.filasExitosas;
  var filasConError = progresoAnterior.filasConError;
  var ultimaFilaProcesada = filaInicio - 1;
  
  Logger.log(`📋 Procesando desde fila ${filaInicio} hasta ${lastRow}...\n`);
  
  for (var row = filaInicio; row <= lastRow; row++) {
    // Verificar tiempo
    var tiempoTranscurrido = new Date().getTime() - tiempoInicio;
    if (tiempoTranscurrido >= CONFIG_CONECTAR_P2.TIEMPO_LIMITE_MS) {
      Logger.log(`\n⏰ Límite de tiempo alcanzado (${tiempoTranscurrido / 1000}s)`);
      return {
        necesitaContinuar: true,
        filasExitosas: filasExitosas,
        filasConError: filasConError,
        ultimaFilaProcesada: ultimaFilaProcesada,
        lastRow: lastRow,
        timestamp: progresoAnterior.timestamp
      };
    }
    
    var cdr = sheet.getRange(row, cdrCol).getValue();
    
    if (!cdr) {
      Logger.log(`⚠️ Fila ${row}: Sin CDR, omitiendo`);
      ultimaFilaProcesada = row;
      continue;
    }
    
    Logger.log(`🔍 [Fila ${row}] Procesando: ${cdr}`);
    
    var resultado = procesarFilaREGP2(sheet, row, cdr, carpetaPadre, linkREGCol, linkInmueblesCol);
    
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
    lastRow: lastRow,
    timestamp: progresoAnterior.timestamp
  };
}

// ==========================================
// PROCESAR FILA (PARTE 2)
// ==========================================

function procesarFilaREGP2(sheet, row, cdr, carpetaPadre, linkREGCol, linkInmueblesCol) {
  try {
    var tipoNegocioCode = extraerTipoNegocioDeCDRP2(cdr);
    if (!tipoNegocioCode) {
      return { exito: false, error: 'No se pudo extraer tipo de negocio del CDR' };
    }
    
    Logger.log(`   Tipo de negocio: ${tipoNegocioCode}`);
    
    var carpetaNegocio = determinarCarpetaNegocioPorCodigoP2(tipoNegocioCode);
    Logger.log(`   Carpeta de negocio: ${carpetaNegocio}`);
    
    var resultadoBusqueda = buscarREGEnRPRsP2(carpetaPadre, cdr, carpetaNegocio);
    
    if (!resultadoBusqueda.encontrado) {
      return { exito: false, error: resultadoBusqueda.error };
    }
    
    Logger.log(`   ✓ REG encontrado en: ${resultadoBusqueda.rprNombre}`);
    
    var codigoCorto = extraerCodigoCortoREGP2(cdr);
    var regUrl = `https://drive.google.com/drive/folders/${resultadoBusqueda.regFolder.getId()}`;
    var formulaREG = `=HYPERLINK("${regUrl}";"${codigoCorto}")`;
    
    sheet.getRange(row, linkREGCol).setFormula(formulaREG);
    Logger.log(`   ✓ Link REG insertado: ${codigoCorto}`);
    
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
// ACTUALIZAR PROGRESO
// ==========================================

function actualizarProgreso(resultado) {
  var props = PropertiesService.getScriptProperties();
  
  var progreso = {
    ultimaFilaProcesada: resultado.ultimaFilaProcesada,
    lastRow: resultado.lastRow,
    filasExitosas: resultado.filasExitosas,
    filasConError: resultado.filasConError,
    timestamp: resultado.timestamp
  };
  
  props.setProperty('CONECTAR_REG_PROGRESO', JSON.stringify(progreso));
  Logger.log('💾 Progreso actualizado');
}

// ==========================================
// MOSTRAR RESUMEN FINAL (PARTE 2)
// ==========================================

function mostrarResumenFinalP2(resultado, tiempoTotal) {
  Logger.log('\n🟢 ═══════════════════════════════════════════════════');
  Logger.log('📊 RESUMEN FINAL DEL PROCESO COMPLETO');
  Logger.log('🟢 ═══════════════════════════════════════════════════');
  Logger.log(`📁 Total filas procesadas: ${resultado.ultimaFilaProcesada - 1}`);
  Logger.log(`✅ Exitosas: ${resultado.filasExitosas}`);
  Logger.log(`❌ Con errores: ${resultado.filasConError.length}`);
  Logger.log(`⏱️ Tiempo total del proceso: ${tiempoTotal} segundos`);
  
  if (resultado.filasConError.length > 0) {
    Logger.log('\n⚠️ DETALLE DE ERRORES:');
    Logger.log('═══════════════════════════════════════════════════');
    resultado.filasConError.forEach(function(item) {
      Logger.log(`Fila ${item.fila}: ${item.cdr}`);
      Logger.log(`   Error: ${item.error}`);
    });
  }
  
  Logger.log('🟢 ═══════════════════════════════════════════════════');
  Logger.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
  Logger.log('🟢 ═══════════════════════════════════════════════════');
}

// ==========================================
// LIMPIAR PROCESO COMPLETO
// ==========================================

function limpiarProcesoCompleto() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('CONECTAR_REG_PROGRESO');
  props.deleteProperty('CONECTAR_REG_ERRORES');
  
  eliminarTrigger('continuarConectarREGsParte2');
  
  Logger.log('🧹 Progreso limpiado y triggers eliminados');
}

// ==========================================
// ELIMINAR TRIGGERS
// ==========================================

function eliminarTrigger(nombreFuncion) {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var eliminados = 0;
    
    triggers.forEach(function(trigger) {
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
// FUNCIONES AUXILIARES (Reutilizadas)
// ==========================================

function buscarREGEnRPRsP2(carpetaPadre, cdr, carpetaNegocio) {
  var rprs = carpetaPadre.getFolders();
  
  while (rprs.hasNext()) {
    var rprFolder = rprs.next();
    var rprNombre = rprFolder.getName();
    
    if (!/\/RPR-\d+-\d{4}$/.test(rprNombre)) {
      continue;
    }
    
    var inmueblesFolder = getFolderByNameP2(rprFolder, 'INMUEBLES');
    if (!inmueblesFolder) continue;
    
    var tipoNegocioFolder = getFolderByNameP2(inmueblesFolder, carpetaNegocio);
    if (!tipoNegocioFolder) continue;
    
    var regFolder = getFolderByNameP2(tipoNegocioFolder, cdr);
    if (regFolder && validarJerarquiaREGP2(regFolder)) {
      return {
        encontrado: true,
        regFolder: regFolder,
        inmueblesFolder: inmueblesFolder,
        rprFolder: rprFolder,
        rprNombre: rprNombre
      };
    }
  }
  
  return {
    encontrado: false,
    error: `No se encontró REG "${cdr}" con jerarquía válida`
  };
}

function validarJerarquiaREGP2(regFolder) {
  var archivosFolder = getFolderByNameP2(regFolder, 'ARCHIVOS DEL INMUEBLE');
  var entregasFolder = getFolderByNameP2(regFolder, 'ENTREGAS DEL INMUEBLE');
  return (archivosFolder !== null && entregasFolder !== null);
}

function extraerTipoNegocioDeCDRP2(cdr) {
  var match = cdr.match(/REG_\d{2}-\d{2}-\d{4}-([A-Z]{1,2})\d+/);
  return match ? match[1] : null;
}

function determinarCarpetaNegocioPorCodigoP2(codigo) {
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

function extraerCodigoCortoREGP2(cdrCompleto) {
  var match = cdrCompleto.match(/REG_\d{2}-\d{2}-\d{4}-([A-Z]{1,2}\d+)/);
  return match && match[1] ? `REG-${match[1]}` : cdrCompleto;
}

function getColumnByName(sheet, columnName) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var col = 0; col < headers.length; col++) {
    if (headers[col].toString().trim() === columnName.trim()) {
      return col + 1;
    }
  }
  return null;
}

function getFolderByNameP2(parentFolder, folderName) {
  var folderIterator = parentFolder.getFoldersByName(folderName);
  return folderIterator.hasNext() ? folderIterator.next() : null;
}

// ==========================================
// FIN DEL ARCHIVO 2
// ==========================================

Logger.log('📄 CONECTAR REG - Parte 2 cargado correctamente - v2.0');