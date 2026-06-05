const fs = require('fs');
const path = require('path');

function refineWelcome(filePath, isProp) {
  let content = fs.readFileSync(filePath, 'utf8');

  const inqDocs = `
            <div style="display: flex; align-items: center; gap: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 20px;">🪪</span>
              <div>
                <strong style="color: var(--primary); font-size: 0.95rem;">Documento de Identidad</strong>
                <p style="margin: 2px 0 0; font-size: 0.8rem; color: #a1a1aa;">Físico o PDF/JPG/PNG.</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 20px;">🤝</span>
              <div>
                <strong style="color: var(--primary); font-size: 0.95rem;">Doc. del Codeudor</strong>
                <p style="margin: 2px 0 0; font-size: 0.8rem; color: #a1a1aa;">(Si aplica) Físico o digital.</p>
              </div>
            </div>`;
            
  const propDocs = `
            <div style="display: flex; align-items: center; gap: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 20px;">🪪</span>
              <div>
                <strong style="color: var(--primary); font-size: 0.95rem;">Documento Identidad</strong>
                <p style="margin: 2px 0 0; font-size: 0.8rem; color: #a1a1aa;">Físico o PDF/JPG/PNG.</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 20px;">📜</span>
              <div>
                <strong style="color: var(--primary); font-size: 0.95rem;">Cert. de Tradición</strong>
                <p style="margin: 2px 0 0; font-size: 0.8rem; color: #a1a1aa;">Actualizado.</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; text-align: left; background: rgba(255,255,255,0.02); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 20px;">⚡</span>
              <div>
                <strong style="color: var(--primary); font-size: 0.95rem;">Recibos Servicios</strong>
                <p style="margin: 2px 0 0; font-size: 0.8rem; color: #a1a1aa;">Recientes.</p>
              </div>
            </div>`;

  const newWelcome = `<!-- Welcome Screen (Ante-página) -->
      <div id="welcomeScreen" class="form-container" style="text-align: center; max-width: 850px; padding: 2rem;">
        <div style="margin-bottom: 20px;">
          <h2 class="form-title" style="font-size: 2rem; margin-bottom: 5px;">¡Hola! Bienvenido a E-FirmaContrata</h2>
          <p class="form-subtitle" style="font-size: 1rem; color: #d4d4d8;">Sistema de Gestión Inmobiliaria Premium</p>
        </div>

        <p style="font-size: 0.95rem; line-height: 1.5; color: #a1a1aa; margin-bottom: 20px;">
          Este sistema automatizado le guiará paso a paso en la elaboración de la solicitud de contrato de arrendamiento para el inmueble de su interés ubicado en: <br>
          <strong style="color: var(--primary); font-size: 1.1rem; letter-spacing: 0.5px; display: inline-block; margin-top: 5px;" id="displayDir">Cargando dirección...</strong>
        </p>

        <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; border: 1px solid rgba(212,175,55,0.1); margin-bottom: 20px;">
          <h4 style="color: #fff; margin-bottom: 15px; font-weight: 500; font-size: 0.95rem;">Para una experiencia fluida, por favor tenga a la mano:</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            ${isProp ? propDocs : inqDocs}
          </div>
        </div>

        <div class="alert alert-success" style="margin-bottom: 20px; text-align: left; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); color: #a1a1aa; padding: 10px 15px;">
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="font-size: 20px;">🛡️</span>
            <div>
              <strong style="color: #10b981; display: block; margin-bottom: 2px; font-size: 0.95rem;">Garantía de Satisfacción 100%</strong>
              <p style="margin: 0; font-size: 0.85rem; line-height: 1.4;">De no formalizar el proceso, reembolso automático a Mercado Pago sin costo adicional.</p>
            </div>
          </div>
        </div>

        <button id="btnGoToPayment" class="btn btn-primary btn-lg" style="width: 100%; max-width: 280px; padding: 12px; font-size: 1rem; border-radius: 30px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; box-shadow: 0 10px 25px rgba(212,175,55,0.3);">Comenzar Ahora →</button>
      </div>

      <!-- Payment Screen (Ante-página 2) -->`;

  const regex = /<!-- Welcome Screen \(Ante-página\) -->[\s\S]*?<!-- Payment Screen \(Ante-página 2\) -->/;
  content = content.replace(regex, newWelcome);

  // Update JS to read ?dir= from URL
  const scriptRegex = /state\.cdr = params\.get\('cdr'\) \|\| '';[\s\S]*?(?=\n\s*if \(state\.modoCorreccion\))/;
  const newScript = `state.cdr = params.get('cdr') || '';
        const dir = params.get('dir') || ('el CDR ' + state.cdr);
        if(document.getElementById('displayDir')) {
          document.getElementById('displayDir').textContent = dir;
        }

        if (!state.cdr) {
          showAlert('warning', 'CDR no presente.');
          return;
        }`;
  
  if (content.match(scriptRegex)) {
    content = content.replace(scriptRegex, newScript);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Refined Welcome', filePath);
}

refineWelcome(path.join(__dirname, 'frontend', 'formulario-inquilino.html'), false);
refineWelcome(path.join(__dirname, 'frontend', 'formulario-propietario.html'), true);
