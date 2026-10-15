// Para la agenda de interesados: qué valores tienen las columnas de autorización,
// tipo de inmueble, negocio y estado en los inmuebles PUBLICADOS. Solo cuenta valores;
// no imprime nombres, direcciones ni datos personales.
// Uso: node ver_columnas_visita.js
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

(async () => {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
  const [h, ...filas] = res.data.values;
  const idx = (pred) => h.map((x, i) => [x, i]).filter(([x]) => pred(String(x)));
  const estado = h.indexOf('ESTADO DEL INMUEBLE');
  const publicadas = filas.filter(f => /PUBLICADO/i.test(f[estado] || ''));
  console.log('Publicados:', publicadas.length, 'de', filas.length);
  const columnas = idx(x => /autorizaci|TIPO DE NEGOCIO|tipo de inmueble/i.test(x) && !/Merged|Merge|Link to/i.test(x));
  for (const [nombre, i] of columnas) {
    const cuenta = {};
    filas.forEach(f => { const v = String(f[i] || '').trim(); if (v) cuenta[v.slice(0, 70)] = (cuenta[v.slice(0, 70)] || 0) + 1; });
    const pub = {};
    publicadas.forEach(f => { const v = String(f[i] || '').trim(); if (v) pub[v.slice(0, 70)] = (pub[v.slice(0, 70)] || 0) + 1; });
    console.log(`\n[${i}] ${nombre}\n  todos: ${JSON.stringify(cuenta)}\n  publicados: ${JSON.stringify(pub)}`);
  }
})();
