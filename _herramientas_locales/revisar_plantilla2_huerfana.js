// Busca la carpeta huérfana "PLANTILLA #2" dentro de los RPR de propietario.
//
// De dónde sale: en un propietario NUEVO (TIPO 1), procesarTipo4_NuevoPropietario
// copia PLANTILLA #1 entera dentro del RPR, y PLANTILLA #1 trae dentro
// INMUEBLES/ARRIENDO/PLANTILLA #2. Ese molde ya no se usa (el REG se crea desde
// la maestra), así que queda de adorno y confunde.
//
// Uso:
//   node revisar_plantilla2_huerfana.js            → SIMULACIÓN
//   node revisar_plantilla2_huerfana.js --borrar   → la manda a la papelera
//   node revisar_plantilla2_huerfana.js --id CDR   → solo ese registro
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const BORRAR = process.argv.includes('--borrar');
const idxId = process.argv.indexOf('--id');
const SOLO_ID = idxId !== -1 ? String(process.argv[idxId + 1] || '').trim().toUpperCase() : '';

const hijos = async (id) => {
  let out = [], pageToken;
  do {
    const r = await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType)', pageToken, pageSize: 1000 });
    out = out.concat(r.data.files); pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
};

// Recorre el RPR completo buscando cualquier carpeta llamada PLANTILLA #2
async function buscar(id, ruta, hallazgos) {
  for (const f of await hijos(id)) {
    if (!f.mimeType.includes('folder')) continue;
    if (f.name === 'PLANTILLA #2') { hallazgos.push({ id: f.id, ruta: ruta + '/PLANTILLA #2' }); continue; }
    await buscar(f.id, ruta + '/' + f.name, hallazgos);
  }
  return hallazgos;
}

// Cuenta todo lo que hay dentro, para saber si borrarla es inofensivo
async function contenido(id) {
  let carpetas = 0, archivos = 0;
  for (const f of await hijos(id)) {
    if (f.mimeType.includes('folder')) { carpetas++; const c = await contenido(f.id); carpetas += c.carpetas; archivos += c.archivos; }
    else archivos++;
  }
  return { carpetas, archivos };
}

(async () => {
  console.log(`${BORRAR ? '🧹 BORRANDO' : '🔎 SIMULACIÓN'}${SOLO_ID ? ' — solo ' + SOLO_ID : ''}\n`);

  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ", valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const cRpr = h.indexOf('LINK DE CARPETA RPR'), cId = h.indexOf('ID DE REGISTRO');

  const rprs = new Map();
  for (const f of filas) {
    const id = String(f[cId] || '').trim();
    const m = String(f[cRpr] || '').match(/folders\/([\w-]+)/);
    if (!id || !m) continue;
    if (SOLO_ID && id.toUpperCase() !== SOLO_ID) continue;
    if (!rprs.has(m[1])) rprs.set(m[1], []);
    rprs.get(m[1]).push(id);
  }
  console.log(`Propietarios (RPR) a revisar: ${rprs.size}\n`);

  let conHuerfana = 0, limpias = 0, borradas = 0, errores = 0;
  const trabajo = async ([rprId, inmuebles]) => {
    try {
      const meta = await drive.files.get({ fileId: rprId, fields: 'name,trashed' });
      if (meta.data.trashed) return;
      const hallazgos = await buscar(rprId, '', []);
      if (!hallazgos.length) { limpias++; return; }
      conHuerfana++;
      for (const x of hallazgos) {
        const c = await contenido(x.id);
        console.log(`📁 ${meta.data.name} [${inmuebles.join(', ')}]`);
        console.log(`     ${x.ruta}  (${c.carpetas} subcarpetas, ${c.archivos} archivos)`);
        if (BORRAR) {
          await drive.files.update({ fileId: x.id, requestBody: { trashed: true } });
          borradas++;
          console.log('     → enviada a la papelera');
        }
      }
    } catch (e) { errores++; console.log(`❌ ${rprId}: ${e.message.slice(0, 90)}`); }
  };

  const lista = [...rprs.entries()];
  for (let i = 0; i < lista.length; i += 6) await Promise.all(lista.slice(i, i + 6).map(trabajo));

  console.log(`\nRPR limpias: ${limpias} | con PLANTILLA #2 huérfana: ${conHuerfana} | borradas: ${borradas} | errores: ${errores}`);
  if (!BORRAR && conHuerfana) console.log('(simulación: agrega --borrar para mandarlas a la papelera)');
})().catch(e => { console.error(e.message); process.exit(1); });
