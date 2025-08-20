// ==========================================
// VALIDACIONES E-FIRMACONTRATA
// Sistema de validación de formularios
// ==========================================

// ==============================
// VALIDACIONES DE PASOS
// ==============================
function validateCurrentStep() {
  const st = state.steps[state.currentStep - 1];
  switch (st.id) {
    case 'documentos': return validateStep1();
    case 'informacion': return validateStep2();
    case 'identidad': return validateStep3();
    case 'codeudor-1':
    case 'codeudor-2':
    case 'codeudor-3':
      const n = parseInt(st.id.split('-')[1]);
      return validateCodeudor(n);
    default: return true;
  }
}

function validateStep1() {
  if (!state.archivosBase64.estudioAprobado) {
    alert('Cargue el Documento Estudio Aprobado');
    return false;
  }
  if (!state.archivosBase64.comprobantePago) {
    alert('Cargue el Comprobante de Pago');
    return false;
  }
  return true;
}

function validateStep2() {
  const campos = ['tipoDocumento','numeroDocumento','confirmarDocumento','nombres',
                  'apellidos','email','confirmarEmail','celular','confirmarCelular','ocupacion'];
  
  for (const c of campos) {
    const el = document.getElementById(c);
    if (!el || !el.value.trim()) {
      alert(`Complete: ${c.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      el?.focus();
      return false;
    }
  }
  
  const numeroDocumento = document.getElementById('numeroDocumento');
  const confirmarDocumento = document.getElementById('confirmarDocumento');
  const email = document.getElementById('email');
  const confirmarEmail = document.getElementById('confirmarEmail');
  const celular = document.getElementById('celular');
  const confirmarCelular = document.getElementById('confirmarCelular');
  
  if (numeroDocumento.value !== confirmarDocumento.value) {
    alert('Los números de documento no coinciden');
    return false;
  }
  if (email.value !== confirmarEmail.value) {
    alert('Los emails no coinciden');
    return false;
  }
  if (celular.value !== confirmarCelular.value) {
    alert('Los celulares no coinciden');
    return false;
  }
  return true;
}

function validateStep3() {
  if (state.documentoCompletoRequerido === null) {
    alert('Indique si el documento tiene ambas caras');
    return false;
  }
  
  if (state.documentoCompletoRequerido) {
    if (!state.archivosBase64.docIdentidad) {
      alert('Cargue el documento de identidad');
      return false;
    }
  } else {
    if (!state.archivosBase64.docIdentidadFrente || !state.archivosBase64.docIdentidadReverso) {
      alert('Cargue frente y reverso del documento');
      return false;
    }
  }
  
  if (state.hasCodeudores === null) {
    alert('Indique si tiene codeudores');
    return false;
  }
  return true;
}

function validateCodeudor(num) {
  guardarDatosCodeudor(num);
  
  const campos = [
    `tipoDocCodeudor${num}`,`numDocCodeudor${num}`,`confirmNumDocCodeudor${num}`,
    `nombresCodeudor${num}`,`apellidosCodeudor${num}`,`emailCodeudor${num}`,
    `confirmEmailCodeudor${num}`,`celularCodeudor${num}`,`confirmCelularCodeudor${num}`
  ];
  
  for (const c of campos) {
    const el = document.getElementById(c);
    if (!el || !el.value.trim()) {
      alert(`Complete campos del codeudor ${num}`);
      el?.focus();
      return false;
    }
  }
  
  if (document.getElementById(`numDocCodeudor${num}`).value !== 
      document.getElementById(`confirmNumDocCodeudor${num}`).value) {
    alert(`Documento no coincide en Codeudor ${num}`);
    return false;
  }
  
  if (document.getElementById(`emailCodeudor${num}`).value !== 
      document.getElementById(`confirmEmailCodeudor${num}`).value) {
    alert(`Email no coincide en Codeudor ${num}`);
    return false;
  }
  
  if (document.getElementById(`celularCodeudor${num}`).value !== 
      document.getElementById(`confirmCelularCodeudor${num}`).value) {
    alert(`Celular no coincide en Codeudor ${num}`);
    return false;
  }
  
  if (state.codeudorDocTipo[num] === undefined) {
    alert(`Seleccione tipo de archivo para Codeudor ${num}`);
    return false;
  }
  
  if (state.codeudorDocTipo[num] === true) {
    if (!state.archivosBase64[`docCodeudor${num}`]) {
      alert(`Cargue documento del Codeudor ${num}`);
      return false;
    }
  } else {
    if (!state.archivosBase64[`docCodeudor${num}Frente`] || 
        !state.archivosBase64[`docCodeudor${num}Reverso`]) {
      alert(`Cargue frente y reverso del documento Codeudor ${num}`);
      return false;
    }
  }
  return true;
}

// ==============================
// VALIDACIONES SIMPLES
// ==============================
function validarEmail(input) {
  const v = input.value.trim();
  const r = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!r.test(v)) {
    input.classList.add('invalid');
    input.classList.remove('valid');
    return false;
  }
  input.classList.add('valid');
  input.classList.remove('invalid');
  return true;
}

function validarTelefono(input) {
  const v = input.value.trim();
  const r = /^[0-9]{10}$/;
  if (!r.test(v)) {
    input.classList.add('invalid');
    input.classList.remove('valid');
    return false;
  }
  input.classList.add('valid');
  input.classList.remove('invalid');
  return true;
}

function validarCoincidencia(idA, idB) {
  const a = document.getElementById(idA);
  const b = document.getElementById(idB);
  const msg = document.getElementById(idB + 'Error');
  if (!a || !b) return;
  
  if (a.value && b.value && a.value === b.value) {
    b.classList.add('valid');
    b.classList.remove('invalid');
    if (msg) {
      msg.textContent = '✓ Coincide';
      msg.className = 'validation-message success show';
    }
  } else if (b.value) {
    b.classList.add('invalid');
    b.classList.remove('valid');
    if (msg) {
      msg.textContent = 'No coincide';
      msg.className = 'validation-message error show';
    }
  } else if (msg) {
    msg.classList.remove('show');
  }
}

function validateAndShow(id1, id2, next) {
  validarCoincidencia(id1, id2);
  const v1 = document.getElementById(id1).value;
  const v2 = document.getElementById(id2).value;
  if (v1 === v2 && v1 !== '') {
    showNextField(next);
  }
}

// ==============================
// VALIDACIONES DE ARCHIVO
// ==============================
function validarTamanoArchivo(file, esImagen = false) {
  const maxSize = esImagen ? CONFIG.MAX_IMAGE_SIZE : CONFIG.MAX_FILE_SIZE;
  return file.size <= maxSize;
}

function validarExtensionArchivo(filename, tipo = 'todos') {
  const extensionesPermitidas = {
    imagenes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    documentos: ['pdf', 'doc', 'docx'],
    todos: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx']
  };
  
  const extension = filename.split('.').pop().toLowerCase();
  return extensionesPermitidas[tipo].includes(extension);
}

// ==============================
// VALIDACIONES ESPECÍFICAS DEL DOMINIO
// ==============================
function validarDocumento(numero, tipo) {
  // Validación básica de longitud según tipo de documento
  const reglas = {
    'CC': { min: 6, max: 12, regex: /^[0-9]+$/ },
    'CE': { min: 6, max: 15, regex: /^[0-9A-Z]+$/ },
    'PA': { min: 6, max: 15, regex: /^[A-Z0-9]+$/ }
  };
  
  const regla = reglas[tipo];
  if (!regla) return false;
  
  if (numero.length < regla.min || numero.length > regla.max) {
    return false;
  }
  
  return regla.regex.test(numero);
}

function validarNombre(nombre) {
  // Solo letras, espacios y algunos caracteres especiales
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-'\.]+$/;
  return regex.test(nombre) && nombre.length >= 2 && nombre.length <= 50;
}

function validarCelular(numero) {
  // Formato colombiano: 10 dígitos, inicia con 3
  const regex = /^3[0-9]{9}$/;
  return regex.test(numero);
}

// ==============================
// VALIDACIONES EN TIEMPO REAL
// ==============================
function aplicarValidacionesTiempoReal() {
  // Aplicar validaciones automáticas en los campos
  document.addEventListener('DOMContentLoaded', function() {
    // Validar emails en tiempo real
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
      input.addEventListener('blur', () => validarEmail(input));
    });
    
    // Validar teléfonos en tiempo real
    const telInputs = document.querySelectorAll('input[type="tel"]');
    telInputs.forEach(input => {
      input.addEventListener('blur', () => validarTelefono(input));
    });
    
    // Validar nombres en tiempo real
    const nameInputs = document.querySelectorAll('input[data-type="name"]');
    nameInputs.forEach(input => {
      input.addEventListener('blur', function() {
        if (!validarNombre(this.value)) {
          this.classList.add('invalid');
          this.classList.remove('valid');
        } else {
          this.classList.add('valid');
          this.classList.remove('invalid');
        }
      });
    });
  });
}

// Activar validaciones cuando se carga el script
aplicarValidacionesTiempoReal();

console.info('✅ [Validations] Sistema de validaciones cargado');