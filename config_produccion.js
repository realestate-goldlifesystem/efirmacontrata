// ==========================================
// CONFIGURACIÓN CENTRALIZADA E-FIRMACONTRATA
// VERSIÓN DE PRODUCCIÓN
// ==========================================

const CONFIG_PRODUCCION = {
  // ==========================================
  // CONFIGURACIÓN DE ENTORNO
  // ==========================================
  ENTORNO: {
    ES_PRODUCCION: true,
    DEBUG: false, // IMPORTANTE: false en producción
    VERSION: '2.0.0',
    NOMBRE_SISTEMA: 'E-firmaContrata',
    DESCRIPCION: 'Sistema de gestión de contratos de arrendamiento'
  },

  // ==========================================
  // URLs DEL BACKEND (Google Apps Script)
  // ==========================================
  BACKEND: {
    // URL principal del Google Apps Script - PRODUCCIÓN
    API_URL: 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec',
    
    // URLs específicas para diferentes operaciones
    ENDPOINTS: {
      VERIFICAR_LINK: '?accion=verificarLink',
      ENVIAR_FORMULARIO: '?accion=enviarFormulario',
      SUBIR_ARCHIVO: '?accion=subirArchivo',
      VALIDAR_PAGO: '?accion=validarPago',
      PROCESAR_OCR: '?accion=procesarOCR'
    }
  },

  // ==========================================
  // URLs DEL FRONTEND (GitHub Pages)
  // ==========================================
  FRONTEND: {
    // URL base del frontend en GitHub Pages
    BASE_URL: 'https://realestate-goldlifesystem.github.io/efirmacontrata',
    
    // Rutas de formularios
    FORMULARIOS: {
      inquilino: 'formulario-inquilino.html',
      propietario: 'formulario-propietario.html',
      selector: 'selector.html',
      index: 'index.html',
      exito: 'pagina-exito.html'
    },
    
    // Assets
    ASSETS: {
      CSS: 'style.css',
      CONFIG: 'config_produccion.js'
    }
  },

  // ==========================================
  // CONFIGURACIÓN GOOGLE CLOUD VISION API (OCR)
  // ==========================================
  OCR: {
    // Configuración para Google Cloud Vision API
    GOOGLE_CLOUD: {
      // La API key se configura en el backend por seguridad
      API_ENDPOINT: 'https://vision.googleapis.com/v1/images:annotate',
      FEATURES: {
        TEXT_DETECTION: 'TEXT_DETECTION',
        DOCUMENT_TEXT_DETECTION: 'DOCUMENT_TEXT_DETECTION'
      }
    },
    
    // Configuración de procesamiento OCR
    PROCESAMIENTO: {
      CALIDAD_IMAGEN: 0.8,
      MAX_CARACTERES: 10000,
      IDIOMAS_SOPORTADOS: ['es', 'en'],
      TIMEOUT_OCR: 45000, // 45 segundos
      REINTENTOS_MAX: 3
    },
    
    // Tipos de documentos soportados para OCR
    DOCUMENTOS_OCR: {
      CEDULA: {
        nombre: 'Cédula de Ciudadanía',
        campos_esperados: ['numero', 'nombres', 'apellidos', 'fecha_nacimiento']
      },
      PASAPORTE: {
        nombre: 'Pasaporte',
        campos_esperados: ['numero', 'nombres', 'apellidos', 'nacionalidad']
      },
      LICENCIA: {
        nombre: 'Licencia de Conducción',
        campos_esperados: ['numero', 'nombres', 'apellidos', 'categoria']
      }
    }
  },

  // ==========================================
  // IDs DE GOOGLE DRIVE
  // ==========================================
  GOOGLE_DRIVE: {
    // Carpetas principales del sistema
    CARPETAS: {
      // ID de la carpeta principal de contratos
      CONTRATOS_PRINCIPAL: '1BmxvU8XfF7yQZ9KpL3nM4sR2tC6vN8wE',
      
      // Subcarpetas por tipo
      INQUILINOS: '1DfgH9JkL2mN4oPqR5sT7uV9wX1yZ3aB',
      PROPIETARIOS: '1GhI2jK3l4MnO5pQ6rS7tU8vW9xY0zB',
      
      // Carpetas para documentos específicos
      DOCUMENTOS_IDENTIDAD: '1JkL3mN4oP5qR6sT7uV8wX9yZ0aB1cD',
      DOCUMENTOS_INGRESOS: '1MnO4pQ5rS6tU7vW8xY9zA0bC1dE2fG',
      DOCUMENTOS_SARLAFT: '1PqR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ',
      
      // Carpeta temporal para procesamiento
      TEMP: '1StuV7wX8yZ9aB0cD1eF2gH3iJ4kL5m',
      
      // Carpeta de archivos rechazados
      RECHAZADOS: '1VwX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP'
    },
    
    // Templates de documentos
    TEMPLATES: {
      CONTRATO_INQUILINO: '1YzA0bC1dE2fG3hI4jK5lM6nO7pQ8rS',
      CONTRATO_PROPIETARIO: '1BcD1eF2gH3iJ4kL5mN6oP7qR8sT9uV',
      PAGARE: '1EfG2hI3jK4lM5nO6pQ7rS8tU9vW0xY',
      AUTORIZACION_CENTRALES: '1HiJ3kL4mN5oP6qR7sT8uV9wX0yZ1aB'
    }
  },

  // ==========================================
  // CONFIGURACIÓN DE ARCHIVOS Y VALIDACIONES
  // ==========================================
  ARCHIVOS: {
    // Límites de tamaño
    TAMANOS: {
      MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
      MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
      MIN_FILE_SIZE: 1024, // 1KB mínimo
      COMPRESSION_QUALITY: 0.7
    },
    
    // Extensiones permitidas
    EXTENSIONES: {
      imagenes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
      documentos: ['pdf', 'doc', 'docx'],
      todos: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'pdf', 'doc', 'docx']
    },
    
    // Tipos MIME permitidos
    MIME_TYPES: {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    }
  },

  // ==========================================
  // MENSAJES DEL SISTEMA UNIFICADOS
  // ==========================================
  MENSAJES: {
    // Estados de formularios
    FORMULARIO: {
      LINK_INACTIVO: 'Este formulario ya fue completado anteriormente.',
      ENVIADO_EXITOSO: 'Formulario enviado exitosamente.',
      ERROR_ENVIO: 'Error al enviar el formulario. Por favor intente nuevamente.',
      DATOS_INCOMPLETOS: 'Por favor complete todos los campos requeridos.',
      GUARDADO_TEMPORAL: 'Datos guardados temporalmente.'
    },
    
    // Conexión y errores de red
    CONEXION: {
      ERROR_CONEXION: 'Error de conexión. Por favor intente nuevamente.',
      TIMEOUT_CONEXION: 'Tiempo de espera agotado. Verifique su conexión.',
      ERROR_SERVIDOR: 'Error en el servidor. Intente más tarde.',
      SIN_INTERNET: 'Sin conexión a internet. Verifique su red.'
    },
    
    // Estados de carga
    CARGA: {
      PROCESANDO: 'Procesando, por favor espere...',
      SUBIENDO_ARCHIVO: 'Subiendo archivo, no cierre esta ventana...',
      VALIDANDO_DATOS: 'Validando información...',
      GENERANDO_DOCUMENTO: 'Generando documento...',
      PROCESANDO_OCR: 'Procesando reconocimiento de texto...'
    },
    
    // Archivos
    ARCHIVOS: {
      ERROR_ARCHIVO_GRANDE: 'El archivo excede el tamaño máximo permitido',
      ERROR_FORMATO: 'Formato de archivo no permitido',
      ERROR_ARCHIVO_CORRUPTO: 'El archivo parece estar dañado',
      ARCHIVO_SUBIDO: 'Archivo cargado correctamente',
      ERROR_LECTURA: 'Error al leer el archivo'
    },
    
    // OCR
    OCR: {
      PROCESANDO: 'Extrayendo información del documento...',
      EXITO: 'Información extraída correctamente',
      ERROR_CALIDAD: 'La calidad de la imagen no permite leer el texto',
      ERROR_FORMATO_DOC: 'Tipo de documento no reconocido',
      ERROR_PROCESAMIENTO: 'Error al procesar el documento'
    },
    
    // Validaciones
    VALIDACION: {
      EMAIL_INVALIDO: 'Por favor ingrese un email válido',
      TELEFONO_INVALIDO: 'El teléfono debe tener 10 dígitos',
      DOCUMENTO_INVALIDO: 'Número de documento inválido',
      NOMBRE_INVALIDO: 'El nombre debe tener entre 3 y 120 caracteres',
      CAMPO_REQUERIDO: 'Este campo es requerido'
    },
    
    // Pago
    PAGO: {
      PENDIENTE: 'Pago pendiente de confirmación',
      CONFIRMADO: 'Pago confirmado exitosamente',
      ERROR_PAGO: 'Error al procesar el pago',
      VALOR_INCORRECTO: 'El valor del pago no coincide'
    }
  },

  // ==========================================
  // CONFIGURACIÓN RESPONSIVE Y DISPOSITIVOS
  // ==========================================
  DISPOSITIVOS: {
    // Breakpoints responsive
    BREAKPOINTS: {
      mobile: 480,
      tablet: 768,
      desktop: 1024,
      large: 1440
    },
    
    // Configuraciones específicas por dispositivo
    MOBILE: {
      max_file_uploads: 3,
      compression_quality: 0.6,
      timeout_multiplier: 1.5
    },
    
    TABLET: {
      max_file_uploads: 5,
      compression_quality: 0.7,
      timeout_multiplier: 1.2
    },
    
    DESKTOP: {
      max_file_uploads: 10,
      compression_quality: 0.8,
      timeout_multiplier: 1.0
    }
  },

  // ==========================================
  // CONFIGURACIÓN DE TIMEOUTS Y REINTENTOS
  // ==========================================
  TIMEOUTS: {
    // Llamadas API
    API_CALL: 30000, // 30 segundos
    API_CALL_UPLOAD: 120000, // 2 minutos para subida de archivos
    API_CALL_OCR: 60000, // 1 minuto para OCR
    
    // UI
    REDIRECT: 1500, // 1.5 segundos
    MESSAGE_DISPLAY: 5000, // 5 segundos
    LOADING_MIN: 1000, // 1 segundo mínimo de loading
    
    // Reintentos
    RETRY_DELAY: 2000, // 2 segundos entre reintentos
    MAX_RETRIES: 3,
    EXPONENTIAL_BACKOFF: true
  },

  // ==========================================
  // CONFIGURACIÓN DE PAGO (Nequi/Wompi)
  // ==========================================
  PAGO: {
    // Nequi
    NEQUI: {
      numero: '3177623878',
      nombre: 'Sistema E-firmaContrata'
    },
    
    // Wompi
    WOMPI: {
      link: 'https://checkout.wompi.co/l/VPOS_jK8Lm7',
      public_key: 'pub_test_', // Se configura en backend
      currency: 'COP'
    },
    
    // Valores y configuración
    CONFIGURACION: {
      VALOR_CONTRATO: 60000,
      MONEDA: 'COP',
      DESCRIPCION: 'Elaboración de contrato de arrendamiento',
      IMPUESTOS: 0, // Sin impuestos por ahora
      COMISION_PLATAFORMA: 0.03 // 3% de comisión
    }
  },

  // ==========================================
  // VALIDACIONES Y REGLAS DE NEGOCIO
  // ==========================================
  VALIDACIONES: {
    // Expresiones regulares
    REGEX: {
      EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      TELEFONO: /^[0-9]{10}$/,
      DOCUMENTO: /^[0-9]{5,15}$/,
      NOMBRE: /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]{3,120}$/,
      DIRECCION: /^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ\s#\-.,]{10,200}$/
    },
    
    // Límites numéricos
    LIMITES: {
      DOCUMENTO_MIN: 5,
      DOCUMENTO_MAX: 15,
      NOMBRE_MIN: 3,
      NOMBRE_MAX: 120,
      TELEFONO_DIGITOS: 10,
      DIRECCION_MIN: 10,
      DIRECCION_MAX: 200,
      MAX_CODEUDORES: 3
    },
    
    // Listas de valores permitidos
    LISTAS: {
      TIPOS_DOCUMENTO: ['CC', 'CE', 'PA', 'TI'],
      ESTADOS_CIVIL: ['soltero', 'casado', 'union_libre', 'divorciado', 'viudo'],
      TIPOS_CONTRATO: ['empleado', 'independiente', 'pensionado', 'estudiante'],
      NIVELES_EDUCACION: ['primaria', 'bachillerato', 'tecnico', 'universitario', 'postgrado']
    }
  },

  // ==========================================
  // ENLACES DE DOCUMENTOS
  // ==========================================
  DOCUMENTOS: {
    // Documentos SARLAFT
    SARLAFT: {
      PERSONA_NATURAL: 'https://bit.ly/B114-Persona-Natural',
      PERSONA_JURIDICA: 'https://bit.ly/B115-Persona-Juridica'
    },
    
    // Documentos legales
    LEGALES: {
      TERMINOS_CONDICIONES: 'https://realestate-goldlifesystem.github.io/efirmacontrata/terminos.html',
      POLITICA_PRIVACIDAD: 'https://realestate-goldlifesystem.github.io/efirmacontrata/privacidad.html',
      MANUAL_USUARIO: 'https://realestate-goldlifesystem.github.io/efirmacontrata/manual.html'
    },
    
    // Ayuda y soporte
    AYUDA: {
      FAQ: 'https://realestate-goldlifesystem.github.io/efirmacontrata/faq.html',
      CONTACTO: 'https://realestate-goldlifesystem.github.io/efirmacontrata/contacto.html',
      TUTORIAL_VIDEO: 'https://youtu.be/ejemplo'
    }
  },

  // ==========================================
  // SISTEMA DE LOGS DE PRODUCCIÓN
  // ==========================================
  LOGS: {
    // Niveles de log
    NIVELES: {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    },
    
    // Configuración de producción (silenciar logs)
    PRODUCCION: {
      NIVEL_ACTIVO: 0, // Solo errores
      CONSOLE_ACTIVO: false,
      LOG_REMOTO: true,
      ENDPOINT_LOGS: 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec?accion=log'
    }
  }
};

// ==========================================
// DETECCIÓN AUTOMÁTICA DE ENTORNO
// ==========================================
function detectarEntorno() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  return {
    esProduccion: hostname === 'realestate-goldlifesystem.github.io' && protocol === 'https:',
    esDesarrollo: hostname === 'localhost' || hostname === '127.0.0.1',
    esPrueba: hostname.includes('test') || hostname.includes('staging'),
    hostName: hostname,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
}

// ==========================================
// VALIDACIONES DE CONFIGURACIÓN
// ==========================================
function validarConfiguracion() {
  const errores = [];
  
  // Validar URLs críticas
  if (!CONFIG_PRODUCCION.BACKEND.API_URL) {
    errores.push('API_URL no configurada');
  }
  
  if (!CONFIG_PRODUCCION.FRONTEND.BASE_URL) {
    errores.push('BASE_URL no configurada');
  }
  
  // Validar configuración de pago
  if (!CONFIG_PRODUCCION.PAGO.NEQUI.numero) {
    errores.push('Número Nequi no configurado');
  }
  
  // Validar IDs de Google Drive
  const carpetas = CONFIG_PRODUCCION.GOOGLE_DRIVE.CARPETAS;
  for (const [nombre, id] of Object.entries(carpetas)) {
    if (!id || id.length < 10) {
      errores.push(`ID de carpeta ${nombre} inválido`);
    }
  }
  
  return {
    valida: errores.length === 0,
    errores: errores
  };
}

// ==========================================
// FUNCIONES AUXILIARES DE DISPOSITIVO
// ==========================================
function detectarDispositivo() {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  
  return {
    isMobile: width <= CONFIG_PRODUCCION.DISPOSITIVOS.BREAKPOINTS.mobile || /mobile|android|iphone/.test(userAgent),
    isTablet: width > CONFIG_PRODUCCION.DISPOSITIVOS.BREAKPOINTS.mobile && width <= CONFIG_PRODUCCION.DISPOSITIVOS.BREAKPOINTS.tablet,
    isDesktop: width > CONFIG_PRODUCCION.DISPOSITIVOS.BREAKPOINTS.tablet,
    isTouchDevice: 'ontouchstart' in window,
    screenWidth: width,
    screenHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1
  };
}

// ==========================================
// FUNCIONES DE VALIDACIÓN COMUNES
// ==========================================
function validarEmail(email) {
  return CONFIG_PRODUCCION.VALIDACIONES.REGEX.EMAIL.test(email);
}

function validarTelefono(telefono) {
  return CONFIG_PRODUCCION.VALIDACIONES.REGEX.TELEFONO.test(telefono);
}

function validarDocumento(documento) {
  return CONFIG_PRODUCCION.VALIDACIONES.REGEX.DOCUMENTO.test(documento);
}

function validarNombre(nombre) {
  return CONFIG_PRODUCCION.VALIDACIONES.REGEX.NOMBRE.test(nombre);
}

function formatearMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: CONFIG_PRODUCCION.PAGO.CONFIGURACION.MONEDA,
    minimumFractionDigits: 0
  }).format(valor);
}

function validarTamanoArchivo(file, esImagen = false) {
  const maxSize = esImagen ? 
    CONFIG_PRODUCCION.ARCHIVOS.TAMANOS.MAX_IMAGE_SIZE : 
    CONFIG_PRODUCCION.ARCHIVOS.TAMANOS.MAX_FILE_SIZE;
  
  return file.size <= maxSize && file.size >= CONFIG_PRODUCCION.ARCHIVOS.TAMANOS.MIN_FILE_SIZE;
}

function obtenerExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function validarExtension(filename, tipo = 'todos') {
  const extension = obtenerExtension(filename);
  return CONFIG_PRODUCCION.ARCHIVOS.EXTENSIONES[tipo].includes(extension);
}

function obtenerConfiguracionDispositivo() {
  const dispositivo = detectarDispositivo();
  
  if (dispositivo.isMobile) {
    return CONFIG_PRODUCCION.DISPOSITIVOS.MOBILE;
  } else if (dispositivo.isTablet) {
    return CONFIG_PRODUCCION.DISPOSITIVOS.TABLET;
  } else {
    return CONFIG_PRODUCCION.DISPOSITIVOS.DESKTOP;
  }
}

// ==========================================
// SISTEMA DE LOGS INTELIGENTE
// ==========================================
function configurarLogs() {
  const config = CONFIG_PRODUCCION.LOGS.PRODUCCION;
  
  // En producción, silenciar console logs
  if (!config.CONSOLE_ACTIVO) {
    console.log = function() {};
    console.info = function() {};
    console.warn = function() {};
    // Mantener console.error para errores críticos
  }
  
  // Función de log personalizada
  window.logSistema = function(nivel, mensaje, datos = {}) {
    if (nivel <= config.NIVEL_ACTIVO) {
      // Log local si está permitido
      if (config.CONSOLE_ACTIVO) {
        console.log(`[${new Date().toISOString()}] ${mensaje}`, datos);
      }
      
      // Log remoto si está configurado
      if (config.LOG_REMOTO) {
        enviarLogRemoto(nivel, mensaje, datos);
      }
    }
  };
}

function enviarLogRemoto(nivel, mensaje, datos) {
  try {
    fetch(CONFIG_PRODUCCION.LOGS.PRODUCCION.ENDPOINT_LOGS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nivel: nivel,
        mensaje: mensaje,
        datos: datos,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(() => {}); // Silenciar errores de logging
  } catch (error) {
    // Silenciar errores de logging
  }
}

// ==========================================
// COMPATIBILIDAD CON CONFIG ANTERIOR
// ==========================================
// Mapear la configuración anterior para compatibilidad
const CONFIG = {
  API_URL: CONFIG_PRODUCCION.BACKEND.API_URL,
  BASE_URL: CONFIG_PRODUCCION.FRONTEND.BASE_URL,
  DEBUG: CONFIG_PRODUCCION.ENTORNO.DEBUG,
  MAX_FILE_SIZE: CONFIG_PRODUCCION.ARCHIVOS.TAMANOS.MAX_FILE_SIZE,
  MAX_IMAGE_SIZE: CONFIG_PRODUCCION.ARCHIVOS.TAMANOS.MAX_IMAGE_SIZE,
  COMPRESSION_QUALITY: CONFIG_PRODUCCION.ARCHIVOS.TAMANOS.COMPRESSION_QUALITY,
  MAX_CODEUDORES: CONFIG_PRODUCCION.VALIDACIONES.LIMITES.MAX_CODEUDORES,
  BREAKPOINTS: CONFIG_PRODUCCION.DISPOSITIVOS.BREAKPOINTS,
  MESSAGES: CONFIG_PRODUCCION.MENSAJES.FORMULARIO,
  PAGO: {
    NEQUI: CONFIG_PRODUCCION.PAGO.NEQUI.numero,
    VALOR: CONFIG_PRODUCCION.PAGO.CONFIGURACION.VALOR_CONTRATO,
    MONEDA: CONFIG_PRODUCCION.PAGO.CONFIGURACION.MONEDA,
    WOMPI_LINK: CONFIG_PRODUCCION.PAGO.WOMPI.link
  },
  TIMEOUTS: CONFIG_PRODUCCION.TIMEOUTS,
  DOCUMENTOS: CONFIG_PRODUCCION.DOCUMENTOS.SARLAFT,
  VALIDACIONES: {
    EMAIL_REGEX: CONFIG_PRODUCCION.VALIDACIONES.REGEX.EMAIL,
    TELEFONO_REGEX: CONFIG_PRODUCCION.VALIDACIONES.REGEX.TELEFONO,
    DOCUMENTO_MIN: CONFIG_PRODUCCION.VALIDACIONES.LIMITES.DOCUMENTO_MIN,
    DOCUMENTO_MAX: CONFIG_PRODUCCION.VALIDACIONES.LIMITES.DOCUMENTO_MAX,
    NOMBRE_MIN: CONFIG_PRODUCCION.VALIDACIONES.LIMITES.NOMBRE_MIN,
    NOMBRE_MAX: CONFIG_PRODUCCION.VALIDACIONES.LIMITES.NOMBRE_MAX
  },
  FORMULARIOS: CONFIG_PRODUCCION.FRONTEND.FORMULARIOS
};

// Extensiones permitidas (compatibilidad con código anterior)
const EXTENSIONES_PERMITIDAS = CONFIG_PRODUCCION.ARCHIVOS.EXTENSIONES;

// Función de detección de dispositivo con nombre anterior para compatibilidad
function detectDevice() {
  return detectarDispositivo();
}

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================
(function inicializar() {
  // Solo ejecutar si estamos en el navegador
  if (typeof window === 'undefined') return;
  
  // Detectar entorno
  const entorno = detectarEntorno();
  CONFIG_PRODUCCION.ENTORNO.DETECCION = entorno;
  
  // Validar configuración
  const validacion = validarConfiguracion();
  if (!validacion.valida) {
    console.error('❌ Errores en configuración:', validacion.errores);
  }
  
  // Configurar logs según entorno
  configurarLogs();
  
  // Detectar dispositivo
  const dispositivo = detectarDispositivo();
  CONFIG_PRODUCCION.DISPOSITIVOS.ACTUAL = dispositivo;
  
  // Log de inicialización (solo si debug está activo)
  if (CONFIG_PRODUCCION.ENTORNO.DEBUG) {
    console.log('🚀 E-firmaContrata - Configuración de PRODUCCIÓN cargada');
    console.log('🌍 Entorno detectado:', entorno);
    console.log('📱 Dispositivo:', dispositivo);
    console.log('⚙️ Configuración:', CONFIG_PRODUCCION);
  }
})();

// ==========================================
// EXPORTACIÓN
// ==========================================
// Exportar configuración para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG_PRODUCCION, CONFIG };
}

// Hacer disponible globalmente
window.CONFIG_PRODUCCION = CONFIG_PRODUCCION;
window.CONFIG = CONFIG;