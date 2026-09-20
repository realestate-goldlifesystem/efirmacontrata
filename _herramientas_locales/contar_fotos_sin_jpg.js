// Cuenta, por inmueble, las imágenes cuyo nombre NO termina en .jpg dentro de
// ARCHIVOS DEL INMUEBLE > CONTENIDO DE PUBLICACIÓN > FOTOGRAFÍAS (y su TOP 10).
// Sirve para verificar el mantenimiento sin depender del log de Apps Script.
// Solo lee.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

const hijos = async (id) => {
  let out = [], pageToken;
  do {
    const r = await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType)', pageToken, pageSize: 1000 });
    out = out.concat(r.data.files); pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
};
const buscarCarpeta = async (id, nombre) => (await hijos(id)).find(f => f.name === nombre && f.mimeType.includes('folder'));

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ", valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const cReg = h.indexOf('LINK DE CARPETA REG'), cId = h.indexOf('ID DE REGISTRO');
  let totalMal = 0, totalFotos = 0, inmueblesConPendientes = [], sinCarpeta = 0;

  for (const fila of filas) {
    const id = String(fila[cId] || '').trim();
    if (!id) continue;
    const m = String(fila[cReg] || '').match(/folders\/([\w-]+)/);
    if (!m) { sinCarpeta++; continue; }
    try {
      const archivos = await buscarCarpeta(m[1], 'ARCHIVOS DEL INMUEBLE');
      if (!archivos) { sinCarpeta++; continue; }
      const contenido = await buscarCarpeta(archivos.id, 'CONTENIDO DE PUBLICACIÓN');
      if (!contenido) { sinCarpeta++; continue; }
      const fotos = await buscarCarpeta(contenido.id, 'FOTOGRAFÍAS');
      if (!fotos) { sinCarpeta++; continue; }

      const carpetas = [fotos.id];
      const top = await buscarCarpeta(fotos.id, 'TOP 10');
      if (top) carpetas.push(top.id);

      let mal = 0, tot = 0;
      for (const c of carpetas) {
        for (const f of await hijos(c)) {
          if (f.mimeType.includes('folder')) continue;
          if (!f.mimeType.startsWith('image/')) continue;
          tot++;
          if (!/\.jpg$/i.test(f.name)) { mal++; if (process.argv.includes('--ver')) console.log(`   ${id}: ${f.name}`); }
        }
      }
      totalFotos += tot; totalMal += mal;
      if (mal) inmueblesConPendientes.push(`${id} (${mal})`);
    } catch (e) {
      console.log(`⚠️ ${id}: ${e.message}`);
    }
  }
  console.log(`\nFotos revisadas: ${totalFotos}`);
  console.log(`Sin .jpg: ${totalMal}`);
  console.log(`Inmuebles con pendientes: ${inmueblesConPendientes.length ? inmueblesConPendientes.join(', ') : 'ninguno ✅'}`);
  if (sinCarpeta) console.log(`(Sin carpeta de fotos accesible: ${sinCarpeta})`);
})().catch(e => console.error(e.message));
