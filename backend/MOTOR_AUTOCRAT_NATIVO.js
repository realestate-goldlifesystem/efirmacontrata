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
        } else if (typeof value === 'number') {
          var headerLower = headerMap.toLowerCase();
          var esMoneda = headerLower.includes('precio') || 
                         headerLower.includes('canon') || 
                         headerLower.includes('costo') || 
                         headerLower.includes('valor');
          if (esMoneda) {
            var formattedNumber = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            value = "$ " + formattedNumber;
          }
        }
        var regex = new RegExp('<<' + tag + '>>', 'g');
        result = result.replace(regex, value);
      });
      
      // FALLBACK: Si quedaron etiquetas <<...>> en el string (como en el nombre de archivo),
      // buscar directamente el nombre de la etiqueta en los headers.
      var missingTags = result.match(/<<([^>]+)>>/g);
      if (missingTags) {
        missingTags.forEach(function(matchTag) {
          var headerName = matchTag.replace('<<', '').replace('>>', '');
          var colIndex = headers.indexOf(headerName);
          if (colIndex !== -1) {
            var val = rowData[colIndex];
            if (val === null || val === undefined) val = '';
            result = result.replace(new RegExp(matchTag, 'g'), val.toString());
          }
        });
      }
      
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
      } else if (typeof value === 'number' && /^\s*VALOR RESTANTE EN NUMERO/i.test(headerMap)) {
        // El excedente del primer canon va en porcentaje ("35%"), y la hoja lo guarda
        // como 0.35 (19-oct-2026). No es plata: no lleva formato de pesos.
        value = Math.round(value <= 1 ? value * 100 : value) + '%';
      } else if (typeof value === 'number') {
        var headerLower = headerMap.toLowerCase();
        var esMoneda = headerLower.includes('precio') || 
                       headerLower.includes('canon') || 
                       headerLower.includes('costo') || 
                       headerLower.includes('valor');
        if (esMoneda) {
          var formattedNumber = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          value = "$ " + formattedNumber;
        }
      }
      
      body.replaceText('<<' + tag + '>>', value.toString());
    });

    // Bloques que solo aparecen si aplican (19-oct-2026)
    aplicarBloquesCondicionales_(body, headers, rowData);
    
    doc.saveAndClose();
    
    // IMPORTANTE: NO convertir a PDF ni borrar el Doc. 
    // La Sala de Firmas requiere el Google Doc original para poder inyectar la firma digital después.
    Logger.log('✅ Documento de Google generado nativamente: ' + tempDocFile.getName());
    
    // Escribir el ID del DOC en la columna Merged Doc ID correspondiente
    var colName = nombreColumnaMergedDoc(tipoNegocio);

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

/**
 * Columna donde queda el ID del documento generado para cada tipo.
 * Una sola fuente: la usa el motor al escribir y la Parte 2 al reintentar.
 */
function nombreColumnaMergedDoc(tipoNegocio) {
  switch (tipoNegocio) {
    case 'Administración': return 'Merged Doc ID - ADMINISTRACIÓN';
    case 'Venta': return 'Merged Doc ID - VENTA';
    case 'Admi-Venta': return 'Merged Doc ID - ADMI-VENTA';
    case 'Vendi-Renta': return 'Merged Doc ID - VENDI-RENTA';
    case 'AUTORIZACIÓN DE INGRESO AL INMUEBLE': return 'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE';
    case 'Corretaje':
    default: return 'Merged Doc ID - CORRETAJE';
  }
}

/**
 * true si la fila ya tiene un documento generado y ese documento sigue vivo.
 * Evita que un reintento de la Parte 2 (p. ej. tras "Excedió el tiempo máximo")
 * genere el acta dos veces y deje la primera huérfana.
 */
function documentoAutocratYaGenerado(sheet, row, tipoNegocio) {
  try {
    var col = getColumnByName(sheet, nombreColumnaMergedDoc(tipoNegocio));
    if (!col) return false;
    var id = String(sheet.getRange(row, col).getValue() || '').trim();
    if (!id) return false;
    return !DriveApp.getFileById(id).isTrashed();
  } catch (e) {
    return false;
  }
}


// ==========================================
// BLOQUES CONDICIONALES DE LAS PLANTILLAS (19-oct-2026)
// ==========================================
// Un texto de la plantilla entre <<SI NOMBRE>> y <<FIN SI NOMBRE>> se deja (sin las
// marcas) si la condición se cumple, y se borra completo si no. Las marcas van en
// el mismo párrafo. La redacción del bloque es de Leonardo: aquí solo se muestra u
// oculta.
//
// COBRO PRIMER CANON: el parágrafo de la cláusula TERCERA de Corretaje y
// Vendi-Renta, que solo aplica si el propietario autorizó que el agente reciba el
// primer canon y se cobre de ahí la comisión (PLAN_EXCEDENTE_PRIMER_CANON.md, D2).
var BLOQUES_CONDICIONALES = {
  'COBRO PRIMER CANON': function (valor) {
    return /^s[ií]/i.test(String(valor('¿Desea que el agente reciba el cobro del canon UNICAMENTE del primer mes para que se pueda cobrar directamente la comisión?') ||
                                  valor('¿Desea que el agente reciba el cobro del canon UNICAMENTE del primer mes para que se pueda cobrar directamente la comisión?  (V-R)') || '').trim());
  }
};

function aplicarBloquesCondicionales_(body, headers, rowData) {
  var valor = function (nombre) {
    var i = headers.findIndex(function (h) { return String(h).trim() === nombre.trim(); });
    return i === -1 ? '' : rowData[i];
  };
  Object.keys(BLOQUES_CONDICIONALES).forEach(function (nombre) {
    var inicio = '<<SI ' + nombre + '>>', fin = '<<FIN SI ' + nombre + '>>';
    if (!body.findText(inicio)) return;
    if (BLOQUES_CONDICIONALES[nombre](valor)) {
      body.replaceText(inicio, '');
      body.replaceText(fin, '');
    } else {
      // replaceText usa expresiones regulares: el bloque completo, de marca a marca
      body.replaceText(inicio + '.*?' + fin + ' ?', '');
    }
  });
}
