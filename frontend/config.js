// ==========================================
// CONFIGURACIÓN DEL SISTEMA E-FIRMACONTRATA
// VERSIÓN 3.0 - PRODUCCIÓN
// Real Estate - Gold Life System
// ==========================================

const CONFIG = {
  // ==========================================
  // URLs DEL SISTEMA
  // ==========================================

  // URL del Google Apps Script (Backend) - PRODUCCIÓN
  API_URL: 'https://script.google.com/macros/s/AKfycbzQ_2J62Qam0AW6lo3_KRBQTA0O30zQxVUNJYao-rqXdPTspfBOIhmMmTGBcwhMwpC8dQ/exec',

  // URL base del frontend en GitHub Pages
  BASE_URL: 'https://realestate-goldlifesystem.github.io/efirmacontrata',

  // ==========================================
  // CONFIGURACIÓN DEL SISTEMA
  // ==========================================

  // Modo de operación
  DEBUG: false, // IMPORTANTE: false en producción
  ENVIRONMENT: 'production', // production | staging | development

  // Límites de archivos
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_PDF_SIZE: 15 * 1024 * 1024, // 15MB para PDFs
  COMPRESSION_QUALITY: 0.7,

  // Límites del sistema
  MAX_CODEUDORES: 3,
  MAX_SERVICIOS: 5,
  MAX_INTENTOS_API: 3,

  // ==========================================
  // CONFIGURACIÓN DE PAGOS
  // ==========================================

  PAGO: {
    // Números de pago
    NEQUI: '3177623878',
    DAVIPLATA: '3177623878', // Mismo número para ambos

    // Valores
    VALOR: 60000,
    MONEDA: 'COP',

    // Enlaces de pago
    WOMPI_LINK: 'https://checkout.wompi.co/l/kcweII',

    // Textos de pago
    CONCEPTO: 'Estudio de arrendamiento - E-FirmaContrata',
    REFERENCIA_PREFIX: 'EFC-',

    // Configuración adicional
    PERMITIR_PAGO_PARCIAL: false,
    REQUERIR_COMPROBANTE: true
  },

  // ==========================================
  // CONFIGURACIÓN RESPONSIVE
  // ==========================================

  BREAKPOINTS: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    wide: 1440
  },

  // ==========================================
  // MENSAJES DEL SISTEMA
  // ==========================================

  MESSAGES: {
    // Mensajes de éxito
    SUCCESS: {
      ENVIO: 'Formulario enviado exitosamente.',
      GUARDADO: 'Información guardada correctamente.',
      APROBACION: 'Contrato aprobado exitosamente.',
      DESCARGA: 'Descargando documento...'
    },

    // Mensajes de error
    ERROR: {
      CONEXION: 'Error de conexión. Por favor intente nuevamente.',
      SERVIDOR: 'Error del servidor. Contacte al administrador.',
      ARCHIVO_GRANDE: 'El archivo excede el tamaño máximo permitido.',
      FORMATO: 'Formato de archivo no permitido.',
      CAMPOS_REQUERIDOS: 'Por favor complete todos los campos obligatorios.',
      CDR_INVALIDO: 'Código de registro inválido.',
      SESION_EXPIRADA: 'Su sesión ha expirado. Por favor recargue la página.'
    },

    // Mensajes de advertencia
    WARNING: {
      LINK_INACTIVO: 'Este formulario ya fue completado anteriormente.',
      PAGO_PENDIENTE: 'Pago pendiente de confirmación.',
      DOCUMENTOS_FALTANTES: 'Faltan documentos por cargar.',
      CORRECCION_REQUERIDA: 'Se requieren correcciones en la documentación.'
    },

    // Mensajes informativos
    INFO: {
      CARGANDO: 'Procesando, por favor espere...',
      VERIFICANDO: 'Verificando información...',
      GENERANDO: 'Generando contrato...',
      ENVIANDO_EMAIL: 'Enviando notificación por correo...'
    }
  },

  // ==========================================
  // ENLACES DE DOCUMENTOS
  // ==========================================

  DOCUMENTOS: {
    // Formatos SARLAFT
    SARLAFT_NATURAL: 'https://bit.ly/B114-Persona-Natural',
    SARLAFT_JURIDICA: 'https://bit.ly/B115-Persona-Juridica',

    // Plantillas
    PLANTILLA_CONTRATO: '1zlYZrcue02cK2v-HSWecTyFfp_-_JwNqqknEs9q7q30',

    // Manuales y guías
    MANUAL_USUARIO: `${this.BASE_URL}/docs/manual-usuario.pdf`,
    GUIA_RAPIDA: `${this.BASE_URL}/docs/guia-rapida.pdf`,

    // Términos y condiciones
    TERMINOS: `${this.BASE_URL}/terminos.html`,
    PRIVACIDAD: `${this.BASE_URL}/privacidad.html`
  },

  // ==========================================
  // TIMEOUTS Y REINTENTOS
  // ==========================================

  TIMEOUTS: {
    API_CALL: 30000, // 30 segundos
    FILE_UPLOAD: 60000, // 60 segundos para carga de archivos
    OCR_PROCESSING: 45000, // 45 segundos para OCR
    REDIRECT: 1500, // 1.5 segundos para redirección
    MESSAGE_DISPLAY: 5000, // 5 segundos para mensajes
    TOAST: 3000, // 3 segundos para notificaciones toast
    SESSION: 3600000 // 1 hora de sesión
  },

  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_BASE: 1000, // 1 segundo
    DELAY_MULTIPLIER: 2, // Duplicar el tiempo en cada reintento
    JITTER: true // Agregar variación aleatoria
  },

  // ==========================================
  // VALIDACIONES
  // ==========================================

  VALIDACIONES: {
    // Expresiones regulares
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^3\d{9}$/, // Celular colombiano
    DOCUMENT_REGEX: /^[0-9]{6,12}$/, // Documento 6-12 dígitos
    CDR_REGEX: /^[A-Z0-9]{6,10}$/, // CDR alfanumérico

    // Longitudes
    MIN_PASSWORD: 8,
    MAX_OBSERVACIONES: 500,
    MAX_DIRECCION: 200,

    // Formatos permitidos
    FORMATOS_IMAGEN: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    FORMATOS_DOCUMENTO: ['.pdf'],
    FORMATOS_PERMITIDOS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'],

    // Tipos MIME permitidos
    MIME_TYPES: {
      'image/jpeg': true,
      'image/png': true,
      'image/gif': true,
      'image/webp': true,
      'application/pdf': true
    }
  },

  // ==========================================
  // CONFIGURACIÓN DE FECHAS
  // ==========================================

  FECHAS: {
    FORMATO_DISPLAY: 'DD/MM/YYYY',
    FORMATO_INPUT: 'YYYY-MM-DD',
    FORMATO_COMPLETO: 'DD [de] MMMM [de] YYYY',
    LOCALE: 'es-CO',
    TIMEZONE: 'America/Bogota'
  },

  // ==========================================
  // CONFIGURACIÓN DE MONEDA
  // ==========================================

  MONEDA: {
    CODIGO: 'COP',
    SIMBOLO: '$',
    DECIMALES: 0,
    SEPARADOR_MILES: '.',
    SEPARADOR_DECIMAL: ',',
    FORMATO: {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }
  },

  // ==========================================
  // ESTADOS DEL SISTEMA
  // ==========================================

  ESTADOS: {
    INMUEBLE: {
      PENDIENTE: 'PENDIENTE',
      EN_PROCESO: 'EN_PROCESO',
      DOCUMENTOS_COMPLETOS: 'DOCUMENTOS_COMPLETOS',
      EN_VALIDACION: 'EN_VALIDACION',
      APROBADO: 'APROBADO',
      RECHAZADO: 'RECHAZADO',
      CONTRATO_GENERADO: 'CONTRATO_GENERADO',
      CONTRATO_FIRMADO: 'CONTRATO_FIRMADO',
      ACTIVO: 'ACTIVO',
      INACTIVO: 'INACTIVO'
    },

    DOCUMENTO: {
      PENDIENTE: 'PENDIENTE',
      CARGADO: 'CARGADO',
      VALIDADO: 'VALIDADO',
      RECHAZADO: 'RECHAZADO',
      CORRECCION: 'CORRECCION'
    },

    CONTRATO: {
      DATOS_INCOMPLETOS: 'DATOS_INCOMPLETOS',
      LISTO_PARA_BORRADOR: 'LISTO_PARA_BORRADOR',
      BORRADOR_GENERADO: 'BORRADOR_GENERADO',
      EN_REVISION: 'EN_REVISION',
      CORRECCION_SOLICITADA: 'CORRECCION_SOLICITADA',
      APROBADO_INQUILINO: 'APROBADO_INQUILINO',
      APROBADO_PROPIETARIO: 'APROBADO_PROPIETARIO',
      APROBADO_TOTAL: 'APROBADO_TOTAL',
      FIRMADO: 'FIRMADO',
      FINALIZADO: 'FINALIZADO'
    }
  },

  // ==========================================
  // CONFIGURACIÓN DE LOGS
  // ==========================================

  LOGS: {
    ENABLED: true,
    LEVEL: 'error', // debug | info | warning | error
    SEND_TO_SERVER: true,
    CONSOLE_OUTPUT: false, // false en producción
    MAX_LOG_SIZE: 1000 // Máximo de logs en memoria
  },

  // ==========================================
  // CONFIGURACIÓN DE SEGURIDAD
  // ==========================================

  SECURITY: {
    ENABLE_CAPTCHA: false, // Activar cuando se implemente
    ENABLE_RATE_LIMIT: true,
    MAX_REQUESTS_PER_MINUTE: 30,
    BLOCK_DURATION: 300000, // 5 minutos de bloqueo
    ALLOWED_ORIGINS: [
      'https://realestate-goldlifesystem.github.io',
      'https://script.google.com'
    ],
    CSP_ENABLED: true,
    SANITIZE_INPUT: true
  },

  // ==========================================
  // FEATURES FLAGS (Control de características)
  // ==========================================

  FEATURES: {
    ENABLE_OCR: true,
    ENABLE_PAGOS: true,
    ENABLE_EMAIL_NOTIFICATIONS: true,
    ENABLE_SMS_NOTIFICATIONS: false,
    ENABLE_CONTRATOS: true,
    ENABLE_VALIDACION_DOCUMENTOS: true,
    ENABLE_FIRMA_DIGITAL: false, // Para futuro
    ENABLE_CHAT_SUPPORT: false, // Para futuro
    ENABLE_ANALYTICS: true,
    ENABLE_BACKUP_AUTOMATICO: true
  },

  // ==========================================
  // CONFIGURACIÓN DE ANALYTICS
  // ==========================================

  ANALYTICS: {
    GA_ID: '', // Google Analytics ID cuando se configure
    GTM_ID: '', // Google Tag Manager ID cuando se configure
    TRACK_ERRORS: true,
    TRACK_PERFORMANCE: true,
    TRACK_USER_BEHAVIOR: true
  },

  // ==========================================
  // INFORMACIÓN DEL SISTEMA
  // ==========================================

  SYSTEM: {
    VERSION: '3.0.0',
    BUILD: '2024.01.001',
    LAST_UPDATE: '2024-01-15',
    AUTHOR: 'Real Estate - Gold Life System',
    SUPPORT_EMAIL: 'soporte@goldlifesystem.com',
    SUPPORT_PHONE: '3177623878'
  },

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  // Formatear moneda
  formatCurrency: function (amount) {
    return new Intl.NumberFormat('es-CO', this.MONEDA.FORMATO).format(amount || 0);
  },

  // Validar email
  validateEmail: function (email) {
    return this.VALIDACIONES.EMAIL_REGEX.test(email);
  },

  // Validar teléfono
  validatePhone: function (phone) {
    return this.VALIDACIONES.PHONE_REGEX.test(phone);
  },

  // Validar documento
  validateDocument: function (document) {
    return this.VALIDACIONES.DOCUMENT_REGEX.test(document);
  },

  // Validar CDR
  validateCDR: function (cdr) {
    return this.VALIDACIONES.CDR_REGEX.test(cdr);
  },

  // Obtener mensaje
  getMessage: function (category, key) {
    return this.MESSAGES[category]?.[key] || 'Mensaje no definido';
  },

  // Log condicional (solo si debug está activo)
  log: function (...args) {
    if (this.DEBUG && this.LOGS.CONSOLE_OUTPUT) {
      console.log('[E-FirmaContrata]', ...args);
    }
  },

  // Log de error
  logError: function (...args) {
    if (this.LOGS.ENABLED && this.LOGS.LEVEL !== 'none') {
      console.error('[E-FirmaContrata Error]', ...args);
    }
  },

  // Verificar si una característica está habilitada
  isFeatureEnabled: function (feature) {
    return this.FEATURES[`ENABLE_${feature}`] === true;
  }
};

// ==========================================
// FREEZE CONFIG (Prevenir modificaciones)
// ==========================================
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG);
  Object.freeze(CONFIG.PAGO);
  Object.freeze(CONFIG.MESSAGES);
  Object.freeze(CONFIG.VALIDACIONES);
  Object.freeze(CONFIG.ESTADOS);
  Object.freeze(CONFIG.FEATURES);
}

// ==========================================
// EXPORT (para compatibilidad con módulos)
// ==========================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
