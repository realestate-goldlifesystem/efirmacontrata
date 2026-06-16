// ==========================================
// MOTOR AUTOCRAT NATIVO
// Reemplazo síncrono del Add-on Autocrat
// Real Estate Gold Life System
// ==========================================

function generarDocumentoNativo(sheet, row, tipoNegocio, carpetaDestinoFolder) {
  try {
    Logger.log('🚀 Iniciando Motor Autocrat Nativo para: ' + tipoNegocio);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var autocratSheet = ss.getSheetByName('DO NOT DELETE - AutoCrat Job Settings');
    if (!autocratSheet) {
      throw new Error("No se encontró la hoja de configuración de Autocrat.");
    }
    
    // Buscar el Job correspondiente al tipo de negocio
    var data = autocratSheet.getDataRange().getValues();
    var jobRow = null;
    
    for (var i = 1; i < data.length; i++) {
      var jobName = (data[i][1] || '').toString().trim().toUpperCase();
      // Mapear el tipo de negocio al nombre del Job
      var targetJobName = '';
      if (tipoNegocio === 'Corretaje') targetJobName = 'CORRETAJE';
      else if (tipoNegocio === 'Administración') targetJobName = 'ADMINISTRACIÓN';
      else if (tipoNegocio === 'Venta') targetJobName = 'VENTA';
      else if (tipoNegocio === 'Admi-Venta') targetJobName = 'ADMI-VENTA';
      else if (tipoNegocio === 'Vendi-Renta') targetJobName = 'VENDI-RENTA';
      else if (tipoNegocio === 'AUTORIZACIÓN DE INGRESO AL INMUEBLE') targetJobName = 'AUTORIZACIÓN DE INGRESO AL INMUEBLE';
      
      if (jobName === targetJobName) {
        jobRow = data[i];
        break;
      }
    }
    
    if (!jobRow) {
      Logger.log('⚠️ No se encontró configuración de Autocrat para el Job: ' + targetJobName + '. Saltando generación nativa.');
      return null;
    }
    
    var templateId = jobRow[2];
    var fileNamePattern = jobRow[6];
    var tagsJsonStr = jobRow[14];
    
    var tagsConfig = [];
    try {
      tagsConfig = JSON.parse(tagsJsonStr);
    } catch (e) {
      Logger.log('⚠️ Error parseando tags JSON de Autocrat: ' + e.message);
      return null;
    }
    
    // Obtener los datos de la fila actual
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Función para reemplazar tags en strings (ej: nombre de archivo)
    function replaceTagsInString(str) {
      var result = str;
      tagsConfig.forEach(function(tagObj) {
        var tag = tagObj.tag;
        var headerMap = tagObj.details.headerMap;
        var colIndex = headers.indexOf(headerMap);
        var value = colIndex !== -1 ? rowData[colIndex] : '';
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yyyy');
        }
        var regex = new RegExp('<<' + tag + '>>', 'g');
        result = result.replace(regex, value);
      });
      return result;
    }
    
    // Clonar plantilla
    var fileName = replaceTagsInString(fileNamePattern);
    var templateFile = DriveApp.getFileById(templateId);
    var tempDocFile = templateFile.makeCopy(fileName, carpetaDestinoFolder);
    var doc = DocumentApp.openById(tempDocFile.getId());
    var body = doc.getBody();
    
    // Reemplazar valores en el documento
    tagsConfig.forEach(function(tagObj) {
      var tag = tagObj.tag;
      var headerMap = tagObj.details.headerMap;
      var colIndex = headers.indexOf(headerMap);
      var value = colIndex !== -1 ? rowData[colIndex] : '';
      
      if (value === null || value === undefined) value = '';
      if (value instanceof Date) {
        value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yyyy');
      }
      
      body.replaceText('<<' + tag + '>>', value.toString());
    });
    
    doc.saveAndClose();
    
    // IMPORTANTE: NO convertir a PDF ni borrar el Doc. 
    // La Sala de Firmas requiere el Google Doc original para poder inyectar la firma digital después.
    Logger.log('✅ Documento de Google generado nativamente: ' + tempDocFile.getName());
    
    // Escribir el ID del DOC en la columna Merged Doc ID correspondiente
    var colName = '';
    switch(tipoNegocio) {
      case 'Administración': colName = 'Merged Doc ID - ADMINISTRACIÓN'; break;
      case 'Venta': colName = 'Merged Doc ID - VENTA'; break;
      case 'Admi-Venta': colName = 'Merged Doc ID - ADMI-VENTA'; break;
      case 'Vendi-Renta': colName = 'Merged Doc ID - VENDI-RENTA'; break;
      case 'AUTORIZACIÓN DE INGRESO AL INMUEBLE': colName = 'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE'; break;
      case 'Corretaje':
      default: colName = 'Merged Doc ID - CORRETAJE'; break;
    }
    
    var colIndexWrite = headers.indexOf(colName);
    if (colIndexWrite !== -1) {
      sheet.getRange(row, colIndexWrite + 1).setValue(tempDocFile.getId());
      Logger.log('🔗 ID del Google Doc guardado en la columna: ' + colName);
    }
    
    return tempDocFile;
    
  } catch (error) {
    Logger.log('❌ Error en Motor Autocrat Nativo: ' + error.message);
    return null;
  }
}
