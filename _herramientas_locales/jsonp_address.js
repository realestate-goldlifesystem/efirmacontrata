const fs = require('fs');
const path = require('path');

function addJSONPAddress() {
  const files = ['formulario-inquilino.html', 'formulario-propietario.html'];
  files.forEach(f => {
    const fp = path.join(__dirname, 'frontend', f);
    let htmlContent = fs.readFileSync(fp, 'utf8');

    const oldFetch = `fetch(CONFIG.API_URL + "?accion=obtenerDireccion&cdr=" + encodeURIComponent(state.cdr))
              .then(res => res.json())
              .then(data => {
                if(data && data.direccion) {
                  document.getElementById('displayDir').textContent = data.direccion;
                }
              })
              .catch(err => console.error("Error fetching address:", err));`;

    const newFetch = `
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            window[callbackName] = function(data) {
              if (data && data.success && data.direccion) {
                document.getElementById('displayDir').textContent = data.direccion;
              }
              delete window[callbackName];
            };
            const script = document.createElement('script');
            script.src = CONFIG.API_URL + '?accion=obtenerDireccion&cdr=' + encodeURIComponent(state.cdr) + '&callback=' + callbackName;
            document.body.appendChild(script);
`;

    if (htmlContent.includes(oldFetch)) {
      htmlContent = htmlContent.replace(oldFetch, newFetch);
      fs.writeFileSync(fp, htmlContent, 'utf8');
      console.log('Frontend updated with JSONP:', f);
    } else {
      console.log('Could not find oldFetch in', f);
    }
  });
}

addJSONPAddress();
