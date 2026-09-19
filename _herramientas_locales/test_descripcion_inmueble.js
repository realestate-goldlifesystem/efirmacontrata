// Prueba pulirDescripcion() de backend/LIB_TextExtractor.js con el texto REAL
// de las actas (bajado por la Service Account, no inventado).
//
// Uso: node test_descripcion_inmueble.js <ID_REGISTRO> [<ID_REGISTRO> ...]
// Imprime la descripción final y marca los defectos conocidos si aparecen.
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const lib = fs.readFileSync(path.join(__dirname, '../backend/LIB_TextExtractor.js'), 'utf8');
const inicioFn = lib.indexOf('function pulirDescripcion(');
const pulirDescripcion = new Function(lib.slice(inicioFn) + '\nreturn pulirDescripcion;')();

const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

const DEFECTOS = [
  [/\d+\s+de\s+\d+\s*$/m, 'número de página'],
  [/\(es\)|\(s\)/, 'plural genérico (es)/(s)'],
  [/El\/la/, 'El/la'],
  [/\$\s*\$/, '$ repetido'],
  [/[●○]\s*[●○]/, 'viñeta repetida'],
  [/ㅤ|‎/, 'carácter invisible'],
  [/\bvia\b/, 'via sin tilde'],
  [/\bDeposito\b/, 'Deposito sin tilde'],
];

(async () => {
  const ids = process.argv.slice(2);
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
  const [h, ...filas] = r.data.values;
  let fallas = 0;
  for (const id of ids) {
    const fila = filas.find(x => x[h.indexOf('ID DE REGISTRO')] === id);
    const docId = ['CORRETAJE', 'ADMINISTRACIÓN', 'VENTA', 'ADMI-VENTA', 'VENDI-RENTA']
      .map(t => fila[h.indexOf('Merged Doc ID - ' + t)]).find(Boolean);
    const txt = (await drive.files.export({ fileId: docId, mimeType: 'text/plain' }, { responseType: 'text' })).data;
    const i = txt.indexOf('DESCRIPCIÓN DEL INMUEBLE') + 'DESCRIPCIÓN DEL INMUEBLE'.length;
    const fin = 'y vive en el apartamento de tus sueños';
    const bloque = txt.slice(i, txt.indexOf(fin, i) + fin.length);
    // Emula extraerLineasDeDoc: el export marca listas con "*" (nivel 1) y "   *" (nivel 2).
    const lineas = bloque.replace(/^\s*\n/, '').split(/\r?\n/).map(l =>
      l.replace(/^ {3,}\* /, '○ ').replace(/^\* /, '● '));
    const deposito = String(fila[h.indexOf('¿Dispone de deposito?')] || '').includes('Deposito');
    const out = pulirDescripcion(lineas, {
      numGarajes: fila[h.indexOf('N° de Garajes')], tieneDeposito: deposito, codigoRegistro: id
    });
    console.log(`\n==================== ${id} ====================\n${out}`);
    for (const [re, nombre] of DEFECTOS) if (re.test(out)) { fallas++; console.log(`❌ DEFECTO: ${nombre}`); }
  }
  console.log(fallas ? `\n${fallas} defecto(s)` : '\n✅ Sin defectos conocidos');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
