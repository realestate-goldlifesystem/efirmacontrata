// ==========================================
// UTILIDADES E-FIRMACONTRATA
// Funciones auxiliares y helpers
// ==========================================

// ==============================
// MANEJO DE ARCHIVOS
// ==============================
function handleFileSelect(input, nextFieldId) {
  const file = input.files[0];
  if (!file) return;
  
  if (file.size > state.maxFileSize) {
    alert('Archivo excede el límite de 10MB');
    input.value = '';
    return;
  }
  
  const label = document.getElementById('label' + capitalize(input.id));
  if (label) {
    label.textContent = file.name;
    label.classList.add('file-selected');
  }
  
  convertirArchivoBase64(input, () => {
    if (nextFieldId) {
      setTimeout(() => document.getElementById(nextFieldId)?.classList.add('show'), 280);
    }
  });
}

function convertirArchivoBase64(input, cb) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    state.archivosBase64[input.id] = {
      nombre: file.name,
      tipo: file.type,
      contenido: e.target.result
    };
    if (cb) cb();
  };
  reader.readAsDataURL(file);
}

function handleDocumentUpload(input, tipo) {
  const file = input.files[0];
  if (!file) return;
  
  if (file.size > state.maxFileSize) {
    alert('Archivo excede el límite');
    input.value = '';
    return;
  }
  
  const labelId = 'labelDocIdentidad' + capitalize(tipo);
  const label = document.getElementById(labelId);
  if (label) {
    label.textContent = file.name;
    label.classList.add('file-selected');
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    if (tipo === 'completo') {
      state.archivosBase64.docIdentidad = {
        nombre: file.name,
        tipo: file.type,
        contenido: e.target.result
      };
      state.documentosIdentidadCargados = true;
    } else if (tipo === 'frente') {
      state.archivosBase64.docIdentidadFrente = {
        nombre: file.name,
        tipo: file.type,
        contenido: e.target.result
      };
      if (state.archivosBase64.docIdentidadReverso) {
        state.documentosIdentidadCargados = true;
      }
    } else if (tipo === 'reverso') {
      state.archivosBase64.docIdentidadReverso = {
        nombre: file.name,
        tipo: file.type,
        contenido: e.target.result
      };
      if (state.archivosBase64.docIdentidadFrente) {
        state.documentosIdentidadCargados = true;
      }
    }
    
    if (state.documentosIdentidadCargados) {
      const codeudorQuestion = document.getElementById('codeudorQuestion');
      const btnCodeudorNo = document.getElementById('btnCodeudorNo');
      const btnCodeudorSi = document.getElementById('btnCodeudorSi');
      
      if (codeudorQuestion) codeudorQuestion.classList.remove('disabled');
      if (btnCodeudorNo) btnCodeudorNo.disabled = false;
      if (btnCodeudorSi) btnCodeudorSi.disabled = false;
    }
  };
  reader.readAsDataURL(file);
}

// ==============================
// UTILIDADES DE UI
// ==============================
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function showNextField(id) {
  const el = document.getElementById(id);
  if (el && !el.classList.contains('show')) {
    setTimeout(() => el.classList.add('show'), 250);
  }
}

function mostrarMensaje(mensaje, tipo = 'info', duracion = 5000) {
  // Crear elemento de mensaje si no existe
  let container = document.getElementById('messageContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'messageContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '10000';
    document.body.appendChild(container);
  }
  
  const messageEl = document.createElement('div');
  messageEl.className = `message ${tipo}`;
  messageEl.textContent = mensaje;
  
  container.appendChild(messageEl);
  
  // Auto-eliminar después de la duración especificada
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.parentNode.removeChild(messageEl);
    }
  }, duracion);
}

function toggleVisibility(elementId, show) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = show ? 'block' : 'none';
  }
}

function addClass(elementId, className) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add(className);
  }
}

function removeClass(elementId, className) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove(className);
  }
}

// ==============================
// UTILIDADES DE DATOS
// ==============================
function limpiarTexto(texto) {
  return texto.replace(/\s+/g, ' ').trim();
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CO');
}

function generarId() {
  return Math.random().toString(36).substr(2, 9);
}

function copiarAlPortapapeles(texto) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(texto);
  } else {
    // Fallback para navegadores que no soportan Clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = texto;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return Promise.resolve();
  }
}

// ==============================
// UTILIDADES DE URL Y NAVEGACIÓN
// ==============================
function obtenerParametrosURL() {
  const params = new URLSearchParams(window.location.search);
  const resultado = {};
  for (const [key, value] of params) {
    resultado[key] = value;
  }
  return resultado;
}

function redirigirCon(url, parametros = {}) {
  const searchParams = new URLSearchParams(parametros);
  const fullUrl = url + (Object.keys(parametros).length > 0 ? '?' + searchParams.toString() : '');
  window.location.href = fullUrl;
}

function redirigirConRetraso(url, retraso = 1500) {
  setTimeout(() => {
    window.location.href = url;
  }, retraso);
}

// ==============================
// UTILIDADES DE ALMACENAMIENTO
// ==============================
function guardarEnLocalStorage(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
    return false;
  }
}

function cargarDeLocalStorage(clave, valorPorDefecto = null) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : valorPorDefecto;
  } catch (e) {
    console.warn('No se pudo cargar de localStorage:', e);
    return valorPorDefecto;
  }
}

function eliminarDeLocalStorage(clave) {
  try {
    localStorage.removeItem(clave);
    return true;
  } catch (e) {
    console.warn('No se pudo eliminar de localStorage:', e);
    return false;
  }
}

// ==============================
// UTILIDADES DE FORMULARIOS
// ==============================
function limpiarFormulario(formId) {
  const form = document.getElementById(formId);
  if (form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
      input.classList.remove('valid', 'invalid');
    });
  }
}

function obtenerDatosFormulario(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  
  const datos = {};
  const inputs = form.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    if (input.name || input.id) {
      const key = input.name || input.id;
      if (input.type === 'checkbox') {
        datos[key] = input.checked;
      } else if (input.type === 'radio') {
        if (input.checked) {
          datos[key] = input.value;
        }
      } else {
        datos[key] = input.value;
      }
    }
  });
  
  return datos;
}

// ==============================
// UTILIDADES DE DEBUGGING
// ==============================
function logEstado(titulo = 'Estado Actual') {
  if (CONFIG.DEBUG) {
    console.group('🔍 ' + titulo);
    console.log('State:', state);
    console.log('Archivos:', Object.keys(state.archivosBase64));
    console.log('Paso actual:', state.currentStep);
    console.log('Codeudores:', state.numCodeudores);
    console.groupEnd();
  }
}

function logFormulario(formId) {
  if (CONFIG.DEBUG) {
    const datos = obtenerDatosFormulario(formId);
    console.log('📋 Datos formulario:', datos);
  }
}

// ==============================
// UTILIDADES DE ANIMACIÓN
// ==============================
function animarEntrada(elementId, delay = 0) {
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      element.style.transition = 'all 0.3s ease';
      
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, 50);
    }
  }, delay);
}

function animarSalida(elementId, callback) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.transition = 'all 0.3s ease';
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      if (callback) callback();
    }, 300);
  } else if (callback) {
    callback();
  }
}

// ==============================
// INIT
// ==============================
console.info('✅ [Utils] Utilidades cargadas');