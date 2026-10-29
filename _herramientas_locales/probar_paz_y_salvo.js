// Crea la plantilla del paz y salvo (si falta) y genera las dos versiones del inmueble de prueba; guarda los PDF
// en la carpeta indicada y los pasa a PNG con el poppler local. Requiere un case TEMP_pazYSalvo (se quitó el 28-oct-2026).
// Uso: node probar_paz_y_salvo.js <carpeta de salida>
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
const salida = process.argv[2];
(async () => {
  const r1 = await fetch(API, { method: 'POST', body: JSON.stringify({ accion: 'TEMP_pazYSalvo' }), redirect: 'manual' });
  const r = JSON.parse(await (await fetch(r1.headers.get('location'))).text());
  console.log('plantilla:', JSON.stringify(r.plantilla), '\nfirma del propietario guardada:', r.firmaPropietario);
  console.log('\n----- texto de la plantilla -----\n' + (r.textoPlantilla || r.error || '').trim());
  const poppler = path.join(__dirname, '..', 'poppler', 'poppler-24.08.0', 'Library', 'bin', 'pdftoppm.exe');
  for (const f of ['AGENTE', 'PROPIETARIO']) {
    if (!r[f] || r[f].error) { console.log('\n' + f + ':', r[f] && r[f].error); continue; }
    const pdf = path.join(salida, 'paz_y_salvo_' + f + '.pdf');
    fs.writeFileSync(pdf, Buffer.from(r[f].pdf, 'base64'));
    try { execFileSync(poppler, ['-png', '-r', '70', pdf, pdf.replace(/\.pdf$/, '')]); } catch (e) { console.log('poppler:', e.message); }
    console.log('\n' + f + ': ' + pdf);
  }
})();
