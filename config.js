// ==========================================
// CONFIGURACIÓN DEL SISTEMA E-FIRMACONTRATA
// VERSIÓN DE PRODUCCIÓN
// ==========================================

const CONFIG = {
  // URL del Google Apps Script (Backend) - PRODUCCIÓN
  API_URL: 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec',
  
  // URL base del frontend en GitHub Pages
  BASE_URL: 'https://realestate-goldlifesystem.github.io/efirmacontrata',
  
  // Configuración del sistema
  DEBUG: false, // IMPORTANTE: false en producción
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  COMPRESSION_QUALITY: 0.7,
  MAX_CODEUDORES: 3,
  
  // Configuración responsive
  BREAKPOINTS: {
    mobile: 480,
    tablet: 768,
    desktop: 1024
  },
  
  // Mensajes del sistema
  MESSAGES: {
    LINK_INACTIVO: 'Este formulario ya fue completado anteriormente.',
    ERROR_CONEXION: 'Error de conexión. Por favor intente nuevamente.',
    EXITO_ENVIO: 'Formulario enviado exitosamente.',
    CARGANDO: 'Procesando, por favor espere...',
    ERROR_ARCHIVO_GRANDE: 'El archivo excede el tamaño máximo permitido',
    ERROR_FORMATO: 'Formato de archivo no permitido'
  },
  
  // Configuración de pago
  PAGO: {
    NEQUI: '3177623878',
    VALOR: 60000,
    MONEDA: 'COP',
    WOMPI_LINK: 'https://checkout.wompi.co/l/VPOS_jK8Lm7' // Actualizar con link real
  },
  
  // Timeouts y reintentos
  TIMEOUTS: {
    API_CALL: 30000, // 30 segundos
    REDIRECT: 1500, // 1.5 segundos
    MESSAGE_DISPLAY: 5000 // 5 segundos
  },
  
  // Enlaces de documentos SARLAFT
  DOCUMENTOS: {
    SARLAFT_NATURAL: 'https://bit.ly/B114-Persona-Natural',
    SARLAFT_JURIDICA: 'https://bit.ly/B115-Persona-Juridica'
  },
  
  // Validaciones
  VALIDACIONES: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    TELEFONO_REGEX: /^[0-9]{10}$/,
    DOCUMENTO_MIN: 5,
    DOCUMENTO_MAX: 15,
    NOMBRE_MIN: 3,
    NOMBRE_MAX: 120
  }
};

// Función para detectar dispositivo
function detectDevice() {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  
  return {
    isMobile: width <= CONFIG.BREAKPOINTS.mobile || /mobile|android|iphone/.test(userAgent),
    isTablet: width > CONFIG.BREAKPOINTS.mobile && width <= CONFIG.BREAKPOINTS.tablet,
    isDesktop: width > CONFIG.BREAKPOINTS.tablet,
    isTouchDevice: 'ontouchstart' in window
  };
}

// Función para validar email
function validarEmail(email) {
  return CONFIG.VALIDACIONES.EMAIL_REGEX.test(email);
}

// Función para validar teléfono
function validarTelefono(telefono) {
  return CONFIG.VALIDACIONES.TELEFONO_REGEX.test(telefono);
}

// Función para formatear moneda
function formatearMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: CONFIG.PAGO.MONEDA,
    minimumFractionDigits: 0
  }).format(valor);
}

// Función para validar tamaño de archivo
function validarTamanoArchivo(file, esImagen = false) {
  const maxSize = esImagen ? CONFIG.MAX_IMAGE_SIZE : CONFIG.MAX_FILE_SIZE;
  return file.size <= maxSize;
}

// Función para obtener extensión de archivo
function obtenerExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

// Extensiones permitidas
const EXTENSIONES_PERMITIDAS = {
  imagenes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  documentos: ['pdf', 'doc', 'docx'],
  todos: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx']
};

// Función para validar extensión
function validarExtension(filename, tipo = 'todos') {
  const extension = obtenerExtension(filename);
  return EXTENSIONES_PERMITIDAS[tipo].includes(extension);
}

// Log de configuración (solo en desarrollo)
if (CONFIG.DEBUG) {
  console.log('🚀 E-firmaContrata - Modo DEBUG activo');
  console.log('📱 Dispositivo:', detectDevice());
  console.log('🔗 API URL:', CONFIG.API_URL);
  console.log('⚙️ Configuración cargada:', CONFIG);
}

// Prevenir console.log en producción
if (!CONFIG.DEBUG) {
  console.log = function() {};
  console.warn = function() {};
  console.info = function() {};
}

// Exportar configuración (para módulos ES6 si se necesita)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
