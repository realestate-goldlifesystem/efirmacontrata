const fs = require('fs');
const path = require('path');

function fixFiles(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix duplicate script
  const startWizardLogic = `
      const btnStartWizard = document.getElementById('btnStartWizard');
      if (btnStartWizard) {
        btnStartWizard.addEventListener('click', () => {
          document.getElementById('welcomeScreen').style.display = 'none';
          document.getElementById('mainWizard').style.display = 'block';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
      
      // Update btnStartWizard state when file is uploaded
      const originalHandleFile = handleFile;
      handleFile = function(file, key, nameEl) {
        if(originalHandleFile) originalHandleFile(file, key, nameEl);
        if (key === 'comprobantePago') {
          const btn = document.getElementById('btnStartWizard');
          if (btn) btn.disabled = !file;
        }
      };
`;

  // remove duplicates by splitting and keeping only one
  if(content.split('const btnStartWizard = document.getElementById').length > 2) {
      // Find the first index
      const firstIndex = content.indexOf('const btnStartWizard = document.getElementById');
      content = content.substring(0, firstIndex) + startWizardLogic + '\n</script>\n</body>\n</html>';
  }

  // Fix progress bar
  // The current progress bar has step 5. We need to remove step 5.
  const oldProgressRegex = /<div class="step" data-step="4">5<\/div>\s*<div class="step" data-step="5">✓<\/div>/;
  if(oldProgressRegex.test(content)) {
      content = content.replace(oldProgressRegex, '<div class="step" data-step="4">✓</div>');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', filePath);
}

fixFiles(path.join(__dirname, 'frontend', 'formulario-inquilino.html'));
fixFiles(path.join(__dirname, 'frontend', 'formulario-propietario.html'));
