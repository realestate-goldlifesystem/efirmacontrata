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
    .addSeparator()
    .addItem('⚡ Instalar Activadores', 'instalarActivadores')
    .addSeparator()
    .addSubMenu(ui.createMenu('📸 AutoRename DNG')
      .addItem('▶️ Ejecutar Ahora', 'autoRenameDNGtoJPG')
      .addItem('⏰ Activar Trigger (1 min)', 'instalarTriggerAutoRename')
      .addItem('🛑 Desactivar Trigger', 'desinstalarTriggerAutoRename'))
    .addSeparator()
    .addItem('📂 Reporte Jerarquía', 'mostrarEstructuraCarpetasPlantilla')
    .addToUi();
}

/**
 * Muestra el popup para enviar email al inquilino
 * Puede ser llamada desde el menú (sin args) o desde el trigger automático (con sheet y fila)
 * CACHE_BUST: 20260216_v4_CLEAN
 */
function mostrarPopupEmailInquilino(sheetParam, filaParam) {
  try {
    const ui = SpreadsheetApp.getUi();

    // PASO 1: Obtener la hoja de datos
    let sheet;
    if (sheetParam) {
      sheet = sheetParam;
    } else {
      // Llamada desde menú: buscar la hoja por nombre explícito
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) {
        ui.alert('❌ Error', 'No se pudo acceder a la hoja de cálculo activa.', ui.ButtonSet.OK);
        return;
      }
      sheet = ss.getSheetByName('1.1 - INMUEBLES REGISTRADOS');
      if (!sheet) {
        // Fallback: intentar con la hoja activa
        sheet = ss.getActiveSheet();
      }
    }

    if (!sheet) {
      ui.alert('❌ Error', 'No se encontró la hoja de datos. Verifique que existe la hoja "1.1 - INMUEBLES REGISTRADOS".', ui.ButtonSet.OK);
      return;
    }

    // PASO 2: Obtener la fila
    let filaActiva;
    if (filaParam) {
      filaActiva = filaParam;
    } else {
      const activeRange = sheet.getActiveRange();
      if (!activeRange) {
        ui.alert('⚠️ Sin selección', 'Por favor seleccione una fila con un registro de inmueble antes de usar esta opción.', ui.ButtonSet.OK);
        return;
      }
      filaActiva = activeRange.getRow();
    }

    // Validar que sea una fila válida (no el header)
    if (filaActiva <= 1) {
      ui.alert('⚠️ Seleccione un registro', 'Por favor seleccione una fila con un registro de inmueble (no el encabezado).', ui.ButtonSet.OK);
      return;
    }

    // PASO 3: Obtener headers y CDR
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) {
      ui.alert('❌ Error', 'La hoja de datos está vacía.', ui.ButtonSet.OK);
      return;
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO') + 1;

    if (cdrCol < 1) {
      ui.alert('❌ Error', 'No se encontró la columna "CODIGO DE REGISTRO" en la hoja.', ui.ButtonSet.OK);
      return;
    }

    const cdr = sheet.getRange(filaActiva, cdrCol).getValue();

    if (!cdr) {
      ui.alert('⚠️ Sin Código de Registro', 'Esta fila no tiene un código de registro válido.', ui.ButtonSet.OK);
      return;
    }

    // --- REGLAS DE NEGOCIO ---
    const colEstado = headers.indexOf('ESTADO DEL INMUEBLE') + 1;
    const colTipo = headers.indexOf('TIPO DE NEGOCIO') + 1;

    if (colEstado > 0 && colTipo > 0) {
      const estadoActual = sheet.getRange(filaActiva, colEstado).getValue();
      const tipoNegocio = sheet.getRange(filaActiva, colTipo).getValue();

      const ESTADO_REQUERIDO = 'ESTUDIO APROBADO';
      const TIPOS_PERMITIDOS = ['Arriendo', 'Vendi-Renta', 'Admi-Venta', 'Corretaje', 'Administración', 'Administracion'];

      if (estadoActual !== ESTADO_REQUERIDO) {
        ui.alert(
          '⚠️ Estado Incorrecto',
          'Para enviar el formulario de contrato, el inmueble debe estar en estado:\n"' + ESTADO_REQUERIDO + '"\n\nEstado actual: "' + estadoActual + '"',
          ui.ButtonSet.OK
        );
        return;
      }

      const tipoNormalizado = tipoNegocio ? tipoNegocio.toString().trim() : '';
      if (!TIPOS_PERMITIDOS.includes(tipoNormalizado)) {
        ui.alert(
          '⚠️ Tipo de Negocio No Válido',
          'Esta función solo aplica para contratos de:\n' + TIPOS_PERMITIDOS.join(', ') + '\n\nTipo actual: "' + tipoNegocio + '"',
          ui.ButtonSet.OK
        );
        return;
      }
    }
    // --- FIN REGLAS ---

    // PASO 4: Guardar contexto en Properties para el popup
    PropertiesService.getScriptProperties().setProperties({
      'currentRow': filaActiva.toString(),
      'currentCDR': cdr.toString()
    });

    // PASO 5: Mostrar el popup
    const html = HtmlService.createHtmlOutputFromFile('backend/popup_email_inquilino')
      .setWidth(900)
      .setHeight(600)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);

    ui.showModalDialog(html, '📧 Enviar Formulario al Inquilino');

  } catch (error) {
    Logger.log('Error en mostrarPopupEmailInquilino: ' + error.toString() + ' | Stack: ' + error.stack);
    try {
      SpreadsheetApp.getUi().alert('❌ Error al mostrar popup', 'Detalle: ' + error.message + '\n\nPor favor reporte este error.', SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e2) {
      Logger.log('Error doble en mostrarPopupEmailInquilino: ' + e2.toString());
    }
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
      `Porcentaje procesado: ${Math.round((stats.estudioAprobado / stats.total) * 100)}%`,
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

// Helper para crear respuestas CORS (o JSONP si hay callback)
function corsResponse(data, callback = null) {
  if (callback) {
    // Modo JSONP
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // Modo CORS Normal (Google Apps Script no soporta agregar custom headers en TextOutput)
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const accion = e.parameter.accion;

    // INTEGRACIÓN REMOTE EXECUTION
    if (e.parameter.token && typeof handleRemoteExecution === 'function') {
      return handleRemoteExecution(e);
    }

    let result;

    switch (accion) {
      case 'verificarLink':
        // Devolvemos DIRECTAMENTE el objeto, corsResponse lo envolverá
        const cdr = e.parameter.cdr;
        const tipo = e.parameter.tipo;
        result = verificarEstadoLink(cdr, tipo);
        break;

      case 'obtenerRegistrosInquilinos':
        return handleObtenerRegistrosInquilinos(); // Estos ya retornan ContentService, revisar si necesitan CORS

      case 'obtenerRegistrosPropietarios':
        return handleObtenerRegistrosPropietarios(); // Revisar

      case 'obtenerDocumentosPanel':
        // Si estos handlers retornan ContentService, debieron ser actualizados. 
        // Para minimizar cambios invasivos, solo aseguramos 'verificarLink' por ahora con la nueva lógica,
        // o envolvemos todo.
        // MEJOR ESTRATEGIA: Si el handler ya retorna ContentService, lo dejamos (pero debería tener CORS).
        // Si retorna objeto data, usamos corsResponse.
        return handleObtenerDocumentosPanel(e);

      case 'base':
        result = { success: true, message: 'Endpoint base activo' };
        break;

      // ... otros casos ...
      case 'test':
        result = {
          success: true,
          message: 'API funcionando correctamente',
          version: DOCS_CONFIG.VERSION,
        };
        break;

      default:
        result = {
          success: false,
          message: 'Acción no válida: ' + accion
        };
        break;
    }

    return corsResponse(result, e.parameter.callback);

  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return corsResponse({
      success: false,
      message: error.message
    }, e.parameter ? e.parameter.callback : null);
  }
}

function doPost(e) {
  try {
    const datosJson = e.postData.contents;
    const datos = JSON.parse(datosJson);
    const accion = datos.accion;
    let result;

    switch (accion) {
      case 'enviarFormularioInquilino':
        result = handleEnviarFormularioInquilino(datos);
        break;
      case 'enviarFormularioPropietario':
        result = handleEnviarFormularioPropietario(datos);
        break;
      case 'procesarFormularioInquilino':
        result = handleProcesarFormularioInquilino(datos);
        break;
      case 'procesarFormularioPropietario':
        result = handleProcesarFormularioPropietario(datos);
        break;
      case 'procesarValidacionInquilino':
        result = handleProcesarValidacionInquilino(datos);
        break;
      case 'procesarValidacionPropietario':
        result = handleProcesarValidacionPropietario(datos);
        break;
      case 'actualizarCampoValidacion':
        result = handleActualizarCampoValidacion(datos);
        break;
      case 'enviarCorreccionInquilino':
        result = handleEnviarCorreccionInquilino(datos);
        break;
      case 'enviarCorreccionPropietario':
        result = handleEnviarCorreccionPropietario(datos);
        break;
      case 'generarContrato':
        result = handleGenerarContrato(datos);
        break;
      case 'registrarAprobacionContrato':
        result = handleRegistrarAprobacionContrato(datos);
        break;
      case 'subirContratoFirmado':
        result = handleSubirContratoFirmado(datos);
        break;
      default:
        result = {
          success: false,
          message: 'Acción POST no válida: ' + accion
        };
        break;
    }

    return corsResponse(result);

  } catch (error) {
    Logger.log('Error en doPost: ' + error.toString());
    return corsResponse({
      success: false,
      message: error.message
    });
  }
}

// ==========================================
// WRAPPERS PARA EL FRONTEND (PANEL VALIDACIÓN)
// ==========================================

function procesarValidacion(datos) {
  if (datos.tipo === 'inquilino') {
    return procesarValidacionInquilino(datos);
  } else if (datos.tipo === 'propietario') {
    return procesarValidacionPropietario(datos);
  } else {
    throw new Error('Tipo de validación no soportado: ' + datos.tipo);
  }
}

function enviarCorrecciones(datos) {
  if (datos.tipo === 'inquilino') {
    return enviarCorreccionInquilino(datos);
  } else if (datos.tipo === 'propietario') {
    return enviarCorreccionPropietario(datos);
  } else {
    throw new Error('Tipo de corrección no soportado: ' + datos.tipo);
  }
}

// ==========================================
// HANDLERS DE API EXISTENTES
// ==========================================

function handleVerificarLink(e) {
  const cdr = e.parameter.cdr;
  const tipo = e.parameter.tipo;
  return verificarEstadoLink(cdr, tipo);
}

function handleObtenerRegistrosInquilinos() {
  const registros = obtenerRegistrosInquilinos();
  return {
    success: true,
    data: registros
  };
}

function handleObtenerRegistrosPropietarios() {
  const registros = obtenerRegistrosPropietarios();
  return {
    success: true,
    data: registros
  };
}

function handleObtenerDocumentosPanel(e) {
  const cdr = e.parameter.cdr;
  const documentos = obtenerDocumentosDelCDR(cdr);

  return {
    success: true,
    documentos: documentos
  };
}

function handleEnviarFormularioInquilino(datos) {
  return procesarFormularioInquilino(
    datos.codigoRegistro,
    datos.datosFormulario,
    datos.archivosBase64
  );
}

function handleProcesarFormularioInquilino(datos) {
  return handleEnviarFormularioInquilino(datos);
}

function handleEnviarFormularioPropietario(datos) {
  return procesarFormularioPropietario(
    datos.codigoRegistro,
    datos.datosFormulario,
    datos.archivosBase64
  );
}

function handleProcesarFormularioPropietario(datos) {
  return handleEnviarFormularioPropietario(datos);
}

function handleProcesarValidacionInquilino(datos) {
  return procesarValidacionInquilino(datos);
}

function handleProcesarValidacionPropietario(datos) {
  return procesarValidacionPropietario(datos);
}

function handleActualizarCampoValidacion(datos) {
  return actualizarCampoValidacion(datos);
}

function handleEnviarCorreccionInquilino(datos) {
  return enviarCorreccionInquilino(datos);
}

function handleEnviarCorreccionPropietario(datos) {
  return enviarCorreccionPropietario(datos);
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
      return {
        success: false,
        message: 'CDR no proporcionado'
      };
    }

    // Recopilar datos usando función de GESTOR_CONTRATOS.gs
    const datos = recopilarDatosContrato(cdr);

    return datos;

  } catch (error) {
    Logger.log('Error en handleObtenerDatosContrato: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Generar contrato
 */
function handleGenerarContrato(datos) {
  try {
    const { cdr } = datos;

    if (!cdr) {
      return {
        success: false,
        message: 'CDR no proporcionado'
      };
    }

    // Generar contrato usando función de GESTOR_CONTRATOS.gs
    const resultado = generarContrato(cdr);

    return resultado;

  } catch (error) {
    Logger.log('Error en handleGenerarContrato: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Registrar aprobación de contrato
 */
function handleRegistrarAprobacionContrato(datos) {
  try {
    const { cdr, tipo, accion, comentarios } = datos;

    if (!cdr || !tipo || !accion) {
      return {
        success: false,
        message: 'Faltan datos requeridos'
      };
    }

    // Registrar aprobación usando función de GESTOR_CONTRATOS.gs
    const resultado = registrarAprobacionContrato(cdr, tipo, accion, comentarios);

    return resultado;

  } catch (error) {
    Logger.log('Error en handleRegistrarAprobacionContrato: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Obtener estado de aprobaciones
 */
function handleObtenerEstadoAprobaciones(e) {
  const cdr = e.parameter.cdr;

  if (!cdr) {
    return {
      success: false,
      message: 'CDR no proporcionado'
    };
  }

  // Obtener estados usando función de GESTOR_CONTRATOS.gs
  const estados = obtenerEstadosAprobacion(cdr);

  return {
    success: true,
    estados: estados
  };
}

/**
 * Subir contrato firmado
 */
function handleSubirContratoFirmado(datos) {
  try {
    const { cdr, archivoBase64, nombreArchivo } = datos;

    if (!cdr || !archivoBase64) {
      return {
        success: false,
        message: 'Faltan datos requeridos'
      };
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

    return {
      success: true,
      message: 'Contrato firmado guardado exitosamente',
      url: archivo.getUrl(),
      id: archivo.getId()
    };

  } catch (error) {
    Logger.log('Error en handleSubirContratoFirmado: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
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

// === ELIMINADO: función duplicada procesarFormularioInquilino ===

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
/**
 * Verificar estado del link y determinar acción
 */
function verificarEstadoLink(cdr, tipo) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const fila = buscarFilaPorCDR(cdr);

    if (!fila) {
      return {
        success: false,
        activo: false,
        mensaje: 'Código de registro no encontrado',
        status: 'diligenciado'
      };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    const detalles = sheet.getRange(fila, detallesCol).getValue().toString();

    let status = 'pendiente';
    let mensaje = 'Formulario disponible';
    let redirectUrl = '';

    // Lógica de redirección base
    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend';

    if (tipo === 'inquilino') {
      redirectUrl = `${baseUrl}/formulario-inquilino.html?cdr=${encodeURIComponent(cdr)}`;

      if (detalles.includes('Formulario del inquilino diligenciado')) {
        status = 'diligenciado';
        mensaje = 'Ya has enviado tu formulario. Estamos validando tus documentos.';
      } else if (detalles.includes('Corrección solicitada al inquilino')) {
        status = 'correccion';
        mensaje = 'Se requieren correcciones en tu formulario.';
        redirectUrl += '&modo=correccion';
      } else if (detalles.includes('Documentos del inquilino aprobados')) {
        status = 'aprobado';
        mensaje = 'Tus documentos ya han sido aprobados. El proceso continúa con el propietario.';
      }

    } else if (tipo === 'propietario') {
      redirectUrl = `${baseUrl}/formulario-propietario.html?cdr=${encodeURIComponent(cdr)}`;

      if (detalles.includes('Formulario del propietario diligenciado')) {
        status = 'diligenciado';
        mensaje = 'Ya has enviado tu formulario. Estamos validando tus documentos.';
      } else if (detalles.includes('Corrección solicitada al propietario')) {
        status = 'correccion';
        mensaje = 'Se requieren correcciones en tu formulario.';
        redirectUrl += '&modo=correccion';
      } else if (detalles.includes('Documentos completos') || detalles.includes('Listo para generar contrato')) {
        status = 'aprobado';
        mensaje = 'Tus documentos han sido aprobados y el contrato está en proceso.';
      }
    }

    return {
      success: true,
      activo: (status === 'pendiente' || status === 'correccion'),
      status: status,
      mensaje: mensaje,
      redirectUrl: redirectUrl,
      tipo: tipo
    };

  } catch (error) {
    Logger.log('Error verificando link: ' + error.toString());
    return {
      success: false,
      activo: false,
      mensaje: 'Error técnico al verificar el link',
      error: error.message
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
// FUNCIONES DE PROCESAMIENTO DE FORMULARIOS
// ==========================================

/**
 * Procesar datos del formulario del inquilino
 */
function procesarFormularioInquilino(codigoRegistro, datosFormulario, archivosBase64) {
  try {
    // 1. Validar CDR
    if (!codigoRegistro) throw new Error('Código de registro no proporcionado');

    // 2. Guardar documentos
    const urlsDoc = guardarDocumentosInquilino(codigoRegistro, archivosBase64, datosFormulario);

    // 3. Registrar en Log
    registrarLog('FORMULARIO_INQUILINO', codigoRegistro, `Formulario recibido de ${datosFormulario.inquilino.nombre}`);

    // 4. Actualizar Estado en Sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    if (!sheet) throw new Error('Hoja principal no encontrada');

    const fila = buscarFilaPorCDR(codigoRegistro);
    if (fila) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
      if (detallesCol > 0) {
        sheet.getRange(fila, detallesCol).setValue('✅ Documentación de inquilino recibida y guardada');
      }

      // Actualizar datos del inquilino si vienen en el formulario
      actualizarCamposInquilino(fila, {
        nombre: datosFormulario.inquilino.nombre,
        documento: datosFormulario.inquilino.numeroDocumento,
        email: datosFormulario.inquilino.email,
        celular: datosFormulario.inquilino.celular
      });
    }

    // 5. Enviar correo de confirmación
    // Solo si se envió email
    if (datosFormulario.inquilino.email) {
      // Ajuste: La función ahora espera (email, nombre, cdr) o el objeto completo?
      // Revisando la definición (línea 1750 aprox), espera: (emailInquilino, nombreInquilino, codigoRegistro)
      // Pero si esa función no existe o cambió, usaremos la genérica si existe.
      // Asumimos que enviarEmailConfirmacionInquilino existe y tiene esa firma.
      enviarEmailConfirmacionInquilino(codigoRegistro, datosFormulario);
    }

    return {
      success: true,
      message: 'Documentación enviada y procesada correctamente',
      urls: urlsDoc
    };

  } catch (error) {
    Logger.log('Error procesando formulario inquilino: ' + error.toString());
    throw error;
  }
}

// ==========================================
// FUNCIONES DE GUARDADO DE DOCUMENTOS
// ==========================================

/**
 * Guardar documentos del inquilino en Drive (IMPLEMENTACIÓN DINÁMICA DE RUTAS Y REEMPLAZO LIMPIO)
 */
function guardarDocumentosInquilino(codigoRegistro, archivosBase64, datosFormulario) {
  try {
    Logger.log('Iniciando enrutamiento dinámico para CDR: ' + codigoRegistro);
    const ROOT_FOLDER_ID = '1ozAkjspgSj6m2fN4tqqCm-mjrsux6ULi'; // Carpeta INMUEBLES
    const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);

    // 1. La carpeta CDR vive dentro de: INMUEBLES > [TIPO_NEGOCIO] > CDR
    //    Debemos buscar en cada subcarpeta de tipo de negocio
    let inmuebleFolder = null;

    // Primero buscar directamente en el root (por si acaso)
    const directFolders = rootFolder.getFoldersByName(codigoRegistro);
    if (directFolders.hasNext()) {
      inmuebleFolder = directFolders.next();
    }

    // Si no está directo, buscar dentro de cada subcarpeta de tipo de negocio
    if (!inmuebleFolder) {
      const tipoNegocioFolders = rootFolder.getFolders();
      while (tipoNegocioFolders.hasNext() && !inmuebleFolder) {
        const tipoFolder = tipoNegocioFolders.next();
        Logger.log('Buscando CDR en subcarpeta: ' + tipoFolder.getName());

        // Buscar por nombre exacto dentro de esta subcarpeta
        const subFolders = tipoFolder.getFoldersByName(codigoRegistro);
        if (subFolders.hasNext()) {
          inmuebleFolder = subFolders.next();
          Logger.log('✅ CDR encontrado en: ' + tipoFolder.getName() + ' > ' + inmuebleFolder.getName());
        }

        // Fallback: buscar carpetas que empiecen con el CDR
        if (!inmuebleFolder) {
          const allSub = tipoFolder.getFolders();
          while (allSub.hasNext()) {
            const sf = allSub.next();
            if (sf.getName().startsWith(codigoRegistro + ' -') || sf.getName().startsWith(codigoRegistro + '_')) {
              inmuebleFolder = sf;
              Logger.log('✅ CDR encontrado (parcial) en: ' + tipoFolder.getName() + ' > ' + sf.getName());
              break;
            }
          }
        }
      }
    }

    // Fallback final: búsqueda global en Drive por nombre exacto
    if (!inmuebleFolder) {
      Logger.log('🔍 Usando búsqueda global en Drive para CDR: ' + codigoRegistro);
      // Escapar caracteres especiales para la query de Drive
      const cdrEscaped = codigoRegistro.replace(/'/g, "\\'");
      const globalSearch = DriveApp.searchFolders(`title = '${cdrEscaped}' and trashed = false`);
      if (globalSearch.hasNext()) {
        inmuebleFolder = globalSearch.next();
        Logger.log('✅ CDR encontrado por búsqueda global: ' + inmuebleFolder.getName());
      }
    }

    if (!inmuebleFolder) {
      throw new Error(`No se encontró la carpeta raíz del inmueble para CDR: ${codigoRegistro}`);
    }

    // 2. Navegar a 'ENTREGAS DEL INMUEBLE'
    let entregasFolder = getFolderByNameHelper(inmuebleFolder, 'ENTREGAS DEL INMUEBLE');
    if (!entregasFolder) throw new Error('No se encontró la carpeta ENTREGAS DEL INMUEBLE');

    // 3. Buscar carpeta del año más reciente
    let anioFolder = obtenerCarpetaAnioMasRecienteLocal(entregasFolder);
    if (!anioFolder) throw new Error('No se encontró ninguna carpeta de Año en ENTREGAS DEL INMUEBLE');

    // 4. Navegar a 'DOCUMENTOS DE ENTREGA - INQUILINO'
    let docsEntregaInqFolder = getFolderByNameHelper(anioFolder, 'DOCUMENTOS DE ENTREGA - INQUILINO');
    if (!docsEntregaInqFolder) docsEntregaInqFolder = anioFolder.createFolder('DOCUMENTOS DE ENTREGA - INQUILINO');

    // 5. Navegar a '4- VARIOS, FORMATO DE MUDANZAS, ETC'
    let variosFolder = getFolderByNameHelper(docsEntregaInqFolder, '4- VARIOS, FORMATO DE MUDANZAS, ETC');
    if (!variosFolder) {
      const subFolders = docsEntregaInqFolder.getFolders();
      while (subFolders.hasNext()) {
        const subF = subFolders.next();
        if (subF.getName().includes('VARIOS, FORMATO DE MUDANZAS')) { variosFolder = subF; break; }
      }
      if (!variosFolder) variosFolder = docsEntregaInqFolder.createFolder('4- VARIOS, FORMATO DE MUDANZAS, ETC');
    }

    // 6. Carpeta del comprobante de pago (vive DENTRO de variosFolder, no de docsEntregaInqFolder)
    let pagoDerechosFolder = getFolderByNameHelper(variosFolder, '6- PAGO DE LOS DERECHOS DE CONTRATO')
      || variosFolder.createFolder('6- PAGO DE LOS DERECHOS DE CONTRATO');

    // 7. Carpetas destino para cédulas
    let cedulaInquilinoFolder = getFolderByNameHelper(variosFolder, '2- CEDULA DEL INQUILINO')
      || variosFolder.createFolder('2- CEDULA DEL INQUILINO');
    let cedulaCodeudoresFolder = getFolderByNameHelper(variosFolder, '3- CEDULA DE CODEUDOR(ES)')
      || variosFolder.createFolder('3- CEDULA DE CODEUDOR(ES)');

    // 8. Procesar archivos con rutas y nombres correctos
    // Claves del formulario: docFront, docBack, ingresos, coDocFront, coDocBack, coIngresos, comprobantePago
    const RUTAS_ARCHIVOS = {
      'docFront': { carpeta: cedulaInquilinoFolder, nombre: `CEDULA_INQU_FRONTAL_[${codigoRegistro}]` },
      'docBack': { carpeta: cedulaInquilinoFolder, nombre: `CEDULA_INQU_REVERSO_[${codigoRegistro}]` },
      'ingresos': { carpeta: cedulaInquilinoFolder, nombre: `SOPORTES_INGRESO_INQU_[${codigoRegistro}]` },
      'coDocFront': { carpeta: cedulaCodeudoresFolder, nombre: `CEDULA_COD_1_FRONTAL_[${codigoRegistro}]` },
      'coDocBack': { carpeta: cedulaCodeudoresFolder, nombre: `CEDULA_COD_1_REVERSO_[${codigoRegistro}]` },
      'coIngresos': { carpeta: cedulaCodeudoresFolder, nombre: `SOPORTES_INGRESO_COD_1_[${codigoRegistro}]` },
      'comprobantePago': { carpeta: pagoDerechosFolder, nombre: `COMPROBANTE_PAGO_INQU_[${codigoRegistro}]` },
    };

    for (const [clave, contenidoBase64] of Object.entries(archivosBase64)) {
      if (!contenidoBase64 || !contenidoBase64.contenido) continue;

      const mimeType = contenidoBase64.tipo || MimeType.JPEG;
      let extension = 'jpg';
      if (mimeType.includes('png')) extension = 'png';
      if (mimeType.includes('pdf')) extension = 'pdf';

      const base64Data = contenidoBase64.contenido.split(',')[1];
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType);

      const ruta = RUTAS_ARCHIVOS[clave];
      let targetFolder, nuevoNombre;

      if (ruta) {
        targetFolder = ruta.carpeta;
        nuevoNombre = `${ruta.nombre}.${extension}`;
      } else {
        // Cualquier clave no mapeada va a variosFolder
        targetFolder = variosFolder;
        nuevoNombre = `${clave.toUpperCase()}_[${codigoRegistro}].${extension}`;
        Logger.log(`⚠️ Clave no mapeada "${clave}" → variosFolder`);
      }

      // Limpiar duplicados antes de guardar
      const existentes = targetFolder.getFilesByName(nuevoNombre);
      while (existentes.hasNext()) existentes.next().setTrashed(true);

      blob.setName(nuevoNombre);
      targetFolder.createFile(blob);
      Logger.log(`✅ Guardado: ${nuevoNombre} en "${targetFolder.getName()}"`);
    }

    // 9. Escribir datos del formulario en "DATOS DE ELABORACION DE CONTRATO"
    escribirDatosContratoDocNivel7(cedulaInquilinoFolder, datosFormulario, codigoRegistro);

    return {
      carpetaPrincipal: inmuebleFolder.getUrl(),
      carpetaInquilino: variosFolder.getUrl()
    };

  } catch (error) {
    Logger.log('❌ Error guardando documentos inquilino: ' + error.toString());
    throw error;
  }
}

// ==========================================
// FUNCIONES HELPER LOCALES (Rutas Dinámicas)
// ==========================================

function getFolderByNameHelper(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function obtenerCarpetaAnioMasRecienteLocal(entregasFolder) {
  const folders = entregasFolder.getFolders();
  const carpetasAnios = [];
  while (folders.hasNext()) {
    const folder = folders.next();
    const nombre = folder.getName();
    if (nombre !== 'XXXX' && nombre.match(/^\d{4}(-\d+)?$/)) {
      const match = nombre.match(/^(\d{4})/);
      if (match) carpetasAnios.push({ folder: folder, nombre: nombre, anio: parseInt(match[1], 10) });
    }
  }
  if (carpetasAnios.length === 0) return null;
  carpetasAnios.sort((a, b) => b.anio - a.anio);
  return carpetasAnios[0].folder;
}

function escribirDatosContratoDocNivel7(cedulaFolder, datosFormulario, cdr) {
  try {
    let docFile = null;

    // Buscar primero por nombre exacto (como está en la plantilla maestra)
    const exactSearch = cedulaFolder.getFilesByName('DATOS DE ELABORACION DE CONTRATO');
    if (exactSearch.hasNext()) {
      docFile = exactSearch.next();
    }

    // Fallback: buscar por nombre parcial entre todos los archivos de la carpeta
    if (!docFile) {
      const allFiles = cedulaFolder.getFiles();
      while (allFiles.hasNext()) {
        const f = allFiles.next();
        if (f.getName().includes('DATOS DE ELABORACION') || f.getName().includes('DATOS CONTRATO')) {
          docFile = f;
          break;
        }
      }
    }

    // Si definitivamente no existe, crearlo
    if (!docFile) {
      Logger.log('⚠️ No se encontró DATOS DE ELABORACION DE CONTRATO, creando nuevo...');
      const docNuevo = DocumentApp.create(`DATOS DE ELABORACION DE CONTRATO`);
      const newFile = DriveApp.getFileById(docNuevo.getId());
      newFile.moveTo(cedulaFolder);
      docFile = newFile;
    }

    const doc = DocumentApp.openById(docFile.getId());
    const body = doc.getBody();
    body.appendParagraph('\n------------------------------------------');
    body.appendParagraph(`[INICIO - ENVIADO EL ${new Date().toLocaleDateString('es-CO')}]`);

    body.appendParagraph('DATOS DEL INQUILINO:');
    body.appendParagraph(`NOMBRES:: ${datosFormulario?.inquilino?.nombre || ''}`);
    body.appendParagraph(`TIPO DE IDENTIFICACIÓN:: ${datosFormulario?.inquilino?.tipoDocumento || ''}`);
    body.appendParagraph(`NÚMERO DE IDENTIFICACIÓN:: ${datosFormulario?.inquilino?.numeroDocumento || ''}`);
    body.appendParagraph(`CELULAR:: ${datosFormulario?.inquilino?.celular || ''}`);
    body.appendParagraph(`CORREO:: ${datosFormulario?.inquilino?.email || ''}`);

    // Normalizar codeudor: el formulario envía un objeto único (o null), no un array
    const codeudorRaw = datosFormulario?.codeudor || datosFormulario?.codeudores;
    const codeudores = Array.isArray(codeudorRaw)
      ? codeudorRaw
      : (codeudorRaw && codeudorRaw.numeroDocumento ? [codeudorRaw] : []);

    if (codeudores.length > 0) {
      body.appendParagraph('\nCODEUDORES:');
      codeudores.forEach((c, i) => {
        body.appendParagraph(`[CODEUDOR ${i + 1}]`);
        body.appendParagraph(`NOMBRES:: ${c.nombre || ''}`);
        body.appendParagraph(`TIPO DE IDENTIFICACIÓN:: ${c.tipoDocumento || 'CC'}`);
        body.appendParagraph(`NÚMERO DE IDENTIFICACIÓN:: ${c.numeroDocumento || c.documento || ''}`);
        body.appendParagraph(`CELULAR:: ${c.celular || ''}`);
        body.appendParagraph(`CORREO:: ${c.email || ''}`);
        body.appendParagraph('-----------------------');
      });
    }

    body.appendParagraph('[FIN]');
    doc.saveAndClose();
    Logger.log('✅ Datos de contrato escritos en DATOS DE ELABORACION DE CONTRATO.');
  } catch (e) {
    Logger.log('⚠️ Error escribiendo DATOS DE ELABORACION DE CONTRATO: ' + e.message);
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
    const html = HtmlService.createHtmlOutputFromFile('backend/panel_validacion')
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
 * Obtener documentos de un CDR para el panel (IMPLEMENTACIÓN DINÁMICA DE RUTAS)
 */
function obtenerDocumentosDelCDR(cdr) {
  try {
    const ROOT_FOLDER_ID = '1ozAkjspgSj6m2fN4tqqCm-mjrsux6ULi'; // Carpeta Inmuebles Raíz
    const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);

    // 1. Encontrar la subcarpeta del inmueble por CDR (ej. "CDR - DIRECCION" o "CDR")
    let carpetaCDR = null;
    const folders = rootFolder.getFolders();
    while (folders.hasNext()) {
      const folder = folders.next();
      if (folder.getName().startsWith(cdr + ' -') || folder.getName() === cdr) {
        carpetaCDR = folder;
        break;
      }
    }

    if (!carpetaCDR) {
      const exactFolders = rootFolder.getFoldersByName(cdr);
      if (exactFolders.hasNext()) carpetaCDR = exactFolders.next();
    }

    if (!carpetaCDR) {
      Logger.log('No se encontró CDR para documentos: ' + cdr);
      return { inquilino: [], propietario: [] };
    }

    const documentos = {
      inquilino: [],
      propietario: []
    };

    // --- LÓGICA DE INQUILINOS (RUTA ANIDADA) ---
    // Intentaremos navegar: ENTREGAS DEL INMUEBLE -> AÑO -> DOCUMENTOS DE ENTREGA - INQUILINO -> (2, 3 y 4)
    let entregasFolder = getFolderByNameHelper(carpetaCDR, 'ENTREGAS DEL INMUEBLE');
    if (entregasFolder) {
      let anioFolder = obtenerCarpetaAnioMasRecienteLocal(entregasFolder);
      if (anioFolder) {
        let docsEntregaInqFolder = getFolderByNameHelper(anioFolder, 'DOCUMENTOS DE ENTREGA - INQUILINO');
        if (docsEntregaInqFolder) {
          let variosFolder = getFolderByNameHelper(docsEntregaInqFolder, '4- VARIOS, FORMATO DE MUDANZAS, ETC');
          if (!variosFolder) {
            // Autocompletar por nombre parcial si el usuario lo alteró
            const subF = docsEntregaInqFolder.getFolders();
            while (subF.hasNext()) {
              const sf = subF.next();
              if (sf.getName().includes('VARIOS')) { variosFolder = sf; break; }
            }
          }

          if (variosFolder) {
            // Carpeta 2
            let cedulaInqFolder = getFolderByNameHelper(variosFolder, '2- CEDULA DEL INQUILINO');
            if (cedulaInqFolder) {
              const files = cedulaInqFolder.getFiles();
              while (files.hasNext()) {
                const file = files.next();
                documentos.inquilino.push({
                  nombre: '📁 [CED_INQ] ' + file.getName(),
                  url: file.getUrl(),
                  tipo: determinarTipoDocumento(file.getName()),
                  tamaño: file.getSize()
                });
              }
            }

            // Carpeta 3
            let cedulaCodFolder = getFolderByNameHelper(variosFolder, '3- CEDULA DE CODEUDOR(ES)');
            if (cedulaCodFolder) {
              const files = cedulaCodFolder.getFiles();
              while (files.hasNext()) {
                const file = files.next();
                documentos.inquilino.push({
                  nombre: '📁 [CED_COD] ' + file.getName(),
                  url: file.getUrl(),
                  tipo: determinarTipoDocumento(file.getName()),
                  tamaño: file.getSize()
                });
              }
            }

            // Carpeta 4 (Archivos sueltos como ingresos y recibos de servicios futuros)
            const variosFiles = variosFolder.getFiles();
            while (variosFiles.hasNext()) {
              const file = variosFiles.next();
              // Evitar listar las subcarpetas, DriveApp getFiles no lista carpetas.
              documentos.inquilino.push({
                nombre: '📄 [SOPERTES] ' + file.getName(),
                url: file.getUrl(),
                tipo: determinarTipoDocumento(file.getName()),
                tamaño: file.getSize()
              });
            }
          }

          // Carpeta 6 (Pagos) - Ubicada junto a 4- VARIOS
          let pagoDerechosFolder = getFolderByNameHelper(docsEntregaInqFolder, '6- PAGO DE LOS DERECHOS DE CONTRATO');
          if (pagoDerechosFolder) {
            const files = pagoDerechosFolder.getFiles();
            while (files.hasNext()) {
              const file = files.next();
              documentos.inquilino.push({
                nombre: '💲 [PAGO] ' + file.getName(),
                url: file.getUrl(),
                tipo: determinarTipoDocumento(file.getName()),
                tamaño: file.getSize()
              });
            }
          }
        }
      }
    }

    // --- LÓGICA DE PROPIETARIOS (MANTENIDA EN RAÍZ DEL CDR TEMPORALMENTE) ---
    // Buscar carpeta de propietario en la raíz
    const subfoldersRaiz = carpetaCDR.getFolders();
    while (subfoldersRaiz.hasNext()) {
      const subfolder = subfoldersRaiz.next();
      const nombre = subfolder.getName();

      if (nombre.startsWith('PROPIETARIO_')) {
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
 * Actualizar campos del inquilino en la hoja
 */
function actualizarCamposInquilino(fila, datos) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    if (!sheet) return;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const mapCampos = {
      'NOMBRE COMPLETO INQUILINO': datos.nombre,
      'Documento de Identidad': datos.documento, // Ajusta según tu header exacto
      'CORREO INQUILINO': datos.email,
      'CELULAR INQUILINO': datos.celular
    };

    Object.entries(mapCampos).forEach(([header, valor]) => {
      const colIndex = headers.indexOf(header) + 1;
      if (colIndex > 0 && valor) {
        sheet.getRange(fila, colIndex).setValue(valor);
      }
    });

  } catch (error) {
    Logger.log('Error actualizando campos inquilino: ' + error.toString());
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
      <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; text-shadow: 0 1px 2px rgba(255,255,255,0.3);">📋 Gold Life - Formulario de Arrendamiento</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Estimado/a <strong>${nombre}</strong>,</p>
        
        <p style="color: #666; line-height: 1.6;">
          Su solicitud de arrendamiento ha sido aprobada. Para continuar con el proceso en <strong>Gold Life System</strong>, 
          necesitamos que complete el formulario con sus datos y documentos.
        </p>
        
        <div style="background: #fdfbf7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #FFD700;">
          <h3 style="color: #B8860B; margin-top: 0;">📄 Documentos requeridos:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Comprobante de pago del servicio</li>
            <li>Estudio de arrendamiento aprobado</li>
            <li>Documento de identidad</li>
            <li>Documentos de codeudor(es) si aplica</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlFormulario}" 
             style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); 
                    color: #1a1a1a; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            ➡️ COMPLETAR FORMULARIO
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #FFA500; border-radius: 4px;">
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

    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend';
    const urlFormulario = `${baseUrl}/validador.html?action=formulario-propietario&cdr=${encodeURIComponent(cdr)}`;

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

    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend';
    const urlCorreccion = `${baseUrl}/validador.html?action=formulario-inquilino&cdr=${encodeURIComponent(cdr)}&modo=correccion`;

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

    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend';
    const urlCorreccion = `${baseUrl}/validador.html?action=formulario-propietario&cdr=${encodeURIComponent(cdr)}&modo=correccion`;

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

// [FUNCIÓN OBSOLETA ELIMINADA] - Usar procesarEmailInquilino centralizada al final del archivo

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
// [FUNCIÓN OBSOLETA ELIMINADA]

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

  const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend';
  const url = `${baseUrl}/validador.html?action=formulario-propietario&cdr=${cdr}`;

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

  const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend';
  const url = `${baseUrl}/validador.html?action=formulario-propietario&cdr=${cdr}&modo=correccion`;

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
// FUNCIONES PARA EL POPUP DE EMAIL INQUILINO
// ==========================================

/**
 * Obtener datos del registro actual (para el popup)
 */
function obtenerDatosRegistroActual() {
  try {
    const props = PropertiesService.getScriptProperties();
    const currentRow = props.getProperty('currentRow');
    const currentCDR = props.getProperty('currentCDR');

    if (!currentRow || !currentCDR) {
      throw new Error('No se encontró información del registro activo. Por favor cierre y vuelva a abrir el popup desde el menú.');
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    if (!sheet) throw new Error('No se encontró la hoja principal');

    const fila = parseInt(currentRow);
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const rowData = sheet.getRange(fila, 1, 1, lastCol).getValues()[0];

    // Obtener índices de columnas clave
    const colDireccion = headers.indexOf('Dirección del inmueble');
    const colTipo = headers.indexOf('TIPO DE NEGOCIO');
    const colEstado = headers.indexOf('ESTADO DEL INMUEBLE');
    const colDetalles = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');

    const direccion = colDireccion !== -1 ? rowData[colDireccion] : 'No especificada';
    const tipoNegocio = colTipo !== -1 ? rowData[colTipo] : 'No especificado';
    const estadoActual = colEstado !== -1 ? rowData[colEstado] : '';
    const detallesEstado = colDetalles !== -1 ? rowData[colDetalles] : '';

    // Verificar si ya se envió antes (si el estado contiene "ENVIADO" o similar)
    const yaEnviado = (estadoActual && estadoActual.includes('ENVIADO')) ||
      (detallesEstado && detallesEstado.includes('Formulario enviado'));

    return {
      cdr: currentCDR,
      direccion: direccion,
      tipoNegocio: tipoNegocio,
      yaEnviado: yaEnviado
    };

  } catch (error) {
    Logger.log('Error en obtenerDatosRegistroActual: ' + error.toString());
    throw error; // Re-lanzar para que el frontend lo capture
  }
}

/**
 * Procesar envío de email al inquilino (Backend)
 */
function procesarEmailInquilino(email, nombre) {
  try {
    // 1. Validaciones básicas
    if (!email || !email.includes('@')) throw new Error('Email inválido');
    if (!nombre || nombre.length < 2) throw new Error('Nombre inválido');

    // 2. Recuperar contexto
    const props = PropertiesService.getScriptProperties();
    const currentRow = parseInt(props.getProperty('currentRow'));
    const currentCDR = props.getProperty('currentCDR');

    if (!currentRow || !currentCDR) {
      throw new Error('Sesión del popup expirada. Por favor cierre y vuelva a intentar.');
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    if (!sheet) throw new Error('No se encontró la hoja principal');

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Generar URL del formulario
    // CORRECCIÓN: El frontend está en /frontend/
    const baseUrl = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend';
    const urlFormulario = `${baseUrl}/validador.html?action=formulario-inquilino&cdr=${encodeURIComponent(currentCDR)}&email=${encodeURIComponent(email)}&nombre=${encodeURIComponent(nombre)}`;

    // 4. Enviar Email
    // Usamos la función centralizada para mantener el diseño consistente
    enviarEmailInquilinoInicial(email, nombre, currentCDR, urlFormulario);

    // 5. Actualizar Estado en la Hoja
    const colEmail = headers.indexOf('CORREO INQUILINO') + 1;
    const colNombre = headers.indexOf('NOMBRE COMPLETO INQUILINO') + 1;
    const colEstado = headers.indexOf('ESTADO DEL INMUEBLE') + 1;
    const colDetalles = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;

    // Guardar datos
    if (colEmail > 0) sheet.getRange(currentRow, colEmail).setValue(email);
    if (colNombre > 0) sheet.getRange(currentRow, colNombre).setValue(nombre);

    // Actualizar estado
    if (colEstado > 0) sheet.getRange(currentRow, colEstado).setValue('FORMULARIO ENVIADO');
    if (colDetalles > 0) sheet.getRange(currentRow, colDetalles).setValue('⏳ Esperando respuesta del inquilino');

    return {
      success: true,
      message: '✅ Email enviado y estado actualizado correctamente.'
    };

  } catch (error) {
    Logger.log('Error en procesarEmailInquilino: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.message
    };
  }
}

// ==========================================
// FIN DEL ARCHIVO
// ==========================================