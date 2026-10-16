// Descarga un archivo de Drive (Docs se exporta a texto). Uso: node descargar_drive.js <id> <salida>
const fs = require('fs'); const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
(async () => {
  const d = google.drive({ version: 'v3', auth }); const [id, out] = process.argv.slice(2);
  const m = (await d.files.get({ fileId: id, fields: 'mimeType' })).data.mimeType;
  const r = m.includes('google-apps') ? await d.files.export({ fileId: id, mimeType: 'text/plain' }, { responseType: 'arraybuffer' })
                                      : await d.files.get({ fileId: id, alt: 'media' }, { responseType: 'arraybuffer' });
  fs.writeFileSync(out, Buffer.from(r.data)); console.log('ok', out);
})();
