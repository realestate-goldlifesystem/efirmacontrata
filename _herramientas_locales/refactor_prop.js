const fs = require('fs');
const path = require('path');

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add Welcome Screen and hide mainWizard
  if (!content.includes('id="welcomeScreen"')) {
    const welcomeHTML = `
      <!-- Welcome Screen (Ante-página) -->
      <div id="welcomeScreen" class="form-container">
        <h2 class="form-title">Bienvenido a Gold Life System</h2>
        <p class="form-subtitle">Para iniciar el proceso, por favor ten a mano los siguientes documentos:</p>
        <ul style="color: var(--text-muted); margin-bottom: 20px; line-height: 1.6; padding-left: 20px;">
          <li>Documento de Identidad (Frontal y Reverso) en formato PDF o Imagen</li>
          <li>Certificado de Libertad y Tradición</li>
          <li>Facturas de Servicios Públicos</li>
        </ul>
        <div class="card">
            <div class="card-body">
              <h4>Valor del Estudio: $60.000 COP</h4>
              <p>Seleccione su método de pago preferido para iniciar:</p>

              <div class="payment-options">
                <button id="btnPayBreb" class="btn btn-secondary btn-lg btn-block">
                  📱 Pagar con Nequi/Daviplata
                </button>
                <button id="btnPayWompi" class="btn btn-primary btn-lg btn-block">
                  💳 Pagar con Tarjeta
                </button>
              </div>

              <div class="alert alert-info" style="margin-top:1rem">
                <small>Una vez adjuntado el comprobante de pago, el formulario se desbloqueará.</small>
              </div>

              <div class="hr"></div>
              <h4>Soporte de Pago</h4>
              <p class="muted" style="margin-bottom:1rem">Por favor, adjunte el comprobante de pago realizado.</p>
              <div class="file-upload">
                <input type="file" id="comprobantePago" class="file-input" accept=".pdf,.jpg,.jpeg,.png" required>
                <label for="comprobantePago" class="file-label">
                  <span>📄 Comprobante de Pago *</span>
                  <span id="comprobantePagoName" class="file-name"></span>
                </label>
              </div>
            </div>
        </div>
        <button id="btnStartWizard" class="btn btn-primary btn-lg btn-block" style="margin-top: 20px;" disabled>Comenzar Formulario →</button>
      </div>

      <!-- Form Container -->
      <div id="mainWizard" class="form-container" style="display: none;">
`;
    content = content.replace('<!-- Form Container -->\n      <div class="form-container">', welcomeHTML);
  }

  // 2. Remove Pago Pane from wizard
  const pagoPaneRegex = /<!-- Step 5: Pago -->[\s\S]*?(?=<!-- Step 6: Resumen -->)/;
  content = content.replace(pagoPaneRegex, '');

  // 3. Update Resumen data-pane to 4 instead of 5
  content = content.replace(/<div class="step-pane" data-pane="5">\s*<h3>📄 Resumen de Información<\/h3>/, '<div class="step-pane" data-pane="4">\n          <h3>📄 Resumen de Información</h3>');

  // 4. Update Progress bar HTML
  const progressRegex = /<div class="progress">[\s\S]*?<div class="step" data-step="5">✓<\/div>\s*<\/div>/;
  const newProgress = `<div class="progress">
          <div class="progress-line" id="progressLine" style="width: 0%;"></div>
          <div class="step active" data-step="0">1</div>
          <div class="step" data-step="1">2</div>
          <div class="step" data-step="2">3</div>
          <div class="step" data-step="3">4</div>
          <div class="step" data-step="4">✓</div>
        </div>`;
  content = content.replace(progressRegex, newProgress);

  // 5. Update state.max from 5 to 4
  content = content.replace(/max:\s*5,/, 'max: 4,');

  // 6. Update JS logic to handle welcome screen
  if (!content.includes('btnStartWizard.addEventListener')) {
    const startWizardLogic = `
      const btnStartWizard = document.getElementById('btnStartWizard');
      if (btnStartWizard) {
        btnStartWizard.addEventListener('click', () => {
          document.getElementById('welcomeScreen').style.display = 'none';
          document.getElementById('mainWizard').style.display = 'block';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
      
      // Update btnStartWizard state when file is uploaded
      const originalHandleFile = handleFile;
      handleFile = function(file, key, nameEl) {
        originalHandleFile(file, key, nameEl);
        if (key === 'comprobantePago') {
          const btn = document.getElementById('btnStartWizard');
          if (btn) btn.disabled = !file;
        }
      };
`;
    content = content.replace('</script>\n</body>', startWizardLogic + '\n</script>\n</body>');
  }
  
  // 7. Fix ValidateStep case 4 and 5
  content = content.replace(/case 4: \{[\s\S]*?(?:return true;|return !!state\.archivos\['comprobantePago'\];)\n\s*\}/, '');

  // Add bypass in init()
  if (!content.includes('welcomeScreen.style.display')) {
    const initRegex = /if \(state\.modoCorreccion\) \{([\s\S]*?)renderCorreccionBanner\(\);\s*\}/;
    const replacement = `if (state.modoCorreccion) {
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
        }`;
    content = content.replace(initRegex, replacement);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Refactored', filePath);
}

refactorFile(path.join(__dirname, 'frontend', 'formulario-propietario.html'));
