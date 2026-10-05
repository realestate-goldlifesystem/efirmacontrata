// Estado de los registros de prueba ("PRUEBA QA BORRAR") en la hoja.
// Sale con código 0 cuando TODOS terminaron el registro (tienen carpeta REG,
// SOPORTES CONTABLES y un estado que no es de "en proceso"); con 1 si falta.
// Sirve para esperar el segundo plano:  until node ver_estado_registro_qa.js; do sleep 30; done
//
// Uso: node ver_estado_registro_qa.js
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const PROPIETARIO_PRUEBA = 'PRUEBA QA BORRAR';

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${HOJA}'!A1:ZZ`, valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const c = (n) => h.map(x => String(x).trim()).indexOf(n);
  const pruebas = filas
    .map((f, i) => ({ f, fila: i + 2 }))
    .filter(x => String(x.f[c('NOMBRES Y APELLIDOS DEL PROPIETARIO')] || '').trim() === PROPIETARIO_PRUEBA);

  if (!pruebas.length) { console.log('No hay registros de prueba en la hoja.'); process.exit(1); }

  let listos = 0;
  for (const { f, fila } of pruebas) {
    const v = (n) => String(f[c(n)] === undefined ? '' : f[c(n)]).trim();
    const tieneReg = /folders\//.test(v('LINK DE CARPETA REG'));
    const tieneSoportes = /folders\//.test(v('SOPORTES CONTABLES'));
    const estado = v('ESTADO DEL INMUEBLE');
    const listo = tieneReg && tieneSoportes && !!estado && !/PROCES|COLA|REGISTRANDO/i.test(estado);
    if (listo) listos++;
    console.log(`${listo ? '✅' : '⏳'} fila ${fila} | ID ${v('ID DE REGISTRO') || '—'} | ${v('CODIGO DE REGISTRO') || '(sin CDR)'}`);
    console.log(`     estado: ${estado || '(vacío)'} | REG: ${tieneReg ? 'sí' : 'no'} | SOPORTES: ${tieneSoportes ? 'sí' : 'no'}`);
    console.log(`     detalle: ${v('DETALLES DEL ESTADO DEL INMUEBLE').slice(0, 120)}`);
  }
  process.exit(listos === pruebas.length ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(1); });
