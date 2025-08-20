// ==========================================
// CONFIGURACIÓN UNIFICADA SISTEMA E-FIRMACONTRATA
// VERSIÓN DE PRODUCCIÓN COMPLETA
// ==========================================

/**
 * Configuración centralizada completa del sistema E-firmaContrata
 * Datos reales de producción - realestate-goldlifesystem
 */
const CONFIG = {
  // ==========================================
  // 1. APIs Y URLs CENTRALIZADAS
  // ==========================================
  
  // URL del Google Apps Script (Backend) - PRODUCCIÓN
  API_URL: 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec',
  
  // Deployment ID del Apps Script
  DEPLOYMENT_ID: 'AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL',
  
  // URLs del frontend en GitHub Pages
  BASE_URL: 'https://realestate-goldlifesystem.github.io/efirmacontrata',
  GITHUB_USER: 'realestate-goldlifesystem',
  REPO_NAME: 'efirmacontrata',
  
  // URLs de formularios específicos
  FORMULARIOS: {
    inquilino: 'https://realestate-goldlifesystem.github.io/efirmacontrata/formulario-inquilino.html',
    propietario: 'https://realestate-goldlifesystem.github.io/efirmacontrata/formulario-propietario.html',
    selector: 'https://realestate-goldlifesystem.github.io/efirmacontrata/selector.html',
    index: 'https://realestate-goldlifesystem.github.io/efirmacontrata/index.html',
    exito: 'https://realestate-goldlifesystem.github.io/efirmacontrata/pagina-exito.html'
  },

  // ==========================================
  // 2. CONFIGURACIÓN DE OCR
  // ==========================================
  
  OCR: {
    // Project ID del Google Cloud Vision API
    PROJECT_ID: 'real-estate-ocr-468904',
    
    // Configuración para el manejo de documentos
    VISION_API_ENDPOINT: 'https://vision.googleapis.com/v1/images:annotate',
    SUPPORTED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    MAX_REQUESTS_PER_MINUTE: 1000,
    CONFIDENCE_THRESHOLD: 0.7,
    
    // Configuración específica para extracción de texto
    FEATURES: {
      TEXT_DETECTION: 'TEXT_DETECTION',
      DOCUMENT_TEXT_DETECTION: 'DOCUMENT_TEXT_DETECTION'
    },
    
    // Configuración de procesamiento
    IMAGE_CONTEXT: {
      languageHints: ['es', 'en']
    }
  },

  // ==========================================
  // 3. LÍMITES Y VALIDACIONES
  // ==========================================
  
  // Tamaños máximos de archivo
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB general
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB imágenes
  COMPRESSION_QUALITY: 0.7,
  
  // Formatos permitidos
  FORMATOS_PERMITIDOS: {
    imagenes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    documentos: ['pdf', 'doc', 'docx'],
    todos: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx']
  },
  
  // Máximo número de codeudores
  MAX_CODEUDORES: 3,
  
  // Validaciones específicas
  VALIDACIONES: {
    // Email validation
    EMAIL_REGEX: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    
    // Teléfono validation (10 dígitos Colombia)
    TELEFONO_REGEX: /^[3][0-9]{9}$/,
    
    // Documento de identidad
    DOCUMENTO_MIN: 5,
    DOCUMENTO_MAX: 15,
    DOCUMENTO_REGEX: /^[0-9]+$/,
    
    // Nombres y apellidos
    NOMBRE_MIN: 2,
    NOMBRE_MAX: 50,
    NOMBRE_REGEX: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
    
    // Dirección
    DIRECCION_MIN: 10,
    DIRECCION_MAX: 200,
    
    // Código de registro
    CODIGO_REGISTRO_REGEX: /^[A-Z0-9_\-()#\s\.]+$/i
  },

  // ==========================================
  // 4. CONFIGURACIÓN DE PAGO
  // ==========================================
  
  PAGO: {
    // Nequi
    NEQUI: '3177623878',
    VALOR: 60000,
    MONEDA: 'COP',
    
    // Link Wompi real (usado en formulario-inquilino.html)
    WOMPI_LINK: 'https://checkout.wompi.co/l/VPOS_kp6q1M',
    
    // Configuración adicional de pago
    METODOS: {
      NEQUI: 'nequi',
      WOMPI: 'wompi',
      TRANSFERENCIA: 'transferencia'
    },
    
    // Datos bancarios adicionales
    BANCO_INFO: {
      nombre: 'Nequi',
      tipo_cuenta: 'Ahorros',
      numero: '3177623878',
      titular: 'E-firmaContrata'
    }
  },

  // ==========================================
  // 5. RESPONSIVE Y DISPOSITIVOS
  // ==========================================
  
  // Breakpoints para dispositivos
  BREAKPOINTS: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    large_desktop: 1440
  },
  
  // Configuración de touch devices
  TOUCH: {
    enabled: true,
    scroll_behavior: 'smooth',
    tap_highlight_color: 'transparent'
  },
  
  // Configuración de viewport
  VIEWPORT: {
    minimum_scale: 1.0,
    maximum_scale: 5.0,
    user_scalable: true
  },

  // ==========================================
  // 6. TIMEOUTS Y REINTENTOS
  // ==========================================
  
  TIMEOUTS: {
    // API calls: 30 segundos
    API_CALL: 30000,
    
    // Upload de archivos: 60 segundos
    FILE_UPLOAD: 60000,
    
    // Redirects: 1.5 segundos
    REDIRECT: 1500,
    
    // Mostrar mensajes: 5 segundos
    MESSAGE_DISPLAY: 5000,
    
    // Timeout para OCR: 45 segundos
    OCR_PROCESSING: 45000
  },
  
  // Configuración de reintentos
  REINTENTOS: {
    // Máximo 3 intentos
    MAX_ATTEMPTS: 3,
    
    // Delays progresivos (ms)
    DELAYS: [1000, 3000, 5000],
    
    // Exponential backoff
    BACKOFF_MULTIPLIER: 2,
    
    // Reintentos para diferentes operaciones
    API_CALLS: 3,
    FILE_UPLOAD: 2,
    OCR_PROCESSING: 2
  },

  // ==========================================
  // 7. MENSAJES DEL SISTEMA
  // ==========================================
  
  MESSAGES: {
    // Mensajes de éxito
    EXITO_ENVIO: '✅ Formulario enviado exitosamente. Recibirá confirmación por email.',
    EXITO_CARGA_ARCHIVO: '✅ Archivo cargado correctamente.',
    EXITO_VALIDACION: '✅ Datos validados correctamente.',
    EXITO_PAGO: '✅ Pago registrado exitosamente.',
    
    // Mensajes de error
    ERROR_CONEXION: '❌ Error de conexión. Por favor intente nuevamente.',
    ERROR_SERVIDOR: '❌ Error interno del servidor. Contacte soporte.',
    ERROR_ARCHIVO_GRANDE: '❌ El archivo excede el tamaño máximo permitido.',
    ERROR_FORMATO: '❌ Formato de archivo no permitido.',
    ERROR_CAMPOS_REQUERIDOS: '❌ Por favor complete todos los campos obligatorios.',
    ERROR_EMAIL_INVALIDO: '❌ El formato del email no es válido.',
    ERROR_TELEFONO_INVALIDO: '❌ El teléfono debe tener 10 dígitos y comenzar con 3.',
    ERROR_DOCUMENTO_INVALIDO: '❌ El número de documento no es válido.',
    
    // Mensajes de validación
    VALIDACION_EMAIL: 'Ingrese un email válido (ejemplo@dominio.com)',
    VALIDACION_TELEFONO: 'Ingrese un teléfono válido de 10 dígitos',
    VALIDACION_DOCUMENTO: 'Ingrese un número de documento válido',
    VALIDACION_NOMBRES: 'Los nombres solo pueden contener letras y espacios',
    
    // Estados del formulario
    CARGANDO: '⏳ Procesando, por favor espere...',
    SUBIENDO_ARCHIVO: '📤 Subiendo archivo...',
    VALIDANDO_DATOS: '🔍 Validando información...',
    PROCESANDO_OCR: '📄 Procesando documento...',
    ENVIANDO_FORMULARIO: '📨 Enviando formulario...',
    
    // Estados específicos
    LINK_INACTIVO: '⚠️ Este formulario ya fue completado anteriormente.',
    SESION_EXPIRADA: '⏰ La sesión ha expirado. Solicite un nuevo enlace.',
    MANTENIMIENTO: '🔧 Sistema en mantenimiento. Intente más tarde.',
    
    // Confirmaciones
    CONFIRMAR_ENVIO: '¿Está seguro de enviar el formulario? Esta acción no se puede deshacer.',
    CONFIRMAR_ARCHIVO_REEMPLAZAR: '¿Desea reemplazar el archivo actual?',
    
    // Instrucciones
    INSTRUCCION_ARCHIVO: 'Seleccione un archivo PDF, JPG o PNG (máximo {size}MB)',
    INSTRUCCION_PAGO: 'Complete el pago de $60.000 COP antes de continuar',
    INSTRUCCION_FORMULARIO: 'Complete todos los campos marcados con (*)'
  },

  // ==========================================
  // 8. CONFIGURACIÓN DE PRODUCCIÓN
  // ==========================================
  
  // DEBUG: false en producción
  DEBUG: false,
  
  // Logs silenciados en producción
  LOGS: {
    enabled: false,
    level: 'error', // solo errores críticos
    console_override: true
  },
  
  // Performance optimizada
  PERFORMANCE: {
    lazy_loading: true,
    image_compression: true,
    file_compression: true,
    cache_enabled: true,
    minify_responses: true
  },
  
  // Configuración de seguridad
  SECURITY: {
    sanitize_inputs: true,
    validate_file_types: true,
    max_request_size: 15 * 1024 * 1024, // 15MB
    csrf_protection: true
  },

  // ==========================================
  // 9. DOCUMENTOS SARLAFT
  // ==========================================
  
  DOCUMENTOS: {
    // Links reales a los formularios SARLAFT (actualizar con URLs reales)
    SARLAFT_NATURAL: 'https://drive.google.com/file/d/1example/view', // Actualizar con URL real
    SARLAFT_JURIDICA: 'https://drive.google.com/file/d/1example_juridica/view', // Actualizar con URL real
    
    // Documentos adicionales
    MANUAL_USUARIO: 'https://realestate-goldlifesystem.github.io/efirmacontrata/docs/manual.pdf',
    TERMINOS_CONDICIONES: 'https://realestate-goldlifesystem.github.io/efirmacontrata/docs/terminos.pdf',
    POLITICA_PRIVACIDAD: 'https://realestate-goldlifesystem.github.io/efirmacontrata/docs/privacidad.pdf',
    
    // Plantillas de contratos
    PLANTILLA_CONTRATO: 'https://docs.google.com/document/d/PLANTILLA_ID/edit',
    
    // Formatos requeridos
    FORMATOS_REQUERIDOS: {
      doc_identidad: ['pdf', 'jpg', 'png'],
      sarlaft: ['pdf'],
      comprobante_ingresos: ['pdf', 'jpg', 'png'],
      referencias: ['pdf']
    }
  },

  // ==========================================
  // 10. CONFIGURACIÓN ADICIONAL
  // ==========================================
  
  // Información de la empresa
  EMPRESA: {
    nombre: 'E-firmaContrata',
    usuario_github: 'realestate-goldlifesystem',
    contacto: {
      email: 'contacto@efirmacontrata.com',
      telefono: '3177623878',
      whatsapp: '573177623878'
    }
  },
  
  // Configuración de analytics (si se implementa)
  ANALYTICS: {
    enabled: false,
    google_analytics_id: null,
    track_events: false
  },
  
  // Configuración de notificaciones
  NOTIFICACIONES: {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: false
  }
};

// ==========================================
// FUNCIONES AUXILIARES DE PRODUCCIÓN
// ==========================================

/**
 * Detecta el tipo de dispositivo del usuario
 * @returns {Object} Información del dispositivo
 */
function detectDevice() {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  
  return {
    isMobile: width <= CONFIG.BREAKPOINTS.mobile || /mobile|android|iphone/.test(userAgent),
    isTablet: width > CONFIG.BREAKPOINTS.mobile && width <= CONFIG.BREAKPOINTS.tablet,
    isDesktop: width > CONFIG.BREAKPOINTS.tablet,
    isLargeDesktop: width > CONFIG.BREAKPOINTS.large_desktop,
    isTouchDevice: 'ontouchstart' in window,
    userAgent: userAgent,
    screenWidth: width,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1
  };
}

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
function validarEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return CONFIG.VALIDACIONES.EMAIL_REGEX.test(email.trim());
}

/**
 * Valida formato de teléfono colombiano
 * @param {string} telefono - Teléfono a validar
 * @returns {boolean} True si es válido
 */
function validarTelefono(telefono) {
  if (!telefono || typeof telefono !== 'string') return false;
  const telefonoLimpio = telefono.replace(/\s|-/g, '');
  return CONFIG.VALIDACIONES.TELEFONO_REGEX.test(telefonoLimpio);
}

/**
 * Valida número de documento
 * @param {string} documento - Documento a validar
 * @returns {boolean} True si es válido
 */
function validarDocumento(documento) {
  if (!documento || typeof documento !== 'string') return false;
  const docLimpio = documento.replace(/\s|-/g, '');
  return CONFIG.VALIDACIONES.DOCUMENTO_REGEX.test(docLimpio) &&
         docLimpio.length >= CONFIG.VALIDACIONES.DOCUMENTO_MIN &&
         docLimpio.length <= CONFIG.VALIDACIONES.DOCUMENTO_MAX;
}

/**
 * Valida nombres y apellidos
 * @param {string} nombre - Nombre a validar
 * @returns {boolean} True si es válido
 */
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string') return false;
  const nombreTrimmed = nombre.trim();
  return CONFIG.VALIDACIONES.NOMBRE_REGEX.test(nombreTrimmed) &&
         nombreTrimmed.length >= CONFIG.VALIDACIONES.NOMBRE_MIN &&
         nombreTrimmed.length <= CONFIG.VALIDACIONES.NOMBRE_MAX;
}

/**
 * Formatea moneda colombiana
 * @param {number} valor - Valor a formatear
 * @returns {string} Valor formateado
 */
function formatearMoneda(valor) {
  if (typeof valor !== 'number') return '$0';
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: CONFIG.PAGO.MONEDA,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
}

/**
 * Valida tamaño de archivo
 * @param {File} file - Archivo a validar
 * @param {boolean} esImagen - Si es una imagen
 * @returns {boolean} True si el tamaño es válido
 */
function validarTamanoArchivo(file, esImagen = false) {
  if (!file || !file.size) return false;
  
  const maxSize = esImagen ? CONFIG.MAX_IMAGE_SIZE : CONFIG.MAX_FILE_SIZE;
  return file.size <= maxSize;
}

/**
 * Obtiene la extensión de un archivo
 * @param {string} filename - Nombre del archivo
 * @returns {string} Extensión en minúsculas
 */
function obtenerExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  return filename.split('.').pop().toLowerCase();
}

/**
 * Valida la extensión de un archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} tipo - Tipo de archivo ('imagenes', 'documentos', 'todos')
 * @returns {boolean} True si la extensión es válida
 */
function validarExtension(filename, tipo = 'todos') {
  if (!filename) return false;
  
  const extension = obtenerExtension(filename);
  const extensionesPermitidas = CONFIG.FORMATOS_PERMITIDOS[tipo] || CONFIG.FORMATOS_PERMITIDOS.todos;
  
  return extensionesPermitidas.includes(extension);
}

/**
 * Valida un archivo completo (tamaño y extensión)
 * @param {File} file - Archivo a validar
 * @param {string} tipo - Tipo esperado
 * @returns {Object} Resultado de validación
 */
function validarArchivo(file, tipo = 'todos') {
  const resultado = {
    valido: true,
    errores: []
  };
  
  if (!file) {
    resultado.valido = false;
    resultado.errores.push('No se ha seleccionado ningún archivo');
    return resultado;
  }
  
  // Validar extensión
  if (!validarExtension(file.name, tipo)) {
    resultado.valido = false;
    resultado.errores.push(`Formato no permitido. Use: ${CONFIG.FORMATOS_PERMITIDOS[tipo].join(', ')}`);
  }
  
  // Validar tamaño
  const esImagen = tipo === 'imagenes' || CONFIG.FORMATOS_PERMITIDOS.imagenes.includes(obtenerExtension(file.name));
  if (!validarTamanoArchivo(file, esImagen)) {
    const maxSize = esImagen ? CONFIG.MAX_IMAGE_SIZE : CONFIG.MAX_FILE_SIZE;
    resultado.valido = false;
    resultado.errores.push(`El archivo excede el tamaño máximo de ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
  }
  
  return resultado;
}

/**
 * Genera un código de registro único
 * @returns {string} Código de registro
 */
function generarCodigoRegistro() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `CDR_${timestamp}_${random}`.toUpperCase();
}

/**
 * Formatea un teléfono para mostrar
 * @param {string} telefono - Teléfono a formatear
 * @returns {string} Teléfono formateado
 */
function formatearTelefono(telefono) {
  if (!telefono) return '';
  const limpio = telefono.replace(/\D/g, '');
  if (limpio.length === 10) {
    return `${limpio.substr(0, 3)} ${limpio.substr(3, 3)} ${limpio.substr(6, 4)}`;
  }
  return telefono;
}

/**
 * Maneja reintentos con backoff exponencial
 * @param {Function} fn - Función a ejecutar
 * @param {number} maxIntentos - Máximo número de intentos
 * @returns {Promise} Promesa de la función
 */
async function ejecutarConReintentos(fn, maxIntentos = CONFIG.REINTENTOS.MAX_ATTEMPTS) {
  let ultimoError;
  
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      return await fn();
    } catch (error) {
      ultimoError = error;
      
      if (intento === maxIntentos) {
        throw ultimoError;
      }
      
      // Esperar antes del siguiente intento
      const delay = CONFIG.REINTENTOS.DELAYS[intento - 1] || 5000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw ultimoError;
}

/**
 * Sanitiza input del usuario
 * @param {string} input - Input a sanitizar
 * @returns {string} Input sanitizado
 */
function sanitizarInput(input) {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remover caracteres peligrosos
    .replace(/\s+/g, ' '); // Normalizar espacios
}

// ==========================================
// INICIALIZACIÓN DE PRODUCCIÓN
// ==========================================

/**
 * Inicializa la configuración de producción
 */
function inicializarConfiguracion() {
  // Silenciar logs en producción
  if (!CONFIG.DEBUG && CONFIG.LOGS.console_override) {
    console.log = function() {};
    console.info = function() {};
    console.warn = function() {};
    // Mantener console.error para errores críticos
  }
  
  // Configurar manejo de errores globales
  window.addEventListener('error', function(event) {
    if (CONFIG.DEBUG) {
      console.error('Error global:', event.error);
    }
    // En producción, enviar errores a un servicio de monitoreo
  });
  
  // Configurar viewport para móviles
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = `width=device-width, initial-scale=${CONFIG.VIEWPORT.minimum_scale}, maximum-scale=${CONFIG.VIEWPORT.maximum_scale}, user-scalable=${CONFIG.VIEWPORT.user_scalable ? 'yes' : 'no'}`;
    document.head.appendChild(viewport);
  }
}

// Log de configuración (solo en desarrollo)
if (CONFIG.DEBUG) {
  console.log('🚀 E-firmaContrata - Configuración de PRODUCCIÓN cargada');
  console.log('📱 Dispositivo detectado:', detectDevice());
  console.log('🔗 API URL:', CONFIG.API_URL);
  console.log('⚙️ Configuración completa:', CONFIG);
} else {
  // En producción, solo log crítico
  console.log('E-firmaContrata v1.0 - Sistema inicializado');
}

// Inicializar configuración cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarConfiguracion);
} else {
  inicializarConfiguracion();
}

// Exportar configuración (para módulos ES6 si se necesita)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    detectDevice,
    validarEmail,
    validarTelefono,
    validarDocumento,
    validarNombre,
    formatearMoneda,
    validarTamanoArchivo,
    obtenerExtension,
    validarExtension,
    validarArchivo,
    generarCodigoRegistro,
    formatearTelefono,
    ejecutarConReintentos,
    sanitizarInput
  };
}

// Hacer CONFIG disponible globalmente
window.CONFIG = CONFIG;