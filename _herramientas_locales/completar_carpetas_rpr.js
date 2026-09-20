// Revisa (y opcionalmente completa) las carpetas de PROPIETARIO (RPR) contra
// PLANTILLA #1 de la maestra, que es el molde que usa el registro de un
// propietario nuevo.
//
// ⚠️ "PLANTILLA #2" NUNCA se copia dentro de un RPR: ese molde es de un solo
// uso y, si queda ahí, el segundo inmueble de ese propietario falla (ver
// crearREGDesdePlantillaMaestra en backend/2- REGISTRO DE INMUEBLE.js).
//
// Uso:
//   node completar_carpetas_rpr.js           → SIMULACIÓN
//   node completar_carpetas_rpr.js --crear   → crea lo que falte
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const PLANTILLA_MAESTRA = '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH';
const CREAR = process.argv.includes('--crear');

const hijos = async (id) => {
  let out = [], pageToken;
  do {
    const r = await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType)', pageToken, pageSize: 1000 });
    out = out.concat(r.data.files); pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
};
const crearCarpeta = async (nombre, padre) => (await drive.files.create({ requestBody: { name: nombre, mimeType: 'application/vnd.google-apps.folder', parents: [padre] }, fields: 'id' })).data.id;

async function moldeDe(id) {
  const nodos = [];
  for (const f of await hijos(id)) {
    if (!f.mimeType.includes('folder')) continue;
    if (f.name === 'PLANTILLA #2') continue;      // nunca dentro de un RPR
    nodos.push({ nombre: f.name, hijos: await moldeDe(f.id) });
  }
  return nodos;
}

async function completar(nodos, destinoId, ruta, faltantes, hijosCache) {
  const existentes = hijosCache || await hijos(destinoId);
  for (const nodo of nodos) {
    let hija = existentes.find(f => f.name === nodo.nombre && f.mimeType.includes('folder'));
    let hijaId, hijosDeHija = null;
    if (hija) hijaId = hija.id;
    else {
      faltantes.push(ruta + '/' + nodo.nombre);
      if (!CREAR) continue;
      hijaId = await crearCarpeta(nodo.nombre, destinoId);
      hijosDeHija = [];
    }
    await completar(nodo.hijos, hijaId, ruta + '/' + nodo.nombre, faltantes, hijosDeHija);
  }
  return faltantes;
}

(async () => {
  const molde = await moldeDe(PLANTILLA_MAESTRA);
  console.log(`${CREAR ? '🧹 CREANDO' : '🔎 SIMULACIÓN'} — molde PLANTILLA #1 leído (sin PLANTILLA #2)\n`);

  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ", valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const cRpr = h.indexOf('LINK DE CARPETA RPR'), cId = h.indexOf('ID DE REGISTRO');

  // Una RPR por propietario, aunque tenga varios inmuebles
  const rprs = new Map();
  for (const f of filas) {
    const id = String(f[cId] || '').trim();
    const m = String(f[cRpr] || '').match(/folders\/([\w-]+)/);
    if (!id || !m) continue;
    if (!rprs.has(m[1])) rprs.set(m[1], []);
    rprs.get(m[1]).push(id);
  }
  console.log(`Propietarios (RPR) distintos: ${rprs.size} para ${filas.filter(f => String(f[cId] || '').trim()).length} inmuebles\n`);

  let completas = 0, totalFaltantes = 0, conFaltantes = 0, errores = 0;
  const trabajo = async ([rprId, inmuebles]) => {
    try {
      const meta = await drive.files.get({ fileId: rprId, fields: 'name,trashed' });
      if (meta.data.trashed) { console.log(`⚠️ ${meta.data.name}: en la papelera`); return; }
      const faltan = await completar(molde, rprId, '', []);
      if (faltan.length) {
        conFaltantes++; totalFaltantes += faltan.length;
        console.log(`${CREAR ? '✅' : '📁'} ${meta.data.name} [${inmuebles.join(', ')}]: ${faltan.length}`);
        faltan.forEach(x => console.log('     ' + x));
      } else completas++;
    } catch (e) { errores++; console.log(`❌ ${rprId}: ${e.message.slice(0, 80)}`); }
  };

  const EN_PARALELO = 6;
  const lista = [...rprs.entries()];
  for (let i = 0; i < lista.length; i += EN_PARALELO) {
    await Promise.all(lista.slice(i, i + EN_PARALELO).map(trabajo));
  }
  console.log(`\nRPR completas: ${completas} | con faltantes: ${conFaltantes} | carpetas ${CREAR ? 'creadas' : 'que faltan'}: ${totalFaltantes} | errores: ${errores}`);
  if (!CREAR && totalFaltantes) console.log('(simulación: agrega --crear para hacerlo de verdad)');
})().catch(e => { console.error(e.message); process.exit(1); });
