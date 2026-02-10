// ==========================================
// VERIFICACIÓN DE JERARQUÍA RPR - PARTE 1
// Sistema de validación completa contra PLANTILLA #1
// Versión: v2.1-final
// ==========================================

const CONFIG_VERIFICACION = {
  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  PLANTILLA_MAESTRA_ID: '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH',
  PARENT_FOLDER_ID: '1mBbFORjuddMN8nwU1zY27_wLa9iZWfvX',
  VERSION: 'v2.1-final',
  TIEMPO_LIMITE_MS: 240000, // ← 4 minutos
  TIEMPO_ESPERA_PARTE2: 1000 // ← 1 segundo
};

// ==========================================
// FUNCIÓN PRINCIPAL - INICIO
// ==========================================

function verificarJerarquiaRPRs() {
  var tiempoInicio = new Date().getTime();
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  Logger.log('🔵 VERIFICACIÓN DE RPRs - PARTE 1 - INICIO');
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  
  try {
    // Limpiar estado previo
    PropertiesService.getScriptProperties().deleteProperty('VERIFICACION_RPR_PROGRESO');
    
    // 1. Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_VERIFICACION.HOJA_PRINCIPAL);
    
    if (!sheet) {
      throw new Error('No se encontró la hoja: ' + CONFIG_VERIFICACION.HOJA_PRINCIPAL);
    }
    
    Logger.log('✅ Hoja encontrada');
    
    // 2. Obtener PLANTILLA #1 maestra
    Logger.log('📂 Accediendo a PLANTILLA #1 maestra...');
    var plantillaMaestra = DriveApp.getFolderById(CONFIG_VERIFICACION.PLANTILLA_MAESTRA_ID);
    Logger.log('✅ PLANTILLA #1 maestra accedida');
    
    // 3. Obtener carpeta padre con todos los RPRs
    Logger.log('📂 Accediendo a carpeta padre de RPRs...');
    var carpetaPadre = DriveApp.getFolderById(CONFIG_VERIFICACION.PARENT_FOLDER_ID);
    Logger.log('✅ Carpeta padre accedida\n');
    
    // 4. Obtener TODOS los RPRs de la carpeta padre
    Logger.log('🔍 Obteniendo lista de RPRs...');
    var todosLosRPRs = obtenerTodosLosRPRs(carpetaPadre);
    
    if (todosLosRPRs.length === 0) {
      Logger.log('⚠️ No se encontraron RPRs en la carpeta padre');
      return;
    }
    
    Logger.log(`📊 Total de RPRs encontrados: ${todosLosRPRs.length}\n`);
    
    // 5. Obtener PLANTILLA #2 (para validar REGs)
    var plantilla2 = obtenerPlantilla2(plantillaMaestra);
    if (!plantilla2) {
      throw new Error('No se pudo obtener PLANTILLA #2 de referencia');
    }
    Logger.log('✅ PLANTILLA #2 obtenida como referencia\n');
    
    // 6. Procesar RPRs con límite de 4 minutos
    var resultado = procesarRPRsParte1(
      todosLosRPRs,
      plantillaMaestra,
      plantilla2,
      sheet,
      tiempoInicio
    );
    
    // 7. Guardar progreso y programar Parte 2
    if (resultado.necesitaContinuar) {
      Logger.log('\n⏰ Límite de 4 minutos alcanzado');
      Logger.log('📊 RESUMEN DE PARTE 1:');
      Logger.log(`✅ RPRs procesados: ${resultado.rprsCompletados}`);
      Logger.log(`⏳ RPRs pendientes: ${resultado.rprsRestantes.length}`);
      Logger.log(`❌ RPRs con errores: ${resultado.rprsConError.length}`);
      
      guardarProgreso(resultado, todosLosRPRs);
      
      Logger.log('\n⏳ Programando PARTE 2 en 1 segundo...');
      ScriptApp.newTrigger('continuarVerificacionRPRsParte2')
        .timeBased()
        .after(CONFIG_VERIFICACION.TIEMPO_ESPERA_PARTE2)
        .create();
      
      var tiempoTotal = (new Date().getTime() - tiempoInicio) / 1000;
      Logger.log('🔵 ═══════════════════════════════════════════════════');
      Logger.log(`⏸️ PARTE 1 - COMPLETADA en ${tiempoTotal} segundos`);
      Logger.log('⏸️ Continuará en PARTE 2 automáticamente');
      Logger.log('🔵 ═══════════════════════════════════════════════════');
    } else {
      mostrarResumenFinal(resultado, tiempoInicio);
    }
    
  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);
  }
}

// ==========================================
// OBTENER TODOS LOS RPRs DE LA CARPETA PADRE
// ==========================================

function obtenerTodosLosRPRs(carpetaPadre) {
  var rprs = [];
  var folders = carpetaPadre.getFolders();
  
  while (folders.hasNext()) {
    var folder = folders.next();
    var nombre = folder.getName();
    
    // Filtrar carpetas que sean RPRs (contienen "RPR-" o patrón numérico al inicio)
    // Ignorar PLANTILLA #1
    if (nombre.indexOf('PLANTILLA') === -1 && nombre.indexOf('Z1-') === -1) {
      rprs.push({
        folder: folder,
        nombre: nombre,
        id: folder.getId()
      });
    }
  }
  
  return rprs;
}

// ==========================================
// OBTENER PLANTILLA #2 DE REFERENCIA
// ==========================================

function obtenerPlantilla2(plantillaMaestra) {
  try {
    var inmueblesPlantilla = getFolderByName(plantillaMaestra, 'INMUEBLES');
    if (!inmueblesPlantilla) return null;
    
    var arriendoPlantilla = getFolderByName(inmueblesPlantilla, 'ARRIENDO');
    if (!arriendoPlantilla) return null;
    
    var plantilla2 = getFolderByName(arriendoPlantilla, 'PLANTILLA #2');
    return plantilla2;
  } catch (e) {
    Logger.log(`⚠️ Error al obtener PLANTILLA #2: ${e.message}`);
    return null;
  }
}

// ==========================================
// PROCESAR RPRs - PARTE 1 (CON LÍMITE DE 4 MINUTOS)
// ==========================================

function procesarRPRsParte1(todosLosRPRs, plantillaMaestra, plantilla2, sheet, tiempoInicio) {
  var rprsCompletados = 0;
  var rprsConError = [];
  var indiceActual = 0;
  
  Logger.log('📋 Iniciando procesamiento de RPRs...\n');
  
  for (var i = 0; i < todosLosRPRs.length; i++) {
    // Verificar tiempo transcurrido
    var tiempoTranscurrido = new Date().getTime() - tiempoInicio;
    if (tiempoTranscurrido >= CONFIG_VERIFICACION.TIEMPO_LIMITE_MS) {
      Logger.log(`\n⏰ Límite de 4 minutos alcanzado (${tiempoTranscurrido / 1000}s)`);
      
      // Calcular RPRs restantes
      var rprsRestantes = [];
      for (var j = i; j < todosLosRPRs.length; j++) {
        rprsRestantes.push({
          nombre: todosLosRPRs[j].nombre,
          id: todosLosRPRs[j].id
        });
      }
      
      return {
        necesitaContinuar: true,
        rprsCompletados: rprsCompletados,
        rprsConError: rprsConError,
        rprsRestantes: rprsRestantes,
        indiceUltimoProcesado: i - 1,
        totalRPRs: todosLosRPRs.length
      };
    }
    
    var rpr = todosLosRPRs[i];
    indiceActual = i;
    
    Logger.log(`🔍 [${i + 1}/${todosLosRPRs.length}] Validando RPR: ${rpr.nombre}`);
    Logger.log('─────────────────────────────────────────────────────');
    
    var resultado = validarRPRCompleto(rpr.folder, plantillaMaestra, plantilla2, sheet);
    
    if (resultado.exito) {
      rprsCompletados++;
      Logger.log(`✅ [${i + 1}/${todosLosRPRs.length}] RPR validado completamente`);
      Logger.log(`📊 Resumen: ${resultado.carpetasCreadas} carpetas creadas, ${resultado.archivosCopiados} archivos copiados, ${resultado.elementosRespetados} elementos respetados`);
      Logger.log(`🔗 Links insertados: ${resultado.linksInsertados}\n`);
    } else {
      rprsConError.push({
        nombre: rpr.nombre,
        error: resultado.error,
        detalles: resultado.detalles || []
      });
      Logger.log(`❌ [${i + 1}/${todosLosRPRs.length}] Error: ${resultado.error}\n`);
    }
    
    // Log de tiempo cada 5 RPRs
    if ((i + 1) % 5 === 0) {
      var tiempoActual = (new Date().getTime() - tiempoInicio) / 1000;
      Logger.log(`⏱️ Tiempo transcurrido: ${tiempoActual} segundos\n`);
    }
  }
  
  return {
    necesitaContinuar: false,
    rprsCompletados: rprsCompletados,
    rprsConError: rprsConError,
    rprsRestantes: [],
    indiceUltimoProcesado: indiceActual,
    totalRPRs: todosLosRPRs.length
  };
}

// ==========================================
// VALIDAR RPR COMPLETO
// ==========================================

function validarRPRCompleto(rprFolder, plantillaMaestra, plantilla2, sheet) {
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
    var docsPropietarioPlantilla = getFolderByName(plantillaMaestra, 'DOCUMENTOS DEL PROPIETARIO');
    
    if (docsPropietarioPlantilla) {
      var docsPropietarioRPR = getFolderByName(rprFolder, 'DOCUMENTOS DEL PROPIETARIO');
      
      if (!docsPropietarioRPR) {
        docsPropietarioRPR = rprFolder.createFolder('DOCUMENTOS DEL PROPIETARIO');
        contadores.carpetasCreadas++;
        Logger.log('      📁 Carpeta creada: DOCUMENTOS DEL PROPIETARIO');
      } else {
        contadores.elementosRespetados++;
        Logger.log('      ↔️ Carpeta ya existe: DOCUMENTOS DEL PROPIETARIO (respetada)');
      }
      
      sincronizarConPlantilla(docsPropietarioRPR, docsPropietarioPlantilla, true, errores, contadores);
      Logger.log('      ✓ DOCUMENTOS DEL PROPIETARIO sincronizado');
    }
    
    // 2. Validar rama: INMUEBLES
    Logger.log('   📂 Validando: INMUEBLES');
    var inmueblesRPR = getFolderByName(rprFolder, 'INMUEBLES');
    
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
      
      var carpetaTipoNegocio = getFolderByName(inmueblesRPR, tipoNegocio);
      
      if (!carpetaTipoNegocio) {
        carpetaTipoNegocio = inmueblesRPR.createFolder(tipoNegocio);
        contadores.carpetasCreadas++;
        Logger.log(`      📁 Carpeta creada: ${tipoNegocio}`);
      } else {
        contadores.elementosRespetados++;
        Logger.log(`      ↔️ Carpeta ya existe: ${tipoNegocio} (respetada)`);
      }
      
      // 2.2 Validar todos los REGs dentro de este tipo de negocio
      validarTodosLosREGsDentroDe(carpetaTipoNegocio, plantilla2, errores, contadores, sheet);
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
// VERIFICACIÓN DE JERARQUÍA RPR - PARTE 2
// Continuación - Validación de REGs e inserción de links
// Líneas 301-600
// ==========================================

// ==========================================
// VALIDAR TODOS LOS REGs DENTRO DE UN TIPO DE NEGOCIO
// ==========================================

function validarTodosLosREGsDentroDe(carpetaTipoNegocio, plantilla2, errores, contadores, sheet) {
  // 1. Obtener TODOS los REG dentro de esta carpeta
  var carpetasREG = obtenerTodasLasCarpetasREG(carpetaTipoNegocio);
  
  if (carpetasREG.length === 0) {
    Logger.log('      ℹ️ No se encontraron REGs en esta carpeta');
    return;
  }
  
  Logger.log(`      📊 Total de REGs encontrados: ${carpetasREG.length}`);
  
  // 2. Para cada REG encontrado, validar su estructura
  carpetasREG.forEach(function(regFolder, index) {
    Logger.log(`      🏠 [${index + 1}/${carpetasREG.length}] Validando REG: ${regFolder.getName()}`);
    
    // 2.1 Validar ARCHIVOS DEL INMUEBLE
    validarArchivosDelInmueble(regFolder, plantilla2, errores, contadores);
    
    // 2.2 Validar ENTREGAS DEL INMUEBLE (con lógica especial de año)
    validarEntregasDelInmueble(regFolder, plantilla2, errores, contadores);
    
    // 2.3 ✅ NUEVO: Insertar links en la hoja
    insertarLinksDelREG(sheet, regFolder, contadores);
    
    Logger.log(`      ✓ REG validado: ${regFolder.getName()}`);
  });
}

// ==========================================
// OBTENER TODAS LAS CARPETAS REG
// ==========================================

function obtenerTodasLasCarpetasREG(carpetaTipoNegocio) {
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
// VALIDAR ARCHIVOS DEL INMUEBLE
// ==========================================

function validarArchivosDelInmueble(regFolder, plantilla2, errores, contadores) {
  Logger.log('         🔍 Validando: ARCHIVOS DEL INMUEBLE');
  
  // 1. Obtener carpeta de plantilla
  var archivosPlantilla = getFolderByName(plantilla2, 'ARCHIVOS DEL INMUEBLE');
  
  if (!archivosPlantilla) {
    errores.push('No se encontró ARCHIVOS DEL INMUEBLE en PLANTILLA #2');
    Logger.log('         ⚠️ No se encontró ARCHIVOS DEL INMUEBLE en plantilla');
    return;
  }
  
  // 2. Obtener o crear carpeta en REG
  var archivosREG = getFolderByName(regFolder, 'ARCHIVOS DEL INMUEBLE');
  
  if (!archivosREG) {
    archivosREG = regFolder.createFolder('ARCHIVOS DEL INMUEBLE');
    contadores.carpetasCreadas++;
    Logger.log('         📁 Carpeta creada: ARCHIVOS DEL INMUEBLE');
  } else {
    contadores.elementosRespetados++;
    Logger.log('         ↔️ Carpeta ya existe: ARCHIVOS DEL INMUEBLE (respetada)');
  }
  
  // 3. Sincronizar con plantilla
  sincronizarConPlantilla(archivosREG, archivosPlantilla, true, errores, contadores, '         ');
  Logger.log('         ✓ ARCHIVOS DEL INMUEBLE sincronizado');
}

// ==========================================
// VALIDAR ENTREGAS DEL INMUEBLE (LÓGICA ESPECIAL DE AÑO)
// ==========================================

function validarEntregasDelInmueble(regFolder, plantilla2, errores, contadores) {
  Logger.log('         🔍 Validando: ENTREGAS DEL INMUEBLE');
  
  // 1. Obtener carpeta ENTREGAS de plantilla
  var entregasPlantilla = getFolderByName(plantilla2, 'ENTREGAS DEL INMUEBLE');
  
  if (!entregasPlantilla) {
    errores.push('No se encontró ENTREGAS DEL INMUEBLE en PLANTILLA #2');
    Logger.log('         ⚠️ No se encontró ENTREGAS DEL INMUEBLE en plantilla');
    return;
  }
  
  // 2. Obtener o crear carpeta ENTREGAS en REG
  var entregasREG = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
  
  if (!entregasREG) {
    entregasREG = regFolder.createFolder('ENTREGAS DEL INMUEBLE');
    contadores.carpetasCreadas++;
    Logger.log('         📁 Carpeta creada: ENTREGAS DEL INMUEBLE');
  } else {
    contadores.elementosRespetados++;
    Logger.log('         ↔️ Carpeta ya existe: ENTREGAS DEL INMUEBLE (respetada)');
  }
  
  // 3. CLAVE: Obtener carpeta de año más reciente (NO crear XXXX hermana)
  var carpetaAnioActual = obtenerOCrearCarpetaAnio(entregasREG, contadores);
  
  if (!carpetaAnioActual) {
    errores.push('No se pudo obtener o crear carpeta de año en ENTREGAS DEL INMUEBLE');
    Logger.log('         ⚠️ No se pudo obtener carpeta de año');
    return;
  }
  
  Logger.log(`         📅 Carpeta de año: ${carpetaAnioActual.getName()}`);
  
  // 4. Obtener XXXX de plantilla como REFERENCIA (NO copiarla como hermana)
  var carpetaXXXXPlantilla = getFolderByName(entregasPlantilla, 'XXXX');
  
  if (!carpetaXXXXPlantilla) {
    errores.push('No se encontró carpeta XXXX en PLANTILLA #2/ENTREGAS DEL INMUEBLE');
    Logger.log('         ⚠️ No se encontró XXXX en plantilla');
    return;
  }
  
  // 5. ✅ VALIDAR DENTRO de la carpeta de año contra XXXX plantilla
  Logger.log('         🔍 Validando contenido del año contra XXXX plantilla...');
  sincronizarConPlantilla(
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
// OBTENER O CREAR CARPETA DE AÑO
// ==========================================

function obtenerOCrearCarpetaAnio(entregasFolder, contadores) {
  // 1. Buscar carpeta de año más reciente (2025, 2025-2, etc.)
  var carpetaAnioReciente = obtenerCarpetaAnioMasReciente(entregasFolder);
  
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
// OBTENER CARPETA DE AÑO MÁS RECIENTE
// ==========================================

function obtenerCarpetaAnioMasReciente(entregasFolder) {
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
// ✅ NUEVO: INSERTAR LINKS DEL REG EN LA HOJA
// ==========================================

function insertarLinksDelREG(sheet, regFolder, contadores) {
  try {
    // 1. Extraer CDR del nombre de carpeta REG
    var nombreREG = regFolder.getName();
    var cdr = nombreREG; // El nombre completo es el CDR
    
    Logger.log(`         🔍 Buscando fila para CDR: ${cdr}`);
    
    // 2. Buscar fila por CDR
    var fila = buscarFilaPorCDR(sheet, cdr);
    
    if (fila === -1) {
      Logger.log(`         ⚠️ No se encontró fila para CDR: ${cdr}`);
      return;
    }
    
    Logger.log(`         ✓ Fila encontrada: ${fila}`);
    
    // 3. Obtener los 3 links
    var links = obtenerLinksDelREG(regFolder);
    
    // 4. Insertar links en las columnas (SIEMPRE REEMPLAZAR)
    var linksInsertadosCount = 0;
    
    // Link CONTENIDO
    if (links.contenido) {
      var colContenido = getColumnByName(sheet, 'LINK CARPETA DE CONTENIDO');
      if (colContenido) {
        var formulaContenido = `=HYPERLINK("${links.contenido.url}";"${links.contenido.texto}")`;
        sheet.getRange(fila, colContenido).setFormula(formulaContenido);
        linksInsertadosCount++;
        Logger.log(`         🔗 Link CONTENIDO insertado`);
      }
    }
    
    // Link PROPIETARIO
    if (links.propietario) {
      var colPropietario = getColumnByName(sheet, 'LINK CARPETA DE PROPIETARIO');
      if (colPropietario) {
        var formulaPropietario = `=HYPERLINK("${links.propietario.url}";"${links.propietario.texto}")`;
        sheet.getRange(fila, colPropietario).setFormula(formulaPropietario);
        linksInsertadosCount++;
        Logger.log(`         🔗 Link PROPIETARIO insertado`);
      }
    }
    
    // Link INQUILINO
    if (links.inquilino) {
      var colInquilino = getColumnByName(sheet, 'LINK CARPETA DE INQUILINO');
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
// BUSCAR FILA POR CDR
// ==========================================

function buscarFilaPorCDR(sheet, cdr) {
  try {
    var cdrCol = getColumnByName(sheet, 'CODIGO DE REGISTRO');
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
// OBTENER LINKS DEL REG
// ==========================================

function obtenerLinksDelREG(regFolder) {
  var links = {
    contenido: null,
    propietario: null,
    inquilino: null
  };
  
  try {
    // Link CONTENIDO: ARCHIVOS DEL INMUEBLE/CONTENIDO DE PUBLICACIÓN
    var archivosFolder = getFolderByName(regFolder, 'ARCHIVOS DEL INMUEBLE');
    if (archivosFolder) {
      var contenidoFolder = getFolderByName(archivosFolder, 'CONTENIDO DE PUBLICACIÓN');
      if (contenidoFolder) {
        links.contenido = {
          url: `https://drive.google.com/drive/folders/${contenidoFolder.getId()}`,
          texto: 'CARPETA DE CONTENIDO'
        };
      }
    }
    
    // Link PROPIETARIO: ENTREGAS DEL INMUEBLE
    var entregasFolder = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
    if (entregasFolder) {
      links.propietario = {
        url: `https://drive.google.com/drive/folders/${entregasFolder.getId()}`,
        texto: 'PROPIETARIO'
      };
      
      // Link INQUILINO: ENTREGAS/.../[AÑO_RECIENTE]/DOCUMENTOS DE ENTREGA - INQUILINO
      var carpetaAnio = obtenerCarpetaAnioMasReciente(entregasFolder);
      if (carpetaAnio) {
        var inquilinoFolder = getFolderByName(carpetaAnio, 'DOCUMENTOS DE ENTREGA - INQUILINO');
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
// SINCRONIZAR CON PLANTILLA (COPIAR FALTANTES, RESPETAR EXISTENTES)
// ==========================================

function sincronizarConPlantilla(carpetaDestino, carpetaPlantilla, copiarArchivos, errores, contadores, indentacion) {
  indentacion = indentacion || '         ';
  
  try {
    // 1. COPIAR ARCHIVOS (si copiarArchivos = true)
    if (copiarArchivos) {
      var archivos = carpetaPlantilla.getFiles();
      
      while (archivos.hasNext()) {
        var archivo = archivos.next();
        var nombreArchivo = archivo.getName();
        
        // Verificar si ya existe
        var archivoExistente = buscarArchivoPorNombre(carpetaDestino, nombreArchivo);
        
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
      
      var carpetaExistente = getFolderByName(carpetaDestino, nombreCarpeta);
      
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
      sincronizarConPlantilla(
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
// BUSCAR ARCHIVO POR NOMBRE
// ==========================================

function buscarArchivoPorNombre(carpeta, nombreArchivo) {
  try {
    var archivos = carpeta.getFilesByName(nombreArchivo);
    return archivos.hasNext() ? archivos.next() : null;
  } catch (e) {
    return null;
  }
}
// ==========================================
// VERIFICACIÓN DE JERARQUÍA RPR - PARTE 3
// Funciones auxiliares y finalización
// Líneas 601-final
// ==========================================

// ==========================================
// GUARDAR PROGRESO PARA PARTE 2
// ==========================================

function guardarProgreso(resultado, todosLosRPRs) {
  var props = PropertiesService.getScriptProperties();
  
  var progreso = {
    indiceInicio: resultado.indiceUltimoProcesado + 1,
    rprsRestantes: resultado.rprsRestantes,
    rprsCompletados: resultado.rprsCompletados,
    rprsConError: resultado.rprsConError,
    totalRPRs: resultado.totalRPRs,
    timestamp: new Date().getTime()
  };
  
  props.setProperty('VERIFICACION_RPR_PROGRESO', JSON.stringify(progreso));
  Logger.log('💾 Progreso guardado para PARTE 2');
}

// ==========================================
// MOSTRAR RESUMEN FINAL
// ==========================================

function mostrarResumenFinal(resultado, tiempoInicio) {
  var tiempoTotal = (new Date().getTime() - tiempoInicio) / 1000;
  
  Logger.log('\n🔵 ═══════════════════════════════════════════════════');
  Logger.log('📊 RESUMEN FINAL DEL PROCESO');
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  Logger.log(`📁 Total de RPRs procesados: ${resultado.totalRPRs}`);
  Logger.log(`✅ RPRs exitosos: ${resultado.rprsCompletados}`);
  Logger.log(`❌ RPRs con errores: ${resultado.rprsConError.length}`);
  Logger.log(`⏱️ Tiempo total: ${tiempoTotal} segundos`);
  
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
  
  Logger.log('\n🔵 ═══════════════════════════════════════════════════');
  Logger.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
  Logger.log('🔵 ═══════════════════════════════════════════════════');
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function getColumnByName(sheet, columnName) {
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

function getFolderByName(parentFolder, folderName) {
  try {
    var folderIterator = parentFolder.getFoldersByName(folderName);
    return folderIterator.hasNext() ? folderIterator.next() : null;
  } catch (e) {
    return null;
  }
}

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
// FUNCIÓN AUXILIAR: PROBAR UN RPR ESPECÍFICO
// (Útil para debugging)
// ==========================================

function probarValidacionRPREspecifico() {
  Logger.log('🧪 MODO DE PRUEBA - Validando RPR específico');
  Logger.log('═══════════════════════════════════════════════════');
  
  try {
    // Cambiar este ID por el del RPR que quieres probar
    var RPR_ID_PRUEBA = 'XXXXXXXXXXXXXXXXXXXXXXX'; // ← Cambiar este ID
    
    Logger.log('📂 Obteniendo RPR de prueba...');
    var rprFolder = DriveApp.getFolderById(RPR_ID_PRUEBA);
    Logger.log(`✅ RPR encontrado: ${rprFolder.getName()}\n`);
    
    // Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_VERIFICACION.HOJA_PRINCIPAL);
    
    // Obtener plantillas
    var plantillaMaestra = DriveApp.getFolderById(CONFIG_VERIFICACION.PLANTILLA_MAESTRA_ID);
    var plantilla2 = obtenerPlantilla2(plantillaMaestra);
    
    if (!plantilla2) {
      throw new Error('No se pudo obtener PLANTILLA #2');
    }
    
    // Validar
    Logger.log('🔍 Iniciando validación...\n');
    var resultado = validarRPRCompleto(rprFolder, plantillaMaestra, plantilla2, sheet);
    
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
// FUNCIÓN AUXILIAR: VALIDAR TODOS LOS RPRs SIN LÍMITE DE TIEMPO
// (Para ejecutar manualmente si es necesario)
// ==========================================

function validarTodosLosRPRsSinLimite() {
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  Logger.log('🔵 VALIDACIÓN COMPLETA SIN LÍMITE DE TIEMPO');
  Logger.log('🔵 ═══════════════════════════════════════════════════');
  Logger.log('⚠️ ADVERTENCIA: Esta función puede tardar mucho tiempo');
  Logger.log('⚠️ Solo úsala si estás seguro de que no hay muchos RPRs\n');
  
  var tiempoInicio = new Date().getTime();
  
  try {
    // Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_VERIFICACION.HOJA_PRINCIPAL);
    
    // Obtener plantillas
    var plantillaMaestra = DriveApp.getFolderById(CONFIG_VERIFICACION.PLANTILLA_MAESTRA_ID);
    var carpetaPadre = DriveApp.getFolderById(CONFIG_VERIFICACION.PARENT_FOLDER_ID);
    var plantilla2 = obtenerPlantilla2(plantillaMaestra);
    
    // Obtener todos los RPRs
    var todosLosRPRs = obtenerTodosLosRPRs(carpetaPadre);
    Logger.log(`📊 Total de RPRs encontrados: ${todosLosRPRs.length}\n`);
    
    var rprsCompletados = 0;
    var rprsConError = [];
    
    // Procesar todos sin límite
    todosLosRPRs.forEach(function(rpr, index) {
      Logger.log(`🔍 [${index + 1}/${todosLosRPRs.length}] Validando: ${rpr.nombre}`);
      
      var resultado = validarRPRCompleto(rpr.folder, plantillaMaestra, plantilla2, sheet);
      
      if (resultado.exito) {
        rprsCompletados++;
        Logger.log(`✅ [${index + 1}/${todosLosRPRs.length}] Completado\n`);
      } else {
        rprsConError.push({
          nombre: rpr.nombre,
          error: resultado.error,
          detalles: resultado.detalles || []
        });
        Logger.log(`❌ [${index + 1}/${todosLosRPRs.length}] Error: ${resultado.error}\n`);
      }
    });
    
    // Mostrar resumen
    var tiempoTotal = (new Date().getTime() - tiempoInicio) / 1000;
    Logger.log('\n🔵 ═══════════════════════════════════════════════════');
    Logger.log('📊 RESUMEN FINAL');
    Logger.log('🔵 ═══════════════════════════════════════════════════');
    Logger.log(`✅ RPRs exitosos: ${rprsCompletados}`);
    Logger.log(`❌ RPRs con errores: ${rprsConError.length}`);
    Logger.log(`⏱️ Tiempo total: ${tiempoTotal} segundos`);
    
    if (rprsConError.length > 0) {
      Logger.log('\n⚠️ ERRORES:');
      rprsConError.forEach(function(item, index) {
        Logger.log(`${index + 1}. ${item.nombre}: ${item.error}`);
      });
    }
    
    Logger.log('🔵 ═══════════════════════════════════════════════════');
    
  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);
  }
}

// ==========================================
// FUNCIÓN AUXILIAR: LIMPIAR PROGRESO MANUALMENTE
// ==========================================

function limpiarProgresoManual() {
  Logger.log('🧹 Limpiando progreso guardado...');
  
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('VERIFICACION_RPR_PROGRESO');
  
  eliminarTrigger('continuarVerificacionRPRsParte2');
  
  Logger.log('✅ Progreso limpiado y triggers eliminados');
  Logger.log('ℹ️ Puedes ejecutar verificarJerarquiaRPRs() de nuevo');
}

// ==========================================
// FUNCIÓN AUXILIAR: VER PROGRESO ACTUAL
// ==========================================

function verProgresoActual() {
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
// FUNCIÓN AUXILIAR: INSERTAR LINKS DE UN REG ESPECÍFICO
// (Para corregir links manualmente)
// ==========================================

function insertarLinksPorCDR() {
  Logger.log('🔗 INSERTAR LINKS MANUALMENTE POR CDR');
  Logger.log('═══════════════════════════════════════════════════');
  
  try {
    // Cambiar este CDR por el que necesites
    var CDR_BUSCAR = 'REG_10-12-2025-C37_(CRA 8)_APTO-3'; // ← Cambiar aquí
    
    Logger.log(`🔍 Buscando REG con CDR: ${CDR_BUSCAR}`);
    
    // Obtener hoja
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG_VERIFICACION.HOJA_PRINCIPAL);
    
    // Buscar fila
    var fila = buscarFilaPorCDR(sheet, CDR_BUSCAR);
    
    if (fila === -1) {
      Logger.log('❌ No se encontró fila con ese CDR');
      return;
    }
    
    Logger.log(`✅ Fila encontrada: ${fila}`);
    
    // Buscar carpeta REG por nombre
    Logger.log('🔍 Buscando carpeta REG en Drive...');
    var regFolder = buscarCarpetaREGPorNombre(CDR_BUSCAR);
    
    if (!regFolder) {
      Logger.log('❌ No se encontró carpeta REG en Drive');
      return;
    }
    
    Logger.log(`✅ Carpeta REG encontrada: ${regFolder.getName()}`);
    
    // Insertar links
    var contadores = { linksInsertados: 0 };
    insertarLinksDelREG(sheet, regFolder, contadores);
    
    Logger.log('═══════════════════════════════════════════════════');
    Logger.log(`✅ Proceso completado - Links insertados: ${contadores.linksInsertados}`);
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
  }
}

function buscarCarpetaREGPorNombre(nombreREG) {
  try {
    var carpetaPadre = DriveApp.getFolderById(CONFIG_VERIFICACION.PARENT_FOLDER_ID);
    var todosLosRPRs = obtenerTodosLosRPRs(carpetaPadre);
    
    for (var i = 0; i < todosLosRPRs.length; i++) {
      var rprFolder = todosLosRPRs[i].folder;
      var inmueblesFolder = getFolderByName(rprFolder, 'INMUEBLES');
      
      if (!inmueblesFolder) continue;
      
      var tiposNegocio = ['ARRIENDO', 'VENTA', 'BI-NEGOCIO'];
      
      for (var j = 0; j < tiposNegocio.length; j++) {
        var carpetaTipoNegocio = getFolderByName(inmueblesFolder, tiposNegocio[j]);
        if (!carpetaTipoNegocio) continue;
        
        var regFolder = getFolderByName(carpetaTipoNegocio, nombreREG);
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
// FIN DEL ARCHIVO 1
// ==========================================

Logger.log('📄 VERIFICACIONCARPETADEREG cargado correctamente - v2.1-final');