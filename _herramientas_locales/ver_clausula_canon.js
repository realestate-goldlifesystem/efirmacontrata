// Muestra, en las plantillas del contrato (BORRADOR y ORIGINAL), el párrafo de la
// cláusula del precio. Con --corregir cambia el título "PRECIO DEL ARRENDAMIENTO"
// por "PRECIO DEL CANON" (lo que la cuenta de cobro necesita para leer el canon).
//
// Uso: node ver_clausula_canon.js            (solo mira)
//      node ver_clausula_canon.js --corregir
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/documents'] });
const docs = google.docs({ version: 'v1', auth });
const fuente = fs.readFileSync(path.join(__dirname, '../backend/GESTOR_CONTRATOS.js'), 'utf8');
const PLANTILLAS = {
  BORRADOR: (fuente.match(/PLANTILLA_CORRETAJE_BORRADOR_ID:\s*'([^']+)'/) || [])[1],
  ORIGINAL: (fuente.match(/PLANTILLA_CORRETAJE_ID:\s*'([^']+)'/) || [])[1]
};
const VIEJO = 'PRECIO DEL ARRENDAMIENTO', NUEVO = 'PRECIO DEL CANON';

(async () => {
  for (const [nombre, id] of Object.entries(PLANTILLAS)) {
    let d;
    try { d = (await docs.documents.get({ documentId: id })).data; }
    catch (e) { console.log(`
=== ${nombre}: no se pudo abrir (${e.message}). El código no la usa: el original sale del borrador aprobado.`); continue; }
    const parrafos = (d.body.content || []).filter(e => e.paragraph).map(e => (e.paragraph.elements || []).map(x => (x.textRun || {}).content || '').join(''));
    const hallados = parrafos.filter(p => /PRECIO DEL (ARRENDAMIENTO|CANON)|PRECIO-DEL-CANON|PRECIO-DE-ADMIN|ADMINISTRACI[OÓ]N\}\}/i.test(p));
    console.log(`\n=== ${nombre}: "${d.title}"`);
    hallados.forEach(p => console.log('  · ' + p.trim().slice(0, 330)));
    const veces = parrafos.join('\n').split(VIEJO).length - 1;
    console.log(`  "${VIEJO}" aparece ${veces} vez/veces`);
    if (process.argv.includes('--corregir') && veces > 0) {
      const r = await docs.documents.batchUpdate({ documentId: id, requestBody: { requests: [{ replaceAllText: { containsText: { text: VIEJO, matchCase: true }, replaceText: NUEVO } }] } });
      console.log('  → cambiado en ' + (r.data.replies[0].replaceAllText.occurrencesChanged || 0) + ' sitio(s)');
    }
  }
})().catch(e => { console.error(e.message); process.exit(1); });
