const fs = require('fs');
const path = require('path');

function removePagoPane(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 2. Remove Pago Pane from wizard
  const pagoPaneRegex = /<!-- Step 5: Pago -->[\s\S]*?(?=<!-- Step 6: Resumen -->)/;
  content = content.replace(pagoPaneRegex, '');

  // 3. Update Resumen data-pane to 4 instead of 5
  content = content.replace(/<div class="step-pane" data-pane="5">\s*<h3>📄 Resumen de Información<\/h3>/, '<div class="step-pane" data-pane="4">\n          <h3>📄 Resumen de Información</h3>');

  // 4. Update state.max from 5 to 4
  content = content.replace(/max:\s*5,/, 'max: 4,');

  // 5. Fix ValidateStep case 4 and 5
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
  console.log('Removed Pago Pane', filePath);
}

removePagoPane(path.join(__dirname, 'frontend', 'formulario-inquilino.html'));
removePagoPane(path.join(__dirname, 'frontend', 'formulario-propietario.html'));
