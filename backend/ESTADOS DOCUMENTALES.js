// ==========================================
// ESTADOS DOCUMENTALES - Real Estate Gold Life System
// Sistema de Validación y Flujo Documental
// Versión: v9.0-produccion
// ==========================================

// CONFIGURACIÓN DOCUMENTAL
const CONFIG_DOCUMENTAL = {
  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  HOJA_LOG: 'LOG_VALIDACIONES',
  VERSION: 'v9.0-produccion',
  
  // Columnas documentales
  COLUMNAS: {
    CDR: 'CODIGO DE REGISTRO',
    ESTADO_PRINCIPAL: 'ESTADO DEL INMUEBLE',
    ESTADO_DOCUMENTAL: 'ESTADO DOCUMENTAL',
    DETALLES_DOCUMENTAL: 'DETALLES ESTADO DOCUMENTAL',
    
    // Propietario
    EMAIL_PROPIETARIO: 'Correo electrónico',
    NOMBRE_PROPIETARIO: 'Ingrese Nombres y Apellidos',
    TIPO_DOC_PROPIETARIO: 'TIPO DOCUMENTO PROPIETARIO',
    NUM_DOC_PROPIETARIO: 'Número de documento',
    CEL_PROPIETARIO: 'Celular',
    
    // Inquilino
    EMAIL_INQUILINO: 'CORREO INQUILINO',
    NOMBRE_INQUILINO: 'NOMBRE COMPLETO INQUILINO',
    TIPO_DOC_INQUILINO: 'TIPO DOCUMENTO INQUILINO',
    NUM_DOC_INQUILINO: 'NUMERO DOCUMENTO INQUILINO',
    CEL_INQUILINO: 'CELULAR INQUILINO',
    OCUPACION_INQUILINO: 'OCUPACIÓN INQUILINO',
    CODEUDORES_JSON: 'CODEUDORES_JSON',
    
    // Inmueble
    DIRECCION: 'Ingrese la Dirección del inmueble',
    CIUDAD: 'Ingrese la Ciudad del inmueble',
    CANON: 'PRECIO DE PROMOCION GENERAL',
    ADMIN: 'PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)',
    FECHA_INICIO: 'FECHA INICIO DEL CONTRATO',
    FECHA_FINAL: 'FECHA FINAL DEL CONTRATO'
  }
};

// ESTADOS DOCUMENTALES
const ESTADOS_DOC = {
  INQ_SUBMITTED: 'INQ_SUBMITTED',
  INQ_CORRECTION: 'INQ_CORRECTION',
  INQ_VALIDATED: 'INQ_VALIDATED',
  WAITING_PROP: 'WAITING_PROP',
  PROP_SUBMITTED: 'PROP_SUBMITTED',
  PROP_CORRECTION: 'PROP_CORRECTION',
  PROP_VALIDATED: 'PROP_VALIDATED',
  READY_CONTRACT: 'READY_CONTRACT',
  CONTRACT_GENERATED: 'CONTRACT_GENERATED',
  CONTRACT_REVIEW: 'CONTRACT_REVIEW',
  CONTRACT_FINAL: 'CONTRACT_FINAL',
  COMPLETED: 'COMPLETED'
};

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

function getSheetDocumental() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG_DOCUMENTAL.HOJA_PRINCIPAL);
}

function getColumnIndexDocumental(sheet, columnName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].toString().trim() === columnName.trim()) {
      return i + 1;
    }
  }
  return -1;
}

function safeGetValueDocumental(sheet, row, columnName) {
  const colIndex = getColumnIndexDocumental(sheet, columnName);
  if (colIndex === -1) return '';
  return sheet.getRange(row, colIndex).getValue();
}

function safeSetValueDocumental(sheet, row, columnName, value) {
  const colIndex = getColumnIndexDocumental(sheet, columnName);
  if (colIndex === -1) return false;
  sheet.getRange(row, colIndex).setValue(value);
  return true;
}

function findRowByCDRDocumental(cdr) {
  const sheet = getSheetDocumental();
  const cdrCol = getColumnIndexDocumental(sheet, CONFIG_DOCUMENTAL.COLUMNAS.CDR);
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
// GESTIÓN DE FLUJO DOCUMENTAL
// ==========================================

function transitionRegistro(cdr, action, opts = {}) {
  const sheet = getSheetDocumental();
  const row = findRowByCDRDocumental(cdr);
  
  if (row === -1) {
    throw new Error('CDR no encontrado: ' + cdr);
  }

  const estadoCol = getColumnIndexDocumental(sheet, CONFIG_DOCUMENTAL.COLUMNAS.ESTADO_DOCUMENTAL);
  const detallesCol = getColumnIndexDocumental(sheet, CONFIG_DOCUMENTAL.COLUMNAS.DETALLES_DOCUMENTAL);
  
  let nuevoEstado = '';
  let mensaje = '';

  switch(action) {
    case 'aprobarInquilino':
      validarCamposInquilino(row);
      validarCodeudores(row);
      nuevoEstado = ESTADOS_DOC.INQ_VALIDATED;
      mensaje = '✅ Inquilino validado. Esperando documentos del propietario.';
      enviarSolicitudPropietario(cdr, row);
      break;

    case 'correccionInquilino':
      nuevoEstado = ESTADOS_DOC.INQ_CORRECTION;
      mensaje = '📄 Corrección solicitada al inquilino.' + (opts.observaciones || '');
      enviarCorreoCorreccion(cdr, 'inquilino', opts);
      break;

    case 'aprobarPropietario':
      nuevoEstado = ESTADOS_DOC.PROP_VALIDATED;
      mensaje = '✅ Propietario validado.';
      if (inquilinoValidado(row)) {
        nuevoEstado = ESTADOS_DOC.READY_CONTRACT;
        mensaje = '🟢 Inquilino y Propietario validados. Listo para generar contrato.';
        enviarNotificacionContratoListo(cdr, row);
      }
      break;

    case 'correccionPropietario':
      nuevoEstado = ESTADOS_DOC.PROP_CORRECTION;
      mensaje = '📄 Corrección solicitada al propietario.' + (opts.observaciones || '');
      enviarCorreoCorreccion(cdr, 'propietario', opts);
      break;

    case 'generarContrato':
      nuevoEstado = ESTADOS_DOC.CONTRACT_GENERATED;
      mensaje = '📝 Contrato generado. Pendiente revisión de las partes.';
      break;

    case 'aprobarContrato':
      nuevoEstado = ESTADOS_DOC.CONTRACT_FINAL;
      mensaje = '✅ Contrato aprobado por todas las partes.';
      break;

    default:
      throw new Error('Acción no soportada: ' + action);
  }

  // Actualizar estado
  sheet.getRange(row, estadoCol).setValue(nuevoEstado);
  sheet.getRange(row, detallesCol).setValue(mensaje);
  
  // Log de la transición
  logTransicion(cdr, action, nuevoEstado, opts);
  
  return { success: true, estadoNuevo: nuevoEstado, mensaje: mensaje };
}

// ==========================================
// VALIDACIONES
// ==========================================

function validarCamposInquilino(row) {
  const sheet = getSheetDocumental();
  const camposRequeridos = [
    CONFIG_DOCUMENTAL.COLUMNAS.EMAIL_INQUILINO,
    CONFIG_DOCUMENTAL.COLUMNAS.NOMBRE_INQUILINO,
    CONFIG_DOCUMENTAL.COLUMNAS.TIPO_DOC_INQUILINO,
    CONFIG_DOCUMENTAL.COLUMNAS.NUM_DOC_INQUILINO
  ];
  
  const faltantes = [];
  camposRequeridos.forEach(campo => {
    const valor = safeGetValueDocumental(sheet, row, campo);
    if (!valor) faltantes.push(campo);
  });
  
  if (faltantes.length > 0) {
    throw new Error('Faltan campos del inquilino: ' + faltantes.join(', '));
  }
}

function validarCodeudores(row) {
  const sheet = getSheetDocumental();
  const codeudoresJson = safeGetValueDocumental(sheet, row, CONFIG_DOCUMENTAL.COLUMNAS.CODEUDORES_JSON);
  
  if (!codeudoresJson) return; // Sin codeudores es válido
  
  try {
    const codeudores = JSON.parse(codeudoresJson);
    if (!Array.isArray(codeudores)) return;
    
    codeudores.forEach((codeudor, index) => {
      const camposRequeridos = ['nombre', 'tipoDocumento', 'numeroDocumento', 'email', 'celular'];
      camposRequeridos.forEach(campo => {
        if (!codeudor[campo]) {
          throw new Error(`Codeudor ${index + 1} - falta campo: ${campo}`);
        }
      });
    });
  } catch (e) {
    if (e.message.includes('Codeudor')) throw e;
    // Si no es error de validación, ignorar (JSON inválido)
  }
}

function inquilinoValidado(row) {
  const sheet = getSheetDocumental();
  const estado = safeGetValueDocumental(sheet, row, CONFIG_DOCUMENTAL.COLUMNAS.ESTADO_DOCUMENTAL);
  
  return [
    ESTADOS_DOC.INQ_VALIDATED,
    ESTADOS_DOC.WAITING_PROP,
    ESTADOS_DOC.PROP_SUBMITTED,
    ESTADOS_DOC.PROP_VALIDATED,
    ESTADOS_DOC.READY_CONTRACT
  ].includes(estado);
}

// ==========================================
// NOTIFICACIONES Y CORREOS
// ==========================================

function enviarSolicitudPropietario(cdr, row) {
  try {
    const sheet = getSheetDocumental();
    const email = safeGetValueDocumental(sheet, row, CONFIG_DOCUMENTAL.COLUMNAS.EMAIL_PROPIETARIO);
    
    if (!email) {
      safeSetValueDocumental(sheet, row, CONFIG_DOCUMENTAL.COLUMNAS.DETALLES_DOCUMENTAL, 
        '✅ Inquilino validado. Falta correo de propietario.');
      return;
    }
    
    const asunto = `Solicitud de documentos - ${cdr}`;
    const linkFormulario = `https://realestate-goldlifesystem.github.io/efirmacontrata/formulario_propietario.html?cdr=${encodeURIComponent(cdr)}`;
    
    const cuerpoHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Documentos Requeridos</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h3>Estimado Propietario,</h3>
          
          <p>El inquilino ha completado su documentación satisfactoriamente.</p>
          <p>Ahora necesitamos que usted complete su formulario para continuar con el proceso de contrato.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${linkFormulario}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              📋 COMPLETAR FORMULARIO
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Código de registro: <strong>${cdr}</strong>
          </p>
        </div>
      </div>
    `;
    
    GmailApp.sendEmail(email, asunto, '', {
      htmlBody: cuerpoHtml,
      name: 'Real Estate Gold Life System'
    });
    
    logAccionDocumental(cdr, 'Correo enviado a propietario');
    
  } catch (err) {
    logErrorDocumental('enviarSolicitudPropietario', err.message);
  }
}

function enviarCorreoCorreccion(cdr, tipo, opts) {
  try {
    const sheet = getSheetDocumental();
    const row = findRowByCDRDocumental(cdr);
    
    const columnaEmail = tipo === 'inquilino' ? 
      CONFIG_DOCUMENTAL.COLUMNAS.EMAIL_INQUILINO : 
      CONFIG_DOCUMENTAL.COLUMNAS.EMAIL_PROPIETARIO;
    
    const email = safeGetValueDocumental(sheet, row, columnaEmail);
    if (!email) return;
    
    const asunto = `Corrección requerida - ${cdr}`;
    const linkCorreccion = `https://realestate-goldlifesystem.github.io/efirmacontrata/formulario_${tipo}.html?cdr=${encodeURIComponent(cdr)}&modo=correccion`;
    
    const documentos = opts.documentos || [];
    const observaciones = opts.observaciones || '';
    
    const listaDocumentos = documentos.map(doc => `• ${doc}`).join('\n');
    
    const cuerpoHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fff3cd; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="color: #856404; margin: 0;">⚠️ Corrección Requerida</h2>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h3>Estimado/a,</h3>
          
          <p>Necesitamos que corrija los siguientes documentos:</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <pre style="font-family: Arial; margin: 0;">${listaDocumentos}</pre>
          </div>
          
          ${observaciones ? `
          <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Observaciones:</strong><br>
            ${observaciones}
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${linkCorreccion}" style="background: #ffc107; color: #333; padding: 15px 40px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              📝 CORREGIR DOCUMENTOS
            </a>
          </div>
        </div>
      </div>
    `;
    
    GmailApp.sendEmail(email, asunto, '', {
      htmlBody: cuerpoHtml,
      name: 'Real Estate Gold Life System'
    });
    
    logAccionDocumental(cdr, `Correo de corrección enviado a ${tipo}`);
    
  } catch (err) {
    logErrorDocumental('enviarCorreoCorreccion', err.message);
  }
}

function enviarNotificacionContratoListo(cdr, row) {
  try {
    const sheet = getSheetDocumental();
    const emailInq = safeGetValueDocumental(sheet, row, CONFIG_DOCUMENTAL.COLUMNAS.EMAIL_INQUILINO);
    const emailProp = safeGetValueDocumental(sheet, row, CONFIG_DOCUMENTAL.COLUMNAS.EMAIL_PROPIETARIO);
    
    const asunto = `Documentación completa - ${cdr}`;
    const cuerpoHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d4edda; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="color: #155724; margin: 0;">✅ Documentación Completa</h2>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <p>La documentación de ambas partes ha sido validada exitosamente.</p>
          <p>En las próximas horas recibirán el borrador del contrato para su revisión.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Próximos pasos:</strong>
            <ol>
              <li>Generación del borrador de contrato</li>
              <li>Revisión por ambas partes</li>
              <li>Aprobación y firma digital</li>
            </ol>
          </div>
        </div>
      </div>
    `;
    
    if (emailInq) {
      GmailApp.sendEmail(emailInq, asunto, '', {
        htmlBody: cuerpoHtml,
        name: 'Real Estate Gold Life System'
      });
    }
    
    if (emailProp) {
      GmailApp.sendEmail(emailProp, asunto, '', {
        htmlBody: cuerpoHtml,
        name: 'Real Estate Gold Life System'
      });
    }
    
    logAccionDocumental(cdr, 'Notificación de contrato listo enviada');
    
  } catch (err) {
    logErrorDocumental('enviarNotificacionContratoListo', err.message);
  }
}

// ==========================================
// FUNCIONES DE LOG
// ==========================================

function logTransicion(cdr, action, estadoNuevo, opts) {
  const mensaje = `Transición: ${action} -> ${estadoNuevo}` + 
    (opts.observaciones ? ` (${opts.observaciones})` : '');
  logAccionDocumental(cdr, mensaje);
}

function logAccionDocumental(cdr, accion) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(CONFIG_DOCUMENTAL.HOJA_LOG);
    
    if (!logSheet) {
      logSheet = ss.insertSheet(CONFIG_DOCUMENTAL.HOJA_LOG);
      logSheet.getRange(1, 1, 1, 5).setValues([
        ['TIMESTAMP', 'CDR', 'ACCION', 'USUARIO', 'VERSION']
      ]);
    }
    
    logSheet.appendRow([
      new Date(),
      cdr,
      accion,
      Session.getActiveUser().getEmail() || 'SISTEMA',
      CONFIG_DOCUMENTAL.VERSION
    ]);
  } catch (e) {
    // Error silencioso en producción
  }
}

function logErrorDocumental(funcion, mensaje) {
  try {
    console.error(`[${funcion}] ${mensaje}`);
    logAccionDocumental('ERROR', `${funcion}: ${mensaje}`);
  } catch (e) {
    // Error silencioso
  }
}

// ==========================================
// FUNCIONES EXPUESTAS AL PANEL
// ==========================================

function aprobarDocumentosInquilino(cdr) {
  return transitionRegistro(cdr, 'aprobarInquilino');
}

function solicitarCorreccionInquilino(cdr, documentos, observaciones, causas) {
  return transitionRegistro(cdr, 'correccionInquilino', {
    documentos: documentos,
    observaciones: observaciones,
    causas: causas
  });
}

function aprobarDocumentosPropietario(cdr) {
  return transitionRegistro(cdr, 'aprobarPropietario');
}

function solicitarCorreccionPropietario(cdr, documentos, observaciones, causas) {
  return transitionRegistro(cdr, 'correccionPropietario', {
    documentos: documentos,
    observaciones: observaciones,
    causas: causas
  });
}

// ==========================================
// OBTENER DATOS PARA PANEL
// ==========================================

function obtenerRegistrosDocumentales(filtro = 'todos', parte = null) {
  const sheet = getSheetDocumental();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const registros = [];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Obtener índices de columnas
  const indices = {};
  Object.keys(CONFIG_DOCUMENTAL.COLUMNAS).forEach(key => {
    const colName = CONFIG_DOCUMENTAL.COLUMNAS[key];
    const index = headers.indexOf(colName);
    if (index !== -1) indices[key] = index;
  });
  
  data.forEach((row, i) => {
    const cdr = row[indices.CDR];
    if (!cdr) return;
    
    const estado = row[indices.ESTADO_PRINCIPAL];
    const detalles = row[indices.DETALLES];
    const estadoDocumental = row[indices.ESTADO_DOCUMENTAL] || '';
    
    // Filtrar por estado ESTUDIO APROBADO
    if (estado !== 'ESTUDIO APROBADO') return;
    
    // Filtrar por parte si se especifica
    if (parte === 'inquilino') {
      if (!detalles.includes('inquilino')) return;
    } else if (parte === 'propietario') {
      if (!detalles.includes('propietario')) return;
    }
    
    // Obtener datos de codeudores
    let codeudoresCount = 0;
    if (indices.CODEUDORES_JSON !== undefined) {
      try {
        const codeudoresJson = row[indices.CODEUDORES_JSON];
        if (codeudoresJson) {
          const codeudores = JSON.parse(codeudoresJson);
          if (Array.isArray(codeudores)) {
            codeudoresCount = codeudores.length;
          }
        }
      } catch (e) {
        // Ignorar error de JSON
      }
    }
    
    registros.push({
      fila: i + 2,
      cdr: cdr,
      estado: estado,
      detalles: detalles,
      estadoDocumental: estadoDocumental,
      direccion: row[indices.DIRECCION] || '',
      propietario: row[indices.NOMBRE_PROPIETARIO] || '',
      inquilino: row[indices.NOMBRE_INQUILINO] || '',
      codeudoresCount: codeudoresCount,
      pendienteValidacion: detalles.includes('Pendiente') || detalles.includes('recibidos')
    });
  });
  
  return registros;
}

function obtenerDetalleRegistro(cdr) {
  const sheet = getSheetDocumental();
  const row = findRowByCDRDocumental(cdr);
  
  if (row === -1) {
    throw new Error('CDR no encontrado');
  }
  
  const datos = {};
  
  // Obtener todos los datos relevantes
  Object.keys(CONFIG_DOCUMENTAL.COLUMNAS).forEach(key => {
    const colName = CONFIG_DOCUMENTAL.COLUMNAS[key];
    datos[key] = safeGetValueDocumental(sheet, row, colName);
  });
  
  // Parsear codeudores si existen
  if (datos.CODEUDORES_JSON) {
    try {
      datos.codeudores = JSON.parse(datos.CODEUDORES_JSON);
    } catch (e) {
      datos.codeudores = [];
    }
  } else {
    datos.codeudores = [];
  }
  
  return datos;
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

function initEstadosDocumentales() {
  // Verificar que las hojas existan
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(CONFIG_DOCUMENTAL.HOJA_PRINCIPAL)) {
    throw new Error('Hoja principal no encontrada: ' + CONFIG_DOCUMENTAL.HOJA_PRINCIPAL);
  }
  
  // Crear hoja de log si no existe
  if (!ss.getSheetByName(CONFIG_DOCUMENTAL.HOJA_LOG)) {
    const logSheet = ss.insertSheet(CONFIG_DOCUMENTAL.HOJA_LOG);
    logSheet.getRange(1, 1, 1, 5).setValues([
      ['TIMESTAMP', 'CDR', 'ACCION', 'USUARIO', 'VERSION']
    ]);
  }
  
  console.log('✅ Sistema de Estados Documentales iniciado - ' + CONFIG_DOCUMENTAL.VERSION);
}

// Ejecutar al cargar
initEstadosDocumentales();