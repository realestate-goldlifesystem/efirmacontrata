// Muestra SOPORTES CONTABLES del registro de prueba ("PRUEBA QA BORRAR") y el
// estado de sus columnas de cobro. Sirve para comparar el antes y el después de
// subir el comprobante de pago (qué se guardó y qué moldes se retiraron).
//
// Uso: node ver_soportes_qa.js
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const PROPIETARIO_PRUEBA = 'PRUEBA QA BORRAR';

const hijos = async (id) => (await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'files(id,name,mimeType)', pageSize: 200, orderBy: 'name' })).data.files;

async function arbol(id, sangria, nivel) {
  for (const f of await hijos(id)) {
    const carpeta = f.mimeType.includes('folder');
    if (carpeta && nivel === 0) {
      // Las 12 carpetas MES se resumen en un renglón
      const dentro = await hijos(f.id);
      const meses = dentro.filter(x => /^MES #/.test(x.name)).length;
      console.log(`${sangria}📁 ${f.name}`);
      if (meses) console.log(`${sangria}     📁 (${meses} carpetas MES #…)`);
      for (const x of dentro.filter(x => !/^MES #/.test(x.name))) console.log(`${sangria}     ${x.mimeType.includes('folder') ? '📁' : '·'} ${x.name}`);
    } else {
      console.log(`${sangria}${carpeta ? '📁' : '·'} ${f.name}`);
    }
  }
}

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${HOJA}'!A1:ZZ`, valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const c = (n) => h.map(x => String(x).trim()).indexOf(n);
  const f = filas.find(x => String(x[c('NOMBRES Y APELLIDOS DEL PROPIETARIO')] || '').trim() === PROPIETARIO_PRUEBA);
  if (!f) { console.log('No hay registro de prueba en la hoja.'); return; }
  const v = (n) => String(f[c(n)] === undefined ? '' : f[c(n)]);

  console.log(`ID ${v('ID DE REGISTRO')} | ${v('TIPO DE NEGOCIO')}`);
  console.log(`DETALLES: ${v('DETALLES DEL ESTADO DEL INMUEBLE')}`);
  console.log(`RECIBO DE CORRETAJE: ${(v('RECIBO DE CORRETAJE').match(/"([^"]{1,6})"\)$/) || ['', v('RECIBO DE CORRETAJE') || '(vacío)'])[1]}`);
  const m = v('SOPORTES CONTABLES').match(/folders\/([\w-]+)/);
  if (!m) { console.log('La fila no tiene link de SOPORTES CONTABLES.'); return; }
  console.log('\nSOPORTES CONTABLES');
  await arbol(m[1], '  ', 0);
})().catch(e => { console.error(e.message); process.exit(1); });
