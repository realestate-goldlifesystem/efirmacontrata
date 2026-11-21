// Cuenta inmuebles con link de YouTube y sin CHECK YT (video aún privado), por estado. Sin datos personales.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
  const [enc, ...filas] = r.data.values;
  const k = (n) => enc.findIndex(h => String(h).trim().toUpperCase() === n);
  const cV = k('LINK DEL VIDEO DEL INMUEBLE'), cY = k('CHECK YT'), cE = k('ESTADO DEL INMUEBLE');
  const porEstado = {}; let conVideo = 0, validados = 0;
  filas.forEach(f => {
    if (!String(f[cV] || '').includes('youtu')) return;
    conVideo++;
    if (String(f[cY] || '').toUpperCase() === 'TRUE') { validados++; return; }
    const e = String(f[cE] || '').trim(); porEstado[e] = (porEstado[e] || 0) + 1;
  });
  console.log(JSON.stringify({ conVideo, validados, porValidarPorEstado: porEstado }));
})().catch(e => console.error(e.message));
