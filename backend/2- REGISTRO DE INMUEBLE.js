// ==========================================
// REGISTRO DE INMUEBLES - ARCHIVO 2 - PARTE 1
// Procesamiento Diferido (Parte 2 del sistema)
// Versión: v10.2-final
// ==========================================

// ==========================================
// FUNCIÓN PRINCIPAL - CONTINUACIÓN DEL PROCESO
// ==========================================

function continuarRegistroInmuebleParte2() {
  var tiempoInicio = new Date().getTime();
  Logger.log('🟢 ═══════════════════════════════════════════════════');
  Logger.log('🟢 ARCHIVO 2 - INICIO DEL PROCESAMIENTO DIFERIDO');
  Logger.log('🟢 ═══════════════════════════════════════════════════');

  try {
    // PASO 1: Recuperar registros pendientes
    Logger.log('💾 Recuperando datos guardados...');
    var props = PropertiesService.getScriptProperties();
    var todasPropiedades = props.getProperties();
    var procesosPendientes = [];

    for (var key in todasPropiedades) {
      if (key.startsWith('PROCESO_PARTE2_')) {
        try {
          var datos = JSON.parse(todasPropiedades[key]);
          procesosPendientes.push(datos);
        } catch (e) {
          Logger.log(`⚠️ Error al parsear propiedad ${key}: ${e.message}`);
        }
      }
    }

    if (procesosPendientes.length === 0) {
      Logger.log('⚠️ No hay procesos pendientes para Archivo 2');
      eliminarTriggerActual('continuarRegistroInmuebleParte2');
      return;
    }

    Logger.log(`📋 Procesando ${procesosPendientes.length} registro(s) pendiente(s)`);

    // PASO 2: Procesar cada registro
    procesosPendientes.forEach(function (datos) {
      Logger.log(`\n🔧 ═══════════════════════════════════════════════════`);
      Logger.log(`🔧 Procesando fila ${datos.fila} - Tipo: ${datos.tipoRegistro.tipo}`);
      Logger.log(`🔧 ═══════════════════════════════════════════════════`);

      procesarRegistroParte2(datos);

      // Limpiar datos después de procesar
      props.deleteProperty('PROCESO_PARTE2_' + datos.fila);
    });

    // PASO 3: Eliminar trigger temporal
    eliminarTriggerActual('continuarRegistroInmuebleParte2');

    var tiempoTotal = (new Date().getTime() - tiempoInicio) / 1000;
    Logger.log('🟢 ═══════════════════════════════════════════════════');
    Logger.log(`✅ ARCHIVO 2 - COMPLETO en ${tiempoTotal} segundos`);
    Logger.log('🟢 ═══════════════════════════════════════════════════');

  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO en Archivo 2: ' + error.message);
    Logger.log('📍 Stack: ' + error.stack);
  }
}

// ==========================================
// PROCESAMIENTO POR REGISTRO
// ==========================================

function procesarRegistroParte2(datos) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('1.1 - INMUEBLES REGISTRADOS');

  var backupFiltro = null;
  var row = datos.fila;

  try {
    // Respaldar y eliminar filtros en Archivo 2
    backupFiltro = removerYRespaldarFiltros(sheet);

    // NUEVO: Ejecutar Motor Autocrat Nativo inmediatamente en lugar de esperar 60s
    var tipoNegocio = datos.datosInmueble.tipoNegocio;
    try {
      // Si el motor existe, generamos el PDF y su ID queda en la hoja
      if (typeof generarDocumentoNativo === 'function') {
        Logger.log('⚡ Disparando Motor Autocrat Nativo...');
        generarDocumentoNativo(sheet, row, tipoNegocio, DriveApp.getRootFolder());
      } else {
        Logger.log('⚠️ Motor Autocrat Nativo no encontrado.');
      }
    } catch (e) {
      Logger.log('⚠️ Error al ejecutar Motor Autocrat Nativo: ' + e.message);
    }

    // Procesar según tipo detectado
    switch (datos.tipoRegistro.tipo) {
      case 'TIPO_3': // Anteriormente TIPO_1_1
        Logger.log('🏢 Ejecutando TIPO 3: Nuevo inmueble mismo propietario');
        procesarTipo11_NuevoInmueble(sheet, row, datos);
        break;

      case 'TIPO_2': // Anteriormente TIPO_1_2
        Logger.log('🔄 Ejecutando TIPO 2: Renovación');
        procesarTipo12_Renovacion(sheet, row, datos);
        break;

      case 'TIPO_4': // Anteriormente TIPO_1_3
        Logger.log('🔀 Ejecutando TIPO 4: Cambio de tipo de negocio');
        procesarTipo13_CambioTipoNegocio(sheet, row, datos);
        break;

      case 'TIPO_1': // Anteriormente TIPO_4
        Logger.log('🆕 Ejecutando TIPO 1: Nuevo propietario');
        procesarTipo4_NuevoPropietario(sheet, row, datos);
        break;

      default:
        Logger.log(`⚠️ Tipo desconocido: ${datos.tipoRegistro.tipo}`);
        break;
    }

    // --- NUEVO: Enviar correo de firma inicial (Solo para Tipos 1 y 3) ---
    // (Para TIPO 2 y TIPO 4 ya se envía internamente antes de borrar la fila temporal)
    if (datos.tipoRegistro.tipo === 'TIPO_1' || datos.tipoRegistro.tipo === 'TIPO_3') {
      try {
        enviarCorreoFirmaInicial(sheet, row, datos.cdr, datos.datosInmueble.tipoNegocio);
      } catch(err) {
        Logger.log('⚠️ Error no bloqueante al enviar correo de firma: ' + err.message);
      }
    }

    Logger.log(`✅ Fila ${row} procesada correctamente`);

  } catch (error) {
    Logger.log(`❌ ERROR en fila ${row}: ${error.message}`);
    Logger.log('📍 Stack: ' + error.stack);
    marcarErrorEnFila(sheet, row, error.message);
  } finally {
    // Restaurar filtros siempre
    if (sheet && backupFiltro) {
      restaurarFiltros(sheet, backupFiltro);
    }
  }
}

// ==========================================
// TIPO 1.1: NUEVO INMUEBLE MISMO PROPIETARIO
// ==========================================

function procesarTipo11_NuevoInmueble(sheet, row, datos) {
  Logger.log('📂 Creando nuevo REG desde PLANTILLA #1 maestra...');

  // 1. Obtener carpeta RPR
  var rprFolder = DriveApp.getFolderById(datos.rprFolderId);
  var inmueblesFolder = getFolderByName(rprFolder, 'INMUEBLES');

  if (!inmueblesFolder) {
    throw new Error('No se encontró carpeta INMUEBLES en RPR');
  }

  // 2. Asegurar carpetas de tipo de negocio
  asegurarCarpetasTipoNegocio(inmueblesFolder);

  // 3. Obtener carpeta de tipo de negocio destino
  var carpetaNegocio = datos.tipoRegistro.carpetaNegocio;
  var carpetaNegocioFolder = getFolderByName(inmueblesFolder, carpetaNegocio);

  if (!carpetaNegocioFolder) {
    throw new Error(`No se encontró carpeta ${carpetaNegocio}`);
  }

  // 4. Acceder a PLANTILLA #1 MAESTRA
  Logger.log('🔍 Accediendo a PLANTILLA #1 maestra...');
  var plantillaMaestra = DriveApp.getFolderById('1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH');

  // 5. Navegar a PLANTILLA #2 dentro de la maestra
  var inmueblesPlantilla = getFolderByName(plantillaMaestra, 'INMUEBLES');
  if (!inmueblesPlantilla) {
    throw new Error('No se encontró carpeta INMUEBLES en PLANTILLA #1');
  }

  var arriendoPlantilla = getFolderByName(inmueblesPlantilla, 'ARRIENDO');
  if (!arriendoPlantilla) {
    throw new Error('No se encontró carpeta ARRIENDO en PLANTILLA #1');
  }

  var plantilla2 = getFolderByName(arriendoPlantilla, 'PLANTILLA #2');
  if (!plantilla2) {
    throw new Error('No se encontró PLANTILLA #2 en PLANTILLA #1 maestra');
  }

  Logger.log('✅ PLANTILLA #2 encontrada en plantilla maestra');

  // 6. Crear carpeta del nuevo REG en la ubicación destino
  var cdr = datos.cdr;
  var nuevoREG = carpetaNegocioFolder.createFolder(cdr);
  Logger.log(`📁 Carpeta REG creada: ${cdr}`);

  // 7. Copiar toda la estructura de PLANTILLA #2
  Logger.log('📋 Copiando estructura completa de PLANTILLA #2...');
  copiarContenidoCompleto(plantilla2, nuevoREG);
  Logger.log('✅ Estructura copiada completamente');

  // 8. Renombrar carpeta XXXX a año actual
  renombrarCarpetaAnioEnREG(nuevoREG);

  // 9. Mover archivos de Autocrat
  Logger.log('📦 Moviendo archivos de Autocrat...');
  moverArchivosAutocratTipo11(sheet, row, nuevoREG);

  // 10. Insertar links en la hoja
  Logger.log('🔗 Insertando links...');
  insertarLinksTipo11(sheet, row, rprFolder, nuevoREG, datos);

  // 11. Extraer descripción de Autocrat (NUEVO)
  try {
    procesarYGuardarDescripcion(sheet, row, nuevoREG);
  } catch (e) {
    Logger.log('⚠️ Error no bloqueante en extracción descripción: ' + e.message);
  }

  // 12. Actualizar estado final
  actualizarEstadoFinal(sheet, row, 'TIPO_3');

  Logger.log('✅ TIPO 3 completado');
}

// ==========================================
// TIPO 4: NUEVO PROPIETARIO
// ==========================================

function procesarTipo4_NuevoPropietario(sheet, row, datos) {
  Logger.log('📂 Procesando nuevo propietario - Configurando carpeta REG...');

  // 1. Obtener carpeta RPR
  var rprFolder = DriveApp.getFolderById(datos.rprFolderId);
  var inmueblesFolder = getFolderByName(rprFolder, 'INMUEBLES');

  if (!inmueblesFolder) {
    throw new Error('No se encontró carpeta INMUEBLES en RPR');
  }

  // 2. Asegurar carpetas de tipo de negocio
  asegurarCarpetasTipoNegocio(inmueblesFolder);

  // 3. Determinar carpeta destino según tipo de negocio
  var tipoNegocio = datos.datosInmueble.tipoNegocio;
  var carpetaNegocio = determinarCarpetaNegocio(tipoNegocio);
  Logger.log(`📂 Carpeta de negocio: ${carpetaNegocio}`);

  var carpetaNegocioFolder = getFolderByName(inmueblesFolder, carpetaNegocio);

  if (!carpetaNegocioFolder) {
    throw new Error(`No se encontró carpeta ${carpetaNegocio}`);
  }

  // 4. Buscar PLANTILLA #2 en ARRIENDO
  var arriendoFolder = getFolderByName(inmueblesFolder, 'ARRIENDO');
  if (!arriendoFolder) {
    throw new Error('No se encontró carpeta ARRIENDO');
  }

  var plantillaFolder = getFolderByName(arriendoFolder, 'PLANTILLA #2');
  if (!plantillaFolder) {
    throw new Error('No se encontró PLANTILLA #2');
  }

  // 5. Mover PLANTILLA #2 a carpeta destino si es necesario
  if (carpetaNegocio !== 'ARRIENDO') {
    Logger.log(`🚚 Moviendo PLANTILLA #2 a: ${carpetaNegocio}`);
    plantillaFolder.moveTo(carpetaNegocioFolder);
  }

  // 6. Renombrar PLANTILLA #2 con el CDR
  var cdr = datos.cdr;
  plantillaFolder.setName(cdr);
  Logger.log(`✅ REG creado: ${cdr}`);

  // 7. Renombrar carpeta XXXX a año actual
  renombrarCarpetaAnioEnREG(plantillaFolder);

  // 8. Mover archivos de Autocrat
  Logger.log('📦 Moviendo archivos de Autocrat...');
  moverArchivosAutocratTipo11(sheet, row, plantillaFolder);

  // 9. Insertar links en la hoja
  Logger.log('🔗 Insertando links...');
  insertarLinksTipo11(sheet, row, rprFolder, plantillaFolder, datos);

  // 10. Extraer descripción de Autocrat (NUEVO)
  try {
    procesarYGuardarDescripcion(sheet, row, plantillaFolder);
  } catch (e) {
    Logger.log('⚠️ Error no bloqueante en extracción descripción: ' + e.message);
  }

  // 11. Actualizar estado final
  actualizarEstadoFinal(sheet, row, 'TIPO_1');

  Logger.log('✅ TIPO 1 completado');
}
// ==========================================
// REGISTRO DE INMUEBLES - ARCHIVO 2 - PARTE 2
// Continuación del procesamiento
// Líneas 301-600
// ==========================================

// ==========================================
// TIPO 1.2: RENOVACIÓN (CREAR AÑO NUEVO)
// ==========================================

function procesarTipo12_Renovacion(sheet, row, datos) {
  Logger.log('🔄 Procesando renovación - Creando año nuevo...');

  // 1. Recuperar carpeta REG existente usando el ID guardado
  var regFolderId = datos.tipoRegistro.regExistenteId;
  if (!regFolderId) {
    throw new Error('No se encontró ID del REG existente');
  }

  var regFolder = DriveApp.getFolderById(regFolderId);
  Logger.log(`📂 REG existente: ${regFolder.getName()}`);

  // 2. Obtener carpeta ENTREGAS DEL INMUEBLE
  var entregasFolder = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
  if (!entregasFolder) {
    throw new Error('No se encontró carpeta ENTREGAS DEL INMUEBLE');
  }

  // 3. Determinar nombre del nuevo año
  Logger.log('📅 Determinando nombre del año nuevo...');
  var resultadoAnio = determinarNombreNuevoAnio(entregasFolder);

  if (!resultadoAnio.valido) {
    // Límite alcanzado - marcar advertencia y no continuar
    Logger.log(`⚠️ ${resultadoAnio.mensaje}`);
    marcarAdvertenciaEnFila(sheet, row, resultadoAnio.mensaje);
    return; // No borrar fila auxiliar
  }

  Logger.log(`✅ Nombre del año nuevo: ${resultadoAnio.nombre}`);
  Logger.log(`📝 ${resultadoAnio.mensaje}`);

  // 4. Acceder a PLANTILLA #1 MAESTRA para copiar XXXX
  Logger.log('🔍 Accediendo a PLANTILLA #1 maestra para copiar XXXX...');
  var plantillaMaestra = DriveApp.getFolderById('1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH');

  // 5. Navegar a PLANTILLA #2/ENTREGAS DEL INMUEBLE/XXXX
  var inmueblesPlantilla = getFolderByName(plantillaMaestra, 'INMUEBLES');
  if (!inmueblesPlantilla) {
    throw new Error('No se encontró carpeta INMUEBLES en PLANTILLA #1');
  }

  var arriendoPlantilla = getFolderByName(inmueblesPlantilla, 'ARRIENDO');
  if (!arriendoPlantilla) {
    throw new Error('No se encontró carpeta ARRIENDO en PLANTILLA #1');
  }

  var plantilla2 = getFolderByName(arriendoPlantilla, 'PLANTILLA #2');
  if (!plantilla2) {
    throw new Error('No se encontró PLANTILLA #2 en PLANTILLA #1 maestra');
  }

  var entregasPlantilla = getFolderByName(plantilla2, 'ENTREGAS DEL INMUEBLE');
  if (!entregasPlantilla) {
    throw new Error('No se encontró ENTREGAS DEL INMUEBLE en PLANTILLA #2');
  }

  var carpetaXXXX = getFolderByName(entregasPlantilla, 'XXXX');
  if (!carpetaXXXX) {
    throw new Error('No se encontró carpeta XXXX en PLANTILLA #1 maestra');
  }

  Logger.log('✅ Carpeta XXXX encontrada en plantilla maestra');

  // 6. Crear carpeta del nuevo año en ENTREGAS DEL INMUEBLE del REG
  var carpetaNuevoAnio = entregasFolder.createFolder(resultadoAnio.nombre);
  Logger.log(`📁 Carpeta creada: ${resultadoAnio.nombre}`);

  // 7. Copiar estructura completa de XXXX
  Logger.log('📂 Copiando jerarquía completa desde XXXX...');
  copiarEstructuraAnio(carpetaXXXX, carpetaNuevoAnio);
  Logger.log('✅ Estructura copiada');

  // 8. Mover archivos de Autocrat al REG existente
  Logger.log('📦 Moviendo archivos de Autocrat...');
  moverArchivosAutocratTipo12(sheet, row, regFolder);

  // 9. Implementar Fase 1 del Rollback: Backup y Transferencia
  var filaOriginal = datos.tipoRegistro.filaOriginal;
  if (filaOriginal > 0) {
    Logger.log(`💾 Respaldando datos y transfiriendo a fila original: ${filaOriginal}`);
    
    // Obtener ID DE REGISTRO para el backup
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colId = headers.indexOf('ID DE REGISTRO');
    var idRegistro = colId !== -1 ? sheet.getRange(filaOriginal, colId + 1).getValue() : datos.cdr;
    
    // 9.1 Respaldar datos viejos en la Nube Oculta
    respaldarDatosFila(sheet, filaOriginal, idRegistro);
    
    // 9.2 Transferir precios y limpiar candado multimedia
    transferirPreciosRenovacion(sheet, filaOriginal, row);
    
    // 9.2.1 Transferir características del formulario (zonas, estrato, áreas, etc)
    transferirCaracteristicasFormulario(sheet, filaOriginal, datos);
    
    // 9.3 Actualizar links
    actualizarLinksTipo12(sheet, filaOriginal, row, carpetaNuevoAnio, regFolder);
    
    // 9.4 Actualizar estado a Pendiente de Firma
    actualizarEstadoFinal(sheet, filaOriginal, 'TIPO_2_PENDIENTE');
  } else {
    Logger.log('⚠️ No se encontró fila original, no se actualizan links ni se realiza el Rollback');
  }

  // 10. BORRAR fila temporal (la que creó Autocrat)
  Logger.log(`🗑️ Borrando fila temporal: ${row}`);
  borrarFilaTemporal(sheet, row);

  // 11. Programar Triggers (Fase 2 Rollback)
  if (filaOriginal > 0) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colId = headers.indexOf('ID DE REGISTRO');
    var idRegistro = colId !== -1 ? sheet.getRange(filaOriginal, colId + 1).getValue() : datos.cdr;
    
    var colEmail = headers.indexOf('Correo electrónico');
    var email = colEmail !== -1 ? sheet.getRange(filaOriginal, colEmail + 1).getValue() : '';
    
    if (email) {
      programarTriggersRollback(idRegistro, email);
    }
    
    try {
      enviarCorreoFirmaInicial(sheet, filaOriginal, datos.cdr, datos.datosInmueble.tipoNegocio);
      Logger.log('📧 Correo de firma de renovación enviado al propietario.');
    } catch(e) {
      Logger.log('⚠️ Error enviando correo de firma: ' + e.message);
    }
  }

  Logger.log('✅ TIPO 2 (Fase 1 completada)');
}

function determinarNombreNuevoAnio(carpetaEntregas) {
  var anioActual = new Date().getFullYear();
  var carpetasExistentes = [];

  // Leer todas las carpetas hijas
  var folders = carpetaEntregas.getFolders();
  while (folders.hasNext()) {
    var folder = folders.next();
    var nombre = folder.getName();

    // Filtrar solo carpetas que sean años (YYYY o YYYY-2 o YYYY-3, etc.)
    // Ignorar XXXX
    if (nombre !== 'XXXX' && nombre.match(/^\d{4}(-\d+)?$/)) {
      carpetasExistentes.push(nombre);
    }
  }

  Logger.log(`📊 Carpetas de año existentes: ${carpetasExistentes.join(', ')}`);

  // Verificar cuántas carpetas del año actual existen
  var carpetasAnioActual = carpetasExistentes.filter(function (c) {
    return c.startsWith(anioActual.toString());
  });

  if (carpetasAnioActual.length === 0) {
    // Primera renovación de este año
    return {
      valido: true,
      nombre: anioActual.toString(),
      mensaje: `Primera renovación de ${anioActual}`
    };
  } else if (carpetasAnioActual.length === 1) {
    // Segunda renovación de este año
    return {
      valido: true,
      nombre: anioActual + '-2',
      mensaje: `Segunda renovación de ${anioActual}`
    };
  } else {
    // Tercera+ renovación - PERMITIR con advertencia
    var siguiente = carpetasAnioActual.length + 1;
    return {
      valido: true,
      nombre: anioActual + '-' + siguiente,
      mensaje: `⚠️ ADVERTENCIA: Renovación #${siguiente} en ${anioActual}. ` +
        `Se recomienda revisar con el administrador. ` +
        `Número inusualmente alto de renovaciones en un mismo año.`
    };
  }
}

// ==========================================
// FUNCIONES AUXILIARES PARA RENOVACIÓN
// ==========================================

function copiarEstructuraAnio(carpetaOrigen, carpetaDestino) {
  try {
    // NO copiar archivos, solo estructura de carpetas vacías
    var folders = carpetaOrigen.getFolders();

    while (folders.hasNext()) {
      var folder = folders.next();
      var nombreSubcarpeta = folder.getName();

      // Crear subcarpeta en destino
      var nuevaSubcarpeta = carpetaDestino.createFolder(nombreSubcarpeta);

      // Recursión para copiar estructura interna
      copiarEstructuraAnio(folder, nuevaSubcarpeta);
    }
  } catch (error) {
    Logger.log(`⚠️ Error al copiar estructura: ${error.message}`);
  }
}

// ==========================================
// TIPO 1.3: CAMBIO DE TIPO DE NEGOCIO
// ==========================================

function procesarTipo13_CambioTipoNegocio(sheet, row, datos) {
  Logger.log('🔀 Procesando cambio de tipo de negocio...');

  // 1. Recuperar carpeta REG existente usando el ID guardado
  var regFolderId = datos.tipoRegistro.regExistenteId;
  if (!regFolderId) {
    throw new Error('No se encontró ID del REG existente');
  }

  var regFolder = DriveApp.getFolderById(regFolderId);
  var nombreAntiguo = regFolder.getName();
  Logger.log(`📂 REG actual: ${nombreAntiguo}`);

  // 2. Generar nuevo CDR con nuevo tipo de negocio
  Logger.log('🔢 Generando nuevo CDR...');
  var nuevoCDR = generarNuevoCDRParaCambioTipo(sheet, datos);
  Logger.log(`✅ Nuevo CDR: ${nuevoCDR}`);

  // 3. Renombrar carpeta REG en Drive
  Logger.log('✏️ Renombrando carpeta REG...');
  regFolder.setName(nuevoCDR);
  Logger.log(`✅ Carpeta renombrada: ${nombreAntiguo} → ${nuevoCDR}`);

  // 4. Mover carpeta REG a nueva ubicación
  var carpetaOrigen = datos.tipoRegistro.carpetaOrigen;
  var carpetaDestino = datos.tipoRegistro.carpetaDestino;

  if (carpetaOrigen !== carpetaDestino) {
    Logger.log(`🚚 Moviendo de ${carpetaOrigen} a ${carpetaDestino}...`);

    var rprFolder = DriveApp.getFolderById(datos.rprFolderId);
    var inmueblesFolder = getFolderByName(rprFolder, 'INMUEBLES');
    var carpetaDestinoFolder = getFolderByName(inmueblesFolder, carpetaDestino);

    if (carpetaDestinoFolder) {
      regFolder.moveTo(carpetaDestinoFolder);
      Logger.log(`✅ REG movido exitosamente`);
    } else {
      Logger.log(`⚠️ No se encontró carpeta destino: ${carpetaDestino}`);
    }
  } else {
    Logger.log('ℹ️ REG permanece en la misma carpeta de negocio');
  }

  // 5. Mover archivos de Autocrat al REG
  Logger.log('📦 Moviendo archivos de Autocrat...');
  moverArchivosAutocratTipo13(sheet, row, regFolder);

  // 6. Backup y Transferencia de Precios (Fase 1 Rollback TIPO 4)
  var filaOriginal = datos.tipoRegistro.filaOriginal;
  if (filaOriginal > 0) {
    Logger.log(`💾 Respaldando datos para Rollback TIPO 4 en fila original: ${filaOriginal}`);
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colId = headers.indexOf('ID DE REGISTRO');
    var idRegistro = colId !== -1 ? sheet.getRange(filaOriginal, colId + 1).getValue() : datos.cdr;
    
    // Backup espacial (saber a dónde devolver la carpeta si se cancela)
    var spatialData = {
      carpetaOrigen: datos.tipoRegistro.carpetaOrigen,
      carpetaDestino: datos.tipoRegistro.carpetaDestino,
      nuevoCDR: nuevoCDR // Lo guardamos para saber a qué carpeta hacer el rename reverso
    };
    respaldarDatosFila(sheet, filaOriginal, idRegistro, spatialData);
    
    // Transferir precios actualizados del nuevo formulario
    transferirPreciosRenovacion(sheet, filaOriginal, row);

    // Transferir características del formulario (zonas, estrato, áreas, etc)
    transferirCaracteristicasFormulario(sheet, filaOriginal, datos);

    // 6.1 Actualizar CDR en la FILA ORIGINAL
    Logger.log(`📝 Actualizando CDR en fila original: ${filaOriginal}`);
    var cdrCol = getColumnByName(sheet, 'CODIGO DE REGISTRO');
    sheet.getRange(filaOriginal, cdrCol).setValue(nuevoCDR);
    Logger.log(`✅ CDR actualizado: ${nuevoCDR}`);

    // 7. Actualizar TIPO DE NEGOCIO en la FILA ORIGINAL
    Logger.log(`📝 Actualizando TIPO DE NEGOCIO en fila original: ${filaOriginal}`);
    var tipoNegocioCol = getColumnByName(sheet, 'TIPO DE NEGOCIO');
    var nuevoTipoNegocio = datos.datosInmueble.tipoNegocio;
    sheet.getRange(filaOriginal, tipoNegocioCol).setValue(nuevoTipoNegocio);
    Logger.log(`✅ TIPO DE NEGOCIO actualizado: ${nuevoTipoNegocio}`);

    // 8. Actualizar link de REG (texto del hipervínculo) en la FILA ORIGINAL
    Logger.log(`🔗 Actualizando link de REG en fila original: ${filaOriginal}`);
    var linkREGCol = getColumnByName(sheet, 'LINK DE CARPETA REG');
    var codigoCortoNuevo = extraerCodigoCortoREG(nuevoCDR);
    var regUrl = `https://drive.google.com/drive/folders/${regFolder.getId()}`;
    var formulaNueva = `=HYPERLINK("${regUrl}";"${codigoCortoNuevo}")`;
    sheet.getRange(filaOriginal, linkREGCol).setFormula(formulaNueva);
    Logger.log(`✅ Link REG actualizado: ${codigoCortoNuevo}`);

    // 9. Agregar links de Autocrat (solo si están vacíos)
    Logger.log('🔗 Agregando links de nuevos documentos...');
    agregarLinksTipo13(sheet, filaOriginal, row);
  }

  // 10. Extraer descripción de Autocrat (NUEVO - Usando fila de autocrat "row" para leer IDs)
  try {
    procesarYGuardarDescripcion(sheet, row, regFolder);
  } catch (e) {
    Logger.log('⚠️ Error no bloqueante en extracción descripción: ' + e.message);
  }

  // 11. BORRAR fila temporal
  Logger.log(`🗑️ Borrando fila temporal: ${row}`);
  borrarFilaTemporal(sheet, row);

  // 12. Actualizar estado final en fila ORIGINAL (TIPO_4_PENDIENTE) y Programar Triggers
  if (filaOriginal > 0) {
    actualizarEstadoFinal(sheet, filaOriginal, 'TIPO_4_PENDIENTE');
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colId = headers.indexOf('ID DE REGISTRO');
    var idRegistro = colId !== -1 ? sheet.getRange(filaOriginal, colId + 1).getValue() : datos.cdr;
    
    var colEmail = headers.indexOf('Correo electrónico');
    var email = colEmail !== -1 ? sheet.getRange(filaOriginal, colEmail + 1).getValue() : '';
    
    if (email) {
      programarTriggersRollback(idRegistro, email);
    }
    
    try {
      enviarCorreoFirmaInicial(sheet, filaOriginal, datos.cdr, datos.datosInmueble.tipoNegocio);
      Logger.log('📧 Correo de firma de Cambio de Negocio enviado al propietario.');
    } catch(e) {
      Logger.log('⚠️ Error enviando correo de firma: ' + e.message);
    }
  }

  Logger.log('✅ TIPO 4 (Fase 1 y Triggers completados)');
}

function generarNuevoCDRParaCambioTipo(sheet, datos) {
  // Obtener tipo de negocio nuevo
  var tipoNegocioNuevo = datos.datosInmueble.tipoNegocio;
  var codigoNuevo = obtenerCodigoTipoNegocio(tipoNegocioNuevo);

  // Calcular secuencia para el nuevo tipo
  var secuencia = calcularSecuenciaParaTipo(sheet, codigoNuevo);

  // Obtener componentes del CDR antiguo
  var cdrAntiguo = datos.cdr;
  var fecha = extraerFechaDeCDR(cdrAntiguo);
  var direccion = datos.datosInmueble.direccion;
  var torre = datos.datosInmueble.torre;
  var apto = datos.datosInmueble.apto;

  // Construir nuevo CDR
  var nuevoCDR = `REG_${fecha}-${codigoNuevo}${secuencia}_(${direccion})`;
  if (torre) {
    nuevoCDR += `_TORRE-${torre}`;
  }
  nuevoCDR += `_APTO-${apto}`;

  return nuevoCDR;
}

function extraerFechaDeCDR(cdr) {
  var match = cdr.match(/REG_(\d{2}-\d{2}-\d{4})/);
  return match ? match[1] : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
}

function calcularSecuenciaParaTipo(sheet, tipoNegocioCode) {
  var cdrCol = getColumnByName(sheet, 'CODIGO DE REGISTRO');
  var lastRow = sheet.getLastRow();
  var registros = sheet.getRange(2, cdrCol, lastRow - 1, 1).getValues();

  var maxSecuencia = 0;

  registros.forEach(function (registro) {
    var cdrValue = registro[0];
    if (!cdrValue) return;

    var pattern = new RegExp('REG_\\d{2}-\\d{2}-\\d{4}-' + tipoNegocioCode + '(\\d+)');
    var match = cdrValue.toString().match(pattern);

    if (match) {
      var seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSecuencia) {
        maxSecuencia = seq;
      }
    }
  });

  // NUEVO: Consultar el récord histórico en la "nube oculta" (PropertiesService)
  var props = PropertiesService.getScriptProperties();
  var maxMemoriaStr = props.getProperty('MAX_SEQ_' + tipoNegocioCode);
  var maxMemoria = maxMemoriaStr ? parseInt(maxMemoriaStr, 10) : 0;

  // Tomar el mayor entre lo que hay en el Excel y el récord histórico
  var maxActual = Math.max(maxSecuencia, maxMemoria);

  var nuevaSecuencia = maxActual + 1;

  // Guardar el nuevo récord en la memoria oculta
  props.setProperty('MAX_SEQ_' + tipoNegocioCode, nuevaSecuencia.toString());

  return nuevaSecuencia;
}
// ==========================================
// REGISTRO DE INMUEBLES - ARCHIVO 2 - PARTE 3
// Continuación del procesamiento
// Líneas 601-900
// ==========================================

// ==========================================
// MOVIMIENTO DE ARCHIVOS DE AUTOCRAT
// ==========================================

function moverArchivosAutocratTipo11(sheet, row, regFolder) {
  // Para TIPO 1.1 y TIPO 4: Mover archivos al nuevo REG
  var autorizacionesFolder = obtenerCarpetaAutorizaciones(regFolder);

  if (!autorizacionesFolder) {
    Logger.log('⚠️ No se encontró carpeta AUTORIZACIONES');
    return;
  }

  moverArchivosDesdeFilaADestino(sheet, row, autorizacionesFolder);
}

function moverArchivosAutocratTipo12(sheet, row, regFolder) {
  // Para TIPO 1.2: Mover archivos al REG existente
  var autorizacionesFolder = obtenerCarpetaAutorizaciones(regFolder);

  if (!autorizacionesFolder) {
    Logger.log('⚠️ No se encontró carpeta AUTORIZACIONES');
    return;
  }

  moverArchivosDesdeFilaADestino(sheet, row, autorizacionesFolder);
}

function moverArchivosAutocratTipo13(sheet, row, regFolder) {
  // Para TIPO 1.3: Mover archivos al REG (mismo que TIPO 1.2)
  var autorizacionesFolder = obtenerCarpetaAutorizaciones(regFolder);

  if (!autorizacionesFolder) {
    Logger.log('⚠️ No se encontró carpeta AUTORIZACIONES');
    return;
  }

  moverArchivosDesdeFilaADestino(sheet, row, autorizacionesFolder);
}

function obtenerCarpetaAutorizaciones(regFolder) {
  var archivosFolder = getFolderByName(regFolder, 'ARCHIVOS DEL INMUEBLE');
  if (!archivosFolder) {
    return null;
  }

  var autorizacionesFolder = getFolderByName(archivosFolder, 'AUTORIZACIONES DE COMERCIALIZACIÓN');
  return autorizacionesFolder;
}

function moverArchivosDesdeFilaADestino(sheet, row, destinoFolder) {
  var columnasArchivos = [
    'Merged Doc ID - CORRETAJE',
    'Merged Doc ID - ADMINISTRACIÓN',
    'Merged Doc ID - VENTA',
    'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
    'Merged Doc ID - ADMI-VENTA',
    'Merged Doc ID - VENDI-RENTA'
  ];

  var archivosMovidos = 0;

  columnasArchivos.forEach(function (nombreCol) {
    var colIndex = getColumnByName(sheet, nombreCol);
    if (!colIndex) return;

    var fileId = sheet.getRange(row, colIndex).getValue();
    if (!fileId) return;

    try {
      var file = DriveApp.getFileById(fileId);

      // Verificar si ESTE archivo específico ya está en la carpeta destino (por si se reejecuta)
      var parents = file.getParents();
      var yaEnDestino = false;
      while (parents.hasNext()) {
        if (parents.next().getId() === destinoFolder.getId()) {
          yaEnDestino = true;
          break;
        }
      }

      if (yaEnDestino) {
        Logger.log(`ℹ️ El archivo ya se encuentra en la carpeta destino: ${file.getName()}`);
      } else {
        file.moveTo(destinoFolder);
        archivosMovidos++;
        Logger.log(`✅ Archivo movido: ${file.getName()}`);
      }
    } catch (e) {
      Logger.log(`⚠️ Error al mover archivo con ID ${fileId}: ${e.message}`);
    }
  });

  Logger.log(`📦 Total archivos movidos: ${archivosMovidos}`);
}

// ==========================================
// ENVÍO DE CORREO SALA DE FIRMAS
// ==========================================

function enviarCorreoFirmaInicial(sheet, row, cdr, tipoNegocio) {
  var emailCol = getColumnByName(sheet, 'Correo electrónico');
  var nombreCol = getColumnByName(sheet, 'NOMBRES Y APELLIDOS DEL PROPIETARIO');
  
  if (!emailCol || !nombreCol) {
    Logger.log('⚠️ No se puede enviar correo: Falta columna email o nombre');
    return;
  }

  var docIdColName = '';
  var subject = '';
  var tipoActaTexto = '';

  switch(tipoNegocio) {
    case 'Administración':
      docIdColName = 'Merged Doc ID - ADMINISTRACIÓN';
      subject = 'ACTA DE PROMOCION Y ADMINISTRACION DEL INMUEBLE DE <<nombre>> - REAL ESTATE Gold Life System';
      tipoActaTexto = 'Acta de administración';
      break;
    case 'Venta':
      docIdColName = 'Merged Doc ID - VENTA';
      subject = 'ACTA DE PROMOCION DE VENTA DEL INMUEBLE DE <<nombre>> - REAL ESTATE Gold Life System';
      tipoActaTexto = 'Acta para la promoción en venta';
      break;
    case 'Admi-Venta':
      docIdColName = 'Merged Doc ID - ADMI-VENTA';
      subject = 'ACTA DE PROMOCION DE ADMI-VENTA DEL INMUEBLE DE <<nombre>> - REAL ESTATE Gold Life System';
      tipoActaTexto = 'Acta de promoción de Admi-Venta';
      break;
    case 'Vendi-Renta':
      docIdColName = 'Merged Doc ID - VENDI-RENTA';
      subject = 'ACTA DE PROMOCION DE VENDI-RENTA DEL INMUEBLE DE <<nombre>> - REAL ESTATE Gold Life System';
      tipoActaTexto = 'Acta de promoción de Vendi-Renta';
      break;
    case 'Corretaje':
    default:
      docIdColName = 'Merged Doc ID - CORRETAJE';
      subject = 'ACTA DE PROMOCIÓN DE ARRENDAMIENTO DEL INMUEBLE DE <<nombre>> - REAL ESTATE Gold Life System';
      tipoActaTexto = 'Acta de Promoción en Arriendo';
      break;
  }

  var docIdCol = getColumnByName(sheet, docIdColName);
  if (!docIdCol) {
    Logger.log('⚠️ No se puede enviar correo: Falta la columna ' + docIdColName);
    return;
  }

  var email = sheet.getRange(row, emailCol).getValue();
  var nombre = sheet.getRange(row, nombreCol).getValue();
  var docId = sheet.getRange(row, docIdCol).getValue();

  if (!email || !docId) {
    Logger.log('⚠️ No se puede enviar correo: Falta email o Doc ID de Autocrat para ' + tipoNegocio);
    return;
  }

  subject = subject.replace('<<nombre>>', nombre);

  Logger.log('📧 Preparando envío de correo de firma (' + tipoNegocio + ') para: ' + email);

  var idRegistro = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
  var urlFirma = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/sala_firmas.html?docId=' + docId + '&cdr=' + idRegistro;

  try {
    var template = HtmlService.createTemplateFromFile('backend/email_firma_corretaje');
    template.NOMBRE_CLIENTE = nombre;
    template.URL_FIRMA = urlFirma;
    template.TIPO_ACTA = tipoActaTexto;
    template.ANIO = new Date().getFullYear();
    var htmlBody = template.evaluate().getContent();

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    Logger.log('✅ Correo de Sala de Firmas enviado a: ' + email);
  } catch(e) {
    Logger.log('❌ Error enviando correo de firma: ' + e.message);
  }
}


// ==========================================
// ACTUALIZACIÓN DE LINKS
// ==========================================

function insertarLinksTipo11(sheet, row, rprFolder, regFolder, datos) {
  // Insertar todos los links para nuevo inmueble (usado también por TIPO 4)
  var carpetaNegocio = datos.tipoRegistro.carpetaNegocio || determinarCarpetaNegocio(datos.datosInmueble.tipoNegocio);
  var cdr = datos.cdr;

  // Link REG
  insertarLinkREG(sheet, row, regFolder, cdr);

  // Link Inmuebles
  insertarLinkInmuebles(sheet, row, rprFolder);

  // Link Contenido
  insertarLinkContenido(sheet, row, regFolder, carpetaNegocio);

  // Link Propietario
  insertarLinkPropietario(sheet, row, regFolder);

  // Link Inquilino
  insertarLinkInquilino(sheet, row, regFolder);

  // Link Soportes Contables
  insertarLinkSoportesContables(sheet, row, regFolder);
}

function actualizarLinksTipo12(sheet, filaOriginal, filaTemp, carpetaNuevoAnio, regFolder) {
  // Actualizar solo links de PROPIETARIO e INQUILINO
  Logger.log('🔗 Actualizando links de carpetas de año...');

  // Link Propietario (ENTREGAS DEL INMUEBLE)
  var entregasFolder = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
  if (entregasFolder) {
    var entregasUrl = `https://drive.google.com/drive/folders/${entregasFolder.getId()}`;
    var formulaPropietario = `=HYPERLINK("${entregasUrl}";"PROPIETARIO")`;
    var propietarioCol = getColumnByName(sheet, 'LINK CARPETA DE PROPIETARIO');
    if (propietarioCol) {
      sheet.getRange(filaOriginal, propietarioCol).setFormula(formulaPropietario);
      Logger.log('✅ Link PROPIETARIO actualizado');
    }
  }

  // Link Inquilino (año nuevo / DOCUMENTOS DE ENTREGA - INQUILINO)
  var inquilinoFolder = getFolderByName(carpetaNuevoAnio, 'DOCUMENTOS DE ENTREGA - INQUILINO');
  if (inquilinoFolder) {
    var inquilinoUrl = `https://drive.google.com/drive/folders/${inquilinoFolder.getId()}`;
    var formulaInquilino = `=HYPERLINK("${inquilinoUrl}";"INQUILINO")`;
    var inquilinoCol = getColumnByName(sheet, 'LINK CARPETA DE INQUILINO');
    if (inquilinoCol) {
      sheet.getRange(filaOriginal, inquilinoCol).setFormula(formulaInquilino);
      Logger.log('✅ Link INQUILINO actualizado');
    }
  }

  // Actualizar link SOPORTES CONTABLES con la nueva carpeta de año
  var nuevoAnioFolder = carpetaNuevoAnio;
  var soportesNuevo = getFolderByName(nuevoAnioFolder, 'SOPORTES CONTABLES');
  if (soportesNuevo) {
    var soportesCol = getColumnByName(sheet, 'SOPORTES CONTABLES');
    if (soportesCol) {
      var soportesUrl = 'https://drive.google.com/drive/folders/' + soportesNuevo.getId();
      sheet.getRange(filaOriginal, soportesCol).setFormula('=HYPERLINK("' + soportesUrl + '";"📑")');
      Logger.log('✅ Link SOPORTES CONTABLES actualizado');
    }
  }

  // Actualizar links de Autocrat (REEMPLAZAR)
  Logger.log('🔗 Actualizando links de documentos Autocrat...');
  reemplazarLinksAutocrat(sheet, filaOriginal, filaTemp);
}

function agregarLinksTipo13(sheet, filaOriginal, filaTemp) {
  // Para TIPO 1.3: AGREGAR links solo si están vacíos
  Logger.log('🔗 Agregando links de nuevos documentos...');

  var columnasAutocrat = [
    'Merged Doc ID - CORRETAJE',
    'Merged Doc ID - ADMINISTRACIÓN',
    'Merged Doc ID - VENTA',
    'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
    'Merged Doc ID - ADMI-VENTA',
    'Merged Doc ID - VENDI-RENTA',
    'Link to merged Doc - CORRETAJE'
  ];

  columnasAutocrat.forEach(function (nombreCol) {
    var colIndex = getColumnByName(sheet, nombreCol);
    if (!colIndex) return;

    var rangoTemporal = sheet.getRange(filaTemp, colIndex);
    var formulaNueva = rangoTemporal.getFormula();
    var valorNuevo = rangoTemporal.getValue();

    if (!valorNuevo && !formulaNueva) return;

    var rangoOriginal = sheet.getRange(filaOriginal, colIndex);
    var valorActual = rangoOriginal.getValue();
    var formulaActual = rangoOriginal.getFormula();

    if (!valorActual && !formulaActual) {
      // Solo agregar si está vacío
      if (formulaNueva) {
        rangoOriginal.setFormula(formulaNueva);
      } else {
        rangoOriginal.setValue(valorNuevo);
      }
      Logger.log(`✅ Link agregado: ${nombreCol}`);
    } else {
      Logger.log(`ℹ️ Link ya existe: ${nombreCol} (se mantiene)`);
    }
  });
}

// ==========================================
// REEMPLAZAR LINKS DE AUTOCRAT (TIPO 1.2)
// ==========================================

function reemplazarLinksAutocrat(sheet, filaOriginal, filaTemp) {
  var columnasAutocrat = [
    'Merged Doc ID - CORRETAJE',
    'Merged Doc ID - ADMINISTRACIÓN',
    'Merged Doc ID - VENTA',
    'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
    'Merged Doc ID - ADMI-VENTA',
    'Merged Doc ID - VENDI-RENTA',
    'Link to merged Doc - CORRETAJE'
  ];

  var linksActualizados = 0;

  columnasAutocrat.forEach(function (nombreCol) {
    var colIndex = getColumnByName(sheet, nombreCol);
    if (!colIndex) return;

    var rangoTemporal = sheet.getRange(filaTemp, colIndex);
    var formulaNueva = rangoTemporal.getFormula();
    var valorNuevo = rangoTemporal.getValue();

    if (formulaNueva) {
      sheet.getRange(filaOriginal, colIndex).setFormula(formulaNueva);
      linksActualizados++;
      Logger.log(`🔄 Formula reemplazada: ${nombreCol}`);
    } else if (valorNuevo) {
      sheet.getRange(filaOriginal, colIndex).setValue(valorNuevo);
      linksActualizados++;
      Logger.log(`🔄 Valor reemplazado: ${nombreCol}`);
    }
  });

  Logger.log(`📊 Total links actualizados: ${linksActualizados}`);
}

// ==========================================
// INSERCIÓN DE LINKS INDIVIDUALES
// ==========================================

function insertarLinkREG(sheet, row, regFolder, cdr) {
  var linkREGCol = getColumnByName(sheet, 'LINK DE CARPETA REG');
  if (!linkREGCol) return;

  // Extraer código corto del CDR
  var codigoCorto = extraerCodigoCortoREG(cdr);
  var regUrl = `https://drive.google.com/drive/folders/${regFolder.getId()}`;
  var formula = `=HYPERLINK("${regUrl}";"${codigoCorto}")`;

  sheet.getRange(row, linkREGCol).setFormula(formula);
  Logger.log(`✅ Link REG insertado: ${codigoCorto}`);
}

function extraerCodigoCortoREG(cdrCompleto) {
  // De: REG_10-12-2025-C37_(CRA 8)_APTO-3
  // A: REG-C37
  var match = cdrCompleto.match(/REG_\d{2}-\d{2}-\d{4}-([A-Z]{1,2}\d+)/);
  if (match && match[1]) {
    return `REG-${match[1]}`;
  }
  return cdrCompleto;
}

function insertarLinkInmuebles(sheet, row, rprFolder) {
  var linkInmueblesCol = getColumnByName(sheet, 'INMUEBLES REGISTRADOS');
  if (!linkInmueblesCol) return;

  var inmueblesFolder = getFolderByName(rprFolder, 'INMUEBLES');
  if (!inmueblesFolder) {
    Logger.log('⚠️ No se encontró carpeta INMUEBLES');
    return;
  }

  var inmueblesUrl = `https://drive.google.com/drive/folders/${inmueblesFolder.getId()}`;
  var formula = `=HYPERLINK("${inmueblesUrl}";"INMUEBLES")`;

  sheet.getRange(row, linkInmueblesCol).setFormula(formula);
  Logger.log('✅ Link INMUEBLES insertado');
}

function insertarLinkContenido(sheet, row, regFolder, carpetaNegocio) {
  var linkContenidoCol = getColumnByName(sheet, 'LINK CARPETA DE CONTENIDO');
  if (!linkContenidoCol) return;

  var archivosFolder = getFolderByName(regFolder, 'ARCHIVOS DEL INMUEBLE');
  if (!archivosFolder) {
    Logger.log('⚠️ No se encontró ARCHIVOS DEL INMUEBLE');
    return;
  }

  var contenidoFolder = getFolderByName(archivosFolder, 'CONTENIDO DE PUBLICACIÓN');
  if (!contenidoFolder) {
    Logger.log('⚠️ No se encontró CONTENIDO DE PUBLICACIÓN');
    return;
  }

  var contenidoUrl = `https://drive.google.com/drive/folders/${contenidoFolder.getId()}`;
  var formula = `=HYPERLINK("${contenidoUrl}";"CARPETA DE CONTENIDO")`;

  sheet.getRange(row, linkContenidoCol).setFormula(formula);
  Logger.log('✅ Link CONTENIDO insertado');
}

function insertarLinkPropietario(sheet, row, regFolder) {
  var linkPropietarioCol = getColumnByName(sheet, 'LINK CARPETA DE PROPIETARIO');
  if (!linkPropietarioCol) return;

  var entregasFolder = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
  if (!entregasFolder) {
    Logger.log('⚠️ No se encontró ENTREGAS DEL INMUEBLE');
    return;
  }

  var entregasUrl = `https://drive.google.com/drive/folders/${entregasFolder.getId()}`;
  var formula = `=HYPERLINK("${entregasUrl}";"PROPIETARIO")`;

  sheet.getRange(row, linkPropietarioCol).setFormula(formula);
  Logger.log('✅ Link PROPIETARIO insertado');
}

function insertarLinkInquilino(sheet, row, regFolder) {
  var linkInquilinoCol = getColumnByName(sheet, 'LINK CARPETA DE INQUILINO');
  if (!linkInquilinoCol) return;

  var entregasFolder = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
  if (!entregasFolder) {
    Logger.log('⚠️ No se encontró ENTREGAS DEL INMUEBLE');
    return;
  }

  // Buscar carpeta de año más reciente (ignorar XXXX)
  var anioFolder = obtenerCarpetaAnioMasReciente(entregasFolder);
  if (!anioFolder) {
    Logger.log('⚠️ No se encontró carpeta de año');
    return;
  }

  var inquilinoFolder = getFolderByName(anioFolder, 'DOCUMENTOS DE ENTREGA - INQUILINO');
  if (!inquilinoFolder) {
    Logger.log('⚠️ No se encontró DOCUMENTOS DE ENTREGA - INQUILINO');
    return;
  }

  var inquilinoUrl = `https://drive.google.com/drive/folders/${inquilinoFolder.getId()}`;
  var formula = `=HYPERLINK("${inquilinoUrl}";"INQUILINO")`;

  sheet.getRange(row, linkInquilinoCol).setFormula(formula);
  Logger.log('✅ Link INQUILINO insertado');
}

function insertarLinkSoportesContables(sheet, row, regFolder) {
  var col = getColumnByName(sheet, 'SOPORTES CONTABLES');
  if (!col) {
    Logger.log('⚠️ Columna "SOPORTES CONTABLES" no encontrada en la hoja');
    return;
  }

  var entregasFolder = getFolderByName(regFolder, 'ENTREGAS DEL INMUEBLE');
  if (!entregasFolder) {
    Logger.log('⚠️ No se encontró ENTREGAS DEL INMUEBLE');
    return;
  }

  var anioFolder = obtenerCarpetaAnioMasReciente(entregasFolder);
  if (!anioFolder) {
    Logger.log('⚠️ No se encontró carpeta de año para SOPORTES CONTABLES');
    return;
  }

  var soportesFolder = getFolderByName(anioFolder, 'SOPORTES CONTABLES');
  if (!soportesFolder) {
    Logger.log('⚠️ No se encontró carpeta SOPORTES CONTABLES');
    return;
  }

  var url = 'https://drive.google.com/drive/folders/' + soportesFolder.getId();
  var formula = '=HYPERLINK("' + url + '";"📑")';
  sheet.getRange(row, col).setFormula(formula);
  Logger.log('✅ Link SOPORTES CONTABLES insertado');
}

function obtenerCarpetaAnioMasReciente(entregasFolder) {
  var folders = entregasFolder.getFolders();
  var carpetasAnios = [];

  while (folders.hasNext()) {
    var folder = folders.next();
    var nombre = folder.getName();

    // Filtrar carpetas de año (ignorar XXXX)
    if (nombre !== 'XXXX' && nombre.match(/^\d{4}(-\d+)?$/)) {
      // Extraer año base
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

  // Ordenar por año descendente
  carpetasAnios.sort(function (a, b) {
    return b.anio - a.anio;
  });

  Logger.log(`📅 Año más reciente encontrado: ${carpetasAnios[0].nombre}`);
  return carpetasAnios[0].folder;
}
// ==========================================
// REGISTRO DE INMUEBLES - ARCHIVO 2 - PARTE 4 (FINAL)
// Funciones auxiliares finales
// Líneas 901-final
// ==========================================

// ==========================================
// BORRAR FILA TEMPORAL
// ==========================================

function borrarFilaTemporal(sheet, row) {
  try {
    sheet.deleteRow(row);
    Logger.log(`✅ Fila ${row} eliminada exitosamente`);
  } catch (error) {
    Logger.log(`⚠️ Error al borrar fila ${row}: ${error.message}`);
  }
}

// ==========================================
// ACTUALIZAR ESTADO FINAL
// ==========================================

function actualizarEstadoFinal(sheet, row, tipo) {
  var estadoCol = getColumnByName(sheet, 'ESTADO DEL INMUEBLE');
  var detallesCol = getColumnByName(sheet, 'DETALLES DEL ESTADO DEL INMUEBLE');

  if (!estadoCol || !detallesCol) {
    Logger.log('⚠️ No se encontraron columnas de estado');
    return;
  }

  var mensajeDetalle = '';

  switch (tipo) {
    case 'TIPO_3':
      mensajeDetalle = '✅ Nuevo inmueble registrado exitosamente. 📥⏳ Pendiente cargar contenido de publicación.';
      break;

    case 'TIPO_2':
      mensajeDetalle = '✅ Renovación procesada exitosamente. 📅 Nuevo año creado con documentos actualizados.';
      break;

    case 'TIPO_2_PENDIENTE':
      mensajeDetalle = '⏳ Renovación pendiente de firma. ⏱️ Esperando confirmación para validar el nuevo año.';
      break;

    case 'TIPO_4':
      mensajeDetalle = '✅ Tipo de negocio actualizado exitosamente. 📂➡️📂✅ Inmueble reubicado y documentos agregados.';
      break;

    case 'TIPO_4_PENDIENTE':
      mensajeDetalle = '⏳ Cambio de negocio pendiente de firma. ⏱️ Esperando confirmación para oficializar el traslado.';
      break;

    case 'TIPO_1':
      mensajeDetalle = '✅ Nuevo propietario e inmueble registrado exitosamente. 📥⏳ Pendiente cargar contenido de publicación.';
      break;

    default:
      mensajeDetalle = '✅ Registro procesado exitosamente.';
  }

  sheet.getRange(row, estadoCol).setValue('PENDIENTE');
  sheet.getRange(row, detallesCol).setValue(mensajeDetalle);

  SpreadsheetApp.flush();
  Logger.log(`✅ Estado actualizado: PENDIENTE`);
}

// ==========================================
// MARCAR ADVERTENCIA (NO ES ERROR)
// ==========================================

function marcarAdvertenciaEnFila(sheet, row, mensaje) {
  try {
    var estadoCol = getColumnByName(sheet, 'ESTADO DEL INMUEBLE');
    var detallesCol = getColumnByName(sheet, 'DETALLES DEL ESTADO DEL INMUEBLE');

    if (estadoCol) {
      sheet.getRange(row, estadoCol).setValue('PENDIENTE');
    }

    if (detallesCol) {
      sheet.getRange(row, detallesCol).setValue(`⚠️ ADVERTENCIA: ${mensaje}`);
    }

    SpreadsheetApp.flush();
    Logger.log(`⚠️ Advertencia marcada en fila ${row}`);
  } catch (e) {
    Logger.log(`⚠️ No se pudo marcar advertencia: ${e.message}`);
  }
}

// ==========================================
// FUNCIONES AUXILIARES REUTILIZADAS
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
    Logger.log(`❌ No se pudo marcar error: ${e.message}`);
  }
}

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
// SISTEMA DE ROLLBACK (RENOVACIONES Y CAMBIOS)
// ==========================================

function respaldarDatosFila(sheet, filaOriginal, idRegistro, extraData) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowData = sheet.getRange(filaOriginal, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var backup = {};
  
  // Guardar Precios
  ['PRECIO DE PROMOCION GENERAL', 'PRECIO DE PROMOCION EN VENTA', 'CANON DE ARRENDAMIENTO'].forEach(function(h) {
    var col = headers.indexOf(h);
    if (col !== -1) backup[h] = rowData[col];
  });
  
  // Guardar YouTube y Estado y CDR y TIPO DE NEGOCIO (Críticos para TIPO 4)
  ['LINK DEL VIDEO DEL INMUEBLE', 'STATUS', 'CODIGO DE REGISTRO', 'TIPO DE NEGOCIO'].forEach(function(h) {
    var col = headers.indexOf(h);
    if (col !== -1) backup[h] = rowData[col];
  });
  
  // Guardar Links Autocrat
  var columnasAutocrat = [
    'Merged Doc ID - CORRETAJE', 'Merged Doc ID - ADMINISTRACIÓN',
    'Merged Doc ID - VENTA', 'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
    'Merged Doc ID - ADMI-VENTA', 'Merged Doc ID - VENDI-RENTA', 'Link to merged Doc - CORRETAJE'
  ];
  columnasAutocrat.forEach(function(h) {
    var col = headers.indexOf(h);
    if (col !== -1) backup[h] = rowData[col];
  });
  
  // Guardar datos espaciales extra si los hay (Para TIPO 4)
  if (extraData) {
    backup['EXTRA_SPATIAL_DATA'] = extraData;
  }
  
  var props = PropertiesService.getScriptProperties();
  props.setProperty('ROLLBACK_' + idRegistro, JSON.stringify(backup));
  Logger.log('💾 Backup guardado para rollback usando ID: ' + idRegistro);
}

function transferirPreciosRenovacion(sheet, filaOriginal, filaTemp) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowTemp = sheet.getRange(filaTemp, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  Logger.log('💸 Transfiriendo precios...');
  ['PRECIO DE PROMOCION GENERAL', 'PRECIO DE PROMOCION EN VENTA', 'CANON DE ARRENDAMIENTO'].forEach(function(h) {
    var col = headers.indexOf(h);
    if (col !== -1 && rowTemp[col] !== "" && rowTemp[col] !== undefined) {
      sheet.getRange(filaOriginal, col + 1).setValue(rowTemp[col]);
    }
  });
  
  // Limpiar link de YouTube para que el portal multimedia quede abierto
  // Y guardarlo en memoria para la Fase 4 (Reutilización Multimedia)
  var colYT = headers.indexOf('LINK DEL VIDEO DEL INMUEBLE');
  if (colYT !== -1) {
    var oldLink = sheet.getRange(filaOriginal, colYT + 1).getValue();
    if (oldLink) {
      // Necesitamos el ID DE REGISTRO
      var colId = headers.indexOf('ID DE REGISTRO');
      var idRegistro = colId !== -1 ? sheet.getRange(filaOriginal, colId + 1).getValue() : '';
      if (idRegistro) {
        PropertiesService.getScriptProperties().setProperty('MULTIMEDIA_PREVIO_' + idRegistro, oldLink);
      }
    }
    
    sheet.getRange(filaOriginal, colYT + 1).clearContent();
    Logger.log('🔓 Candado Multimedia abierto (Link YT guardado y borrado temporalmente)');
  }
}

function transferirCaracteristicasFormulario(sheet, filaOriginal, datos) {
  Logger.log('📋 Transfiriendo características del formulario a la fila original...');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Columnas excluidas que no se deben sobrescribir en la fila original
  var columnasExcluidas = [
    'CODIGO DE REGISTRO',
    'ID DE REGISTRO',
    'ESTADO DEL INMUEBLE',
    'DETALLES DEL ESTADO DEL INMUEBLE',
    'LINK DE CARPETA RPR',
    'LINK DE CARPETA REG',
    'LINK CARPETA DE PROPIETARIO',
    'LINK CARPETA DE INQUILINO',
    'LINK CARPETA DE CONTENIDO',
    'SOPORTES CONTABLES',
    'DOCUMENTO FIRMADO',
    'LINK DEL VIDEO DEL INMUEBLE' // Se maneja por separado en transferirPreciosRenovacion
  ];

  for (var i = 0; i < headers.length; i++) {
    var rawHeader = headers[i].toString();
    var trimmedHeader = rawHeader.trim();
    
    // Ignorar si es columna excluida o vacía
    if (!trimmedHeader) continue;
    if (columnasExcluidas.indexOf(trimmedHeader) !== -1 || columnasExcluidas.indexOf(rawHeader) !== -1) continue;
    if (trimmedHeader.startsWith('Link to merged Doc') || trimmedHeader.startsWith('Merged Doc ID') || 
        trimmedHeader.startsWith('Merged Doc URL') || trimmedHeader.startsWith('Document Merge Status')) {
      continue;
    }
    
    // Si la propiedad existe en datos, copiarla
    var value = null;
    if (datos.hasOwnProperty(rawHeader)) {
      value = datos[rawHeader];
    } else if (datos.hasOwnProperty(trimmedHeader)) {
      value = datos[trimmedHeader];
    }
    
    if (value !== null && value !== undefined && value !== '') {
      sheet.getRange(filaOriginal, i + 1).setValue(value);
      Logger.log(`   - Actualizado campo "${trimmedHeader}" con valor: ${value}`);
    }
  }
}

// ==========================================
// FIN DEL ARCHIVO 2
// ==========================================

Logger.log('📄 Archivo 2 cargado correctamente - v10.2-final');