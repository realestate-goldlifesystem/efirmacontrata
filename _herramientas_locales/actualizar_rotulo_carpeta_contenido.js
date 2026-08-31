/**
 * Pone "CARPETA DE CONTENIDO 📁📸📢" como rotulo del hipervinculo en todos los
 * registros que ya existian. Los nuevos ya salen asi desde el backend.
 *
 * Solo se toca el TEXTO del enlace (segundo argumento del HYPERLINK). La URL se
 * conserva TAL CUAL: se reutiliza la que ya estaba, nunca se reconstruye, para
 * no arriesgar apuntar a otra carpeta.
 *
 * La columna se resuelve por NOMBRE, no por letra: en este Sheet las columnas se
 * mueven de sitio (CHECK MULTIMEDIA paso de la 245 a la 214).
 *
 * Uso: node _herramientas_locales/actualizar_rotulo_carpeta_contenido.js [--aplicar]
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const COLUMNA = 'LINK CARPETA DE CONTENIDO';
const ROTULO = 'CARPETA DE CONTENIDO 📁📸📢';
const APLICAR = process.argv.includes('--aplicar');
const L = n => { let s=''; while(n>0){const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26);} return s; };

(async () => {
  const auth = new google.auth.GoogleAuth({ credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const cab = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${HOJA}'!1:1` });
  const headers = cab.data.values[0].map(x => (x || '').trim());
  const i = headers.indexOf(COLUMNA);
  if (i === -1) throw new Error(`No existe la columna "${COLUMNA}"`);
  const col = L(i + 1);
  console.log(`"${COLUMNA}" -> columna ${i + 1} (${col})`);

  // FORMULA, no valor: hace falta la URL original
  const f = await sheets.spreadsheets.values.get({ spreadsheetId: ID,
    range: `'${HOJA}'!${col}2:${col}`, valueRenderOption: 'FORMULA' });
  const filas = f.data.values || [];

  const cambios = [];
  let yaOk = 0, vacias = 0, raras = 0;
  filas.forEach((fila, n) => {
    const formula = String((fila && fila[0]) || '').trim();
    if (!formula) { vacias++; return; }
    const m = formula.match(/HYPERLINK\("([^"]+)"/i);
    if (!m) { raras++; console.log(`  ⚠️ fila ${n + 2}: no es un HYPERLINK -> ${formula.slice(0, 60)}`); return; }
    if (formula.includes(ROTULO)) { yaOk++; return; }
    // Se reutiliza la URL existente, no se reconstruye
    cambios.push({ fila: n + 2, nueva: `=HYPERLINK("${m[1]}";"${ROTULO}")` });
  });

  console.log(`\nfilas con enlace: ${filas.length - vacias}`);
  console.log(`  ya con los emojis: ${yaOk}`);
  console.log(`  a actualizar:      ${cambios.length}`);
  console.log(`  vacias:            ${vacias}`);
  console.log(`  sin HYPERLINK:     ${raras}`);
  if (cambios.length) console.log(`  ejemplo -> ${cambios[0].nueva.slice(0, 90)}`);

  if (!APLICAR) { console.log('\n🔎 SIMULACION. Para aplicarlo: --aplicar'); return; }
  if (!cambios.length) { console.log('\nNada que hacer.'); return; }

  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: ID, requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: cambios.map(c => ({ range: `'${HOJA}'!${col}${c.fila}`, values: [[c.nueva]] }))
  }});
  console.log(`\n✅ ${cambios.length} rotulos actualizados.`);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
