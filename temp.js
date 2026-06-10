
    (function () {
      // --------- Estado ----------
      const state = {
        cdr: '',
        modoCorreccion: false,
        docsCorreccion: [],
        step: 0,
        max: 4,
        archivos: {},
        servicios: [],
        maxFileSize: CONFIG?.MAX_FILE_SIZE || (10 * 1024 * 1024),
        saveDelay: null
      };
      // --------- Persistencia: Texto en localStorage, Archivos en IndexedDB ----------
      const DB_NAME = 'efirma_propietario_db';
      const DB_VERSION = 1;
      const DB_STORE = 'archivos';

      function abrirDB() {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (e) => { e.target.result.createObjectStore(DB_STORE); };
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = (e) => reject(e.target.error);
        });
      }

      async function guardarArchivosEnDB() {
        if (!state.cdr || state.modoCorreccion) return;
        try {
          const db = await abrirDB();
          const tx = db.transaction(DB_STORE, 'readwrite');
          const store = tx.objectStore(DB_STORE);
          store.put(JSON.parse(JSON.stringify(state.archivos)), `files_${state.cdr}`);
          store.put(state.servicios, `servicios_${state.cdr}`);
        } catch (e) { console.warn('No se pudieron guardar archivos en IndexedDB.', e); }
      }

      async function cargarArchivosDeDB() {
        if (!state.cdr || state.modoCorreccion) return;
        try {
          const db = await abrirDB();
          const tx = db.transaction(DB_STORE, 'readonly');
          const store = tx.objectStore(DB_STORE);

          const archivos = await new Promise((res, rej) => {
            const r = store.get(`files_${state.cdr}`);
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
          });

          if (archivos && typeof archivos === 'object') {
            state.archivos = archivos;
            // Restaurar la UI para cada archivo guardado
            const nameMap = {
              docFront: 'docFrontName', docBack: 'docBackName',
              certTradicion: 'certTradicionName', sarlaft: 'sarlaftName',
              certBancario: 'certBancarioName',
              facturaAgua: 'facturaAguaName', facturaLuz: 'facturaLuzName',
              facturaGas: 'facturaGasName', facturaTelefono: 'facturaTelefonoName',
              facturaInternet: 'facturaInternetName'
            };
            for (const [key, archivo] of Object.entries(archivos)) {
              if (archivo && archivo.nombre) {
                const nameElId = nameMap[key];
                if (nameElId) {
                  const nameElement = document.getElementById(nameElId);
                  if (nameElement) nameElement.textContent = '✅ ' + archivo.nombre;
                }
                const container = document.getElementById(key);
                if (container) {
                  const wrapper = container.closest('.file-upload');
                  if (wrapper) wrapper.classList.add('has-file');
                }
              }
            }
          }
        } catch (e) { console.warn('No se pudieron cargar archivos de IndexedDB.', e); }
      }

      async function limpiarDB() {
        try {
          const db = await abrirDB();
          const tx = db.transaction(DB_STORE, 'readwrite');
          const store = tx.objectStore(DB_STORE);
          store.delete(`files_${state.cdr}`);
          store.delete(`servicios_${state.cdr}`);
        } catch (e) { /* silencioso */ }
      }

      function guardarProgresoUsuario() {
        if (state.modoCorreccion || !state.cdr) return;

        clearTimeout(state.saveDelay);
        state.saveDelay = setTimeout(() => {
          try {
            const formData = {
              step: state.step,
              tipoDocumento: el.tipoDocumento.value,
              numeroDocumento: el.numeroDocumento.value,
              confirmarDocumento: el.confirmarDocumento.value,
              nombres: el.nombres.value,
              apellidos: el.apellidos.value,
              email: el.email.value,
              confirmarEmail: el.confirmarEmail.value,
              celular: el.celular.value,
              confirmarCelular: el.confirmarCelular.value,
              tipoCuenta: el.tipoCuenta.value,
              numeroCuenta: el.numeroCuenta.value,
              banco: el.banco.value,
              titularCuenta: el.titularCuenta.value,
              docTitular: el.docTitular.value
            };

            const checkboxes = document.querySelectorAll('.servicio-checkbox input[type="checkbox"]');
            checkboxes.forEach(cb => { formData[cb.id] = cb.checked; });

            localStorage.setItem(`efirma_prop_${state.cdr}`, JSON.stringify(formData));

            // Guardar archivos en IndexedDB (sin límite de tamaño)
            guardarArchivosEnDB();
          } catch (e) { console.warn('No se pudo guardar progreso.', e); }
        }, 800);
      }

      async function cargarProgresoUsuario() {
        if (state.modoCorreccion || !state.cdr) return;

        let savedStep = 0;

        try {
          // 1. Restaurar campos de texto desde localStorage
          const saved = localStorage.getItem(`efirma_prop_${state.cdr}`);
          if (saved) {
            const formData = JSON.parse(saved);

            if (formData.tipoDocumento) el.tipoDocumento.value = formData.tipoDocumento;
            if (formData.numeroDocumento) el.numeroDocumento.value = formData.numeroDocumento;
            if (formData.confirmarDocumento) el.confirmarDocumento.value = formData.confirmarDocumento;
            if (formData.nombres) el.nombres.value = formData.nombres;
            if (formData.apellidos) el.apellidos.value = formData.apellidos;
            if (formData.email) el.email.value = formData.email;
            if (formData.confirmarEmail) el.confirmarEmail.value = formData.confirmarEmail;
            if (formData.celular) el.celular.value = formData.celular;
            if (formData.confirmarCelular) el.confirmarCelular.value = formData.confirmarCelular;

            if (formData.tipoCuenta) el.tipoCuenta.value = formData.tipoCuenta;
            if (formData.numeroCuenta) el.numeroCuenta.value = formData.numeroCuenta;
            if (formData.banco) el.banco.value = formData.banco;
            if (formData.titularCuenta) el.titularCuenta.value = formData.titularCuenta;
            if (formData.docTitular) el.docTitular.value = formData.docTitular;

            // Restaurar checkboxes
            const checkboxes = document.querySelectorAll('.servicio-checkbox input[type="checkbox"]');
            checkboxes.forEach(cb => {
              if (formData[cb.id] !== undefined) {
                cb.checked = formData[cb.id];
                cb.dispatchEvent(new Event('change'));
              }
            });

            // Guardar paso para restaurar DESPUÉS de evaluar
            if (typeof formData.step === 'number' && formData.step > 0) {
              savedStep = formData.step;
            }
          }

          // 2. Restaurar archivos desde IndexedDB (ANTES de evaluar disclosure)
          await cargarArchivosDeDB();

          // 3. AHORA que todo está restaurado, revelar campos progresivos
          evaluateProgress();

          // 4. Navegar al paso guardado (después de que todo esté visible)
          if (savedStep > 0) {
            setTimeout(() => gotoStep(savedStep, true), 50);
          }

        } catch (e) {
          console.warn('No se pudo cargar el progreso.', e);
        }
      }

      // --------- Shortcuts ----------
      const $ = (id) => document.getElementById(id);
      const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

      // --------- Elementos ----------
      const el = {
        bannerCorreccion: $("bannerCorreccion"),
        correccionDocs: $("correccionDocs"),
        alertBox: $("alertBox"),
        loader: $("loader"),
        btnPrev: $("btnPrev"),
        btnNext: $("btnNext"),
        btnEnviar: $("btnEnviar"),
        resumen: $("resumen"),
        // Datos personales
        tipoDocumento: $("tipoDocumento"),
        numeroDocumento: $("numeroDocumento"),
        confirmarDocumento: $("confirmarDocumento"),
        nombres: $("nombres"),
        apellidos: $("apellidos"),
        email: $("email"),
        confirmarEmail: $("confirmarEmail"),
        celular: $("celular"),
        confirmarCelular: $("confirmarCelular"),
        docError: $("docError"),
        emailError: $("emailError"),
        celError: $("celError"),
        // Documentos
        docFront: $("docFront"),
        docFrontName: $("docFrontName"),
        docBack: $("docBack"),
        docBackName: $("docBackName"),
        certTradicion: $("certTradicion"),
        certTradicionName: $("certTradicionName"),
        sarlaft: $("sarlaft"),
        sarlaftName: $("sarlaftName"),
        // Bancarios
        tipoCuenta: $("tipoCuenta"),
        numeroCuenta: $("numeroCuenta"),
        banco: $("banco"),
        titularCuenta: $("titularCuenta"),
        docTitular: $("docTitular"),
        certBancario: $("certBancario"),
        certBancarioName: $("certBancarioName"),
        // Servicios
        servicioAgua: $("servicioAgua"),
        servicioLuz: $("servicioLuz"),
        servicioGas: $("servicioGas"),
        servicioTelefono: $("servicioTelefono"),
        servicioInternet: $("servicioInternet"),
        // Pagos
        btnPayBreb: $("btnPayBreb"),
        btnPayWompi: $("btnPayWompi"),
        modalBreb: $("modalBreb"),
        brebNumber: $("brebNumber"),
        btnCopyBreb: $("btnCopyBreb"),
        btnCloseBreb: $("btnCloseBreb"),
        toast: $("toast")
      };

      // --------- Validación ----------
      const rx = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\d{10}$/,
        num: /^[0-9A-Za-z.-]{5,}$/
      };

      // --------- Init ----------
      init();

      async function init() {
        const params = new URLSearchParams(location.search);
        state.cdr = params.get('cdr') || '';
        const dir = params.get('dir') || '';
        state.modoCorreccion = (params.get('modo') === 'correccion');
        const docs = params.get('docs');
        if(document.getElementById('displayDir')) {
          if (dir) {
            document.getElementById('displayDir').textContent = dir;
          } else if (state.cdr && typeof CONFIG !== "undefined" && CONFIG.API_URL) {
            
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            window[callbackName] = function(data) {
              if (data && data.success && data.direccion) {
                document.getElementById('displayDir').textContent = data.direccion;
              }
              delete window[callbackName];
            };
            const script = document.createElement('script');
            script.src = CONFIG.API_URL + '?accion=obtenerDireccion&cdr=' + encodeURIComponent(state.cdr) + '&callback=' + callbackName;
            document.body.appendChild(script);

          }
        }

        if (!state.cdr) {
          showAlert('warning', 'CDR no presente.');
          return;
        }

        if (state.modoCorreccion) {
          try {
            state.docsCorreccion = docs ? JSON.parse(decodeURIComponent(docs)) : [];
          } catch (e) { state.docsCorreccion = []; }
          renderCorreccionBanner();
          
          // Bypass welcome screen in correction mode
          const welcome = document.getElementById('welcomeScreen');
          const mainWiz = document.getElementById('mainWizard');
          if (welcome && mainWiz) {
            welcome.style.display = 'none';
            mainWiz.style.display = 'block';
          }
        }

        renderSteps();
        bindWizard();
        bindFiles();
        bindServicios();
        bindProgressValidators();
        updateMicroProgress();

        // Cargar progreso DESPUÉS de que todo esté bindado
        if (!state.modoCorreccion) {
          await cargarProgresoUsuario();
        }
      }

      // Update XP Bar dynamically
      function updateMicroProgress() {
        const activePane = document.querySelector('.step-pane.show');
        if (!activePane) return;
        
        const requiredFields = Array.from(activePane.querySelectorAll('input[required], select[required]'))
          .filter(el => {
            // No excluimos los 'progressive-hidden' para que el TOTAL sea constante
            // y el porcentaje nunca baje al revelar nuevos campos.
            const container = el.closest('.hidden');
            if (container && container.classList.contains('hidden')) return false;
            return true;
          });
        
        let filled = 0;
        requiredFields.forEach(field => {
          if (field.type === 'file') {
            if (field.files && field.files.length > 0) filled++;
          } else {
            if (field.value.trim() !== '') filled++;
          }
        });

        // Sumar facturas de servicios si el checkbox está marcado
        if (state.step === 3) {
            let totalFacturasRequeridas = 0;
            let facturasAdjuntadas = 0;
            const servicios = ['Agua', 'Luz', 'Gas', 'Telefono', 'Internet'];
            servicios.forEach(srv => {
                const cb = document.getElementById('servicio' + srv);
                if(cb && cb.checked) {
                    totalFacturasRequeridas++;
                    const fi = document.getElementById('factura' + srv);
                    if(fi && fi.files && fi.files.length > 0) facturasAdjuntadas++;
                }
            });
            filled += facturasAdjuntadas;
            requiredFields.push(...Array(totalFacturasRequeridas).fill(null)); // Mock para sumar al total
        }

        const total = requiredFields.length || 1;
        const percentage = Math.round((filled / total) * 100);
        
        const xpBar = document.getElementById('xpBar');
        const xpText = document.getElementById('xpText');
        if (xpBar && xpText) {
          xpBar.style.width = percentage + '%';
          xpText.textContent = percentage + '%';
          
          if (percentage >= 100) {
            xpBar.style.background = 'linear-gradient(90deg, var(--success), #34d399)';
            xpBar.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.6)';
            xpText.style.color = 'var(--success)';
          } else {
            xpBar.style.background = 'linear-gradient(90deg, #d4af37, #f0c541)';
            xpBar.style.boxShadow = '0 0 15px rgba(212,175,55,0.6)';
            xpText.style.color = 'var(--primary)';
          }
        }

        // Gamify main progress line
        const line = document.getElementById('progressLine');
        if (line && state.step < state.max) {
            const baseProgress = (state.step / state.max) * 100;
            const microAdd = (percentage / 100) * (100 / state.max) * 0.95; 
            line.style.width = (baseProgress + microAdd) + '%';
        } else if (line && state.step === state.max) {
            line.style.width = '100%';
        }
      }

      // Bind micro progress to inputs
      document.addEventListener('input', updateMicroProgress);
      document.addEventListener('change', updateMicroProgress);

      // --------- Corrección ----------
      function renderCorreccionBanner() {
        if (!state.docsCorreccion.length) return;
        el.bannerCorreccion.classList.remove('hidden');

        // Nombres amigables
        const friendlyNames = {
          'docFront': 'Cédula Frontal',
          'docBack': 'Cédula Reverso',
          'certTradicion': 'Certificado Tradición',
          'sarlaft': 'Formato SARLAFT',
          'certBancario': 'Certificación Bancaria',
          'facturaAgua': 'Factura Agua',
          'facturaLuz': 'Factura Luz',
          'facturaGas': 'Factura Gas',
          'facturaTelefono': 'Factura Teléfono',
          'facturaInternet': 'Factura Internet'
        };
        el.correccionDocs.innerHTML = state.docsCorreccion.map(d => {
          const label = friendlyNames[d] || d;
          return `<span class="chip">${escapeHTML(label)}</span>`;
        }).join('');

        // Marcar archivos no requeridos como ocultos
        const allFileKeys = [
          'docFront', 'docBack', 'certTradicion', 'sarlaft', 'certBancario',
          'facturaAgua', 'facturaLuz', 'facturaGas', 'facturaTelefono', 'facturaInternet', 'comprobantePago'
        ];
        allFileKeys.forEach(key => {
          if (!state.docsCorreccion.includes(key)) {
            const input = document.getElementById(key);
            if (input) {
              const wrapper = input.closest('.file-upload') || input.closest('.servicio-item') || input.closest('.form-group');
              if (wrapper) {
                wrapper.style.display = 'none';
              }
            }
          }
        });

        // Ocultar campos de texto que no sean de archivo
        const step2Pane = document.querySelector('.step-pane[data-pane="2"]');
        if (step2Pane) {
          step2Pane.querySelectorAll('.form-group').forEach(fg => {
            if (!fg.querySelector('.file-upload') && !fg.querySelector('.file-input')) {
              fg.style.display = 'none';
            }
          });
        }
        
        // Ocultar paso 0 (Datos personales) completamente
        const step0Pane = document.querySelector('.step-pane[data-pane="0"]');
        if (step0Pane) {
            step0Pane.style.display = 'none';
        }
        
        // Simular clic en el paso 1 para saltar datos personales
        setTimeout(() => {
             const step1 = document.querySelector('.step-indicator[data-step="1"]');
             if(step1) step1.click();
        }, 300);
      }

      // --------- Wizard ----------

      // Propietario: Step 0=datos, Step 1=docs(docFront,docBack,certTradicion,sarlaft),
      // Step 2=bancario(certBancario), Step 3=servicios(facturas), Step 4=resumen
      function getStepFileKeys(step) {
        if (step === 1) return ['docFront', 'docBack', 'certTradicion', 'sarlaft'];
        if (step === 2) return ['certBancario'];
        if (step === 3) return ['facturaAgua', 'facturaLuz', 'facturaGas', 'facturaTelefono', 'facturaInternet'];
        return []; // Step 0 y 4 no tienen archivos
      }

      function isStepNeededInCorrection(step) {
        if (step === state.max) return true; // Resumen siempre visible
        if (!state.modoCorreccion) return true;
        const keys = getStepFileKeys(step);
        if (keys.length === 0) return false; // Pasos de solo texto se saltan
        return keys.some(k => state.docsCorreccion.includes(k));
      }

      function getNextRelevantStep(current) {
        for (let s = current + 1; s <= state.max; s++) {
          if (isStepNeededInCorrection(s)) return s;
        }
        return state.max;
      }

      function getPrevRelevantStep(current) {
        for (let s = current - 1; s >= 0; s--) {
          if (isStepNeededInCorrection(s)) return s;
        }
        return current;
      }

      function getFirstRelevantStep() {
        for (let s = 0; s <= state.max; s++) {
          if (isStepNeededInCorrection(s)) return s;
        }
        return 0;
      }

      function renderSteps() {
        if (state.modoCorreccion && state.docsCorreccion.length > 0) {
          for (let s = 0; s < state.max; s++) {
            const stepEl = document.querySelector(`.progress .step[data-step="${s}"]`);
            if (stepEl && !isStepNeededInCorrection(s)) {
              stepEl.style.display = 'none';
            }
          }
          gotoStep(getFirstRelevantStep(), true);
        } else {
          gotoStep(0, true);
        }
      }

      function bindWizard() {
        el.btnPrev.addEventListener('click', () => {
          if (state.modoCorreccion) {
            gotoStep(getPrevRelevantStep(state.step));
          } else {
            gotoStep(state.step - 1);
          }
        });
        el.btnNext.addEventListener('click', () => {
          if (!validateStep(state.step)) return;
          if (state.modoCorreccion) {
            gotoStep(getNextRelevantStep(state.step));
          } else {
            if (state.step < state.max) gotoStep(state.step + 1);
          }
        });
        el.btnEnviar.addEventListener('click', onSubmit);

        qsa('.progress .step').forEach(s => {
          s.addEventListener('click', () => {
            const target = Number(s.dataset.step);
            if (target <= state.step) return gotoStep(target);
            if (validateStep(state.step)) gotoStep(target);
          });
        });
      }



      function gotoStep(n, first = false) {
        state.step = Math.max(0, Math.min(n, state.max));
        qsa('.step-pane').forEach(p => p.classList.toggle('show', Number(p.dataset.pane) === state.step));

        qsa('.progress .step').forEach(s => {
          const sNum = Number(s.dataset.step);
          s.classList.toggle('active', sNum === state.step);
          s.classList.toggle('completed', sNum < state.step);
        });

        // La línea principal se actualiza via updateMicroProgress()
        // por lo que no la sobreescribimos aquí para no perder la gamificación.

        const firstRelevant = state.modoCorreccion ? getFirstRelevantStep() : 0;
        el.btnPrev.classList.toggle('hidden', state.step === firstRelevant);
        el.btnNext.classList.toggle('hidden', state.step === state.max);
        el.btnEnviar.classList.toggle('hidden', state.step !== state.max);

        if (state.step === state.max) buildSummary();
        if (!first) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          guardarProgresoUsuario();
        }
        updateMicroProgress();
      }

      // --------- Files ----------
      function bindFiles() {
        bindFile(el.docFront, 'docFront', el.docFrontName);
        bindFile(el.docBack, 'docBack', el.docBackName);
        bindFile(el.certTradicion, 'certTradicion', el.certTradicionName);
        bindFile(el.sarlaft, 'sarlaft', el.sarlaftName);
        bindFile(el.certBancario, 'certBancario', el.certBancarioName);

        // Servicios
        bindFile($('facturaAgua'), 'facturaAgua', $('facturaAguaName'));
        bindFile($('facturaLuz'), 'facturaLuz', $('facturaLuzName'));
        bindFile($('facturaGas'), 'facturaGas', $('facturaGasName'));
        bindFile($('facturaTelefono'), 'facturaTelefono', $('facturaTelefonoName'));
        bindFile($('facturaInternet'), 'facturaInternet', $('facturaInternetName'));
      }

      function bindFile(input, key, nameEl) {
        if (!input) return;
        input.addEventListener('change', () => handleFile(input.files?.[0], key, nameEl));
      }

      function handleFile(file, key, nameEl) {
        if (!file) return;
        if (file.size > state.maxFileSize) {
          showAlert('danger', `El archivo "${file.name}" excede el límite de ${(state.maxFileSize / 1024 / 1024).toFixed(0)}MB.`);
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Result = e.target.result;

          // ── Interceptar certTradicion para validación OCR ──
          if (key === 'certTradicion') {
            validarCertificadoOCR(base64Result, file.name, nameEl);
            return; // No guardar aún, el callback del OCR lo hará si es vigente
          }

          // Flujo normal para otros archivos
          state.archivos[key] = { nombre: file.name, tipo: file.type, contenido: base64Result };
          if (nameEl) nameEl.textContent = file.name;
          const container = document.getElementById(key);
          if (container) {
            const wrapper = container.closest('.file-upload');
            if (wrapper) wrapper.classList.add('has-file');
          }
          evaluateProgress();
          guardarArchivosEnDB();
        };
        reader.readAsDataURL(file);
      }

      // ── OCR Validation Modal Logic ──
      function validarCertificadoOCR(base64, fileName, nameEl) {
        const modal = document.getElementById('modalOCRValidacion');
        const estadoAnalizando = document.getElementById('ocrEstadoAnalizando');
        const estadoVigente = document.getElementById('ocrEstadoVigente');
        const estadoVencido = document.getElementById('ocrEstadoVencido');
        const estadoError = document.getElementById('ocrEstadoError');

        // Reset states
        estadoAnalizando.style.display = 'block';
        estadoVigente.style.display = 'none';
        estadoVencido.style.display = 'none';
        estadoError.style.display = 'none';
        modal.classList.remove('closing');
        modal.classList.add('show');

        const payload = {
          accion: 'validarCertificadoOCR',
          base64: base64
        };

        fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        })
          .then(res => res.json())
          .then(result => {
            estadoAnalizando.style.display = 'none';

            if (!result || !result.success) {
              // Error de OCR: dejar continuar pero advertir
              document.getElementById('ocrErrorMsg').textContent = result?.mensaje || 'No se pudo leer el documento.';
              estadoError.style.display = 'block';
              // Guardar archivo de todas formas (el admin validará en el panel)
              window._ocrPendingFile = { base64: base64, fileName: fileName, nameEl: nameEl };
              return;
            }

            if (result.vigente) {
              // ✅ Certificado vigente
              const diasTxt = result.diasAntiguedad >= 0
                ? `Expedido hace ${result.diasAntiguedad} día${result.diasAntiguedad !== 1 ? 's' : ''}`
                : 'Fecha no detectada — verificar manualmente';
              document.getElementById('ocrBadgeDias').textContent = diasTxt;
              estadoVigente.style.display = 'block';

              // Guardar archivo normalmente
              state.archivos['certTradicion'] = { nombre: fileName, tipo: 'application/pdf', contenido: base64 };
              if (nameEl) nameEl.textContent = fileName;
              const container = document.getElementById('certTradicion');
              if (container) {
                const wrapper = container.closest('.file-upload');
                if (wrapper) wrapper.classList.add('has-file');
              }
              evaluateProgress();
              guardarArchivosEnDB();

              // Auto-cerrar en 3 segundos
              setTimeout(() => cerrarModalOCR(), 3000);

            } else {
              // ❌ Certificado vencido
              document.getElementById('ocrBadgeDiasVencido').textContent =
                `Tiene ${result.diasAntiguedad} días de expedido`;
              estadoVencido.style.display = 'block';

              // Limpiar el input file
              const inputCert = document.getElementById('certTradicion');
              if (inputCert) inputCert.value = '';
              if (nameEl) nameEl.textContent = '';
              const container = document.getElementById('certTradicion');
              if (container) {
                const wrapper = container.closest('.file-upload');
                if (wrapper) wrapper.classList.remove('has-file');
              }
              // NO guardar el archivo
            }
          })
          .catch(error => {
            estadoAnalizando.style.display = 'none';
            document.getElementById('ocrErrorMsg').textContent = 'Error de red: ' + (error.message || error);
            estadoError.style.display = 'block';
            window._ocrPendingFile = { base64: base64, fileName: fileName, nameEl: nameEl };
          });
      }

      // Listen for force-accept from the global cerrarModalOCR(true) call
      document.addEventListener('ocrForceAccept', function(e) {
        const pf = e.detail;
        if (pf && pf.base64) {
          state.archivos['certTradicion'] = { nombre: pf.fileName, tipo: 'application/pdf', contenido: pf.base64 };
          if (pf.nameEl) pf.nameEl.textContent = pf.fileName;
          const container = document.getElementById('certTradicion');
          if (container) {
            const wrapper = container.closest('.file-upload');
            if (wrapper) wrapper.classList.add('has-file');
          }
          evaluateProgress();
          guardarArchivosEnDB();
        }
      });

      // --------- Servicios ----------
      function bindServicios() {
        ['agua', 'luz', 'gas', 'telefono', 'internet'].forEach(tipo => {
          const checkbox = $(`servicio${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
          const item = document.querySelector(`.servicio-item[data-servicio="${tipo}"]`);
          const uploadDiv = item?.querySelector('.servicio-upload');

          checkbox?.addEventListener('change', () => {
            if (checkbox.checked) {
              item?.classList.add('selected');
              uploadDiv?.classList.add('visible');
              if (!state.servicios.includes(tipo)) state.servicios.push(tipo);
            } else {
              item?.classList.remove('selected');
              uploadDiv?.classList.remove('visible');
              state.servicios = state.servicios.filter(s => s !== tipo);
            }
          });
        });
      }

      // --------- Pagos ----------
      function bindPagos() {
        el.brebNumber.value = CONFIG?.PAGO?.NEQUI || '3177623878';
        el.btnPayBreb.addEventListener('click', openBrebModal);
        el.btnCloseBreb.addEventListener('click', closeBrebModal);
        el.modalBreb.addEventListener('click', (e) => { if (e.target === el.modalBreb) closeBrebModal(); });
        el.btnCopyBreb.addEventListener('click', copyBreb);
        el.btnPayWompi.addEventListener('click', handlePayWompi);
      }

      function openBrebModal() {
        el.modalBreb.classList.add('show');
        el.modalBreb.setAttribute('aria-hidden', 'false');
        el.brebNumber.select();
      }

      function closeBrebModal() {
        el.modalBreb.classList.remove('show');
        el.modalBreb.setAttribute('aria-hidden', 'true');
      }

      async function copyBreb() {
        const value = (CONFIG?.PAGO?.NEQUI || '').toString().trim();
        try {
          if (!value) throw new Error('Número de pago no configurado.');
          await navigator.clipboard.writeText(value);
          toast('Número copiado: ' + value);
        } catch (e) {
          toast('No se pudo copiar. Selecciona y copia manualmente.');
        }
      }

      function handlePayWompi() {
        const url = CONFIG?.PAGO?.WOMPI_LINK || '';
        if (!url) return showAlert('warning', 'No encontramos el enlace de pago con tarjeta.');
        window.open(url, '_blank', 'noopener');
      }

      // --------- Progressive Validation ----------
      function evaluateProgress() {
        if (state.step === state.max) return;
        const requiredFields = getRequiredForStep(state.step);

        if (requiredFields.length) {
          let filledCount = 0;
          requiredFields.forEach(field => {
            if (field.isType === 'file' && state.archivos[field.id]) filledCount++;
            else if (field.isType === 'input' && field.el && field.el.value.trim() !== '') filledCount++;
          });

          const percentage = (filledCount / requiredFields.length) * 100;
          const baseWidth = (state.step / state.max) * 100;
          const extraWidth = (percentage / 100) * (100 / state.max);

          const line = document.getElementById('progressLine');
          if (line) {
            line.style.width = (baseWidth + extraWidth) + '%';
          }
        }

        // --- LÓGICA DE REVELACIÓN PROGRESIVA ---
        // Paso 0
        const vTipo = el.tipoDocumento.value.trim();
        const prog2_0 = document.getElementById('prog-prop-0-2');
        if (prog2_0) {
          if (vTipo) {
            prog2_0.classList.remove('progressive-hidden'); prog2_0.classList.add('progressive-visible');
          } else {
            prog2_0.classList.add('progressive-hidden'); prog2_0.classList.remove('progressive-visible');
          }
        }

        const vNum = el.numeroDocumento.value.trim();
        const vConfNum = el.confirmarDocumento.value.trim();
        if (vNum && vConfNum && vNum !== vConfNum) {
          el.confirmarDocumento.classList.add('invalid');
          el.docError.classList.add('show');
        } else {
          el.confirmarDocumento.classList.remove('invalid');
          el.docError.classList.remove('show');
        }
        const prog3_0 = document.getElementById('prog-prop-0-3');
        if (prog3_0) {
          if (vNum && vConfNum && vNum === vConfNum && rx.num.test(vNum)) {
            prog3_0.classList.remove('progressive-hidden'); prog3_0.classList.add('progressive-visible');
          } else {
            prog3_0.classList.add('progressive-hidden'); prog3_0.classList.remove('progressive-visible');
          }
        }

        const vNom = el.nombres.value.trim();
        const vApe = el.apellidos.value.trim();
        const prog4_0 = document.getElementById('prog-prop-0-4');
        if (prog4_0) {
          if (vNom && vApe) {
            prog4_0.classList.remove('progressive-hidden'); prog4_0.classList.add('progressive-visible');
          } else {
            prog4_0.classList.add('progressive-hidden'); prog4_0.classList.remove('progressive-visible');
          }
        }

        const vEmail = el.email.value.trim();
        const vConfEmail = el.confirmarEmail.value.trim();
        if (vEmail && vConfEmail && vEmail !== vConfEmail) {
          el.confirmarEmail.classList.add('invalid');
          el.emailError.classList.add('show');
        } else {
          el.confirmarEmail.classList.remove('invalid');
          el.emailError.classList.remove('show');
        }
        const prog5_0 = document.getElementById('prog-prop-0-5');
        if (prog5_0) {
          if (vEmail && vConfEmail && vEmail === vConfEmail && rx.email.test(vEmail)) {
            prog5_0.classList.remove('progressive-hidden'); prog5_0.classList.add('progressive-visible');
          } else {
            prog5_0.classList.add('progressive-hidden'); prog5_0.classList.remove('progressive-visible');
          }
        }

        const vCel = el.celular.value.trim();
        const vConfCel = el.confirmarCelular.value.trim();
        if (vCel && vConfCel && vCel !== vConfCel) {
          el.confirmarCelular.classList.add('invalid');
          el.celError.classList.add('show');
        } else {
          el.confirmarCelular.classList.remove('invalid');
          el.celError.classList.remove('show');
        }

        // Paso 1
        const prog2_1 = document.getElementById('prog-prop-1-2');
        if (prog2_1) {
          if (state.archivos['docFront']) {
            prog2_1.classList.remove('progressive-hidden'); prog2_1.classList.add('progressive-visible');
          } else {
            prog2_1.classList.add('progressive-hidden'); prog2_1.classList.remove('progressive-visible');
          }
        }
        const prog3_1 = document.getElementById('prog-prop-1-3');
        if (prog3_1) {
          if (state.archivos['docBack']) {
            prog3_1.classList.remove('progressive-hidden'); prog3_1.classList.add('progressive-visible');
          } else {
            prog3_1.classList.add('progressive-hidden'); prog3_1.classList.remove('progressive-visible');
          }
        }
        const prog4_1 = document.getElementById('prog-prop-1-4');
        if (prog4_1) {
          if (state.archivos['certTradicion']) {
            prog4_1.classList.remove('progressive-hidden'); prog4_1.classList.add('progressive-visible');
          } else {
            prog4_1.classList.add('progressive-hidden'); prog4_1.classList.remove('progressive-visible');
          }
        }

        // Paso 2
        const vTCuenta = el.tipoCuenta.value.trim();
        const prog2_2 = document.getElementById('prog-prop-2-2');
        if (prog2_2) {
          if (vTCuenta) {
            prog2_2.classList.remove('progressive-hidden'); prog2_2.classList.add('progressive-visible');
          } else {
            prog2_2.classList.add('progressive-hidden'); prog2_2.classList.remove('progressive-visible');
          }
        }

        const vNCuenta = el.numeroCuenta.value.trim();
        const prog3_2 = document.getElementById('prog-prop-2-3');
        if (prog3_2) {
          if (vNCuenta) {
            prog3_2.classList.remove('progressive-hidden'); prog3_2.classList.add('progressive-visible');
          } else {
            prog3_2.classList.add('progressive-hidden'); prog3_2.classList.remove('progressive-visible');
          }
        }

        const vBanco = el.banco.value.trim();
        const prog4_2 = document.getElementById('prog-prop-2-4');
        if (prog4_2) {
          if (vBanco) {
            prog4_2.classList.remove('progressive-hidden'); prog4_2.classList.add('progressive-visible');
          } else {
            prog4_2.classList.add('progressive-hidden'); prog4_2.classList.remove('progressive-visible');
          }
        }

        const vTitular = el.titularCuenta.value.trim();
        const prog5_2 = document.getElementById('prog-prop-2-5');
        if (prog5_2) {
          if (vTitular) {
            prog5_2.classList.remove('progressive-hidden'); prog5_2.classList.add('progressive-visible');
          } else {
            prog5_2.classList.add('progressive-hidden'); prog5_2.classList.remove('progressive-visible');
          }
        }

        const vDocTitular = el.docTitular.value.trim();
        const prog6_2 = document.getElementById('prog-prop-2-6');
        if (prog6_2) {
          if (vDocTitular) {
            prog6_2.classList.remove('progressive-hidden'); prog6_2.classList.add('progressive-visible');
          } else {
            prog6_2.classList.add('progressive-hidden'); prog6_2.classList.remove('progressive-visible');
          }
        }

        const isValid = validateStepRaw(state.step);
        el.btnNext.disabled = !isValid;
        updateMicroProgress();
      }

      function getRequiredForStep(step) {
        if (state.modoCorreccion) {
          if (step === 1) return [{ id: 'docFront', isType: 'file' }, { id: 'docBack', isType: 'file' }, { id: 'certTradicion', isType: 'file' }, { id: 'sarlaft', isType: 'file' }].filter(f => state.docsCorreccion.includes(f.id));
          if (step === 2) return [{ id: 'certBancario', isType: 'file' }].filter(f => state.docsCorreccion.includes(f.id));
          if (step === 3) return [{ id: 'facturaAgua', isType: 'file' }, { id: 'facturaLuz', isType: 'file' }, { id: 'facturaGas', isType: 'file' }, { id: 'facturaTelefono', isType: 'file' }, { id: 'facturaInternet', isType: 'file' }].filter(f => state.docsCorreccion.includes(f.id));
          if (step === 4) return [{ id: 'comprobantePago', isType: 'file' }].filter(f => state.docsCorreccion.includes(f.id));
          return [];
        }

        if (step === 0) return [
          { id: 'tipoDocumento', isType: 'input', el: el.tipoDocumento },
          { id: 'numeroDocumento', isType: 'input', el: el.numeroDocumento },
          { id: 'confirmarDocumento', isType: 'input', el: el.confirmarDocumento },
          { id: 'nombres', isType: 'input', el: el.nombres },
          { id: 'apellidos', isType: 'input', el: el.apellidos },
          { id: 'email', isType: 'input', el: el.email },
          { id: 'confirmarEmail', isType: 'input', el: el.confirmarEmail },
          { id: 'celular', isType: 'input', el: el.celular },
          { id: 'confirmarCelular', isType: 'input', el: el.confirmarCelular }
        ];
        if (step === 1) return [
          { id: 'docFront', isType: 'file' },
          { id: 'docBack', isType: 'file' },
          { id: 'certTradicion', isType: 'file' },
          { id: 'sarlaft', isType: 'file' }
        ];
        if (step === 2) return [
          { id: 'tipoCuenta', isType: 'input', el: el.tipoCuenta },
          { id: 'numeroCuenta', isType: 'input', el: el.numeroCuenta },
          { id: 'banco', isType: 'input', el: el.banco },
          { id: 'titularCuenta', isType: 'input', el: el.titularCuenta },
          { id: 'docTitular', isType: 'input', el: el.docTitular },
          { id: 'certBancario', isType: 'file' }
        ];
        return [];
      }

      function bindProgressValidators() {
        const inputs = document.querySelectorAll('.form-control, .input, .file-input, .servicio-checkbox');
        inputs.forEach(input => {
          input.addEventListener('input', () => { evaluateProgress(); guardarProgresoUsuario(); });
          input.addEventListener('change', () => { evaluateProgress(); guardarProgresoUsuario(); });
        });
      }

      // --------- Validación ----------

      function validateStepRaw(step) {
        switch (step) {
          case 0: {
            if (state.modoCorreccion) return true;
            const required = getRequiredForStep(0).map(f => f.el);
            for (const r of required) { if (!r.value?.trim()) return false; }
            if (!rx.num.test(el.numeroDocumento.value.trim())) return false;
            if (el.numeroDocumento.value.trim() !== el.confirmarDocumento.value.trim()) return false;
            if (!rx.email.test(el.email.value.trim())) return false;
            if (el.email.value.trim() !== el.confirmarEmail.value.trim()) return false;
            if (!rx.phone.test(el.celular.value.trim())) return false;
            if (el.celular.value.trim() !== el.confirmarCelular.value.trim()) return false;
            return true;
          }
          case 1: {
            if (state.modoCorreccion) return ['docFront', 'docBack', 'certTradicion', 'sarlaft'].filter(k => state.docsCorreccion.includes(k)).every(f => state.archivos[f]);
            return getRequiredForStep(1).every(f => state.archivos[f.id]);
          }
          case 2: {
            if (state.modoCorreccion) return !state.docsCorreccion.includes('certBancario') || !!state.archivos['certBancario'];
            return true;
          }
          case 3: {
            if (state.modoCorreccion) return ['facturaAgua', 'facturaLuz', 'facturaGas', 'facturaTelefono', 'facturaInternet'].filter(k => state.docsCorreccion.includes(k)).every(f => state.archivos[f]);
            // Requerir archivo si el servicio fue seleccionado
            const check = state.servicios.every(tipo => {
              const key = `factura${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
              return !!state.archivos[key];
            });
            return check;
          }
          default: return true;
        }
      }

      function validateStep(step) {
        hideInlineErrors();
        switch (step) {
          case 0: // Datos personales
            if (state.modoCorreccion) return true;
            const required = [
              el.tipoDocumento, el.numeroDocumento, el.confirmarDocumento,
              el.nombres, el.apellidos, el.email, el.confirmarEmail,
              el.celular, el.confirmarCelular
            ];
            for (const r of required) {
              if (!r.value?.trim()) {
                showAlert('warning', 'Completa todos los campos obligatorios.');
                r.focus(); return false;
              }
            }
            if (!rx.num.test(el.numeroDocumento.value.trim())) {
              showAlert('warning', 'Número de documento inválido.');
              el.numeroDocumento.focus(); return false;
            }
            if (el.numeroDocumento.value.trim() !== el.confirmarDocumento.value.trim()) {
              el.docError.classList.add('show');
              el.confirmarDocumento.classList.add('invalid');
              return false;
            }
            if (!rx.email.test(el.email.value.trim())) {
              showAlert('warning', 'Correo inválido.');
              el.email.focus(); return false;
            }
            if (el.email.value.trim() !== el.confirmarEmail.value.trim()) {
              el.emailError.classList.add('show');
              el.confirmarEmail.classList.add('invalid');
              return false;
            }
            if (!rx.phone.test(el.celular.value.trim())) {
              showAlert('warning', 'Celular inválido (10 dígitos).');
              el.celular.focus(); return false;
            }
            if (el.celular.value.trim() !== el.confirmarCelular.value.trim()) {
              el.celError.classList.add('show');
              el.confirmarCelular.classList.add('invalid');
              return false;
            }
            return true;

          case 1: // Documentos
            if (state.modoCorreccion) {
              const docsAcorregir = ['docFront', 'docBack', 'certTradicion', 'sarlaft'].filter(k => state.docsCorreccion.includes(k));
              for (const d of docsAcorregir) {
                if (!state.archivos[d]) {
                  showAlert('warning', 'Falta el documento requerido para la corrección.');
                  return false;
                }
              }
              return true;
            }

            const docs = ['docFront', 'docBack', 'certTradicion', 'sarlaft'];
            for (const d of docs) {
              if (!state.archivos[d]) {
                showAlert('warning', 'Faltan documentos obligatorios.');
                return false;
              }
            }
            return true;

          case 2: // Bancarios
            if (state.modoCorreccion) {
              if (state.docsCorreccion.includes('certBancario') && !state.archivos['certBancario']) {
                showAlert('warning', 'Falta adjuntar la certificación bancaria solicitada en la corrección.');
                return false;
              }
              return true;
            }

            const bancarios = [el.tipoCuenta, el.numeroCuenta, el.banco, el.titularCuenta, el.docTitular];
            for (const b of bancarios) {
              if (!b.value?.trim()) {
                showAlert('warning', 'Complete toda la información bancaria.');
                b.focus(); return false;
              }
            }
            if (!state.archivos.certBancario) {
              showAlert('warning', 'Falta la certificación bancaria.');
              return false;
            }
            return true;

          case 3: // Servicios - opcional
            if (state.modoCorreccion) {
              const srAcorregir = ['facturaAgua', 'facturaLuz', 'facturaGas', 'facturaTelefono', 'facturaInternet'].filter(k => state.docsCorreccion.includes(k));
              for (const d of srAcorregir) {
                if (!state.archivos[d]) {
                  showAlert('warning', 'Falta adjuntar factura de servicio público para corrección.');
                  return false;
                }
              }
              return true;
            }
            
            // Validar que se hayan adjuntado los archivos de los servicios marcados
            for (const tipo of state.servicios) {
              const key = `factura${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
              if (!state.archivos[key]) {
                showAlert('warning', `Marcaste el servicio de ${tipo}, por favor adjunta su factura.`);
                return false;
              }
            }
            return true;

          default:
            return true;
        }
      }

      function hideInlineErrors() {
        [el.docError, el.emailError, el.celError].forEach(n => n.classList.remove('show'));
        [el.confirmarDocumento, el.confirmarEmail, el.confirmarCelular].forEach(i => i.classList.remove('invalid'));
        el.alertBox.classList.add('hidden');
      }

      // --------- Resumen ----------
      function buildSummary() {
        const serviciosHtml = state.servicios.length > 0
          ? state.servicios.map(s => `<span class="summary-file"><i class="fas fa-bolt"></i> ${s}</span>`).join('')
          : '<span class="muted">Sin servicios seleccionados</span>';

        const archivosHtml = Object.entries(state.archivos).map(([k, v]) => {
          const nice = {
            docFront: 'Doc. Frontal',
            docBack: 'Doc. Reverso',
            certTradicion: 'Certificado T&L',
            sarlaft: 'SARLAFT',
            certBancario: 'Cert. Bancaria',
            facturaAgua: 'Factura Agua',
            facturaLuz: 'Factura Luz',
            facturaGas: 'Factura Gas',
            facturaTelefono: 'Factura Teléfono',
            facturaInternet: 'Factura Internet'
          }[k] || k;
          return `<div class="summary-file"><i class="fas fa-file-alt"></i> ${nice}: ${escapeHTML(v?.nombre || '—')}</div>`;
        }).join('');

        el.resumen.innerHTML = `
          <div class="summary-container">
            <div class="summary-title"><i class="fas fa-clipboard-check"></i> Verificación Final</div>
            
            <div class="summary-section">
              <h4>Datos del Propietario</h4>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Documento</span>
                  <span class="summary-value">${escapeHTML(el.tipoDocumento.value)} ${escapeHTML(el.numeroDocumento.value)}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Nombre Completo</span>
                  <span class="summary-value">${escapeHTML(el.nombres.value)} ${escapeHTML(el.apellidos.value)}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Correo Electrónico</span>
                  <span class="summary-value">${escapeHTML(el.email.value)}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Celular</span>
                  <span class="summary-value">${escapeHTML(el.celular.value)}</span>
                </div>
              </div>
            </div>
            
            <div class="summary-section">
              <h4>Información Bancaria</h4>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Banco</span>
                  <span class="summary-value">${escapeHTML(el.banco.value)}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Cuenta</span>
                  <span class="summary-value">${escapeHTML(el.tipoCuenta.value)} - ${escapeHTML(el.numeroCuenta.value)}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Titular</span>
                  <span class="summary-value">${escapeHTML(el.titularCuenta.value)}</span>
                </div>
              </div>
            </div>
            
            <div class="summary-section">
              <h4>Servicios Públicos a Cargo</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${serviciosHtml}
              </div>
            </div>
            
            <div class="summary-section">
              <h4>Archivos Adjuntos</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${archivosHtml || '<span class="muted">Sin archivos adjuntos</span>'}
              </div>
            </div>
          </div>
        `;
      }

      // --------- Submit CORREGIDO ----------
      async function onSubmit() {
        // Validación final
        for (let i = 0; i <= 4; i++) {
          if (!validateStep(i)) { gotoStep(i); return; }
        }

        toggleLoading(true);

        // Preparar servicios públicos con archivos
        const serviciosPublicos = state.servicios.map(tipo => {
          const facturaKey = `factura${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
          return {
            tipo: tipo,
            archivo: state.archivos[facturaKey] || null
          };
        });

        // ESTRUCTURA CORREGIDA para coincidir con el backend
        const payload = {
          accion: 'procesarFormularioPropietario',
          codigoRegistro: state.cdr,  // Cambio: cdr → codigoRegistro
          datosFormulario: {  // Cambio: agrupamos todo aquí
            propietario: {
              tipoDocumento: el.tipoDocumento.value.trim(),
              numeroDocumento: el.numeroDocumento.value.trim(),
              nombre: `${el.nombres.value.trim()} ${el.apellidos.value.trim()}`.toUpperCase(),
              email: el.email.value.trim(),
              celular: el.celular.value.trim()
            },
            bancarios: {
              tipoCuenta: el.tipoCuenta.value.trim(),
              numeroCuenta: el.numeroCuenta.value.trim(),
              banco: el.banco.value.trim(),
              titularCuenta: el.titularCuenta.value.trim(),
              documentoTitular: el.docTitular.value.trim()
            },
            serviciosPublicos: serviciosPublicos,
            modoCorreccion: state.modoCorreccion
          },
          archivosBase64: state.archivos
        };

        try {
          const url = new URL(CONFIG.API_URL);
          const res = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });

          const data = await res.json();

          // VALIDACIÓN CORREGIDA: success en lugar de ok
          if (!data || !data.success) {
            throw new Error(data?.message || 'No fue posible procesar la información.');
          }

          const msg = encodeURIComponent(data.message || 'Documentación enviada correctamente.');

          // Limpiar caché local al enviar exitosamente
          if (!state.modoCorreccion && state.cdr) {
            localStorage.removeItem(`efirma_prop_${state.cdr}`);
            limpiarDB();
          }

          const displayDir = document.getElementById('displayDir') ? document.getElementById('displayDir').textContent : '';
          location.href = `pagina-exito.html?status=success&msg=${msg}&cdr=${encodeURIComponent(state.cdr)}&dir=${encodeURIComponent(displayDir)}`;

        } catch (err) {
          console.error('[Propietario] Error:', err);
          showAlert('danger', err.message || 'Ocurrió un error inesperado.');
        } finally {
          toggleLoading(false);
        }
      }

      // --------- Utilidades ----------
      function showAlert(type, text) {
        const map = { success: 'alert-success', warning: 'alert-warning', danger: 'alert-danger', info: 'alert-info' };
        el.alertBox.className = `alert ${map[type] || 'alert-info'}`;
        el.alertBox.innerHTML = escapeHTML(text);
        el.alertBox.classList.remove('hidden');
        el.alertBox.focus?.();
      }

      function toggleLoading(show) {
        if (show) el.loader.classList.add('active');
        else el.loader.classList.remove('active');
        el.btnPrev.disabled = !!show;
        el.btnNext.disabled = !!show;
        el.btnEnviar.disabled = !!show;
      }

      function toast(text) {
        el.toast.textContent = text || 'Acción realizada.';
        el.toast.classList.add('show');
        setTimeout(() => el.toast.classList.remove('show'), 3000);
      }

      function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
      }

      // Funcionalidad Mixta API Bancos (Actualización Silenciosa con Caché del Backend)
      function actualizarBancosMixtoAPI() {
          // Consultamos a nuestro propio servidor (muy rápido, sin riesgo de CORS ni bloqueo de internet)
          google.script.run
            .withSuccessHandler(function(bancosApi) {
                if (bancosApi && bancosApi.length > 5) {
                    const selectBanco = document.getElementById('banco');
                    const valorSeleccionadoOGuardado = selectBanco.value;
                    let html = '<option value="">Seleccione un banco...</option>';
                    bancosApi.forEach(b => {
                        html += `<option value="${b.nombre}">${b.nombre}</option>`;
                    });
                    
                    selectBanco.innerHTML = html;
                    
                    if (valorSeleccionadoOGuardado) {
                        selectBanco.value = valorSeleccionadoOGuardado;
                    }
                    console.log('✅ Bancos actualizados desde la caché maestra del servidor.');
                }
            })
            .withFailureHandler(function(err) {
                console.log('🔄 Modo Mixto: Caché no disponible, usando lista estática local.');
            })
            .obtenerBancosDesdeCaché();
      }
      
      // Lanzamos la actualización silenciosa 1 segundo después de que todo el entorno haya cargado
      setTimeout(actualizarBancosMixtoAPI, 1000);

    })();

    // Global function for OCR modal close (needs to be outside IIFE for onclick)
    function cerrarModalOCR(allowContinue) {
      const modal = document.getElementById('modalOCRValidacion');
      modal.classList.add('closing');

      // If error state and user chose "continue anyway", save the pending file
      if (allowContinue && window._ocrPendingFile) {
        const pf = window._ocrPendingFile;
        // Access the IIFE state via a small workaround — dispatch a custom event
        document.dispatchEvent(new CustomEvent('ocrForceAccept', { detail: pf }));
        window._ocrPendingFile = null;
      }

      setTimeout(() => {
        modal.classList.remove('show', 'closing');
      }, 300);
    }
  
      
      const btnGoToPayment = document.getElementById('btnGoToPayment');
      if (btnGoToPayment) {
        btnGoToPayment.addEventListener('click', () => {
          document.getElementById('welcomeScreen').style.display = 'none';
          document.getElementById('mainWizard').style.display = 'block';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

