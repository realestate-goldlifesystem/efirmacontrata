// Resumen de la pestaña "1.1 - INMUEBLES REGISTRADOS" sin datos personales:
// encabezados (con su letra) y conteo de valores de las columnas de estado/categoría.
// Uso: node _herramientas_locales/resumen_inmuebles_registrados.js
const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
// Solo columnas de categoría (nunca nombres, cédulas, correos ni teléfonos)
const CATEGORIAS = /ESTADO|TIPO|NEGOCIO|LOCALIDAD|CIUDAD|ESTRATO|HABITACION|MODALIDAD|SERVICIO|SITUACI|VITRINA|PUBLICAD|ETAPA/i;
const SENSIBLE = /NOMBRE|CEDULA|CÉDULA|CORREO|EMAIL|CELULAR|TEL|DIRECCI|DOCUMENTO|CUENTA|BANCO|NIT|FIRMA|LINK|URL|TOKEN/i;

const letra = (n) => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json'), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `'${HOJA}'` });
  const filas = r.data.values || [];
  const enc = (filas[0] || []).map(x => String(x).trim());
  const datos = filas.slice(1).filter(f => f.some(c => String(c).trim()));
  console.log('Filas con datos:', datos.length, '· Columnas:', enc.length);
  console.log('\n== ENCABEZADOS ==');
  enc.forEach((h, i) => { const llenas = datos.filter(f => String(f[i] || '').trim()).length; console.log(letra(i).padEnd(3), String(i + 1).padStart(3), h, `(${llenas} llenas)`); });
  console.log('\n== CONTEOS DE CATEGORÍAS ==');
  enc.forEach((h, i) => {
    if (!CATEGORIAS.test(h) || SENSIBLE.test(h)) return;
    const c = {};
    datos.forEach(f => { const v = String(f[i] || '').trim() || '(vacío)'; c[v] = (c[v] || 0) + 1; });
    const top = Object.entries(c).sort((a, b) => b[1] - a[1]);
    if (top.length > 25) return; // texto libre, no es categoría
    console.log(`\n[${letra(i)}] ${h}:`, top.map(([v, n]) => `${v.slice(0, 40)}=${n}`).join(' · '));
  });
})().catch(e => { console.error(e.message); process.exit(1); });
