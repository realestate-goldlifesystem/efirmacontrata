// Muestra la ruta de carpetas de uno o varios archivos de Drive (Service Account). Uso: node ruta_drive.js <id> [<id>...]
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const drive = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] }) });
(async () => {
  for (const id of process.argv.slice(2)) {
    const ruta = []; let actual = id;
    for (let k = 0; k < 10 && actual; k++) {
      try { const f = (await drive.files.get({ fileId: actual, fields: 'name,parents' })).data; ruta.unshift(f.name + ' [' + actual + ']'); actual = f.parents && f.parents[0]; }
      catch (e) { ruta.unshift('(sin acceso)'); break; }
    }
    console.log(ruta.join('\n  › '), '\n');
  }
})();
