function extraerEstructuraFormulario() {
  var formId = '1UZ7_3GpL-NR-Kt0cNWkalOqNscs2Fp8h2py1GE557g4';
  var form = FormApp.openById(formId);
  var items = form.getItems();
  
  var estructura = {
    titulo: form.getTitle(),
    descripcion: form.getDescription(),
    items: []
  };
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var tipoItem = item.getType().toString();
    var objItem = {
      id: item.getId(),
      titulo: item.getTitle(),
      tipo: tipoItem,
      ayuda: item.getHelpText()
    };
    
    // Si es tipo lista, multiple choice o checkbox, extraer opciones
    if (tipoItem === 'LIST' || tipoItem === 'MULTIPLE_CHOICE' || tipoItem === 'CHECKBOX') {
      try {
        var asOpciones = null;
        if (tipoItem === 'LIST') asOpciones = item.asListItem();
        if (tipoItem === 'MULTIPLE_CHOICE') asOpciones = item.asMultipleChoiceItem();
        if (tipoItem === 'CHECKBOX') asOpciones = item.asCheckboxItem();
        
        var opciones = asOpciones.getChoices();
        objItem.requerido = asOpciones.isRequired();
        objItem.opciones = [];
        
        for (var j = 0; j < opciones.length; j++) {
          var opcion = opciones[j];
          var infoOpcion = { valor: opcion.getValue() };
          
          // Verificar si tiene lógica condicional (ir a página específica dependiendo de la respuesta)
          try {
            var gotoPage = opcion.getGotoPage();
            if (gotoPage) {
              infoOpcion.saltoCondicional_SeccionDestino = gotoPage.getTitle() || "Página sin título (ID: " + gotoPage.getId() + ")";
            }
            var pageNavigation = opcion.getPageNavigationType();
            if (pageNavigation) {
               infoOpcion.tipoNavegacion = pageNavigation.toString();
            }
          } catch(e) {}
          
          objItem.opciones.push(infoOpcion);
        }
      } catch (e) {
        Logger.log("Error procesando opciones de: " + item.getTitle());
      }
    } else if (tipoItem === 'GRID' || tipoItem === 'CHECKBOX_GRID') {
      try {
        var asGrid = null;
        if (tipoItem === 'GRID') asGrid = item.asGridItem();
        if (tipoItem === 'CHECKBOX_GRID') asGrid = item.asCheckboxGridItem();
        
        // Se extraen tanto las filas (ej. Gimnasio, Piscina) como las columnas (ej. SI, NO)
        objItem.filas = asGrid.getRows();
        objItem.columnas = asGrid.getColumns();
        
      } catch (e) {
        Logger.log("Error procesando cuadrícula de: " + item.getTitle());
      }
    } else if (tipoItem === 'SCALE') {
      try {
        var asScale = item.asScaleItem();
        objItem.requerido = asScale.isRequired();
        objItem.limiteInferior = asScale.getLowerBound();
        objItem.limiteSuperior = asScale.getUpperBound();
        objItem.etiquetaIzquierda = asScale.getLeftLabel();
        objItem.etiquetaDerecha = asScale.getRightLabel();
      } catch (e) {
        Logger.log("Error procesando SCALE de: " + item.getTitle());
      }
    } else {
      // Intentar ver si es requerido para otros tipos de datos
      try {
        if (tipoItem === 'TEXT') objItem.requerido = item.asTextItem().isRequired();
        else if (tipoItem === 'PARAGRAPH_TEXT') objItem.requerido = item.asParagraphTextItem().isRequired();
        else if (tipoItem === 'DATE') objItem.requerido = item.asDateItem().isRequired();
        else if (tipoItem === 'DATETIME') objItem.requerido = item.asDateTimeItem().isRequired();
        else if (tipoItem === 'TIME') objItem.requerido = item.asTimeItem().isRequired();
        else if (tipoItem === 'FILE_UPLOAD') objItem.requerido = false; // No hay un método estándar expuesto en Apps Script para isRequired de File Upload a veces.
      } catch (e) {}
    }
    
    // Si es un quiebre de página (sección)
    if (tipoItem === 'PAGE_BREAK') {
      try {
        var pageItem = item.asPageBreakItem();
        var nav = pageItem.getGoToPage();
        if (nav) {
          objItem.alTerminarSeccion_IrA = nav.getTitle() || "Página sin título (ID: " + nav.getId() + ")";
        }
      } catch(e){}
    }
    
    estructura.items.push(objItem);
  }
  
  // Guardar en Drive como archivo JSON
  var jsonString = JSON.stringify(estructura, null, 2);
  var nombreArchivo = 'Estructura_Formulario_' + formId + '.json';
  
  // Crear el archivo en la raíz de Google Drive
  var blob = Utilities.newBlob(jsonString, 'application/json', nombreArchivo);
  var file = DriveApp.createFile(blob);
  
  Logger.log('✅ ¡Magia completada! Estructura extraída exitosamente.');
  Logger.log('📁 Archivo guardado en tu Drive como: ' + nombreArchivo);
  Logger.log('🔗 Link directo al archivo JSON: ' + file.getUrl());
}
