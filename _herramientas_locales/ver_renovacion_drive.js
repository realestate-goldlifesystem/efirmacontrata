/**
 * Revisa qué pasó en Drive con una renovación TIPO_2:
 *  - ¿El REG original ganó una carpeta de año nuevo dentro de ENTREGAS DEL INMUEBLE?
 *  - ¿Quedó una carpeta REG temporal huérfana del registro de renovación?
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });

const hijos = async (drive, id, soloCarpetas) => {
  const q = `'${id}' in parents and trashed = false` +
            (soloCarpetas ? " and mimeType = 'application/vnd.google-apps.folder'" : '');
  const r = await drive.files.list({ q, fields: 'files(id,name,mimeType)', pageSize: 100, orderBy: 'name' });
  return r.data.files || [];
};

(async () => {
  const drive = google.drive({ version: 'v3', auth });

  // Todas las carpetas REG de la prueba
  const r = await drive.files.list({
    q: `name contains 'PRUEBA-ID' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id,name)', pageSize: 50, orderBy: 'name'
  });
  const regs = (r.data.files || []).filter(f => f.name.startsWith('REG_'));

  console.log(`=== CARPETAS REG DE PRUEBA: ${regs.length} ===\n`);

  for (const reg of regs) {
    const esRenovado = reg.name.includes('#99-1 PRUEBA-ID2');
    const esTemporal = reg.name.includes('C53');
    const marca = esTemporal ? '⚠️ TEMPORAL' : (esRenovado ? '⭐ RENOVADO' : '');
    console.log(`${reg.name}  ${marca}`);

    const archivos = await hijos(drive, reg.id, true);
    const entregas = archivos.find(f => f.name === 'ENTREGAS DEL INMUEBLE');
    if (!entregas) { console.log('     (sin ENTREGAS DEL INMUEBLE)\n'); continue; }

    const anios = await hijos(drive, entregas.id, true);
    console.log(`     ENTREGAS DEL INMUEBLE → ${anios.map(a => a.name).join(', ') || '(vacía)'}`);

    // Contenido del año más reciente
    if (anios.length) {
      const ultimo = anios[anios.length - 1];
      const dentro = await hijos(drive, ultimo.id, false);
      console.log(`     └─ "${ultimo.name}" contiene ${dentro.length} elemento(s)`);
    }
    console.log('');
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
