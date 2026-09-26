// Repara la columna "LINK DE CARPETA RPR" cuando apunta a una carpeta que ya no
// existe. El RPR verdadero se deduce subiendo desde la carpeta REG de la fila
// (REG → negocio → INMUEBLES → RPR), que es la jerarquía que arma el registro.
//
// No inventa nada: si la carpeta REG tampoco sirve, deja la fila quieta y avisa.
//
// Uso:
//   node reparar_link_rpr.js            → SIMULACIÓN
//   node reparar_link_rpr.js --escribir → escribe la hoja
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const ESCRIBIR = process.argv.includes('--escribir');

const idDeDrive = (t) => { const m = String(t || '').match(/(?:folders|\/d)\/([\w-]{20,})/); return m ? m[1] : ''; };
const urlsDeCelda = (c) => {
  if (!c) return '';
  return [c.userEnteredValue && c.userEnteredValue.formulaValue, c.hyperlink, c.formattedValue,
          ...(c.textFormatRuns || []).map(r => r.format && r.format.link && r.format.link.uri)].filter(Boolean).join(' ');
};
const vive = async (id) => { try { return !(await drive.files.get({ fileId: id, fields: 'trashed' })).data.trashed; } catch (e) { return false; } };
const col = (i) => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

/** Sube desde el REG hasta el RPR: REG → negocio → INMUEBLES → RPR. */
async function rprDesdeReg(regId) {
  let cur = regId;
  for (let i = 0; i < 4; i++) {
    const f = (await drive.files.get({ fileId: cur, fields: 'id,name,parents' })).data;
    if (!f.parents || !f.parents.length) return null;
    cur = f.parents[0];
    const padre = (await drive.files.get({ fileId: cur, fields: 'id,name,trashed' })).data;
    if (/RPR-\d+/.test(padre.name) && !padre.trashed) return padre;
  }
  return null;
}

(async () => {
  console.log(ESCRIBIR ? '✍️ ESCRIBIENDO' : '🔎 SIMULACIÓN');

  const r = await sheets.spreadsheets.get({
    spreadsheetId: SHEET, ranges: [`'${HOJA}'!A1:ZZ`],
    fields: 'sheets(data(rowData(values(formattedValue,hyperlink,userEnteredValue/formulaValue,textFormatRuns(format/link/uri)))))',
  });
  const filas = r.data.sheets[0].data[0].rowData;
  const h = (filas[0].values || []).map(v => (v && v.formattedValue) || '');
  const cId = h.indexOf('ID DE REGISTRO');
  const cRpr = h.indexOf('LINK DE CARPETA RPR');
  const cReg = h.indexOf('LINK DE CARPETA REG');
  if (cRpr === -1 || cReg === -1) throw new Error('Faltan las columnas de link de carpeta');

  const arreglos = [];
  let sinArreglo = 0;

  for (let f = 1; f < filas.length; f++) {
    const c = (filas[f].values) || [];
    const id = ((c[cId] && c[cId].formattedValue) || '').trim();
    if (!id) continue;

    const rprId = idDeDrive(urlsDeCelda(c[cRpr]));
    if (!rprId || await vive(rprId)) continue;          // no hay link, o está sano

    const rotulo = ((c[cRpr] && c[cRpr].formattedValue) || '').trim();
    const regId = idDeDrive(urlsDeCelda(c[cReg]));
    if (!regId || !(await vive(regId))) {
      console.log(`⚠️ fila ${f + 1} — ${id}: RPR roto y el REG tampoco sirve. Se deja quieta.`);
      sinArreglo++; continue;
    }

    const rpr = await rprDesdeReg(regId);
    if (!rpr) {
      console.log(`⚠️ fila ${f + 1} — ${id}: no se pudo deducir el RPR desde el REG. Se deja quieta.`);
      sinArreglo++; continue;
    }

    console.log(`📄 fila ${f + 1} — ${id}`);
    console.log(`     roto:  ${rprId}`);
    console.log(`     bueno: ${rpr.id}  (${rpr.name})`);
    arreglos.push({ fila: f + 1, rotulo: rotulo || rpr.name.split('/').pop(), nuevoId: rpr.id });
  }

  if (ESCRIBIR && arreglos.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: arreglos.map(a => ({
          range: `'${HOJA}'!${col(cRpr)}${a.fila}`,
          values: [[`=HYPERLINK("https://drive.google.com/drive/folders/${a.nuevoId}";"${a.rotulo.replace(/"/g, "'")}")`]],
        })),
      },
    });
    console.log('\n✅ Hoja actualizada.');
  }

  console.log(`\nLinks de RPR a reparar: ${arreglos.length} | sin arreglo posible: ${sinArreglo}`);
  if (!ESCRIBIR && arreglos.length) console.log('(simulación: agrega --escribir para hacerlo de verdad)');
})().catch(e => { console.error(e.message); process.exit(1); });
