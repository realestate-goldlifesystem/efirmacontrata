const fs = require('fs');
const path = require('path');

function fixVerificarLink() {
  const backendFile = path.join(__dirname, 'backend', 'GESTOR DE DOCUMENTOS.js');
  let backendContent = fs.readFileSync(backendFile, 'utf8');

  // Fix Inquilino
  const oldInq = "const dirInq = sheet.getRange(fila, headers.indexOf('Ingrese la Dirección del inmueble') + 1).getValue().toString();";
  const newInq = "const idxInq = headers.indexOf('Ingrese la Dirección del inmueble'); const dirInq = idxInq >= 0 ? sheet.getRange(fila, idxInq + 1).getValue().toString() : '';";
  
  if (backendContent.includes(oldInq)) {
      backendContent = backendContent.replace(oldInq, newInq);
  }

  // Fix Propietario
  const oldProp = "const dirProp = sheet.getRange(fila, headers.indexOf('Ingrese la Dirección del inmueble') + 1).getValue().toString();";
  const newProp = "const idxProp = headers.indexOf('Ingrese la Dirección del inmueble'); const dirProp = idxProp >= 0 ? sheet.getRange(fila, idxProp + 1).getValue().toString() : '';";

  if (backendContent.includes(oldProp)) {
      backendContent = backendContent.replace(oldProp, newProp);
  }

  fs.writeFileSync(backendFile, backendContent, 'utf8');
  console.log('Backend fixed');
}

fixVerificarLink();
