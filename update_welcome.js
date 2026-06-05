const fs = require('fs');
const path = require('path');

function updateWelcomeScreens(filePath, isProp) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace the existing welcomeScreen completely
  const welcomeRegex = /<!-- Welcome Screen \(Ante-página\) -->[\s\S]*?(?=<!-- Form Container -->)/;
  
  const inqDocs = `<li><strong>Documento de Identidad:</strong> A la mano para fotografía o en archivo PDF, JPG, PNG.</li>
          <li><strong>Documento del Codeudor (Si aplica):</strong> A la mano para fotografía o en archivos digitales.</li>`;
  
  const propDocs = `<li><strong>Documento de Identidad:</strong> A la mano para fotografía o en archivo PDF, JPG, PNG.</li>
          <li><strong>Certificado de Libertad y Tradición.</strong></li>
          <li><strong>Facturas de Servicios Públicos.</strong></li>`;

  const newWelcome = `<!-- Welcome Screen (Ante-página) -->
      <div id="welcomeScreen" class="form-container">
        <h2 class="form-title">Bienvenido a Gold Life System</h2>
        <p class="form-subtitle">Para iniciar el proceso, por favor ten a mano lo siguiente:</p>
        <ul style="color: var(--text-muted); margin-bottom: 20px; line-height: 1.6; padding-left: 20px;">
          ${isProp ? propDocs : inqDocs}
        </ul>
        <div class="alert alert-success" style="margin-bottom: 20px;">
          <small>🛡️ <strong>Garantía de Reembolso:</strong> De no formalizar el proceso con el propietario, se realizará un reembolso del 100% del dinero a su cuenta de Mercado Pago sin ningún costo adicional.</small>
        </div>
        <button id="btnGoToPayment" class="btn btn-primary btn-lg btn-block">Continuar al Pago →</button>
      </div>

      <!-- Payment Screen (Ante-página 2) -->
      <div id="paymentScreen" class="form-container" style="display: none;">
        <h2 class="form-title">💳 Derechos de Estudio</h2>
        <p class="form-subtitle">El estudio del perfil tiene un costo de <strong>$60.000 COP</strong>.</p>
        
        <div class="card">
            <div class="card-body">
              <p>Seleccione su método de pago preferido para iniciar:</p>

              <!-- Mercado Pago Widget Container -->
              <div id="wallet_container" style="margin-bottom: 20px;"></div>

              <div class="payment-options">
                <button id="btnPayBreb" class="btn btn-secondary btn-lg btn-block">
                  📱 Pagar con Nequi/Daviplata
                </button>
                <!-- Wompi button replaced by MP later or kept as backup -->
              </div>

              <div class="hr"></div>
              <h4>Soporte de Pago (Opcional si usó Nequi)</h4>
              <p class="muted" style="margin-bottom:1rem">Si hizo transferencia manual, adjunte el comprobante.</p>
              <div class="file-upload">
                <input type="file" id="comprobantePago" class="file-input" accept=".pdf,.jpg,.jpeg,.png">
                <label for="comprobantePago" class="file-label">
                  <span>📄 Comprobante de Pago</span>
                  <span id="comprobantePagoName" class="file-name"></span>
                </label>
              </div>
            </div>
        </div>
        <button id="btnStartWizard" class="btn btn-success btn-lg btn-block" style="margin-top: 20px;" disabled>Iniciar Formulario Oficial →</button>
      </div>

      `;

  content = content.replace(welcomeRegex, newWelcome);

  // Update logic to handle btnGoToPayment
  if (!content.includes('btnGoToPayment.addEventListener')) {
    const scriptRegex = /const btnStartWizard = document\.getElementById\('btnStartWizard'\);/;
    const newLogic = `const btnGoToPayment = document.getElementById('btnGoToPayment');
      if (btnGoToPayment) {
        btnGoToPayment.addEventListener('click', () => {
          document.getElementById('welcomeScreen').style.display = 'none';
          document.getElementById('paymentScreen').style.display = 'block';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
      
      const btnStartWizard = document.getElementById('btnStartWizard');`;
    content = content.replace(scriptRegex, newLogic);
  }

  // Also replace where btnStartWizard hides welcomeScreen, now it must hide paymentScreen
  content = content.replace("document.getElementById('welcomeScreen').style.display = 'none';", "document.getElementById('paymentScreen').style.display = 'none';");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated', filePath);
}

updateWelcomeScreens(path.join(__dirname, 'frontend', 'formulario-inquilino.html'), false);
updateWelcomeScreens(path.join(__dirname, 'frontend', 'formulario-propietario.html'), true);
