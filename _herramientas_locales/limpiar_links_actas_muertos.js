// Vacía las celdas "Link to merged Doc - <negocio>" cuyo documento ya no existe.
//
// Correr DESPUÉS de limpiarActasFirmadas_CONFIRMADO (UTIL_LimpiarActasFirmadas.js):
// ese util reapunta todo link roto que tenga un acta en la carpeta del inmueble,
// así que lo que queda roto es lo que no tiene a qué apuntar. Una celda vacía es
// más honesta que un link que lleva a un error.
//
// Solo toca las columnas "Link to merged Doc". "Merged Doc ID" no se toca.
//
// Uso:
//   node limpiar_links_actas_muertos.js            → SIMULACIÓN
//   node limpiar_links_actas_muertos.js --escribir → vacía las celdas
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const ESCRIBIR = process.argv.includes('--escribir');

const idDeDrive = (t) => { const s = String(t || ''); const m = s.match(/(?:folders|\/d)\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/); return m ? m[1] : ''; };
const urlsDeCelda = (c) => {
  if (!c) return '';
  return [c.userEnteredValue && c.userEnteredValue.formulaValue, c.hyperlink, c.formattedValue,
          ...(c.textFormatRuns || []).map(r => r.format && r.format.link && r.format.link.uri)].filter(Boolean).join(' ');
};
// Solo "no existe" o "en papelera" cuentan como muerto: un 403 u otro error NO,
// porque ahí el archivo puede estar vivo y simplemente no lo vemos.
const muerto = async (id) => {
  try { return !!(await drive.files.get({ fileId: id, fields: 'trashed' })).data.trashed; }
  catch (e) { return e.code === 404; }
};
const colLetra = (i) => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

(async () => {
  console.log(ESCRIBIR ? '✍️ ESCRIBIENDO' : '🔎 SIMULACIÓN');
  const r = await sheets.spreadsheets.get({
    spreadsheetId: SHEET, ranges: [`'${HOJA}'!A1:ZZ`],
    fields: 'sheets(data(rowData(values(formattedValue,hyperlink,userEnteredValue/formulaValue,textFormatRuns(format/link/uri)))))',
  });
  const filas = r.data.sheets[0].data[0].rowData;
  const h = (filas[0].values || []).map(v => (v && v.formattedValue) || '');
  const cId = h.indexOf('ID DE REGISTRO');
  const cols = h.map((n, i) => n.indexOf('Link to merged Doc - ') === 0 ? i : -1).filter(i => i !== -1);

  const rangos = [];
  for (let f = 1; f < filas.length; f++) {
    const c = filas[f].values || [];
    const id = ((c[cId] && c[cId].formattedValue) || '').trim();
    if (!id) continue;
    for (const i of cols) {
      const docId = idDeDrive(urlsDeCelda(c[i]));
      if (!docId || !(await muerto(docId))) continue;
      console.log(`🧹 fila ${f + 1} — ${id}: ${h[i]}`);
      rangos.push(`'${HOJA}'!${colLetra(i)}${f + 1}`);
    }
  }

  if (ESCRIBIR && rangos.length) {
    await sheets.spreadsheets.values.batchClear({ spreadsheetId: SHEET, requestBody: { ranges: rangos } });
    console.log('\n✅ Celdas vaciadas.');
  }
  console.log(`\nLinks muertos: ${rangos.length}`);
  if (!ESCRIBIR && rangos.length) console.log('(simulación: agrega --escribir para vaciarlos)');
})().catch(e => { console.error(e.message); process.exit(1); });
