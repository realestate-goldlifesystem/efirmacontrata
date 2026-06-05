const fs = require('fs');
const path = require('path');

function fixProgress(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const progressRegex = /<div class="progress">\s*<div class="progress-line" id="progressLine" style="width: 0%;"><\/div>\s*<div class="step active" data-step="0">1<\/div>[\s\S]*?<div class="step" data-step="5">✓<\/div>\s*<\/div>/;
  const newProgress = `<div class="progress">
          <div class="progress-line" id="progressLine" style="width: 0%;"></div>
          <div class="step active" data-step="0">1</div>
          <div class="step" data-step="1">2</div>
          <div class="step" data-step="2">3</div>
          <div class="step" data-step="3">4</div>
          <div class="step" data-step="4">✓</div>
        </div>`;
  
  if(progressRegex.test(content)) {
      content = content.replace(progressRegex, newProgress);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed', filePath);
  } else {
      console.log('Regex did not match in', filePath);
  }
}

fixProgress(path.join(__dirname, 'frontend', 'formulario-inquilino.html'));
fixProgress(path.join(__dirname, 'frontend', 'formulario-propietario.html'));
