/**
 * Borra los registros de prueba QA del Sheet y manda sus carpetas a la papelera.
 *
 * ⚠️ ORDEN OBLIGATORIO: antes de correr esto con --borrar, ejecutar limpiarColaQA()
 * desde el editor de Apps Script. La cola guarda NÚMEROS DE FILA; si se borran filas
 * con trabajo encolado, las de abajo suben una posición y el worker procesa el
 * inmueble equivocado.
 *
 * Uso:
 *   node _herramientas_locales/limpiar_pruebas_qa.js            (simulación, no borra)
 *   node _herramientas_locales/limpiar_pruebas_qa.js --borrar   (borra de verdad)
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

// Criterio PRINCIPAL de identificación: el nombre del propietario de prueba.
// Es lo único que comparten TODOS los registros de QA — los lanzados por script
// llevan marca en la dirección, pero los hechos por el formulario real llevan una
// dirección normal de Google Maps (ej. "AC 100 #15-20") sin ninguna marca.
const PROPIETARIO_PRUEBA = 'PRUEBA QA BORRAR';

// Criterios secundarios, solo para reforzar. No se usan solos para decidir.
const MARCAS = ['PRUEBA-QA', 'PRUEBA-QA2', 'PRUEBA-QA3', 'PRUEBA-QA4',
                'PRUEBA-QA5', 'PRUEBA-QA6', 'PRUEBA-QA7', 'PRUEBA-QA8'];
const CEDULAS = ['999000111', '999000222', '999000333', '999000444', '999000555',
                 '999000666', '999000777', '999000888', '999000999'];
const BORRAR = process.argv.includes('--borrar');

async function run() {
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  // --- 1. Filas del Sheet -------------------------------------------------
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const hoja = meta.data.sheets.find(s => s.properties.title === HOJA);
  if (!hoja) throw new Error('No se encontró la hoja ' + HOJA);
  const sheetId = hoja.properties.sheetId;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${HOJA}'!A1:ZZ`
  });
  const rows = res.data.values;
  const headers = rows[0].map(h => (h || '').toString().trim());
  const iDir = headers.indexOf('Ingrese la Dirección del inmueble');
  const iCed = headers.indexOf('Número de documento');
  const iCDR = headers.indexOf('CODIGO DE REGISTRO');
  const iProp = headers.indexOf('NOMBRES Y APELLIDOS DEL PROPIETARIO');

  const objetivo = [];
  for (let i = 1; i < rows.length; i++) {
    const dir = (rows[i][iDir] || '').toString();
    const ced = (rows[i][iCed] || '').toString().trim();
    const prop = (rows[i][iProp] || '').toString().trim();
    if (prop === PROPIETARIO_PRUEBA || MARCAS.some(m => dir.includes(m)) || CEDULAS.includes(ced)) {
      objetivo.push({ fila: i + 1, dir, ced, prop, cdr: (rows[i][iCDR] || '').toString() });
    }
  }

  console.log(`=== FILAS DE PRUEBA: ${objetivo.length} ===`);
  objetivo.forEach(o => console.log(`  fila ${o.fila} | CC ${o.ced} | ${o.prop} | ${o.dir}\n      CDR: ${o.cdr}`));

  // Salvaguarda: nada se borra si no lleva el nombre del propietario de prueba.
  // Coincidir solo por cédula o por marca en la dirección NO basta: un dedazo en
  // la lista de cédulas alcanzaría para llevarse un registro real por delante.
  const sospechosa = objetivo.find(o => o.prop !== PROPIETARIO_PRUEBA);
  if (sospechosa) {
    console.error(`\n❌ ABORTADO: la fila ${sospechosa.fila} coincidió por cédula o dirección,`);
    console.error(`   pero su propietario es "${sospechosa.prop}", no "${PROPIETARIO_PRUEBA}".`);
    console.error(`   Revísala a mano antes de borrar nada.`);
    process.exit(1);
  }

  // --- 2. Carpetas RPR en Drive -------------------------------------------
  const carpetas = [];
  for (const ced of CEDULAS) {
    const r = await drive.files.list({
      q: `name contains 'CC ${ced}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id,name)', pageSize: 10
    });
    (r.data.files || []).forEach(f => carpetas.push(f));
  }

  console.log(`\n=== CARPETAS RPR A ENVIAR A PAPELERA: ${carpetas.length} ===`);
  carpetas.forEach(c => console.log(`  ${c.name}\n      ${c.id}`));

  // --- 3. Documentos sueltos de Autocrat ----------------------------------
  // generarDocumentoNativo() los crea en la raíz del Drive y solo después los mueve
  // al REG. Si el registro falló a medias, quedan huérfanos ahí.
  //
  // ⚠️ El operador `contains` de Drive es DIFUSO: tokeniza e ignora la puntuación,
  // así que buscar 'PRUEBA-QA' también devuelve 'PRUEBA QA'. Cómodo para encontrar,
  // peligroso para borrar. Por eso lo que llega se vuelve a filtrar en local contra
  // el nombre del propietario de prueba, que es literal e inequívoco.
  const docs = [];
  const vistos = new Set();
  for (const m of MARCAS) {
    const r = await drive.files.list({
      q: `name contains '${m}' and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
      fields: 'files(id,name)', pageSize: 30
    });
    (r.data.files || []).forEach(f => {
      if (vistos.has(f.id)) return;
      if (!f.name.includes(PROPIETARIO_PRUEBA)) {
        console.log(`  ⏭️  IGNORADO (no lleva "${PROPIETARIO_PRUEBA}"): ${f.name}`);
        return;
      }
      vistos.add(f.id);
      docs.push(f);
    });
  }
  console.log(`\n=== DOCUMENTOS SUELTOS: ${docs.length} ===`);
  docs.forEach(d => console.log(`  ${d.name}\n      ${d.id}`));

  if (!BORRAR) {
    console.log('\n🔎 MODO SIMULACIÓN — no se borró nada.');
    console.log('   Para ejecutar de verdad:');
    console.log('   1) correr limpiarColaQA() en el editor de Apps Script');
    console.log('   2) node _herramientas_locales/limpiar_pruebas_qa.js --borrar');
    return;
  }

  // --- EJECUCIÓN ----------------------------------------------------------
  //
  // Solo se borran FILAS. Las carpetas y documentos de Drive los tiene que mandar a
  // la papelera borrarDrivePruebasQA() desde el editor de Apps Script: la Service
  // Account no puede, porque esos archivos son del dueño del script y devuelve
  // "The user does not have sufficient permissions for this file".
  console.log('\n🗑️  BORRANDO FILAS DEL SHEET...');

  // Las filas se borran de MAYOR a MENOR: al revés, cada borrado correría las
  // siguientes y los índices calculados antes apuntarían a la fila equivocada.
  const filasDesc = objetivo.map(o => o.fila).sort((a, b) => b - a);
  const requests = filasDesc.map(f => ({
    deleteDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: f - 1, endIndex: f }
    }
  }));
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID, requestBody: { requests }
  });
  console.log(`  filas borradas: ${filasDesc.join(', ')}`);

  console.log('\n✅ Filas eliminadas del Sheet.');
  console.log('   Falta correr en el editor de Apps Script:');
  console.log('     1) borrarDrivePruebasQA()   -> carpetas y documentos a la papelera');
  console.log('     2) restaurarContadoresQA()  -> secuencias a C=46, V=12, VR=3 (opcional)');
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
