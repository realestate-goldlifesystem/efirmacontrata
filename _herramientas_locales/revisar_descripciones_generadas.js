// Lee el Doc "DESCRIPCIÓN DE INMUEBLE" de cada inmueble y busca defectos del
// formato viejo. Solo lee.
//
// Uso: node revisar_descripciones_generadas.js [--ver ID]
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const iVer = process.argv.indexOf('--ver');
const VER_ID = iVer !== -1 ? process.argv[iVer + 1] : null;

const DEFECTOS = [
  [/\(es\)|\(s\)/, 'plural genérico'],
  [/El\/la/, 'El/la'],
  [/\$\s*\$/, '$ repetido'],
  [/^\s*(?:P[aá]gina\s+)?\d+\s+de\s+\d+\s*$/m, 'número de página'],
  [/ㅤ/, 'carácter invisible'],
  [/\bvia\b/, 'via sin tilde'],
  [/##/, 'doble numeral'],
  [/^(ARRIENDO|EN VENTA)[^\n]*\n(APTO|CASA|APTOESTUDIO)/m, 'título en dos líneas'],
];

const hijos = async (id) => (await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'files(id,name,mimeType)', pageSize: 1000 })).data.files;
const buscar = async (id, n) => (await hijos(id)).find(f => f.name === n && f.mimeType.includes('folder'));

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ", valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const cReg = h.indexOf('LINK DE CARPETA REG'), cId = h.indexOf('ID DE REGISTRO'), cCdr = h.indexOf('CODIGO DE REGISTRO');
  let conDoc = 0, sinDoc = [], conDefectos = [];

  const revisar = async (fila) => {
    const id = String(fila[cId] || '').trim();
    const m = String(fila[cReg] || '').match(/folders\/([\w-]+)/);
    if (!id || !m) return;
    const anio = (String(fila[cCdr] || '').match(/REG_\d{2}-\d{2}-(\d{4})/) || [])[1] || '?';
    try {
      const arch = await buscar(m[1], 'ARCHIVOS DEL INMUEBLE');
      const cont = arch && await buscar(arch.id, 'CONTENIDO DE PUBLICACIÓN');
      const carp = cont && await buscar(cont.id, 'DESCRIPCIÓN DE LA PUBLICACIÓN');
      const doc = carp && (await hijos(carp.id)).find(f => f.name === 'DESCRIPCIÓN DE INMUEBLE');
      if (!doc) { sinDoc.push(`${id} (${anio})`); return; }
      conDoc++;
      const txt = (await drive.files.export({ fileId: doc.id, mimeType: 'text/plain' }, { responseType: 'text' })).data;
      if (VER_ID === id) console.log(`\n===== ${id} =====\n${txt}\n`);
      const malos = DEFECTOS.filter(([re]) => re.test(txt)).map(([, n]) => n);
      if (malos.length) conDefectos.push(`${id} (${anio}): ${malos.join(', ')}`);
    } catch (e) { sinDoc.push(`${id}: ${e.message.slice(0, 50)}`); }
  };

  const lista = filas.filter(f => String(f[cId] || '').trim());
  for (let i = 0; i < lista.length; i += 6) await Promise.all(lista.slice(i, i + 6).map(revisar));

  console.log(`Con descripción: ${conDoc}`);
  console.log(`Sin descripción (${sinDoc.length}): ${sinDoc.join(' | ') || 'ninguno'}`);
  console.log(`Con defectos del formato viejo (${conDefectos.length}):\n  ${conDefectos.join('\n  ') || 'ninguno ✅'}`);
})().catch(e => console.error(e.message));
