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

    // 2. Seleccionar Plantilla según Tipo de Negocio y Versión
    let plantillaId = '';
    let nombreTipoContrato = '';

    if (tipoNegocio === 'Corretaje') {
      plantillaId = version === 'Borrador' ? CONTRATO_CONFIG.PLANTILLA_CORRETAJE_BORRADOR_ID : CONTRATO_CONFIG.PLANTILLA_CORRETAJE_ID;
      nombreTipoContrato = 'Corretaje';
    } else if (tipoNegocio === 'Administracion' || tipoNegocio === 'Administración') {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_ADMINISTRACION_ID || (version === 'Borrador' ? CONTRATO_CONFIG.PLANTILLA_CORRETAJE_BORRADOR_ID : CONTRATO_CONFIG.PLANTILLA_CORRETAJE_ID);
      nombreTipoContrato = 'Administracion';
    } else if (tipoNegocio === 'Venta') {
      plantillaId = CONTRATO_CONFIG.PLANTILLA_VENTA_ID || (version === 'Borrador' ? CONTRATO_CONFIG.PLANTILLA_CORRETAJE_BORRADOR_ID : CONTRATO_CONFIG.PLANTILLA_CORRETAJE_ID);
      nombreTipoContrato = 'Venta';
    } else {
      // Default
      plantillaId = version === 'Borrador' ? CONTRATO_CONFIG.PLANTILLA_CORRETAJE_BORRADOR_ID : CONTRATO_CONFIG.PLANTILLA_CORRETAJE_ID;
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
      datos: datos,
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
    if (!CONTRATO_CONFIG.CARPETA_CONTRATOS_ID) throw new Error("CARPETA_CONTRATOS_ID (fallback) indefinido");
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

    // Función auxiliar para extraer datos del Cerebro (Documento Google)
    let datosCerebro = null;
    try {
      if (typeof abrirDocCerebro === 'function') {
        const doc = abrirDocCerebro(cdr);
        if (doc) {
          datosCerebro = doc.getBody().getText();
        }
      } else {
        console.error("abrirDocCerebro no está definida.");
      }
    } catch (e) {
      console.error("No se pudo leer el Cerebro para el CDR " + cdr, e);
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
      numeroCuenta: extraerCampoCerebro(propietarioText, 'NÚMERO DE CUENTA::') || obtenerValor('Numero de cuenta')
    };

    // Recopilar datos del inmueble
    const inmueble = {
      direccion: obtenerValor('Ingrese la Dirección del inmueble'),
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

    // Verificar datos minimos requeridos
    if (!inquilino.nombre || !propietario.nombre || !inmueble.direccion) {
      throw new Error('Faltan datos esenciales para generar el contrato');
    }

    const datosCompletos = {
      cdr: cdr,
      fechaGeneracion: new Date().toISOString(),
      inquilino: inquilino,
      propietario: propietario,
      inmueble: inmueble,
      contrato: contrato,
      codeudores: codeudores
    };

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
      '{{NOMBRE-DEL-DUEÑO-DE-LA-CUENTA-BANCARIA}}': datos.propietario.nombre || '',
      '{{NUMERO-DE-DOCUMENTO-DEL-DUEÑO-DE LA CUENTA}}': datos.propietario.numeroDocumento || '',

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
      body.replaceText(variable, valor);
    }

    // Manejar codeudores
    if (datos.codeudores && datos.codeudores.length > 0) {
      // Reemplazar datos del primer codeudor
      if (datos.codeudores[0]) {
        body.replaceText('{{NOMBRE_CODEUDOR1}}', datos.codeudores[0].nombre || '');
        body.replaceText('{{NOMBRE-CODEUDOR}}', datos.codeudores[0].nombre || '');
        body.replaceText('{{DOCUMENTO_CODEUDOR1}}', datos.codeudores[0].documento || '');
        body.replaceText('{{NUMERO-DE-DOCUMENTO-CODEUDOR}}', datos.codeudores[0].documento || '');
        body.replaceText('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR}}', 'Colombia');
        body.replaceText('{{CELULAR_CODEUDOR1}}', datos.codeudores[0].celular || '');
        body.replaceText('{{CELULAR-CODEUDOR}}', datos.codeudores[0].celular || '');
        body.replaceText('{{EMAIL_CODEUDOR1}}', datos.codeudores[0].email || '');
        body.replaceText('{{CORREO-CODEUDOR}}', datos.codeudores[0].email || '');
        const parrafoC1 = `${datos.codeudores[0].nombre || ''} con C.C. N° ${datos.codeudores[0].documento || ''} de Colombia`;
        body.replaceText('{{PARRAFO-CODEUDOR-1}}', parrafoC1);
        
        // Nuevas etiquetas
        body.replaceText('{{NOMBRE-CODEUDOR-1}}', datos.codeudores[0].nombre || '');
        body.replaceText('{{NUMERO-DOCUMENTO-CODEUDOR-1}}', datos.codeudores[0].documento || '');
        body.replaceText('{{CELULAR-CODEUDOR-1}}', datos.codeudores[0].celular || '');
        body.replaceText('{{CORREO-CODEUDOR-1}}', datos.codeudores[0].email || '');
      }

      // Reemplazar datos del segundo codeudor si existe
      if (datos.codeudores[1]) {
        body.replaceText('{{NOMBRE_CODEUDOR2}}', datos.codeudores[1].nombre || '');
        body.replaceText('{{NOMBRE-CODEUDOR 2}}', datos.codeudores[1].nombre || '');
        body.replaceText('{{DOCUMENTO_CODEUDOR2}}', datos.codeudores[1].documento || '');
        body.replaceText('{{NUMERO-DE-DOCUMENTO-CODEUDOR-2}}', datos.codeudores[1].documento || '');
        body.replaceText('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-2}}', 'Colombia');
        body.replaceText('{{CELULAR_CODEUDOR2}}', datos.codeudores[1].celular || '');
        body.replaceText('{{CELULAR-CODEUDOR-2}}', datos.codeudores[1].celular || '');
        body.replaceText('{{EMAIL_CODEUDOR2}}', datos.codeudores[1].email || '');
        body.replaceText('{{CORREO-CODEUDOR-2}}', datos.codeudores[1].email || '');
        const parrafoC2 = `${datos.codeudores[1].nombre || ''} con C.C. N° ${datos.codeudores[1].documento || ''} de Colombia`;
        body.replaceText('{{PARRAFO-CODEUDOR-2}}', parrafoC2);
        
        // Nuevas etiquetas
        body.replaceText('{{NOMBRE-CODEUDOR-2}}', datos.codeudores[1].nombre || '');
        body.replaceText('{{NUMERO-DOCUMENTO-CODEUDOR-2}}', datos.codeudores[1].documento || '');
      } else {
        // Limpiar variables del segundo codeudor
        body.replaceText('{{NOMBRE_CODEUDOR2}}', 'N/A');
        body.replaceText('{{NOMBRE-CODEUDOR 2}}', 'N/A');
        body.replaceText('{{DOCUMENTO_CODEUDOR2}}', 'N/A');
        body.replaceText('{{NUMERO-DE-DOCUMENTO-CODEUDOR-2}}', 'N/A');
        body.replaceText('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-2}}', 'N/A');
        body.replaceText('{{CELULAR_CODEUDOR2}}', 'N/A');
        body.replaceText('{{CELULAR-CODEUDOR-2}}', 'N/A');
        body.replaceText('{{EMAIL_CODEUDOR2}}', 'N/A');
        body.replaceText('{{CORREO-CODEUDOR-2}}', 'N/A');
        body.replaceText('{{PARRAFO-CODEUDOR-2}}', '');
        
        // Nuevas etiquetas
        body.replaceText('{{NOMBRE-CODEUDOR-2}}', 'N/A');
        body.replaceText('{{NUMERO-DOCUMENTO-CODEUDOR-2}}', 'N/A');
      }

      // Reemplazar datos del tercer codeudor si existe
      if (datos.codeudores[2]) {
        body.replaceText('{{NOMBRE_CODEUDOR3}}', datos.codeudores[2].nombre || '');
        body.replaceText('{{NOMBRE-CODEUDOR 3}}', datos.codeudores[2].nombre || '');
        body.replaceText('{{DOCUMENTO_CODEUDOR3}}', datos.codeudores[2].documento || '');
        body.replaceText('{{NUMERO-DE-DOCUMENTO-CODEUDOR-3}}', datos.codeudores[2].documento || '');
        body.replaceText('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-3}}', 'Colombia');
        body.replaceText('{{CELULAR_CODEUDOR3}}', datos.codeudores[2].celular || '');
        body.replaceText('{{CELULAR-CODEUDOR-3}}', datos.codeudores[2].celular || '');
        body.replaceText('{{EMAIL_CODEUDOR3}}', datos.codeudores[2].email || '');
        body.replaceText('{{CORREO-CODEUDOR-3}}', datos.codeudores[2].email || '');
        const parrafoC3 = `${datos.codeudores[2].nombre || ''} con C.C. N° ${datos.codeudores[2].documento || ''} de Colombia`;
        body.replaceText('{{PARRAFO-CODEUDOR-3}}', parrafoC3);
        
        // Nuevas etiquetas
        body.replaceText('{{NOMBRE-CODEUDOR-3}}', datos.codeudores[2].nombre || '');
        body.replaceText('{{NUMERO-DOCUMENTO-CODEUDOR-3}}', datos.codeudores[2].documento || '');
      } else {
        // Limpiar variables del tercer codeudor
        body.replaceText('{{NOMBRE_CODEUDOR3}}', 'N/A');
        body.replaceText('{{NOMBRE-CODEUDOR 3}}', 'N/A');
        body.replaceText('{{DOCUMENTO_CODEUDOR3}}', 'N/A');
        body.replaceText('{{NUMERO-DE-DOCUMENTO-CODEUDOR-3}}', 'N/A');
        body.replaceText('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-3}}', 'N/A');
        body.replaceText('{{CELULAR_CODEUDOR3}}', 'N/A');
        body.replaceText('{{CELULAR-CODEUDOR-3}}', 'N/A');
        body.replaceText('{{EMAIL_CODEUDOR3}}', 'N/A');
        body.replaceText('{{CORREO-CODEUDOR-3}}', 'N/A');
        body.replaceText('{{PARRAFO-CODEUDOR-3}}', '');
        
        // Nuevas etiquetas
        body.replaceText('{{NOMBRE-CODEUDOR-3}}', 'N/A');
        body.replaceText('{{NUMERO-DOCUMENTO-CODEUDOR-3}}', 'N/A');
      }
    } else {
      // Si no hay codeudores, limpiar todas las variables
      body.replaceText('{{NOMBRE_CODEUDOR1}}', 'N/A');
      body.replaceText('{{NOMBRE-CODEUDOR}}', 'N/A');
      body.replaceText('{{DOCUMENTO_CODEUDOR1}}', 'N/A');
      body.replaceText('{{NUMERO-DE-DOCUMENTO-CODEUDOR}}', 'N/A');
      body.replaceText('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR}}', 'N/A');
      body.replaceText('{{CELULAR_CODEUDOR1}}', 'N/A');
      body.replaceText('{{CELULAR-CODEUDOR}}', 'N/A');
      body.replaceText('{{EMAIL_CODEUDOR1}}', 'N/A');
      body.replaceText('{{CORREO-CODEUDOR}}', 'N/A');
      body.replaceText('{{NOMBRE_CODEUDOR2}}', 'N/A');
      body.replaceText('{{NOMBRE-CODEUDOR 2}}', 'N/A');
      body.replaceText('{{DOCUMENTO_CODEUDOR2}}', 'N/A');
      body.replaceText('{{NUMERO-DE-DOCUMENTO-CODEUDOR-2}}', 'N/A');
      body.replaceText('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-2}}', 'N/A');
      body.replaceText('{{CELULAR_CODEUDOR2}}', 'N/A');
      body.replaceText('{{CELULAR-CODEUDOR-2}}', 'N/A');
      body.replaceText('{{EMAIL_CODEUDOR2}}', 'N/A');
      body.replaceText('{{CORREO-CODEUDOR-2}}', 'N/A');
      body.replaceText('{{NOMBRE_CODEUDOR3}}', 'N/A');
      body.replaceText('{{NOMBRE-CODEUDOR 3}}', 'N/A');
      body.replaceText('{{DOCUMENTO_CODEUDOR3}}', 'N/A');
      body.replaceText('{{NUMERO-DE-DOCUMENTO-CODEUDOR-3}}', 'N/A');
      body.replaceText('{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-3}}', 'N/A');
      body.replaceText('{{CELULAR_CODEUDOR3}}', 'N/A');
      body.replaceText('{{CELULAR-CODEUDOR-3}}', 'N/A');
      body.replaceText('{{EMAIL_CODEUDOR3}}', 'N/A');
      body.replaceText('{{CORREO-CODEUDOR-3}}', 'N/A');
      body.replaceText('{{PARRAFO-CODEUDOR-1}}', '');
      body.replaceText('{{PARRAFO-CODEUDOR-2}}', '');
      body.replaceText('{{PARRAFO-CODEUDOR-3}}', '');
      
      // Nuevas etiquetas
      body.replaceText('{{NOMBRE-CODEUDOR-1}}', 'N/A');
      body.replaceText('{{NUMERO-DOCUMENTO-CODEUDOR-1}}', 'N/A');
      body.replaceText('{{CELULAR-CODEUDOR-1}}', 'N/A');
      body.replaceText('{{CORREO-CODEUDOR-1}}', 'N/A');
      body.replaceText('{{NOMBRE-CODEUDOR-2}}', 'N/A');
      body.replaceText('{{NUMERO-DOCUMENTO-CODEUDOR-2}}', 'N/A');
      body.replaceText('{{NOMBRE-CODEUDOR-3}}', 'N/A');
      body.replaceText('{{NUMERO-DOCUMENTO-CODEUDOR-3}}', 'N/A');
    }
    
    // Adicionales que están fuera de {{}} o irregulares en tu plantilla:
    body.replaceText('\\(fecha de inicio de contrato\\)', fechaInicioFormateada);
    body.replaceText('20\\(00\\)', anoActual.toString());

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
  const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
  const asunto = `?? Contrato de Arrendamiento para Revision - ${displayId}`;

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
          Codigo de registro: ${displayId}
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
  const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
  const asunto = `?? Contrato de Arrendamiento para Revision - ${displayId}`;

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
          Codigo de registro: ${displayId}
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
  const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
  const asunto = `?? Contrato de Arrendamiento - Codeudor - ${displayId}`;

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
          Codigo de registro: ${displayId}
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
    const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
    const datos = recopilarDatosContrato(cdr);

    if (!datos.success) return;

    const asunto = `? Contrato Aprobado - ${displayId}`;

    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">? Contrato Aprobado por Todas las Partes</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">
            Nos complace informarle que el contrato de arrendamiento con codigo 
            <strong>${displayId}</strong> ha sido aprobado por todas las partes.
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
            Codigo de registro: ${displayId}
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
    const displayId = typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr;
    const datos = recopilarDatosContrato(cdr);

    if (!datos.success) return;

    const asunto = `?? Cambios Solicitados al Contrato - ${displayId}`;

    const cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">?? Cambios Solicitados al Contrato</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">
            Se han solicitado cambios al contrato de arrendamiento con codigo <strong>${displayId}</strong>.
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
            Codigo de registro: ${displayId}
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
    if (!sheet) return [{cdr: "DEBUG-ERROR", estadoBadge: "HOJA_PRINCIPAL NO EXISTE"}];
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [{cdr: "DEBUG-ERROR", estadoBadge: "HOJA SIN DATOS"}];
    
    const contratos = [];
    const headers = data[0].map(h => String(h).trim().toUpperCase());
    
    const idxCdr = headers.indexOf('CODIGO DE REGISTRO');
    const idxEstado = headers.indexOf('ESTADO DEL INMUEBLE');
    const idxDoc = headers.indexOf('ESTADO DOCUMENTAL');
    const idxDetalles = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE');
    const idxTipo = headers.indexOf('TIPO DE INMUEBLE');
    const idxCanon = headers.indexOf('CANON MENSUAL');
    const idxInquilino = headers.indexOf('NOMBRES - INQUILINO');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const cdrValue = idxCdr > -1 ? row[idxCdr] : '';
        const estado = idxEstado > -1 ? String(row[idxEstado]).trim().toUpperCase() : '';
        const estadoDoc = idxDoc > -1 ? String(row[idxDoc]).trim().toUpperCase() : '';
        const detalles = idxDetalles > -1 ? String(row[idxDetalles]).trim().toUpperCase() : '';

        if (
            estado.includes('ESTUDIO APROBADO') || 
            estado.includes('READY_CONTRACT') ||
            estado.includes('CONTRATO GENERADO') ||
            estado.includes('BORRADOR ENVIADO') ||
            estado.includes('EN REVISION') ||
            estadoDoc.includes('VALIDATED') ||
            estadoDoc.includes('READY_CONTRACT') ||
            detalles.includes('CONTRATO GENERADO') ||
            detalles.includes('BORRADOR ENVIADO')
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
    return contratos;
  } catch (err) {
      return [{cdr: "DEBUG-ERROR CRITICO", estadoBadge: err.message}];
  }
}

/**
 * Función para enviar correos de validación a Inquilino y Propietario
 */
function enviarBorradorAValidar(cdr) {
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
    // En este flujo, validacion-contrato.html usará el CDR para obtener el borrador activo.
    const urlContrato = '#'; // El link real al doc lo mostrará el frontend
    
    // Enviar al inquilino
    enviarEmailRevisionInquilino(
      emailInquilino,
      datos.inquilino.nombre,
      cdr,
      urlContrato,
      `${baseURL}/validacion-contrato.html?cdr=${cdr}&parte=inquilino`
    );

    // Enviar al propietario
    enviarEmailRevisionPropietario(
      emailPropietario,
      datos.propietario.nombre,
      cdr,
      urlContrato,
      `${baseURL}/validacion-contrato.html?cdr=${cdr}&parte=propietario`
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
            `${baseURL}/validacion-contrato.html?cdr=${cdr}&parte=codeudor${index + 1}`
          );
        }
      });
    }

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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_APROBACIONES);
    if (!sheet) return { success: true, estados: [] };

    const data = sheet.getDataRange().getValues();
    const estados = [];
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][1] === cdr) {
           estados.push({
               parte: String(data[i][2]).toUpperCase(),
               estado: data[i][3],
               comentarios: data[i][4]
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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTRATO_CONFIG.HOJA_LOG_CONTRATOS);
    if (!sheet) throw new Error("No hay registros de contratos");

    const data = sheet.getDataRange().getValues();
    let url = '';
    
    // Buscar el más reciente
    for (let i = data.length - 1; i > 0; i--) {
      if (data[i][1] === cdr) {
        url = data[i][3]; // URL está en la columna D
        break;
      }
    }

    if (!url) throw new Error("No se encontró URL de borrador para este CDR");

    const datosReq = recopilarDatosContrato(cdr);
    let datos = null;
    if (datosReq.success) datos = datosReq.data;

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
