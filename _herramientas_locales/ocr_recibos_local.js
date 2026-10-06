// Lee con Vision, página por página, los recibos de servicios que cargó el
// propietario de un registro, y guarda el texto FUERA del repo (trae datos del
// cliente: el repo es público). Sirve para ajustar backend/OCR_RECIBOS.js.
//
// Uso: node ocr_recibos_local.js SK142795 <carpeta de salida>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/cloud-vision'] });
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const id = String(process.argv[2] || '').trim().toUpperCase();
const salida = process.argv[3];
if (!id || !salida) { console.error('Uso: node ocr_recibos_local.js <ID> <carpeta de salida>'); process.exit(1); }

async function buscar(carpeta, nivel) {
  const r = await drive.files.list({ q: `'${carpeta}' in parents and trashed = false`, fields: 'files(id,name,mimeType,size,createdTime,md5Checksum)', pageSize: 200, supportsAllDrives: true, includeItemsFromAllDrives: true });
  let h = [];
  for (const f of r.data.files) {
    if (f.mimeType === 'application/vnd.google-apps.folder') { if (nivel < 4) h = h.concat(await buscar(f.id, nivel + 1)); }
    else if (/FACTURA/i.test(f.name) && /pdf|image/.test(f.mimeType)) h.push(f);
  }
  return h;
}

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ`, valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const c = (n) => h.map(x => String(x).trim()).indexOf(n);
  const f = filas.find(x => String(x[c('ID DE REGISTRO')] || '').trim().toUpperCase() === id);
  if (!f) throw new Error('No está en la hoja: ' + id);
  // Las facturas quedan como FACTURA_AGUA_[<código de registro>] en COMPROBANTES DE SERVICIOS PÚBLICOS
  const cdr = String(f[c("CODIGO DE REGISTRO")] || "").trim();
  const q = `name contains 'FACTURA_' and name contains '${cdr.replace(/'/g, "\'")}' and trashed = false`;
  const recibos = ((await drive.files.list({ q, fields: "files(id,name,mimeType,size,createdTime,md5Checksum)", pageSize: 50, supportsAllDrives: true, includeItemsFromAllDrives: true })).data.files || []).filter(x => /pdf|image/.test(x.mimeType));
  if (!recibos.length) throw new Error('No hay recibos en la carpeta.');
  const token = await auth.getAccessToken();
  const yaLeidos = {};
  for (const rec of recibos) {
    const tipo = (rec.name.match(/FACTURA[\s_]+([A-Z]+)/i) || [, '?'])[1].toUpperCase();
    console.log(`${tipo.padEnd(10)} ${(rec.size / 1024).toFixed(0).padStart(6)} KB  md5 ${String(rec.md5Checksum).slice(0, 8)}  ${rec.mimeType}`);
    if (yaLeidos[rec.md5Checksum]) { console.log('   (mismo archivo que ' + yaLeidos[rec.md5Checksum] + ')'); continue; }
    yaLeidos[rec.md5Checksum] = tipo;
    const bin = Buffer.from((await drive.files.get({ fileId: rec.id, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })).data);
    let texto = '';
    if (rec.mimeType === 'application/pdf') {
      const res = await fetch('https://vision.googleapis.com/v1/files:annotate', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ inputConfig: { content: bin.toString('base64'), mimeType: 'application/pdf' }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], pages: [1, 2, 3, 4, 5] }] }) });
      const lote = ((await res.json()).responses || [])[0] || {};
      if (lote.error) throw new Error(JSON.stringify(lote.error));
      console.log('   páginas: ' + (lote.totalPages || (lote.responses || []).length));
      (lote.responses || []).forEach((p, i) => { texto += `\n=====PAGINA ${i + 1}=====\n` + ((p.fullTextAnnotation || {}).text || ''); });
    } else {
      const res = await fetch('https://vision.googleapis.com/v1/images:annotate', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ image: { content: bin.toString('base64') }, features: [{ type: 'TEXT_DETECTION' }], imageContext: { languageHints: ['es'] } }] }) });
      texto = '\n=====PAGINA 1=====\n' + ((((await res.json()).responses || [])[0] || {}).fullTextAnnotation || {}).text;
    }
    const destino = path.join(salida, `recibos_${id}_${tipo}.txt`);
    fs.writeFileSync(destino, texto);
    console.log(`   ${texto.length} caracteres → ${destino}`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
