const fs = require('fs');
const path = require('path');

function removeDuplicateUbicado(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We change 'Ubicado en: ' + dir to just dir
  content = content.replace(/'Ubicado en: ' \+ dir/g, 'dir');
  content = content.replace(/'Ubicado en: ' \+ fetchedDir/g, 'fetchedDir');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed js in', filePath);
}

removeDuplicateUbicado(path.join(__dirname, 'frontend', 'formulario-inquilino.html'));
removeDuplicateUbicado(path.join(__dirname, 'frontend', 'formulario-propietario.html'));
