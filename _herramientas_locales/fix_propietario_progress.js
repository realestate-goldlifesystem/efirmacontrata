const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'formulario-propietario.html');
let content = fs.readFileSync(filePath, 'utf8');

// El bloque duplicado que queremos eliminar (líneas 527-532 del original)
// Después del cierre del div.progress correcto (526), hay 5 steps flotantes + otro </div>
const duplicateBlock = `\r\n          <div class="step active" data-step="0">1</div>\r\n          <div class="step" data-step="1">2</div>\r\n          <div class="step" data-step="2">3</div>\r\n          <div class="step" data-step="3">4</div>\r\n          <div class="step" data-step="4">\u2713</div>\r\n        </div>`;

const countBefore = (content.match(/data-step/g) || []).length;
content = content.replace(duplicateBlock, '');
const countAfter = (content.match(/data-step/g) || []).length;

fs.writeFileSync(filePath, content, 'utf8');
console.log(`data-step occurrences: ${countBefore} -> ${countAfter}`);
console.log('Done. Removed duplicate progress block.');
