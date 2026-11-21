// Cuenta inmuebles firmados sin CHECK MULTIMEDIA y cuántos tienen el link "CARGAR CONTENIDO" (sin datos personales).
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ", valueRenderOption: 'FORMULA' });
  const [enc, ...filas] = r.data.values;
  const k = (n) => enc.findIndex(h => String(h).trim().toUpperCase() === n);
  const cF = k('DOCUMENTO FIRMADO'), cM = k('CHECK MULTIMEDIA'), cC = k('CARGAR CONTENIDO'), cE = k('ESTADO DEL INMUEBLE'), cY = k('CHECK YT');
  console.log('columnas', { cF, cM, cC, cE, cY });
  const c = { firmados: 0, firmadosSinMultimedia: 0, conLinkCargar: 0, linkSinMultimedia: 0, valoresCheck: {} , estadosPendientes: {} };
  filas.forEach(f => {
    const firm = /FIRMADO/i.test(String(f[cF] || '')), mm = String(f[cM] || '').trim(), link = /carga_multimedia/.test(String(f[cC] || ''));
    c.valoresCheck[mm || '(vacío)'] = (c.valoresCheck[mm || '(vacío)'] || 0) + 1;
    if (firm) c.firmados++;
    const sinMm = !mm || /^(no|false|0)$/i.test(mm);
    if (firm && sinMm) { c.firmadosSinMultimedia++; const e = String(f[cE] || '').trim(); c.estadosPendientes[e] = (c.estadosPendientes[e] || 0) + 1; }
    if (link) { c.conLinkCargar++; if (sinMm) c.linkSinMultimedia++; }
  });
  console.log(JSON.stringify(c, null, 1));
})().catch(e => console.error(e.message));
