const fs = require('fs');
const path = require('path');

function addApiAddress() {
  // Update Backend
  const backendFile = path.join(__dirname, 'backend', 'GESTOR DE DOCUMENTOS.js');
  let backendContent = fs.readFileSync(backendFile, 'utf8');

  if (!backendContent.includes("case 'obtenerDireccion':")) {
    const newCase = `
      case 'obtenerDireccion':
        result = { success: true, direccion: handleObtenerDireccionInmueble(e.parameter.cdr) };
        break;
`;
    backendContent = backendContent.replace("case 'base':", newCase + "\n      case 'base':");
    fs.writeFileSync(backendFile, backendContent, 'utf8');
    console.log('Backend updated');
  }

  // Update Frontend
  const files = ['formulario-inquilino.html', 'formulario-propietario.html'];
  files.forEach(f => {
    const fp = path.join(__dirname, 'frontend', f);
    let htmlContent = fs.readFileSync(fp, 'utf8');

    const oldFetch = `google.script.run
              .withSuccessHandler(function(fetchedDir) {
                if (fetchedDir) {
                  document.getElementById('displayDir').textContent = fetchedDir;
                }
              })
              .handleObtenerDireccionInmueble(state.cdr);`;
              
    const newFetch = `fetch(CONFIG.API_URL + "?accion=obtenerDireccion&cdr=" + encodeURIComponent(state.cdr))
              .then(res => res.json())
              .then(data => {
                if(data && data.direccion) {
                  document.getElementById('displayDir').textContent = data.direccion;
                }
              })
              .catch(err => console.error("Error fetching address:", err));`;

    if (htmlContent.includes(oldFetch)) {
      htmlContent = htmlContent.replace(oldFetch, newFetch);
    } else {
        // Because fix_ubicado removed "Ubicado en:", let's just make sure we replace the whole block
        const blockRegex = /google\.script\.run[\s\S]*?\.handleObtenerDireccionInmueble\(state\.cdr\);/;
        if(blockRegex.test(htmlContent)){
            htmlContent = htmlContent.replace(blockRegex, newFetch);
        }
    }
    
    // Also remove "typeof google !== 'undefined' && google.script" check since we use fetch now
    htmlContent = htmlContent.replace(/else if \(state\.cdr && typeof google !== 'undefined' && google\.script\) \{/, 'else if (state.cdr && typeof CONFIG !== "undefined" && CONFIG.API_URL) {');

    fs.writeFileSync(fp, htmlContent, 'utf8');
    console.log('Frontend updated:', f);
  });
}

addApiAddress();
