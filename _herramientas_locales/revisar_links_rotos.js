// Audita TODOS los links de Drive de la hoja de inmuebles y dice cuáles están
// rotos (la carpeta o el documento ya no existe, o está en la papelera).
//
// El link puede venir de tres formas distintas en una misma columna:
//   1. fórmula  =HYPERLINK("https://...";"texto")
//   2. texto plano con la URL
//   3. enlace enriquecido de la celda (no se ve en getValues ni en la fórmula)
// Por eso se lee con spreadsheets.get y se miran las tres.
//
// Solo lee. No escribe nada.
//
// Uso:
//   node revisar_links_rotos.js
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

// ⚠️ Siempre por NOMBRE, nunca por número de columna.
const COLUMNAS = [
  'LINK DE CARPETA RPR',
  'LINK DE CARPETA REG',
  'LINK CARPETA DE CONTENIDO',
  'LINK CARPETA DE PROPIETARIO',
  'LINK CARPETA DE INQUILINO',
  'DOCUMENTO FIRMADO',
  'Link to merged Doc - CORRETAJE',
  'Link to merged Doc - ADMINISTRACIÓN',
  'Link to merged Doc - VENTA',
  'Link to merged Doc - VENDI-RENTA',
  'Link to merged Doc - ADMI-VENTA',
  'Link to merged Doc - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
];

/** Saca el ID de Drive de cualquier forma de URL (carpeta, doc, open?id=). */
const idDeDrive = (t) => {
  const s = String(t || '');
  const m = s.match(/(?:folders|\/d)\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : '';
};

/** Todas las URLs que puede esconder una celda: fórmula, texto y enlace rico. */
function urlsDeCelda(celda) {
  if (!celda) return [];
  const out = [];
  const f = celda.userEnteredValue && celda.userEnteredValue.formulaValue;
  if (f) out.push(f);
  if (celda.formattedValue) out.push(celda.formattedValue);
  if (celda.hyperlink) out.push(celda.hyperlink);
  for (const run of celda.textFormatRuns || []) {
    if (run.format && run.format.link && run.format.link.uri) out.push(run.format.link.uri);
  }
  return out;
}

const cache = new Map();
async function estado(id) {
  if (cache.has(id)) return cache.get(id);
  let r;
  try {
    const d = await drive.files.get({ fileId: id, fields: 'name,trashed,mimeType' });
    r = d.data.trashed ? { ok: false, motivo: 'EN PAPELERA', nombre: d.data.name }
                       : { ok: true, nombre: d.data.name, carpeta: d.data.mimeType.includes('folder') };
  } catch (e) {
    const cod = e.code === 404 ? 'NO EXISTE' : e.code === 403 ? 'SIN ACCESO' : 'ERROR ' + e.code;
    r = { ok: false, motivo: cod };
  }
  cache.set(id, r);
  return r;
}

(async () => {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET,
    ranges: [`'${HOJA}'!A1:ZZ`],
    fields: 'sheets(data(rowData(values(formattedValue,hyperlink,userEnteredValue/formulaValue,textFormatRuns(format/link/uri)))))',
  });
  const filas = meta.data.sheets[0].data[0].rowData || [];
  const encabezados = (filas[0].values || []).map(v => (v && v.formattedValue) || '');

  const cId = encabezados.indexOf('ID DE REGISTRO');
  const cols = COLUMNAS.map(n => ({ nombre: n, i: encabezados.indexOf(n) }));
  const ausentes = cols.filter(c => c.i === -1);
  if (ausentes.length) console.log('⚠️ Columnas que no existen en la hoja: ' + ausentes.map(c => c.nombre).join(', ') + '\n');

  let revisados = 0, rotos = 0, vacios = 0;
  const problemas = [];

  for (let f = 1; f < filas.length; f++) {
    const celdas = (filas[f].values) || [];
    const id = (celdas[cId] && celdas[cId].formattedValue || '').trim();
    if (!id) continue;

    for (const col of cols) {
      if (col.i === -1) continue;
      const celda = celdas[col.i];
      const urls = urlsDeCelda(celda);
      const driveId = urls.map(idDeDrive).find(Boolean);

      if (!driveId) {
        const texto = (celda && celda.formattedValue || '').trim();
        if (texto) { vacios++; problemas.push({ fila: f + 1, id, col: col.nombre, motivo: 'TEXTO SIN LINK', extra: texto.slice(0, 60) }); }
        continue;
      }

      revisados++;
      const e = await estado(driveId);
      if (!e.ok) { rotos++; problemas.push({ fila: f + 1, id, col: col.nombre, motivo: e.motivo, extra: driveId }); }
    }
  }

  if (!problemas.length) console.log('✅ Todos los links apuntan a algo que existe.');
  else {
    let idActual = '';
    for (const p of problemas) {
      if (p.id !== idActual) { console.log(`\n📄 fila ${p.fila} — ${p.id}`); idActual = p.id; }
      console.log(`   ❌ ${p.col}: ${p.motivo}  (${p.extra})`);
    }
  }
  console.log(`\nLinks revisados: ${revisados} | rotos: ${rotos} | celdas con texto pero sin link: ${vacios}`);
})().catch(e => { console.error(e.message); process.exit(1); });
