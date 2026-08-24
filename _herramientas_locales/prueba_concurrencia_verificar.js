/**
 * FASE 3: verifica el resultado de la prueba de concurrencia.
 * Revisa el Sheet y Drive (carpetas REG + PNG del cartel de ventanilla).
 *
 * Uso: node _herramientas_locales/prueba_concurrencia_verificar.js
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const MARCA = 'PRUEBA-ID2';

async function run() {
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${HOJA}'!A1:ZZ`,
  });
  const rows = res.data.values;
  const headers = rows[0].map(h => (h || '').toString().trim());
  const col = n => headers.indexOf(n);

  const iCDR = col('CODIGO DE REGISTRO');
  const iID = col('ID DE REGISTRO');
  const iEstado = col('ESTADO DEL INMUEBLE');
  const iDetalle = col('DETALLES DEL ESTADO DEL INMUEBLE');
  const iDir = col('Ingrese la Dirección del inmueble');
  const iNeg = col('TIPO DE NEGOCIO');

  const encontradas = [];
  for (let i = 1; i < rows.length; i++) {
    const dir = (rows[i][iDir] || '').toString();
    if (dir.indexOf(MARCA) !== -1) {
      encontradas.push({
        fila: i + 1,
        cdr: (rows[i][iCDR] || '').toString(),
        id: (rows[i][iID] || '').toString(),
        estado: (rows[i][iEstado] || '').toString(),
        detalle: (rows[i][iDetalle] || '').toString().slice(0, 90),
        dir,
        negocio: (rows[i][iNeg] || '').toString()
      });
    }
  }

  console.log(`=== FILAS DE PRUEBA ENCONTRADAS: ${encontradas.length} (esperadas 3) ===\n`);
  encontradas.forEach(f => {
    console.log(`Fila ${f.fila} | ${f.negocio}`);
    console.log(`   CDR:    ${f.cdr || '(SIN CDR!)'}`);
    console.log(`   ID:     ${f.id || '(SIN ID!)'}`);
    console.log(`   Estado: ${f.estado}`);
    if (f.detalle) console.log(`   Detalle:${f.detalle}`);
    console.log('');
  });

  // --- Chequeos de integridad -------------------------------------------
  let fallos = 0;
  const chk = (n, c, d) => { console.log(`${c ? '  ✅' : '  ❌'} ${n}${c ? '' : ' -> ' + d}`); if (!c) fallos++; };

  console.log('=== INTEGRIDAD ===');
  chk('Se crearon exactamente 3 filas', encontradas.length === 3, `hay ${encontradas.length}`);

  const cdrs = encontradas.map(f => f.cdr).filter(Boolean);
  chk('Las 3 tienen CDR', cdrs.length === encontradas.length, `solo ${cdrs.length} con CDR`);
  chk('Los CDR son distintos entre sí', new Set(cdrs).size === cdrs.length, JSON.stringify(cdrs));

  const ids = encontradas.map(f => f.id).filter(Boolean);
  chk('Las 3 tienen ID DE REGISTRO', ids.length === encontradas.length, `solo ${ids.length} con ID`);
  chk('Los ID son distintos entre sí', new Set(ids).size === ids.length, JSON.stringify(ids));

  const enError = encontradas.filter(f => f.estado === 'ERROR');
  chk('Ninguna quedó en ERROR', enError.length === 0, JSON.stringify(enError.map(e => e.cdr + ': ' + e.detalle)));

  const pendientes = encontradas.filter(f => f.estado === 'REGISTRANDO');
  if (pendientes.length > 0) {
    console.log(`\n  ⏳ ${pendientes.length} todavía en REGISTRANDO (el pipeline sigue corriendo).`);
  }

  // --- Drive: carpetas REG y cartel de ventanilla ------------------------
  console.log('\n=== DRIVE: CARPETA Y CARTEL POR CDR ===');
  for (const f of encontradas) {
    if (!f.cdr) continue;
    const q = `name = '${f.cdr.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const r = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 5 });
    const carpetas = r.data.files || [];
    if (carpetas.length === 0) {
      console.log(`  ❌ ${f.cdr}\n       carpeta REG no encontrada todavía`);
      fallos++;
      continue;
    }
    const regId = carpetas[0].id;

    // Bajar: ARCHIVOS DEL INMUEBLE / CONTENIDO DE PUBLICACIÓN / CARTEL DE VENTANILLA
    let actual = regId, rutaOk = true;
    for (const nombre of ['ARCHIVOS DEL INMUEBLE', 'CONTENIDO DE PUBLICACIÓN', 'CARTEL DE VENTANILLA']) {
      const rr = await drive.files.list({
        q: `'${actual}' in parents and name = '${nombre}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id,name)', pageSize: 2
      });
      if (!rr.data.files || rr.data.files.length === 0) {
        console.log(`  ⚠️  ${f.cdr}\n       falta la subcarpeta "${nombre}"`);
        rutaOk = false; fallos++; break;
      }
      actual = rr.data.files[0].id;
    }
    if (!rutaOk) continue;

    const png = await drive.files.list({
      q: `'${actual}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,size)', pageSize: 10
    });
    const archivos = png.data.files || [];
    if (archivos.length === 0) {
      console.log(`  ⏳ ${f.cdr}\n       carpeta CARTEL DE VENTANILLA vacía (aún no generado)`);
      fallos++;
    } else {
      archivos.forEach(a => {
        console.log(`  ✅ ${f.cdr}\n       ${a.name}  (${a.mimeType}, ${a.size || '?'} bytes)`);
        console.log(`       https://drive.google.com/file/d/${a.id}/view`);
      });
    }
  }

  console.log('\n' + (fallos === 0
    ? '✅ TODO CORRECTO'
    : `⚠️  ${fallos} punto(s) pendientes o con problema (puede ser que el pipeline aún no termine).`));
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
