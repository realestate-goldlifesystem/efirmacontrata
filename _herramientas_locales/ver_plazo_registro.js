// Etapa y plazo guardados de un registro (por ID DE REGISTRO). Solo lee.
// Uso: node ver_plazo_registro.js MN348696
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const cdr = String(process.argv[2] || '').trim().toUpperCase();
if (!cdr) { console.error('Falta el código de registro.'); process.exit(1); }

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${HOJA}'!A1:ZZ` });
  const [h, ...filas] = r.data.values;
  const c = (n) => h.map(x => String(x).trim()).indexOf(n);
  const i = filas.findIndex(f => String(f[c('ID DE REGISTRO')] || '').trim().toUpperCase() === cdr);
  if (i < 0) { console.log('No está en la hoja: ' + cdr); process.exit(1); }
  const v = (n) => String(filas[i][c(n)] === undefined ? '' : filas[i][c(n)]).trim();
  const [etapa, iso] = v('CONTROL DE PLAZO').split('|');
  console.log(`fila ${i + 2} | ${cdr}`);
  console.log('ESTADO DOCUMENTAL : ' + (v('ESTADO DOCUMENTAL') || '(vacío)'));
  console.log('CONTROL DE PLAZO  : ' + (v('CONTROL DE PLAZO') || '(vacío)'));
  if (iso) {
    const d = new Date(iso);
    console.log('  etapa marcada   : ' + etapa);
    console.log('  reloj desde     : ' + d.toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    console.log('  hace            : ' + ((Date.now() - d) / 3600000).toFixed(1) + ' h');
  }
  console.log('ESTADO INMUEBLE   : ' + v('ESTADO DEL INMUEBLE'));
  console.log('DETALLE           : ' + v('DETALLES DEL ESTADO DEL INMUEBLE').slice(0, 200));
  console.log('ahora (Bogotá)    : ' + new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
})().catch(e => { console.error(e.message); process.exit(1); });
