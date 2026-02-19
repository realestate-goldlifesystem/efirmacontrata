// ==========================================
// GESTOR DE CONTRATOS - E-FIRMACONTRATA v3.0
// Sistema de Generacion y Gestion de Contratos
// Real Estate Gold Life System
// ==========================================

// CONFIGURACION
// CONFIGURACION
const CONTRATO_CONFIG = {
  // Plantillas de Contrato
  PLANTILLA_CORRETAJE_ID: '1MZpzfQAkhHXf5ku6utOvT3QmfpPiEHIW-r1uFSaipAs',
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
 */
function generarContrato(cdr) {
  try {
    console.log(`Iniciando generacion de contrato para CDR: ${cdr}`);

    // 1. Recopilar todos los datos necesarios
    const datosRecopilados = recopilarDatosContrato(cdr);

    if (!datosRecopilados.success) {
      throw new Error(datosRecopilados.message || 'Error recopilando datos');
    }

    const datos = datosRecopilados.data;
    const tipoNegocio = datos.tipoNegocio; // Asegurar que recopilarDatosContrato devuelva esto

    // 2. Seleccionar Plantilla según Tipo de Negocio
    let plantillaId = '';
    let nombreTipoContrato = '';

    if (tipoNegocio === 'Corretaje') {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_CORRETAJE_ID;
      nombreTipoContrato = 'Corretaje';
    } else if (tipoNegocio === 'Administración') {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_ADMINISTRACION_ID;
      nombreTipoContrato = 'Administracion';
    } else if (tipoNegocio === 'Venta') {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_VENTA_ID;
      nombreTipoContrato = 'Venta';
    } else {
      // Default o Arriendo (quizás usar Corretaje como base o definir otro)
      plantillaId = CONTRATO_CONFIG.PLANTILLA_CORRETAJE_ID;
      nombreTipoContrato = 'Arrendamiento';
    }

    if (!plantillaId) {
      throw new Error(`No hay plantilla configurada para el tipo de negocio: ${tipoNegocio}`);
    }

    // 3. Localizar Carpeta Dinámica del Inmueble (Lógica de IDs Estáticos/Dinámicos)
    // Usamos el Link REG o buscamos por CDR en la estructura
    // IMPORTANTE: Aquí asumimos que ya existe la carpeta del inmueble creada en el registro
    const carpetaContratoDestino = buscarCarpetaContratoDinamica(datos);

    if (!carpetaContratoDestino) {
      throw new Error('No se pudo localizar la carpeta "Contrato de Arrendamiento" o equivalente.');
    }

    // 4. Crear copia de la plantilla
    const plantilla = DriveApp.getFileById(plantillaId);

    // Crear nombre unico para el contrato
    const fecha = new Date();
    const fechaFormato = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    // Ejemplo: Contrato_Corretaje_REG-123_2023-10-27
    const nombreContrato = `Contrato_${nombreTipoContrato}_${cdr}_${fechaFormato}`;

    // Crear copia del documento en la carpeta destino
    const copiaContrato = plantilla.makeCopy(nombreContrato, carpetaContratoDestino);
    const docId = copiaContrato.getId();
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();

    // 5. Reemplazar variables en el contrato
    reemplazarVariablesContrato(body, datos);

    // Guardar y cerrar
    doc.saveAndClose();

    // 6. Generar PDF (Opcional, pero recomendado para firma)
    const pdfBlob = doc.getAs(MimeType.PDF);
    const pdfFile = carpetaContratoDestino.createFile(pdfBlob).setName(`${nombreContrato}.pdf`);

    // Obtener URL del documento y PDF
    const urlContrato = doc.getUrl();
    const urlPdf = pdfFile.getUrl();

    // 7. Registrar en log
    registrarGeneracionContrato(cdr, docId, urlContrato);

    // Actualizar estado en la hoja principal
    actualizarEstadoContrato(cdr, 'CONTRATO GENERADO', `✅ Contrato generado (${nombreTipoContrato}). ID: ${docId}`);

    console.log(`Contrato generado exitosamente. ID: ${docId}`);

    return {
      success: true,
      docId: docId,
      url: urlContrato,
      urlPdf: urlPdf,
      carpeta: carpetaContratoDestino.getUrl(),
      message: 'Contrato generado exitosamente'
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
 * Función auxiliar para buscar la carpeta donde guardar el contrato
 * ESTRATEGIA: Buscar carpeta raíz del inmueble por CDR -> Buscar subcarpeta de Contratos
 */
function buscarCarpetaContratoDinamica(datos) {
  try {
    const cdr = datos.cdr;
    const tipoNegocio = datos.tipoNegocio;
    console.log(`Buscando carpeta dinámica para CDR: ${cdr}, Tipo: ${tipoNegocio}`);

    // 1. Obtener carpeta raíz de INMUEBLES
    const rootFolder = DriveApp.getFolderById(CONTRATO_CONFIG.INMUEBLES_ROOT_ID);

    // 2. Buscar carpeta del inmueble que empiece con el CDR
    // Formato esperado: "CDR - DIRECCION - BARRIO"
    const folders = rootFolder.getFolders();
    let inmuebleFolder = null;

    while (folders.hasNext()) {
      const folder = folders.next();
      if (folder.getName().startsWith(cdr + ' -') || folder.getName() === cdr) {
        inmuebleFolder = folder;
        break;
      }
    }

    if (!inmuebleFolder) {
      console.warn(`No se encontró carpeta para CDR: ${cdr} en raíz. Buscando por nombre exacto...`);
      // Fallback: búsqueda exacta si el formato cambió
      const exactFolders = rootFolder.getFoldersByName(cdr);
      if (exactFolders.hasNext()) inmuebleFolder = exactFolders.next();
    }

    if (!inmuebleFolder) {
      throw new Error(`No se encontró la carpeta del inmueble para CDR: ${cdr}`);
    }

    // 3. Buscar subcarpeta según el tipo de negocio
    // Estructura: "3. DOCUMENTACION LEGAL" -> "Contrato de Arrendamiento" ?
    // O directamente "Contrato de Arrendamiento" en la raíz del inmueble?
    // REVISAR JERARQUÍA: Según jerarquia_carpetas.md, es:
    // [CDR] ... > 3- DOCUMENTACION LEGAL > Contrato de Arrendamiento

    // Intentar buscar "3- DOCUMENTACION LEGAL" primero
    let legalFolder = getFolderByName(inmuebleFolder, '3- DOCUMENTACION LEGAL');

    if (!legalFolder) {
      // Si no existe, intentar buscar directamente en la raíz del inmueble
      // O crearla si es necesario (mejor no crear estructura aquí para evitar desorden)
      console.warn('No se encontró "3- DOCUMENTACION LEGAL", buscando en raíz del inmueble');
      legalFolder = inmuebleFolder;
    }

    // 4. Buscar carpeta específica de Contratos
    // Nombre estándar: "Contrato de Arrendamiento" / "Contrato de Corretaje"
    let targetFolderName = 'Contrato de Arrendamiento';

    if (tipoNegocio === 'Corretaje') {
      targetFolderName = 'Contrato de Corretaje';
    } else if (tipoNegocio === 'Venta') {
      targetFolderName = 'Promesa de Compraventa'; // O similar
    }

    let contratoFolder = getFolderByName(legalFolder, targetFolderName);

    // Si no existe, intentar una búsqueda más laxa o crearla
    if (!contratoFolder) {
      // Intentar "Contratos" genérico
      contratoFolder = getFolderByName(legalFolder, 'Contratos');
    }

    if (!contratoFolder) {
      console.log(`Carpeta "${targetFolderName}" no encontrada. Creándola en ${legalFolder.getName()}...`);
      contratoFolder = legalFolder.createFolder(targetFolderName);
    }

    return contratoFolder;

  } catch (e) {
    console.error(`Error crítico buscando carpeta dinámica: ${e.toString()}`);
    // Fallback de emergencia: Carpeta global de contratos
    return DriveApp.getFolderById(CONTRATO_CONFIG.CARPETA_CONTRATOS_ID);
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

    // Buscar la fila del CDR
    let filaEncontrada = null;
    const cdrCol = headers.indexOf('CODIGO DE REGISTRO') + 1;

    for (let i = 2; i <= lastRow; i++) {
      const valorCDR = sheet.getRange(i, cdrCol).getValue();
      if (valorCDR === cdr) {
        filaEncontrada = i;
        break;
      }
    }

    if (!filaEncontrada) {
      throw new Error(`No se encontro el CDR: ${cdr}`);
    }

    // Obtener todos los datos de la fila
    const rowData = sheet.getRange(filaEncontrada, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Funcion auxiliar para obtener valor por nombre de columna
    const obtenerValor = (nombreColumna) => {
      const index = headers.indexOf(nombreColumna);
      return index >= 0 ? rowData[index] : '';
    };

    // Recopilar datos del inquilino
    const inquilino = {
      nombre: obtenerValor('NOMBRE COMPLETO INQUILINO'),
      tipoDocumento: obtenerValor('TIPO DOCUMENTO INQUILINO'),
      numeroDocumento: obtenerValor('NUMERO DOCUMENTO INQUILINO'),
      celular: obtenerValor('CELULAR INQUILINO'),
      email: obtenerValor('CORREO INQUILINO'),
      ocupacion: obtenerValor('OCUPACION INQUILINO')
    };

    // Recopilar datos del propietario
    const propietario = {
      nombre: obtenerValor('Ingrese Nombres y Apellidos'),
      tipoDocumento: obtenerValor('TIPO DOCUMENTO PROPIETARIO'),
      numeroDocumento: obtenerValor('Numero de documento'),
      celular: obtenerValor('Celular'),
      email: obtenerValor('Correo electronico'),
      direccion: obtenerValor('Direccion de residencia'),
      banco: obtenerValor('Banco'),
      tipoCuenta: obtenerValor('Tipo de cuenta'),
      numeroCuenta: obtenerValor('Numero de cuenta')
    };

    // Recopilar datos del inmueble
    const inmueble = {
      direccion: obtenerValor('Direccion del inmueble'),
      matricula: obtenerValor('MATRICULA_INMOBILIARIA'),
      chip: obtenerValor('Chip'),
      estrato: obtenerValor('Estrato'),
      barrio: obtenerValor('Barrio'),
      ciudad: obtenerValor('Ciudad'),
      tipoInmueble: obtenerValor('Tipo de inmueble'),
      area: obtenerValor('AREA_M2'),
      habitaciones: obtenerValor('No. de habitaciones'),
      banos: obtenerValor('No. de banos'),
      garajes: obtenerValor('PARQUEADEROS INMUEBLE'),
      depositos: obtenerValor('Deposito'),
      administracion: obtenerValor('Valor de la administracion')
    };

    // Recopilar datos del contrato
    const contrato = {
      canon: obtenerValor('Canon de arrendamiento'),
      fechaInicio: obtenerValor('FECHA INICIO DEL CONTRATO'),
      duracion: obtenerValor('Duracion del contrato') || '12 meses',
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

    // Verificar datos minimos requeridos
    if (!inquilino.nombre || !propietario.nombre || !inmueble.direccion) {
      throw new Error('Faltan datos esenciales para generar el contrato');
    }

    const datosCompletos = {
      cdr: cdr,
      fechaGeneracion: new Date(),
      inquilino: inquilino,
      propietario: propietario,
      inmueble: inmueble,
      contrato: contrato,
      codeudores: codeudores
    };

    console.log('Datos recopilados exitosamente');

    return {
      success: true,
      data: datosCompletos
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
function reemplazarVariablesContrato(body, datos) {
  try {
    // Formatear fecha actual
    const fechaHoy = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const diaActual = fechaHoy.getDate();
    const mesActual = meses[fechaHoy.getMonth()];
    const anoActual = fechaHoy.getFullYear();

    // Formatear fecha de inicio
    let fechaInicioFormateada = datos.contrato.fechaInicio;
    if (datos.contrato.fechaInicio) {
      const fechaInicio = new Date(datos.contrato.fechaInicio);
      const diaInicio = fechaInicio.getDate();
      const mesInicio = meses[fechaInicio.getMonth()];
      const anoInicio = fechaInicio.getFullYear();
      fechaInicioFormateada = `${diaInicio} de ${mesInicio} de ${anoInicio}`;
    }

    // Formatear canon en texto
    const canonNumero = parseFloat(String(datos.contrato.canon).replace(/[^\d]/g, ''));
    const canonTexto = numeroALetras(canonNumero);

    // Mapa de reemplazos
    const reemplazos = {
      // Datos del contrato
      '{{CDR}}': datos.cdr || '',
      '{{FECHA_HOY}}': `${diaActual} de ${mesActual} de ${anoActual}`,
      '{{DIA_ACTUAL}}': diaActual,
      '{{MES_ACTUAL}}': mesActual,
      '{{ANO_ACTUAL}}': anoActual,

      // Datos del propietario
      '{{NOMBRE_PROPIETARIO}}': datos.propietario.nombre || '',
      '{{TIPO_DOC_PROPIETARIO}}': datos.propietario.tipoDocumento || 'CC',
      '{{DOCUMENTO_PROPIETARIO}}': datos.propietario.numeroDocumento || '',
      '{{DIRECCION_PROPIETARIO}}': datos.propietario.direccion || '',
      '{{CELULAR_PROPIETARIO}}': datos.propietario.celular || '',
      '{{EMAIL_PROPIETARIO}}': datos.propietario.email || '',
      '{{BANCO_PROPIETARIO}}': datos.propietario.banco || '',
      '{{TIPO_CUENTA_PROPIETARIO}}': datos.propietario.tipoCuenta || '',
      '{{NUMERO_CUENTA_PROPIETARIO}}': datos.propietario.numeroCuenta || '',

      // Datos del inquilino
      '{{NOMBRE_INQUILINO}}': datos.inquilino.nombre || '',
      '{{TIPO_DOC_INQUILINO}}': datos.inquilino.tipoDocumento || 'CC',
      '{{DOCUMENTO_INQUILINO}}': datos.inquilino.numeroDocumento || '',
      '{{CELULAR_INQUILINO}}': datos.inquilino.celular || '',
      '{{EMAIL_INQUILINO}}': datos.inquilino.email || '',
      '{{OCUPACION_INQUILINO}}': datos.inquilino.ocupacion || '',

      // Datos del inmueble
      '{{DIRECCION_INMUEBLE}}': datos.inmueble.direccion || '',
      '{{MATRICULA_INMUEBLE}}': datos.inmueble.matricula || '',
      '{{CHIP_INMUEBLE}}': datos.inmueble.chip || '',
      '{{ESTRATO_INMUEBLE}}': datos.inmueble.estrato || '',
      '{{BARRIO_INMUEBLE}}': datos.inmueble.barrio || '',
      '{{CIUDAD_INMUEBLE}}': datos.inmueble.ciudad || 'Bogota D.C.',
      '{{TIPO_INMUEBLE}}': datos.inmueble.tipoInmueble || 'Apartamento',
      '{{AREA_INMUEBLE}}': datos.inmueble.area || '',
      '{{HABITACIONES}}': datos.inmueble.habitaciones || '',
      '{{BANOS}}': datos.inmueble.banos || '',
      '{{GARAJES}}': datos.inmueble.garajes || '0',
      '{{DEPOSITOS}}': datos.inmueble.depositos || '0',
      '{{ADMINISTRACION}}': formatearMoneda(datos.inmueble.administracion) || '$0',

      // Datos economicos del contrato
      '{{CANON_NUMERO}}': formatearMoneda(datos.contrato.canon),
      '{{CANON_LETRAS}}': canonTexto,
      '{{FECHA_INICIO}}': fechaInicioFormateada,
      '{{DURACION_CONTRATO}}': datos.contrato.duracion || '12 meses',
      '{{INCREMENTO_ANUAL}}': datos.contrato.incremento || 'IPC',
      '{{DESTINACION}}': datos.contrato.destinacion || 'Vivienda urbana'
    };

    // Realizar reemplazos
    for (const [variable, valor] of Object.entries(reemplazos)) {
      body.replaceText(variable, valor);
    }

    // Manejar codeudores
    if (datos.codeudores && datos.codeudores.length > 0) {
      // Reemplazar datos del primer codeudor
      if (datos.codeudores[0]) {
        body.replaceText('{{NOMBRE_CODEUDOR1}}', datos.codeudores[0].nombre || '');
        body.replaceText('{{DOCUMENTO_CODEUDOR1}}', datos.codeudores[0].documento || '');
        body.replaceText('{{CELULAR_CODEUDOR1}}', datos.codeudores[0].celular || '');
        body.replaceText('{{EMAIL_CODEUDOR1}}', datos.codeudores[0].email || '');
      }

      // Reemplazar datos del segundo codeudor si existe
      if (datos.codeudores[1]) {
        body.replaceText('{{NOMBRE_CODEUDOR2}}', datos.codeudores[1].nombre || '');
        body.replaceText('{{DOCUMENTO_CODEUDOR2}}', datos.codeudores[1].documento || '');
        body.replaceText('{{CELULAR_CODEUDOR2}}', datos.codeudores[1].celular || '');
        body.replaceText('{{EMAIL_CODEUDOR2}}', datos.codeudores[1].email || '');
      } else {
        // Limpiar variables del segundo codeudor
        body.replaceText('{{NOMBRE_CODEUDOR2}}', 'N/A');
        body.replaceText('{{DOCUMENTO_CODEUDOR2}}', 'N/A');
        body.replaceText('{{CELULAR_CODEUDOR2}}', 'N/A');
        body.replaceText('{{EMAIL_CODEUDOR2}}', 'N/A');
      }

      // Reemplazar datos del tercer codeudor si existe
      if (datos.codeudores[2]) {
        body.replaceText('{{NOMBRE_CODEUDOR3}}', datos.codeudores[2].nombre || '');
        body.replaceText('{{DOCUMENTO_CODEUDOR3}}', datos.codeudores[2].documento || '');
        body.replaceText('{{CELULAR_CODEUDOR3}}', datos.codeudores[2].celular || '');
        body.replaceText('{{EMAIL_CODEUDOR3}}', datos.codeudores[2].email || '');
      } else {
        // Limpiar variables del tercer codeudor
        body.replaceText('{{NOMBRE_CODEUDOR3}}', 'N/A');
        body.replaceText('{{DOCUMENTO_CODEUDOR3}}', 'N/A');
        body.replaceText('{{CELULAR_CODEUDOR3}}', 'N/A');
        body.replaceText('{{EMAIL_CODEUDOR3}}', 'N/A');
      }
    } else {
      // Si no hay codeudores, limpiar todas las variables
      body.replaceText('{{NOMBRE_CODEUDOR1}}', 'N/A');
      body.replaceText('{{DOCUMENTO_CODEUDOR1}}', 'N/A');
      body.replaceText('{{CELULAR_CODEUDOR1}}', 'N/A');
      body.replaceText('{{EMAIL_CODEUDOR1}}', 'N/A');
      body.replaceText('{{NOMBRE_CODEUDOR2}}', 'N/A');
      body.replaceText('{{DOCUMENTO_CODEUDOR2}}', 'N/A');
      body.replaceText('{{CELULAR_CODEUDOR2}}', 'N/A');
      body.replaceText('{{EMAIL_CODEUDOR2}}', 'N/A');
      body.replaceText('{{NOMBRE_CODEUDOR3}}', 'N/A');
      body.replaceText('{{DOCUMENTO_CODEUDOR3}}', 'N/A');
      body.replaceText('{{CELULAR_CODEUDOR3}}', 'N/A');
      body.replaceText('{{EMAIL_CODEUDOR3}}', 'N/A');
    }

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

    // Enviar al inquilino
    enviarEmailRevisionInquilino(
      datos.data.inquilino.email,
      datos.data.inquilino.nombre,
      cdr,
      urlContrato,
      `${baseUrl}/validacion-contrato.html?cdr=${cdr}&tipo=inquilino&docId=${docId}`
    );

    // Enviar al propietario
    enviarEmailRevisionPropietario(
      datos.data.propietario.email,
      datos.data.propietario.nombre,
      cdr,
      urlContrato,
      `${baseUrl}/validacion-contrato.html?cdr=${cdr}&tipo=propietario&docId=${docId}`
    );

    // Enviar a codeudores si existen
    if (datos.data.codeudores && datos.data.codeudores.length > 0) {
      datos.data.codeudores.forEach((codeudor, index) => {
        if (codeudor.email) {
          enviarEmailRevisionCodeudor(
            codeudor.email,
            codeudor.nombre,
            cdr,
            urlContrato,
            `${baseUrl}/validacion-contrato.html?cdr=${cdr}&tipo=codeudor${index + 1}&docId=${docId}`
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
      hojaAprobaciones.getRange(1, 1, 1, 7).setValues([
        ['CDR', 'TIPO', 'ACCION', 'COMENTARIOS', 'FECHA', 'HORA', 'EMAIL']
      ]);
      hojaAprobaciones.getRange(1, 1, 1, 7).setFontWeight('bold');
    }

    // Registrar la aprobacion
    const fecha = new Date();
    const fechaFormato = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const horaFormato = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'HH:mm:ss');

    hojaAprobaciones.appendRow([
      cdr,
      tipo,
      accion,
      comentarios || '',
      fechaFormato,
      horaFormato,
      Session.getActiveUser().getEmail()
    ]);

    // Verificar si todas las partes han aprobado
    const aprobaciones = verificarAprobacionesCompletas(cdr);

    if (aprobaciones.todasAprobadas) {
      // Actualizar estado a CONTRATO APROBADO
      actualizarEstadoContrato(cdr, 'CONTRATO APROBADO', '? Contrato aprobado por todas las partes');

      // Enviar notificacion de contrato aprobado
      enviarNotificacionContratoAprobado(cdr);

      return {
        success: true,
        message: 'Aprobacion registrada. CONTRATO COMPLETAMENTE APROBADO.',
        estadoFinal: 'APROBADO_COMPLETO'
      };
    } else if (accion === 'CAMBIOS_SOLICITADOS') {
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

    // Buscar aprobaciones para este CDR
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === cdr && datos[i][2] === 'APROBADO') {
        const tipo = datos[i][1];
        if (aprobaciones.hasOwnProperty(tipo)) {
          aprobaciones[tipo] = true;
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
    const estados = {};

    // Obtener ultimo estado de cada parte
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === cdr) {
        const tipo = datos[i][1];
        const accion = datos[i][2];
        const fecha = datos[i][4];
        const hora = datos[i][5];

        estados[tipo] = {
          estado: accion,
          fecha: fecha,
          hora: hora,
          comentarios: datos[i][3]
        };
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
  const asunto = `?? Contrato de Arrendamiento para Revision - ${cdr}`;

  const cuerpoHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">?? Contrato para Revision</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Estimado/a <strong>${nombre}</strong>,</p>
        
        <p style="color: #666; line-height: 1.6;">
          El contrato de arrendamiento esta listo para su revision. Por favor, lealo cuidadosamente 
          y confirme si esta de acuerdo con todos los terminos.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #B8860B; margin-top: 0;">?? Documentos para revisar:</h3>
          <p style="color: #666;">
            <a href="${urlContrato}" style="color: #667eea; text-decoration: none;">
              ?? Ver Contrato en Google Docs
            </a>
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlAprobacion}" 
             style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); 
                    color: #1a1a1a; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
            ? REVISAR Y APROBAR CONTRATO
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            ?? <strong>Importante:</strong> Tiene 48 horas para revisar y aprobar el contrato. 
            Si necesita cambios, podra solicitarlos en la plataforma.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #999; font-size: 14px; text-align: center;">
          E-firmaContrata ¡E Real Estate Gold Life System<br>
          Codigo de registro: ${cdr}
        </p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: asunto,
    htmlBody: cuerpoHtml
  });

  Logger.log(`Email de revision enviado a inquilino: ${email}`);
}

/**
 * Enviar email de revision al propietario
 */
function enviarEmailRevisionPropietario(email, nombre, cdr, urlContrato, urlAprobacion) {
  const asunto = `?? Contrato de Arrendamiento para Revision - ${cdr}`;

  const cuerpoHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">?? Contrato para Revision</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Estimado/a <strong>${nombre}</strong>,</p>
        
        <p style="color: #666; line-height: 1.6;">
          El contrato de arrendamiento de su propiedad esta listo para revision. 
          Por favor, verifique que todos los terminos sean correctos.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #B8860B; margin-top: 0;">?? Documentos para revisar:</h3>
          <p style="color: #666;">
            <a href="${urlContrato}" style="color: #667eea; text-decoration: none;">
              ?? Ver Contrato en Google Docs
            </a>
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlAprobacion}" 
             style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); 
                    color: #1a1a1a; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
            ? REVISAR Y APROBAR CONTRATO
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #999; font-size: 14px; text-align: center;">
          E-firmaContrata ¡E Real Estate Gold Life System<br>
          Codigo de registro: ${cdr}
        </p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: asunto,
    htmlBody: cuerpoHtml
  });

  Logger.log(`Email de revision enviado a propietario: ${email}`);
}

/**
 * Enviar email de revision al codeudor
 */
function enviarEmailRevisionCodeudor(email, nombre, cdr, urlContrato, urlAprobacion) {
  const asunto = `?? Contrato de Arrendamiento - Codeudor - ${cdr}`;

  const cuerpoHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">?? Revision como Codeudor</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Estimado/a <strong>${nombre}</strong>,</p>
        
        <p style="color: #666; line-height: 1.6;">
          Ha sido designado como codeudor en un contrato de arrendamiento. 
          Por favor, revise los terminos y responsabilidades antes de aprobar.
        </p>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">?? Responsabilidades del Codeudor:</h3>
          <ul style="color: #155724; line-height: 1.8;">
            <li>Responder solidariamente por el pago del canon</li>
            <li>Garantizar el cumplimiento del contrato</li>
            <li>Asumir obligaciones en caso de incumplimiento del inquilino</li>
          </ul>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #B8860B; margin-top: 0;">?? Documentos para revisar:</h3>
          <p style="color: #666;">
            <a href="${urlContrato}" style="color: #667eea; text-decoration: none;">
              ?? Ver Contrato Completo
            </a>
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlAprobacion}" 
             style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); 
                    color: #1a1a1a; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
            ? REVISAR Y ACEPTAR CODEUDORIA
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #999; font-size: 14px; text-align: center;">
          E-firmaContrata ¡E Real Estate Gold Life System<br>
          Codigo de registro: ${cdr}
        </p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: asunto,
    htmlBody: cuerpoHtml
  });

  Logger.log(`Email de revision enviado a codeudor: ${email}`);
}

/**
 * Enviar notificacion de contrato completamente aprobado
 */
function enviarNotificacionContratoAprobado(cdr) {
  try {
    const datos = recopilarDatosContrato(cdr);

    if (!datos.success) return;

    const asunto = `? Contrato Aprobado - ${cdr}`;

    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">? Contrato Aprobado por Todas las Partes</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">
            Nos complace informarle que el contrato de arrendamiento con codigo 
            <strong>${cdr}</strong> ha sido aprobado por todas las partes.
          </p>
          
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin-top: 0;">? Aprobaciones Completadas:</h3>
            <ul style="color: #065f46;">
              <li>Inquilino: APROBADO</li>
              <li>Propietario: APROBADO</li>
              ${datos.data.codeudores?.map((c, i) => `<li>Codeudor ${i + 1}: APROBADO</li>`).join('') || ''}
            </ul>
          </div>
          
          <p style="color: #666;">
            <strong>Proximos pasos:</strong><br>
            El contrato sera preparado para firma. Recibira instrucciones adicionales proximamente.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            E-firmaContrata ¡E Real Estate Gold Life System<br>
            Codigo de registro: ${cdr}
          </p>
        </div>
      </div>
    `;

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
          htmlBody: cuerpoHtml
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
    const datos = recopilarDatosContrato(cdr);

    if (!datos.success) return;

    const asunto = `?? Cambios Solicitados al Contrato - ${cdr}`;

    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">?? Cambios Solicitados al Contrato</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">
            Se han solicitado cambios al contrato de arrendamiento con codigo <strong>${cdr}</strong>.
          </p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">?? Observaciones:</h3>
            <p style="color: #856404; white-space: pre-wrap;">${observaciones || 'Sin observaciones especificas'}</p>
            <p style="color: #856404; margin-top: 10px;">
              <strong>Solicitado por:</strong> ${solicitante}
            </p>
          </div>
          
          <p style="color: #666;">
            Se realizaran las correcciones solicitadas y se enviara una nueva version del contrato para revision.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            E-firmaContrata ¡E Real Estate Gold Life System<br>
            Codigo de registro: ${cdr}
          </p>
        </div>
      </div>
    `;

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
          htmlBody: cuerpoHtml
        });
      }
    });

    Logger.log(`Notificacion de cambios enviada para CDR: ${cdr}`);

  } catch (error) {
    Logger.log(`Error enviando notificacion de cambios: ${error.toString()}`);
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
    const estadoCol = headers.indexOf('ESTADO DEL INMUEBLE') + 1;
    const detallesCol = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;

    for (let i = 2; i <= lastRow; i++) {
      const valorCDR = sheet.getRange(i, cdrCol).getValue();
      if (valorCDR === cdr) {
        if (estadoCol > 0) {
          sheet.getRange(i, estadoCol).setValue(estado);
        }
        if (detallesCol > 0) {
          sheet.getRange(i, detallesCol).setValue(detalles);
        }
        Logger.log(`Estado actualizado para CDR ${cdr}: ${estado}`);
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
    const data = sheet.getDataRange().getValues();
    const contratos = [];

    // Asumimos estructura de columnas (Ajustar índices según hoja real)
    // CDR (0), Estado (1), Tipo Negocio (4), Canon (5), Inquilino (Variable)
    // Buscamos dinámicamente indices si es posible, o usamos configuración
    // Por simplicidad en este paso, usaremos búsqueda por nombre de cabecera si es posible, o hardcode

    // Indices basados en GESTOR DE ESTADOS.js (aprox)
    // Ajustar según tu hoja real:
    const COL_CDR = 0;
    const COL_ESTADO = 1;
    // ... Necesitamos mapear columnas reales.
    // VERIFICAR: En GESTOR DE ESTADOS.js se usa 'ESTADO DEL INMUEBLE'

    // Mejor estrategia: Leer cabeceras
    const headers = data[0];
    const idxCdr = headers.indexOf('CDR');
    const idxEstado = headers.indexOf('ESTADO DEL INMUEBLE');
    const idxTipo = headers.indexOf('TIPO DE NEGOCIO');
    const idxCanon = headers.indexOf('CANON DE ARRENDAMIENTO');
    const idxInquilino = headers.indexOf('NOMBRE DE ARRENDATARIO'); // O similar

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const estado = row[idxEstado];

      // Criterio: ESTUDIO APROBADO o equivalente
      if (estado === 'ESTUDIO APROBADO') {
        contratos.push({
          cdr: row[idxCdr],
          tipoNegocio: row[idxTipo] || 'N/A',
          canon: row[idxCanon] || '0',
          inquilino: row[idxInquilino] || 'Pendiente'
        });
      }
    }

    return contratos;

  } catch (error) {
    console.error('Error obteniendo contratos pendientes:', error);
    throw new Error('No se pudo cargar la lista de contratos.');
  }
}