// Lista una carpeta de Drive y/o imprime el texto de Docs (Service Account). Uso: node leer_docs_maestra.js <id> [<id>...]
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
const drive = google.drive({ version: 'v3', auth });
(async () => {
  for (const id of process.argv.slice(2)) {
    const f = (await drive.files.get({ fileId: id, fields: 'name,mimeType' })).data;
    console.log('\n######', f.name, '(' + f.mimeType.replace('application/vnd.google-apps.', '') + ')');
    if (f.mimeType.endsWith('folder')) {
      const r = await drive.files.list({ q: `'${id}' in parents and trashed = false`, fields: 'files(id,name,mimeType)', pageSize: 100 });
      r.data.files.forEach(x => console.log('  ', x.mimeType.replace('application/vnd.google-apps.', ''), '|', x.name, '|', x.id));
    } else if (f.mimeType.endsWith('document')) {
      const t = await drive.files.export({ fileId: id, mimeType: 'text/plain' });
      console.log(String(t.data).trim());
    }
  }
})();
