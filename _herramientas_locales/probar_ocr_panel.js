// Corre en PRODUCCIÓN el mismo análisis que hace el botón "Analizar certificado con
// OCR" del panel, sobre el certificado que cargó el propietario de un registro, y
// muestra lo que el panel pintaría. No imprime nombres ni cédulas (solo cuántos).
//
// Uso: node probar_ocr_panel.js SK142795 [ruta del texto de ocr_clt_local.js]
//   Con la ruta, coteja contra el PRIMER titular del folio; sin ella, contra nadie.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const API = (fs.readFileSync(path.join(__dirname, '../frontend/config.js'), 'utf8').match(/API_URL:\s*'([^']+)'/) || [])[1];
const id = String(process.argv[2] || '').trim().toUpperCase();

async function buscar(carpeta, nivel) {
  const r = await drive.files.list({ q: `'${carpeta}' in parents and trashed = false`, fields: 'files(id,name,mimeType,createdTime)', pageSize: 200, supportsAllDrives: true, includeItemsFromAllDrives: true });
  let h = [];
  for (const f of r.data.files) {
    if (f.mimeType === 'application/vnd.google-apps.folder') { if (nivel < 4) h = h.concat(await buscar(f.id, nivel + 1)); }
    else if (/CERT.*TRADICI|TRADICI.N|LIBERTAD/i.test(f.name)) h.push(f);
  }
  return h;
}

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ`, valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const c = (n) => h.map(x => String(x).trim()).indexOf(n);
  const f = filas.find(x => String(x[c('ID DE REGISTRO')] || '').trim().toUpperCase() === id);
  if (!f) throw new Error('No está en la hoja: ' + id);
  const carpeta = (String(f[c('LINK DE CARPETA REG')] || '').match(/folders\/([\w-]+)/) || [])[1];
  const cert = (await buscar(carpeta, 0)).sort((a, b) => b.createdTime.localeCompare(a.createdTime))[0];
  if (!cert) throw new Error('No hay certificado en la carpeta.');

  let persona = { documento: '0', nombre: 'NADIE' };
  if (process.argv[3]) {
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/OCR_FOLIO.js'), 'utf8'), ctx);
    const t = ctx.folioAnalizar(fs.readFileSync(process.argv[3], 'utf8')).titulares;
    persona = { documento: t.cedulas[0], nombre: t.nombres[0].split(' ').reverse().join(' ') };
  }

  const t0 = Date.now();
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'analizarCertificadoDesdePanel', fileId: cert.id, datosPropietario: persona }) });
  const crudo = await res.text();
  let j; try { j = JSON.parse(crudo); } catch (e) { throw new Error("HTTP " + res.status + " sin JSON: " + crudo.replace(/<[^>]+>/g, " ").replace(/s+/g, " ").slice(0, 300)); }
  console.log(`respuesta en ${((Date.now() - t0) / 1000).toFixed(1)} s | success: ${j.success}${j.message ? ' | ' + j.message : ''}`);
  const d = j.datos || {};
  console.log({
    matricula: d.matricula, direccion: d.direccion, vigente: d.vigente, diasExpedido: d.diasExpedido,
    lecturaPorAnotaciones: d.lecturaPorAnotaciones, anotacionesLeidas: d.anotacionesLeidas, anotacionTitulares: d.anotacionTitulares,
    titulares: (d.titulares || []).length, cedulaMatch: d.cedulaMatch, nombreMatch: d.nombreMatch, otrosTitulares: (d.otrosTitulares || []).length,
    cedulaEnAnotacion: d.cedulaEnAnotacion, propietarioDetectadoLargo: String(d.propietarioDetectado || '').length,
    tieneEmbargo: d.tieneEmbargo, alertasEmbargo: d.alertasEmbargo, hipotecas: d.hipotecas, limitaciones: d.limitaciones
  });
})().catch(e => { console.error(e.message); process.exit(1); });
