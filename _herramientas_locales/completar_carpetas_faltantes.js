// Completa en cada carpeta REG las subcarpetas que le falten frente a
// PLANTILLA #2 de la maestra (el mismo molde que usa el registro).
//
// Hace lo mismo que completarCarpetasFaltantes_CONFIRMADO de Apps Script, pero
// en paralelo: allá tarda ~2,5 min por inmueble y hay que encadenar pasadas por
// el límite de 6 minutos.
//
// Reglas (iguales a las del registro):
//  - "XXXX" del molde = la carpeta de año que YA tiene el inmueble. Si no tiene
//    ninguna, se crea con el año DEL REGISTRO (del CDR), no con el actual.
//  - Nunca borra, renombra ni mueve nada. Solo crea lo que falta.
//  - Solo carpetas: los archivos del molde no se copian.
//
// Uso:
//   node completar_carpetas_faltantes.js            → SIMULACIÓN (no crea nada)
//   node completar_carpetas_faltantes.js --crear    → crea de verdad
//   ... [--solo ID1,ID2]  para limitarlo a ciertos inmuebles
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const PLANTILLA_MAESTRA = '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH';
const CREAR = process.argv.includes('--crear');
const iSolo = process.argv.indexOf('--solo');
const SOLO = iSolo !== -1 ? process.argv[iSolo + 1].split(',') : null;

const hijos = async (id) => {
  let out = [], pageToken;
  do {
    const r = await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType)', pageToken, pageSize: 1000 });
    out = out.concat(r.data.files); pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
};
const buscar = async (id, nombre) => (await hijos(id)).find(f => f.name === nombre && f.mimeType.includes('folder'));
const crearCarpeta = async (nombre, padre) => (await drive.files.create({ requestBody: { name: nombre, mimeType: 'application/vnd.google-apps.folder', parents: [padre] }, fields: 'id' })).data.id;

// Molde como árbol en memoria: {nombre, hijos:[...]}
async function moldeDe(id) {
  const nodos = [];
  for (const f of await hijos(id)) {
    if (!f.mimeType.includes('folder')) continue;
    nodos.push({ nombre: f.name, hijos: await moldeDe(f.id) });
  }
  return nodos;
}

async function completar(nodos, destinoId, anio, ruta, creadas, hijosCache) {
  const existentes = hijosCache || await hijos(destinoId);
  for (const nodo of nodos) {
    let nombre = nodo.nombre;
    if (nombre === 'XXXX') {
      const anioExistente = existentes.find(f => f.mimeType.includes('folder') && /^\d{4}$/.test(f.name));
      nombre = anioExistente ? anioExistente.name : anio;
    }
    let hija = existentes.find(f => f.name === nombre && f.mimeType.includes('folder'));
    let hijaId, hijosDeHija = null;
    if (hija) { hijaId = hija.id; }
    else {
      creadas.push(ruta + '/' + nombre);
      if (!CREAR) continue;               // en simulación no se puede bajar más
      hijaId = await crearCarpeta(nombre, destinoId);
      hijosDeHija = [];                    // recién creada: está vacía
    }
    await completar(nodo.hijos, hijaId, anio, ruta + '/' + nombre, creadas, hijosDeHija);
  }
  return creadas;
}

(async () => {
  const inm = await buscar(PLANTILLA_MAESTRA, 'INMUEBLES');
  const arr = await buscar(inm.id, 'ARRIENDO');
  const p2 = await buscar(arr.id, 'PLANTILLA #2');
  const molde = await moldeDe(p2.id);
  console.log(`${CREAR ? '🧹 CREANDO' : '🔎 SIMULACIÓN'} — molde PLANTILLA #2 leído\n`);

  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ", valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const cReg = h.indexOf('LINK DE CARPETA REG'), cId = h.indexOf('ID DE REGISTRO'), cCdr = h.indexOf('CODIGO DE REGISTRO');

  let pendientes = filas.filter(f => String(f[cId] || '').trim() && /folders\/[\w-]+/.test(String(f[cReg] || '')));
  if (SOLO) pendientes = pendientes.filter(f => SOLO.includes(String(f[cId]).trim()));

  let totalCreadas = 0, tocados = 0, errores = 0;
  const trabajo = async (fila) => {
    const id = String(fila[cId]).trim();
    const regId = String(fila[cReg]).match(/folders\/([\w-]+)/)[1];
    const anio = (String(fila[cCdr] || '').match(/REG_\d{2}-\d{2}-(\d{4})/) || [])[1] || String(new Date().getFullYear());
    try {
      const creadas = await completar(molde, regId, anio, '', []);
      if (creadas.length) { tocados++; totalCreadas += creadas.length; console.log(`${CREAR ? '✅' : '📁'} ${id} (${anio}): ${creadas.length} carpeta(s)`); }
    } catch (e) { errores++; console.log(`❌ ${id}: ${e.message.slice(0, 90)}`); }
  };

  const EN_PARALELO = 6;
  for (let i = 0; i < pendientes.length; i += EN_PARALELO) {
    await Promise.all(pendientes.slice(i, i + EN_PARALELO).map(trabajo));
  }
  console.log(`\nInmuebles con faltantes: ${tocados} | carpetas ${CREAR ? 'creadas' : 'que faltan'}: ${totalCreadas} | errores: ${errores}`);
  if (!CREAR) console.log('(simulación: agrega --crear para hacerlo de verdad)');
})().catch(e => { console.error(e.message); process.exit(1); });
