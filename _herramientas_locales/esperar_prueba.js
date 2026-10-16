// Espera a que la cola termine con el inmueble de prueba: una sola fila con "PRUEBA SISTEMA"
// y sin trabajo pendiente. Muestra cómo quedó. Uso: node esperar_prueba.js <ID original>
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const s = google.sheets({ version: 'v4', auth });
(async () => {
  for (let k = 0; k < 40; k++) {
    const r = await s.spreadsheets.values.get({ spreadsheetId: '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
    const [h, ...f] = r.data.values;
    const filas = f.filter(z => z.join('|').includes('PRUEBA SISTEMA'));
    const est = filas.map(z => z[h.indexOf('ID DE REGISTRO')] + ':' + z[h.indexOf('ESTADO DEL INMUEBLE')]).join(' , ');
    console.log(new Date().toTimeString().slice(0, 8), filas.length, 'fila(s) |', est);
    if (filas.length === 1 && !/REGISTRANDO|COLA/.test(est)) return;
    await new Promise(r => setTimeout(r, 20000));
  }
})();
