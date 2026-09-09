/**
 * Borra UNA fila fantasma concreta, identificada por su ID DE REGISTRO.
 *
 * No borra "la fila N": vuelve a localizarla por su ID justo antes de borrar.
 * Si alguien movio filas entretanto, el numero ya no sirve y el ID si.
 *
 * Aborta si cualquier comprobacion falla. Uso:
 *   node _herramientas_locales/borrar_fila_fantasma.js            (simulacion)
 *   node _herramientas_locales/borrar_fila_fantasma.js --borrar
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const ID_HOJA = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

// La fila fantasma que se quiere borrar, y el inmueble que DEBE sobrevivir.
const ID_FANTASMA = 'IX730362';
const CDR_FANTASMA = 'REG_08-09-2026-A10_(TV 57 #104B-65/85)_APTO-203';
const ID_SUPERVIVIENTE = 'NH579616';

const BORRAR = process.argv.includes('--borrar');

(async () => {
  const auth = new google.auth.GoogleAuth({ credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: ID_HOJA });
  const hoja = meta.data.sheets.find(s => s.properties.title === HOJA);
  const sheetId = hoja.properties.sheetId;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ID_HOJA, range: `'${HOJA}'!A1:ZZ` });
  const rows = res.data.values;
  const h = rows[0].map(x => (x || '').trim());
  const c = n => h.indexOf(n);
  const val = (fila0, nombre) => {
    const i = c(nombre);
    return i === -1 ? '' : String((rows[fila0] || [])[i] || '').trim();
  };

  // --- localizar por ID, no por numero de fila ---
  const iId = c('ID DE REGISTRO');
  const idx = rows.findIndex((r, n) => n > 0 && String(r[iId] || '').trim() === ID_FANTASMA);
  if (idx === -1) { console.error(`❌ No se encontro ninguna fila con ID ${ID_FANTASMA}. Nada que borrar.`); process.exit(1); }
  const fila = idx + 1;
  console.log(`Fila fantasma localizada por ID: fila ${fila}`);

  const fallos = [];
  const ok = (cond, textoOk, textoMal) => {
    console.log(`  ${cond ? '✅' : '❌'} ${cond ? textoOk : textoMal}`);
    if (!cond) fallos.push(textoMal);
  };

  console.log('\n--- COMPROBACIONES ---');
  ok(val(idx, 'CODIGO DE REGISTRO') === CDR_FANTASMA,
     `el CDR coincide: ${CDR_FANTASMA}`,
     `el CDR NO coincide (esperado ${CDR_FANTASMA}, hay "${val(idx, 'CODIGO DE REGISTRO')}")`);
  ok(val(idx, 'ESTADO DEL INMUEBLE').toUpperCase() === 'REGISTRANDO',
     'sigue a medias (REGISTRANDO)',
     `el estado cambio a "${val(idx, 'ESTADO DEL INMUEBLE')}": ya no es una fila fantasma`);
  ok(!val(idx, 'LINK CARPETA DE CONTENIDO'),
     'no tiene carpeta de contenido propia',
     'AHORA tiene carpeta de contenido: se proceso, no se toca');

  // --- el inmueble de verdad tiene que sobrevivir ---
  const idxSup = rows.findIndex((r, n) => n > 0 && String(r[iId] || '').trim() === ID_SUPERVIVIENTE);
  ok(idxSup !== -1, `el inmueble original sigue en la fila ${idxSup + 1}`, 'NO se encuentra el inmueble original');
  if (idxSup !== -1) {
    ok(val(idxSup, 'Ingrese la Dirección del inmueble') === val(idx, 'Ingrese la Dirección del inmueble') &&
       val(idxSup, 'N° de inmueble') === val(idx, 'N° de inmueble'),
       `mismo inmueble: ${val(idxSup, 'Ingrese la Dirección del inmueble')} apto ${val(idxSup, 'N° de inmueble')}`,
       'la fila superviviente NO es el mismo inmueble');
    console.log(`     original: ${val(idxSup, 'CODIGO DE REGISTRO')}  estado "${val(idxSup, 'ESTADO DEL INMUEBLE')}"`);
  }

  // --- la fantasma no puede llevar ningun dato que el original no tenga ---
  const soloEnFantasma = [];
  h.forEach((nombre, i) => {
    if (!nombre) return;
    if (/^(CODIGO DE REGISTRO|ID DE REGISTRO|ESTADO|DETALLES)/i.test(nombre)) return;
    const vf = String((rows[idx] || [])[i] || '').trim();
    const vo = String((rows[idxSup] || [])[i] || '').trim();
    if (vf && vf !== vo) soloEnFantasma.push(`${nombre} = "${vf.slice(0, 40)}"`);
  });
  ok(soloEnFantasma.length === 0,
     'no aporta ningun dato que el original no tenga',
     `aporta ${soloEnFantasma.length} dato(s) que se perderian: ${soloEnFantasma.slice(0, 5).join(' | ')}`);

  if (fallos.length) { console.error('\n🛑 ABORTADO. No se borra nada.'); process.exit(1); }
  if (!BORRAR) { console.log('\n🔎 SIMULACION. Todo correcto. Para borrar: --borrar'); return; }

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ID_HOJA, requestBody: { requests: [{
    deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila } }
  }] } });
  console.log(`\n🗑️ Fila ${fila} borrada (${CDR_FANTASMA}).`);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
