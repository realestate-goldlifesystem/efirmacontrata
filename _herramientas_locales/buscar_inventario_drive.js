// Busca en Drive (Service Account) carpetas/archivos con "INVENTARIO" en el nombre y sus padres. Diagnóstico, sin datos personales.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const drive = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] }) });
(async () => {
  const r = await drive.files.list({ q: `name contains '${process.argv[2] || "INVENTARIO"}' and trashed = false`, fields: 'files(id,name,mimeType,parents)', pageSize: 50, supportsAllDrives: true, includeItemsFromAllDrives: true });
  for (const f of r.data.files) {
    let padre = '';
    if (f.parents) { try { padre = (await drive.files.get({ fileId: f.parents[0], fields: 'name' })).data.name; } catch (e) {} }
    console.log(f.mimeType.replace('application/vnd.google-apps.', ''), '|', f.name, '| en:', padre, '|', f.id);
  }
})();
