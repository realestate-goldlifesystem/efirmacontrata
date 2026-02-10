// ==========================================
// VERIFICACIÓN DE JERARQUÍA RPR - PARTE 2
// Continuación automática del proceso
// Versión: v2.2-fixed-triggers
// ==========================================

const CONFIG_VERIFICACION_P2 = {
  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  PLANTILLA_MAESTRA_ID: '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH',
  PARENT_FOLDER_ID: '1mBbFORjuddMN8nwU1zY27_wLa9iZWfvX',
  VERSION: 'v2.2-fixed-triggers',
  TIEMPO_LIMITE_MS: 180000, // ← 3 minutos
  TIEMPO_ESPERA_REINICIO: 1000 // ← 1 segundo
};

// ==========================================
// FUNCIÓN PRINCIPAL - CONTINUACIÓN
// ==========================================

function continuarVerificacionRPRsParte2() {
  var tiempoInicio = new Date().getTime();
  Logger.log('🟢 ═══════════════════════════════════════════════════');
  Logger.log('🟢 VERIFICACIÓN DE RPRs - PARTE 2 - CONTINUACIÓN');
  Logger.log('🟢 ═══════════════════════════════════════════════════');
  
  try {
    // 1. Recuperar progreso guardado
    var props = PropertiesService.getScriptProperties();
    var progresoStr = props.getProperty('VERIFICACION_RPR_PROGRESO');
    
    if (!progresoStr) {
      Logger.log('⚠️ No hay progreso guardado para continuar');
      eliminarTriggerP2('continuarVerificacionRPRsParte2');
      return;
    }
    
    var progreso = JSON.parse(progresoStr);
    Logger.log(`📍 Continuando desde índice: ${progreso.indiceInicio}`);
    Logger.log(`📊 Progreso anterior: ${progreso.rprsCompletados} completados, ${progreso.rprsConError.length} errores`);
    Logger.log(`📋 RPRs restantes: ${progreso.rprsRestantes.length}\n`);
    
    // 2. Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_VERIFICACION_P2.HOJA_PRINCIPAL);
    
    if (!sheet) {
      throw new Error('No se encontró la hoja: ' + CONFIG_VERIFICACION_P2.HOJA_PRINCIPAL);
    }
    
    // 3. Obtener PLANTILLA #1 maestra
    Logger.log('📂 Accediendo a PLANTILLA #1 maestra...');
    var plantillaMaestra = DriveApp.getFolderById(CONFIG_VERIFICACION_P2.PLANTILLA_MAESTRA_ID);
    Logger.log('✅ PLANTILLA #1 maestra accedida');
    
    // 4. Obtener PLANTILLA #2
    var plantilla2 = obtenerPlantilla2P2(plantillaMaestra);
    if (!plantilla2) {
      throw new Error('No se pudo obtener PLANTILLA #2 de referencia');
    }
    Logger.log('✅ PLANTILLA #2 obtenida como referencia\n');
    
    // 5. Reconstruir lista de RPRs desde IDs guardados
    var rprsParaProcesar = reconstruirRPRsDesdeProgreso(progreso);
    
    if (rprsParaProcesar.length === 0) {
      Logger.log('⚠️ No hay RPRs para procesar');
      limpiarProcesoCompleto();
      return;
    }
    
    // 6. Procesar RPRs con límite de 3 minutos
    var resultado = procesarRPRsParte2(
      rprsParaProcesar,
      plantillaMaestra,
      plantilla2,
      sheet,
      progreso,
      tiempoInicio
    );
    
    // 7. Decidir si continuar o finalizar
    if (resultado.necesitaContinuar) {
      Logger.log('\n⏰ Límite de 3 minutos alcanzado');
      Logger.log(`📊 Total acumulado: ${resultado.rprsCompletados} completados, ${resultado.rprsConError.length} errores`);
      Logger.log(`📍 Último índice procesado: ${resultado.indiceUltimoProcesado}`);
      Logger.log(`📋 RPRs restantes: ${resultado.rprsRestantes.length}`);
      
      actualizarProgreso(resultado, progreso.timestamp);
      
      // ✅ IMPORTANTE: Eliminar triggers antiguos ANTES de crear uno nuevo
      Logger.log('🧹 Eliminando triggers antiguos antes de crear uno nuevo...');
      eliminarTriggerP2('continuarVerificacionRPRsParte2');
      
      Logger.log('⏳ Creando nuevo trigger para PARTE 2 en 1 segundo...');
      ScriptApp.newTrigger('continuarVerificacionRPRsParte2')
        .timeBased()
        .after(CONFIG_VERIFICACION_P2.TIEMPO_ESPERA_REINICIO)
        .create();
      
      Logger.log('🟢 ═══════════════════════════════════════════════════');
      Logger.log('⏸️ PARTE 2 - PAUSADO - Se relanzará automáticamente');
      Logger.log('🟢 ═══════════════════════════════════════════════════');
    } else {
      var tiempoTotalProceso = (new Date().getTime() - progreso.timestamp) / 1000;
      mostrarResumenFinalP2(resultado, tiempoTotalProceso);
      limpiarProcesoCompleto();
    }
    
  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO en Parte 2: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);
    
    // Limpiar triggers en caso de error
    Logger.log('🧹 Limpiando triggers por error...');
    eliminarTriggerP2('continuarVerificacionRPRsParte2');
    limpiarProcesoCompleto();
  }
}

// ==========================================
// OBTENER PLANTILLA #2 (PARTE 2)
// ==========================================

function obtenerPlantilla2P2(plantillaMaestra) {
  try {
    var inmueblesPlantilla = getFolderByNameP2(plantillaMaestra, 'INMUEBLES');
    if (!inmueblesPlantilla) return null;
    
    var arriendoPlantilla = getFolderByNameP2(inmueblesPlantilla, 'ARRIENDO');
    if (!arriendoPlantilla) return null;
    
    var plantilla2 = getFolderByNameP2(arriendoPlantilla, 'PLANTILLA #2');
    return plantilla2;
  } catch (e) {
    Logger.log(`⚠️ Error al obtener PLANTILLA #2: ${e.message}`);
    return null;
  }
}

// ==========================================
// RECONSTRUIR RPRs DESDE PROGRESO
// ==========================================

function reconstruirRPRsDesdeProgreso(progreso) {
  var rprs = [];
  
  try {
    // Reconstruir objetos RPR desde los IDs guardados
    progreso.rprsRestantes.forEach(function(rprData) {
      try {
        var folder = DriveApp.getFolderById(rprData.id);
        rprs.push({
          folder: folder,
          nombre: rprData.nombre,
          id: rprData.id
        });
      } catch (e) {
        Logger.log(`⚠️ No se pudo acceder al RPR: ${rprData.nombre} (${e.message})`);
      }
    });
  } catch (e) {
    Logger.log(`⚠️ Error al reconstruir RPRs: ${e.message}`);
  }
  
  return rprs;
}

// ==========================================
// PROCESAR RPRs - PARTE 2 (CON LÍMITE DE 3 MINUTOS)
// ==========================================

function procesarRPRsParte2(rprsParaProcesar, plantillaMaestra, plantilla2, sheet, progresoAnterior, tiempoInicio) {
  var rprsCompletados = progresoAnterior.rprsCompletados;
  var rprsConError = progresoAnterior.rprsConError;
  var indiceGlobalActual = progresoAnterior.indiceInicio;
  var totalRPRs = progresoAnterior.totalRPRs;
  
  Logger.log('📋 Continuando procesamiento de RPRs...\n');
  
  for (var i = 0; i < rprsParaProcesar.length; i++) {
    // Verificar tiempo transcurrido
    var tiempoTranscurrido = new Date().getTime() - tiempoInicio;
    if (tiempoTranscurrido >= CONFIG_VERIFICACION_P2.TIEMPO_LIMITE_MS) {
      Logger.log(`\n⏰ Límite de 3 minutos alcanzado (${tiempoTranscurrido / 1000}s)`);
      
      // Calcular RPRs restantes
      var rprsRestantes = [];
      for (var j = i; j < rprsParaProcesar.length; j++) {
        rprsRestantes.push({
          nombre: rprsParaProcesar[j].nombre,
          id: rprsParaProcesar[j].id
        });
      }
      
      return {
        necesitaContinuar: true,
        rprsCompletados: rprsCompletados,
        rprsConError: rprsConError,
        indiceUltimoProcesado: indiceGlobalActual - 1,
        rprsRestantes: rprsRestantes,
        totalRPRs: totalRPRs
      };
    }
    
    var rpr = rprsParaProcesar[i];
    
    Logger.log(`🔍 [${indiceGlobalActual + 1}/${totalRPRs}] Validando RPR: ${rpr.nombre}`);
    Logger.log('─────────────────────────────────────────────────────');
    
    var resultado = validarRPRCompletoP2(rpr.folder, plantillaMaestra, plantilla2, sheet);
    
    if (resultado.exito) {
      rprsCompletados++;
      Logger.log(`✅ [${indiceGlobalActual + 1}/${totalRPRs}] RPR validado completamente`);
      Logger.log(`📊 Resumen: ${resultado.carpetasCreadas} carpetas creadas, ${resultado.archivosCopiados} archivos copiados, ${resultado.elementosRespetados} elementos respetados`);
      Logger.log(`🔗 Links insertados: ${resultado.linksInsertados}\n`);
    } else {
      rprsConError.push({
        nombre: rpr.nombre,
        error: resultado.error,
        detalles: resultado.detalles || []
      });
      Logger.log(`❌ [${indiceGlobalActual + 1}/${totalRPRs}] Error: ${resultado.error}\n`);
    }
    
    indiceGlobalActual++;
    
    // Log de tiempo cada 3 RPRs
    if ((i + 1) % 3 === 0) {
      var tiempoActual = (new Date().getTime() - tiempoInicio) / 1000;
      Logger.log(`⏱️ Tiempo transcurrido: ${tiempoActual} segundos\n`);
    }
  }
  
  // Todos los RPRs fueron procesados
  return {
    necesitaContinuar: false,
    rprsCompletados: rprsCompletados,
    rprsConError: rprsConError,
    indiceUltimoProcesado: indiceGlobalActual - 1,
    rprsRestantes: [],
    totalRPRs: totalRPRs
  };
}

// ==========================================
// VALIDAR RPR COMPLETO (PARTE 2)
// ==========================================

function validarRPRCompletoP2(rprFolder, plantillaMaestra, plantilla2, sheet) {
  var errores = [];
  var contadores = {
    carpetasCreadas: 0,
    archivosCopiados: 0,
    elementosRespetados: 0,
    linksInsertados: 0
  };
  
  try {
    // 1. Validar rama: DOCUMENTOS DEL PROPIETARIO
    Logger.log('   📂 Validando: DOCUMENTOS DEL PROPIETARIO');
    var docsPropietarioPlantilla = getFolderByNameP2(plantillaMaestra, 'DOCUMENTOS DEL PROPIETARIO');
    
    if (docsPropietarioPlantilla) {
      var docsPropietarioRPR = getFolderByNameP2(rprFolder, 'DOCUMENTOS DEL PROPIETARIO');
      
      if (!docsPropietarioRPR) {
        docsPropietarioRPR = rprFolder.createFolder('DOCUMENTOS DEL PROPIETARIO');
        contadores.carpetasCreadas++;
        Logger.log('      📁 Carpeta creada: DOCUMENTOS DEL PROPIETARIO');
      } else {
        contadores.elementosRespetados++;
        Logger.log('      ↔️ Carpeta ya existe: DOCUMENTOS DEL PROPIETARIO (respetada)');
      }
      
      sincronizarConPlantillaP2(docsPropietarioRPR, docsPropietarioPlantilla, true, errores, contadores);
      Logger.log('      ✓ DOCUMENTOS DEL PROPIETARIO sincronizado');
    }
    
    // 2. Validar rama: INMUEBLES
    Logger.log('   📂 Validando: INMUEBLES');
    var inmueblesRPR = getFolderByNameP2(rprFolder, 'INMUEBLES');
    
    if (!inmueblesRPR) {
      inmueblesRPR = rprFolder.createFolder('INMUEBLES');
      contadores.carpetasCreadas++;
      Logger.log('      📁 Carpeta creada: INMUEBLES');
    } else {
      contadores.elementosRespetados++;
      Logger.log('      ↔️ Carpeta ya existe: INMUEBLES (respetada)');
    }
    
    // 2.1 Validar cada tipo de negocio
    var tiposNegocio = ['ARRIENDO', 'VENTA', 'BI-NEGOCIO'];
    
    tiposNegocio.forEach(function(tipoNegocio) {
      Logger.log(`   📂 Validando tipo de negocio: ${tipoNegocio}`);
      
      var carpetaTipoNegocio = getFolderByNameP2(inmueblesRPR, tipoNegocio);
      
      if (!carpetaTipoNegocio) {
        carpetaTipoNegocio = inmueblesRPR.createFolder(tipoNegocio);
        contadores.carpetasCreadas++;
        Logger.log(`      📁 Carpeta creada: ${tipoNegocio}`);
      } else {
        contadores.elementosRespetados++;
        Logger.log(`      ↔️ Carpeta ya existe: ${tipoNegocio} (respetada)`);
      }
      
      // 2.2 Validar todos los REGs dentro de este tipo de negocio
      validarTodosLosREGsDentroDeP2(carpetaTipoNegocio, plantilla2, errores, contadores, sheet);
    });
    
    Logger.log('      ✓ INMUEBLES sincronizado completamente');
    
    if (errores.length > 0) {
      return {
        exito: false,
        error: 'Errores durante la sincronización',
        detalles: errores,
        carpetasCreadas: contadores.carpetasCreadas,
        archivosCopiados: contadores.archivosCopiados,
        elementosRespetados: contadores.elementosRespetados,
        linksInsertados: contadores.linksInsertados
      };
    }
    
    return {
      exito: true,
      carpetasCreadas: contadores.carpetasCreadas,
      archivosCopiados: contadores.archivosCopiados,
      elementosRespetados: contadores.elementosRespetados,
      linksInsertados: contadores.linksInsertados
    };
    
  } catch (e) {
    return {
      exito: false,
      error: e.message,
      detalles: errores,
      carpetasCreadas: contadores.carpetasCreadas,
      archivosCopiados: contadores.archivosCopiados,
      elementosRespetados: contadores.elementosRespetados,
      linksInsertados: contadores.linksInsertados
    };
  }
}
// ==========================================
// VERIFICACIÓN DE JERARQUÍA RPR - PARTE 2/3
// Continuación - Validación de REGs e inserción de links
// Líneas 301-600
// ==========================================

// ==========================================
// VALIDAR TODOS LOS REGs DENTRO DE UN TIPO DE NEGOCIO (PARTE 2)
// ==========================================

function validarTodosLosREGsDentroDeP2(carpetaTipoNegocio, plantilla2, errores, contadores, sheet) {
  // 1. Obtener TODOS los REG dentro de esta carpeta
  var carpetasREG = obtenerTodasLasCarpetasREGP2(carpetaTipoNegocio);
  
  if (carpetasREG.length === 0) {
    Logger.log('      ℹ️ No se encontraron REGs en esta carpeta');
    return;
  }
  
  Logger.log(`      📊 Total de REGs encontrados: ${carpetasREG.length}`);
  
  // 2. Para cada REG encontrado, validar su estructura
  carpetasREG.forEach(function(regFolder, index) {
    Logger.log(`      🏠 [${index + 1}/${carpetasREG.length}] Validando REG: ${regFolder.getName()}`);
    
    // 2.1 Validar ARCHIVOS DEL INMUEBLE
    validarArchivosDelInmuebleP2(regFolder, plantilla2, errores, contadores);
    
    // 2.2 Validar ENTREGAS DEL INMUEBLE (con lógica especial de año)
    validarEntregasDelInmuebleP2(regFolder, plantilla2, errores, contadores);
    
    // 2.3 ✅ Insertar links en la hoja
    insertarLinksDelREGP2(sheet, regFolder, contadores);
    
    Logger.log(`      ✓ REG validado: ${regFolder.getName()}`);
  });
}

// ==========================================
// OBTENER TODAS LAS CARPETAS REG (PARTE 2)
// ==========================================

function obtenerTodasLasCarpetasREGP2(carpetaTipoNegocio) {
  var carpetasREG = [];
  var folders = carpetaTipoNegocio.getFolders();
  
  while (folders.hasNext()) {
    var folder = folders.next();
    var nombre = folder.getName();
    
    // Filtrar solo carpetas REG (ignora PLANTILLA #2)
    if (nombre.startsWith('REG_') && nombre !== 'PLANTILLA #2') {
      carpetasREG.push(folder);
    }
  }
  
  return carpetasREG;
}

// ==========================================
// VALIDAR ARCHIVOS DEL INMUEBLE (PARTE 2)
// ==========================================

function validarArchivosDelInmuebleP2(regFolder, plantilla2, errores, contadores) {
  Logger.log('         🔍 Validando: ARCHIVOS DEL INMUEBLE');
  
  // 1. Obtener carpeta de plantilla
  var archivosPlantilla = getFolderByNameP2(plantilla2, 'ARCHIVOS DEL INMUEBLE');
  
  if (!archivosPlantilla) {
    errores.push('No se encontró ARCHIVOS DEL INMUEBLE en PLANTILLA #2');
    Logger.log('         ⚠️ No se encontró ARCHIVOS DEL INMUEBLE en plantilla');
    return;
  }
  
  // 2. Obtener o crear carpeta en REG
  var archivosREG = getFolderByNameP2(regFolder, 'ARCHIVOS DEL INMUEBLE');
  
  if (!archivosREG) {
    archivosREG = regFolder.createFolder('ARCHIVOS DEL INMUEBLE');
    contadores.carpetasCreadas++;
    Logger.log('         📁 Carpeta creada: ARCHIVOS DEL INMUEBLE');
  } else {
    contadores.elementosRespetados++;
    Logger.log('         ↔️ Carpeta ya existe: ARCHIVOS DEL INMUEBLE (respetada)');
  }
  
  // 3. Sincronizar con plantilla
  sincronizarConPlantillaP2(archivosREG, archivosPlantilla, true, errores, contadores, '         ');
  Logger.log('         ✓ ARCHIVOS DEL INMUEBLE sincronizado');
}

// ==========================================
// VALIDAR ENTREGAS DEL INMUEBLE (PARTE 2 - LÓGICA ESPECIAL DE AÑO)
// ==========================================

function validarEntregasDelInmuebleP2(regFolder, plantilla2, errores, contadores) {
  Logger.log('         🔍 Validando: ENTREGAS DEL INMUEBLE');
  
  // 1. Obtener carpeta ENTREGAS de plantilla
  var entregasPlantilla = getFolderByNameP2(plantilla2, 'ENTREGAS DEL INMUEBLE');
  
  if (!entregasPlantilla) {
    errores.push('No se encontró ENTREGAS DEL INMUEBLE en PLANTILLA #2');
    Logger.log('         ⚠️ No se encontró ENTREGAS DEL INMUEBLE en plantilla');
    return;
  }
  
  // 2. Obtener o crear carpeta ENTREGAS en REG
  var entregasREG = getFolderByNameP2(regFolder, 'ENTREGAS DEL INMUEBLE');
  
  if (!entregasREG) {
    entregasREG = regFolder.createFolder('ENTREGAS DEL INMUEBLE');
    contadores.carpetasCreadas++;
    Logger.log('         📁 Carpeta creada: ENTREGAS DEL INMUEBLE');
  } else {
    contadores.elementosRespetados++;
    Logger.log('         ↔️ Carpeta ya existe: ENTREGAS DEL INMUEBLE (respetada)');
  }
  
  // 3. CLAVE: Obtener carpeta de año más reciente (NO crear XXXX hermana)
  var carpetaAnioActual = obtenerOCrearCarpetaAnioP2(entregasREG, contadores);
  
  if (!carpetaAnioActual) {
    errores.push('No se pudo obtener o crear carpeta de año en ENTREGAS DEL INMUEBLE');
    Logger.log('         ⚠️ No se pudo obtener carpeta de año');
    return;
  }
  
  Logger.log(`         📅 Carpeta de año: ${carpetaAnioActual.getName()}`);
  
  // 4. Obtener XXXX de plantilla como REFERENCIA (NO copiarla como hermana)
  var carpetaXXXXPlantilla = getFolderByNameP2(entregasPlantilla, 'XXXX');
  
  if (!carpetaXXXXPlantilla) {
    errores.push('No se encontró carpeta XXXX en PLANTILLA #2/ENTREGAS DEL INMUEBLE');
    Logger.log('         ⚠️ No se encontró XXXX en plantilla');
    return;
  }
  
  // 5. ✅ VALIDAR DENTRO de la carpeta de año contra XXXX plantilla
  Logger.log('         🔍 Validando contenido del año contra XXXX plantilla...');
  sincronizarConPlantillaP2(
    carpetaAnioActual,      // ← DESTINO: dentro del año (ej: 2025/)
    carpetaXXXXPlantilla,   // ← ORIGEN: XXXX de plantilla (como referencia)
    true,                   // ← Copiar archivos también
    errores,
    contadores,
    '            '          // ← Indentación para logs
  );
  
  Logger.log('         ✓ ENTREGAS DEL INMUEBLE sincronizado');
}

// ==========================================
// OBTENER O CREAR CARPETA DE AÑO (PARTE 2)
// ==========================================

function obtenerOCrearCarpetaAnioP2(entregasFolder, contadores) {
  // 1. Buscar carpeta de año más reciente (2025, 2025-2, etc.)
  var carpetaAnioReciente = obtenerCarpetaAnioMasRecienteP2(entregasFolder);
  
  // 2. Si existe, retornarla
  if (carpetaAnioReciente) {
    contadores.elementosRespetados++;
    Logger.log(`         ↔️ Carpeta de año ya existe: ${carpetaAnioReciente.getName()} (respetada)`);
    return carpetaAnioReciente;
  }
  
  // 3. Si NO existe, crear carpeta con año actual
  var anioActual = new Date().getFullYear().toString();
  carpetaAnioReciente = entregasFolder.createFolder(anioActual);
  contadores.carpetasCreadas++;
  Logger.log(`         📁 Carpeta de año creada: ${anioActual}`);
  
  return carpetaAnioReciente;
}

// ==========================================
// OBTENER CARPETA DE AÑO MÁS RECIENTE (PARTE 2)
// ==========================================

function obtenerCarpetaAnioMasRecienteP2(entregasFolder) {
  try {
    var folders = entregasFolder.getFolders();
    var carpetasAnios = [];
    
    while (folders.hasNext()) {
      var folder = folders.next();
      var nombre = folder.getName();
      
      // Filtrar carpetas de año (ignorar XXXX y PLANTILLA #2)
      if (nombre !== 'XXXX' && nombre !== 'PLANTILLA #2' && nombre.match(/^\d{4}(-\d+)?$/)) {
        var match = nombre.match(/^(\d{4})/);
        if (match) {
          var anio = parseInt(match[1], 10);
          carpetasAnios.push({
            folder: folder,
            nombre: nombre,
            anio: anio
          });
        }
      }
    }
    
    if (carpetasAnios.length === 0) {
      return null;
    }
    
    // Ordenar por año descendente y por nombre (para manejar 2025-2, 2025-3, etc.)
    carpetasAnios.sort(function(a, b) {
      if (a.anio !== b.anio) {
        return b.anio - a.anio; // Año más reciente primero
      }
      // Si es el mismo año, ordenar por nombre (2025-3 > 2025-2 > 2025)
      return b.nombre.localeCompare(a.nombre);
    });
    
    return carpetasAnios[0].folder;
  } catch (e) {
    Logger.log(`         ⚠️ Error al buscar carpeta de año: ${e.message}`);
    return null;
  }
}

// ==========================================
// ✅ INSERTAR LINKS DEL REG EN LA HOJA (PARTE 2)
// ==========================================

function insertarLinksDelREGP2(sheet, regFolder, contadores) {
  try {
    // 1. Extraer CDR del nombre de carpeta REG
    var nombreREG = regFolder.getName();
    var cdr = nombreREG; // El nombre completo es el CDR
    
    Logger.log(`         🔍 Buscando fila para CDR: ${cdr}`);
    
    // 2. Buscar fila por CDR
    var fila = buscarFilaPorCDRP2(sheet, cdr);
    
    if (fila === -1) {
      Logger.log(`         ⚠️ No se encontró fila para CDR: ${cdr}`);
      return;
    }
    
    Logger.log(`         ✓ Fila encontrada: ${fila}`);
    
    // 3. Obtener los 3 links
    var links = obtenerLinksDelREGP2(regFolder);
    
    // 4. Insertar links en las columnas (SIEMPRE REEMPLAZAR)
    var linksInsertadosCount = 0;
    
    // Link CONTENIDO
    if (links.contenido) {
      var colContenido = getColumnByNameP2(sheet, 'LINK CARPETA DE CONTENIDO');
      if (colContenido) {
        var formulaContenido = `=HYPERLINK("${links.contenido.url}";"${links.contenido.texto}")`;
        sheet.getRange(fila, colContenido).setFormula(formulaContenido);
        linksInsertadosCount++;
        Logger.log(`         🔗 Link CONTENIDO insertado`);
      }
    }
    
    // Link PROPIETARIO
    if (links.propietario) {
      var colPropietario = getColumnByNameP2(sheet, 'LINK CARPETA DE PROPIETARIO');
      if (colPropietario) {
        var formulaPropietario = `=HYPERLINK("${links.propietario.url}";"${links.propietario.texto}")`;
        sheet.getRange(fila, colPropietario).setFormula(formulaPropietario);
        linksInsertadosCount++;
        Logger.log(`         🔗 Link PROPIETARIO insertado`);
      }
    }
    
    // Link INQUILINO
    if (links.inquilino) {
      var colInquilino = getColumnByNameP2(sheet, 'LINK CARPETA DE INQUILINO');
      if (colInquilino) {
        var formulaInquilino = `=HYPERLINK("${links.inquilino.url}";"${links.inquilino.texto}")`;
        sheet.getRange(fila, colInquilino).setFormula(formulaInquilino);
        linksInsertadosCount++;
        Logger.log(`         🔗 Link INQUILINO insertado`);
      }
    }
    
    contadores.linksInsertados += linksInsertadosCount;
    Logger.log(`         ✅ Total links insertados en fila ${fila}: ${linksInsertadosCount}`);
    
    // Flush para asegurar que se guardan los cambios
    SpreadsheetApp.flush();
    
  } catch (e) {
    Logger.log(`         ⚠️ Error al insertar links: ${e.message}`);
  }
}

// ==========================================
// BUSCAR FILA POR CDR (PARTE 2)
// ==========================================

function buscarFilaPorCDRP2(sheet, cdr) {
  try {
    var cdrCol = getColumnByNameP2(sheet, 'CODIGO DE REGISTRO');
    if (!cdrCol) {
      Logger.log('         ⚠️ No se encontró columna CODIGO DE REGISTRO');
      return -1;
    }
    
    var lastRow = sheet.getLastRow();
    var values = sheet.getRange(2, cdrCol, lastRow - 1, 1).getValues();
    
    for (var i = 0; i < values.length; i++) {
      var valorCelda = values[i][0];
      if (valorCelda && valorCelda.toString().trim() === cdr.trim()) {
        return i + 2; // +2 porque empezamos en fila 2
      }
    }
    
    return -1;
  } catch (e) {
    Logger.log(`         ⚠️ Error al buscar fila: ${e.message}`);
    return -1;
  }
}

// ==========================================
// OBTENER LINKS DEL REG (PARTE 2)
// ==========================================

function obtenerLinksDelREGP2(regFolder) {
  var links = {
    contenido: null,
    propietario: null,
    inquilino: null
  };
  
  try {
    // Link CONTENIDO: ARCHIVOS DEL INMUEBLE/CONTENIDO DE PUBLICACIÓN
    var archivosFolder = getFolderByNameP2(regFolder, 'ARCHIVOS DEL INMUEBLE');
    if (archivosFolder) {
      var contenidoFolder = getFolderByNameP2(archivosFolder, 'CONTENIDO DE PUBLICACIÓN');
      if (contenidoFolder) {
        links.contenido = {
          url: `https://drive.google.com/drive/folders/${contenidoFolder.getId()}`,
          texto: 'CARPETA DE CONTENIDO'
        };
      }
    }
    
    // Link PROPIETARIO: ENTREGAS DEL INMUEBLE
    var entregasFolder = getFolderByNameP2(regFolder, 'ENTREGAS DEL INMUEBLE');
    if (entregasFolder) {
      links.propietario = {
        url: `https://drive.google.com/drive/folders/${entregasFolder.getId()}`,
        texto: 'PROPIETARIO'
      };
      
      // Link INQUILINO: ENTREGAS/.../[AÑO_RECIENTE]/DOCUMENTOS DE ENTREGA - INQUILINO
      var carpetaAnio = obtenerCarpetaAnioMasRecienteP2(entregasFolder);
      if (carpetaAnio) {
        var inquilinoFolder = getFolderByNameP2(carpetaAnio, 'DOCUMENTOS DE ENTREGA - INQUILINO');
        if (inquilinoFolder) {
          links.inquilino = {
            url: `https://drive.google.com/drive/folders/${inquilinoFolder.getId()}`,
            texto: 'INQUILINO'
          };
        }
      }
    }
    
  } catch (e) {
    Logger.log(`         ⚠️ Error al obtener links: ${e.message}`);
  }
  
  return links;
}

// ==========================================
// SINCRONIZAR CON PLANTILLA (PARTE 2)
// ==========================================

function sincronizarConPlantillaP2(carpetaDestino, carpetaPlantilla, copiarArchivos, errores, contadores, indentacion) {
  indentacion = indentacion || '         ';
  
  try {
    // 1. COPIAR ARCHIVOS (si copiarArchivos = true)
    if (copiarArchivos) {
      var archivos = carpetaPlantilla.getFiles();
      
      while (archivos.hasNext()) {
        var archivo = archivos.next();
        var nombreArchivo = archivo.getName();
        
        // Verificar si ya existe
        var archivoExistente = buscarArchivoPorNombreP2(carpetaDestino, nombreArchivo);
        
        if (!archivoExistente) {
          // No existe, copiar
          archivo.makeCopy(nombreArchivo, carpetaDestino);
          contadores.archivosCopiados++;
          Logger.log(`${indentacion}📄 Archivo copiado: ${nombreArchivo}`);
        } else {
          contadores.elementosRespetados++;
          Logger.log(`${indentacion}↔️ Archivo ya existe: ${nombreArchivo} (respetado)`);
        }
      }
    }
    
    // 2. COPIAR CARPETAS (recursivo)
    var carpetas = carpetaPlantilla.getFolders();
    
    while (carpetas.hasNext()) {
      var carpetaOrigen = carpetas.next();
      var nombreCarpeta = carpetaOrigen.getName();
      
      // ✅ IMPORTANTE: Ignorar XXXX en validación (solo usarla como referencia)
      if (nombreCarpeta === 'XXXX') {
        Logger.log(`${indentacion}⊘ Carpeta XXXX ignorada (solo es referencia)`);
        continue;
      }
      
      var carpetaExistente = getFolderByNameP2(carpetaDestino, nombreCarpeta);
      
      if (!carpetaExistente) {
        // No existe, crear
        carpetaExistente = carpetaDestino.createFolder(nombreCarpeta);
        contadores.carpetasCreadas++;
        Logger.log(`${indentacion}📁 Carpeta creada: ${nombreCarpeta}`);
      } else {
        contadores.elementosRespetados++;
        Logger.log(`${indentacion}↔️ Carpeta ya existe: ${nombreCarpeta} (respetada)`);
      }
      
      // Recursión para validar subcarpetas
      sincronizarConPlantillaP2(
        carpetaExistente, 
        carpetaOrigen, 
        copiarArchivos, 
        errores, 
        contadores, 
        indentacion + '   '
      );
    }
    
  } catch (e) {
    var mensajeError = `Error al sincronizar ${carpetaDestino.getName()}: ${e.message}`;
    errores.push(mensajeError);
    Logger.log(`${indentacion}⚠️ ${mensajeError}`);
  }
}

// ==========================================
// BUSCAR ARCHIVO POR NOMBRE (PARTE 2)
// ==========================================

function buscarArchivoPorNombreP2(carpeta, nombreArchivo) {
  try {
    var archivos = carpeta.getFilesByName(nombreArchivo);
    return archivos.hasNext() ? archivos.next() : null;
  } catch (e) {
    return null;
  }
}

// ==========================================
// ACTUALIZAR PROGRESO
// ==========================================

function actualizarProgreso(resultado, timestampOriginal) {
  var props = PropertiesService.getScriptProperties();
  
  var progreso = {
    indiceInicio: resultado.indiceUltimoProcesado + 1,
    rprsRestantes: resultado.rprsRestantes,
    rprsCompletados: resultado.rprsCompletados,
    rprsConError: resultado.rprsConError,
    totalRPRs: resultado.totalRPRs,
    timestamp: timestampOriginal // Mantener timestamp original del inicio
  };
  
  props.setProperty('VERIFICACION_RPR_PROGRESO', JSON.stringify(progreso));
  Logger.log('💾 Progreso actualizado');
}
// ==========================================
// VERIFICACIÓN DE JERARQUÍA RPR - PARTE 2/3
// Funciones auxiliares y finalización
// Líneas 601-final
// ==========================================

// ==========================================
// MOSTRAR RESUMEN FINAL (PARTE 2)
// ==========================================

function mostrarResumenFinalP2(resultado, tiempoTotal) {
  Logger.log('\n🟢 ═══════════════════════════════════════════════════');
  Logger.log('📊 RESUMEN FINAL DEL PROCESO COMPLETO');
  Logger.log('🟢 ═══════════════════════════════════════════════════');
  Logger.log(`📁 Total de RPRs en el sistema: ${resultado.totalRPRs}`);
  Logger.log(`✅ RPRs procesados exitosamente: ${resultado.rprsCompletados}`);
  Logger.log(`❌ RPRs con errores: ${resultado.rprsConError.length}`);
  Logger.log(`⏱️ Tiempo total del proceso: ${tiempoTotal} segundos`);
  
  if (resultado.rprsConError.length > 0) {
    Logger.log('\n⚠️ DETALLE DE ERRORES:');
    Logger.log('═══════════════════════════════════════════════════');
    resultado.rprsConError.forEach(function(item, index) {
      Logger.log(`\n${index + 1}. RPR: ${item.nombre}`);
      Logger.log(`   Error: ${item.error}`);
      if (item.detalles && item.detalles.length > 0) {
        Logger.log(`   Detalles:`);
        item.detalles.forEach(function(detalle) {
          Logger.log(`      - ${detalle}`);
        });
      }
    });
  }
  
  Logger.log('\n🟢 ═══════════════════════════════════════════════════');
  Logger.log('✅ VERIFICACIÓN DE JERARQUÍA COMPLETADA EXITOSAMENTE');
  Logger.log('🟢 ═══════════════════════════════════════════════════');
}

// ==========================================
// LIMPIAR PROCESO COMPLETO
// ==========================================

function limpiarProcesoCompleto() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('VERIFICACION_RPR_PROGRESO');
  
  eliminarTriggerP2('continuarVerificacionRPRsParte2');
  
  Logger.log('🧹 Progreso limpiado y triggers eliminados');
}

// ==========================================
// ELIMINAR TRIGGERS (PARTE 2) - MEJORADO
// ==========================================

function eliminarTriggerP2(nombreFuncion) {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var eliminados = 0;
    
    // Crear array para iterar de forma segura
    var triggersArray = [];
    for (var i = 0; i < triggers.length; i++) {
      triggersArray.push(triggers[i]);
    }
    
    // Eliminar todos los triggers con ese nombre
    triggersArray.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === nombreFuncion) {
        try {
          ScriptApp.deleteTrigger(trigger);
          eliminados++;
        } catch (e) {
          Logger.log(`⚠️ No se pudo eliminar trigger: ${e.message}`);
        }
      }
    });
    
    if (eliminados > 0) {
      Logger.log(`🗑️ ${eliminados} trigger(s) eliminado(s): ${nombreFuncion}`);
    } else {
      Logger.log(`ℹ️ No se encontraron triggers para eliminar: ${nombreFuncion}`);
    }
    
    return eliminados;
  } catch (e) {
    Logger.log(`⚠️ Error al eliminar triggers: ${e.message}`);
    return 0;
  }
}

// ==========================================
// FUNCIONES AUXILIARES (PARTE 2)
// ==========================================

function getColumnByNameP2(sheet, columnName) {
  try {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var col = 0; col < headers.length; col++) {
      if (headers[col].toString().trim() === columnName.trim()) {
        return col + 1;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getFolderByNameP2(parentFolder, folderName) {
  try {
    var folderIterator = parentFolder.getFoldersByName(folderName);
    return folderIterator.hasNext() ? folderIterator.next() : null;
  } catch (e) {
    return null;
  }
}

// ==========================================
// FUNCIÓN AUXILIAR: PROBAR UN RPR ESPECÍFICO (PARTE 2)
// (Útil para debugging)
// ==========================================

function probarValidacionRPREspecificoP2() {
  Logger.log('🧪 MODO DE PRUEBA - Validando RPR específico (Parte 2)');
  Logger.log('═══════════════════════════════════════════════════');
  
  try {
    // Cambiar este ID por el del RPR que quieres probar
    var RPR_ID_PRUEBA = 'XXXXXXXXXXXXXXXXXXXXXXX'; // ← Cambiar este ID
    
    Logger.log('📂 Obteniendo RPR de prueba...');
    var rprFolder = DriveApp.getFolderById(RPR_ID_PRUEBA);
    Logger.log(`✅ RPR encontrado: ${rprFolder.getName()}\n`);
    
    // Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_VERIFICACION_P2.HOJA_PRINCIPAL);
    
    // Obtener plantillas
    var plantillaMaestra = DriveApp.getFolderById(CONFIG_VERIFICACION_P2.PLANTILLA_MAESTRA_ID);
    var plantilla2 = obtenerPlantilla2P2(plantillaMaestra);
    
    if (!plantilla2) {
      throw new Error('No se pudo obtener PLANTILLA #2');
    }
    
    // Validar
    Logger.log('🔍 Iniciando validación...\n');
    var resultado = validarRPRCompletoP2(rprFolder, plantillaMaestra, plantilla2, sheet);
    
    // Mostrar resultado
    Logger.log('\n═══════════════════════════════════════════════════');
    if (resultado.exito) {
      Logger.log('✅ VALIDACIÓN EXITOSA');
      Logger.log(`📊 Resumen:`);
      Logger.log(`   - Carpetas creadas: ${resultado.carpetasCreadas}`);
      Logger.log(`   - Archivos copiados: ${resultado.archivosCopiados}`);
      Logger.log(`   - Elementos respetados: ${resultado.elementosRespetados}`);
      Logger.log(`   - Links insertados: ${resultado.linksInsertados}`);
    } else {
      Logger.log('❌ VALIDACIÓN CON ERRORES');
      Logger.log(`   Error: ${resultado.error}`);
      if (resultado.detalles && resultado.detalles.length > 0) {
        Logger.log('   Detalles:');
        resultado.detalles.forEach(function(detalle) {
          Logger.log(`      - ${detalle}`);
        });
      }
    }
    Logger.log('═══════════════════════════════════════════════════');
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);
  }
}

// ==========================================
// FUNCIÓN AUXILIAR: LIMPIAR PROGRESO MANUALMENTE (PARTE 2)
// ==========================================

function limpiarProgresoManualP2() {
  Logger.log('🧹 Limpiando progreso guardado...');
  
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('VERIFICACION_RPR_PROGRESO');
  
  var eliminados = eliminarTriggerP2('continuarVerificacionRPRsParte2');
  
  Logger.log('✅ Progreso limpiado y triggers eliminados');
  Logger.log(`📊 Total de triggers eliminados: ${eliminados}`);
  Logger.log('ℹ️ Puedes ejecutar verificarJerarquiaRPRs() de nuevo');
}

// ==========================================
// FUNCIÓN AUXILIAR: VER PROGRESO ACTUAL (PARTE 2)
// ==========================================

function verProgresoActualP2() {
  Logger.log('📊 PROGRESO ACTUAL DEL PROCESO');
  Logger.log('═══════════════════════════════════════════════════');
  
  var props = PropertiesService.getScriptProperties();
  var progresoStr = props.getProperty('VERIFICACION_RPR_PROGRESO');
  
  if (!progresoStr) {
    Logger.log('ℹ️ No hay ningún proceso en ejecución');
    Logger.log('ℹ️ Puedes ejecutar verificarJerarquiaRPRs() para iniciar');
    return;
  }
  
  var progreso = JSON.parse(progresoStr);
  
  Logger.log(`📁 Total de RPRs: ${progreso.totalRPRs}`);
  Logger.log(`✅ RPRs completados: ${progreso.rprsCompletados}`);
  Logger.log(`❌ RPRs con errores: ${progreso.rprsConError.length}`);
  Logger.log(`⏳ RPRs restantes: ${progreso.rprsRestantes.length}`);
  Logger.log(`📍 Último índice procesado: ${progreso.indiceInicio - 1}`);
  
  var tiempoTranscurrido = (new Date().getTime() - progreso.timestamp) / 1000;
  Logger.log(`⏱️ Tiempo transcurrido: ${tiempoTranscurrido} segundos`);
  
  Logger.log('\n📋 RPRs restantes:');
  progreso.rprsRestantes.slice(0, 5).forEach(function(rpr, index) {
    Logger.log(`   ${index + 1}. ${rpr.nombre}`);
  });
  
  if (progreso.rprsRestantes.length > 5) {
    Logger.log(`   ... y ${progreso.rprsRestantes.length - 5} más`);
  }
  
  if (progreso.rprsConError.length > 0) {
    Logger.log('\n❌ RPRs con errores:');
    progreso.rprsConError.forEach(function(item, index) {
      Logger.log(`   ${index + 1}. ${item.nombre}: ${item.error}`);
    });
  }
  
  Logger.log('═══════════════════════════════════════════════════');
}

// ==========================================
// FUNCIÓN AUXILIAR: INSERTAR LINKS DE UN REG ESPECÍFICO (PARTE 2)
// (Para corregir links manualmente)
// ==========================================

function insertarLinksPorCDRP2() {
  Logger.log('🔗 INSERTAR LINKS MANUALMENTE POR CDR (Parte 2)');
  Logger.log('═══════════════════════════════════════════════════');
  
  try {
    // Cambiar este CDR por el que necesites
    var CDR_BUSCAR = 'REG_10-12-2025-C37_(CRA 8)_APTO-3'; // ← Cambiar aquí
    
    Logger.log(`🔍 Buscando REG con CDR: ${CDR_BUSCAR}`);
    
    // Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_VERIFICACION_P2.HOJA_PRINCIPAL);
    
    // Buscar fila
    var fila = buscarFilaPorCDRP2(sheet, CDR_BUSCAR);
    
    if (fila === -1) {
      Logger.log('❌ No se encontró fila con ese CDR');
      return;
    }
    
    Logger.log(`✅ Fila encontrada: ${fila}`);
    
    // Buscar carpeta REG por nombre
    Logger.log('🔍 Buscando carpeta REG en Drive...');
    var regFolder = buscarCarpetaREGPorNombreP2(CDR_BUSCAR);
    
    if (!regFolder) {
      Logger.log('❌ No se encontró carpeta REG en Drive');
      return;
    }
    
    Logger.log(`✅ Carpeta REG encontrada: ${regFolder.getName()}`);
    
    // Insertar links
    var contadores = { linksInsertados: 0 };
    insertarLinksDelREGP2(sheet, regFolder, contadores);
    
    Logger.log('═══════════════════════════════════════════════════');
    Logger.log(`✅ Proceso completado - Links insertados: ${contadores.linksInsertados}`);
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
  }
}

function buscarCarpetaREGPorNombreP2(nombreREG) {
  try {
    var carpetaPadre = DriveApp.getFolderById(CONFIG_VERIFICACION_P2.PARENT_FOLDER_ID);
    
    // Función auxiliar para obtener RPRs
    var rprs = [];
    var folders = carpetaPadre.getFolders();
    
    while (folders.hasNext()) {
      var folder = folders.next();
      var nombre = folder.getName();
      
      if (nombre.indexOf('PLANTILLA') === -1 && nombre.indexOf('Z1-') === -1) {
        rprs.push(folder);
      }
    }
    
    // Buscar en todos los RPRs
    for (var i = 0; i < rprs.length; i++) {
      var rprFolder = rprs[i];
      var inmueblesFolder = getFolderByNameP2(rprFolder, 'INMUEBLES');
      
      if (!inmueblesFolder) continue;
      
      var tiposNegocio = ['ARRIENDO', 'VENTA', 'BI-NEGOCIO'];
      
      for (var j = 0; j < tiposNegocio.length; j++) {
        var carpetaTipoNegocio = getFolderByNameP2(inmueblesFolder, tiposNegocio[j]);
        if (!carpetaTipoNegocio) continue;
        
        var regFolder = getFolderByNameP2(carpetaTipoNegocio, nombreREG);
        if (regFolder) {
          return regFolder;
        }
      }
    }
    
    return null;
  } catch (e) {
    Logger.log(`⚠️ Error al buscar carpeta REG: ${e.message}`);
    return null;
  }
}

// ==========================================
// FUNCIÓN AUXILIAR: FORZAR CONTINUACIÓN MANUAL
// ==========================================

function forzarContinuacionParte2() {
  Logger.log('🔄 FORZANDO CONTINUACIÓN MANUAL DE PARTE 2');
  Logger.log('═══════════════════════════════════════════════════');
  Logger.log('⚠️ Esta función ejecuta continuarVerificacionRPRsParte2() inmediatamente');
  Logger.log('⚠️ Útil si el trigger automático no se ejecutó\n');
  
  try {
    continuarVerificacionRPRsParte2();
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);
  }
}

// ==========================================
// FUNCIÓN AUXILIAR: ESTADÍSTICAS DEL PROCESO
// ==========================================

function mostrarEstadisticasProceso() {
  Logger.log('📈 ESTADÍSTICAS DEL PROCESO');
  Logger.log('═══════════════════════════════════════════════════');
  
  var props = PropertiesService.getScriptProperties();
  var progresoStr = props.getProperty('VERIFICACION_RPR_PROGRESO');
  
  if (!progresoStr) {
    Logger.log('ℹ️ No hay proceso en ejecución');
    Logger.log('\n💡 Para iniciar un nuevo proceso ejecuta:');
    Logger.log('   verificarJerarquiaRPRs()');
    return;
  }
  
  var progreso = JSON.parse(progresoStr);
  
  var tiempoTranscurrido = (new Date().getTime() - progreso.timestamp) / 1000;
  var porcentajeCompletado = ((progreso.rprsCompletados / progreso.totalRPRs) * 100).toFixed(2);
  var rprsRestantes = progreso.rprsRestantes.length;
  var velocidadPromedio = progreso.rprsCompletados / (tiempoTranscurrido / 60); // RPRs por minuto
  var tiempoEstimadoRestante = rprsRestantes / velocidadPromedio; // minutos
  
  Logger.log(`📊 Progreso general:`);
  Logger.log(`   Total de RPRs: ${progreso.totalRPRs}`);
  Logger.log(`   Completados: ${progreso.rprsCompletados} (${porcentajeCompletado}%)`);
  Logger.log(`   Con errores: ${progreso.rprsConError.length}`);
  Logger.log(`   Restantes: ${rprsRestantes}`);
  
  Logger.log(`\n⏱️ Información de tiempo:`);
  Logger.log(`   Tiempo transcurrido: ${(tiempoTranscurrido / 60).toFixed(2)} minutos`);
  Logger.log(`   Velocidad promedio: ${velocidadPromedio.toFixed(2)} RPRs/minuto`);
  Logger.log(`   Tiempo estimado restante: ${tiempoEstimadoRestante.toFixed(2)} minutos`);
  
  Logger.log(`\n🎯 Estado actual:`);
  Logger.log(`   Último índice procesado: ${progreso.indiceInicio - 1}`);
  Logger.log(`   Próximo RPR a procesar: ${rprsRestantes > 0 ? progreso.rprsRestantes[0].nombre : 'Ninguno'}`);
  
  if (progreso.rprsConError.length > 0) {
    Logger.log(`\n❌ RPRs con errores (${progreso.rprsConError.length}):`);
    progreso.rprsConError.forEach(function(item, index) {
      Logger.log(`   ${index + 1}. ${item.nombre}`);
    });
  }
  
  Logger.log('\n═══════════════════════════════════════════════════');
  Logger.log('💡 Comandos útiles:');
  Logger.log('   verProgresoActualP2()        - Ver progreso detallado');
  Logger.log('   forzarContinuacionParte2()   - Continuar manualmente');
  Logger.log('   limpiarProgresoManualP2()    - Limpiar y reiniciar');
  Logger.log('═══════════════════════════════════════════════════');
}

// ==========================================
// FUNCIÓN AUXILIAR: LIMPIAR TODOS LOS TRIGGERS
// ==========================================

function limpiarTodosLosTriggers() {
  Logger.log('🧹 LIMPIANDO TODOS LOS TRIGGERS DEL PROYECTO');
  Logger.log('═══════════════════════════════════════════════════');
  
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var total = triggers.length;
    var eliminados = 0;
    
    Logger.log(`📊 Total de triggers encontrados: ${total}`);
    
    for (var i = 0; i < triggers.length; i++) {
      try {
        var nombreFuncion = triggers[i].getHandlerFunction();
        ScriptApp.deleteTrigger(triggers[i]);
        eliminados++;
        Logger.log(`   ✓ Eliminado: ${nombreFuncion}`);
      } catch (e) {
        Logger.log(`   ⚠️ No se pudo eliminar trigger: ${e.message}`);
      }
    }
    
    Logger.log('\n═══════════════════════════════════════════════════');
    Logger.log(`✅ Proceso completado: ${eliminados}/${total} triggers eliminados`);
    Logger.log('ℹ️ Ahora puedes ejecutar verificarJerarquiaRPRs() sin problemas');
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
  }
}

// ==========================================
// FIN DEL ARCHIVO 2
// ==========================================

Logger.log('📄 VERIFICACIONCARPETADEREG2 cargado correctamente - v2.2-fixed-triggers');