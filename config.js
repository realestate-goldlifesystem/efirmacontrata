// ==========================================
// CONFIGURACIÓN DEL SISTEMA E-FIRMACONTRATA
// ==========================================

const CONFIG = {
  // URL de tu Google Apps Script (API Backend)
  // IMPORTANTE: Actualizar con tu ID real después
  API_URL: 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec',
  
  // Configuración del sistema
  DEBUG: true, // Cambiar a false en producción
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
    CARGANDO: 'Procesando, por favor espere...'
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

// Log para debug
if (CONFIG.DEBUG) {
  console.log('🚀 E-firmaContrata Frontend v8.0');
  console.log('📱 Dispositivo:', detectDevice());
  console.log('🔗 API URL:', CONFIG.API_URL);
}
