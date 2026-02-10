// ==========================================
// GESTOR DE ESTADOS - Real Estate Gold Life System
// Sistema de Estados Principales del Inmueble
// Versión: v9.4-produccion
// ==========================================

// CONFIGURACIÓN DE ESTADOS
const ESTADOS_CONFIG = {
  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  HOJA_LOG: 'LOG_VALIDACIONES',
  VERSION: 'v9.4-produccion',
  
  // Columnas principales
  COLUMNAS: {
    CDR: 'CODIGO DE REGISTRO',
    ESTADO: 'ESTADO DEL INMUEBLE',
    DETALLES: 'DETALLES DEL ESTADO DEL INMUEBLE',
    TIPO_NEGOCIO: 'TIPO DE NEGOCIO'
  }
};

// ESTADOS DEL SISTEMA
const ESTADOS_SISTEMA = {
  // Estados principales del inmueble
  PENDIENTE: 'PENDIENTE',
  ERROR: 'ERROR',
  ACTUALIZAR: 'ACTUALIZAR',
  ACTIVAR: 'ACTIVAR',
  PUBLICADO: 'PUBLICADO',
  PUBLICADO_VENTA: 'PUBLICADO VENTA',
  PUBLICADO_VENTA_RENTA: 'PUBLICADO VENTA/RENTA',
  ESTUDIO_APROBADO: 'ESTUDIO APROBADO',
  BORRADOR_ENVIADO: 'BORRADOR ENVIADO',
  BORRADOR_APROBADO: 'BORRADOR APROBADO',
  CONTRATO_ORIGINAL_ENVIADO: 'CONTRATO ENVIADO',
  CONTRATO_FIRMADO: 'CONTRATO FIRMADO',
  ENTREGA_COORDINADA: 'ENTREGA/TRASTEO COORDINADO',
  CUENTA_COBRO_ENVIADA: 'CUENTA DE COBRO ENVIADA',
  LINKS_CARPETAS_ENVIADOS: 'LINKS CARPETAS ENVIADOS',
  ENTREGA_COMPLETA: 'ENTREGA DEL INM COMPLETA',
  RECIBO_ENVIADO: 'RECIBO ENVIADO',
  POLIZA_SOLICITADA: 'POLIZA SOLICITADA',
  POLIZA_PAGADA: 'PÓLIZA PAGADA',
  POLIZA_CANCELADA: 'PÓLIZA CANCELADA',
  ADMINISTRANDO: 'ADMINISTRANDO',
  VENDIDO: 'VENDIDO',
  INACTIVO: 'INACTIVO'
};

// MENSAJES DE ESTADO
const MENSAJES_ESTADO = {
  PENDIENTE: '📌 Contenido de publicación pendiente.',
  ERROR: '⚠️ Error detectado. Verifica el contenido del inmueble.',
  ACTUALIZAR: '✅ Publicación actualizada con éxito.',
  ACTIVAR: '✅ Publicación activada con éxito.',
  PUBLICADO: '🟢 Publicación pendiente de estudio y aprobación.',
  PUBLICADO_VENTA: '🟢 Publicación pendiente de propuesta de compra.',
  PUBLICADO_VENTA_RENTA: '🟢 Publicación pendiente de propuesta de compra o renta.',
  ESTUDIO_APROBADO: '📄 Solicitar documentos para contrato.',
  BORRADOR_ENVIADO: '📑 Solventar y validar la aprobación del borrador',
  BORRADOR_APROBADO: '📄 Validar y enviar para autenticar CONTRATO ORIGINAL',
  CONTRATO_ORIGINAL_ENVIADO: '📜✒️ Pendiente por autenticar y firmar las partes',
  CONTRATO_FIRMADO: '📆 Coordinar día de entrega/trasteo.',
  ENTREGA_COORDINADA: '📩 Enviar cuenta de cobro.',
  CUENTA_COBRO_ENVIADA: '🔗 Enviar link de carpeta de PROPIETARIO e INQUILINO',
  LINKS_CARPETAS_ENVIADOS: '📦 Coordinar y entregar el inmueble.',
  ENTREGA_COMPLETA: '🧾 Enviar link de RECIBO al propietario',
  RECIBO_ENVIADO: '🛡️ Solicitar póliza.',
  POLIZA_SOLICITADA: '💳 Póliza pendiente de pago.',
  POLIZA_PAGADA: '💳 Póliza pendiente para cuenta de cobro.',
  ADMINISTRANDO: '🏠 El inmueble está en administración.',
  VENDIDO: '🚫 Inmueble inactivado (vendido con éxito).',
  INACTIVO: '🚫 El inmueble está inactivado.'
};

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(ESTADOS_CONFIG.HOJA_PRINCIPAL);
}

function getColumnIndex(sheet, columnName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].toString().trim() === columnName.trim()) {
      return i + 1;
    }
  }
  return -1;
}

function safeGetValue(sheet, row, columnName) {
  const colIndex = getColumnIndex(sheet, columnName);
  if (colIndex === -1) return '';
  return sheet.getRange(row, colIndex).getValue();
}

function safeSetValue(sheet, row, columnName, value) {
  const colIndex = getColumnIndex(sheet, columnName);
  if (colIndex === -1) return false;
  sheet.getRange(row, colIndex).setValue(value);
  return true;
}

function findRowByCDR(cdr) {
  const sheet = getSheet();
  const cdrCol = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.CDR);
  if (cdrCol === -1) return -1;
  
  const lastRow = sheet.getLastRow();
  const values = sheet.getRange(2, cdrCol, lastRow - 1, 1).getValues();
  
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] && values[i][0].toString().trim() === cdr.trim()) {
      return i + 2;
    }
  }
  return -1;
}

// ==========================================
// GESTIÓN DE ESTADOS PRINCIPALES
// ==========================================

function onEditEstados(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.source.getSheetByName(ESTADOS_CONFIG.HOJA_PRINCIPAL);
    if (!sheet) return;

    const row = e.range.getRow();
    const col = e.range.getColumn();

    const estadoColIndex = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.ESTADO);
    const detallesColIndex = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.DETALLES);

    if (col !== estadoColIndex) return;

    const estadoNuevo = e.value;
    
    // Procesar cambio de estado
    procesarCambioEstado(sheet, row, estadoNuevo, estadoColIndex, detallesColIndex);
    
  } catch (err) {
    logError('onEditEstados', err.message);
  }
}

function procesarCambioEstado(sheet, row, estadoNuevo, estadoColIndex, detallesColIndex) {
  switch (estadoNuevo) {
    case ESTADOS_SISTEMA.PENDIENTE:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.PENDIENTE);
      break;

    case ESTADOS_SISTEMA.ERROR:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.ERROR);
      sheet.getRange(row, estadoColIndex).setValue(ESTADOS_SISTEMA.PENDIENTE);
      break;

    case ESTADOS_SISTEMA.ACTUALIZAR:
    case ESTADOS_SISTEMA.ACTIVAR:
      // Mostrar mensaje inicial
      sheet.getRange(row, detallesColIndex).setValue(
        estadoNuevo === ESTADOS_SISTEMA.ACTUALIZAR ? 
        MENSAJES_ESTADO.ACTUALIZAR : 
        MENSAJES_ESTADO.ACTIVAR
      );
      SpreadsheetApp.flush();
      Utilities.sleep(2000);
      
      // Verificar tipo de negocio
      const tipoNegocioIndex = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.TIPO_NEGOCIO);
      const tipoNegocio = sheet.getRange(row, tipoNegocioIndex).getValue();
      const tipoNegocioNormalizado = tipoNegocio ? tipoNegocio.toString().trim().toLowerCase() : '';
      
      // Cambiar estado según el tipo de negocio
      if (tipoNegocioNormalizado === 'vendi-renta' || tipoNegocioNormalizado === 'admi-venta') {
        sheet.getRange(row, estadoColIndex).setValue(ESTADOS_SISTEMA.PUBLICADO_VENTA_RENTA);
        sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.PUBLICADO_VENTA_RENTA);
      } else if (tipoNegocioNormalizado === 'venta') {
        sheet.getRange(row, estadoColIndex).setValue(ESTADOS_SISTEMA.PUBLICADO_VENTA);
        sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.PUBLICADO_VENTA);
      } else {
        sheet.getRange(row, estadoColIndex).setValue(ESTADOS_SISTEMA.PUBLICADO);
        sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.PUBLICADO);
      }
      break;

    case ESTADOS_SISTEMA.PUBLICADO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.PUBLICADO);
      break;

    case ESTADOS_SISTEMA.PUBLICADO_VENTA:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.PUBLICADO_VENTA);
      break;

    case ESTADOS_SISTEMA.PUBLICADO_VENTA_RENTA:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.PUBLICADO_VENTA_RENTA);
      break;

    case ESTADOS_SISTEMA.ESTUDIO_APROBADO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.ESTUDIO_APROBADO);
      // Aquí se puede llamar a función del gestor documental si es necesario
      mostrarPopupEmailInquilino(sheet, row);
      break;

    case ESTADOS_SISTEMA.BORRADOR_ENVIADO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.BORRADOR_ENVIADO);
      break;

    case ESTADOS_SISTEMA.BORRADOR_APROBADO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.BORRADOR_APROBADO);
      break;

    case ESTADOS_SISTEMA.CONTRATO_ORIGINAL_ENVIADO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.CONTRATO_ORIGINAL_ENVIADO);
      break;

    case ESTADOS_SISTEMA.CONTRATO_FIRMADO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.CONTRATO_FIRMADO);
      break;

    case ESTADOS_SISTEMA.ENTREGA_COORDINADA:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.ENTREGA_COORDINADA);
      break;

    case ESTADOS_SISTEMA.CUENTA_COBRO_ENVIADA:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.CUENTA_COBRO_ENVIADA);
      break;

    case ESTADOS_SISTEMA.LINKS_CARPETAS_ENVIADOS:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.LINKS_CARPETAS_ENVIADOS);
      break;

    case ESTADOS_SISTEMA.ENTREGA_COMPLETA:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.ENTREGA_COMPLETA);
      break;

    case ESTADOS_SISTEMA.RECIBO_ENVIADO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.RECIBO_ENVIADO);
      break;

    case ESTADOS_SISTEMA.POLIZA_SOLICITADA:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.POLIZA_SOLICITADA);
      break;

    case ESTADOS_SISTEMA.POLIZA_PAGADA:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.POLIZA_PAGADA);
      break;

    case ESTADOS_SISTEMA.POLIZA_CANCELADA:
      const tipoNegocioIndexPoliza = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.TIPO_NEGOCIO);
      const tipoNegocioPoliza = sheet.getRange(row, tipoNegocioIndexPoliza).getValue();
      const tipoNegocioPolizaNormalizado = tipoNegocioPoliza ? tipoNegocioPoliza.toString().trim().toLowerCase() : '';

      // Corretaje y Vendi-Renta → INACTIVO (Arrendado)
      if (tipoNegocioPolizaNormalizado === 'corretaje' || tipoNegocioPolizaNormalizado === 'vendi-renta') {
        sheet.getRange(row, estadoColIndex).setValue(ESTADOS_SISTEMA.INACTIVO);
        sheet.getRange(row, detallesColIndex).setValue('🚫 Inmueble inactivado (Arrendado por corretaje).');
      } 
      // Administración y Admi-Venta → ADMINISTRANDO
      else if (tipoNegocioPolizaNormalizado === 'administración' || tipoNegocioPolizaNormalizado === 'admi-venta') {
        sheet.getRange(row, estadoColIndex).setValue(ESTADOS_SISTEMA.ADMINISTRANDO);
        sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.ADMINISTRANDO);
      } 
      else {
        sheet.getRange(row, detallesColIndex).setValue('📝 Revisar tipo de negocio para continuar.');
      }
      break;

    case ESTADOS_SISTEMA.VENDIDO:
      const tipoNegocioIndexVendido = getColumnIndex(sheet, ESTADOS_CONFIG.COLUMNAS.TIPO_NEGOCIO);
      const tipoNegocioVendido = sheet.getRange(row, tipoNegocioIndexVendido).getValue();
      const tipoNegocioVendidoNormalizado = tipoNegocioVendido ? tipoNegocioVendido.toString().trim().toLowerCase() : '';

      // Venta, Vendi-Renta y Admi-Venta → INACTIVO (Vendido)
      if (tipoNegocioVendidoNormalizado === 'venta' || 
          tipoNegocioVendidoNormalizado === 'vendi-renta' || 
          tipoNegocioVendidoNormalizado === 'admi-venta') {
        sheet.getRange(row, estadoColIndex).setValue(ESTADOS_SISTEMA.INACTIVO);
        sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.VENDIDO);
      } 
      // Corretaje y Administración → Revisar
      else {
        sheet.getRange(row, detallesColIndex).setValue('📝 Revisar tipo de negocio para continuar.');
      }
      break;

    case ESTADOS_SISTEMA.ADMINISTRANDO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.ADMINISTRANDO);
      break;

    case ESTADOS_SISTEMA.INACTIVO:
      sheet.getRange(row, detallesColIndex).setValue(MENSAJES_ESTADO.INACTIVO);
      break;

    default:
      sheet.getRange(row, detallesColIndex).setValue('ℹ️ Estado no reconocido. Verifica.');
      break;
  }
  
  // Log del cambio
  logCambioEstado(row, estadoNuevo);
}

// ==========================================
// FUNCIÓN POPUP (puede integrarse con gestor documental)
// ==========================================

function mostrarPopupEmailInquilino(sheet, row) {
  // Esta función puede disparar el flujo documental
  // Por ahora solo registra en log
  const cdr = safeGetValue(sheet, row, ESTADOS_CONFIG.COLUMNAS.CDR);
  logAccion(cdr, 'Estado ESTUDIO APROBADO - Listo para solicitar documentos');
}

// ==========================================
// FUNCIONES DE LOG
// ==========================================

function logCambioEstado(row, estadoNuevo) {
  try {
    const sheet = getSheet();
    const cdr = safeGetValue(sheet, row, ESTADOS_CONFIG.COLUMNAS.CDR);
    logAccion(cdr, `Cambio de estado a: ${estadoNuevo}`);
  } catch (e) {
    // Error silencioso
  }
}

function logAccion(cdr, accion) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(ESTADOS_CONFIG.HOJA_LOG);
    
    if (!logSheet) {
      logSheet = ss.insertSheet(ESTADOS_CONFIG.HOJA_LOG);
      logSheet.getRange(1, 1, 1, 5).setValues([
        ['TIMESTAMP', 'CDR', 'ACCION', 'USUARIO', 'VERSION']
      ]);
    }
    
    logSheet.appendRow([
      new Date(),
      cdr,
      accion,
      Session.getActiveUser().getEmail() || 'SISTEMA',
      ESTADOS_CONFIG.VERSION
    ]);
  } catch (e) {
    // Error silencioso en producción
  }
}

function logError(funcion, mensaje) {
  try {
    console.error(`[${funcion}] ${mensaje}`);
    logAccion('ERROR', `${funcion}: ${mensaje}`);
  } catch (e) {
    // Error silencioso
  }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

function initEstados() {
  // Verificar que las hojas existan
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(ESTADOS_CONFIG.HOJA_PRINCIPAL)) {
    throw new Error('Hoja principal no encontrada: ' + ESTADOS_CONFIG.HOJA_PRINCIPAL);
  }
  
  // Crear hoja de log si no existe
  if (!ss.getSheetByName(ESTADOS_CONFIG.HOJA_LOG)) {
    const logSheet = ss.insertSheet(ESTADOS_CONFIG.HOJA_LOG);
    logSheet.getRange(1, 1, 1, 5).setValues([
      ['TIMESTAMP', 'CDR', 'ACCION', 'USUARIO', 'VERSION']
    ]);
  }
  
  console.log('✅ Sistema de Estados iniciado - ' + ESTADOS_CONFIG.VERSION);
}

// Ejecutar al cargar
initEstados();