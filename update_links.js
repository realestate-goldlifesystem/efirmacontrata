const fs = require('fs');
const path = require('path');

function updateLinks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We want to add &dir=... to the URLs generated in verificarEstadoLink
  // The row has the property: direccionInm = obtenerValorPorHeader(headers, row, 'Ingrese la Dirección del inmueble')
  // We need to fetch the direction.

  // Let's modify the file with string replacement.
  const oldUrlInq = "redirectUrl = `${baseUrl}/formulario-inquilino.html?cdr=${encodeURIComponent(cdr).replace(/\\(/g, '%28').replace(/\\)/g, '%29')}`;";
  const newUrlInq = `const dirInq = sheet.getRange(fila, headers.indexOf('Ingrese la Dirección del inmueble') + 1).getValue().toString();
      redirectUrl = \`\${baseUrl}/formulario-inquilino.html?cdr=\${encodeURIComponent(cdr).replace(/\\(/g, '%28').replace(/\\)/g, '%29')}&dir=\${encodeURIComponent(dirInq)}\`;`;

  const oldUrlProp = "redirectUrl = `${baseUrl}/formulario-propietario.html?cdr=${encodeURIComponent(cdr).replace(/\\(/g, '%28').replace(/\\)/g, '%29')}`;";
  const newUrlProp = `const dirProp = sheet.getRange(fila, headers.indexOf('Ingrese la Dirección del inmueble') + 1).getValue().toString();
      redirectUrl = \`\${baseUrl}/formulario-propietario.html?cdr=\${encodeURIComponent(cdr).replace(/\\(/g, '%28').replace(/\\)/g, '%29')}&dir=\${encodeURIComponent(dirProp)}\`;`;

  if (content.includes(oldUrlInq)) {
      content = content.replace(oldUrlInq, newUrlInq);
  }
  if (content.includes(oldUrlProp)) {
      content = content.replace(oldUrlProp, newUrlProp);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated links in', filePath);
}

updateLinks(path.join(__dirname, 'backend', 'GESTOR DE DOCUMENTOS.js'));
