// ==========================================
// GESTOR DE CONTRATOS - E-FIRMACONTRATA v3.0
// Sistema de Generacion y Gestion de Contratos
// Real Estate Gold Life System
// ==========================================

// CONFIGURACION
// CONFIGURACION
const CONTRATO_CONFIG = {
  // Plantillas de Contrato
  PLANTILLA_CORRETAJE_ID: '1MZpzfQAkhHXf5ku6utOvT3QmfpPiEHIW-r1uFSaipAs', // ORIGINAL
  PLANTILLA_CORRETAJE_BORRADOR_ID: '1AwBLUjnF2TsSYUfSJmwDmw5eqk7OB3yjdX186uoB4Bo', // BORRADOR
  PLANTILLA_ADMINISTRACION_ID: '', // Pendiente
  PLANTILLA_VENTA_ID: '', // Pendiente

  // IDs de Referencia (Carpetas Maestras)
  CARPETA_CONTRATOS_ID: '1tJSOD4-OXmx-GNmuvPxRAWRzRX6Dh8gE',
  INMUEBLES_ROOT_ID: '1ozAkjspgSj6m2fN4tqqCm-mjrsux6ULi', // Carpeta raíz INMUEBLES

  HOJA_PRINCIPAL: '1.1 - INMUEBLES REGISTRADOS',
  HOJA_LOG_CONTRATOS: 'LOG_CONTRATOS',
  HOJA_APROBACIONES: 'LOG_APROBACIONES_CONTRATO',
  BASE_URL: 'https://realestate-goldlifesystem.github.io/efirmacontrata',
  VERSION: 'v3.1-multicontrato'
};

// ==========================================
// FUNCIONES PRINCIPALES DE CONTRATO
// ==========================================

/**
 * Generar contrato desde plantilla
 * @param {string} cdr - Codigo de registro
 * @param {string} version - 'Borrador' o 'Original'
 */
function generarContrato(cdr, version = 'Borrador') {
  try {
    console.log(`Iniciando generacion de contrato para CDR: ${cdr} | Version: ${version}`);

    // 1. Recopilar todos los datos necesarios
    const datosRecopilados = recopilarDatosContrato(cdr);

    if (!datosRecopilados.success) {
      throw new Error(datosRecopilados.message || 'Error recopilando datos');
    }

    const datos = datosRecopilados.data;
    const tipoNegocio = datos.tipoNegocio; 

    // 2. Lógica separada: Si es Original, clonar el borrador existente
    if (version === 'Original') {
      const contexto = obtenerContextoContrato(cdr);
      if (!contexto.success || !contexto.url) {
        throw new Error('No se encontró un borrador previo para generar el original.');
      }
      
      // Extraer ID del borrador desde la URL
      const match = contexto.url.match(/document\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) throw new Error('No se pudo extraer el ID del borrador.');
      const draftId = match[1];
      
      const draftFile = DriveApp.getFileById(draftId);
      const parents = draftFile.getParents();
      
      let carpetaContratoDestino;
      if (parents.hasNext()) {
        carpetaContratoDestino = parents.next();
      } else {
        carpetaContratoDestino = buscarCarpetaContratoDinamica(datos);
      }
      
      if (!carpetaContratoDestino) throw new Error('No se pudo localizar la carpeta de destino.');
      
      let nombreTipoContrato = datos.tipoNegocio === 'Corretaje' ? 'Corretaje' : 
                               (datos.tipoNegocio === 'Administracion' || datos.tipoNegocio === 'Administración' ? 'Administracion' : 
                               (datos.tipoNegocio === 'Venta' ? 'Venta' : 'Arrendamiento'));
                               
      const nombreContrato = `Contrato_${nombreTipoContrato}_${datos.propietario.nombre}_${datos.idRegistro}`;
      
      // Crear copia "Original"
      const originalFile = draftFile.makeCopy(nombreContrato + " - FINAL", carpetaContratoDestino);
      const docOriginal = DocumentApp.openById(originalFile.getId());
      
      // Quitar texto "BORRADOR" del encabezado y cambiarlo por ORIGINAL (simulando marca de agua dinámica)
      const header = docOriginal.getHeader();
      if (header) {
        header.replaceText('(?i)BORRADOR', 'ORIGINAL'); // Case insensitive
      }
      docOriginal.saveAndClose();
      
      // Generar PDF
      const pdfBlob = docOriginal.getAs(MimeType.PDF);
      const pdfFile = carpetaContratoDestino.createFile(pdfBlob).setName(`${nombreContrato}.pdf`);
      
      actualizarEstadoContrato(cdr, 'CONTRATO ORIGINAL GENERADO', `✅ PDF Final generado. ID: ${originalFile.getId()}`);
      
      // Enviar correo final al administrador
      enviarEmailFinalAdmin(cdr, nombreContrato, pdfFile.getUrl(), pdfBlob);

      return {
        success: true,
        docId: originalFile.getId(),
        url: docOriginal.getUrl(),
        urlPdf: pdfFile.getUrl(),
        carpeta: carpetaContratoDestino.getUrl(),
        datos: datos,
        message: 'Contrato Original generado exitosamente'
      };
    }

    // 3. Lógica normal para 'Borrador': Crear desde plantilla
    let plantillaId = '';
    let nombreTipoContrato = '';

    if (datos.tipoNegocio === 'Corretaje') {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_CORRETAJE_BORRADOR_ID;
      nombreTipoContrato = 'Corretaje';
    } else if (datos.tipoNegocio === 'Administracion' || datos.tipoNegocio === 'Administración') {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_ADMINISTRACION_ID || CONTRATO_CONFIG.PLANTILLA_CORRETAJE_BORRADOR_ID;
      nombreTipoContrato = 'Administracion';
    } else if (datos.tipoNegocio === 'Venta') {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_VENTA_ID || CONTRATO_CONFIG.PLANTILLA_CORRETAJE_BORRADOR_ID;
      nombreTipoContrato = 'Venta';
    } else {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_CORRETAJE_BORRADOR_ID;
      nombreTipoContrato = 'Arrendamiento';
    }

    if (!plantillaId) {
      throw new Error(`No hay plantilla configurada para el tipo de negocio: ${datos.tipoNegocio}`);
    }

    const carpetaContratoDestino = buscarCarpetaContratoDinamica(datos);
    if (!carpetaContratoDestino) {
      throw new Error('No se pudo localizar la carpeta "Contrato de Arrendamiento" o equivalente.');
    }

    const plantilla = DriveApp.getFileById(plantillaId);
    const nombreContrato = `Contrato_${nombreTipoContrato}_${datos.propietario.nombre}_${datos.idRegistro}`;

    // Crear copia del documento en la carpeta destino
    const copiaContrato = plantilla.makeCopy(nombreContrato, carpetaContratoDestino);
    const docId = copiaContrato.getId();
    const doc = DocumentApp.openById(docId);
    
    // Reemplazar variables en el contrato
    reemplazarVariablesContrato(doc, datos);
    doc.saveAndClose();

    // Obtener URL del documento
    const urlContrato = doc.getUrl();

    // Registrar en log
    registrarGeneracionContrato(cdr, docId, urlContrato);
    actualizarEstadoContrato(cdr, 'CONTRATO GENERADO', `✅ Borrador generado (${nombreTipoContrato}). ID: ${docId}`);

    console.log(`Borrador generado exitosamente. ID: ${docId}`);

    return {
      success: true,
      docId: docId,
      url: urlContrato,
      urlPdf: null,
      carpeta: carpetaContratoDestino.getUrl(),
      datos: datos,
      message: 'Borrador generado exitosamente'
    };

  } catch (error) {
    console.error('Error generando contrato:', error);
    Logger.log(`Error en generarContrato: ${error.toString()}`);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Enviar el borrador del contrato a revisión (Inquilino, Propietario, Codeudores)
 */
function enviarBorradorAValidar(cdr, comentario_admin) {
  try {
    const datosResult = recopilarDatosContrato(cdr);
    if (!datosResult.success) throw new Error(datosResult.error);
    const datos = datosResult.data;

    // Actualizar estado a EN REVISION
    actualizarEstadoContrato(cdr, 'CONTRATO EN REVISION', '📧 Enviado a las partes para revisión y aprobación.');

    const docResult = buscarContratoGenerado(cdr);
    const docId = docResult ? docResult.id : null;
    let urlContrato = docId ? `https://docs.google.com/document/d/${docId}/edit` : '';

    const idURL = datos.idRegistro || cdr; // Usar ID DE REGISTRO si existe, sino fallback al cdr
    const cdrEncoded = encodeURIComponent(idURL).replace(/\(/g, '%28').replace(/\)/g, '%29');
    const urlBaseValidacion = `${CONTRATO_CONFIG.BASE_URL}/validador-de-contratos.html?cdr=${cdrEncoded}`;
    
    // Inquilino
    if (datos.inquilino && datos.inquilino.email) {
      const urlAprobacion = `${urlBaseValidacion}&rol=inquilino`;
      enviarEmailRevisionInquilino(datos.inquilino.email, datos.inquilino.nombre, idURL, urlContrato, urlAprobacion);
    }
    
    // Propietario
    if (datos.propietario && datos.propietario.email) {
      const urlAprobacion = `${urlBaseValidacion}&rol=propietario`;
      enviarEmailRevisionPropietario(datos.propietario.email, datos.propietario.nombre, idURL, urlContrato, urlAprobacion);
    }
    
    // Codeudores
    if (datos.codeudores && datos.codeudores.length > 0) {
      datos.codeudores.forEach((codeudor, index) => {
        if (codeudor.email) {
          const urlAprobacion = `${urlBaseValidacion}&rol=codeudor&idx=${index}`;
          enviarEmailRevisionCodeudor(codeudor.email, codeudor.nombre, idURL, urlContrato, urlAprobacion);
        }
      });
    }

    // REGISTRAR LA NUEVA VERSIÓN EN EL HISTORIAL
    const mensajeAdmin = comentario_admin || 'Nueva versión generada y enviada a revisión';
    registrarAprobacionContrato(cdr, 'ADMIN', 'ENVIADO', mensajeAdmin);

    return { success: true, message: 'Enviado a revisión correctamente' };
  } catch (e) {
    Logger.log('Error enviando contrato a revisión: ' + e);
    return { success: false, message: e.toString() };
  }
}

/**
 * Función auxiliar para buscar la carpeta donde guardar el contrato
 * ESTRATEGIA: Buscar carpeta raíz del inmueble por CDR -> Buscar subcarpeta de Contratos
 */
function buscarCarpetaContratoDinamica(datos) {
  try {
    const cdr = datos.cdr;
    const tipoNegocio = datos.tipoNegocio;
    console.log(`Buscando carpeta dinámica para CDR: ${cdr}, Tipo: ${tipoNegocio}`);

    if (!CONTRATO_CONFIG.INMUEBLES_ROOT_ID) throw new Error("INMUEBLES_ROOT_ID está vacío o indefinido");

    // 1. Obtener carpeta raíz de INMUEBLES
    const rootFolder = DriveApp.getFolderById(CONTRATO_CONFIG.INMUEBLES_ROOT_ID);

    // 2. Buscar carpeta del inmueble que empiece con el CDR
    // Formato esperado: "CDR - DIRECCION - BARRIO" o dentro de subcarpetas de Tipo Negocio
    // Vamos a buscar en todos los lugares posibles como hace el inquilino
    let inmuebleFolder = null;
    
    // Primero, búsqueda directa en raíz
    const directFolders = rootFolder.getFoldersByName(cdr);
    if (directFolders.hasNext()) inmuebleFolder = directFolders.next();

    // Segundo, buscar dentro de las subcarpetas (TIPO_NEGOCIO)
    if (!inmuebleFolder) {
      const tipoFolders = rootFolder.getFolders();
      while (tipoFolders.hasNext() && !inmuebleFolder) {
        const tipoF = tipoFolders.next();
        const sub = tipoF.getFoldersByName(cdr);
        if (sub.hasNext()) {
          inmuebleFolder = sub.next();
        }
      }
    }

    // Tercero, Fallback global en Drive
    if (!inmuebleFolder) {
      const cdrEscaped = cdr.replace(/'/g, "\\'");
      const globalSearch = DriveApp.searchFolders(`title = '${cdrEscaped}' and trashed = false`);
      if (globalSearch.hasNext()) inmuebleFolder = globalSearch.next();
    }

    if (!inmuebleFolder) {
      throw new Error(`No se encontró la carpeta del inmueble para CDR: ${cdr} en Drive.`);
    }

    // 3. Buscar "ENTREGAS DEL INMUEBLE"
    let entregasFolder = getFolderByName(inmuebleFolder, 'ENTREGAS DEL INMUEBLE');

    if (!entregasFolder) {
      console.warn('No se encontró "ENTREGAS DEL INMUEBLE", buscandoFallback...');
      entregasFolder = inmuebleFolder;
    }

    // 4. Buscar Subcarpeta de Año (ej: 2024, 2026) u otra directa
    // Si ENTREGAS DEL INMUEBLE tiene carpetas adentro, entramos
    let yearFolder = entregasFolder;
    const yearSubFolders = entregasFolder.getFolders();
    if (yearSubFolders.hasNext() && entregasFolder.getName() === 'ENTREGAS DEL INMUEBLE') {
      // Tomar la primera carpeta de año que encontremos (normalmente solo hay 1)
      yearFolder = yearSubFolders.next();
    }

    // 5. Buscar "DOCUMENTOS DE ENTREGA - INQUILINO"
    let docEntregaFolder = getFolderByName(yearFolder, 'DOCUMENTOS DE ENTREGA - INQUILINO');
    if (!docEntregaFolder) {
       console.log('No se encontró "DOCUMENTOS DE ENTREGA - INQUILINO", se usará la carpeta padre.');
       docEntregaFolder = yearFolder;
    }

    // 6. Buscar o crear carpeta específica de Contratos dentro de DOC ENTREGA
    // Por jerarquía estricta debe ser: "2- CONTRATO DE ARRENDAMIENTO"
    let targetFolderName = '2- CONTRATO DE ARRENDAMIENTO';
    if (tipoNegocio === 'Corretaje') {
      targetFolderName = '2- CONTRATO DE CORRETAJE';
    } else if (tipoNegocio === 'Venta') {
      targetFolderName = '2- PROMESA DE COMPRAVENTA'; 
    }

    let contratoFolder = getFolderByName(docEntregaFolder, targetFolderName) || getFolderByName(docEntregaFolder, '2- CONTRATO DE ARRENDAMIENTO');

    if (!contratoFolder) {
      console.log(`Carpeta "${targetFolderName}" no encontrada. Creándola en ${docEntregaFolder.getName()}...`);
      contratoFolder = docEntregaFolder.createFolder(targetFolderName);
    }

    return contratoFolder;

  } catch (e) {
    console.error(`Error crítico buscando carpeta dinámica: ${e.toString()}`);
    
    // Intentar fallback 1: Carpeta Contratos
    if (CONTRATO_CONFIG.CARPETA_CONTRATOS_ID) {
      try {
        return DriveApp.getFolderById(CONTRATO_CONFIG.CARPETA_CONTRATOS_ID);
      } catch (errFallback1) {
        console.error("Fallo al acceder a CARPETA_CONTRATOS_ID: " + errFallback1.toString());
      }
    }
    
    // Intentar fallback 2: Carpeta Raíz de Inmuebles
    if (CONTRATO_CONFIG.INMUEBLES_ROOT_ID) {
      try {
        return DriveApp.getFolderById(CONTRATO_CONFIG.INMUEBLES_ROOT_ID);
      } catch (errFallback2) {
        console.error("Fallo al acceder a INMUEBLES_ROOT_ID: " + errFallback2.toString());
      }
    }
    
    // Fallback absoluto: Raíz de Drive del usuario
    return DriveApp.getRootFolder();
  }
}

// Helper local si no está disponible el global
function getFolderByName(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

/**
 * Recopilar todos los datos necesarios para el contrato
 */
function recopilarDatosContrato(cdr) {
  try {
    console.log(`Recopilando datos para CDR: ${cdr}`);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_PRINCIPAL);
    const lastRow = sheet.getLastRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Buscar la fila del CDR o del ID
    let filaEncontrada = null;
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO') + 1;
    const idCol = headers.indexOf('ID DE REGISTRO') + 1;

    const cdrClean = String(cdr).trim();

    for (let i = 2; i <= lastRow; i++) {
      const valorCDR = String(sheet.getRange(i, cdrCol).getValue()).trim();
      const valorID = idCol > 0 ? String(sheet.getRange(i, idCol).getValue()).trim() : null;
      if (valorCDR === cdrClean || valorID === cdrClean) {
        filaEncontrada = i;
        break;
      }
    }

    if (!filaEncontrada) {
      throw new Error(`No se encontro el contrato con CDR o ID: ${cdr}`);
    }

    // Usaremos el verdadero CDR de la fila por si nos pasaron el ID
    const verdaderoCDR = sheet.getRange(filaEncontrada, cdrCol).getValue();

    // Obtener todos los datos de la fila
    const rowData = sheet.getRange(filaEncontrada, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Funcion auxiliar para obtener valor por nombre de columna
    const obtenerValor = (nombreColumna) => {
      const index = headers.indexOf(nombreColumna);
      return index >= 0 ? rowData[index] : '';
    };

    // Función auxiliar para extraer datos del Cerebro (Documento Google)
    let datosCerebro = null;
    try {
      if (typeof abrirDocCerebro === 'function') {
        const doc = abrirDocCerebro(verdaderoCDR);
        if (doc) {
          datosCerebro = doc.getBody().getText();
        }
      } else {
        console.error("abrirDocCerebro no está definida.");
      }
    } catch (e) {
      console.error("No se pudo leer el Cerebro para el CDR " + verdaderoCDR, e);
    }

    const extraerCampoCerebro = (bloque, etiqueta) => {
      if (!bloque) return '';
      // Escapa caracteres especiales en la etiqueta si los hay
      const safeEtiqueta = etiqueta.replace(/([()[{*+.$^\\|?])/g, '\\$1');
      const regex = new RegExp(safeEtiqueta + '\\s*(.+)');
      const match = bloque.match(regex);
      return match ? match[1].trim() : '';
    };

    let inquilinoText = datosCerebro ? datosCerebro.split('DATOS DEL PROPIETARIO:')[0] : '';
    let propietarioText = (datosCerebro && datosCerebro.includes('DATOS DEL PROPIETARIO:')) ? datosCerebro.split('DATOS DEL PROPIETARIO:')[1] : '';

    // Recopilar datos del inquilino (Prioridad: Cerebro > Hoja)
    const inquilino = {
      nombre: extraerCampoCerebro(inquilinoText, 'NOMBRES::') || obtenerValor('NOMBRE COMPLETO INQUILINO'),
      tipoDocumento: extraerCampoCerebro(inquilinoText, 'TIPO DE IDENTIFICACIÓN::') || obtenerValor('TIPO DOCUMENTO INQUILINO'),
      numeroDocumento: extraerCampoCerebro(inquilinoText, 'NÚMERO DE IDENTIFICACIÓN::') || obtenerValor('NUMERO DOCUMENTO INQUILINO'),
      celular: extraerCampoCerebro(inquilinoText, 'CELULAR::') || obtenerValor('CELULAR INQUILINO'),
      email: extraerCampoCerebro(inquilinoText, 'CORREO::') || obtenerValor('CORREO INQUILINO'),
      ocupacion: obtenerValor('OCUPACION INQUILINO')
    };

    // Recopilar datos del propietario (Prioridad: Cerebro > Hoja)
    const propietario = {
      nombre: extraerCampoCerebro(propietarioText, 'NOMBRES::') || obtenerValor('Ingrese Nombres y Apellidos'),
      tipoDocumento: extraerCampoCerebro(propietarioText, 'TIPO DE IDENTIFICACIÓN::') || obtenerValor('TIPO DOCUMENTO PROPIETARIO'),
      numeroDocumento: extraerCampoCerebro(propietarioText, 'NÚMERO DE IDENTIFICACIÓN::') || obtenerValor('Numero de documento'),
      celular: extraerCampoCerebro(propietarioText, 'CELULAR::') || obtenerValor('Celular'),
      email: extraerCampoCerebro(propietarioText, 'CORREO::') || obtenerValor('Correo electronico'),
      direccion: obtenerValor('Direccion de residencia'),
      banco: extraerCampoCerebro(propietarioText, 'BANCO::') || obtenerValor('Banco'),
      tipoCuenta: extraerCampoCerebro(propietarioText, 'TIPO DE CUENTA::') || obtenerValor('Tipo de cuenta'),
      numeroCuenta: extraerCampoCerebro(propietarioText, 'NÚMERO DE CUENTA::') || extraerCampoCerebro(propietarioText, 'NUMERO DE CUENTA::') || obtenerValor('Numero de cuenta'),
      titularCuenta: extraerCampoCerebro(propietarioText, 'TITULAR::'),
      docTitularCuenta: extraerCampoCerebro(propietarioText, 'DOC TITULAR::')
    };

    // Recopilar datos del inmueble
    const inmueble = {
      direccion: extraerCampoCerebro(datosCerebro, 'DIRECCION_INMUEBLE::') || obtenerValor('Ingrese la Dirección del inmueble') || obtenerValor('Direccion del inmueble'),
      matricula: extraerCampoCerebro(datosCerebro, 'MATRICULA_INMOBILIARIA::') || obtenerValor('MATRICULA_INMOBILIARIA'),
      chip: obtenerValor('Chip'),
      estrato: obtenerValor('Estrato'),
      barrio: obtenerValor('Barrio'),
      ciudad: extraerCampoCerebro(datosCerebro, 'CIUDAD_INMUEBLE::') || obtenerValor('Ciudad'),
      tipoInmueble: obtenerValor('Tipo de inmueble'),
      area: obtenerValor('AREA_M2'),
      habitaciones: obtenerValor('No. de habitaciones'),
      banos: obtenerValor('No. de banos'),
      garajes: obtenerValor('PARQUEADEROS INMUEBLE'),
      depositos: obtenerValor('Deposito'),
      administracion: obtenerValor('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)')
    };

    // Recopilar datos del contrato
    const contrato = {
      canon: obtenerValor('PRECIO DE PROMOCION GENERAL'),
      fechaInicio: obtenerValor('FECHA INICIO DEL CONTRATO'),
      fechaFinal: obtenerValor('FECHA FINAL DEL CONTRATO'),
      duracion: '12 meses', // Por defecto; se podría calcular entre fechaInicio y fechaFinal si fuera necesario
      incremento: obtenerValor('Incremento anual') || 'IPC',
      destinacion: 'Vivienda urbana'
    };

    // Recopilar codeudores
    let codeudores = [];
    const codeudoresJSON = obtenerValor('CODEUDORES_JSON');
    if (codeudoresJSON) {
      try {
        codeudores = JSON.parse(codeudoresJSON);
      } catch (e) {
        console.log('Error parseando codeudores:', e);
      }
    }
    
    // Si no hay codeudores en la hoja, intentar extraerlos directamente del Cerebro
    if (codeudores.length === 0 && datosCerebro) {
      const codeudoresLoc = datosCerebro.indexOf('CODEUDORES:');
      if (codeudoresLoc !== -1) {
        const codesStr = datosCerebro.substring(codeudoresLoc);
        const blocks = codesStr.split(/\[CODEUDOR \d+\]/);
        for (let i = 1; i < blocks.length; i++) {
          const block = blocks[i];
          const matchName = block.match(/NOMBRES::\s*(.+)/);
          const matchType = block.match(/TIPO DE IDENTIFICACIÓN::\s*(.+)/);
          const matchDoc = block.match(/NÚMERO DE IDENTIFICACIÓN::\s*(.+)/);
          const matchPhone = block.match(/CELULAR::\s*(.+)/);
          const matchEmail = block.match(/CORREO::\s*(.+)/);
          
          if (matchName || matchDoc) {
            codeudores.push({
              nombre: matchName ? matchName[1].trim() : '',
              tipoDocumento: matchType ? matchType[1].trim() : '',
              documento: matchDoc ? matchDoc[1].trim() : '',
              celular: matchPhone ? matchPhone[1].trim() : '',
              email: matchEmail ? matchEmail[1].trim() : ''
            });
          }
        }
      }
    }

    // Verificar datos minimos requeridos
    if (!inquilino.nombre || !propietario.nombre || !inmueble.direccion) {
      throw new Error('Faltan datos esenciales para generar el contrato');
    }

    const datosCompletos = {
      cdr: cdr,
      idRegistro: obtenerValor('ID DE REGISTRO') || cdr,
      estado: obtenerValor('ESTADO DEL INMUEBLE'),
      fechaGeneracion: new Date().toISOString(),
      inquilino: inquilino,
      propietario: propietario,
      inmueble: inmueble,
      contrato: contrato,
      codeudores: codeudores
    };

    // === BUSCAR DOCUMENTOS DE RESPALDO ===
    const documentosUI = { propietario: [], inquilino: [], codeudores: [], otros: [] };
    try {
      const cdrClean = cdr.replace(/'/g, "\\'");
      // Buscar archivos que contengan el CDR, ignorando carpetas y docs del borrador
      const fileSearch = DriveApp.searchFiles(`title contains '${cdrClean}' and trashed = false`);
      while (fileSearch.hasNext()) {
        const file = fileSearch.next();
        const name = file.getName().toUpperCase();
        const url = file.getUrl();
        const mimeType = file.getMimeType();
        
        if (mimeType === MimeType.FOLDER || name.includes('DATOS DE ELABORACION') || name.includes('BORRADOR')) continue;
        
        const docObj = { nombre: file.getName(), url: url };
        
        if (name.includes('PROP') || name.includes('TRADICION') || name.includes('BANCARIO') || name.includes('RUT') || name.includes('RPR')) {
          documentosUI.propietario.push(docObj);
        } else if (name.includes('INQU')) {
          documentosUI.inquilino.push(docObj);
        } else if (name.includes('COD')) {
          documentosUI.codeudores.push(docObj);
        } else {
          documentosUI.otros.push(docObj);
        }
      }
      datosCompletos.documentosRelacionados = documentosUI;
    } catch(errDoc) {
      console.log("Error buscando documentos relacionados:", errDoc);
    }

    console.log('Datos recopilados exitosamente');

    return {
      success: true,
      data: JSON.parse(JSON.stringify(datosCompletos))
    };

  } catch (error) {
    console.error('Error recopilando datos:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Reemplazar variables en el documento del contrato
 */
function reemplazarVariablesContrato(doc, datos) {
  try {
    const body = doc.getBody();
    const header = doc.getHeader();
    const footer = doc.getFooter();
    
    const replaceInAll = (search, replace) => {
      try { body.replaceText(search, replace); } catch(e) {}
      try { if (header) header.replaceText(search, replace); } catch(e) { console.log('Error reemplazando en header:', e); }
      try { if (footer) footer.replaceText(search, replace); } catch(e) { console.log('Error reemplazando en footer:', e); }
      
      // Intentar también en headers/footers de primera página si existen
      try {
        const firstPageHeader = doc.getHeader(); // Aunque getHeader da el por defecto, dejamos un try para el futuro
      } catch(e) {}
    };

    // Formatear fecha actual
    const fechaHoy = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const diaActual = fechaHoy.getDate();
    const mesActual = meses[fechaHoy.getMonth()];
    const anoActual = fechaHoy.getFullYear();

    // Formatear fecha de inicio
    let fechaInicioFormateada = datos.contrato.fechaInicio;
    let fechaFinalFormateada = datos.contrato.fechaFinal || '';
    
    if (datos.contrato.fechaInicio) {
      // Intentar parsear la fecha de inicio
      // La fecha del sheet puede venir como objeto Date o como string YYYY-MM-DD
      let fechaInicio;
      if (datos.contrato.fechaInicio instanceof Date) {
        fechaInicio = datos.contrato.fechaInicio;
      } else {
        // Asumiendo formato YYYY-MM-DD si es string, añadimos T12:00:00 para evitar desface horario
        fechaInicio = new Date(datos.contrato.fechaInicio.toString().includes('T') ? datos.contrato.fechaInicio : datos.contrato.fechaInicio + 'T12:00:00');
      }
      
      if (!isNaN(fechaInicio.getTime())) {
        const diaInicio = fechaInicio.getDate();
        const mesInicio = meses[fechaInicio.getMonth()];
        const anoInicio = fechaInicio.getFullYear();
        fechaInicioFormateada = `${diaInicio} de ${mesInicio} de ${anoInicio}`;
        
        // Calcular fecha final (sumar 12 meses menos 1 día)
        const fechaFinal = new Date(fechaInicio.getTime());
        fechaFinal.setFullYear(fechaFinal.getFullYear() + 1);
        fechaFinal.setDate(fechaFinal.getDate() - 1);
        
        const diaFinal = fechaFinal.getDate();
        const mesFinal = meses[fechaFinal.getMonth()];
        const anoFinal = fechaFinal.getFullYear();
        fechaFinalFormateada = `${diaFinal} de ${mesFinal} de ${anoFinal}`;
      }
    }

    // Formatear canon en texto
    const canonNumero = parseFloat(String(datos.contrato.canon).replace(/[^\d]/g, ''));
    const canonTexto = numeroALetras(canonNumero);

    // Mapa de reemplazos
    const reemplazos = {
      // Datos del contrato
      '{{CDR}}': datos.idRegistro || datos.cdr || '',
      '{{numero-de-solicitud-del-aprobado}}': datos.cdr || '',
      '{{FECHA_HOY}}': `${diaActual} de ${mesActual} de ${anoActual}`,
      '{{DIA_ACTUAL}}': diaActual,
      '{{DIA-VIGENTE}}': diaActual,
      '{{MES_ACTUAL}}': mesActual,
      '{{MES-VIGENTE}}': mesActual,
      '{{ANO_ACTUAL}}': anoActual,
      '{{AÑO-VIGENTE}}': anoActual,
      '{{AÑO VIGENTE}}': anoActual,
      '{{últimos dos digitos del año vigente}}': anoActual.toString().slice(-2),

      // Datos del propietario
      '{{NOMBRE_PROPIETARIO}}': datos.propietario.nombre || '',
      '{{NOMBRE-PROPIETARIO}}': datos.propietario.nombre || '',
      '{{TIPO_DOC_PROPIETARIO}}': datos.propietario.tipoDocumento || 'CC',
      '{{DOCUMENTO_PROPIETARIO}}': datos.propietario.numeroDocumento || '',
      '{{NUMERO-DE-DOCUMENTO-PROPIETARIO}}': datos.propietario.numeroDocumento || '',
      '{{DIRECCION_PROPIETARIO}}': datos.propietario.direccion || '',
      '{{CELULAR_PROPIETARIO}}': datos.propietario.celular || '',
      '{{CELULAR-PROPIETARIO}}': datos.propietario.celular || '',
      '{{EMAIL_PROPIETARIO}}': datos.propietario.email || '',
      '{{CORREO-PROPIETARIO}}': datos.propietario.email || '',
      '{{BANCO_PROPIETARIO}}': datos.propietario.banco || '',
      '{{NOMBRE-DEL-BANCO}}': datos.propietario.banco || '',
      '{{TIPO_CUENTA_PROPIETARIO}}': datos.propietario.tipoCuenta || '',
      '{{TIPO-DE-CUENTA-BANCARIA}}': datos.propietario.tipoCuenta || '',
      '{{NUMERO_CUENTA_PROPIETARIO}}': datos.propietario.numeroCuenta || '',
      '{{NUMERO-DE-CUENTA-BANCARIA}}': datos.propietario.numeroCuenta || '',
      '{{NOMBRE-DEL-DUEÑO-DE-LA-CUENTA-BANCARIA}}': datos.propietario.titularCuenta || datos.propietario.nombre || '',
      '{{NUMERO-DE-DOCUMENTO-DEL-DUEÑO-DE LA CUENTA}}': datos.propietario.docTitularCuenta || datos.propietario.numeroDocumento || '',
      '{{NUMERO-DE-DOCUMENTO-DEL-DUEÑO-DE-LA-CUENTA}}': datos.propietario.docTitularCuenta || datos.propietario.numeroDocumento || '',

      // Datos del inquilino
      '{{NOMBRE_INQUILINO}}': datos.inquilino.nombre || '',
      '{{NOMBRE-INQUILINO}}': datos.inquilino.nombre || '',
      '{{TIPO_DOC_INQUILINO}}': datos.inquilino.tipoDocumento || 'CC',
      '{{DOCUMENTO_INQUILINO}}': datos.inquilino.numeroDocumento || '',
      '{{NUMERO-DE-DOCUMENTO-INQUILINO}}': datos.inquilino.numeroDocumento || '',
      '{{CELULAR_INQUILINO}}': datos.inquilino.celular || '',
      '{{CELULAR-INQUILINO}}': datos.inquilino.celular || '',
      '{{EMAIL_INQUILINO}}': datos.inquilino.email || '',
      '{{CORREO-INQUILINO}}': datos.inquilino.email || '',
      '{{OCUPACION_INQUILINO}}': datos.inquilino.ocupacion || '',

      // Datos del inmueble
      '{{DIRECCION_INMUEBLE}}': datos.inmueble.direccion || '',
      '{{DIRECCION-DEL-INMUEBLE-DEL-FOLIO-DE-MATRICULA}}': datos.inmueble.direccion || '',
      '{{MATRICULA_INMUEBLE}}': datos.inmueble.matricula || '',
      '{{NUMERO-DE-MATRICULA}}': datos.inmueble.matricula || '',
      '{{CHIP_INMUEBLE}}': datos.inmueble.chip || '',
      '{{ESTRATO_INMUEBLE}}': datos.inmueble.estrato || '',
      '{{BARRIO_INMUEBLE}}': datos.inmueble.barrio || '',
      '{{ejemplo:USAQUEN}}': datos.inmueble.barrio || '',
      '{{CIUDAD_INMUEBLE}}': datos.inmueble.ciudad || 'Bogotá D.C.',
      '{{ejemplo:BOGOTA-D.C.}}': datos.inmueble.ciudad || 'Bogotá D.C.',
      '{{OFICINA-DE-REGISTRO-PUBLICO}}': datos.inmueble.ciudad || 'Bogotá D.C.',
      '{{TIPO_INMUEBLE}}': datos.inmueble.tipoInmueble || 'Apartamento',
      '{{AREA_INMUEBLE}}': datos.inmueble.area || '',
      '{{HABITACIONES}}': datos.inmueble.habitaciones || '',
      '{{BANOS}}': datos.inmueble.banos || '',
      '{{GARAJES}}': datos.inmueble.garajes || '0',
      '{{DEPOSITOS}}': datos.inmueble.depositos || '0',
      '{{ADMINISTRACION}}': formatearMoneda(datos.inmueble.administracion) || '$0',
      '{{PRECIO-DE-ADMIN-EN-NUMERO}}': formatearMoneda(datos.inmueble.administracion) || '$0',

      // Datos economicos del contrato
      '{{CANON_NUMERO}}': formatearMoneda(datos.contrato.canon),
      '{{PRECIO-DEL-CANON-EN-NUMERO}}': formatearMoneda(datos.contrato.canon),
      '{{CANON_LETRAS}}': canonTexto,
      '{{FECHA_INICIO}}': fechaInicioFormateada,
      '{{fecha de inicio de contrato}}': fechaInicioFormateada,
      '{{fecha-de-inicio-de-contrato}}': fechaInicioFormateada,
      '{{FECHA_FINAL}}': fechaFinalFormateada,
      '{{fecha final del contrato}}': fechaFinalFormateada,
      '{{LISTA-NOMBRES-CODEUDORES}}': (datos.codeudores || []).map(c => `${c.nombre || ''} - C.C. ${c.documento || ''}`).join('\n').trim(),
      '{{LISTA-FIRMAS-CODEUDORES}}': (datos.codeudores || []).map(c => `NOMBRE: ${c.nombre || ''}\nC.C. No. ${c.documento || ''}\nDirección de Notificaciones ___________________\n\nTeléfono: ${c.celular || ''}\nCorreo Electrónico: ${c.email || ''}`).join('\n\n\n'),
      '{{DURACION_CONTRATO}}': datos.contrato.duracion || '12 meses',
      '{{numero-de-meses-del-contrato-en-numero}}': '12',
      '{{numero-de-meses-del-contrato-en-letra}}': 'DOCE',
      '{{INCREMENTO_ANUAL}}': datos.contrato.incremento || 'IPC',
      '{{DESTINACION}}': datos.contrato.destinacion || 'Vivienda urbana',
      
      // Servicios Públicos genéricos en la plantilla
      '{{Acueducto}}': 'Acueducto',
      '{{gas}}': 'Gas',
      '{{Energía Eléctrica}}': 'Energía Eléctrica',
      '{{telefono}}': 'Teléfono',
      '{{caldera}}': 'Caldera'
    };

    // Realizar reemplazos
    for (const [variable, valor] of Object.entries(reemplazos)) {
      replaceInAll(variable, valor);
    }

    // Manejar codeudores
    if (datos.codeudores && datos.codeudores.length > 0) {
      // Reemplazar datos del primer codeudor
      if (datos.codeudores[0]) {
        replaceInAll('{{NOMBRE_CODEUDOR1}}', datos.codeudores[0].nombre || '');
        replaceInAll('{{NOMBRE-CODEUDOR}}', datos.codeudores[0].nombre || '');
        replaceInAll('{{DOCUMENTO_CODEUDOR1}}', datos.codeudores[0].documento || '');
        replaceInAll('{{NUMERO-DE-DOCUMENTO-CODEUDOR}}', datos.codeudores[0].documento || '');
        replaceInAll('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR}}', 'Colombia');
        replaceInAll('{{CELULAR_CODEUDOR1}}', datos.codeudores[0].celular || '');
        replaceInAll('{{CELULAR-CODEUDOR}}', datos.codeudores[0].celular || '');
        replaceInAll('{{EMAIL_CODEUDOR1}}', datos.codeudores[0].email || '');
        replaceInAll('{{CORREO-CODEUDOR}}', datos.codeudores[0].email || '');
        const parrafoC1 = `${datos.codeudores[0].nombre || ''} con C.C. N° ${datos.codeudores[0].documento || ''} de Colombia`;
        replaceInAll('{{PARRAFO-CODEUDOR-1}}', parrafoC1);
        
        // Nuevas etiquetas
        replaceInAll('{{NOMBRE-CODEUDOR-1}}', datos.codeudores[0].nombre || '');
        replaceInAll('{{NUMERO-DOCUMENTO-CODEUDOR-1}}', datos.codeudores[0].documento || '');
        replaceInAll('{{CELULAR-CODEUDOR-1}}', datos.codeudores[0].celular || '');
        replaceInAll('{{CORREO-CODEUDOR-1}}', datos.codeudores[0].email || '');
        
        const firmaC1 = `NOMBRE:${datos.codeudores[0].nombre || ''}\nC.C. No. ${datos.codeudores[0].documento || ''}\nDirección de Notificaciones ___________________\n\nTeléfono:${datos.codeudores[0].celular || ''}\nCorreo Electrónico: ${datos.codeudores[0].email || ''}\n`;
        replaceInAll('{{FIRMA-CODEUDOR-1}}', firmaC1);
      }

      // Reemplazar datos del segundo codeudor si existe
      if (datos.codeudores[1]) {
        replaceInAll('{{NOMBRE_CODEUDOR2}}', datos.codeudores[1].nombre || '');
        replaceInAll('{{NOMBRE-CODEUDOR 2}}', datos.codeudores[1].nombre || '');
        replaceInAll('{{DOCUMENTO_CODEUDOR2}}', datos.codeudores[1].documento || '');
        replaceInAll('{{NUMERO-DE-DOCUMENTO-CODEUDOR-2}}', datos.codeudores[1].documento || '');
        replaceInAll('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-2}}', 'Colombia');
        replaceInAll('{{CELULAR_CODEUDOR2}}', datos.codeudores[1].celular || '');
        replaceInAll('{{CELULAR-CODEUDOR-2}}', datos.codeudores[1].celular || '');
        replaceInAll('{{EMAIL_CODEUDOR2}}', datos.codeudores[1].email || '');
        replaceInAll('{{CORREO-CODEUDOR-2}}', datos.codeudores[1].email || '');
        const parrafoC2 = `${datos.codeudores[1].nombre || ''} con C.C. N° ${datos.codeudores[1].documento || ''} de Colombia`;
        replaceInAll('{{PARRAFO-CODEUDOR-2}}', parrafoC2);
        
        // Nuevas etiquetas
        replaceInAll('{{NOMBRE-CODEUDOR-2}}', datos.codeudores[1].nombre || '');
        replaceInAll('{{NUMERO-DOCUMENTO-CODEUDOR-2}}', datos.codeudores[1].documento || '');
        
        const firmaC2 = `NOMBRE:${datos.codeudores[1].nombre || ''}\nC.C. No. ${datos.codeudores[1].documento || ''}\nDirección de Notificaciones ___________________\n\nTeléfono:${datos.codeudores[1].celular || ''}\nCorreo Electrónico: ${datos.codeudores[1].email || ''}\n`;
        replaceInAll('{{FIRMA-CODEUDOR-2}}', firmaC2);
      } else {
        // Limpiar variables del segundo codeudor
        replaceInAll('{{NOMBRE_CODEUDOR2}}', 'N/A');
        replaceInAll('{{NOMBRE-CODEUDOR 2}}', 'N/A');
        replaceInAll('{{DOCUMENTO_CODEUDOR2}}', 'N/A');
        replaceInAll('{{NUMERO-DE-DOCUMENTO-CODEUDOR-2}}', 'N/A');
        replaceInAll('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-2}}', 'N/A');
        replaceInAll('{{CELULAR_CODEUDOR2}}', 'N/A');
        replaceInAll('{{CELULAR-CODEUDOR-2}}', 'N/A');
        replaceInAll('{{EMAIL_CODEUDOR2}}', 'N/A');
        replaceInAll('{{CORREO-CODEUDOR-2}}', 'N/A');
        replaceInAll('{{PARRAFO-CODEUDOR-2}}', '');
        
        // Nuevas etiquetas
        replaceInAll('{{NOMBRE-CODEUDOR-2}}', '');
        replaceInAll('{{NUMERO-DOCUMENTO-CODEUDOR-2}}', '');
        replaceInAll('{{FIRMA-CODEUDOR-2}}', '');
      }

      // Reemplazar datos del tercer codeudor si existe
      if (datos.codeudores[2]) {
        replaceInAll('{{NOMBRE_CODEUDOR3}}', datos.codeudores[2].nombre || '');
        replaceInAll('{{NOMBRE-CODEUDOR 3}}', datos.codeudores[2].nombre || '');
        replaceInAll('{{DOCUMENTO_CODEUDOR3}}', datos.codeudores[2].documento || '');
        replaceInAll('{{NUMERO-DE-DOCUMENTO-CODEUDOR-3}}', datos.codeudores[2].documento || '');
        replaceInAll('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-3}}', 'Colombia');
        replaceInAll('{{CELULAR_CODEUDOR3}}', datos.codeudores[2].celular || '');
        replaceInAll('{{CELULAR-CODEUDOR-3}}', datos.codeudores[2].celular || '');
        replaceInAll('{{EMAIL_CODEUDOR3}}', datos.codeudores[2].email || '');
        replaceInAll('{{CORREO-CODEUDOR-3}}', datos.codeudores[2].email || '');
        const parrafoC3 = `${datos.codeudores[2].nombre || ''} con C.C. N° ${datos.codeudores[2].documento || ''} de Colombia`;
        replaceInAll('{{PARRAFO-CODEUDOR-3}}', parrafoC3);
        
        // Nuevas etiquetas
        replaceInAll('{{NOMBRE-CODEUDOR-3}}', datos.codeudores[2].nombre || '');
        replaceInAll('{{NUMERO-DOCUMENTO-CODEUDOR-3}}', datos.codeudores[2].documento || '');
        
        const firmaC3 = `NOMBRE:${datos.codeudores[2].nombre || ''}\nC.C. No. ${datos.codeudores[2].documento || ''}\nDirección de Notificaciones ___________________\n\nTeléfono:${datos.codeudores[2].celular || ''}\nCorreo Electrónico: ${datos.codeudores[2].email || ''}\n`;
        replaceInAll('{{FIRMA-CODEUDOR-3}}', firmaC3);
      } else {
        // Limpiar variables del tercer codeudor
        replaceInAll('{{NOMBRE_CODEUDOR3}}', 'N/A');
        replaceInAll('{{NOMBRE-CODEUDOR 3}}', 'N/A');
        replaceInAll('{{DOCUMENTO_CODEUDOR3}}', 'N/A');
        replaceInAll('{{NUMERO-DE-DOCUMENTO-CODEUDOR-3}}', 'N/A');
        replaceInAll('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-3}}', 'N/A');
        replaceInAll('{{CELULAR_CODEUDOR3}}', 'N/A');
        replaceInAll('{{CELULAR-CODEUDOR-3}}', 'N/A');
        replaceInAll('{{EMAIL_CODEUDOR3}}', 'N/A');
        replaceInAll('{{CORREO-CODEUDOR-3}}', 'N/A');
        replaceInAll('{{PARRAFO-CODEUDOR-3}}', '');
        
        // Nuevas etiquetas
        replaceInAll('{{NOMBRE-CODEUDOR-3}}', '');
        replaceInAll('{{NUMERO-DOCUMENTO-CODEUDOR-3}}', '');
        replaceInAll('{{FIRMA-CODEUDOR-3}}', '');
      }
    } else {
      // Si no hay codeudores, limpiar todas las variables
      replaceInAll('{{NOMBRE_CODEUDOR1}}', 'N/A');
      replaceInAll('{{NOMBRE-CODEUDOR}}', 'N/A');
      replaceInAll('{{DOCUMENTO_CODEUDOR1}}', 'N/A');
      replaceInAll('{{NUMERO-DE-DOCUMENTO-CODEUDOR}}', 'N/A');
      replaceInAll('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR}}', 'N/A');
      replaceInAll('{{CELULAR_CODEUDOR1}}', 'N/A');
      replaceInAll('{{CELULAR-CODEUDOR}}', 'N/A');
      replaceInAll('{{EMAIL_CODEUDOR1}}', 'N/A');
      replaceInAll('{{CORREO-CODEUDOR}}', 'N/A');
      replaceInAll('{{NOMBRE_CODEUDOR2}}', 'N/A');
      replaceInAll('{{NOMBRE-CODEUDOR 2}}', 'N/A');
      replaceInAll('{{DOCUMENTO_CODEUDOR2}}', 'N/A');
      replaceInAll('{{NUMERO-DE-DOCUMENTO-CODEUDOR-2}}', 'N/A');
      replaceInAll('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-2}}', 'N/A');
      replaceInAll('{{CELULAR_CODEUDOR2}}', 'N/A');
      replaceInAll('{{CELULAR-CODEUDOR-2}}', 'N/A');
      replaceInAll('{{EMAIL_CODEUDOR2}}', 'N/A');
      replaceInAll('{{CORREO-CODEUDOR-2}}', 'N/A');
      replaceInAll('{{NOMBRE_CODEUDOR3}}', 'N/A');
      replaceInAll('{{NOMBRE-CODEUDOR 3}}', 'N/A');
      replaceInAll('{{DOCUMENTO_CODEUDOR3}}', 'N/A');
      replaceInAll('{{NUMERO-DE-DOCUMENTO-CODEUDOR-3}}', 'N/A');
      replaceInAll('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-3}}', 'N/A');
      replaceInAll('{{CELULAR_CODEUDOR3}}', 'N/A');
      replaceInAll('{{CELULAR-CODEUDOR-3}}', 'N/A');
      replaceInAll('{{EMAIL_CODEUDOR3}}', 'N/A');
      replaceInAll('{{CORREO-CODEUDOR-3}}', 'N/A');
      replaceInAll('{{PARRAFO-CODEUDOR-1}}', '');
      replaceInAll('{{PARRAFO-CODEUDOR-2}}', '');
      replaceInAll('{{PARRAFO-CODEUDOR-3}}', '');
      
      // Nuevas etiquetas
      replaceInAll('{{NOMBRE-CODEUDOR-1}}', '');
      replaceInAll('{{NUMERO-DOCUMENTO-CODEUDOR-1}}', '');
      replaceInAll('{{CELULAR-CODEUDOR-1}}', '');
      replaceInAll('{{CORREO-CODEUDOR-1}}', '');
      replaceInAll('{{NOMBRE-CODEUDOR-2}}', '');
      replaceInAll('{{NUMERO-DOCUMENTO-CODEUDOR-2}}', '');
      replaceInAll('{{NOMBRE-CODEUDOR-3}}', '');
      replaceInAll('{{NUMERO-DOCUMENTO-CODEUDOR-3}}', '');
      replaceInAll('{{FIRMA-CODEUDOR-1}}', '');
      replaceInAll('{{FIRMA-CODEUDOR-2}}', '');
      replaceInAll('{{FIRMA-CODEUDOR-3}}', '');
    }
    
    // Adicionales que están fuera de {{}} o irregulares en tu plantilla:
    
    // Absorber casos dobles de año en la plantilla
    replaceInAll('{{fecha de inicio de contrato}} de 2\\(000\\)', fechaInicioFormateada);
    replaceInAll('{{fecha de inicio de contrato}} de 20\\(00\\)', fechaInicioFormateada);
    
    replaceInAll('\\(fecha de inicio de contrato\\)', fechaInicioFormateada);
    replaceInAll('20\\(00\\)', anoActual.toString());
    replaceInAll('2\\(000\\)', anoActual.toString());
    replaceInAll('\\{\\{20\\(00\\)\\}\\}', anoActual.toString());

    console.log('Variables reemplazadas exitosamente');

  } catch (error) {
    console.error('Error reemplazando variables:', error);
    throw error;
  }
}

/**
 * Enviar contratos para revision a todas las partes
 */
function enviarContratosParaRevision(cdr, docId) {
  try {
    console.log(`Enviando contrato para revision. CDR: ${cdr}, DocID: ${docId}`);

    // Obtener datos del contrato
    const datos = recopilarDatosContrato(cdr);

    if (!datos.success) {
      throw new Error('No se pudieron obtener los datos del contrato');
    }

    const doc = DocumentApp.openById(docId);
    const urlContrato = doc.getUrl();
    const baseUrl = CONTRATO_CONFIG.BASE_URL;
    const idURL = datos.data.idRegistro || cdr;
    const cdrEncoded = encodeURIComponent(idURL).replace(/\(/g, '%28').replace(/\)/g, '%29');

    // Enviar al inquilino
    enviarEmailRevisionInquilino(
      datos.data.inquilino.email,
      datos.data.inquilino.nombre,
      idURL,
      urlContrato,
      `${baseUrl}/validador-de-contratos.html?cdr=${cdrEncoded}&tipo=inquilino&docId=${docId}`
    );

    // Enviar al propietario
    enviarEmailRevisionPropietario(
      datos.data.propietario.email,
      datos.data.propietario.nombre,
      idURL,
      urlContrato,
      `${baseUrl}/validador-de-contratos.html?cdr=${cdrEncoded}&tipo=propietario&docId=${docId}`
    );

    // Enviar a codeudores si existen
    if (datos.data.codeudores && datos.data.codeudores.length > 0) {
      datos.data.codeudores.forEach((codeudor, index) => {
        if (codeudor.email) {
          const cdrEncoded = encodeURIComponent(cdr).replace(/\(/g, '%28').replace(/\)/g, '%29');
          enviarEmailRevisionCodeudor(
            codeudor.email,
            codeudor.nombre,
            idURL,
            urlContrato,
            `${baseUrl}/validador-de-contratos.html?cdr=${cdrEncoded}&tipo=codeudor${index + 1}&docId=${docId}`
          );
        }
      });
    }

    // Actualizar estado
    actualizarEstadoContrato(cdr, 'CONTRATO EN REVISION', '?? Contrato enviado para aprobacion de todas las partes');

    console.log('Emails de revision enviados exitosamente');

    return {
      success: true,
      message: 'Contrato enviado para revision a todas las partes'
    };

  } catch (error) {
    console.error('Error enviando contratos para revision:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// ==========================================
// FUNCIONES DE APROBACION Y REGISTRO
// ==========================================

/**
 * Registrar aprobacion o rechazo del contrato
 */
function registrarAprobacionContrato(cdr, tipo, accion, comentarios) {
  try {
    console.log(`Registrando ${accion} de ${tipo} para CDR: ${cdr}`);

    // Obtener o crear hoja de aprobaciones
    let hojaAprobaciones = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_APROBACIONES);

    if (!hojaAprobaciones) {
      hojaAprobaciones = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONTRATO_CONFIG.HOJA_APROBACIONES);
      // Crear headers
      hojaAprobaciones.getRange(1, 1, 1, 8).setValues([
        ['CDR', 'USUARIO', 'ACCION', 'COMENTARIOS', 'FECHA', 'HORA', 'EMAIL', 'VERSION']
      ]);
      hojaAprobaciones.getRange(1, 1, 1, 7).setFontWeight('bold');
    }

    // Registrar la aprobacion
    const fecha = new Date();
    const fechaFormato = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const horaFormato = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'HH:mm:ss');

    const datos = hojaAprobaciones.getDataRange().getValues();
    
    // Asegurar que exista la cabecera de VERSION y renombrar TIPO a USUARIO si aplica
    if (datos.length > 0) {
      if (datos[0].length < 8 || datos[0][7] !== 'VERSION') {
        hojaAprobaciones.getRange(1, 8).setValue('VERSION');
        hojaAprobaciones.getRange(1, 8).setFontWeight('bold');
      }
      if (datos[0][1] === 'TIPO') {
        hojaAprobaciones.getRange(1, 2).setValue('USUARIO');
      }
    }

    let maxVersion = 1;
    let hasPreviousEnvio = false;
    let foundAny = false;

    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === cdr) {
        foundAny = true;
        let v = parseInt(datos[i][7]);
        if (!isNaN(v) && v > maxVersion) maxVersion = v;
        if (datos[i][1] === 'ADMIN' && datos[i][2] === 'ENVIADO') {
          hasPreviousEnvio = true;
        }
      }
    }

    let version = 1;
    if (tipo === 'ADMIN' && accion === 'ENVIADO') {
      version = hasPreviousEnvio ? maxVersion + 1 : 1;
    } else {
      version = foundAny ? maxVersion : 1;
    }

    hojaAprobaciones.appendRow([
      cdr,
      tipo,
      accion,
      comentarios || '',
      fechaFormato,
      horaFormato,
      Session.getActiveUser().getEmail(),
      version
    ]);

    SpreadsheetApp.flush(); // Asegurar que los datos se escriban antes de responder

    // Verificar si todas las partes han aprobado
    const aprobaciones = verificarAprobacionesCompletas(cdr);

    if (aprobaciones.todasAprobadas && accion === 'APROBADO') {
      // Actualizar estado a CONTRATO APROBADO
      actualizarEstadoContrato(cdr, 'CONTRATO APROBADO', '? Contrato aprobado por todas las partes');

      // Enviar notificacion de contrato aprobado
      enviarNotificacionContratoAprobado(cdr);

      return {
        success: true,
        message: 'Aprobacion registrada. CONTRATO COMPLETAMENTE APROBADO.',
        estadoFinal: 'APROBADO_COMPLETO'
      };
    } else if (accion === 'CAMBIOS_SOLICITADOS' || accion === 'CORREGIR') {
      // Actualizar estado a correccion solicitada
      actualizarEstadoContrato(cdr, 'ESTUDIO APROBADO', `?? Correcciones solicitadas por ${tipo}`);

      // Enviar notificacion de cambios solicitados
      enviarNotificacionCambiosSolicitados(cdr, tipo, comentarios);

      return {
        success: true,
        message: 'Solicitud de cambios registrada',
        estadoFinal: 'CORRECCION_SOLICITADA'
      };
    } else {
      return {
        success: true,
        message: `Aprobacion de ${tipo} registrada. Pendiente: ${aprobaciones.pendientes.join(', ')}`,
        estadoFinal: 'PARCIALMENTE_APROBADO',
        pendientes: aprobaciones.pendientes
      };
    }

  } catch (error) {
    Logger.log(`Error registrando aprobacion: ${error.toString()}`);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Verificar si todas las partes han aprobado
 */
function verificarAprobacionesCompletas(cdr) {
  try {
    const hojaAprobaciones = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_APROBACIONES);

    if (!hojaAprobaciones) {
      return {
        todasAprobadas: false,
        pendientes: ['inquilino', 'propietario', 'codeudores']
      };
    }

    const datos = hojaAprobaciones.getDataRange().getValues();
    const aprobaciones = {
      inquilino: false,
      propietario: false,
      codeudor1: false,
      codeudor2: false,
      codeudor3: false
    };

    const cdrClean = String(cdr).trim();

    // 1. Determinar la versión actual (maxVersion) para este CDR
    let maxVersion = 1;
    for (let i = 1; i < datos.length; i++) {
      const rowCdr = String(datos[i][0]).trim();
      if (rowCdr === cdrClean || (rowCdr.length > 20 && cdrClean.startsWith(rowCdr))) {
        let v = parseInt(datos[i][7]);
        if (!isNaN(v) && v > maxVersion) maxVersion = v;
      }
    }

    // 2. Buscar aprobaciones SOLO en la versión actual
    for (let i = 1; i < datos.length; i++) {
      const rowCdr = String(datos[i][0]).trim();
      if (rowCdr === cdrClean || (rowCdr.length > 20 && cdrClean.startsWith(rowCdr))) {
        let v = parseInt(datos[i][7]) || 1;
        if (v === maxVersion && datos[i][2] === 'APROBADO') {
          const tipo = datos[i][1].toLowerCase();
          if (aprobaciones.hasOwnProperty(tipo)) {
            aprobaciones[tipo] = true;
          } else if (tipo.startsWith('codeudor')) {
             // Si el objeto inicial no lo tenia (ej: codeudor4), lo agregamos dinámicamente
             aprobaciones[tipo] = true;
          }
        } else if (v === maxVersion && (datos[i][2] === 'RECHAZADO' || datos[i][2] === 'CORREGIR' || datos[i][2] === 'CAMBIOS_SOLICITADOS')) {
          // Si en esta misma versión rechazó después de aprobar (por seguridad)
          const tipo = datos[i][1].toLowerCase();
          if (aprobaciones.hasOwnProperty(tipo)) {
            aprobaciones[tipo] = false;
          }
        }
      }
    }

    // Verificar cuantos codeudores hay
    const datosContrato = recopilarDatosContrato(cdr);
    const numCodeudores = datosContrato.data?.codeudores?.length || 0;

    // Verificar aprobaciones requeridas
    const pendientes = [];
    if (!aprobaciones.inquilino) pendientes.push('inquilino');
    if (!aprobaciones.propietario) pendientes.push('propietario');

    for (let i = 1; i <= numCodeudores; i++) {
      if (!aprobaciones[`codeudor${i}`]) {
        pendientes.push(`codeudor${i}`);
      }
    }

    return {
      todasAprobadas: pendientes.length === 0,
      pendientes: pendientes,
      aprobaciones: aprobaciones
    };

  } catch (error) {
    Logger.log(`Error verificando aprobaciones: ${error.toString()}`);
    return {
      todasAprobadas: false,
      pendientes: ['error']
    };
  }
}

/**
 * Obtener estados de aprobacion
 */
function obtenerEstadosAprobacion(cdr) {
  try {
    const hojaAprobaciones = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_APROBACIONES);

    if (!hojaAprobaciones) {
      return {
        inquilino: 'PENDIENTE',
        propietario: 'PENDIENTE',
        codeudores: []
      };
    }

    const datos = hojaAprobaciones.getDataRange().getValues();
    const estados = [];

    const cdrClean = String(cdr).trim();

    // Obtener todo el historial de este CDR
    for (let i = 1; i < datos.length; i++) {
      const rowCdr = String(datos[i][0]).trim();
      if (rowCdr === cdrClean || (rowCdr.length > 20 && cdrClean.startsWith(rowCdr))) {
        const tipo = datos[i][1];
        const accion = datos[i][2];
        const comentarios = datos[i][3];
        const fecha = datos[i][4];
        const hora = datos[i][5];
        const version = parseInt(datos[i][7]) || 1;

        estados.push({
          parte: tipo,
          estado: accion,
          fecha: fecha,
          hora: hora,
          comentarios: comentarios,
          version: version
        });
      }
    }

    return estados;

  } catch (error) {
    Logger.log(`Error obteniendo estados: ${error.toString()}`);
    return {};
  }
}

// ==========================================
// FUNCIONES DE EMAIL
// ==========================================

/**
 * Enviar email de revision al inquilino
 */
function enviarEmailRevisionInquilino(email, nombre, cdr, urlContrato, urlAprobacion) {
  const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
  const asunto = `Contrato de Arrendamiento para Revisión - ${displayId}`;

  const tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tpl.TITULO = 'Contrato Listo para Revisión';
  tpl.NOMBRE_CLIENTE = nombre;
  tpl.MENSAJE_PRINCIPAL = 'El borrador de su contrato de arrendamiento está listo. Por favor, ingrese a nuestro portal de validación transparente para revisar los términos, aprobar el documento o solicitar cambios.';
  tpl.MENSAJE_SECUNDARIO = 'Nuestro sistema registrará cualquier observación en la bitácora del contrato, asegurando transparencia entre todas las partes involucradas.';
  tpl.URL_ACCION = urlAprobacion;
  tpl.TEXTO_BOTON = 'Revisar y Validar Contrato';

  const htmlBody = tpl.evaluate().getContent();

  MailApp.sendEmail({
    to: email,
    subject: asunto,
    htmlBody: htmlBody
  });

  Logger.log(`Email de revisión enviado a inquilino: ${email}`);
}

/**
 * Enviar email de revision al propietario
 */
function enviarEmailRevisionPropietario(email, nombre, cdr, urlContrato, urlAprobacion) {
  const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
  const asunto = `Contrato de Arrendamiento para Revisión - ${displayId}`;

  const tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tpl.TITULO = 'Contrato para Revisión';
  tpl.NOMBRE_CLIENTE = nombre;
  tpl.MENSAJE_PRINCIPAL = 'El contrato de arrendamiento de su propiedad está listo para revisión. Por favor, ingrese a nuestro portal de validación transparente y verifique que todos los términos sean correctos.';
  tpl.MENSAJE_SECUNDARIO = 'Nuestro sistema registrará cualquier observación en la bitácora del contrato, asegurando transparencia entre todas las partes involucradas.';
  tpl.URL_ACCION = urlAprobacion;
  tpl.TEXTO_BOTON = 'Revisar y Validar Contrato';

  const htmlBody = tpl.evaluate().getContent();

  MailApp.sendEmail({
    to: email,
    subject: asunto,
    htmlBody: htmlBody
  });

  Logger.log(`Email de revision enviado a propietario: ${email}`);
}

/**
 * Enviar email de revision al codeudor
 */
function enviarEmailRevisionCodeudor(email, nombre, cdr, urlContrato, urlAprobacion) {
  const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
  const asunto = `Contrato de Arrendamiento - Codeudor - ${displayId}`;

  const tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tpl.TITULO = 'Revisión como Codeudor';
  tpl.NOMBRE_CLIENTE = nombre;
  tpl.MENSAJE_PRINCIPAL = 'Ha sido designado como codeudor en un contrato de arrendamiento. Por favor, ingrese a nuestro portal de validación transparente para revisar los términos, sus responsabilidades y aprobar el documento.';
  tpl.MENSAJE_SECUNDARIO = 'Como codeudor, usted responde solidariamente por el pago del canon y garantiza el cumplimiento del contrato. Nuestro sistema registrará su aprobación en la bitácora del contrato.';
  tpl.URL_ACCION = urlAprobacion;
  tpl.TEXTO_BOTON = 'Revisar y Aceptar Codeudoría';

  const htmlBody = tpl.evaluate().getContent();

  MailApp.sendEmail({
    to: email,
    subject: asunto,
    htmlBody: htmlBody
  });

  Logger.log(`Email de revision enviado a codeudor: ${email}`);
}

/**
 * Enviar notificacion de contrato completamente aprobado
 */
function enviarNotificacionContratoAprobado(cdr) {
  try {
    const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
    const datos = recopilarDatosContrato(cdr);

    if (!datos.success) return;

    const asunto = `Contrato Aprobado - ${displayId}`;

    const tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
    tpl.TITULO = 'Contrato Aprobado por Todas las Partes';
    tpl.NOMBRE_CLIENTE = 'Cliente';
    tpl.MENSAJE_PRINCIPAL = `Nos complace informarle que el contrato de arrendamiento con código <strong>${displayId}</strong> ha sido aprobado por todas las partes (Inquilino, Propietario y Codeudores).`;
    tpl.MENSAJE_SECUNDARIO = 'Próximos pasos: El contrato será preparado para su firma electrónica final. Recibirá instrucciones adicionales próximamente.';
    
    const htmlBody = tpl.evaluate().getContent();

    // Enviar a todas las partes
    const emails = [
      datos.data.inquilino.email,
      datos.data.propietario.email
    ];

    if (datos.data.codeudores && datos.data.codeudores.length > 0) {
      datos.data.codeudores.forEach(codeudor => {
        if (codeudor.email) emails.push(codeudor.email);
      });
    }

    emails.forEach(email => {
      if (email) {
        MailApp.sendEmail({
          to: email,
          subject: asunto,
          htmlBody: htmlBody
        });
      }
    });

    Logger.log(`Notificacion de aprobacion completa enviada para CDR: ${cdr}`);

  } catch (error) {
    Logger.log(`Error enviando notificacion de aprobacion: ${error.toString()}`);
  }
}

/**
 * Enviar notificacion de cambios solicitados
 */
function enviarNotificacionCambiosSolicitados(cdr, solicitante, observaciones) {
  try {
    const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
    const datos = recopilarDatosContrato(cdr);

    if (!datos.success) return;

    const asunto = `Cambios Solicitados al Contrato - ${displayId}`;

    const tpl = HtmlService.createTemplateFromFile('backend/email_notificacion');
    tpl.TITULO = 'Cambios Solicitados';
    tpl.NOMBRE_CLIENTE = 'Cliente';
    tpl.MENSAJE_PRINCIPAL = `Se han solicitado cambios al contrato de arrendamiento con código <strong>${displayId}</strong>.`;
    tpl.MENSAJE_SECUNDARIO = `Observaciones (${solicitante}):\n${observaciones || 'Sin observaciones específicas'}`;
    
    // Podemos incluir un botón para que vayan a la bitácora a revisar
    const idURL = datosReq.success && datosReq.data.idRegistro ? datosReq.data.idRegistro : cdr;
    const cdrEncoded = encodeURIComponent(idURL).replace(/\(/g, '%28').replace(/\)/g, '%29');
    tpl.URL_ACCION = `${CONTRATO_CONFIG.BASE_URL}/validador-de-contratos.html?cdr=${cdrEncoded}`;
    tpl.TEXTO_BOTON = 'Ver Bitácora del Contrato';

    const htmlBody = tpl.evaluate().getContent();

    // Enviar a todas las partes
    const emails = [
      datos.data.inquilino.email,
      datos.data.propietario.email
    ];

    // Agregar emails de codeudores
    if (datos.data.codeudores && datos.data.codeudores.length > 0) {
      datos.data.codeudores.forEach(codeudor => {
        if (codeudor.email) {
          emails.push(codeudor.email);
        }
      });
    }

    // Enviar email a todos
    emails.forEach(email => {
      if (email) {
        MailApp.sendEmail({
          to: email,
          subject: asunto,
          htmlBody: htmlBody
        });
      }
    });

    Logger.log(`Notificacion de cambios enviada para CDR: ${cdr}`);

  } catch (error) {
    Logger.log(`Error enviando notificacion de cambios: ${error.toString()}`);
  }
}

/**
 * Enviar el PDF original al correo del administrador y de las partes
 */
function enviarEmailFinalAdmin(cdr, nombreContrato, urlPdf, pdfBlob) {
  try {
    const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
    const asunto = `PDF FINAL LISTO - Contrato ${displayId}`;

    const datosResult = recopilarDatosContrato(cdr);
    const datos = datosResult.success ? datosResult.data : null;

    // --- HTML PARA EL ADMINISTRADOR ---
    const tplAdmin = HtmlService.createTemplateFromFile('backend/email_notificacion');
    tplAdmin.TITULO = 'Contrato Definitivo Generado';
    tplAdmin.NOMBRE_CLIENTE = 'Equipo GoldLife';
    tplAdmin.MENSAJE_PRINCIPAL = `El contrato de arrendamiento <strong>${displayId}</strong> ha sido aprobado por todas las partes y el documento ORIGINAL en PDF ha sido generado exitosamente.`;
    tplAdmin.MENSAJE_SECUNDARIO = 'El documento adjunto está listo para ser subido a la plataforma de firmas electrónicas (VíaFirma).';
    tplAdmin.URL_ACCION = urlPdf;
    tplAdmin.TEXTO_BOTON = 'Ver PDF en Drive';
    const htmlBodyAdmin = tplAdmin.evaluate().getContent();

    const adminEmail = 'realestate.goldlifesystem@gmail.com';
    MailApp.sendEmail({
        to: adminEmail,
        subject: asunto,
        htmlBody: htmlBodyAdmin,
        attachments: [pdfBlob.setName(`${nombreContrato}.pdf`)]
    });

    // --- HTML PARA LOS CLIENTES (Sin PDF, sin botón) ---
    const tplClientes = HtmlService.createTemplateFromFile('backend/email_notificacion');
    tplClientes.TITULO = 'Contrato Definitivo Generado';
    tplClientes.NOMBRE_CLIENTE = 'Cliente';
    tplClientes.MENSAJE_PRINCIPAL = `El contrato de arrendamiento <strong>${displayId}</strong> ha sido aprobado por todas las partes y el documento definitivo ha sido generado exitosamente.`;
    tplClientes.MENSAJE_SECUNDARIO = 'Por favor esté atento a su bandeja de entrada. Muy pronto recibirá un correo oficial de la plataforma de firmas electrónicas para proceder con la firma digital del documento.';
    tplClientes.URL_ACCION = ''; 
    tplClientes.TEXTO_BOTON = ''; 
    const htmlBodyClientes = tplClientes.evaluate().getContent();

    const emailsClientes = [];
    if (datos) {
        if (datos.inquilino?.email) emailsClientes.push(datos.inquilino.email);
        if (datos.propietario?.email) emailsClientes.push(datos.propietario.email);
        if (datos.codeudores && datos.codeudores.length > 0) {
            datos.codeudores.forEach(c => {
                if (c.email) emailsClientes.push(c.email);
            });
        }
    }

    emailsClientes.forEach(email => {
        MailApp.sendEmail({
            to: email,
            subject: `Contrato Aprobado - Esperando Firma: ${displayId}`,
            htmlBody: htmlBodyClientes
        });
    });

    Logger.log(`Email final enviado con el PDF al Admin y notificación a ${emailsClientes.length} clientes`);
  } catch (error) {
    Logger.log(`Error enviando PDF final al admin y partes: ${error.toString()}`);
  }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Actualizar estado del contrato en la hoja principal
 */
function actualizarEstadoContrato(cdr, estado, detalles) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_PRINCIPAL);
    const lastRow = sheet.getLastRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const cdrCol = headers.indexOf('CODIGO DE REGISTRO') + 1;
    const idRegCol = headers.indexOf('ID DE REGISTRO') + 1;
    const estadoCol = headers.indexOf('ESTADO DEL INMUEBLE') + 1;
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;

    for (let i = 2; i <= lastRow; i++) {
      const valorCDR = cdrCol > 0 ? sheet.getRange(i, cdrCol).getValue() : null;
      const valorID = idRegCol > 0 ? sheet.getRange(i, idRegCol).getValue() : null;
      
      if (valorCDR === cdr || valorID === cdr) {
        if (estadoCol > 0) {
          sheet.getRange(i, estadoCol).setValue(estado);
        }
        if (detallesCol > 0) {
          sheet.getRange(i, detallesCol).setValue(detalles);
        }
        Logger.log(`Estado actualizado para CDR/ID ${cdr}: ${estado}`);
        break;
      }
    }

  } catch (error) {
    Logger.log(`Error actualizando estado: ${error.toString()}`);
  }
}

/**
 * Registrar generacion de contrato en log
 */
function registrarGeneracionContrato(cdr, docId, url) {
  try {
    let logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_LOG_CONTRATOS);

    if (!logSheet) {
      logSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONTRATO_CONFIG.HOJA_LOG_CONTRATOS);
      logSheet.getRange(1, 1, 1, 6).setValues([
        ['FECHA', 'CDR', 'DOC_ID', 'URL', 'GENERADO_POR', 'ESTADO']
      ]);
      logSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }

    const fecha = new Date();
    const usuario = Session.getActiveUser().getEmail();

    logSheet.appendRow([
      fecha,
      cdr,
      docId,
      url,
      usuario,
      'GENERADO'
    ]);

    Logger.log(`Contrato registrado en log: ${cdr}`);

  } catch (error) {
    Logger.log(`Error registrando en log: ${error.toString()}`);
  }
}

/**
 * Formatear moneda
 */
function formatearMoneda(valor) {
  if (!valor) return '$0';

  const numero = parseFloat(String(valor).replace(/[^\d]/g, ''));
  if (isNaN(numero)) return '$0';

  return '$' + numero.toLocaleString('es-CO');
}

/**
 * Convertir numero a letras
 */
function numeroALetras(numero) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (numero === 0) return 'CERO PESOS';

  let resultado = '';

  // Millones
  if (numero >= 1000000) {
    const millones = Math.floor(numero / 1000000);
    if (millones === 1) {
      resultado += 'UN MILLON ';
    } else {
      resultado += convertirCentenas(millones) + ' MILLONES ';
    }
    numero = numero % 1000000;
  }

  // Miles
  if (numero >= 1000) {
    const miles = Math.floor(numero / 1000);
    if (miles === 1) {
      resultado += 'MIL ';
    } else {
      resultado += convertirCentenas(miles) + ' MIL ';
    }
    numero = numero % 1000;
  }

  // Centenas
  if (numero > 0) {
    resultado += convertirCentenas(numero);
  }

  return resultado.trim() + ' PESOS M/CTE';

  function convertirCentenas(n) {
    let output = '';

    const cientos = Math.floor(n / 100);
    const resto = n % 100;

    if (cientos > 0) {
      if (n === 100) {
        output = 'CIEN';
      } else {
        output = centenas[cientos] + ' ';
      }
    }

    if (resto > 0) {
      if (resto < 10) {
        output += unidades[resto];
      } else if (resto === 10) {
        output += 'DIEZ';
      } else if (resto === 11) {
        output += 'ONCE';
      } else if (resto === 12) {
        output += 'DOCE';
      } else if (resto === 13) {
        output += 'TRECE';
      } else if (resto === 14) {
        output += 'CATORCE';
      } else if (resto === 15) {
        output += 'QUINCE';
      } else if (resto < 20) {
        output += 'DIECI' + unidades[resto - 10];
      } else if (resto === 20) {
        output += 'VEINTE';
      } else if (resto < 30) {
        output += 'VEINTI' + unidades[resto - 20];
      } else {
        const dec = Math.floor(resto / 10);
        const uni = resto % 10;
        output += decenas[dec];
        if (uni > 0) {
          output += ' Y ' + unidades[uni];
        }
      }
    }

    return output.trim();
  }
}

// ==========================================
// FUNCIONES DE PANEL VALIDACION (CONTRATOS)
// ==========================================

/**
 * Obtener lista de inmuebles listos para generar contrato
 * Filtro: Estado = 'ESTUDIO APROBADO'
 */
function obtenerContratosPendientes() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_PRINCIPAL);
    if (!sheet) return [{cdr: "DEBUG-ERROR", estadoBadge: "HOJA_PRINCIPAL NO EXISTE"}];
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [{cdr: "DEBUG-ERROR", estadoBadge: "HOJA SIN DATOS"}];
    
    const contratos = [];
    const headers = data[0].map(h => String(h).trim().toUpperCase());
    
    const idxCdr = headers.findIndex(h => h === 'CODIGO DE REGISTRO' || h === 'CÓDIGO DE REGISTRO' || h === 'ID DE REGISTRO');
    const idxEstado = headers.findIndex(h => h === 'ESTADO DEL INMUEBLE');
    const idxDoc = headers.findIndex(h => h === 'ESTADO DOCUMENTAL');
    const idxDetalles = headers.findIndex(h => h === 'DETALLES DEL ESTADO DEL INMUEBLE');
    const idxTipo = headers.findIndex(h => h === 'TIPO DE INMUEBLE');
    const idxCanon = headers.findIndex(h => h === 'CANON MENSUAL');
    const idxInquilino = headers.findIndex(h => h === 'NOMBRES - INQUILINO');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const cdrValue = idxCdr > -1 ? row[idxCdr] : '';
        const estado = idxEstado > -1 ? String(row[idxEstado]).trim().toUpperCase() : '';
        const estadoDoc = idxDoc > -1 ? String(row[idxDoc]).trim().toUpperCase() : '';
        const detalles = idxDetalles > -1 ? String(row[idxDetalles]).trim().toUpperCase() : '';

        if (estado.includes('CONTRATO ORIGINAL GENERADO')) {
            continue;
        }

        if (
            estado.includes('ESTUDIO APROBADO') || 
            estado.includes('READY_CONTRACT') ||
            estado.includes('CONTRATO GENERADO') ||
            estado.includes('BORRADOR ENVIADO') ||
            estado.includes('EN REVISION') ||
            estado.includes('APROBADO') ||
            estadoDoc.includes('VALIDATED') ||
            estadoDoc.includes('READY_CONTRACT') ||
            detalles.includes('CONTRATO GENERADO') ||
            detalles.includes('BORRADOR ENVIADO') ||
            detalles.includes('APROBADO POR TODAS LAS PARTES')
        ) {
            if (cdrValue) {
                contratos.push({
                    cdr: cdrValue,
                    tipoNegocio: idxTipo > -1 ? row[idxTipo] : 'N/A',
                    canon: idxCanon > -1 ? row[idxCanon] : '0',
                    inquilino: idxInquilino > -1 ? row[idxInquilino] : 'Pendiente',
                    estadoBadge: estado || detalles || estadoDoc
                });
            }
        }
    }
    if (contratos.length === 0) {
        return [];
    }
    return contratos;
  } catch (err) {
      return [{cdr: "DEBUG-ERROR CRITICO", estadoBadge: err.message}];
  }
}

/**
 * Función para enviar correos de validación a Inquilino y Propietario
 */
function enviarBorradorAValidar(cdr, comentario_admin) {
  try {
    const datosRecopilados = recopilarDatosContrato(cdr);
    if (!datosRecopilados.success) throw new Error(datosRecopilados.message);
    const datos = datosRecopilados.data;

    const emailInquilino = datos.inquilino.email;
    const emailPropietario = datos.propietario.email;

    if (!emailInquilino || !emailPropietario) {
      throw new Error(`Correos faltantes. Inq: ${emailInquilino}, Prop: ${emailPropietario}`);
    }

    const baseURL = CONTRATO_CONFIG.BASE_URL || 'https://realestate-goldlifesystem.github.io/efirmacontrata';
    
    // Asumimos que docId ya está generado y lo podemos sacar del estado en Sheet o lo pasamos en blanco si solo usamos CDR
    // En este flujo, validador-de-contratos.html usará el CDR para obtener el borrador activo.
    const urlContrato = '#'; // El link real al doc lo mostrará el frontend
    
    // Enviar al inquilino
    enviarEmailRevisionInquilino(
      emailInquilino,
      datos.inquilino.nombre,
      cdr,
      urlContrato,
      `${baseURL}/frontend/validador-de-contratos.html?id=${encodeURIComponent(datos.idRegistro)}&parte=inquilino`
    );

    // Enviar al propietario
    enviarEmailRevisionPropietario(
      emailPropietario,
      datos.propietario.nombre,
      cdr,
      urlContrato,
      `${baseURL}/frontend/validador-de-contratos.html?id=${encodeURIComponent(datos.idRegistro)}&parte=propietario`
    );

    // Enviar a codeudores si existen
    if (datos.codeudores && datos.codeudores.length > 0) {
      datos.codeudores.forEach((codeudor, index) => {
        if (codeudor.email) {
          enviarEmailRevisionCodeudor(
            codeudor.email,
            codeudor.nombre,
            cdr,
            urlContrato,
            `${baseURL}/frontend/validador-de-contratos.html?id=${encodeURIComponent(datos.idRegistro)}&parte=codeudor${index + 1}`
          );
        }
      });
    }

    // REGISTRAR LA NUEVA VERSIÓN EN EL HISTORIAL DE BITÁCORA
    const mensajeAdmin = comentario_admin || 'Nueva versión generada y enviada a revisión';
    registrarAprobacionContrato(datos.idRegistro || cdr, 'ADMIN', 'ENVIADO', mensajeAdmin);

    // Cambiar estado global a BORRADOR ENVIADO
    actualizarEstadoContrato(cdr, 'BORRADOR ENVIADO', 'Los correos de validación se enviaron exitosamente (incluyendo codeudores si aplica).');

    return {
      success: true,
      message: 'Correos enviados. Estado actualizado a BORRADOR ENVIADO.'
    };
  } catch(error) {
    return {
      success: false,
      message: error.message
    };
  }
}



/**
 * Obtiene el consolidado de las firmas/aprobaciones para el panel
 */
function obtenerEstadoAprobacionesContrato(cdr) {
  try {
    // Ya no usamos recopilarDatosContrato para evitar que un error ahí bloquee la bitácora
    const verdaderoCDR = cdr;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_APROBACIONES);
    if (!sheet) return { success: true, estados: [] };

    const data = sheet.getDataRange().getValues();
    const estados = [];
    
    const cdrClean = String(cdr).trim();
    const verdaderoCDRClean = String(verdaderoCDR).trim();

    for (let i = 1; i < data.length; i++) {
        const rowCdr = String(data[i][0]).trim();
        if (rowCdr === verdaderoCDRClean || rowCdr === cdrClean || (rowCdr.length > 20 && (verdaderoCDRClean.startsWith(rowCdr) || cdrClean.startsWith(rowCdr)))) {
           estados.push({
               parte: String(data[i][1]).toUpperCase(),
               estado: data[i][2],
               comentarios: data[i][3],
               fecha: data[i][4] instanceof Date ? Utilities.formatDate(data[i][4], Session.getScriptTimeZone(), 'yyyy-MM-dd') : data[i][4],
               hora: data[i][5] instanceof Date ? Utilities.formatDate(data[i][5], Session.getScriptTimeZone(), 'HH:mm:ss') : data[i][5],
               email: data[i][6],
               version: parseInt(data[i][7]) || 1
           });
        }
    }

    return { success: true, estados: estados };
  } catch(err) {
    return { success: false, message: err.message };
  }
}

/**
 * Obtiene el contexto de un contrato ya generado (URL y datos) sin volver a crearlo
 */
function obtenerContextoContrato(cdr) {
  try {
    // Primero recopilar datos para obtener el verdadero CDR por si nos pasaron el ID
    const datosReq = recopilarDatosContrato(cdr);
    if (!datosReq.success) {
      throw new Error("No se encontraron los datos del contrato para el código: " + cdr);
    }
    
    const verdaderoCDR = datosReq.data.cdr;
    const datos = datosReq.data;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_LOG_CONTRATOS);
    if (!sheet) throw new Error("No hay registros de contratos");

    const data = sheet.getDataRange().getValues();
    let url = '';
    
    // Buscar el más reciente usando el verdadero CDR
    for (let i = data.length - 1; i > 0; i--) {
      if (data[i][1] === verdaderoCDR) {
        url = data[i][3]; // URL está en la columna D
        break;
      }
    }

    // Fallback: Buscar en Google Drive directamente si no está en el Log
    if (!url) {
      const cdrEscaped = verdaderoCDR.replace(/'/g, "\\'");
      const fileSearch = DriveApp.searchFiles(`title contains '${cdrEscaped}' and mimeType = 'application/vnd.google-apps.document' and trashed = false`);
      if (fileSearch.hasNext()) {
        const file = fileSearch.next();
        url = file.getUrl();
        // Opcional: Podríamos registrarlo en el log aquí mismo para futuras consultas
      }
    }

    if (!url) throw new Error("No se encontró URL de borrador para este CDR ni en Logs ni en Drive.");

    return {
      success: true,
      url: url,
      datos: datos
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Procesa la firma electrónica enviada desde la Sala de Firmas web
 */
function handleProcesarFirmaElectronica(datos) {
  try {
    console.log("Procesando firma electrónica para DocID: " + datos.docId);
    if (!datos.docId || !datos.base64) {
      throw new Error("Datos incompletos para procesar la firma.");
    }

    const docId = datos.docId;
    const base64Data = datos.base64.split(',')[1]; // Remover prefijo "data:image/png;base64,"
    const decodedImage = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedImage, MimeType.PNG, "Firma.png");

    // 1. Abrir el Documento de Google
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();

    // Añadir salto de página y título
    body.appendPageBreak();
    const title = body.appendParagraph("CERTIFICADO DE FIRMA ELECTRÓNICA");
    title.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    
    const aviso = body.appendParagraph("\nDECLARACIÓN DE FIRMA ELECTRÓNICA (Ley 527 de 1999):\nEl presente acuerdo ha sido suscrito mediante firma electrónica por las partes. La manifestación expresa de la voluntad, la captura de la dirección IP, el sello de tiempo (Timestamp) y el trazo gráfico del PROPIETARIO han sido registrados y unificados en este documento mediante la plataforma tecnológica del AGENTE, garantizando su autenticidad, integridad y no repudio, prestando pleno mérito ejecutivo.\n");
    aviso.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);

    // Insertar la imagen de la firma centrada
    const paragraphImg = body.appendParagraph("");
    paragraphImg.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const image = paragraphImg.appendInlineImage(blob);
    
    // Escalar la imagen para evitar que brinque a otra hoja (max width 250, max height 150)
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();
    if (originalWidth > 250) {
      const ratio = 250 / originalWidth;
      image.setWidth(250);
      image.setHeight(originalHeight * ratio);
    }
    if (image.getHeight() > 150) {
      const ratio = 150 / image.getHeight();
      const currentWidth = image.getWidth();
      image.setHeight(150);
      image.setWidth(currentWidth * ratio);
    }

    // Agregar datos de auditoría
    const fechaActual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    body.appendParagraph("\n--- DATOS DE AUDITORÍA ---").setAttributes({ [DocumentApp.Attribute.BOLD]: true });
    body.appendParagraph(`Fecha y Hora: ${fechaActual}`);
    body.appendParagraph(`Dirección IP: ${datos.ip || "No disponible"}`);
    body.appendParagraph(`Dispositivo/Navegador: ${datos.userAgent || "No disponible"}`);
    body.appendParagraph(`Hash de Integridad (DocID): ${docId}`);
    
    doc.saveAndClose();

    // 3. (Opcional) Generar PDF Final y Guardarlo
    const pdfBlob = doc.getAs('application/pdf');
    const folder = DriveApp.getFileById(docId).getParents().next();
    const pdfName = doc.getName() + " - FIRMADO.pdf";
    
    // Buscar si ya existe para reemplazar o crear uno nuevo
    const files = folder.searchFiles(`title = '${pdfName}'`);
    if (files.hasNext()) {
      files.next().setTrashed(true);
    }
    const finalPdf = folder.createFile(pdfBlob).setName(pdfName);

    // 4. Actualizar estado en el Sheet usando CDR o docId
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
    if (sheet) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // Función auxiliar robusta
      const getCol = (name) => {
        for (let col = 0; col < headers.length; col++) {
          if (headers[col] && headers[col].toString().trim() === name.trim()) {
            return col + 1;
          }
        }
        return 0;
      };

      const cdrCol = getCol('CODIGO DE REGISTRO');
      const estadoCol = getCol('ESTADO DEL INMUEBLE');
      
      const docIdColCorretaje = getCol('Merged Doc ID - CORRETAJE');
      const docIdColAdmin = getCol('Merged Doc ID - ADMINISTRACIÓN');
      const docIdColVenta = getCol('Merged Doc ID - VENTA');
      const docIdColAdmiVenta = getCol('Merged Doc ID - ADMI-VENTA');
      const docIdColVendiRenta = getCol('Merged Doc ID - VENDI-RENTA');
      
      if (estadoCol > 0) {
        const lastRow = sheet.getLastRow();
        let targetRow = -1;

        // Intentar buscar la fila correcta
        for (let i = 2; i <= lastRow; i++) {
          // Condición 1: Coincide el CDR
          const cdrMatch = datos.cdr && cdrCol > 0 && String(sheet.getRange(i, cdrCol).getValue()).trim() === String(datos.cdr).trim();
          
          // Condición 2: Coincide el docId en CUALQUIER columna de negocio (FALLBACK SEGURO)
          const matchDocId = (col) => col > 0 && String(sheet.getRange(i, col).getValue()).trim() === String(docId).trim();
          
          const docIdMatch = matchDocId(docIdColCorretaje) || 
                             matchDocId(docIdColAdmin) || 
                             matchDocId(docIdColVenta) || 
                             matchDocId(docIdColAdmiVenta) || 
                             matchDocId(docIdColVendiRenta);

          if (cdrMatch || docIdMatch) {
            targetRow = i;
            break;
          }
        }

        if (targetRow > 0) {
          const i = targetRow;
          sheet.getRange(i, estadoCol).setValue('ACTIVO'); 
          
          // --- NUEVO: Añadir Link en "DOCUMENTO FIRMADO" ---
          const docFirmadoCol = getCol('DOCUMENTO FIRMADO');
          if (docFirmadoCol > 0) {
            sheet.getRange(i, docFirmadoCol).setFormula(`=HYPERLINK("${finalPdf.getUrl()}"; "📄✅ FIRMADO")`);
          }
          
          // --- NUEVO: Añadir Botón Cargar Contenido ---
          const cargarContenidoCol = getCol('CARGAR CONTENIDO');
          const idRegistroCol = getCol('ID DE REGISTRO');
          let idParaUrl = datos.cdr; // Fallback
          if (idRegistroCol > 0) {
            const idSheet = sheet.getRange(i, idRegistroCol).getValue();
            if (idSheet) idParaUrl = idSheet;
          }
          if (cargarContenidoCol > 0) {
            sheet.getRange(i, cargarContenidoCol).setFormula(`=HYPERLINK("https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/carga_multimedia.html?id=${encodeURIComponent(idParaUrl)}"; "📤📷 CARGAR")`);
          }
          
          // --- NUEVO: Enviar copia del PDF al cliente ---
          try {
            const emailCol = getCol('Correo electrónico');
            const nameCol = getCol('Ingrese Nombres y Apellidos');
            const tipoNegocioCol = getCol('TIPO DE NEGOCIO');
            
            if (emailCol > 0 && nameCol > 0) {
              const emailCliente = sheet.getRange(i, emailCol).getValue();
              const nombreCliente = sheet.getRange(i, nameCol).getValue();
              const tipoNegocio = tipoNegocioCol > 0 ? sheet.getRange(i, tipoNegocioCol).getValue() : 'Corretaje';
              
              if (emailCliente) {
                let subject = '';
                let tipoActaTexto = '';

                switch(tipoNegocio) {
                  case 'Administración':
                    subject = '✅ FIRMA COMPLETADA: Acta de Administración - <<nombre>> (ID: <<cdr>>) - REAL ESTATE Gold Life';
                    tipoActaTexto = 'Acta de administración';
                    break;
                  case 'Venta':
                    subject = '✅ FIRMA COMPLETADA: Acta de Venta - <<nombre>> (ID: <<cdr>>) - REAL ESTATE Gold Life';
                    tipoActaTexto = 'Acta para la promoción en venta';
                    break;
                  case 'Admi-Venta':
                    subject = '✅ FIRMA COMPLETADA: Acta de Admi-Venta - <<nombre>> (ID: <<cdr>>) - REAL ESTATE Gold Life';
                    tipoActaTexto = 'Acta de promoción de Admi-Venta';
                    break;
                  case 'Vendi-Renta':
                    subject = '✅ FIRMA COMPLETADA: Acta de Vendi-Renta - <<nombre>> (ID: <<cdr>>) - REAL ESTATE Gold Life';
                    tipoActaTexto = 'Acta de promoción de Vendi-Renta';
                    break;
                  case 'Corretaje':
                  default:
                    subject = '✅ FIRMA COMPLETADA: Acta de Arrendamiento - <<nombre>> (ID: <<cdr>>) - REAL ESTATE Gold Life';
                    tipoActaTexto = 'Acta de Promoción en Arriendo';
                    break;
                }

                subject = subject.replace('<<nombre>>', nombreCliente).replace('<<cdr>>', idParaUrl);

                var template = HtmlService.createTemplateFromFile('backend/email_firma_final');
                template.NOMBRE_CLIENTE = nombreCliente;
                template.TIPO_ACTA = tipoActaTexto;
                template.CDR = idParaUrl;
                template.ANIO = new Date().getFullYear();
                var htmlBody = template.evaluate().getContent();

                MailApp.sendEmail({
                  to: emailCliente,
                  bcc: 'realestate.goldlifesystem@gmail.com',
                  subject: subject,
                  htmlBody: htmlBody,
                  attachments: [finalPdf.getAs(MimeType.PDF)]
                });
                console.log("Copia final enviada a: " + emailCliente);
                
                // --- NUEVO: Correo separado con la Autorización de Ingreso ---
                try {
                  const targetRowData = sheet.getRange(i, 1, 1, sheet.getLastColumn()).getValues()[0];
                  let rowIndexEncontrado = i - 1; // Para coincidir con el index 0-based si fuera array
                  
                  if (!targetRowData) {
                    throw new Error("No se pudo obtener targetRowData para la fila " + i);
                  }

                  // Verificar si el inmueble dispone de portería/administración
                  let colDisponePorteria = 0;
                  for (let c = 0; c < headers.length; c++) {
                    const hName = headers[c] ? headers[c].toString().toLowerCase() : '';
                    if (hName.includes('dispone de portería') || hName.includes('dispone de porteria')) {
                      colDisponePorteria = c + 1;
                      break;
                    }
                  }
                  
                  let enviarAutorizacion = false;
                  if (colDisponePorteria > 0) {
                    const valorPorteria = String(targetRowData[colDisponePorteria - 1] || '').toLowerCase().trim();
                    if (valorPorteria === 'si' || valorPorteria === 'sí') {
                      enviarAutorizacion = true;
                    }
                  }

                  // Solo procedemos si la respuesta fue "SI"
                  if (enviarAutorizacion) {
                    let colAuthId = 0;
                    for (let c = 0; c < headers.length; c++) {
                      const hName = headers[c] ? headers[c].toString().toUpperCase() : '';
                      if (hName.includes('MERGED DOC ID') && hName.includes('AUTORIZACI')) {
                        colAuthId = c + 1;
                        break;
                      }
                    }
                    
                    let adminInmuebleEmail = '';
                    for (let c = 0; c < headers.length; c++) {
                      const headerName = headers[c] ? headers[c].toString().toLowerCase() : '';
                      if (headerName.includes('correo') && headerName.includes('administración')) {
                        const maybeEmail = targetRowData[c];
                        if (maybeEmail && String(maybeEmail).includes('@')) {
                          adminInmuebleEmail = String(maybeEmail).trim();
                        }
                        break;
                      }
                    }

                    if (colAuthId > 0) {
                      const authDocId = targetRowData[colAuthId - 1];
                      if (authDocId && authDocId.toString().trim() !== '') {
                        const authFile = DriveApp.getFileById(authDocId);
                        const authPdfBlob = authFile.getAs(MimeType.PDF);
                        
                        const colNombreInmueble = headers.findIndex(h => h && h.toString().toUpperCase().includes('NOMBRE DEL INMUEBLE/ADMINISTRACION'));
                        const nombreInmueble = colNombreInmueble >= 0 ? targetRowData[colNombreInmueble] : 'la Administración';

                        let subjectAuth = `AUTORIZACION DE INGRESO AL INMUEBLE PARA GESTION INMOBILIARIA POR ${nombreCliente} en ${nombreInmueble} - REAL ESTATE Gold Life System`;
                        
                        var templateAuth = HtmlService.createTemplateFromFile('backend/email_autorizacion');
                        templateAuth.NOMBRE_CLIENTE = nombreCliente;
                        templateAuth.NOMBRE_INMUEBLE = nombreInmueble;
                        templateAuth.ADMIN_EMAIL = adminInmuebleEmail || '';
                        templateAuth.ANIO = new Date().getFullYear();
                        var htmlBodyAuth = templateAuth.evaluate().getContent();

                        let optionsAuth = {
                          to: emailCliente,
                          subject: subjectAuth,
                          htmlBody: htmlBodyAuth,
                          attachments: [authPdfBlob]
                        };
                        
                        if (adminInmuebleEmail && adminInmuebleEmail.trim() !== '') {
                          optionsAuth.cc = adminInmuebleEmail.trim();
                        }

                        MailApp.sendEmail(optionsAuth);
                        console.log("Correo de Autorización de Ingreso enviado a: " + emailCliente);
                      }
                    }
                  } else {
                     console.log("No se envía Autorización de Ingreso porque el inmueble no dispone de portería.");
                  }
                } catch(eAuth) {
                  console.error("Error enviando Autorización de Ingreso:", eAuth);
                }
                console.log("Limpieza de script realizada");
              }
            }
            
            // --- NUEVO: Correo al administrador (Sistema) para Cargar Multimedia ---
            try {
              if (datos.cdr) {
                const idRegistroCol = getCol('ID DE REGISTRO');
                let idParaUrl = datos.cdr; // Fallback
                if (idRegistroCol > 0) {
                  const idSheet = sheet.getRange(targetRow, idRegistroCol).getValue();
                  if (idSheet) idParaUrl = idSheet;
                }
                const urlMultimedia = `https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/carga_multimedia.html?id=${encodeURIComponent(idParaUrl)}`;
                const adminEmail = 'realestate.goldlifesystem@gmail.com'; // Correo fijo del sistema
                MailApp.sendEmail({
                  to: adminEmail,
                  subject: `📤 LISTO PARA MULTIMEDIA: Contrato Firmado - ID: ${idParaUrl}`,
                  htmlBody: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
                      <h2 style="color: #D4AF37; text-align: center;">¡Contrato Firmado Exitosamente!</h2>
                      <p style="font-size: 16px; color: #333;">El propietario ha firmado el contrato del inmueble con ID <strong>${idParaUrl}</strong>.</p>
                      <p style="font-size: 16px; color: #333;">Ya puedes proceder a cargar las fotografías y el video en el siguiente enlace:</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${urlMultimedia}" style="background-color: #D4AF37; color: black; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">📤 IR AL PORTAL MULTIMEDIA</a>
                      </div>
                      <p style="font-size: 14px; color: #777;">* El enlace también ha sido inyectado automáticamente en la columna "CARGAR CONTENIDO" de tu Excel.</p>
                    </div>
                  `
                });
                console.log("Correo de aviso multimedia enviado al admin: " + adminEmail);
              }
            } catch(e) {
              console.error("Error enviando email de multimedia al admin:", e);
            }
            
          } catch(e) {
            console.error("Error enviando copia final del PDF:", e);
          }
        }
      }
    }

    return {
      success: true,
      message: "Firma registrada y documento certificado exitosamente.",
      pdfUrl: finalPdf.getUrl()
    };

  } catch (err) {
    console.error("Error en handleProcesarFirmaElectronica:", err);
    return { success: false, message: err.toString() };
  }
}

/**
 * Función para verificar si un documento ya fue firmado
 */
function handleVerificarEstadoFirma(datos) {
  try {
    const docId = datos.docId;
    if (!docId) return { success: false, message: "No docId provided" };
    
    const docFile = DriveApp.getFileById(docId);
    const folder = docFile.getParents().next();
    
    // Buscar si existe la versión en PDF firmada
    const pdfName = docFile.getName() + " - FIRMADO.pdf";
    const files = folder.searchFiles(`title = '${pdfName}'`);
    
    if (files.hasNext()) {
      const finalPdf = files.next();
      return { success: true, firmado: true, pdfUrl: finalPdf.getUrl() };
    } else {
      return { success: true, firmado: false };
    }
  } catch (err) {
    console.error("Error en handleVerificarEstadoFirma:", err);
    return { success: false, message: err.toString() };
  }
}


