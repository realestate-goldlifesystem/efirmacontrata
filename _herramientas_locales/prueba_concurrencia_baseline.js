/**
 * FASE 1 de la prueba de concurrencia: fotografía del estado ANTES.
 * Guarda todo en prueba_concurrencia_estado.json para poder revertir después.
 *
 * Uso: node _herramientas_locales/prueba_concurrencia_baseline.js
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

async function run() {
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${HOJA}'!A1:ZZ`,
  });
  const rows = res.data.values;
  const headers = rows[0].map(h => (h || '').toString().trim());
  const iCDR = headers.indexOf('CODIGO DE REGISTRO');
  const iID = headers.indexOf('ID DE REGISTRO');

  // Máxima secuencia por tipo, tal como la calcula calcularSecuencia()
  const seqs = {};
  for (let i = 1; i < rows.length; i++) {
    const cdr = (rows[i][iCDR] || '').toString();
    const m = cdr.match(/REG_\d{2}-\d{2}-\d{4}-([ACV]{1,2}|VR)(\d+)/);
    if (m) {
      const n = parseInt(m[2], 10);
      if (!isNaN(n) && n > (seqs[m[1]] || 0)) seqs[m[1]] = n;
    }
  }

  const estado = {
    capturadoEn: new Date().toISOString(),
    totalFilas: rows.length,            // incluye encabezado
    ultimaFilaConDatos: rows.length,
    maxSecuenciaPorTipo: seqs,
    ultimosCDR: rows.slice(-3).map(r => (r[iCDR] || '')),
    ultimosID: rows.slice(-3).map(r => (r[iID] || ''))
  };

  const out = path.join(__dirname, 'prueba_concurrencia_estado.json');
  fs.writeFileSync(out, JSON.stringify(estado, null, 2), 'utf8');

  console.log('=== ESTADO ANTES DE LA PRUEBA ===');
  console.log('Filas totales (con encabezado):', estado.totalFilas);
  console.log('Secuencia máxima por tipo:', JSON.stringify(seqs));
  console.log('Últimos 3 CDR:');
  estado.ultimosCDR.forEach(c => console.log('   ', c || '(vacío)'));
  console.log('\nGuardado en:', out);
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
