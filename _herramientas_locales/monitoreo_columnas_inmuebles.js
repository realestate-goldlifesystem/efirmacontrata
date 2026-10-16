// Monitoreo de columnas de "1.1 - INMUEBLES REGISTRADOS": para cada una dice si la
// usa el formulario del portafolio, el backend (Apps Script), las páginas del
// frontend o las plantillas de Autocrat, y cuántas filas tienen dato.
// Sirve para decidir una por una cuáles se pueden eliminar. No modifica nada.
// La búsqueda es por el nombre exacto del encabezado (recortado): si un código lo
// arma por partes no lo detecta, por eso "sin uso" es candidato, no sentencia.
// Uso: node monitoreo_columnas_inmuebles.js > salida.csv
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const RAIZ = path.join(__dirname, '..');

function leerCarpeta(dir, exts, excluir) {
  let txt = '';
  if (!fs.existsSync(dir)) return txt;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (excluir.some(x => p.includes(x))) continue;
    if (e.isDirectory()) txt += leerCarpeta(p, exts, excluir);
    else if (exts.includes(path.extname(e.name))) txt += fs.readFileSync(p, 'utf8') + '\n';
  }
  return txt;
}
const letra = (n) => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

(async () => {
  const s = google.sheets({ version: 'v4', auth });
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
  const [h, ...filas] = r.data.values;
  const a = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'DO NOT DELETE - AutoCrat Job Settings'!A1:Z" });
  const autocrat = new Set();
  a.data.values.slice(1).forEach(f => { try { JSON.parse(f[14] || '[]').forEach(t => autocrat.add(String(t.details.headerMap).trim())); } catch (e) {} });

  const formulario = leerCarpeta(path.join(RAIZ, 'Portafolio-formulario de registro actualizacion form 1.0', 'src'), ['.ts', '.tsx'], []);
  const backend = leerCarpeta(path.join(RAIZ, 'backend'), ['.js', '.html', '.gs'], ['TEMP_']);
  const frontend = leerCarpeta(path.join(RAIZ, 'frontend'), ['.html', '.js'], [path.join('frontend', 'portafolio')]);

  console.log('col;letra;encabezado;formulario;backend;frontend;autocrat;filas_con_dato;candidata');
  h.forEach((k, i) => {
    const t = String(k).trim();
    const esta = (txt) => t && txt.includes(t) ? 'SI' : '';
    const f = esta(formulario), b = esta(backend), w = esta(frontend), au = autocrat.has(t) ? 'SI' : '';
    const n = filas.filter(x => String(x[i] || '').trim()).length;
    const cand = !f && !b && !w && !au ? 'REVISAR' : '';
    console.log([i + 1, letra(i), '"' + t.replace(/"/g, "'") + '"', f, b, w, au, n, cand].join(';'));
  });
})();
