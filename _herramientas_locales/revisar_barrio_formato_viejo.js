// Los inmuebles registrados con el formulario viejo tienen el barrio en las columnas
// "Selecciona el barrio de <UPZ> de tu inmueble"; el formulario nuevo usa solo
// "Escriba el barrio del inmueble" (de ahí sale el BARRIO del acta). Si quedan las
// dos, la descripción lo repite ("CEDRITOSCEDRITOS").
// Pasa el barrio a "Escriba el barrio del inmueble" y vacía las columnas viejas.
// Uso: node revisar_barrio_formato_viejo.js [--aplicar]
// Con --aplicar guarda un respaldo en respaldo_barrios_<fecha>.json (scratchpad).
const fs = require('fs');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = "'1.1 - INMUEBLES REGISTRADOS'";
const letra = (n) => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const norm = (v) => String(v || '').trim();

(async () => {
  const aplicar = process.argv.includes('--aplicar');
  const s = google.sheets({ version: 'v4', auth });
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: HOJA + '!A1:ZZ' });
  const [h, ...filas] = r.data.values;
  const cEscriba = h.indexOf('Escriba el barrio del inmueble');
  const cId = h.indexOf('ID DE REGISTRO');
  const viejas = h.map((k, i) => [k, i]).filter(([k]) => /^Selecciona el barrio de/i.test(k.trim())).map(([, i]) => i);
  console.log('Columnas viejas:', viejas.map(i => h[i]).join(' | '));

  const cambios = [], respaldo = [];
  filas.forEach((f, i) => {
    const conValor = viejas.filter(c => norm(f[c]));
    if (!conValor.length) return;
    const fila = i + 2, actual = norm(f[cEscriba]);
    const valores = [...new Set(conValor.map(c => norm(f[c])))];
    const barrio = actual || valores[0];
    const aviso = (actual && valores.some(v => v.toUpperCase() !== actual.toUpperCase())) || valores.length > 1 ? '  ⚠️ NO COINCIDEN' : '';
    console.log(`fila ${fila} ${f[cId] || ''}: escriba="${actual}" viejas=${JSON.stringify(valores)} → "${barrio}"${aviso}`);
    // --viejo-gana: cuando no coinciden, "Escriba" trae el CEDRITOS por defecto del
    // formulario (renovaciones antes del 16-oct-2026) y el valor real es el viejo.
    const viejoGana = process.argv.includes("--viejo-gana") && valores.length === 1;
    if (aviso && !viejoGana) return; // estos se revisan a mano
    respaldo.push({ fila, id: f[cId], escriba: actual, viejas: Object.fromEntries(conValor.map(c => [h[c], f[c]])) });
    if (!actual || (aviso && viejoGana)) cambios.push({ range: `${HOJA}!${letra(cEscriba)}${fila}`, values: [[aviso && viejoGana ? valores[0] : barrio]] });
    conValor.forEach(c => cambios.push({ range: `${HOJA}!${letra(c)}${fila}`, values: [['']] }));
  });
  console.log(`\n${respaldo.length} inmuebles a ajustar, ${cambios.length} celdas.`);
  if (!aplicar || !cambios.length) return;
  const salida = process.env.SALIDA || '.';
  fs.writeFileSync(`${salida}/respaldo_barrios_${Date.now()}.json`, JSON.stringify(respaldo, null, 1));
  await s.spreadsheets.values.batchUpdate({ spreadsheetId: SHEET, requestBody: { valueInputOption: 'RAW', data: cambios } });
  console.log('aplicado');
})();
