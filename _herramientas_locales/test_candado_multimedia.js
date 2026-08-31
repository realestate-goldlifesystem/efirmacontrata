/**
 * Prueba la logica REAL del candado anti-duplicados y la deteccion de
 * Ciencuadras, extraida de backend/API_MULTIMEDIA.js.
 *
 * Se comprueba contra el Sheet de verdad que las columnas existen y que los
 * registros ya cargados siguen protegidos tras el cambio.
 */
const fs = require('fs'), path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

// --- logica copiada TAL CUAL del backend -------------------------------------
const bloqueado = (headers, fila) => {
  const linkYtCol = headers.indexOf('LINK DEL VIDEO DEL INMUEBLE');
  const checkMmCol = headers.indexOf('CHECK MULTIMEDIA');
  const yaTieneVideo = linkYtCol !== -1 && fila[linkYtCol];
  const yaCargoMultimedia = checkMmCol !== -1 && String(fila[checkMmCol] || '').trim() !== '';
  return !!(yaTieneVideo || yaCargoMultimedia);
};
const esCiencuadras = (headers, fila) => {
  const ccCol = headers.indexOf('¿Viene de Ciencuadras?');
  return ccCol !== -1 && String(fila[ccCol] || '').trim().toUpperCase().indexOf('SI') === 0;
};

// --- 1. pruebas de mesa ------------------------------------------------------
let fallos = 0;
const H = ['LINK DEL VIDEO DEL INMUEBLE', 'CHECK MULTIMEDIA', '¿Viene de Ciencuadras?'];
const t = (n, real, esp) => { const ok = real === esp; if (!ok) fallos++;
  console.log(`${ok ? '✅' : '❌'} ${n}${ok ? '' : `  (esperado ${esp}, real ${real})`}`); };

t('sin nada -> se puede cargar',        bloqueado(H, ['', '', 'NO']), false);
t('con video -> bloqueado (compatibilidad)', bloqueado(H, ['https://youtu.be/x', '', 'NO']), true);
t('sin video pero ya cargado -> BLOQUEADO', bloqueado(H, ['', 'CARGADO SIN VIDEO', 'SI']), true);
t('cargado con video -> bloqueado',     bloqueado(H, ['https://y', 'CARGADO CON VIDEO', 'NO']), true);
t('celda con espacios no cuenta',       bloqueado(H, ['', '   ', 'NO']), false);
t('ciencuadras SI',                     esCiencuadras(H, ['', '', 'SI']), true);
t('ciencuadras minuscula/espacios',     esCiencuadras(H, ['', '', ' si ']), true);
t('ciencuadras NO',                     esCiencuadras(H, ['', '', 'NO']), false);
t('ciencuadras vacio',                  esCiencuadras(H, ['', '', '']), false);

// --- 2. contra el Sheet real -------------------------------------------------
(async () => {
  const auth = new google.auth.GoogleAuth({ credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${HOJA}'!A1:ZZ` });
  const rows = res.data.values || [];
  const headers = rows[0].map(h => (h || '').toString().trim());

  console.log('\n--- contra el Sheet real ---');
  for (const c of ['LINK DEL VIDEO DEL INMUEBLE', 'CHECK MULTIMEDIA', '¿Viene de Ciencuadras?']) {
    const i = headers.indexOf(c);
    if (i === -1) fallos++;
    console.log(`${i !== -1 ? '✅' : '❌'} columna "${c}" ${i !== -1 ? 'en ' + (i + 1) : 'NO EXISTE'}`);
  }

  let conVideo = 0, bloq = 0, cc = 0;
  for (let i = 1; i < rows.length; i++) {
    const f = rows[i];
    const iv = headers.indexOf('LINK DEL VIDEO DEL INMUEBLE');
    if (f[iv]) conVideo++;
    if (bloqueado(headers, f)) bloq++;
    if (esCiencuadras(headers, f)) cc++;
  }
  console.log(`\nregistros: ${rows.length - 1}`);
  console.log(`  con video ya cargado: ${conVideo}`);
  console.log(`  que el candado bloquea: ${bloq}`);
  console.log(`  marcados como Ciencuadras: ${cc}`);
  const ok = bloq >= conVideo;
  if (!ok) fallos++;
  console.log(`${ok ? '✅' : '❌'} ningun registro ya cargado quedo desprotegido`);

  console.log(fallos === 0 ? '\nTODAS PASAN' : `\n${fallos} FALLAN`);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
