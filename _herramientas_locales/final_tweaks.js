const fs = require('fs');
const path = require('path');

function finalTweaks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Change the subtitle
  content = content.replace(
    '<p class="form-subtitle" style="font-size: 1rem; color: #d4d4d8;">Sistema de Gestión Inmobiliaria Premium</p>',
    '<p class="form-subtitle" style="font-size: 1rem; color: #d4d4d8;">Sistema de Elaboración de Contratos</p>'
  );

  // 2. Change the JS fallback logic
  // The current JS: const dir = params.get('dir') || ('el CDR ' + state.cdr);
  const oldJs = "const dir = params.get('dir') || ('el CDR ' + state.cdr);";
  const newJs = "const dir = params.get('dir') || '';";
  content = content.replace(oldJs, newJs);

  // 3. Update the HTML text so "ubicado en:" only shows if dir exists
  const oldHtmlText = `Este sistema automatizado le guiará paso a paso en la elaboración de la solicitud de contrato de arrendamiento para el inmueble de su interés ubicado en: <br>
          <strong style="color: var(--primary); font-size: 1.1rem; letter-spacing: 0.5px; display: inline-block; margin-top: 5px;" id="displayDir">Cargando dirección...</strong>`;
  
  const newHtmlText = `Este sistema automatizado le guiará paso a paso en la elaboración de la solicitud de contrato de arrendamiento para el inmueble de su interés. <br>
          <strong style="color: var(--primary); font-size: 1.1rem; letter-spacing: 0.5px; display: inline-block; margin-top: 5px;" id="displayDir"></strong>`;
  
  content = content.replace(oldHtmlText, newHtmlText);

  // Add logic to prepend "Ubicado en: " if dir exists
  const oldJsIf = "if(document.getElementById('displayDir')) {\n          document.getElementById('displayDir').textContent = dir;\n        }";
  const newJsIf = `if(document.getElementById('displayDir') && dir) {
          document.getElementById('displayDir').textContent = 'Ubicado en: ' + dir;
        }`;
  
  content = content.replace(oldJsIf, newJsIf);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Tweaked', filePath);
}

finalTweaks(path.join(__dirname, 'frontend', 'formulario-inquilino.html'));
finalTweaks(path.join(__dirname, 'frontend', 'formulario-propietario.html'));
