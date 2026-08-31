/**
 * Crea la columna CHECK MULTIMEDIA en "1.1 - INMUEBLES REGISTRADOS".
 *
 * Marca que un registro ya paso por la carga de multimedia, HAYA O NO video.
 * Hasta ahora el candado anti-duplicados miraba LINK DEL VIDEO DEL INMUEBLE,
 * asi que un inmueble sin video (los de Ciencuadras) quedaba sin proteger y se
 * podia volver a cargar, duplicando las fotos en Drive.
 *
 * Se anade AL FINAL a proposito: insertarla en medio desplazaria las columnas
 * siguientes. El codigo las resuelve por nombre con indexOf, pero cualquier
 * formula del Sheet escrita con referencias fijas si se romperia.
 *
 * Uso:  node _herramientas_locales/crear_columna_check_multimedia.js [--crear]
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const NUEVA = 'CHECK MULTIMEDIA';
const CREAR = process.argv.includes('--crear');

(async () => {
  const auth = new google.auth.GoogleAuth({
    credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${HOJA}'!1:1`
  });
  const headers = (res.data.values && res.data.values[0]) || [];
  console.log(`columnas actuales: ${headers.length}`);

  const ya = headers.indexOf(NUEVA);
  if (ya !== -1) {
    console.log(`✅ "${NUEVA}" ya existe en la columna ${ya + 1}. No se hace nada.`);
    return;
  }
  console.log(`"${NUEVA}" no existe. Iria en la columna ${headers.length + 1}.`);
  console.log(`vecina anterior: "${headers[headers.length - 1]}"`);
  console.log(`CHECK YT esta en la columna ${headers.indexOf('CHECK YT') + 1}`);

  if (!CREAR) { console.log('\n🔎 SIMULACION. Para crearla: --crear'); return; }

  const col = headers.length + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${HOJA}'!${colLetra(col)}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[NUEVA]] }
  });
  console.log(`✅ Creada "${NUEVA}" en la columna ${col} (${colLetra(col)}).`);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

function colLetra(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
