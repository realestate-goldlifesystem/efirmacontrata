// ==========================================
// API E-FIRMACONTRATA
// Manejo de comunicación con el backend
// ==========================================

// ==============================
// CONFIGURACIÓN API
// ==============================
const API = {
  baseURL: CONFIG.API_URL,
  timeout: CONFIG.TIMEOUTS.API_CALL,
  
  // Headers por defecto
  defaultHeaders: {
    'Content-Type': 'text/plain'
  }
};

// ==============================
// MÉTODOS DE COMUNICACIÓN
// ==============================
async function realizarLlamadaAPI(datos, opciones = {}) {
  const configuracion = {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      ...API.defaultHeaders,
      ...opciones.headers
    },
    body: JSON.stringify(datos)
  };
  
  try {
    mostrarOverlay(true, opciones.mensajeCarga || 'Procesando...');
    
    const response = await fetch(API.baseURL, configuracion);
    
    if (CONFIG.DEBUG) {
      console.log('📡 API Call:', {
        url: API.baseURL,
        datos: datos,
        configuracion: configuracion
      });
    }
    
    return {
      success: true,
      response: response
    };
    
  } catch (error) {
    console.error('❌ Error en llamada API:', error);
    mostrarOverlay(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// ==============================
// FUNCIONES ESPECÍFICAS DEL NEGOCIO
// ==============================
async function verificarCodigoRegistro(codigo, tipo = '') {
  const datos = {
    accion: 'verificarLink',
    cdr: codigo,
    tipo: tipo
  };
  
  try {
    const response = await fetch(`${API.baseURL}?cdr=${encodeURIComponent(codigo)}&tipo=${encodeURIComponent(tipo)}`);
    
    if (CONFIG.DEBUG) {
      console.log('📡 Verificación CDR:', codigo, tipo);
    }
    
    return {
      success: true,
      response: response
    };
    
  } catch (error) {
    console.error('❌ Error verificando código:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function enviarFormularioInquilino(datosFormulario) {
  const datos = {
    accion: 'procesarFormularioInquilino',
    datosFormulario: datosFormulario,
    archivosBase64: state.archivosBase64
  };
  
  const resultado = await realizarLlamadaAPI(datos, {
    mensajeCarga: 'Enviando documentos...'
  });
  
  if (resultado.success) {
    mostrarOverlay(true, 'Documentos enviados. Redirigiendo...');
    
    setTimeout(() => {
      redirigirCon('pagina-exito.html', {
        estado: 'exitoso',
        cdr: state.codigoRegistro,
        tipo: 'inquilino'
      });
    }, CONFIG.TIMEOUTS.REDIRECT);
  } else {
    mostrarMensaje('Error de conexión. Intente nuevamente.', 'error');
  }
  
  return resultado;
}

async function enviarFormularioPropietario(datosFormulario) {
  const datos = {
    accion: 'procesarFormularioPropietario',
    datosFormulario: datosFormulario,
    archivosBase64: state.archivosBase64
  };
  
  const resultado = await realizarLlamadaAPI(datos, {
    mensajeCarga: 'Enviando documentos del propietario...'
  });
  
  if (resultado.success) {
    mostrarOverlay(true, 'Documentos enviados. Redirigiendo...');
    
    setTimeout(() => {
      redirigirCon('pagina-exito.html', {
        estado: 'exitoso',
        cdr: state.codigoRegistro,
        tipo: 'propietario'
      });
    }, CONFIG.TIMEOUTS.REDIRECT);
  } else {
    mostrarMensaje('Error de conexión. Intente nuevamente.', 'error');
  }
  
  return resultado;
}

async function obtenerDatosContrato(codigoRegistro) {
  const datos = {
    accion: 'obtenerDatosContrato',
    cdr: codigoRegistro
  };
  
  return await realizarLlamadaAPI(datos, {
    mensajeCarga: 'Obteniendo datos del contrato...'
  });
}

async function generarContrato(codigoRegistro, plantillaDocId, forzar = false) {
  const datos = {
    accion: 'generarContrato',
    cdr: codigoRegistro,
    plantillaDocId: plantillaDocId,
    forzar: forzar
  };
  
  return await realizarLlamadaAPI(datos, {
    mensajeCarga: 'Generando contrato...'
  });
}

async function registrarAprobacionContrato(codigoRegistro, parte, accion, comentarios = '') {
  const datos = {
    accion: 'registrarAprobacionContrato',
    cdr: codigoRegistro,
    parte: parte,
    accion: accion,
    comentarios: comentarios
  };
  
  return await realizarLlamadaAPI(datos, {
    mensajeCarga: 'Registrando aprobación...'
  });
}

async function obtenerEstadoAprobaciones(codigoRegistro) {
  const datos = {
    accion: 'obtenerEstadoAprobaciones',
    cdr: codigoRegistro
  };
  
  return await realizarLlamadaAPI(datos, {
    mensajeCarga: 'Consultando estado...'
  });
}

// ==============================
// MANEJO DE ERRORES
// ==============================
function manejarErrorAPI(error, contexto = '') {
  console.error(`❌ Error API ${contexto}:`, error);
  
  let mensaje = 'Error de conexión. Verifique su internet e intente nuevamente.';
  
  if (error.includes('timeout')) {
    mensaje = 'La operación está tardando más de lo esperado. Intente nuevamente.';
  } else if (error.includes('network')) {
    mensaje = 'Sin conexión a internet. Verifique su conexión.';
  } else if (error.includes('cors')) {
    mensaje = 'Error de seguridad del navegador. Contacte soporte.';
  }
  
  mostrarMensaje(mensaje, 'error');
  mostrarOverlay(false);
}

// ==============================
// UTILIDADES DE ESTADO
// ==============================
function mostrarEstadoCarga(activo, mensaje = 'Cargando...') {
  const overlay = document.getElementById('loadingOverlay');
  const messageElement = document.getElementById('loadingMsg');
  
  if (overlay) {
    if (activo) {
      overlay.classList.add('show');
      if (messageElement && mensaje) {
        messageElement.textContent = mensaje;
      }
    } else {
      overlay.classList.remove('show');
    }
  }
}

// ==============================
// REINTENTOS Y RECUPERACIÓN
// ==============================
async function realizarConReintentos(funcionAPI, maxIntentos = 3, retrasoBase = 1000) {
  let ultimoError;
  
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      if (CONFIG.DEBUG) {
        console.log(`🔄 Intento ${intento}/${maxIntentos}`);
      }
      
      const resultado = await funcionAPI();
      
      if (resultado.success) {
        return resultado;
      } else {
        ultimoError = resultado.error;
      }
      
    } catch (error) {
      ultimoError = error.message;
      console.warn(`⚠️ Intento ${intento} falló:`, error.message);
    }
    
    // Esperar antes del siguiente intento (excepto en el último)
    if (intento < maxIntentos) {
      const retraso = retrasoBase * Math.pow(2, intento - 1); // Backoff exponencial
      await new Promise(resolve => setTimeout(resolve, retraso));
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  throw new Error(`Operación falló después de ${maxIntentos} intentos. Último error: ${ultimoError}`);
}

// ==============================
// CACHE SIMPLE
// ==============================
const cache = new Map();

function obtenerDeCache(clave) {
  const entrada = cache.get(clave);
  if (entrada && Date.now() - entrada.timestamp < 300000) { // 5 minutos
    return entrada.data;
  }
  return null;
}

function guardarEnCache(clave, data) {
  cache.set(clave, {
    data: data,
    timestamp: Date.now()
  });
}

function limpiarCache() {
  cache.clear();
}

// ==============================
// FUNCIONES DE PRUEBA
// ==============================
async function probarConexionAPI() {
  try {
    const datos = { accion: 'test' };
    const resultado = await realizarLlamadaAPI(datos, {
      mensajeCarga: 'Probando conexión...'
    });
    
    if (resultado.success) {
      mostrarMensaje('✅ Conexión API exitosa', 'success');
    } else {
      mostrarMensaje('❌ Error de conexión API', 'error');
    }
    
    return resultado;
    
  } catch (error) {
    mostrarMensaje('❌ No se pudo conectar con el servidor', 'error');
    return { success: false, error: error.message };
  }
}

// ==============================
// INICIALIZACIÓN
// ==============================
if (CONFIG.DEBUG) {
  console.log('📡 API configurada:', {
    baseURL: API.baseURL,
    timeout: API.timeout
  });
}

console.info('✅ [API] Sistema de comunicación cargado');