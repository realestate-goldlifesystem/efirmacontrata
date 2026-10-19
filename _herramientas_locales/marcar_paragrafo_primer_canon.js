// Plantillas de acta de Corretaje y Vendi-Renta: marca el PARÁGRAFO del cobro del
// primer canon (cláusula TERCERA) para que solo aparezca si el propietario lo
// autorizó, y completa el excedente con "del canon sin incluir la administración,
// más el valor de la administración" (decisiones D1 y D2 de PLAN_EXCEDENTE_PRIMER_CANON.md).
// El motor (MOTOR_AUTOCRAT_NATIVO.js, aplicarBloquesCondicionales_) borra el bloque
// entre <<SI COBRO PRIMER CANON>> y <<FIN SI COBRO PRIMER CANON>> si dijo No.
// Antes guarda cada plantilla en .docx en la carpeta de respaldo (fuera del repo).
// Uso: node marcar_paragrafo_primer_canon.js <carpeta respaldo> [--aplicar]
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.readonly'] });

const PLANTILLAS = {
  CORRETAJE: { id: '1b6aL71TyCNvgOVEh7krZNQIYJdbCA5Zx15BYD6FEnxE', inicio: 'PARÁGRAFO: en caso que EL AGENTE reciba el pago' },
  'VENDI-RENTA': { id: '1RJDKSlknlIa9cxyAVICDck3HfwLP6y9m5PvP2MbyZqM', inicio: 'PARÁGRAFO: Si el propietario decide que EL AGENTE reciba el pago' }
};
const FIN = '(<<PRECIO RESPO NUM>>). ';

(async () => {
  const [carpeta, ap] = process.argv.slice(2);
  const d = google.docs({ version: 'v1', auth }), dr = google.drive({ version: 'v3', auth });
  for (const [nombre, p] of Object.entries(PLANTILLAS)) {
    const texto = (await dr.files.export({ fileId: p.id, mimeType: 'text/plain' })).data;
    const ya = texto.includes('<<SI COBRO PRIMER CANON>>');
    const nInicio = texto.split(p.inicio).length - 1, nFin = texto.split(FIN).length - 1;
    console.log(nombre.padEnd(12), ya ? 'ya marcada' : `inicio:${nInicio} fin:${nFin}`);
    if (ya || ap !== '--aplicar') continue;
    if (nInicio !== 1 || nFin !== 1) { console.log('   NO COINCIDE: no se toca'); continue; }

    fs.mkdirSync(carpeta, { recursive: true });
    const docx = await dr.files.export({ fileId: p.id, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, { responseType: 'arraybuffer' });
    fs.writeFileSync(path.join(carpeta, `PLANTILLA ACTA ${nombre} (antes del parágrafo condicional) ${new Date().toISOString().slice(0, 10)}.docx`), Buffer.from(docx.data));

    const r = await d.documents.batchUpdate({ documentId: p.id, requestBody: { requests: [
      { replaceAllText: { containsText: { text: p.inicio, matchCase: true }, replaceText: '<<SI COBRO PRIMER CANON>>' + p.inicio } },
      { replaceAllText: { containsText: { text: FIN, matchCase: true }, replaceText: '(<<PRECIO RESPO NUM>>) del canon sin incluir la administración, más el valor de la administración.<<FIN SI COBRO PRIMER CANON>> ' } }
    ] } });
    console.log('   cambios:', r.data.replies.map(x => x.replaceAllText.occurrencesChanged || 0).join(', '));
  }
})();
