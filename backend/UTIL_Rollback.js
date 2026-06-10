// ==========================================
// UTIL_Rollback.js
// SISTEMA DE TIEMPO Y REVERSIÓN PARA RENOVACIONES/CAMBIOS (TIPO 2 Y TIPO 4)
// ==========================================

/**
 * Programa los cronómetros (Triggers) de 6 y 7 días para un inmueble.
 * @param {string} idRegistro - El ID constante del inmueble (Ej: XX12345)
 * @param {string} emailPropietario - Correo para enviar el recordatorio del día 6
 */
function programarTriggersRollback(idRegistro, emailPropietario) {
  var fechaActual = new Date();
  
  // Día 6: Recordatorio
  var fechaRecordatorio = new Date(fechaActual.getTime() + (6 * 24 * 60 * 60 * 1000));
  var triggerRecordatorio = ScriptApp.newTrigger('triggerRecordatorioRenovacion')
    .timeBased()
    .at(fechaRecordatorio)
    .create();
    
  // Día 7: Rollback automático
  var fechaRollback = new Date(fechaActual.getTime() + (7 * 24 * 60 * 60 * 1000));
  var triggerRollback = ScriptApp.newTrigger('triggerRollbackAutomatico')
    .timeBased()
    .at(fechaRollback)
    .create();
    
  // Guardamos los IDs de los triggers en PropertiesService para poder borrarlos si firman a tiempo
  var props = PropertiesService.getScriptProperties();
  props.setProperty('TRIGGERS_RECORDATORIO_' + idRegistro, triggerRecordatorio.getUniqueId());
  props.setProperty('TRIGGERS_ROLLBACK_' + idRegistro, triggerRollback.getUniqueId());
  
  // Guardamos el email para que el trigger sepa a quién escribirle
  props.setProperty('EMAIL_ROLLBACK_' + idRegistro, emailPropietario);
  
  Logger.log('⏱️ Triggers de Rollback programados para el ID: ' + idRegistro);
}

/**
 * Borra los cronómetros de un inmueble (Se llama cuando firman con éxito)
 */
function cancelarTriggersRollback(idRegistro) {
  var props = PropertiesService.getScriptProperties();
  var idRec = props.getProperty('TRIGGERS_RECORDATORIO_' + idRegistro);
  var idRol = props.getProperty('TRIGGERS_ROLLBACK_' + idRegistro);
  
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getUniqueId() === idRec || t.getUniqueId() === idRol) {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Limpiamos la memoria
  props.deleteProperty('TRIGGERS_RECORDATORIO_' + idRegistro);
  props.deleteProperty('TRIGGERS_ROLLBACK_' + idRegistro);
  props.deleteProperty('EMAIL_ROLLBACK_' + idRegistro);
  props.deleteProperty('ROLLBACK_' + idRegistro);
  
  Logger.log('✅ Triggers y memoria de Rollback limpiados para ID: ' + idRegistro);
}

/**
 * Función que ejecuta el Trigger del Día 6 (Recordatorio)
 */
function triggerRecordatorioRenovacion(e) {
  // Para saber a qué inmueble corresponde este trigger, debemos buscarlo
  var triggersGuardados = buscarIdRegistroPorTrigger(e.triggerUid, 'TRIGGERS_RECORDATORIO_');
  if (!triggersGuardados) return;
  
  var idRegistro = triggersGuardados.idRegistro;
  var props = PropertiesService.getScriptProperties();
  var email = props.getProperty('EMAIL_ROLLBACK_' + idRegistro);
  
  if (!email) return;
  
  Logger.log('📧 Enviando recordatorio Día 6 a: ' + email);
  
  // URL Del Webhook para cancelar manualmente (opción de "No deseo continuar")
  var webhookUrl = ScriptApp.getService().getUrl() + "?action=cancelarRenovacion&id=" + idRegistro;
  
  // TODO: Enviar email usando HTMLService (Similar a GESTOR_CONTRATOS)
  var htmlBody = "<h3>Aviso de Renovación Pendiente</h3>" +
                 "<p>Hola, notamos que iniciaste un proceso de renovación o cambio de negocio para tu inmueble, pero aún no has firmado la documentación.</p>" +
                 "<p>Para continuar con la comercialización, por favor firma en el portal.</p>" +
                 "<p>Si ya no deseas continuar con la comercialización o el cambio, por favor haz clic en el siguiente botón:</p>" +
                 "<br><a href='" + webhookUrl + "' style='padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px;'>No deseo continuar</a>";
                 
  MailApp.sendEmail({
    to: email,
    subject: "Aviso Importante: Firma de Renovación Pendiente",
    htmlBody: htmlBody
  });
}

/**
 * Función que ejecuta el Trigger del Día 7 (Rollback automático)
 */
function triggerRollbackAutomatico(e) {
  var triggersGuardados = buscarIdRegistroPorTrigger(e.triggerUid, 'TRIGGERS_ROLLBACK_');
  if (!triggersGuardados) return;
  
  var idRegistro = triggersGuardados.idRegistro;
  Logger.log('🔄 Iniciando Rollback Automático (Día 7) para: ' + idRegistro);
  
  ejecutarRollbackTotal(idRegistro);
}

function buscarIdRegistroPorTrigger(triggerUid, prefijo) {
  var props = PropertiesService.getScriptProperties().getProperties();
  for (var key in props) {
    if (key.indexOf(prefijo) === 0 && props[key] === triggerUid) {
      return { idRegistro: key.substring(prefijo.length) };
    }
  }
  return null;
}

/**
 * MOTOR PRINCIPAL DE REVERSIÓN (Restaura Excel y Drive)
 */
function ejecutarRollbackTotal(idRegistro) {
  var props = PropertiesService.getScriptProperties();
  var backupStr = props.getProperty('ROLLBACK_' + idRegistro);
  
  if (!backupStr) {
    Logger.log('⚠️ No hay datos de Rollback para el ID: ' + idRegistro);
    return false;
  }
  
  var backup = JSON.parse(backupStr);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1.1 - INMUEBLES REGISTRADOS");
  
  // Encontrar la fila usando ID DE REGISTRO
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getDataRange().getValues();
  var colId = headers.indexOf('ID DE REGISTRO');
  var filaA = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][colId] === idRegistro) {
      filaA = i + 1;
      break;
    }
  }
  
  if (filaA === -1) {
    Logger.log('⚠️ No se encontró el inmueble en el Excel para revertir.');
    return false;
  }
  
  Logger.log('⏪ Revertiendo datos en el Excel...');
  
  // 1. Restaurar datos del Excel (Precios, YouTube, Status, Autocrat)
  for (var key in backup) {
    if (key === 'EXTRA_SPATIAL_DATA') continue; // Los datos espaciales no van al Excel directamente
    var col = headers.indexOf(key);
    if (col !== -1) {
      sheet.getRange(filaA, col + 1).setValue(backup[key]);
    }
  }
  
  // 2. Rollback Especial para TIPO 4 (Carpetas de Drive)
  if (backup.EXTRA_SPATIAL_DATA) {
    Logger.log('⏪ Revertiendo carpetas de Drive (Rollback TIPO 4)...');
    var spatial = backup.EXTRA_SPATIAL_DATA;
    var cdrViejo = backup['CODIGO DE REGISTRO'];
    
    try {
      // Usar la formula del link para extraer el Folder ID, o buscarlo por nombre
      var colFolder = headers.indexOf('LINK CARPETA DE CONTENIDO');
      var folderUrl = sheet.getRange(filaA, colFolder + 1).getFormula();
      var folderId = null;
      if (folderUrl) {
         var match = folderUrl.match(/id=([a-zA-Z0-9_-]+)/) || folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
         if (match) folderId = match[1];
      }
      
      if (folderId) {
        var regFolder = DriveApp.getFolderById(folderId);
        
        // 2.1 Renombrar carpeta al CDR viejo
        regFolder.setName(cdrViejo);
        
        // 2.2 Mover a la carpeta origen
        if (spatial.carpetaOrigen && spatial.carpetaOrigen !== spatial.carpetaDestino) {
          // Buscamos la carpeta contenedora principal "INMUEBLES" (Asumimos que está cerca)
          var parents = regFolder.getParents();
          if (parents.hasNext()) {
             var currentDestFolder = parents.next(); // ej: VENTA
             var inmueblesFolder = currentDestFolder.getParents().hasNext() ? currentDestFolder.getParents().next() : null;
             if (inmueblesFolder && inmueblesFolder.getName() === 'INMUEBLES') {
               var origenFolder = getFolderByName(inmueblesFolder, spatial.carpetaOrigen);
               if (origenFolder) {
                 regFolder.moveTo(origenFolder);
                 Logger.log(`✅ Carpeta regresada a: ${spatial.carpetaOrigen}`);
               }
             }
          }
        }
        
        // 2.3 Restaurar link de REG
        var colRegLink = headers.indexOf('LINK DE CARPETA REG');
        if (colRegLink !== -1) {
          var codigoCortoViejo = cdrViejo.split('-').pop(); // Aprox
          var regUrlNueva = `https://drive.google.com/drive/folders/${regFolder.getId()}`;
          sheet.getRange(filaA, colRegLink + 1).setFormula(`=HYPERLINK("${regUrlNueva}";"${codigoCortoViejo}")`);
        }
      }
    } catch(e) {
      Logger.log('⚠️ Error al revertir Drive: ' + e.message);
    }
  }
  
  // Limpiar Triggers y memoria
  cancelarTriggersRollback(idRegistro);
  
  Logger.log('✅ Rollback completado con éxito para ID: ' + idRegistro);
  return true;
}
