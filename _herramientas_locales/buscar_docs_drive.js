// Lista archivos de Drive cuyo nombre contiene un texto (incluye papelera marcada).
// Uso: node buscar_docs_drive.js <texto>
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
(async () => {
  const d = google.drive({ version: 'v3', auth });
  const r = await d.files.list({ q: `name contains '${process.argv[2]}'`, fields: 'files(id,name,mimeType,createdTime,modifiedTime,trashed,parents)', pageSize: 100, supportsAllDrives: true, includeItemsFromAllDrives: true });
  r.data.files.sort((a, b) => a.createdTime.localeCompare(b.createdTime)).forEach(f => console.log(f.createdTime.slice(0, 16), f.trashed ? 'TRASH' : '     ', f.mimeType.split('.').pop().padEnd(9), f.id, f.name));
})();
