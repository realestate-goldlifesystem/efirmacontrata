// ==========================================
// SISTEMA OCR PARA CERTIFICADOS DE TRADICIÓN
// E-firmaContrata v3.0 PRODUCCIÓN
// Real Estate Gold Life System
// ==========================================

// CONFIGURACIÓN DEL SISTEMA
const OCR_CONFIG = {
  TOKEN_CACHE_DURATION: 55 * 60 * 1000, // 55 minutos
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  TIMEOUT: 30000,
  VISION_API_URL: 'https://vision.googleapis.com/v1/images:annotate'
};

// Cache en memoria para el token
const TOKEN_CACHE = {
  token: null,
  expiry: null
};

// ==========================================
// FUNCIÓN PRINCIPAL OCR
// ==========================================

function procesarCertificadoTradicionOCR(archivoBase64) {
  const startTime = Date.now();
  
  try {
    const accessToken = obtenerTokenConCache();
    if (!accessToken) {
      throw new Error('No se pudo obtener token de acceso');
    }
    
    const base64Content = prepararBase64(archivoBase64);
    const texto = llamarVisionAPIConReintentos(base64Content, accessToken);
    
    if (!texto) {
      return {
        exito: false,
        mensaje: 'No se pudo leer el documento',
        datos: null
      };
    }
    
    const datosExtraidos = extraerDatosOptimizado(texto);
    
    return {
      exito: true,
      mensaje: 'Documento procesado correctamente',
      datos: datosExtraidos,
      tiempoProcesamiento: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      exito: false,
      mensaje: error.message,
      datos: null
    };
  }
}

// ==========================================
// GESTIÓN DE TOKEN CON CACHÉ
// ==========================================

function obtenerTokenConCache() {
  try {
    if (TOKEN_CACHE.token && TOKEN_CACHE.expiry && Date.now() < TOKEN_CACHE.expiry) {
      return TOKEN_CACHE.token;
    }
    
    const props = PropertiesService.getScriptProperties();
    const privateKey = props.getProperty('OCR_PRIVATE_KEY');
    const clientEmail = props.getProperty('OCR_CLIENT_EMAIL');
    
    if (!privateKey || !clientEmail) {
      throw new Error('Credenciales OCR no configuradas');
    }
    
    const formattedKey = privateKey.includes('\\n') ? 
      privateKey.replace(/\\n/g, '\n') : privateKey;
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-vision',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };
    
    const jwt = createJWT(payload, formattedKey);
    
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`Google OAuth API Error: ${response.getContentText()}`);
    }
    
    const tokenData = JSON.parse(response.getContentText());
    
    TOKEN_CACHE.token = tokenData.access_token;
    TOKEN_CACHE.expiry = Date.now() + OCR_CONFIG.TOKEN_CACHE_DURATION;
    
    return TOKEN_CACHE.token;
    
  } catch (error) {
    Logger.log('Auth Error in obtenerTokenConCache: ' + error.message);
    throw new Error('Fallo al obtener token: ' + error.message);
  }
}

function createJWT(payload, privateKey) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const signature = Utilities.computeRsaSha256Signature(signatureInput, privateKey);
  const encodedSignature = Utilities.base64EncodeWebSafe(signature);
  
  return `${signatureInput}.${encodedSignature}`;
}

// ==========================================
// LLAMADA A VISION API CON REINTENTOS
// ==========================================

function llamarVisionAPIConReintentos(base64Content, accessToken) {
  let lastError = null;
  
  for (let intento = 1; intento <= OCR_CONFIG.MAX_RETRIES; intento++) {
    try {
      const resultado = llamarVisionAPI(base64Content, accessToken);
      if (resultado) {
        return resultado;
      }
    } catch (error) {
      lastError = error;
      if (intento < OCR_CONFIG.MAX_RETRIES) {
        Utilities.sleep(OCR_CONFIG.RETRY_DELAY * intento);
      }
    }
  }
  
  throw lastError || new Error('No se pudo procesar después de varios intentos');
}

function llamarVisionAPI(base64Content, accessToken) {
  // Detectar si es PDF por su firma base64 (JVBERi0 = %PDF-)
  const isPDF = base64Content.startsWith('JVBERi0');
  
  let endPoint = OCR_CONFIG.VISION_API_URL; // Usualmente https://vision.googleapis.com/v1/images:annotate
  let requestPayload;
  
  if (isPDF) {
    // Para PDFs usar files:annotate
    endPoint = 'https://vision.googleapis.com/v1/files:annotate';
    requestPayload = {
      requests: [{
        inputConfig: {
          content: base64Content,
          mimeType: 'application/pdf'
        },
        features: [{
          type: 'DOCUMENT_TEXT_DETECTION',
          maxResults: 1
        }],
        pages: [1] // Solo analizamos la primera página para ahorrar costos y tiempo
      }]
    };
  } else {
    // Para imágenes estándar usar images:annotate
    endPoint = 'https://vision.googleapis.com/v1/images:annotate';
    requestPayload = {
      requests: [{
        image: {
          content: base64Content
        },
        features: [{
          type: 'TEXT_DETECTION',
          maxResults: 1
        }],
        imageContext: {
          languageHints: ['es']
        }
      }]
    };
  }

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(requestPayload),
    muteHttpExceptions: true,
    timeout: OCR_CONFIG.TIMEOUT / 1000
  };
  
  const response = UrlFetchApp.fetch(endPoint, options);
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Vision API error ${response.getResponseCode()}: ${response.getContentText()}`);
  }
  
  const result = JSON.parse(response.getContentText());
  
  // Analizar respuesta dependiendo del endpoint usado
  if (isPDF) {
    if (result.responses && result.responses[0] && result.responses[0].responses && result.responses[0].responses[0] && result.responses[0].responses[0].fullTextAnnotation) {
      return result.responses[0].responses[0].fullTextAnnotation.text;
    }
  } else {
    if (result.responses && result.responses[0] && result.responses[0].fullTextAnnotation) {
      return result.responses[0].fullTextAnnotation.text;
    }
  }
  
  return null;
}

// ==========================================
// EXTRACCIÓN DE DATOS OPTIMIZADA
// ==========================================

function extraerDatosOptimizado(texto) {
  const textoUpper = texto.toUpperCase();
  
  return {
    matricula: extraerMatriculaOpt(textoUpper),
    direccion: extraerDireccionOpt(texto),
    area: extraerAreaOpt(textoUpper),
    propietarios: extraerPropietariosOpt(texto),
    chip: extraerCHIPOpt(textoUpper),
    ciudad: extraerCiudadOpt(textoUpper),
    estrato: extraerEstratoOpt(textoUpper),
    departamento: extraerDepartamentoOpt(textoUpper),
    municipio: extraerMunicipioOpt(textoUpper),
    vereda: extraerVeredaOpt(textoUpper),
    fechaExpedicion: extraerFechaExpedicionOpt(texto),
    embargo: detectarEmbargosOpt(textoUpper),
    cedulas: extraerCedulasOpt(texto)
  };
}

function extraerMatriculaOpt(textoUpper) {
  const patterns = [
    // Patrón específico para el formato "Nro Matrícula: 50N-20822533" incluso con errores de OCR
    /NRO\s*MATR[^:]*:\s*([0-9A-Z\-]+)/,
    /MATR[ÍI\]CULA\s*INMOBILIARIA[\s:]*([0-9A-Z\-]+)/,
    /MATR[ÍI\]CULA[\s:]*([0-9A-Z\-]+)/,
    /FOLIO DE MATR[ÍI\]CULA[\s:]*([0-9A-Z\-]+)/,
    /N[ÚU]MERO DE MATR[ÍI\]CULA[\s:]*([0-9A-Z\-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = textoUpper.match(pattern);
    // Filtrar falsos positivos como 'ERTIFICADO'
    if (match && match[1] && match[1].length > 3 && !match[1].includes('ERTIFICADO')) {
      return match[1].trim();
    }
  }
  return '';
}

function extraerDireccionOpt(texto) {
  const patterns = [
    /DIRECCI[ÓO\]N DEL INMUEBLE[\s\S]*?1\)\s*([^\n]+)/i,
    /DIRECCI[ÓO\]N[\s:]+([^\n]+)/i,
    /UBICACI[ÓO\]N[\s:]+([^\n]+)/i,
    /INMUEBLE UBICADO EN[\s:]+([^\n]+)/i,
    /(?:CARRERA|CALLE|AVENIDA|TRANSVERSAL|DIAGONAL|CRA|CL)\s+[\d\w\s#\-]+/i
  ];
  
  for (const pattern of patterns) {
    const match = texto.match(pattern);
    if (match) {
      const direccion = match[1] || match[0];
      return direccion.trim().substring(0, 100);
    }
  }
  return '';
}

function extraerAreaOpt(textoUpper) {
  const patterns = [
    /[ÁA]REA[\s:]*([0-9,.\s]+)\s*(?:M2|MTS2|METROS)/,
    /SUPERFICIE[\s:]*([0-9,.\s]+)\s*(?:M2|MTS2|METROS)/,
    /EXTENSI[ÓO]N[\s:]*([0-9,.\s]+)\s*(?:M2|MTS2|METROS)/,
    /([0-9,.\s]+)\s*(?:M2|MTS2|METROS CUADRADOS)/
  ];
  
  for (const pattern of patterns) {
    const match = textoUpper.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s/g, '');
    }
  }
  return '';
}

function extraerPropietariosOpt(texto) {
  const patterns = [
    /PROPIETARIO[S]?[\s:]+([A-ZÁÉÍÓÚÑ\s,]+?)(?:\n|IDENTIFICAD|C[ÉE]DULA|NIT)/i,
    /TITULAR(?:ES)?[\s:]+([A-ZÁÉÍÓÚÑ\s,]+?)(?:\n|IDENTIFICAD|C[ÉE]DULA|NIT)/i,
    /A FAVOR DE[\s:]+([A-ZÁÉÍÓÚÑ\s,]+?)(?:\n|IDENTIFICAD|C[ÉE]DULA|NIT)/i
  ];
  
  for (const pattern of patterns) {
    const match = texto.match(pattern);
    if (match && match[1]) {
      const propietarios = match[1].trim()
        .replace(/\s+/g, ' ')
        .replace(/,\s*$/, '');
      
      if (propietarios.length > 5 && propietarios.length < 200) {
        return propietarios;
      }
    }
  }
  return '';
}

function extraerCHIPOpt(textoUpper) {
  const patterns = [
    /CHIP[\s:]*([A-Z0-9]+)/,
    /C[ÓO]DIGO CHIP[\s:]*([A-Z0-9]+)/,
    /IDENTIFICADOR CHIP[\s:]*([A-Z0-9]+)/
  ];
  
  for (const pattern of patterns) {
    const match = textoUpper.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

function extraerCiudadOpt(textoUpper) {
  const ciudades = [
    'BOGOTÁ', 'BOGOTA', 'MEDELLÍN', 'MEDELLIN', 'CALI', 'BARRANQUILLA',
    'CARTAGENA', 'CÚCUTA', 'CUCUTA', 'BUCARAMANGA', 'PEREIRA', 'SANTA MARTA',
    'IBAGUÉ', 'IBAGUE', 'PASTO', 'MANIZALES', 'VILLAVICENCIO', 'ARMENIA',
    'NEIVA', 'POPAYÁN', 'POPAYAN', 'MONTERÍA', 'MONTERIA', 'VALLEDUPAR',
    'USAQUÉN', 'USAQUEN', 'CHAPINERO', 'SUBA', 'ENGATIVÁ', 'ENGATIVA'
  ];
  
  for (const ciudad of ciudades) {
    if (textoUpper.includes(ciudad)) {
      return ciudad;
    }
  }
  
  return 'BOGOTÁ';
}

function extraerEstratoOpt(textoUpper) {
  const patterns = [
    /ESTRATO\s*(?:SOCIOECON[ÓO]MICO)?\s*[\s:]*([1-6])/,
    /ESTRATO\s+([1-6])(?:\s|$)/,
    /NIVEL\s*(?:SOCIOECON[ÓO]MICO)?\s*[\s:]*([1-6])/
  ];
  
  for (const pattern of patterns) {
    const match = textoUpper.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return '';
}

function extraerDepartamentoOpt(textoUpper) {
  const patterns = [
    /DEPTO[\s:]*([A-ZÁÉÍÓÚÑ\s]+)/,
    /DEPARTAMENTO[\s:]*([A-ZÁÉÍÓÚÑ\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = textoUpper.match(pattern);
    if (match && match[1]) {
      const depto = match[1].trim().split(/\s+/)[0];
      if (depto.length > 3 && depto.length < 20) {
        return depto;
      }
    }
  }
  
  return 'BOGOTÁ D.C.';
}

function extraerMunicipioOpt(textoUpper) {
  const patterns = [
    /MUNICIPIO[\s:]*([A-ZÁÉÍÓÚÑ\s]+)/,
    /CIUDAD[\s:]*([A-ZÁÉÍÓÚÑ\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = textoUpper.match(pattern);
    if (match && match[1]) {
      const municipio = match[1].trim().split(/\s+/)[0];
      if (municipio.length > 3 && municipio.length < 20) {
        return municipio;
      }
    }
  }
  
  return '';
}

function extraerVeredaOpt(textoUpper) {
  const patterns = [
    /VEREDA[\s:]*([A-ZÁÉÍÓÚÑ\s]+)/,
    /SECTOR[\s:]*([A-ZÁÉÍÓÚÑ\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = textoUpper.match(pattern);
    if (match && match[1]) {
      const vereda = match[1].trim().split(/\s+/)[0];
      if (vereda.length > 3 && vereda.length < 20) {
        return vereda;
      }
    }
  }
  
  return '';
}

// ==========================================
// UTILIDADES
// ==========================================

function prepararBase64(archivoBase64) {
  if (archivoBase64.includes(',')) {
    return archivoBase64.split(',')[1];
  }
  return archivoBase64;
}

function limpiarCacheToken() {
  TOKEN_CACHE.token = null;
  TOKEN_CACHE.expiry = null;
}

// ==========================================
// NUEVAS FUNCIONES DE EXTRACCIÓN
// ==========================================

/**
 * Extrae la fecha de expedición del certificado.
 * Busca patrones como "FECHA: 15 de febrero de 2026" o "Expedido el 15/02/2026"
 */
function extraerFechaExpedicionOpt(texto) {
  const meses = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };

  // Patrón 1: "15 de febrero de 2026"
  const patternTexto = /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de(?:l)?\s+)?(\d{4})/gi;
  const matches = [];
  let m;
  while ((m = patternTexto.exec(texto)) !== null) {
    const dia = parseInt(m[1]);
    const mes = meses[m[2].toLowerCase()];
    const anio = parseInt(m[3]);
    if (anio >= 2020 && dia >= 1 && dia <= 31) {
      matches.push(new Date(anio, mes, dia));
    }
  }

  // Patrón 2: "15/02/2026" o "15-02-2026"
  const patternNumerico = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/g;
  while ((m = patternNumerico.exec(texto)) !== null) {
    const dia = parseInt(m[1]);
    const mes = parseInt(m[2]) - 1;
    const anio = parseInt(m[3]);
    if (anio >= 2020 && dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
      matches.push(new Date(anio, mes, dia));
    }
  }

  // Patrón 3: "2026-02-15" (ISO)
  const patternISO = /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/g;
  while ((m = patternISO.exec(texto)) !== null) {
    const anio = parseInt(m[1]);
    const mes = parseInt(m[2]) - 1;
    const dia = parseInt(m[3]);
    if (anio >= 2020 && dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
      matches.push(new Date(anio, mes, dia));
    }
  }

  if (matches.length === 0) return null;

  // Retornar la fecha más reciente (probablemente la de expedición)
  matches.sort((a, b) => b.getTime() - a.getTime());
  return matches[0].toISOString().split('T')[0]; // "2026-02-15"
}

/**
 * Detecta si el inmueble tiene embargos, medidas cautelares o demandas.
 */
function detectarEmbargosOpt(textoUpper) {
  const keywords = [
    'EMBARGO', 'EMBARGADO', 'MEDIDA CAUTELAR', 'MEDIDAS CAUTELARES',
    'DEMANDA', 'DEMANDADO', 'HIPOTECA', 'GRAVAMEN',
    'LIMITACION', 'LIMITACIONES AL DOMINIO',
    'AFECTACION A VIVIENDA FAMILIAR'
  ];

  const alertas = [];
  for (const kw of keywords) {
    if (textoUpper.includes(kw)) {
      alertas.push(kw);
    }
  }

  return {
    tieneEmbargo: alertas.length > 0,
    alertas: alertas
  };
}

/**
 * Extrae números de cédula encontrados en el certificado.
 */
function extraerCedulasOpt(texto) {
  const cedulas = [];
  const patterns = [
    /C[ÉE]DULA[\s\w]*?N[°oO.]?\s*([\d.,]+)/gi,
    /C\.?\s*C\.?\s*(?:N[°oO.]?)?\s*([\d.,]+)/gi,
    /IDENTIFICAD[OA]?\s+(?:CON)?\s+(?:C[ÉE]DULA)?\s*(?:DE CIUDADAN[ÍI]A)?\s*(?:N[°oO.]?)?\s*([\d.,]+)/gi,
    /(?:CC|C\.C\.)\s*([\d.,]+)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(texto)) !== null) {
      const num = match[1].replace(/[.,]/g, '').trim();
      if (num.length >= 5 && num.length <= 12 && !cedulas.includes(num)) {
        cedulas.push(num);
      }
    }
  }

  return cedulas;
}

// ==========================================
// INTEGRACIÓN CON FORMULARIOS
// ==========================================

/**
 * Validación rápida para el formulario del propietario.
 * Solo valida vigencia (<30 días). Retorna resultado rápido.
 */
function validarCertificadoDesdeFormulario(archivoBase64) {
  try {
    const resultado = procesarCertificadoTradicionOCR(archivoBase64);

    if (!resultado.exito || !resultado.datos) {
      return {
        success: false,
        vigente: false,
        mensaje: resultado.mensaje || 'No se pudo leer el documento. Verifica que sea un Certificado de Tradición legible.'
      };
    }

    const datos = resultado.datos;
    let vigente = true;
    let diasAntiguedad = 0;
    let fechaExpedicion = datos.fechaExpedicion || null;

    if (fechaExpedicion) {
      const fechaCert = new Date(fechaExpedicion + 'T12:00:00');
      const hoy = new Date();
      const diffMs = hoy.getTime() - fechaCert.getTime();
      diasAntiguedad = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      vigente = diasAntiguedad <= 30;
    } else {
      // Si no se pudo extraer la fecha, permitir la carga pero advertir
      vigente = true;
      diasAntiguedad = -1; // Indicar que no se detectó
    }

    return {
      success: true,
      vigente: vigente,
      diasAntiguedad: diasAntiguedad,
      fechaExpedicion: fechaExpedicion,
      matricula: datos.matricula || '',
      direccion: datos.direccion || '',
      tiempoProcesamiento: resultado.tiempoProcesamiento
    };

  } catch (error) {
    Logger.log('Error en validarCertificadoDesdeFormulario: ' + error.message);
    return {
      success: false,
      vigente: false,
      mensaje: 'Error al procesar el documento: ' + error.message
    };
  }
}

/**
 * Validación completa para el panel de validación (admin).
 * Incluye: vigencia, embargo, cédula match, nombre match, datos completos.
 */
function validarCertificadoCompletoDesdePanel(archivoBase64, datosPropietario) {
  try {
    const resultado = procesarCertificadoTradicionOCR(archivoBase64);

    if (!resultado.exito || !resultado.datos) {
      return {
        success: false,
        mensaje: resultado.mensaje || 'No se pudo leer el documento'
      };
    }

    const datos = resultado.datos;

    // Validar vigencia
    let vigente = true;
    let diasAntiguedad = 0;
    if (datos.fechaExpedicion) {
      const fechaCert = new Date(datos.fechaExpedicion + 'T12:00:00');
      const hoy = new Date();
      diasAntiguedad = Math.floor((hoy.getTime() - fechaCert.getTime()) / (1000 * 60 * 60 * 24));
      vigente = diasAntiguedad <= 30;
    }

    // Validar cédula
    let cedulaCoincide = false;
    const cedulaProp = (datosPropietario.documento || '').replace(/[.,\s]/g, '');
    if (cedulaProp && datos.cedulas && datos.cedulas.length > 0) {
      cedulaCoincide = datos.cedulas.some(c => c === cedulaProp);
    }

    // Validar nombre (fuzzy: al menos 2 palabras del nombre coinciden)
    let nombreCoincide = false;
    const nombreProp = (datosPropietario.nombre || '').toUpperCase().trim();
    const propietariosFolio = (datos.propietarios || '').toUpperCase().trim();
    if (nombreProp && propietariosFolio) {
      const palabrasNombre = nombreProp.split(/\s+/).filter(p => p.length > 2);
      const coincidencias = palabrasNombre.filter(p => propietariosFolio.includes(p));
      nombreCoincide = coincidencias.length >= 2;
    }

    return {
      success: true,
      // Datos extraídos
      matricula: datos.matricula || 'No detectado',
      direccion: datos.direccion || 'No detectado',
      area: datos.area || '',
      propietariosFolio: datos.propietarios || '',
      chip: datos.chip || '',
      ciudad: datos.ciudad || 'BOGOTÁ',
      estrato: datos.estrato || '',
      // Validaciones
      vigente: vigente,
      diasAntiguedad: diasAntiguedad,
      fechaExpedicion: datos.fechaExpedicion || null,
      tieneEmbargo: datos.embargo.tieneEmbargo,
      alertasEmbargo: datos.embargo.alertas,
      cedulaCoincide: cedulaCoincide,
      cedulasEnFolio: datos.cedulas,
      nombreCoincide: nombreCoincide,
      tiempoProcesamiento: resultado.tiempoProcesamiento
    };

  } catch (error) {
    Logger.log('Error en validarCertificadoCompletoDesdePanel: ' + error.message);
    return {
      success: false,
      mensaje: 'Error al procesar: ' + error.message
    };
  }
}

/**
 * Función legacy — mantener compatibilidad.
 */
function procesarCertificadoDesdeFormulario(archivoBase64) {
  try {
    const resultado = procesarCertificadoTradicionOCR(archivoBase64);
    
    if (resultado.exito && resultado.datos) {
      return {
        success: true,
        matricula: resultado.datos.matricula || 'No detectado',
        direccion: resultado.datos.direccion || 'No detectado',
        area: resultado.datos.area || 'No detectado',
        propietarios: resultado.datos.propietarios || 'No detectado',
        chip: resultado.datos.chip || '',
        ciudad: resultado.datos.ciudad || 'BOGOTÁ',
        estrato: resultado.datos.estrato || '',
        departamento: resultado.datos.departamento || 'BOGOTÁ D.C.',
        municipio: resultado.datos.municipio || '',
        vereda: resultado.datos.vereda || '',
        tiempoProcesamiento: resultado.tiempoProcesamiento
      };
    } else {
      return {
        success: false,
        mensaje: resultado.mensaje || 'No se pudo procesar el documento'
      };
    }
    
  } catch (error) {
    return {
      success: false,
      mensaje: 'Error al procesar el documento'
    };
  }
}

// ==========================================
// PROCESAMIENTO OCR PARA RECIBOS DE SERVICIOS
// ==========================================

function procesarReciboOCR(base64Content) {
  const inicio = new Date();
  
  try {
    const accessToken = obtenerTokenConCache();
    const textoDetectado = llamarVisionAPIConReintentos(base64Content, accessToken);
    
    if (!textoDetectado) {
      return {
        exito: false,
        mensaje: 'La API de Vision no detectó texto en el recibo.',
        tiempoProcesamiento: new Date() - inicio
      };
    }

    const datosExtraidos = extraerDatosRecibo(textoDetectado);
    
    return {
      exito: true,
      datos: datosExtraidos,
      textoCompleto: textoDetectado.substring(0, 500) + '...', // Guardar parte para debug
      tiempoProcesamiento: new Date() - inicio
    };
    
  } catch (error) {
    Logger.log('Error en procesarReciboOCR: ' + error.message);
    return {
      exito: false,
      mensaje: 'Fallo al procesar el recibo OCR: ' + error.message,
      tiempoProcesamiento: new Date() - inicio
    };
  }
}

function extraerDatosRecibo(texto) {
  const textoUpper = texto.toUpperCase();
  
  // Buscar palabras clave de empresas conocidas
  let empresa = 'Desconocida';
  if (textoUpper.includes('ENEL') || textoUpper.includes('CODENSA')) empresa = 'Energía (Enel)';
  else if (textoUpper.includes('ACUEDUCTO') || textoUpper.includes('ALCANTARILLADO')) empresa = 'Acueducto (EAAB)';
  else if (textoUpper.includes('VANTI') || textoUpper.includes('GAS NATURAL')) empresa = 'Gas (Vanti)';
  
  // Extracción de Referencia de Pago / Cuenta (Heurística multicompañía)
  let referencia = '';
  
  const patternsReferencia = [
    // Cuenta Enel / Codensa: "No Cuenta: 12345" o "Cuenta No: 1234567" o "Cliente"
    /CUENTA\s*N[OÓ°]?[\s\S]{0,30}?\b([0-9\-]{5,15})\b/i,
    /N[OÓ°]?\s*CUENTA[\s\S]{0,30}?\b([0-9\-]{5,15})\b/i,
    /CLIENTE[\s\S]{0,40}?\b([0-9\-]{5,15})\b/i,

    // Cuenta Acueducto: "Cuenta Contrato: 123456"
    /CUENTA[\s\S]{0,10}?CONTRATO[\s\S]{0,40}?\b([0-9\-]{4,15})\b/i,
    /CONTRATO[\s\S]{0,30}?\b([0-9\-]{4,15})\b/i,

    // Vanti o General: "Referencia de Pago: 12345" o "Cuenta o referencia de pago"
    /REFERENCIA[\s\S]{0,10}?(?:DE PAGO)?[\s\S]{0,30}?\b([0-9\-]{4,20})\b/i,
    /REF\.?[\s\S]{0,10}?(?:DE PAGO)?[\s\S]{0,30}?\b([0-9\-]{4,20})\b/i,
    
    // Captura para gas "Referencia de pago / cuenta"
    /CUENTA[\s\S]{0,30}?PAGO[\s\S]{0,30}?\b([0-9\-]{4,20})\b/i,

    // Último recurso: un numerotote aislado posicionado después de la palabra REFERENCIA o PAGO
    /PAGO[\s\S]{0,40}?\b([0-9\-]{5,20})\b/i
  ];
  
  for (const pattern of patternsReferencia) {
    const match = textoUpper.match(pattern);
    if (match && match[1]) {
      referencia = match[1].trim();
      break;
    }
  }
  
  return {
    empresa: empresa,
    referenciaPago: referencia || 'No detectada'
  };
}