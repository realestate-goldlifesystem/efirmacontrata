const fs = require('fs');
const path = require('path');

function addAddressFetch() {
  // Update Backend
  const backendFile = path.join(__dirname, 'backend', 'GESTOR DE DOCUMENTOS.js');
  let backendContent = fs.readFileSync(backendFile, 'utf8');

  if (!backendContent.includes('handleObtenerDireccionInmueble')) {
    const newBackendFunc = `
function handleObtenerDireccionInmueble(cdr) {
  try {
    const fila = buscarFilaPorCDR(cdr);
    if (!fila) return '';
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCS_CONFIG.HOJA_PRINCIPAL);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = sheet.getRange(fila, 1, 1, sheet.getLastColumn()).getValues()[0];
    const direccion = obtenerValorPorHeader(headers, row, 'Ingrese la Dirección del inmueble');
    return direccion || '';
  } catch (e) {
    return '';
  }
}
`;
    // Insert before "function handleVerificarLink(e) {"
    backendContent = backendContent.replace('function handleVerificarLink(e) {', newBackendFunc + '\nfunction handleVerificarLink(e) {');
    fs.writeFileSync(backendFile, backendContent, 'utf8');
    console.log('Backend updated');
  }

  // Update Frontend
  const files = ['formulario-inquilino.html', 'formulario-propietario.html'];
  files.forEach(f => {
    const fp = path.join(__dirname, 'frontend', f);
    let htmlContent = fs.readFileSync(fp, 'utf8');

    const oldJs = `const dir = params.get('dir') || '';
        if(document.getElementById('displayDir') && dir) {
          document.getElementById('displayDir').textContent = 'Ubicado en: ' + dir;
        }`;

    const newJs = `const dir = params.get('dir') || '';
        if(document.getElementById('displayDir')) {
          if (dir) {
            document.getElementById('displayDir').textContent = 'Ubicado en: ' + dir;
          } else if (state.cdr && typeof google !== 'undefined' && google.script) {
            google.script.run
              .withSuccessHandler(function(fetchedDir) {
                if (fetchedDir) {
                  document.getElementById('displayDir').textContent = 'Ubicado en: ' + fetchedDir;
                }
              })
              .handleObtenerDireccionInmueble(state.cdr);
          }
        }`;

    if (htmlContent.includes(oldJs)) {
      htmlContent = htmlContent.replace(oldJs, newJs);
      fs.writeFileSync(fp, htmlContent, 'utf8');
      console.log('Frontend updated:', f);
    }
  });
}

addAddressFetch();
