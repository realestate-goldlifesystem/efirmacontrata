// Estado del pago del inquilino de un registro en PAGOS_RECIBIDOS, junto con la
// etapa del trámite. Solo lee. No imprime datos personales.
// Uso: node ver_pago_registro.js SK142795
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const id = String(process.argv[2] || '').trim().toUpperCase();
(async () => {
  const [inm, pag] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'PAGOS_RECIBIDOS'!A1:Z` })
  ]);
  const [h, ...filas] = inm.data.values;
  const c = (n) => h.map(x => String(x).trim()).indexOf(n);
  const f = filas.find(x => String(x[c('ID DE REGISTRO')] || '').trim().toUpperCase() === id);
  if (!f) return console.log('No está en la hoja: ' + id);
  const cdr = String(f[c('CODIGO DE REGISTRO')] || '').trim();
  console.log('ESTADO DOCUMENTAL :', String(f[c('ESTADO DOCUMENTAL')] || '').split('|')[0]);
  console.log('CONTROL DE PLAZO  :', f[c('CONTROL DE PLAZO')] || '(vacío)');
  const [hp, ...fp] = pag.data.values;
  console.log('Columnas de pagos :', hp.map(x => String(x).trim()).join(' | '));
  const OCULTAR = /nombre|correo|email|pagador|documento|c[eé]dula|tel|celular/i;
  fp.forEach((r, i) => {
    if (!r.some(v => { const t = String(v).trim().toUpperCase(); return t === id || (cdr && t === cdr.toUpperCase()); })) return;
    console.log('--- fila ' + (i + 2));
    hp.forEach((n, j) => { if (r[j] && !OCULTAR.test(n)) console.log('   ' + String(n).trim().padEnd(28), String(r[j]).slice(0, 90)); });
  });
})().catch(e => console.error(e.message));
