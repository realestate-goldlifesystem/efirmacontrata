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
      throw new Error(`Error obteniendo token: ${response.getContentText()}`);
    }
    
    const tokenData = JSON.parse(response.getContentText());
    
    TOKEN_CACHE.token = tokenData.access_token;
    TOKEN_CACHE.expiry = Date.now() + OCR_CONFIG.TOKEN_CACHE_DURATION;
    
    return TOKEN_CACHE.token;
    
  } catch (error) {
    return null;
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
  const request = {
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
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(request),
    muteHttpExceptions: true,
    timeout: OCR_CONFIG.TIMEOUT / 1000
  };
  
  const response = UrlFetchApp.fetch(OCR_CONFIG.VISION_API_URL, options);
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Vision API error: ${response.getResponseCode()}`);
  }
  
  const result = JSON.parse(response.getContentText());
  
  if (result.responses && result.responses[0] && result.responses[0].fullTextAnnotation) {
    return result.responses[0].fullTextAnnotation.text;
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
    vereda: extraerVeredaOpt(textoUpper)
  };
}

function extraerMatriculaOpt(textoUpper) {
  const patterns = [
    /MATR[ÍI]CULA\s*INMOBILIARIA[\s:]*([0-9A-Z\-]+)/,
    /MATR[ÍI]CULA[\s:]*([0-9A-Z\-]+)/,
    /FOLIO DE MATR[ÍI]CULA[\s:]*([0-9A-Z\-]+)/,
    /N[ÚU]MERO DE MATR[ÍI]CULA[\s:]*([0-9A-Z\-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = textoUpper.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

function extraerDireccionOpt(texto) {
  const patterns = [
    /DIRECCI[ÓO]N[\s:]+([^\n]+)/i,
    /UBICACI[ÓO]N[\s:]+([^\n]+)/i,
    /INMUEBLE UBICADO EN[\s:]+([^\n]+)/i,
    /(?:CARRERA|CALLE|AVENIDA|TRANSVERSAL|DIAGONAL)\s+[\d\w\s#\-]+/i
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
// INTEGRACIÓN CON FORMULARIOS
// ==========================================

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