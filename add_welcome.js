const fs = require('fs');
const path = require('path');

function refactorFile(filePath, isProp) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add Welcome Screen and hide mainWizard
  if (!content.includes('id="welcomeScreen"')) {
    const propDocs = `<li>Documento de Identidad (Frontal y Reverso) en formato PDF o Imagen</li>
          <li>Certificado de Libertad y Tradición</li>
          <li>Facturas de Servicios Públicos</li>`;
    const inqDocs = `<li>Documento de Identidad (Frontal y Reverso) en formato PDF o Imagen</li>
          <li>Información y Documentos del Codeudor (Si aplica)</li>`;

    const welcomeHTML = `
      <!-- Welcome Screen (Ante-página) -->
      <div id="welcomeScreen" class="form-container">
        <h2 class="form-title">Bienvenido a Gold Life System</h2>
        <p class="form-subtitle">Para iniciar el proceso, por favor ten a mano los siguientes documentos:</p>
        <ul style="color: var(--text-muted); margin-bottom: 20px; line-height: 1.6; padding-left: 20px;">
          ${isProp ? propDocs : inqDocs}
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
    // Regex allows optional \r and any spacing
    content = content.replace(/<!-- Form Container -->\s*<div class="form-container">/, welcomeHTML);
  }

  // Add the JS logic for btnStartWizard
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
        if(originalHandleFile) originalHandleFile(file, key, nameEl);
        if (key === 'comprobantePago') {
          const btn = document.getElementById('btnStartWizard');
          if (btn) btn.disabled = !file;
        }
      };
`;
    content = content.replace('</script>\r\n</body>', startWizardLogic + '\n</script>\n</body>');
    content = content.replace('</script>\n</body>', startWizardLogic + '\n</script>\n</body>');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Refactored Welcome Screen', filePath);
}

refactorFile(path.join(__dirname, 'frontend', 'formulario-inquilino.html'), false);
refactorFile(path.join(__dirname, 'frontend', 'formulario-propietario.html'), true);
