// ==========================================
// GESTOR DE DOCUMENTOS - E-FIRMACONTRATA v3.0
// Sistema de Gestión de Documentos y Formularios
// Real Estate Gold Life System
// ==========================================

// CONFIGURACIÓN
const DOCS_CONFIG = {
  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  HOJA_LOG: 'LOG_DOCUMENTOS',
  HOJA_VALIDACIONES: 'LOG_VALIDACIONES',
  VERSION: 'v3.0-produccion',
  PLANTILLA_DATOS_CONTRATO: '1zlYZrcue02cK2v-HSWecTyFfp_-_JwNqqknEs9q7q30',
  CARPETA_RAIZ_ID: '1tJSOD4-OXmx-GNmuvPxRAWRzRX6Dh8gE'
};

// ==========================================
// MENÚ PERSONALIZADO - E-FIRMACONTRATA
// ==========================================

/**
 * Crea el menú personalizado cuando se abre la hoja
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🏠 E-FirmaContrata')
    .addItem('📋 Panel de Validación', 'abrirPanelValidacion')
    .addSeparator()
    .addItem('📧 Enviar Email a Inquilino', 'mostrarPopupEmailInquilino')
    .addSeparator()
    .addItem('🔄 Actualizar Estados', 'actualizarTodosLosEstados')
    .addItem('📊 Ver Estadísticas', 'mostrarEstadisticas')
    .addSeparator()
    .addItem('⚙️ Configuración', 'mostrarConfiguracion')
    .addToUi();
}

/**
 * Muestra el popup para enviar email al inquilino
 */
function mostrarPopupEmailInquilino() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Obtener la fila activa
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const filaActiva = sheet.getActiveRange().getRow();
    
    // Validar que sea una fila válida (no el header)
    if (filaActiva <= 1) {
      ui.alert('⚠️ Seleccione un registro', 'Por favor seleccione una fila con un registro de inmueble.', ui.ButtonSet.OK);
      return;
    }
    
    // Obtener el CDR de la fila actual
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO') + 1;
    const cdr = sheet.getRange(filaActiva, cdrCol).getValue();
    
    if (!cdr) {
      ui.alert('⚠️ Sin Código de Registro', 'Esta fila no tiene un código de registro válido.', ui.ButtonSet.OK);
      return;
    }
    
    // Guardar la fila y CDR actual en Properties
    PropertiesService.getScriptProperties().setProperties({
      'currentRow': filaActiva.toString(),
      'currentCDR': cdr
    });
    
    // Mostrar el popup
    const html = HtmlService.createHtmlOutputFromFile('popup_email_inquilino')
      .setWidth(500)
      .setHeight(600)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    ui.showModalDialog(html, '📧 Enviar Formulario al Inquilino - CDR: ' + cdr);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Actualiza todos los estados
 */
function actualizarTodosLosEstados() {
  SpreadsheetApp.getUi().alert(
    '♻️ Actualización de Estados',
    'Función en desarrollo.\n\nActualizará automáticamente todos los estados pendientes.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Muestra estadísticas del sistema
 */
function mostrarEstadisticas() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
    const lastRow = sheet.getLastRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Encontrar columna de estado
    const estadoCol = headers.indexOf('ESTADO DEL INMUEBLE') + 1;
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    
    let stats = {
      total: lastRow - 1,
      estudioAprobado: 0,
      formularioEnviado: 0,
      documentosValidados: 0,
      contratoGenerado: 0,
      pendientes: 0
    };
    
    if (estadoCol > 0 && lastRow > 1) {
      const datos = sheet.getRange(2, estadoCol, lastRow - 1, 1).getValues();
      
      datos.forEach(row => {
        const estado = row[0];
        if (estado === 'ESTUDIO APROBADO') stats.estudioAprobado++;
        else if (estado === 'PENDIENTE') stats.pendientes++;
      });
    }
    
    SpreadsheetApp.getUi().alert(
      '📊 Estadísticas del Sistema',
      `Total de registros: ${stats.total}\n` +
      `Estudios aprobados: ${stats.estudioAprobado}\n` +
      `Pendientes: ${stats.pendientes}\n` +
      `\n` +
      `Porcentaje procesado: ${Math.round((stats.estudioAprobado/stats.total)*100)}%`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error obteniendo estadísticas: ' + error.toString());
  }
}

/**
 * Muestra configuración del sistema
 */
function mostrarConfiguracion() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    OCR_CLIENT_EMAIL: props.getProperty('OCR_CLIENT_EMAIL') ? '✅ Configurado' : '❌ No configurado',
    OCR_PRIVATE_KEY: props.getProperty('OCR_PRIVATE_KEY') ? '✅ Configurado' : '❌ No configurado',
    CARPETA_RAIZ_ID: props.getProperty('CARPETA_RAIZ_ID') || '1tJSOD4-OXmx-GNmuvPxRAWRzRX6Dh8gE'
  };
  
  SpreadsheetApp.getUi().alert(
    '⚙️ Configuración del Sistema',
    `OCR Client Email: ${config.OCR_CLIENT_EMAIL}\n` +
    `OCR Private Key: ${config.OCR_PRIVATE_KEY}\n` +
    `Carpeta Drive ID: ${config.CARPETA_RAIZ_ID}\n` +
    `\n` +
    `API URL:\n` +
    `https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ==========================================
// FUNCIONES PRINCIPALES DE API
// ==========================================

function doGet(e) {
  try {
    const accion = e.parameter.accion;
    
    switch(accion) {
      case 'verificarLink':
        return handleVerificarLink(e);
      case 'obtenerRegistrosInquilinos':
        return handleObtenerRegistrosInquilinos();
      case 'obtenerRegistrosPropietarios':
        return handleObtenerRegistrosPropietarios();
      case 'obtenerDocumentosPanel':
        return handleObtenerDocumentosPanel(e);
      case 'obtenerDatosContrato':
        return handleObtenerDatosContrato(e);
      case 'obtenerEstadoAprobaciones':
        return handleObtenerEstadoAprobaciones(e);
      case 'obtenerContrato':
        return handleObtenerContrato(e);
      case 'test':
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'API funcionando correctamente',
            version: DOCS_CONFIG.VERSION,
          }))
          .setMimeType(ContentService.MimeType.JSON);
      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            message: 'Acción no válida'
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const datosJson = e.postData.contents;
    const datos = JSON.parse(datosJson);
    const accion = datos.accion;
    
    switch(accion) {
      case 'enviarFormularioInquilino':
        return handleEnviarFormularioInquilino(datos);
      case 'enviarFormularioPropietario':
        return handleEnviarFormularioPropietario(datos);
      case 'procesarFormularioInquilino':
        return handleProcesarFormularioInquilino(datos);
      case 'procesarFormularioPropietario':
        return handleProcesarFormularioPropietario(datos);
      case 'procesarValidacionInquilino':
        return handleProcesarValidacionInquilino(datos);
      case 'procesarValidacionPropietario':
        return handleProcesarValidacionPropietario(datos);
      case 'actualizarCampoValidacion':
        return handleActualizarCampoValidacion(datos);
      case 'enviarCorreccionInquilino':
        return handleEnviarCorreccionInquilino(datos);
      case 'enviarCorreccionPropietario':
        return handleEnviarCorreccionPropietario(datos);
      case 'generarContrato':
        return handleGenerarContrato(datos);
      case 'registrarAprobacionContrato':
        return handleRegistrarAprobacionContrato(datos);
      case 'subirContratoFirmado':
        return handleSubirContratoFirmado(datos);
      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            message: 'Acción POST no válida'
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('Error en doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// HANDLERS DE API EXISTENTES
// ==========================================

function handleVerificarLink(e) {
  const cdr = e.parameter.cdr;
  const tipo = e.parameter.tipo;
  const resultado = verificarEstadoLink(cdr, tipo);
  
  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleObtenerRegistrosInquilinos() {
  try {
    const registros = obtenerRegistrosInquilinos();
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: registros
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleObtenerRegistrosPropietarios() {
  try {
    const registros = obtenerRegistrosPropietarios();
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: registros
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleObtenerDocumentosPanel(e) {
  try {
    const cdr = e.parameter.cdr;
    const documentos = obtenerDocumentosDelCDR(cdr);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        documentos: documentos
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleEnviarFormularioInquilino(datos) {
  try {
    const resultado = procesarFormularioInquilino(
      datos.codigoRegistro,
      datos.datosFormulario,
      datos.archivosBase64
    );
    
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleProcesarFormularioInquilino(datos) {
  return handleEnviarFormularioInquilino(datos);
}

function handleEnviarFormularioPropietario(datos) {
  try {
    const resultado = procesarFormularioPropietario(
      datos.codigoRegistro,
      datos.datosFormulario,
      datos.archivosBase64
    );
    
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleProcesarFormularioPropietario(datos) {
  return handleEnviarFormularioPropietario(datos);
}

function handleProcesarValidacionInquilino(datos) {
  try {
    const resultado = procesarValidacionInquilino(datos);
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleProcesarValidacionPropietario(datos) {
  try {
    const resultado = procesarValidacionPropietario(datos);
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleActualizarCampoValidacion(datos) {
  try {
    const resultado = actualizarCampoValidacion(datos);
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleEnviarCorreccionInquilino(datos) {
  try {
    const resultado = enviarCorreccionInquilino(datos);
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleEnviarCorreccionPropietario(datos) {
  try {
    const resultado = enviarCorreccionPropietario(datos);
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// HANDLERS DE CONTRATOS (NUEVOS)
// ==========================================

/**
 * Obtener datos del contrato
 */
function handleObtenerDatosContrato(e) {
  try {
    const cdr = e.parameter.cdr;
    
    if (!cdr) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'CDR no proporcionado'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Recopilar datos usando función de GESTOR_CONTRATOS.gs
    const datos = recopilarDatosContrato(cdr);
    
    return ContentService
      .createTextOutput(JSON.stringify(datos))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error en handleObtenerDatosContrato: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Generar contrato
 */
function handleGenerarContrato(datos) {
  try {
    const { cdr } = datos;
    
    if (!cdr) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'CDR no proporcionado'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Generar contrato usando función de GESTOR_CONTRATOS.gs
    const resultado = generarContrato(cdr);
    
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error en handleGenerarContrato: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Registrar aprobación de contrato
 */
function handleRegistrarAprobacionContrato(datos) {
  try {
    const { cdr, tipo, accion, comentarios } = datos;
    
    if (!cdr || !tipo || !accion) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Faltan datos requeridos'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Registrar aprobación usando función de GESTOR_CONTRATOS.gs
    const resultado = registrarAprobacionContrato(cdr, tipo, accion, comentarios);
    
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error en handleRegistrarAprobacionContrato: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Obtener estado de aprobaciones
 */
function handleObtenerEstadoAprobaciones(e) {
  try {
    const cdr = e.parameter.cdr;
    
    if (!cdr) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'CDR no proporcionado'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Obtener estados usando función de GESTOR_CONTRATOS.gs
    const estados = obtenerEstadosAprobacion(cdr);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        estados: estados
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error en handleObtenerEstadoAprobaciones: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Subir contrato firmado
 */
function handleSubirContratoFirmado(datos) {
  try {
    const { cdr, archivoBase64, nombreArchivo } = datos;
    
    if (!cdr || !archivoBase64) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Faltan datos requeridos'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Procesar el archivo
    const carpetaRaiz = DriveApp.getFolderById(DOCS_CONFIG.CARPETA_RAIZ_ID);
    const carpetaCDR = buscarOcrearCarpeta(carpetaRaiz, cdr);
    const carpetaContratos = buscarOcrearCarpeta(carpetaCDR, 'CONTRATOS_FIRMADOS');
    
    // Crear el archivo
    const blob = Utilities.newBlob(
      Utilities.base64Decode(archivoBase64.split(',')[1]),
      'application/pdf',
      nombreArchivo || `Contrato_Firmado_${cdr}_${new Date().getTime()}.pdf`
    );
    
    const archivo = carpetaContratos.createFile(blob);
    
    // Actualizar estado en la hoja
    actualizarEstadoContrato(cdr, 'CONTRATO FIRMADO', '✅ Contrato firmado y archivado');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Contrato firmado guardado exitosamente',
        url: archivo.getUrl(),
        id: archivo.getId()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error en handleSubirContratoFirmado: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Obtener contrato para visualización (usado por validacion-contrato.html)
 */
function handleObtenerContrato(e) {
  try {
    const cdr = e.parameter.cdr;
    const docId = e.parameter.docId;
    
    if (!cdr || !docId) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Faltan parámetros requeridos'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Obtener el documento de Google Docs
    const doc = DocumentApp.openById(docId);
    const contenido = doc.getBody().getText();
    
    // Obtener datos adicionales
    const datos = recopilarDatosContrato(cdr);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        contenido: contenido,
        datos: datos.data,
        docId: docId,
        url: doc.getUrl()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error en handleObtenerContrato: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// FUNCIONES DE PROCESAMIENTO
// ==========================================

/**
 * Procesar formulario de inquilino
 */
function procesarFormularioInquilino(codigoRegistro, datosFormulario, archivosBase64) {
  try {
    Logger.log('Procesando formulario inquilino para CDR: ' + codigoRegistro);
    
    // Buscar la fila correspondiente
    const fila = buscarFilaPorCDR(codigoRegistro);
    if (!fila) {
      return { success: false, message: 'Código de registro no encontrado' };
    }
    
    // Guardar archivos en Drive
    const urlsCarpetas = guardarDocumentosInquilino(codigoRegistro, archivosBase64, datosFormulario);
    
    // Actualizar datos en la hoja
    actualizarDatosInquilino(fila, datosFormulario, urlsCarpetas);
    
    // Enviar email de confirmación
    enviarEmailConfirmacionInquilino(codigoRegistro, datosFormulario);
    
    // Registrar en log
    registrarLog('INQUILINO', codigoRegistro, 'Formulario procesado exitosamente');
    
    return {
      success: true,
      message: 'Formulario procesado exitosamente',
      codigo: codigoRegistro
    };
    
  } catch (error) {
    Logger.log('Error procesando formulario inquilino: ' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * Procesar formulario de propietario
 */
function procesarFormularioPropietario(codigoRegistro, datosFormulario, archivosBase64) {
  try {
    Logger.log('Procesando formulario propietario para CDR: ' + codigoRegistro);
    
    // Buscar la fila correspondiente
    const fila = buscarFilaPorCDR(codigoRegistro);
    if (!fila) {
      return { success: false, message: 'Código de registro no encontrado' };
    }
    
    // Procesar OCR si hay certificado de tradición
    if (archivosBase64.certTradicion) {
      const resultadoOCR = procesarCertificadoDesdeFormulario(archivosBase64.certTradicion.contenido);
      if (resultadoOCR.success) {
        datosFormulario.datosOCR = resultadoOCR;
      }
    }
    
    // Guardar archivos en Drive
    const urlsCarpetas = guardarDocumentosPropietario(codigoRegistro, archivosBase64, datosFormulario);
    
    // Actualizar datos en la hoja
    actualizarDatosPropietario(fila, datosFormulario, urlsCarpetas);
    
    // Enviar email de confirmación
    enviarEmailConfirmacionPropietario(codigoRegistro, datosFormulario);
    
    // Registrar en log
    registrarLog('PROPIETARIO', codigoRegistro, 'Formulario procesado exitosamente');
    
    return {
      success: true,
      message: 'Formulario procesado exitosamente',
      codigo: codigoRegistro
    };
    
  } catch (error) {
    Logger.log('Error procesando formulario propietario: ' + error.toString());
    return { success: false, message: error.message };
  }
}

// ==========================================
// FUNCIONES DE VALIDACIÓN
// ==========================================

/**
 * Verificar estado del link
 */
function verificarEstadoLink(cdr, tipo) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const fila = buscarFilaPorCDR(cdr);
    
    if (!fila) {
      return {
        success: false,
        activo: false,
        mensaje: 'Código de registro no válido'
      };
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    const detalles = sheet.getRange(fila, detallesCol).getValue();
    
    // Verificar según el tipo
    if (tipo === 'inquilino') {
      if (detalles.includes('Formulario del inquilino diligenciado')) {
        return {
          success: true,
          activo: false,
          mensaje: 'Este formulario ya fue completado'
        };
      }
    } else if (tipo === 'propietario') {
      if (detalles.includes('Formulario del propietario diligenciado')) {
        return {
          success: true,
          activo: false,
          mensaje: 'Este formulario ya fue completado'
        };
      }
    }
    
    return {
      success: true,
      activo: true,
      mensaje: 'Link activo y válido'
    };
    
  } catch (error) {
    Logger.log('Error verificando link: ' + error.toString());
    return {
      success: false,
      activo: false,
      mensaje: 'Error al verificar el link'
    };
  }
}

/**
 * Obtener registros de inquilinos pendientes
 */
function obtenerRegistrosInquilinos() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const lastRow = sheet.getLastRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const registros = [];
    
    for (let i = 2; i <= lastRow; i++) {
      const detalles = sheet.getRange(i, headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1).getValue();
      
      if (detalles.includes('Formulario del inquilino')) {
        const row = sheet.getRange(i, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        registros.push({
          cdr: obtenerValorPorHeader(headers, row, 'CODIGO DE REGISTRO'),
          detalles: detalles,
          inquilino: {
            nombre: obtenerValorPorHeader(headers, row, 'NOMBRE COMPLETO INQUILINO'),
            documento: obtenerValorPorHeader(headers, row, 'NUMERO DOCUMENTO INQUILINO'),
            email: obtenerValorPorHeader(headers, row, 'CORREO INQUILINO'),
            celular: obtenerValorPorHeader(headers, row, 'CELULAR INQUILINO')
          },
          codeudores: obtenerCodeudores(headers, row)
        });
      }
    }
    
    return registros;
    
  } catch (error) {
    Logger.log('Error obteniendo registros inquilinos: ' + error.toString());
    throw error;
  }
}

/**
 * Obtener registros de propietarios pendientes
 */
function obtenerRegistrosPropietarios() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const lastRow = sheet.getLastRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const registros = [];
    
    for (let i = 2; i <= lastRow; i++) {
      const detalles = sheet.getRange(i, headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1).getValue();
      
      if (detalles.includes('Formulario del propietario')) {
        const row = sheet.getRange(i, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        registros.push({
          cdr: obtenerValorPorHeader(headers, row, 'CODIGO DE REGISTRO'),
          detalles: detalles,
          propietario: {
            nombre: obtenerValorPorHeader(headers, row, 'Ingrese Nombres y Apellidos'),
            documento: obtenerValorPorHeader(headers, row, 'Número de documento'),
            email: obtenerValorPorHeader(headers, row, 'Correo electrónico'),
            celular: obtenerValorPorHeader(headers, row, 'Celular')
          }
        });
      }
    }
    
    return registros;
    
  } catch (error) {
    Logger.log('Error obteniendo registros propietarios: ' + error.toString());
    throw error;
  }
}

// ==========================================
// FUNCIONES DE GUARDADO DE DOCUMENTOS
// ==========================================

/**
 * Guardar documentos del inquilino en Drive
 */
function guardarDocumentosInquilino(codigoRegistro, archivosBase64, datosFormulario) {
  try {
    const carpetaRaiz = DriveApp.getFolderById(DOCS_CONFIG.CARPETA_RAIZ_ID);
    
    // Crear o buscar carpeta del CDR
    let carpetaCDR;
    const folders = carpetaRaiz.getFoldersByName(codigoRegistro);
    if (folders.hasNext()) {
      carpetaCDR = folders.next();
    } else {
      carpetaCDR = carpetaRaiz.createFolder(codigoRegistro);
    }
    
    // Crear carpeta de inquilino
    const carpetaInquilino = carpetaCDR.createFolder(`INQUILINO_${datosFormulario.inquilino.nombre}_${new Date().getTime()}`);
    
    // Guardar archivos
    for (const [nombre, contenidoBase64] of Object.entries(archivosBase64)) {
      if (contenidoBase64 && contenidoBase64.contenido) {
        const blob = Utilities.newBlob(
          Utilities.base64Decode(contenidoBase64.contenido.split(',')[1]),
          contenidoBase64.tipo,
          `${nombre}_${new Date().getTime()}`
        );
        carpetaInquilino.createFile(blob);
      }
    }
    
    // Actualizar documento con datos del contrato
    actualizarDocumentoDatosContrato(carpetaCDR, datosFormulario, 'INQUILINO');
    
    return {
      carpetaPrincipal: carpetaCDR.getUrl(),
      carpetaInquilino: carpetaInquilino.getUrl()
    };
    
  } catch (error) {
    Logger.log('Error guardando documentos inquilino: ' + error.toString());
    throw error;
  }
}

/**
 * Guardar documentos del propietario en Drive
 */
function guardarDocumentosPropietario(codigoRegistro, archivosBase64, datosFormulario) {
  try {
    const carpetaRaiz = DriveApp.getFolderById(DOCS_CONFIG.CARPETA_RAIZ_ID);
    
    // Buscar carpeta del CDR
    const folders = carpetaRaiz.getFoldersByName(codigoRegistro);
    let carpetaCDR;
    if (folders.hasNext()) {
      carpetaCDR = folders.next();
    } else {
      carpetaCDR = carpetaRaiz.createFolder(codigoRegistro);
    }
    
    // Crear carpeta de propietario
    const carpetaPropietario = carpetaCDR.createFolder(`PROPIETARIO_${datosFormulario.propietario.nombre}_${new Date().getTime()}`);
    
    // Guardar archivos básicos
    for (const [nombre, contenidoBase64] of Object.entries(archivosBase64)) {
      if (contenidoBase64 && contenidoBase64.contenido && nombre !== 'serviciosPublicos') {
        const blob = Utilities.newBlob(
          Utilities.base64Decode(contenidoBase64.contenido.split(',')[1]),
          contenidoBase64.tipo,
          `${nombre}_${new Date().getTime()}`
        );
        carpetaPropietario.createFile(blob);
      }
    }
    
    // Guardar servicios públicos
    if (datosFormulario.serviciosPublicos && datosFormulario.serviciosPublicos.length > 0) {
      const carpetaServicios = carpetaPropietario.createFolder('SERVICIOS_PUBLICOS');
      
      datosFormulario.serviciosPublicos.forEach(servicio => {
        if (servicio.archivo && servicio.archivo.contenido) {
          const blob = Utilities.newBlob(
            Utilities.base64Decode(servicio.archivo.contenido.split(',')[1]),
            servicio.archivo.tipo,
            `servicio_${servicio.tipo}_${new Date().getTime()}`
          );
          carpetaServicios.createFile(blob);
        }
      });
    }
    
    // Actualizar documento con datos del propietario
    actualizarDocumentoDatosContrato(carpetaCDR, datosFormulario, 'PROPIETARIO');
    
    return {
      carpetaPrincipal: carpetaCDR.getUrl(),
      carpetaPropietario: carpetaPropietario.getUrl()
    };
    
  } catch (error) {
    Logger.log('Error guardando documentos propietario: ' + error.toString());
    throw error;
  }
}

// ==========================================
// FUNCIONES DE ACTUALIZACIÓN DE DATOS
// ==========================================

/**
 * Actualizar datos del inquilino en la hoja
 */
function actualizarDatosInquilino(fila, datosFormulario, urlsCarpetas) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Mapeo de campos
    const campos = {
      'CORREO INQUILINO': datosFormulario.inquilino.email,
      'NOMBRE COMPLETO INQUILINO': datosFormulario.inquilino.nombre,
      'TIPO DOCUMENTO INQUILINO': datosFormulario.inquilino.tipoDocumento,
      'NUMERO DOCUMENTO INQUILINO': datosFormulario.inquilino.numeroDocumento,
      'CELULAR INQUILINO': datosFormulario.inquilino.celular,
      'OCUPACIÓN INQUILINO': datosFormulario.inquilino.ocupacion,
      'FECHA INICIO DEL CONTRATO': datosFormulario.fechaInicio,
      'DETALLES DEL ESTADO DEL INMUEBLE': '📄 Formulario del inquilino diligenciado. Pendiente validación',
      'ESTADO DOCUMENTAL': 'INQ_SUBMITTED'
    };
    
    // Actualizar campos
    for (const [header, valor] of Object.entries(campos)) {
      const colIndex = headers.indexOf(header) + 1;
      if (colIndex > 0 && valor) {
        sheet.getRange(fila, colIndex).setValue(valor);
      }
    }
    
    // Guardar codeudores como JSON
    if (datosFormulario.codeudores && datosFormulario.codeudores.length > 0) {
      const codeudorCol = headers.indexOf('CODEUDORES_JSON') + 1;
      if (codeudorCol > 0) {
        sheet.getRange(fila, codeudorCol).setValue(JSON.stringify(datosFormulario.codeudores));
      }
    }
    
    // Guardar URLs de carpetas
    const urlCol = headers.indexOf('URL_DOCUMENTOS_INQ') + 1;
    if (urlCol > 0) {
      sheet.getRange(fila, urlCol).setValue(urlsCarpetas.carpetaInquilino);
    }
    
  } catch (error) {
    Logger.log('Error actualizando datos inquilino: ' + error.toString());
    throw error;
  }
}

/**
 * Actualizar datos del propietario en la hoja
 */
function actualizarDatosPropietario(fila, datosFormulario, urlsCarpetas) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Mapeo de campos
    const campos = {
      'Correo electrónico': datosFormulario.propietario.email,
      'Ingrese Nombres y Apellidos': datosFormulario.propietario.nombre,
      'TIPO DOCUMENTO PROPIETARIO': datosFormulario.propietario.tipoDocumento,
      'Número de documento': datosFormulario.propietario.numeroDocumento,
      'Celular': datosFormulario.propietario.celular,
      'DETALLES DEL ESTADO DEL INMUEBLE': '📄 Formulario del propietario diligenciado. Pendiente validación',
      'ESTADO DOCUMENTAL': 'PROP_SUBMITTED'
    };
    
    // Actualizar campos
    for (const [header, valor] of Object.entries(campos)) {
      const colIndex = headers.indexOf(header) + 1;
      if (colIndex > 0 && valor) {
        sheet.getRange(fila, colIndex).setValue(valor);
      }
    }
    
    // Si hay datos OCR, actualizarlos
    if (datosFormulario.datosOCR) {
      const camposOCR = {
        'MATRICULA_INMOBILIARIA': datosFormulario.datosOCR.matricula,
        'DIRECCION_CERTIFICADO': datosFormulario.datosOCR.direccion,
        'AREA_M2': datosFormulario.datosOCR.area,
        'PROPIETARIOS_CERTIFICADO': datosFormulario.datosOCR.propietarios
      };
      
      for (const [header, valor] of Object.entries(camposOCR)) {
        const colIndex = headers.indexOf(header) + 1;
        if (colIndex > 0 && valor) {
          sheet.getRange(fila, colIndex).setValue(valor);
        }
      }
    }
    
    // Guardar URLs de carpetas
    const urlCol = headers.indexOf('URL_DOCUMENTOS_PROP') + 1;
    if (urlCol > 0) {
      sheet.getRange(fila, urlCol).setValue(urlsCarpetas.carpetaPropietario);
    }
    
  } catch (error) {
    Logger.log('Error actualizando datos propietario: ' + error.toString());
    throw error;
  }
}

// ==========================================
// FUNCIONES DE PANEL DE VALIDACIÓN
// ==========================================

/**
 * Función para abrir el Panel de Validación
 */
function abrirPanelValidacion() {
  try {
    // Cargar el archivo HTML que está en el proyecto de Apps Script
    const html = HtmlService.createHtmlOutputFromFile('panel_validacion')
      .setWidth(1400)
      .setHeight(800)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    // Mostrar el diálogo modal
    SpreadsheetApp.getUi().showModalDialog(html, '🔍 Panel de Validación - E-FirmaContrata');
    
    Logger.log('Panel de validación abierto correctamente');
    
  } catch (error) {
    Logger.log('Error abriendo panel: ' + error.toString());
    SpreadsheetApp.getUi().alert(
      '⌠Error al abrir el panel',
      'No se encontró el archivo panel_validacion.html en el proyecto.\n\n' +
      'Verifique que:\n' +
      '1. El archivo existe en Apps Script\n' +
      '2. El nombre es exactamente "panel_validacion" (sin .html)\n' +
      '3. El archivo contiene código HTML válido',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Obtener documentos de un CDR para el panel
 */
function obtenerDocumentosDelCDR(cdr) {
  try {
    const carpetaRaiz = DriveApp.getFolderById(DOCS_CONFIG.CARPETA_RAIZ_ID);
    const folders = carpetaRaiz.getFoldersByName(cdr);
    
    if (!folders.hasNext()) {
      return { inquilino: [], propietario: [] };
    }
    
    const carpetaCDR = folders.next();
    const documentos = {
      inquilino: [],
      propietario: []
    };
    
    // Buscar carpetas de inquilino y propietario
    const subfolders = carpetaCDR.getFolders();
    while (subfolders.hasNext()) {
      const subfolder = subfolders.next();
      const nombre = subfolder.getName();
      
      if (nombre.startsWith('INQUILINO_')) {
        const archivos = subfolder.getFiles();
        while (archivos.hasNext()) {
          const archivo = archivos.next();
          documentos.inquilino.push({
            nombre: archivo.getName(),
            url: archivo.getUrl(),
            tipo: determinarTipoDocumento(archivo.getName()),
            tamaño: archivo.getSize()
          });
        }
      } else if (nombre.startsWith('PROPIETARIO_')) {
        const archivos = subfolder.getFiles();
        while (archivos.hasNext()) {
          const archivo = archivos.next();
          documentos.propietario.push({
            nombre: archivo.getName(),
            url: archivo.getUrl(),
            tipo: determinarTipoDocumento(archivo.getName()),
            tamaño: archivo.getSize()
          });
        }
      }
    }
    
    return documentos;
    
  } catch (error) {
    Logger.log('Error obteniendo documentos: ' + error.toString());
    throw error;
  }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Buscar fila por CDR
 */
function buscarFilaPorCDR(cdr) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const lastRow = sheet.getLastRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO') + 1;
    
    for (let i = 2; i <= lastRow; i++) {
      const valorCDR = sheet.getRange(i, cdrCol).getValue();
      if (valorCDR === cdr) {
        return i;
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log('Error buscando CDR: ' + error.toString());
    return null;
  }
}

/**
 * Obtener valor por header
 */
function obtenerValorPorHeader(headers, row, headerName) {
  const index = headers.indexOf(headerName);
  return index >= 0 ? row[index] : '';
}

/**
 * Obtener codeudores de una fila
 */
function obtenerCodeudores(headers, row) {
  const codeudorCol = headers.indexOf('CODEUDORES_JSON');
  if (codeudorCol >= 0 && row[codeudorCol]) {
    try {
      return JSON.parse(row[codeudorCol]);
    } catch (e) {
      return [];
    }
  }
  return [];
}

/**
 * Buscar o crear carpeta
 */
function buscarOcrearCarpeta(carpetaPadre, nombreCarpeta) {
  const folders = carpetaPadre.getFoldersByName(nombreCarpeta);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return carpetaPadre.createFolder(nombreCarpeta);
  }
}

/**
 * Actualizar estado del contrato en la hoja
 */
function actualizarEstadoContrato(cdr, estado, detalles) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const fila = buscarFilaPorCDR(cdr);
    
    if (!fila) {
      Logger.log(`No se encontró registro con CDR: ${cdr}`);
      return;
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const estadoCol = headers.indexOf('ESTADO DEL INMUEBLE') + 1;
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    
    if (estadoCol > 0) {
      sheet.getRange(fila, estadoCol).setValue(estado);
    }
    
    if (detallesCol > 0) {
      sheet.getRange(fila, detallesCol).setValue(detalles);
    }
    
    Logger.log(`Estado actualizado para CDR ${cdr}: ${estado} - ${detalles}`);
    
  } catch (error) {
    Logger.log(`Error actualizando estado: ${error.toString()}`);
  }
}

/**
 * Actualizar documento con datos del contrato
 */
function actualizarDocumentoDatosContrato(carpetaCDR, datosFormulario, tipo) {
  try {
    // Buscar o crear el documento de datos
    let doc;
    const files = carpetaCDR.getFilesByName('DATOS_CONTRATO.gdoc');
    
    if (files.hasNext()) {
      doc = DocumentApp.openById(files.next().getId());
    } else {
      doc = DocumentApp.create('DATOS_CONTRATO');
      DriveApp.getFileById(doc.getId()).moveTo(carpetaCDR);
    }
    
    const body = doc.getBody();
    
    // Agregar sección según el tipo
    const fecha = new Date().toLocaleString('es-CO');
    body.appendParagraph(`\n=== ${tipo} - ${fecha} ===`);
    body.appendParagraph(JSON.stringify(datosFormulario, null, 2));
    
    doc.saveAndClose();
    
  } catch (error) {
    Logger.log('Error actualizando documento de datos: ' + error.toString());
  }
}

/**
 * Determinar tipo de documento por nombre
 */
function determinarTipoDocumento(nombreArchivo) {
  const nombre = nombreArchivo.toLowerCase();
  
  if (nombre.includes('pago') || nombre.includes('comprobante')) return 'comprobantePago';
  if (nombre.includes('estudio') || nombre.includes('aprobado')) return 'estudioAprobado';
  if (nombre.includes('cedula') || nombre.includes('documento') || nombre.includes('identidad')) return 'documentoIdentidad';
  if (nombre.includes('sarlaft')) return 'sarlaft';
  if (nombre.includes('banco') || nombre.includes('bancario')) return 'certificadoBancario';
  if (nombre.includes('tradicion') || nombre.includes('libertad')) return 'tradicionLibertad';
  if (nombre.includes('agua')) return 'servicioAgua';
  if (nombre.includes('luz') || nombre.includes('energia')) return 'servicioLuz';
  if (nombre.includes('gas')) return 'servicioGas';
  if (nombre.includes('telefono') || nombre.includes('internet')) return 'servicioTelefono';
  if (nombre.includes('administracion')) return 'administracion';
  if (nombre.includes('reglamento')) return 'reglamento';
  if (nombre.includes('manual') || nombre.includes('convivencia')) return 'manualConvivencia';
  
  return 'otro';
}

// ==========================================
// FUNCIONES DE PROCESAMIENTO DE VALIDACIONES
// ==========================================

/**
 * Procesar validación de inquilino
 */
function procesarValidacionInquilino(datos) {
  try {
    const { cdr, estado, observaciones, campos } = datos;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    
    // Buscar la fila del registro
    const fila = buscarFilaPorCDR(cdr);
    if (!fila) {
      return { success: false, message: 'Registro no encontrado' };
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    const estadoDocCol = headers.indexOf('ESTADO DOCUMENTAL') + 1;
    
    // Actualizar campos editados si hay
    if (campos) {
      actualizarCamposInquilino(fila, campos);
    }
    
    // Procesar según el estado
    if (estado === 'aprobado') {
      // Actualizar estados
      sheet.getRange(fila, detallesCol).setValue('✅ Documentos del inquilino aprobados. Pendiente formulario propietario');
      if (estadoDocCol > 0) {
        sheet.getRange(fila, estadoDocCol).setValue('INQ_VALIDATED');
      }
      
      // Enviar email al propietario
      enviarEmailPropietario(cdr);
      
      return { 
        success: true, 
        message: 'Documentos aprobados. Email enviado al propietario' 
      };
      
    } else if (estado === 'correccion') {
      // Actualizar estado
      sheet.getRange(fila, detallesCol).setValue('📝 Corrección solicitada al inquilino');
      if (estadoDocCol > 0) {
        sheet.getRange(fila, estadoDocCol).setValue('INQ_CORRECTION');
      }
      
      // Enviar email de corrección
      enviarEmailCorreccionInquilino(cdr, observaciones);
      
      return { 
        success: true, 
        message: 'Solicitud de corrección enviada' 
      };
    }
    
  } catch (error) {
    Logger.log('Error procesando validación inquilino: ' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * Procesar validación de propietario
 */
function procesarValidacionPropietario(datos) {
  try {
    const { cdr, estado, observaciones, campos } = datos;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    
    // Buscar la fila del registro
    const fila = buscarFilaPorCDR(cdr);
    if (!fila) {
      return { success: false, message: 'Registro no encontrado' };
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    const estadoDocCol = headers.indexOf('ESTADO DOCUMENTAL') + 1;
    
    // Actualizar campos editados si hay
    if (campos) {
      actualizarCamposPropietario(fila, campos);
    }
    
    // Procesar según el estado
    if (estado === 'aprobado') {
      // Actualizar estados
      sheet.getRange(fila, detallesCol).setValue('✅ Documentos completos. Listo para generar contrato');
      if (estadoDocCol > 0) {
        sheet.getRange(fila, estadoDocCol).setValue('PROP_VALIDATED');
      }
      
      return { 
        success: true, 
        message: 'Documentos aprobados. Sistema listo para generar contrato',
        contratoListo: true
      };
      
    } else if (estado === 'correccion') {
      // Actualizar estado
      sheet.getRange(fila, detallesCol).setValue('📝 Corrección solicitada al propietario');
      if (estadoDocCol > 0) {
        sheet.getRange(fila, estadoDocCol).setValue('PROP_CORRECTION');
      }
      
      // Enviar email de corrección
      enviarEmailCorreccionPropietario(cdr, observaciones);
      
      return { 
        success: true, 
        message: 'Solicitud de corrección enviada' 
      };
    }
    
  } catch (error) {
    Logger.log('Error procesando validación propietario: ' + error.toString());
    return { success: false, message: error.message };
  }
}

// ==========================================
// FUNCIONES DE EMAIL
// ==========================================

/**
 * Enviar email inicial al inquilino
 */
function enviarEmailInquilinoInicial(email, nombre, codigoRegistro, urlFormulario) {
  const asunto = `Formulario de Arrendamiento - ${codigoRegistro}`;
  
  const cuerpoHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📋 Formulario de Arrendamiento</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Estimado/a <strong>${nombre}</strong>,</p>
        
        <p style="color: #666; line-height: 1.6;">
          Su solicitud de arrendamiento ha sido aprobada. Para continuar con el proceso, 
          necesitamos que complete el formulario con sus datos y documentos.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #764ba2; margin-top: 0;">📄 Documentos requeridos:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Comprobante de pago del servicio</li>
            <li>Estudio de arrendamiento aprobado</li>
            <li>Documento de identidad</li>
            <li>Documentos de codeudor(es) si aplica</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlFormulario}" 
             style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
            ➡️ COMPLETAR FORMULARIO
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            ⚠️ <strong>Importante:</strong> Este enlace es único y personal. 
            Una vez completado el formulario, no podrá volver a utilizarse.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #999; font-size: 14px; text-align: center;">
          E-firmaContrata • Real Estate Gold Life System<br>
          Código de registro: ${codigoRegistro}<br>
          Este es un correo automático, por favor no responder.
        </p>
      </div>
    </div>
  `;
  
  MailApp.sendEmail({
    to: email,
    subject: asunto,
    htmlBody: cuerpoHtml
  });
  
  Logger.log(`Email inicial enviado a ${email} con URL: ${urlFormulario}`);
}

/**
 * Enviar email de confirmación al inquilino
 */
function enviarEmailConfirmacionInquilino(codigoRegistro, datosFormulario) {
  try {
    const inquilino = datosFormulario.inquilino;
    const asunto = `Confirmación de recepción - Documentos de arrendamiento ${codigoRegistro}`;
    
    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Documentos Recibidos</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Estimado/a <strong>${inquilino.nombre}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            Confirmamos que hemos recibido exitosamente sus documentos para el proceso de arrendamiento 
            con código de registro <strong>${codigoRegistro}</strong>.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #764ba2; margin-top: 0;">📋 Próximos pasos:</h3>
            <ol style="color: #666; line-height: 1.8;">
              <li>Validación de documentos (24-48 horas)</li>
              <li>Revisión y aprobación final</li>
              <li>Generación del contrato de arrendamiento</li>
              <li>Coordinación de firma y entrega</li>
            </ol>
          </div>
          
          <p style="color: #666;">
            Le notificaremos por este medio cualquier actualización sobre el estado de su solicitud.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            E-firmaContrata • Real Estate Gold Life System<br>
            Este es un correo automático, por favor no responder.
          </p>
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: inquilino.email,
      subject: asunto,
      htmlBody: cuerpoHtml
    });
    
    Logger.log(`Email de confirmación enviado a inquilino: ${inquilino.email}`);
    
  } catch (error) {
    Logger.log('Error enviando email confirmación inquilino: ' + error.toString());
  }
}

/**
 * Enviar email al propietario para iniciar su formulario
 */
function enviarEmailPropietario(cdr) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const fila = buscarFilaPorCDR(cdr);
    
    if (!fila) return;
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = sheet.getRange(fila, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const emailProp = obtenerValorPorHeader(headers, row, 'Correo electrónico');
    const nombreProp = obtenerValorPorHeader(headers, row, 'Ingrese Nombres y Apellidos');
    
    if (!emailProp) {
      Logger.log('No se encontró email del propietario');
      return;
    }
    
    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata';
    const urlFormulario = `${baseUrl}/selector.html?action=formulario-propietario&cdr=${encodeURIComponent(cdr)}`;
    
    const asunto = `Documentación requerida - Contrato de arrendamiento ${cdr}`;
    
    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 Documentación del Propietario</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Estimado/a <strong>${nombreProp}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            Los documentos del inquilino han sido aprobados. Ahora necesitamos que complete 
            su formulario con la documentación requerida para continuar con el proceso de arrendamiento.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #764ba2; margin-top: 0;">📄 Documentos requeridos:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Documento de identidad</li>
              <li>Formulario SARLAFT</li>
              <li>Certificado bancario</li>
              <li>Certificado de tradición y libertad</li>
              <li>Recibos de servicios públicos al día</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${urlFormulario}" 
               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
              ➡️ COMPLETAR FORMULARIO
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            E-firmaContrata • Real Estate Gold Life System<br>
            Código de registro: ${cdr}
          </p>
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: emailProp,
      subject: asunto,
      htmlBody: cuerpoHtml
    });
    
    Logger.log(`Email enviado a propietario: ${emailProp}`);
    
  } catch (error) {
    Logger.log('Error enviando email a propietario: ' + error.toString());
  }
}

/**
 * Enviar email de confirmación al propietario
 */
function enviarEmailConfirmacionPropietario(codigoRegistro, datosFormulario) {
  try {
    const propietario = datosFormulario.propietario;
    const asunto = `Confirmación de recepción - Documentos del propietario ${codigoRegistro}`;
    
    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Documentos Recibidos</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Estimado/a <strong>${propietario.nombre}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            Confirmamos que hemos recibido exitosamente sus documentos como propietario 
            para el proceso de arrendamiento con código de registro <strong>${codigoRegistro}</strong>.
          </p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">✅ Documentación completa</h3>
            <p style="color: #155724;">
              Todos los documentos han sido recibidos. Procederemos con la generación del contrato 
              de arrendamiento.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            E-firmaContrata • Real Estate Gold Life System<br>
            Este es un correo automático, por favor no responder.
          </p>
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: propietario.email,
      subject: asunto,
      htmlBody: cuerpoHtml
    });
    
    Logger.log(`Email de confirmación enviado a propietario: ${propietario.email}`);
    
  } catch (error) {
    Logger.log('Error enviando email confirmación propietario: ' + error.toString());
  }
}

/**
 * Enviar corrección al inquilino
 */
function enviarEmailCorreccionInquilino(cdr, observaciones) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const fila = buscarFilaPorCDR(cdr);
    
    if (!fila) return;
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = sheet.getRange(fila, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const email = obtenerValorPorHeader(headers, row, 'CORREO INQUILINO');
    const nombre = obtenerValorPorHeader(headers, row, 'NOMBRE COMPLETO INQUILINO');
    
    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata';
    const urlCorreccion = `${baseUrl}/selector.html?action=formulario-inquilino&cdr=${encodeURIComponent(cdr)}&modo=correccion`;
    
    const asunto = `Corrección requerida - Documentos de arrendamiento ${cdr}`;
    
    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📝 Corrección Requerida</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Estimado/a <strong>${nombre}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            Hemos revisado sus documentos y necesitamos que realice algunas correcciones 
            para continuar con el proceso.
          </p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">📋 Observaciones:</h3>
            <p style="color: #856404; white-space: pre-wrap;">${observaciones || 'Por favor revise los documentos enviados'}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${urlCorreccion}" 
               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); 
                      color: white; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
              ✏️ REALIZAR CORRECCIONES
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            E-firmaContrata • Real Estate Gold Life System<br>
            Código de registro: ${cdr}
          </p>
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: email,
      subject: asunto,
      htmlBody: cuerpoHtml
    });
    
    Logger.log(`Email de corrección enviado a inquilino: ${email}`);
    
  } catch (error) {
    Logger.log('Error enviando corrección inquilino: ' + error.toString());
  }
}

/**
 * Enviar corrección al propietario
 */
function enviarEmailCorreccionPropietario(cdr, observaciones) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const fila = buscarFilaPorCDR(cdr);
    
    if (!fila) return;
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = sheet.getRange(fila, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const email = obtenerValorPorHeader(headers, row, 'Correo electrónico');
    const nombre = obtenerValorPorHeader(headers, row, 'Ingrese Nombres y Apellidos');
    
    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata';
    const urlCorreccion = `${baseUrl}/selector.html?action=formulario-propietario&cdr=${encodeURIComponent(cdr)}&modo=correccion`;
    
    const asunto = `Corrección requerida - Documentos del propietario ${cdr}`;
    
    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📝 Corrección Requerida</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Estimado/a <strong>${nombre}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            Hemos revisado sus documentos y necesitamos que realice algunas correcciones.
          </p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">📋 Observaciones:</h3>
            <p style="color: #856404; white-space: pre-wrap;">${observaciones || 'Por favor revise los documentos enviados'}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${urlCorreccion}" 
               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); 
                      color: white; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
              ✏️ REALIZAR CORRECCIONES
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            E-firmaContrata • Real Estate Gold Life System<br>
            Código de registro: ${cdr}
          </p>
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: email,
      subject: asunto,
      htmlBody: cuerpoHtml
    });
    
    Logger.log(`Email de corrección enviado a propietario: ${email}`);
    
  } catch (error) {
    Logger.log('Error enviando corrección propietario: ' + error.toString());
  }
}

// ==========================================
// FUNCIONES DE ACTUALIZACIÓN DE CAMPOS
// ==========================================

/**
 * Actualizar campos del inquilino
 */
function actualizarCamposInquilino(fila, campos) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (campos.nombre) {
      const col = headers.indexOf('NOMBRE COMPLETO INQUILINO') + 1;
      if (col > 0) sheet.getRange(fila, col).setValue(campos.nombre);
    }
    
    if (campos.documento) {
      const col = headers.indexOf('NUMERO DOCUMENTO INQUILINO') + 1;
      if (col > 0) sheet.getRange(fila, col).setValue(campos.documento);
    }
    
    if (campos.email) {
      const col = headers.indexOf('CORREO INQUILINO') + 1;
      if (col > 0) sheet.getRange(fila, col).setValue(campos.email);
    }
    
    if (campos.celular) {
      const col = headers.indexOf('CELULAR INQUILINO') + 1;
      if (col > 0) sheet.getRange(fila, col).setValue(campos.celular);
    }
    
  } catch (error) {
    Logger.log('Error actualizando campos inquilino: ' + error.toString());
  }
}

/**
 * Actualizar campos del propietario
 */
function actualizarCamposPropietario(fila, campos) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (campos.nombre) {
      const col = headers.indexOf('Ingrese Nombres y Apellidos') + 1;
      if (col > 0) sheet.getRange(fila, col).setValue(campos.nombre);
    }
    
    if (campos.documento) {
      const col = headers.indexOf('Número de documento') + 1;
      if (col > 0) sheet.getRange(fila, col).setValue(campos.documento);
    }
    
    if (campos.email) {
      const col = headers.indexOf('Correo electrónico') + 1;
      if (col > 0) sheet.getRange(fila, col).setValue(campos.email);
    }
    
    if (campos.celular) {
      const col = headers.indexOf('Celular') + 1;
      if (col > 0) sheet.getRange(fila, col).setValue(campos.celular);
    }
    
  } catch (error) {
    Logger.log('Error actualizando campos propietario: ' + error.toString());
  }
}

/**
 * Actualizar campo de validación
 */
function actualizarCampoValidacion(datos) {
  try {
    const { cdr, tipo, campo, valor } = datos;
    const fila = buscarFilaPorCDR(cdr);
    
    if (!fila) {
      return { success: false, message: 'Registro no encontrado' };
    }
    
    if (tipo === 'inquilino') {
      actualizarCamposInquilino(fila, { [campo]: valor });
    } else if (tipo === 'propietario') {
      actualizarCamposPropietario(fila, { [campo]: valor });
    }
    
    return { success: true, message: 'Campo actualizado' };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Enviar corrección al inquilino
 */
function enviarCorreccionInquilino(datos) {
  try {
    const { cdr, observaciones } = datos;
    enviarEmailCorreccionInquilino(cdr, observaciones);
    
    // Actualizar estado
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const fila = buscarFilaPorCDR(cdr);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    sheet.getRange(fila, detallesCol).setValue('📝 Corrección solicitada al inquilino');
    
    return { 
      success: true, 
      message: 'Corrección enviada al inquilino' 
    };
    
  } catch (error) {
    Logger.log('Error enviando corrección inquilino: ' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * Enviar corrección al propietario
 */
function enviarCorreccionPropietario(datos) {
  try {
    const { cdr, observaciones } = datos;
    enviarEmailCorreccionPropietario(cdr, observaciones);
    
    // Actualizar estado
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const fila = buscarFilaPorCDR(cdr);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    sheet.getRange(fila, detallesCol).setValue('📝 Corrección solicitada al propietario');
    
    return { 
      success: true, 
      message: 'Corrección enviada al propietario' 
    };
    
  } catch (error) {
    Logger.log('Error enviando corrección propietario: ' + error.toString());
    return { success: false, message: error.message };
  }
}

// ==========================================
// FUNCIONES PARA EL POPUP DE EMAIL INICIAL
// ==========================================

function procesarEmailInquilino(emailInquilino, nombreInquilino) {
  try {
    const props = PropertiesService.getScriptProperties();
    const currentRow = parseInt(props.getProperty('currentRow'));
    const currentCDR = props.getProperty('currentCDR');
    
    if (!currentRow || !currentCDR) {
      throw new Error('No se encontró información del registro actual');
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    
    // Generar URL del formulario
    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata';
    const urlFormulario = `${baseUrl}/selector.html?action=formulario-inquilino&cdr=${encodeURIComponent(currentCDR)}`;
    
    // Enviar email
    enviarEmailInquilinoInicial(emailInquilino, nombreInquilino, currentCDR, urlFormulario);
    
    // Actualizar estado en el CRM
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const detallesColIndex = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    
    if (detallesColIndex > 0) {
      sheet.getRange(currentRow, detallesColIndex).setValue('📧 Formulario enviado al inquilino');
    }
    
    // Limpiar properties
    props.deleteProperty('currentRow');
    props.deleteProperty('currentCDR');
    
    return { 
      success: true, 
      message: 'Email enviado exitosamente' 
    };
    
  } catch (error) {
    Logger.log('Error procesando email inquilino: ' + error.toString());
    return { 
      success: false, 
      message: error.message 
    };
  }
}

// ==========================================
// FUNCIONES DE LOG
// ==========================================

/**
 * Registrar en log
 */
function registrarLog(tipo, cdr, mensaje) {
  try {
    let logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_LOG);
    
    if (!logSheet) {
      logSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(DOCS_CONFIG.HOJA_LOG);
      logSheet.getRange(1, 1, 1, 5).setValues([['FECHA', 'TIPO', 'CDR', 'MENSAJE', 'USUARIO']]);
    }
    
    const fecha = new Date();
    const usuario = Session.getActiveUser().getEmail();
    
    logSheet.appendRow([fecha, tipo, cdr, mensaje, usuario]);
    
  } catch (error) {
    Logger.log('Error registrando log: ' + error.toString());
  }
}
// ==========================================
// FUNCIONES DE ENVÍO DE EMAIL CON BRANDING DARK + DORADO
// ==========================================

// ✉️ Inquilino: envío de formulario
function procesarEmailInquilino(email, linkFormulario) {
  const asunto = "Formulario de Registro - E-FirmaContrata";
  const cuerpoHTML = `
    <body style="background:#0F0F0F; padding:30px; color:#f4f4f4; font-family:Segoe UI,sans-serif;">
      <div style="max-width:600px; margin:auto; background:#1e1e1e; padding:30px; border-radius:12px;">
        <h2 style="color:#FFD700; text-align:center;">EFirmaContrata</h2>
        <p>Hola,</p>
        <p>Por favor diligencia el siguiente formulario como parte del proceso de validación para contrato de arrendamiento:</p>
        <a href="${linkFormulario}" style="display:inline-block; margin-top:20px; background:#FFD700; color:#000; padding:12px 20px; border-radius:8px; text-decoration:none;">Ir al formulario</a>
        <p style="margin-top:30px; font-size:12px; color:#aaa;">Real Estate • Gold Life System</p>
      </div>
    </body>`;
  MailApp.sendEmail({ to: email, subject: asunto, htmlBody: cuerpoHTML });
}

// ✉️ Inquilino: correo de corrección
function procesarEmailCorreccion(email, linkCorreccion) {
  const asunto = "Corrección requerida - E-FirmaContrata";
  const cuerpoHTML = `
    <body style="background:#0F0F0F; padding:30px; color:#f4f4f4; font-family:Segoe UI,sans-serif;">
      <div style="max-width:600px; margin:auto; background:#1e1e1e; padding:30px; border-radius:12px;">
        <h2 style="color:#FFD700; text-align:center;">EFirmaContrata</h2>
        <p>Se requiere que corrijas o completes algunos datos/documentos enviados previamente.</p>
        <a href="${linkCorreccion}" style="display:inline-block; margin-top:20px; background:#FFD700; color:#000; padding:12px 20px; border-radius:8px; text-decoration:none;">Corregir formulario</a>
        <p style="margin-top:30px; font-size:12px; color:#aaa;">Real Estate • Gold Life System</p>
      </div>
    </body>`;
  MailApp.sendEmail({ to: email, subject: asunto, htmlBody: cuerpoHTML });
}

// ✉️ Inquilino: contrato para firmar
function enviarContratoFirmar(email, linkContrato) {
  const asunto = "Firma de Contrato - E-FirmaContrata";
  const cuerpoHTML = `
    <body style="background:#0F0F0F; padding:30px; color:#f4f4f4; font-family:Segoe UI,sans-serif;">
      <div style="max-width:600px; margin:auto; background:#1e1e1e; padding:30px; border-radius:12px;">
        <h2 style="color:#FFD700; text-align:center;">EFirmaContrata</h2>
        <p>Se ha generado el contrato de arrendamiento. Por favor ingresa para revisarlo y firmarlo:</p>
        <a href="${linkContrato}" style="display:inline-block; margin-top:20px; background:#FFD700; color:#000; padding:12px 20px; border-radius:8px; text-decoration:none;">Ver y firmar contrato</a>
        <p style="margin-top:30px; font-size:12px; color:#aaa;">Real Estate • Gold Life System</p>
      </div>
    </body>`;
  MailApp.sendEmail({ to: email, subject: asunto, htmlBody: cuerpoHTML });
}

// ✉️ Inquilino: notificación de finalización
function notificarFinalizacion(email) {
  const asunto = "Contrato Finalizado - E-FirmaContrata";
  const cuerpoHTML = `
    <body style="background:#0F0F0F; padding:30px; color:#f4f4f4; font-family:Segoe UI,sans-serif;">
      <div style="max-width:600px; margin:auto; background:#1e1e1e; padding:30px; border-radius:12px;">
        <h2 style="color:#FFD700; text-align:center;">EFirmaContrata</h2>
        <p>El contrato ha sido finalizado y registrado correctamente en el sistema.</p>
        <p>Gracias por usar E-FirmaContrata.</p>
        <p style="margin-top:30px; font-size:12px; color:#aaa;">Real Estate • Gold Life System</p>
      </div>
    </body>`;
  MailApp.sendEmail({ to: email, subject: asunto, htmlBody: cuerpoHTML });
}

// ==========================================
// PROPIETARIO
// ==========================================

// ✉️ Propietario: inicio de formulario
function enviarEmailPropietario(cdr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
  const fila = buscarFilaPorCDR(cdr);
  if (!fila) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(fila, 1, 1, sheet.getLastColumn()).getValues()[0];
  const email = obtenerValorPorHeader(headers, row, 'Correo electrónico');
  const nombre = obtenerValorPorHeader(headers, row, 'Ingrese Nombres y Apellidos');

  const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata';
  const url = `${baseUrl}/selector.html?action=formulario-propietario&cdr=${cdr}`;

  const asunto = "Formulario Propietario - E-FirmaContrata";
  const cuerpoHTML = `
    <body style="background:#0F0F0F;padding:30px;color:#f4f4f4;font-family:Segoe UI,sans-serif;">
      <div style="max-width:600px;margin:auto;background:#1e1e1e;padding:30px;border-radius:12px;">
        <h2 style="color:#FFD700;text-align:center;">EFirmaContrata</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Por favor diligencia el formulario con tu documentación como propietario:</p>
        <a href="${url}" style="display:inline-block;margin-top:20px;background:#FFD700;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;">Diligenciar Formulario</a>
        <p style="margin-top:30px;font-size:12px;color:#aaa;">Real Estate • Gold Life System</p>
      </div>
    </body>`;
  MailApp.sendEmail({ to: email, subject: asunto, htmlBody: cuerpoHTML });
}

// ✉️ Propietario: confirmación de recepción
function enviarEmailConfirmacionPropietario(codigoRegistro, datosFormulario) {
  const propietario = datosFormulario.propietario;
  const asunto = "Documentación Recibida - E-FirmaContrata";
  const cuerpoHTML = `
    <body style="background:#0F0F0F;padding:30px;color:#f4f4f4;font-family:Segoe UI,sans-serif;">
      <div style="max-width:600px;margin:auto;background:#1e1e1e;padding:30px;border-radius:12px;">
        <h2 style="color:#FFD700;text-align:center;">EFirmaContrata</h2>
        <p>Hola <strong>${propietario.nombre}</strong>,</p>
        <p>Confirmamos la recepción de tus documentos para el contrato con código <strong>${codigoRegistro}</strong>.</p>
        <p>Gracias por utilizar E-FirmaContrata.</p>
        <p style="margin-top:30px;font-size:12px;color:#aaa;">Real Estate • Gold Life System</p>
      </div>
    </body>`;
  MailApp.sendEmail({ to: propietario.email, subject: asunto, htmlBody: cuerpoHTML });
}

// ✉️ Propietario: correo de corrección
function enviarEmailCorreccionPropietario(cdr, observaciones) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
  const fila = buscarFilaPorCDR(cdr);
  if (!fila) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(fila, 1, 1, sheet.getLastColumn()).getValues()[0];
  const email = obtenerValorPorHeader(headers, row, 'Correo electrónico');
  const nombre = obtenerValorPorHeader(headers, row, 'Ingrese Nombres y Apellidos');

  const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata';
  const url = `${baseUrl}/selector.html?action=formulario-propietario&cdr=${cdr}&modo=correccion`;

  const asunto = "Corrección Requerida - E-FirmaContrata";
  const cuerpoHTML = `
    <body style="background:#0F0F0F;padding:30px;color:#f4f4f4;font-family:Segoe UI,sans-serif;">
      <div style="max-width:600px;margin:auto;background:#1e1e1e;padding:30px;border-radius:12px;">
        <h2 style="color:#FFD700;text-align:center;">EFirmaContrata</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Se requieren correcciones en la documentación enviada:</p>
        <blockquote style="background:#2a2a2a;padding:15px;border-left:4px solid #FFD700;">${observaciones || 'Revisa tus archivos, por favor.'}</blockquote>
        <a href="${url}" style="display:inline-block;margin-top:20px;background:#FFD700;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;">Corregir Documentos</a>
        <p style="margin-top:30px;font-size:12px;color:#aaa;">Real Estate • Gold Life System</p>
      </div>
    </body>`;
  MailApp.sendEmail({ to: email, subject: asunto, htmlBody: cuerpoHTML });
}

// ==========================================
// FIN DEL ARCHIVO
// ==========================================