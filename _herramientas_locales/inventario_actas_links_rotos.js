// Para cada fila con un link de acta roto, lista qué archivos hay de verdad en
// REG/ARCHIVOS DEL INMUEBLE/AUTORIZACIONES DE COMERCIALIZACIÓN.
//
// Sirve para decidir si el link se puede reapuntar (el archivo existe con otro
// ID) o si no hay nada que apuntar (la carpeta está vacía).
//
// Solo lee.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

const COLS_ACTA = [
  'Link to merged Doc - CORRETAJE',
  'Link to merged Doc - ADMINISTRACIÓN',
  'Link to merged Doc - VENTA',
  'Link to merged Doc - VENDI-RENTA',
  'Link to merged Doc - ADMI-VENTA',
  'Link to merged Doc - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
];

const hijos = async (id) => (await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'files(id,name,mimeType)', pageSize: 500 })).data.files;
const idDeDrive = (t) => { const m = String(t || '').match(/(?:folders|\/d)\/([\w-]{20,})/); return m ? m[1] : ''; };
const urlsDeCelda = (c) => {
  if (!c) return '';
  const a = [c.userEnteredValue && c.userEnteredValue.formulaValue, c.hyperlink, c.formattedValue,
             ...(c.textFormatRuns || []).map(r => r.format && r.format.link && r.format.link.uri)].filter(Boolean);
  return a.join(' ');
};
const existe = async (id) => { try { const d = await drive.files.get({ fileId: id, fields: 'trashed' }); return !d.data.trashed; } catch (e) { return false; } };

(async () => {
  const r = await sheets.spreadsheets.get({
    spreadsheetId: SHEET, ranges: [`'${HOJA}'!A1:ZZ`],
    fields: 'sheets(data(rowData(values(formattedValue,hyperlink,userEnteredValue/formulaValue,textFormatRuns(format/link/uri)))))',
  });
  const filas = r.data.sheets[0].data[0].rowData;
  const h = (filas[0].values || []).map(v => (v && v.formattedValue) || '');
  const cId = h.indexOf('ID DE REGISTRO'), cReg = h.indexOf('LINK DE CARPETA REG');
  const cols = COLS_ACTA.map(n => ({ nombre: n, i: h.indexOf(n) })).filter(c => c.i !== -1);

  let conArchivos = 0, vacias = 0;

  for (let f = 1; f < filas.length; f++) {
    const c = (filas[f].values) || [];
    const id = ((c[cId] && c[cId].formattedValue) || '').trim();
    if (!id) continue;

    // ¿tiene algún link de acta roto?
    const rotos = [];
    for (const col of cols) {
      const texto = urlsDeCelda(c[col.i]);
      if (!texto.trim()) continue;
      const driveId = idDeDrive(texto);
      if (!driveId) { rotos.push({ col: col.nombre, motivo: 'TEXTO SIN LINK' }); continue; }
      if (!(await existe(driveId))) rotos.push({ col: col.nombre, motivo: 'NO EXISTE', id: driveId });
    }
    if (!rotos.length) continue;

    console.log(`\n📄 fila ${f + 1} — ${id}`);
    rotos.forEach(x => console.log(`   ❌ ${x.col}: ${x.motivo}`));

    const regId = idDeDrive(urlsDeCelda(c[cReg]));
    if (!regId) { console.log('   ⚠️ la fila no tiene link de carpeta REG'); continue; }

    const arch = (await hijos(regId)).find(x => x.name === 'ARCHIVOS DEL INMUEBLE');
    const aut = arch && (await hijos(arch.id)).find(x => x.name.indexOf('AUTORIZACIONES') === 0);
    if (!aut) { console.log('   ⚠️ no hay carpeta AUTORIZACIONES DE COMERCIALIZACIÓN'); vacias++; continue; }

    const archivos = (await hijos(aut.id)).filter(x => !x.mimeType.includes('folder'));
    if (!archivos.length) { console.log('   ⚠️ la carpeta de actas está VACÍA — no hay a qué apuntar'); vacias++; continue; }

    conArchivos++;
    console.log('   📂 actas que sí existen:');
    archivos.forEach(a => console.log(`        • ${a.name}`));
  }

  console.log(`\nFilas con actas disponibles: ${conArchivos} | filas sin nada que apuntar: ${vacias}`);
})().catch(e => { console.error(e.message); process.exit(1); });
