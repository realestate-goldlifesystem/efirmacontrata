/**
 * Descarga un cartel de ventanilla generado, para inspeccionarlo localmente.
 * Uso: node _herramientas_locales/descargar_cartel.js <fileId> [destino.png]
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const fileId = process.argv[2];
const destino = process.argv[3] || path.join(__dirname, 'cartel_descargado.png');
if (!fileId) { console.error('Falta el fileId'); process.exit(1); }

const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });

(async () => {
  const drive = google.drive({ version: 'v3', auth });
  const meta = await drive.files.get({ fileId, fields: 'name,mimeType,size' });
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  await new Promise((ok, err) => {
    const out = fs.createWriteStream(destino);
    res.data.on('end', ok).on('error', err).pipe(out);
  });
  console.log('Archivo :', meta.data.name);
  console.log('Tipo    :', meta.data.mimeType);
  console.log('Guardado:', destino, '(' + fs.statSync(destino).size + ' bytes)');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
