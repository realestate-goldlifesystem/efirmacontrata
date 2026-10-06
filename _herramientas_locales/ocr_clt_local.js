// Lee con Vision (igual que el servidor, pero TODAS las páginas) el certificado de
// libertad y tradición que cargó el propietario de un registro, y guarda el texto
// FUERA del repo (trae nombres y cédulas: el repo es público).
//
// Uso: node ocr_clt_local.js SK142795 [carpeta de salida]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/cloud-vision'] });
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const id = String(process.argv[2] || '').trim().toUpperCase();
const salida = process.argv[3] || os.tmpdir();
if (!id) { console.error('Falta el ID de registro.'); process.exit(1); }

async function buscar(carpeta, nivel) {
  const r = await drive.files.list({ q: `'${carpeta}' in parents and trashed = false`, fields: 'files(id,name,mimeType,size,createdTime)', pageSize: 200, supportsAllDrives: true, includeItemsFromAllDrives: true });
  let hallados = [];
  for (const f of r.data.files) {
    if (f.mimeType === 'application/vnd.google-apps.folder') { if (nivel < 4) hallados = hallados.concat(await buscar(f.id, nivel + 1)); }
    else if (/CERT.*TRADICI|TRADICI.N|LIBERTAD/i.test(f.name)) hallados.push(f);
  }
  return hallados;
}

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${HOJA}'!A1:ZZ`, valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const c = (n) => h.map(x => String(x).trim()).indexOf(n);
  const f = filas.find(x => String(x[c('ID DE REGISTRO')] || '').trim().toUpperCase() === id);
  if (!f) throw new Error('No está en la hoja: ' + id);
  const carpeta = (String(f[c('LINK DE CARPETA REG')] || '').match(/folders\/([\w-]+)/) || [])[1];
  if (!carpeta) throw new Error('El registro no tiene carpeta REG.');
  const certs = (await buscar(carpeta, 0)).sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  if (!certs.length) throw new Error('No hay certificado en la carpeta.');
  certs.forEach(x => console.log(`  ${x.id}  ${x.createdTime}  ${(x.size / 1024).toFixed(0)} KB  ${x.name}`));
  const cert = certs[0];
  const bin = Buffer.from((await drive.files.get({ fileId: cert.id, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })).data);
  const token = await auth.getAccessToken();
  let texto = '', paginas = 0;
  for (let desde = 1; desde <= 40; desde += 5) {      // Vision acepta 5 páginas por llamada
    const res = await fetch('https://vision.googleapis.com/v1/files:annotate', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ inputConfig: { content: bin.toString('base64'), mimeType: 'application/pdf' }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], pages: [0, 1, 2, 3, 4].map(k => desde + k) }] }) });
    const j = await res.json();
    const resp = (j.responses && j.responses[0]) || {};
    if (resp.error || j.error) { if (desde === 1) throw new Error(JSON.stringify(resp.error || j.error)); break; }
    const pags = resp.responses || [];
    pags.forEach(p => { texto += ((p.fullTextAnnotation || {}).text || '') + '\n'; });
    paginas += pags.length;
    if (pags.length < 5 || paginas >= (resp.totalPages || 0)) break;
  }
  const destino = path.join(salida, `clt_${id}.txt`);
  fs.writeFileSync(destino, texto);
  console.log(`${paginas} páginas, ${texto.length} caracteres → ${destino}`);
})().catch(e => { console.error(e.message); process.exit(1); });
