const fs = require('fs');
const path = require('path');

function updateUX(filePath, isProp) {
  let content = fs.readFileSync(filePath, 'utf8');

  const inqDocs = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 24px;">🪪</span>
              <div>
                <strong style="color: var(--primary);">Documento de Identidad</strong>
                <p style="margin: 5px 0 0; font-size: 0.9rem; color: #a1a1aa;">A la mano para tomarle fotografía, o en archivo digital (PDF, JPG, PNG).</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 24px;">🤝</span>
              <div>
                <strong style="color: var(--primary);">Documento del Codeudor</strong>
                <p style="margin: 5px 0 0; font-size: 0.9rem; color: #a1a1aa;">(Si aplica) A la mano para fotografía o en archivos digitales.</p>
              </div>
            </div>`;
            
  const propDocs = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 24px;">🪪</span>
              <div>
                <strong style="color: var(--primary);">Documento de Identidad</strong>
                <p style="margin: 5px 0 0; font-size: 0.9rem; color: #a1a1aa;">A la mano para tomarle fotografía, o en archivo digital (PDF, JPG, PNG).</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 24px;">📜</span>
              <div>
                <strong style="color: var(--primary);">Certificado de Libertad y Tradición</strong>
                <p style="margin: 5px 0 0; font-size: 0.9rem; color: #a1a1aa;">Documento actualizado del inmueble.</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 24px;">⚡</span>
              <div>
                <strong style="color: var(--primary);">Facturas de Servicios Públicos</strong>
                <p style="margin: 5px 0 0; font-size: 0.9rem; color: #a1a1aa;">Recibos recientes para verificación.</p>
              </div>
            </div>`;

  const newHTML = `<!-- Welcome Screen (Ante-página) -->
      <div id="welcomeScreen" class="form-container" style="text-align: center; max-width: 650px; padding: 3rem 2rem;">
        <div style="margin-bottom: 30px;">
          <h2 class="form-title" style="font-size: 2.2rem; margin-bottom: 10px;">¡Hola! Bienvenido</h2>
          <p class="form-subtitle" style="font-size: 1.1rem; color: #d4d4d8;">Sistema de Gestión Inmobiliaria Premium</p>
        </div>

        <p style="font-size: 1rem; line-height: 1.7; color: #a1a1aa; margin-bottom: 30px;">
          Este sistema automatizado le guiará paso a paso en la elaboración de la solicitud de contrato de arrendamiento para el inmueble de su interés ubicado en la dirección asignada al <strong style="color: var(--primary);">CDR <span id="displayCdr" class="chip">Cargando...</span></strong>.
        </p>

        <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; border: 1px solid rgba(212,175,55,0.1); margin-bottom: 30px;">
          <h4 style="color: #fff; margin-bottom: 20px; font-weight: 500;">Para una experiencia fluida, por favor tenga a la mano:</h4>
          <div style="display: flex; flex-direction: column;">
            ${isProp ? propDocs : inqDocs}
          </div>
        </div>

        <div class="alert alert-success" style="margin-bottom: 30px; text-align: left; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); color: #a1a1aa;">
          <div style="display: flex; gap: 15px; align-items: flex-start;">
            <span style="font-size: 24px;">🛡️</span>
            <div>
              <strong style="color: #10b981; display: block; margin-bottom: 5px; font-size: 1.05rem;">Garantía de Satisfacción 100%</strong>
              <p style="margin: 0; font-size: 0.9rem; line-height: 1.5;">De no formalizar el proceso con el propietario, se realizará un reembolso del <strong>100% del dinero</strong> a su cuenta de Mercado Pago de forma automática, sin ningún costo adicional ni letras pequeñas.</p>
            </div>
          </div>
        </div>

        <button id="btnGoToPayment" class="btn btn-primary btn-lg" style="width: 100%; max-width: 300px; padding: 15px; font-size: 1.1rem; border-radius: 30px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; box-shadow: 0 10px 25px rgba(212,175,55,0.3);">Comenzar Ahora →</button>
      </div>

      <!-- Payment Screen (Ante-página 2) -->
      <div id="paymentScreen" class="form-container" style="display: none; max-width: 550px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 class="form-title" style="font-size: 1.8rem; margin-bottom: 10px;">💳 Derechos de Estudio</h2>
          <p class="form-subtitle" style="font-size: 1.05rem; line-height: 1.6; color: #a1a1aa;">
            Antes de iniciar con el formulario, es necesario procesar el pago del estudio de perfil. Una vez verificado, el formulario se desbloqueará instantáneamente.
          </p>
        </div>
        
        <div class="card" style="border: 1px solid rgba(212,175,55,0.2); background: rgba(0,0,0,0.2);">
            <div class="card-body" style="padding: 2rem;">
              <div style="text-align: center; margin-bottom: 25px;">
                <span style="font-size: 0.9rem; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px;">Valor a pagar</span>
                <h3 style="font-size: 2.5rem; color: var(--primary); margin: 5px 0 0;">$60.000 <span style="font-size: 1rem; color: #6b7280;">COP</span></h3>
              </div>

              <!-- Mercado Pago Widget Container -->
              <div id="wallet_container" style="margin-bottom: 20px;"></div>

              <div class="payment-options">
                <button id="btnPayBreb" class="btn btn-secondary btn-lg btn-block" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; display: flex; align-items: center; justify-content: center; gap: 10px;">
                  <span>📱</span> Pagar con Nequi/Daviplata
                </button>
              </div>

              <div class="hr" style="margin: 25px 0;"></div>
              
              <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.1);">
                <h4 style="font-size: 1rem; margin-bottom: 5px;">Soporte de Transferencia</h4>
                <p class="muted" style="margin-bottom:15px; font-size: 0.85rem;">Si realizó transferencia manual, adjunte su comprobante aquí.</p>
                <div class="file-upload">
                  <input type="file" id="comprobantePago" class="file-input" accept=".pdf,.jpg,.jpeg,.png">
                  <label for="comprobantePago" class="file-label" style="justify-content: center; background: rgba(0,0,0,0.3);">
                    <span>📄 Adjuntar Comprobante</span>
                    <span id="comprobantePagoName" class="file-name"></span>
                  </label>
                </div>
              </div>
            </div>
        </div>

        <button id="btnStartWizard" class="btn btn-success btn-lg btn-block" style="margin-top: 25px; padding: 15px; font-size: 1.1rem; border-radius: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.3s ease;" disabled>
          Iniciar Formulario Oficial <span>→</span>
        </button>
      </div>`;

  const regex = /<!-- Welcome Screen \(Ante-página\) -->[\s\S]*?<!-- Payment Screen \(Ante-página 2\) -->[\s\S]*?<\/button>\s*<\/div>/;
  content = content.replace(regex, newHTML);

  // Add the script logic to inject CDR into the display
  if (!content.includes("document.getElementById('displayCdr')")) {
    const initRegex = /state\.cdr = params\.get\('cdr'\) \|\| '';/;
    const injection = `state.cdr = params.get('cdr') || '';\n        if(document.getElementById('displayCdr')) document.getElementById('displayCdr').textContent = state.cdr || 'Desconocido';`;
    content = content.replace(initRegex, injection);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated UX', filePath);
}

updateUX(path.join(__dirname, 'frontend', 'formulario-inquilino.html'), false);
updateUX(path.join(__dirname, 'frontend', 'formulario-propietario.html'), true);
