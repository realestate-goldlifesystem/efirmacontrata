// ==========================================
// CODEUDORES E-FIRMACONTRATA
// Sistema de gestión de codeudores
// ==========================================

// ==============================
// GESTIÓN DE CODEUDORES
// ==============================
function createCodeudorFields(num) {
  if (state.codeudorFieldsCreated[num]) return;
  
  const container = document.getElementById(`codeudor${num}Fields`);
  if (!container) return;
  
  const saved = state.codeudorDataSaved[num] || {};
  const docTipo = state.codeudorDocTipo[num];
  
  container.innerHTML = `
    <div class="form-field show">
      <div class="form-row">
        <div>
          <label>Tipo de Documento <span class="required">*</span></label>
          <select id="tipoDocCodeudor${num}">
            <option value="">Seleccione...</option>
            <option value="CC" ${saved.tipoDocumento==='CC'?'selected':''}>Cédula de Ciudadanía</option>
            <option value="CE" ${saved.tipoDocumento==='CE'?'selected':''}>Cédula de Extranjería</option>
            <option value="PA" ${saved.tipoDocumento==='PA'?'selected':''}>Pasaporte</option>
          </select>
        </div>
        <div>
          <label>Número de Documento <span class="required">*</span></label>
          <input type="text" id="numDocCodeudor${num}" value="${saved.numeroDocumento||''}" placeholder="Número">
        </div>
      </div>
    </div>
    <div class="form-field show">
      <div class="form-row">
        <div>
          <label>Confirmar Número <span class="required">*</span></label>
          <input type="text" id="confirmNumDocCodeudor${num}" value="${saved.numeroDocumento||''}" 
                 placeholder="Confirmar" onblur="validarCoincidencia('numDocCodeudor${num}','confirmNumDocCodeudor${num}')">
          <div class="validation-message" id="confirmNumDocCodeudor${num}Error"></div>
        </div>
        <div>
          <label>Fecha Expedición</label>
          <input type="date" id="fechaExpedicionCodeudor${num}" value="${saved.fechaExpedicion||''}">
        </div>
      </div>
    </div>
    <div class="form-field show">
      <div class="form-row">
        <div>
          <label>Nombres <span class="required">*</span></label>
          <input type="text" id="nombresCodeudor${num}" value="${saved.nombres||''}" placeholder="Nombres" data-type="name">
        </div>
        <div>
          <label>Apellidos <span class="required">*</span></label>
          <input type="text" id="apellidosCodeudor${num}" value="${saved.apellidos||''}" placeholder="Apellidos" data-type="name">
        </div>
      </div>
    </div>
    <div class="form-field show">
      <div class="form-row">
        <div>
          <label>Email <span class="required">*</span></label>
          <input type="email" id="emailCodeudor${num}" value="${saved.email||''}" 
                 placeholder="correo@ejemplo.com" onblur="validarEmail(this)">
        </div>
        <div>
          <label>Confirmar Email <span class="required">*</span></label>
          <input type="email" id="confirmEmailCodeudor${num}" value="${saved.email||''}" 
                 placeholder="Confirmar" onblur="validarCoincidencia('emailCodeudor${num}','confirmEmailCodeudor${num}')">
          <div class="validation-message" id="confirmEmailCodeudor${num}Error"></div>
        </div>
      </div>
    </div>
    <div class="form-field show">
      <div class="form-row">
        <div>
          <label>Celular <span class="required">*</span></label>
          <input type="tel" id="celularCodeudor${num}" value="${saved.celular||''}" 
                 placeholder="3001234567" onblur="validarTelefono(this)">
        </div>
        <div>
          <label>Confirmar Celular <span class="required">*</span></label>
          <input type="tel" id="confirmCelularCodeudor${num}" value="${saved.celular||''}" 
                 placeholder="Confirmar" onblur="validarCoincidencia('celularCodeudor${num}','confirmCelularCodeudor${num}')">
          <div class="validation-message" id="confirmCelularCodeudor${num}Error"></div>
        </div>
      </div>
    </div>
    <div class="form-field show" id="docDecisionCodeudor${num}">
      <h3 style="color:var(--gold-primary);margin-bottom:12px;text-align:center;">
        ¿Documento codeudor ${num} en un solo archivo?
      </h3>
      <div class="decision-buttons">
        <button type="button" class="decision-btn ${docTipo===true?'selected':''}" 
                onclick="setCodeudorDocumentType(${num},true)">SÍ</button>
        <button type="button" class="decision-btn ${docTipo===false?'selected':''}" 
                onclick="setCodeudorDocumentType(${num},false)">NO</button>
      </div>
    </div>
    <div class="form-field show" id="singleDocCodeudor${num}" style="display:${docTipo===true?'block':'none'}">
      <label>Documento Identidad (Ambas caras) <span class="required">*</span></label>
      <div class="file-upload-wrapper">
        <label class="file-upload-label" for="docCodeudor${num}" id="labelDocCodeudor${num}">
          ${(state.archivosBase64['docCodeudor'+num])?'Archivo cargado ✓':'Seleccionar archivo'}
        </label>
        <input type="file" id="docCodeudor${num}" class="file-upload-input" accept="image/*,.pdf" 
               ${docTipo===true?'':'disabled'} onchange="handleCodeudorFile(this,${num})">
      </div>
      <div class="file-size-info">Max 10MB - JPG, PNG, PDF</div>
    </div>
    <div class="form-field show" id="doubleDocCodeudor${num}" style="display:${docTipo===false?'block':'none'}">
      <div style="margin-bottom:12px;">
        <label>Cara frontal <span class="required">*</span></label>
        <div class="file-upload-wrapper">
          <label class="file-upload-label" for="docCodeudor${num}Frente" id="labelDocCodeudor${num}Frente">
            ${(state.archivosBase64['docCodeudor'+num+'Frente'])?'Frente cargado ✓':'Seleccionar frente'}
          </label>
          <input type="file" id="docCodeudor${num}Frente" class="file-upload-input" accept="image/*,.pdf" 
                 ${docTipo===false?'':'disabled'} onchange="handleCodeudorDocumentUpload(this,${num},'Frente')">
        </div>
      </div>
      <div>
        <label>Cara posterior <span class="required">*</span></label>
        <div class="file-upload-wrapper">
          <label class="file-upload-label" for="docCodeudor${num}Reverso" id="labelDocCodeudor${num}Reverso">
            ${(state.archivosBase64['docCodeudor'+num+'Reverso'])?'Reverso cargado ✓':'Seleccionar reverso'}
          </label>
          <input type="file" id="docCodeudor${num}Reverso" class="file-upload-input" accept="image/*,.pdf" 
                 ${docTipo===false?'':'disabled'} onchange="handleCodeudorDocumentUpload(this,${num},'Reverso')">
       </div>
     </div>
     <div class="file-size-info">Max 10MB c/u - JPG, PNG, PDF</div>
   </div>
 `;
 
 state.codeudorFieldsCreated[num] = true;
}

function setDocumentType(isComplete) {
  state.documentoCompletoRequerido = isComplete;
  event.target.classList.add('selected');
  event.target.parentElement.querySelectorAll('.decision-btn').forEach(b => {
    if (b !== event.target) b.classList.remove('selected');
  });
  
  if (isComplete) {
    document.getElementById('singleDocUpload').style.display = 'block';
    document.getElementById('doubleDocUpload').style.display = 'none';
    setTimeout(() => document.getElementById('singleDocUpload').style.opacity = '1', 60);
  } else {
    document.getElementById('singleDocUpload').style.display = 'none';
    document.getElementById('doubleDocUpload').style.display = 'block';
    setTimeout(() => document.getElementById('doubleDocUpload').style.opacity = '1', 60);
  }
}

function setCodeudor(has) {
  const prev = state.hasCodeudores;
  if (prev === true && !has) limpiarTodosCodeudores();
  
  state.hasCodeudores = has;
  event.target.classList.add('selected');
  event.target.parentElement.querySelectorAll('.decision-btn').forEach(b => {
    if (b !== event.target) b.classList.remove('selected');
  });
  
  state.numCodeudores = has ? 1 : 0;
  actualizarPasosDinamicos();
}

function setCodeudorDocumentType(num, isComplete) {
  state.codeudorDocTipo[num] = isComplete;
  event.target.parentElement.querySelectorAll('.decision-btn').forEach(b => b.classList.remove('selected'));
  event.target.classList.add('selected');
  
  const single = document.getElementById(`singleDocCodeudor${num}`);
  const doble = document.getElementById(`doubleDocCodeudor${num}`);
  
  if (isComplete) {
    single.style.display = 'block';
    doble.style.display = 'none';
    document.getElementById(`docCodeudor${num}`).disabled = false;
    document.getElementById(`docCodeudor${num}Frente`)?.setAttribute('disabled', 'disabled');
    document.getElementById(`docCodeudor${num}Reverso`)?.setAttribute('disabled', 'disabled');
  } else {
    single.style.display = 'none';
    doble.style.display = 'block';
    document.getElementById(`docCodeudor${num}`).setAttribute('disabled', 'disabled');
    document.getElementById(`docCodeudor${num}Frente`).disabled = false;
    document.getElementById(`docCodeudor${num}Reverso`).disabled = false;
  }
}

function addMoreCodeudor(hasMore, currentNum) {
  document.getElementById(`btnMoreCodeudor${currentNum}No`).classList.remove('selected');
  document.getElementById(`btnMoreCodeudor${currentNum}Si`).classList.remove('selected');
  event.target.classList.add('selected');
  
  if (hasMore && currentNum < 3) {
    state.numCodeudores = currentNum + 1;
  } else {
    if (state.numCodeudores > currentNum) {
      for (let i = currentNum + 1; i <= state.numCodeudores; i++) {
        limpiarCodeudor(i);
      }
    }
    state.numCodeudores = currentNum;
  }
  actualizarPasosDinamicos();
}

function limpiarCodeudor(num) {
  delete state.archivosBase64[`docCodeudor${num}`];
  delete state.archivosBase64[`docCodeudor${num}Frente`];
  delete state.archivosBase64[`docCodeudor${num}Reverso`];
  const c = document.getElementById(`codeudor${num}Fields`);
  if (c) c.innerHTML = '';
  delete state.codeudorDataSaved[num];
  delete state.codeudorDocTipo[num];
  state.codeudorFieldsCreated[num] = false;
}

function limpiarTodosCodeudores() {
  for (let i = 1; i <= 3; i++) limpiarCodeudor(i);
  state.numCodeudores = 0;
  state.codeudorDataSaved = {};
  state.codeudorFieldsCreated = {};
  state.codeudorDocTipo = {};
}

function guardarDatosCodeudor(num) {
  const tipo = document.getElementById(`tipoDocCodeudor${num}`);
  if (tipo) {
    state.codeudorDataSaved[num] = {
      tipoDocumento: tipo.value,
      numeroDocumento: document.getElementById(`numDocCodeudor${num}`)?.value || '',
      nombres: document.getElementById(`nombresCodeudor${num}`)?.value || '',
      apellidos: document.getElementById(`apellidosCodeudor${num}`)?.value || '',
      email: document.getElementById(`emailCodeudor${num}`)?.value || '',
      celular: document.getElementById(`celularCodeudor${num}`)?.value || '',
      fechaExpedicion: document.getElementById(`fechaExpedicionCodeudor${num}`)?.value || ''
    };
  }
}

// ==============================
// MANEJO DE ARCHIVOS CODEUDORES
// ==============================
function handleCodeudorFile(input, index) {
  const file = input.files[0];
  if (!file) return;
  
  if (file.size > state.maxFileSize) {
    alert('Archivo excede límite');
    input.value = '';
    return;
  }
  
  const label = document.getElementById(`labelDocCodeudor${index}`);
  if (label) {
    label.textContent = file.name;
    label.classList.add('file-selected');
  }
  convertirArchivoBase64(input);
}

function handleCodeudorDocumentUpload(input, index, parte) {
  const file = input.files[0];
  if (!file) return;
  
  if (file.size > state.maxFileSize) {
    alert('Archivo excede límite');
    input.value = '';
    return;
  }
  
  const label = document.getElementById(`labelDocCodeudor${index}${parte}`);
  if (label) {
    label.textContent = file.name;
    label.classList.add('file-selected');
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    state.archivosBase64[`docCodeudor${index}${parte}`] = {
      nombre: file.name,
      tipo: file.type,
      contenido: e.target.result
    };
  };
  reader.readAsDataURL(file);
}

console.info('✅ [Codeudores] Sistema de codeudores cargado');