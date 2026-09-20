// Compara la carpeta REG de cada inmueble contra PLANTILLA #2 de la maestra
// (el mismo molde que usa el registro) y lista lo que falta. Solo lee.
//
// Uso: node comparar_carpetas_con_plantilla.js [--ver] [--muestra N]
// Compara en paralelo (5 a la vez): recorrer 69 inmuebles de a uno tardaba
// demasiado (~9.000 consultas a Drive).
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const PLANTILLA_MAESTRA = '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH';
const VER = process.argv.includes('--ver');

const hijos = async (id) => {
  let out = [], pageToken;
  do {
    const r = await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType)', pageToken, pageSize: 1000 });
    out = out.concat(r.data.files); pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
};
const carpeta = async (id, nombre) => (await hijos(id)).find(f => f.name === nombre && f.mimeType.includes('folder'));

// Árbol de la plantilla: rutas de carpetas y de archivos
async function arbol(id, ruta = '', carpetas = [], archivos = []) {
  for (const f of await hijos(id)) {
    const p = ruta + '/' + f.name;
    if (f.mimeType.includes('folder')) { carpetas.push(p); await arbol(f.id, p, carpetas, archivos); }
    else archivos.push(p);
  }
  return { carpetas, archivos };
}

(async () => {
  const inm = await carpeta(PLANTILLA_MAESTRA, 'INMUEBLES');
  const arr = await carpeta(inm.id, 'ARRIENDO');
  const p2 = await carpeta(arr.id, 'PLANTILLA #2');
  const molde = await arbol(p2.id);
  console.log(`Molde (PLANTILLA #2): ${molde.carpetas.length} carpetas, ${molde.archivos.length} archivos\n`);

  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ", valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const cReg = h.indexOf('LINK DE CARPETA REG'), cId = h.indexOf('ID DE REGISTRO'), cCdr = h.indexOf('CODIGO DE REGISTRO');
  let completos = 0, incompletos = [];
  const iMuestra = process.argv.indexOf('--muestra');
  let pendientes = filas.filter(f => String(f[cId] || '').trim() && /folders\/[\w-]+/.test(String(f[cReg] || '')));
  if (iMuestra !== -1) pendientes = pendientes.slice(0, Number(process.argv[iMuestra + 1]) || 10);
  console.log(`Inmuebles a revisar: ${pendientes.length}
`);

  const revisar = async (fila) => {
    const id = String(fila[cId] || '').trim();
    const m = String(fila[cReg] || '').match(/folders\/([\w-]+)/);
    const anio = (String(fila[cCdr] || '').match(/REG_\d{2}-\d{2}-(\d{4})/) || [])[1] || '????';
    let mio;
    try { mio = await arbol(m[1]); } catch (e) { console.log(`⚠️ ${id}: ${e.message}`); return; }
    const anioReal = (mio.carpetas.find(c => /\/\d{4}(\/|$)/.test(c)) || '').match(/\/(\d{4})(\/|$)/);
    const esperadas = molde.carpetas.map(c => c.replace('/XXXX', '/' + (anioReal ? anioReal[1] : anio)));
    const faltan = esperadas.filter(c => !mio.carpetas.includes(c));
    if (faltan.length) {
      incompletos.push({ id, anio, faltan });
      console.log(`📁 ${id} (${anio}): faltan ${faltan.length}`);
      if (VER) faltan.forEach(f => console.log('     ' + f));
    } else { completos++; console.log(`✅ ${id} (${anio}): completo`); }
  };

  const EN_PARALELO = 5;
  for (let i = 0; i < pendientes.length; i += EN_PARALELO) {
    await Promise.all(pendientes.slice(i, i + EN_PARALELO).map(revisar));
  }
  console.log(`\nCompletos: ${completos}`);
  console.log(`Incompletos: ${incompletos.length}`);
})().catch(e => console.error(e.message));
