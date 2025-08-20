// ==========================================
// SCRIPTS PRINCIPALES E-FIRMACONTRATA
// Sistema de Wizard para Formulario Inquilino
// ==========================================

// ==============================
// ESTADO GLOBAL
// ==============================
const state = {
  currentStep: 1,
  totalSteps: 4,
  codigoRegistro: '',
  archivosBase64: {},
  hasCodeudores: null,
  numCodeudores: 0,
  documentoCompletoRequerido: null,
  documentosIdentidadCargados: false,
  pagoRealizado: false,
  modoCorreccion: false,
  documentosCorreccion: [],
  steps: [
    {id:'documentos',label:'Documentos',number:1},
    {id:'informacion',label:'Información',number:2},
    {id:'identidad',label:'Identidad',number:3},
    {id:'confirmacion',label:'Confirmación',number:4}
  ],
  codeudorDataSaved: {},
  codeudorFieldsCreated: {},
  codeudorDocTipo: {},
  maxFileSize: CONFIG.MAX_FILE_SIZE
};

// ==============================
// INICIALIZACIÓN
// ==============================
window.onload = function() {
  initializeApp();
  if (CONFIG.DEBUG) {
    document.getElementById('debugBanner').style.display = 'block';
  }
};

function initializeApp() {
  const urlParams = new URLSearchParams(window.location.search);
  state.codigoRegistro = urlParams.get('cdr') || '';
  state.modoCorreccion = urlParams.get('modo') === 'correccion';
  
  console.info('[InquilinoWizard] CDR:', state.codigoRegistro);
  console.info('[InquilinoWizard] Modo:', state.modoCorreccion ? 'Corrección' : 'Normal');
  
  if (!state.codigoRegistro || !validarCodigoRegistro(state.codigoRegistro)) {
    alert('Código de registro no válido');
    window.location.href = 'selector.html';
    return;
  }
  
  // Si es modo corrección, procesar documentos a corregir
  if (state.modoCorreccion) {
    procesarModoCorreccion(urlParams);
  }
  
  createParticles();
}

function validarCodigoRegistro(codigo) {
  const regex = /^[A-Z0-9_\-()#\s\.]+$/i;
  return regex.test(codigo);
}

function procesarModoCorreccion(urlParams) {
  const docs = urlParams.get('docs');
  if (docs) {
    try {
      state.documentosCorreccion = JSON.parse(decodeURIComponent(docs));
      mostrarBannerCorreccion();
    } catch (e) {
      console.error('Error parseando documentos de corrección:', e);
    }
  }
}

function mostrarBannerCorreccion() {
  const banner = document.getElementById('correctionBanner');
  const list = document.getElementById('correctionList');
  const obs = document.getElementById('correctionObservations');
  
  if (state.documentosCorreccion.length > 0) {
    let html = '';
    state.documentosCorreccion.forEach(doc => {
      html += `<li>${doc}</li>`;
    });
    list.innerHTML = html;
    banner.classList.add('show');
  }
}

// ==============================
// EFECTO PARTÍCULAS
// ==============================
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 15 + 's';
    p.style.animationDuration = (15 + Math.random() * 10) + 's';
    container.appendChild(p);
  }
}

// ==============================
// MODAL DE PAGO
// ==============================
function abrirModalPago() {
  document.getElementById('modalPago').classList.add('show');
  console.log('[Pago] Modal abierto');
}

function cerrarModalPago() {
  document.getElementById('modalPago').classList.remove('show');
  console.log('[Pago] Modal cerrado');
}

function copiarCuenta() {
  const numero = document.getElementById('numeroNequi').textContent.trim();
  navigator.clipboard.writeText(numero).then(() => {
    const btn = document.getElementById('btnCopyCuenta');
    btn.classList.add('copied');
    btn.textContent = '✓ Copiado';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = '📋 Copiar';
    }, 2000);
  }).catch(() => alert('No se pudo copiar'));
}

function marcarPagoRealizado() {
  state.pagoRealizado = true;
  document.getElementById('msgPagoConfirmado').classList.add('show');
  document.getElementById('bannerPagoOk').classList.add('show');
  console.log('[Pago] pagoRealizado = true');
  setTimeout(() => cerrarModalPago(), 1200);
}

function verificarPagoAntesDeIniciar() {
  if (!state.pagoRealizado && !state.modoCorreccion) {
    abrirModalPago();
    return;
  }
  iniciarRegistro();
}

function handleComprobanteDirecto(input) {
  const file = input.files[0];
  if (!file) return;
  
  if (file.size > state.maxFileSize) {
    alert('Archivo excede el límite');
    input.value = '';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    state.archivosBase64.comprobantePago = {
      nombre: file.name,
      tipo: file.type,
      contenido: e.target.result
    };
    
    const labelMain = document.getElementById('labelComprobantePago');
    if (labelMain) {
      labelMain.textContent = file.name;
      labelMain.classList.add('file-selected');
    }
    
    document.getElementById('labelComprobantePagoDirecto').textContent = 'Comprobante listo ✓';
    
    if (!state.pagoRealizado) {
      state.pagoRealizado = true;
      document.getElementById('bannerPagoOk').classList.add('show');
    }
  };
  reader.readAsDataURL(file);
}

function notificarComprobanteCargado() {
  if (!state.pagoRealizado) {
    state.pagoRealizado = true;
    document.getElementById('bannerPagoOk').classList.add('show');
    console.log('[Pago] Comprobante cargado marca pagoRealizado = true');
  }
}

// ==============================
// INICIAR REGISTRO
// ==============================
function iniciarRegistro() {
  document.getElementById('initialScreen').classList.add('hidden');
  document.getElementById('progressContainer').classList.add('show');
  document.getElementById('formContent').classList.add('show');
  document.getElementById('formNavigation').classList.add('show');
  actualizarPasosDinamicos();
  setTimeout(() => document.getElementById('field1')?.classList.add('show'), 100);
}

// ==============================
// PASOS DINÁMICOS
// ==============================
function actualizarPasosDinamicos() {
  state.steps = [
    {id:'documentos',label:'Documentos',number:1},
    {id:'informacion',label:'Información',number:2},
    {id:'identidad',label:'Identidad',number:3}
  ];
  
  let s = 4;
  for (let i = 1; i <= state.numCodeudores; i++) {
    state.steps.push({id:`codeudor-${i}`,label:`Codeudor ${i}`,number:s++});
  }
  
  state.steps.push({id:'confirmacion',label:'Confirmación',number:s});
  state.totalSteps = s;
  renderProgressBar();
}

function renderProgressBar() {
  const pb = document.getElementById('progressBar');
  if (!pb) return;
  
  let html = '<div class="progress-line"></div>';
  html += '<div class="progress-line-active" id="progressLineActive" style="width:0%"></div>';
  
  state.steps.forEach((st, idx) => {
    const active = (idx + 1) === state.currentStep;
    const completed = (idx + 1) < state.currentStep;
    html += `
      <div class="step ${active?'active':''} ${completed?'completed':''}" id="step-${st.id}">
        <div class="step-circle">${completed?'✓':st.number}</div>
        <div class="step-label">${st.label}</div>
      </div>`;
  });
  
  pb.innerHTML = html;
  updateProgressBar();
}

function updateProgressBar() {
  const progress = ((state.currentStep - 1) / (state.totalSteps - 1)) * 100;
  const line = document.getElementById('progressLineActive');
  if (line) line.style.width = progress + '%';
}

// ==============================
// NAVEGACIÓN
// ==============================
function nextStep() {
  if (!validateCurrentStep()) return;
  hideCurrentStep();
  state.currentStep++;
  const next = state.steps[state.currentStep - 1];
  if (next.id.includes('codeudor-')) {
    const n = parseInt(next.id.split('-')[1]);
    createCodeudorFields(n);
  }
  showCurrentStep();
  updateNavigationButtons();
  updateProgressBar();
}

function previousStep() {
  if (state.currentStep <= 1) return;
  hideCurrentStep();
  state.currentStep--;
  showCurrentStep();
  updateNavigationButtons();
  updateProgressBar();
}

function hideCurrentStep() {
  const st = state.steps[state.currentStep - 1];
  const el = getStepElement(st.id);
  if (el) el.classList.remove('active');
}

function showCurrentStep() {
  const st = state.steps[state.currentStep - 1];
  const el = getStepElement(st.id);
  if (el) {
    el.classList.add('active');
    if (st.id === 'informacion') {
      setTimeout(() => document.getElementById('field3')?.classList.add('show'), 80);
    }
    if (st.id === 'documentos') {
      setTimeout(() => document.getElementById('field1')?.classList.add('show'), 80);
    }
  }
}

function getStepElement(id) {
  return document.querySelector(`[data-step="${id}"]`);
}

function updateNavigationButtons() {
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  if (btnPrev) btnPrev.style.display = state.currentStep === 1 ? 'none' : 'block';
  if (btnNext) {
    const current = state.steps[state.currentStep - 1];
    btnNext.style.display = current.id === 'confirmacion' ? 'none' : 'block';
  }
}

// ==============================
// RESUMEN Y CONFIRMACIÓN
// ==============================
function mostrarConfirmacion() {
  if (!validateStep1() || !validateStep2() || !validateStep3()) {
    alert('Faltan datos por completar antes de ver el resumen.');
    return;
  }
  
  for (let i = 1; i <= state.numCodeudores; i++) {
    guardarDatosCodeudor(i);
  }
  
  document.getElementById('resumenContenido').innerHTML = generarResumenHTML();
  document.getElementById('resumenModal').classList.add('show');
}

function generarResumenHTML() {
  let html = '';
  
  // Datos del inquilino
  html += `
    <div class="resume-section">
      <h4>Inquilino</h4>
      <div class="resume-grid">
        <div class="resume-item"><b>Tipo Doc:</b> ${val('tipoDocumento')}</div>
        <div class="resume-item"><b>Documento:</b> ${val('numeroDocumento')}</div>
        <div class="resume-item"><b>Nombres:</b> ${val('nombres')}</div>
        <div class="resume-item"><b>Apellidos:</b> ${val('apellidos')}</div>
        <div class="resume-item"><b>Email:</b> ${val('email')}</div>
        <div class="resume-item"><b>Celular:</b> ${val('celular')}</div>
        <div class="resume-item"><b>Ocupación:</b> ${val('ocupacion')}</div>
      </div>
    </div>`;
  
  // Documentos
  html += `
    <div class="resume-section">
      <h4>Documentos Iniciales</h4>
      <div class="resume-grid">
        <div class="resume-item"><b>Estudio Aprobado:</b> ${fileName('estudioAprobado')}</div>
        <div class="resume-item"><b>Comprobante Pago:</b> ${fileName('comprobantePago')}</div>
      </div>
    </div>`;
  
  // Identidad
  html += '<div class="resume-section"><h4>Identidad Inquilino</h4><div class="resume-grid">';
  if (state.documentoCompletoRequerido) {
    html += `<div class="resume-item"><b>Documento:</b> ${fileNameObj('docIdentidad')}</div>`;
  } else {
    html += `<div class="resume-item"><b>Frente:</b> ${fileNameObj('docIdentidadFrente')}</div>`;
    html += `<div class="resume-item"><b>Reverso:</b> ${fileNameObj('docIdentidadReverso')}</div>`;
  }
  html += `<div class="resume-item"><b>Codeudores:</b> ${state.numCodeudores}</div></div></div>`;
  
  // Codeudores
  if (state.numCodeudores > 0) {
    for (let i = 1; i <= state.numCodeudores; i++) {
      const d = state.codeudorDataSaved[i] || {};
      html += `
        <div class="resume-section">
          <h4>Codeudor ${i}</h4>
          <div class="resume-grid">
            <div class="resume-item"><b>Tipo Doc:</b> ${d.tipoDocumento || '-'}</div>
            <div class="resume-item"><b>Documento:</b> ${d.numeroDocumento || '-'}</div>
            <div class="resume-item"><b>Nombres:</b> ${d.nombres || '-'}</div>
            <div class="resume-item"><b>Apellidos:</b> ${d.apellidos || '-'}</div>
            <div class="resume-item"><b>Email:</b> ${d.email || '-'}</div>
            <div class="resume-item"><b>Celular:</b> ${d.celular || '-'}</div>
            <div class="resume-item"><b>Archivo:</b> ${
              state.codeudorDocTipo[i] === true
                ? (fileNameObj('docCodeudor' + i))
                : (fileNameObj('docCodeudor' + i + 'Frente') + ' / ' + fileNameObj('docCodeudor' + i + 'Reverso'))
            }</div>
          </div>
        </div>`;
    }
  }
  
  return html;
}

function val(id) {
  return document.getElementById(id)?.value || '-';
}

function fileName(id) {
  return state.archivosBase64[id]?.nombre || 'No cargado';
}

function fileNameObj(id) {
  return state.archivosBase64[id]?.nombre || 'No';
}

function cerrarModalResumen() {
  document.getElementById('resumenModal').classList.remove('show');
}

// ==============================
// ENVÍO FINAL
// ==============================
function confirmarEnvio() {
  const nombres = val('nombres').trim();
  const apellidos = val('apellidos').trim();
  
  const datosFormulario = {
    codigoRegistro: state.codigoRegistro,
    inquilino: {
      nombre: (nombres + ' ' + apellidos).replace(/\s+/g, ' ').trim(),
      tipoDocumento: val('tipoDocumento'),
      numeroDocumento: val('numeroDocumento'),
      email: val('email'),
      celular: val('celular'),
      ocupacion: val('ocupacion')
    },
    codeudores: []
  };
  
  // Agregar codeudores
  for (let i = 1; i <= state.numCodeudores; i++) {
    const d = state.codeudorDataSaved[i];
    if (d) {
      datosFormulario.codeudores.push({
        nombre: (d.nombres + ' ' + d.apellidos).replace(/\s+/g, ' ').trim(),
        tipoDocumento: d.tipoDocumento,
        numeroDocumento: d.numeroDocumento,
        email: d.email,
        celular: d.celular
      });
    }
  }
  
  enviarFormularioInquilino(datosFormulario);
}

async function enviarFormularioInquilino(datosFormulario) {
  mostrarOverlay(true, 'Enviando documentos...');
  
  try {
    // Para producción, usa el CONFIG.API_URL real
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        accion: 'procesarFormularioInquilino',
        datosFormulario: datosFormulario,
        archivosBase64: state.archivosBase64
      })
    });
    
    mostrarOverlay(true, 'Documentos enviados. Redirigiendo...');
    
    setTimeout(() => {
      window.location.href = `pagina-exito.html?estado=exitoso&cdr=${encodeURIComponent(state.codigoRegistro)}&tipo=inquilino`;
    }, 1500);
    
  } catch (err) {
    console.error('[InquilinoWizard] Error envío:', err);
    mostrarOverlay(false);
    alert('Error de conexión. Intente nuevamente.');
  }
}

function mostrarOverlay(show, msg) {
  const ov = document.getElementById('loadingOverlay');
  const lm = document.getElementById('loadingMsg');
  if (show && ov) {
    ov.classList.add('show');
    if (msg && lm) lm.textContent = msg;
  } else if (ov) {
    ov.classList.remove('show');
  }
}

// ==============================
// VISUAL HELPERS
// ==============================
function showNextField(id) {
  const el = document.getElementById(id);
  if (el && !el.classList.contains('show')) {
    setTimeout(() => el.classList.add('show'), 250);
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ==============================
// LOG FINAL
// ==============================
console.info('✅ [Scripts Principal] E-firmaContrata v8.0 cargado');
console.info('📋 Características:');
console.info('- Arquitectura modular');
console.info('- Sistema de pago integrado');
console.info('- Modo corrección habilitado');
console.info('- Validaciones completas');
console.info('- Soporte para 3 codeudores');