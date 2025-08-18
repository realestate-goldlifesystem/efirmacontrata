// ==========================================
// CONFIGURACIÓN DEL SISTEMA E-FIRMACONTRATA
// ==========================================
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec',
  DEBUG: true,
  MAX_FILE_SIZE: 10 * 1024 * 1024,      // 10MB (PDF / genéricos)
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,      // 5MB (imágenes)
  COMPRESSION_QUALITY: 0.7,             // (Reservado para futura compresión)
  MAX_CODEUDORES: 3,
  MESSAGES: {
    LINK_INACTIVO: 'Este formulario ya fue completado anteriormente.',
    ERROR_CONEXION: 'Error de conexión. Por favor intente nuevamente.',
    EXITO_ENVIO: 'Formulario enviado exitosamente.',
    CARGANDO: 'Procesando, por favor espere...'
  }
};

function detectDevice() {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  return {
    isMobile: width <= 480 || /mobile|android|iphone/.test(userAgent),
    isTablet: width > 480 && width <= 768,
    isDesktop: width > 768,
    isTouchDevice: 'ontouchstart' in window
  };
}

if (CONFIG.DEBUG) {
  console.log('🚀 E-firmaContrata Frontend v8.1');
  console.log('📱 Dispositivo:', detectDevice());
  console.log('🔗 API URL:', CONFIG.API_URL);
}
