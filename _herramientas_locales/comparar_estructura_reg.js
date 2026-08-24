/**
 * Compara la estructura de una carpeta REG recién creada contra PLANTILLA #2
 * (la maestra), para saber si la copia quedó completa o si falta algo.
 *
 * Uso: node _herramientas_locales/comparar_estructura_reg.js "<nombre o parte del CDR>"
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });

const PLANTILLA_MAESTRA = '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH';
const filtro = process.argv[2] || 'PRUEBA-ID2';

async function arbol(drive, id, prof = 0, max = 4) {
  if (prof > max) return [];
  const r = await drive.files.list({
    q: `'${id}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType)', pageSize: 200, orderBy: 'name'
  });
  const out = [];
  for (const f of (r.data.files || [])) {
    const esCarpeta = f.mimeType === 'application/vnd.google-apps.folder';
    out.push({ nombre: f.name, carpeta: esCarpeta, prof });
    if (esCarpeta) out.push(...await arbol(drive, f.id, prof + 1, max));
  }
  return out;
}

(async () => {
  const drive = google.drive({ version: 'v3', auth });

  // --- Estructura de referencia: PLANTILLA #2 dentro de la maestra ---
  const nav = async (padre, nombre) => {
    const r = await drive.files.list({
      q: `'${padre}' in parents and name = '${nombre}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)', pageSize: 1
    });
    if (!r.data.files || !r.data.files.length) throw new Error('No se encontró ' + nombre);
    return r.data.files[0].id;
  };
  let ref = await nav(PLANTILLA_MAESTRA, 'INMUEBLES');
  ref = await nav(ref, 'ARRIENDO');
  ref = await nav(ref, 'PLANTILLA #2');

  const refArbol = await arbol(drive, ref);
  console.log(`=== PLANTILLA #2 (referencia): ${refArbol.length} elementos ===\n`);

  // --- Carpetas REG que coincidan con el filtro ---
  const r = await drive.files.list({
    q: `name contains '${filtro}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id,name)', pageSize: 20, orderBy: 'name'
  });
  const regs = (r.data.files || []).filter(f => f.name.startsWith('REG_'));

  if (!regs.length) { console.log(`No se encontraron carpetas REG con "${filtro}".`); return; }

  const refNombres = refArbol.map(x => x.prof + '|' + x.nombre).sort();

  for (const reg of regs) {
    const a = await arbol(drive, reg.id);
    const nombres = a.map(x => x.prof + '|' + x.nombre).sort();
    const faltan = refNombres.filter(n => !nombres.includes(n));
    const sobran = nombres.filter(n => !refNombres.includes(n));

    const ok = faltan.length === 0;
    console.log(`${ok ? '✅' : '❌'} ${reg.name}`);
    console.log(`     ${a.length} elementos (referencia: ${refArbol.length})`);
    if (faltan.length) {
      console.log(`     FALTAN ${faltan.length}:`);
      faltan.slice(0, 12).forEach(f => console.log('        - ' + f.split('|')[1]));
      if (faltan.length > 12) console.log(`        ... y ${faltan.length - 12} más`);
    }
    if (sobran.length) {
      console.log(`     extras ${sobran.length} (esperable: cartel, contratos):`);
      sobran.slice(0, 6).forEach(f => console.log('        + ' + f.split('|')[1]));
    }
    console.log('');
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
