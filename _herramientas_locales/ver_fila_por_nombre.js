// Muestra las filas que contienen un texto (p. ej. nombre del propietario), con todas
// sus columnas; las vacías van marcadas con "--".
// Uso: node ver_fila_por_nombre.js <texto>
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
(async () => {
  const s = google.sheets({ version: 'v4', auth });
  const r = await s.spreadsheets.values.get({ spreadsheetId: '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
  const [h, ...f] = r.data.values; const q = process.argv[2].toLowerCase();
  f.forEach((row, i) => {
    if (!row.join('|').toLowerCase().includes(q)) return;
    console.log('=== fila', i + 2);
    h.forEach((k, j) => console.log(String(j).padStart(3), (row[j] ? '   ' : '-- ') + k.slice(0, 70), '|', String(row[j] || '').slice(0, 90)));
  });
})();
