// Deja la plantilla maestra "CUENTA DE COBRO A CUENTA EXTERNA" (Z1- PLANTILLA #1 /
// INMUEBLES / ARRIENDO / PLANTILLA #2 / ARCHIVOS DEL INMUEBLE) con llaves <<…>> en vez
// de los datos de ejemplo, sin tocar la redacción ni los datos bancarios (19-oct-2026).
// Antes guarda la plantilla en .docx en la carpeta de respaldo (fuera del repo).
// Uso: node llaves_cuenta_cobro_externa.js <carpeta respaldo> [--aplicar]
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.readonly'] });
const DOC = '1b2fJDmOkhJbPoT_N2afB-ibMGWOkIXcTXHdQyKnbB_E';

// [texto de ejemplo, llave, cuántas veces debe aparecer]. El orden importa: lo más largo primero.
const CAMBIOS = [
  ['firmado 29 de abril de 2025', 'firmado <<FECHA CONTRATO>>', 1],
  ['Bogotá, 29 de abril de 2025', 'Bogotá, <<FECHA>>', 1],
  ['NORBEY ADRIAN OSMA FONTECHA', '<<NOMBRE PROPIETARIO>>', 3],
  ['13.959.749', '<<CEDULA PROPIETARIO>>', 2],
  ['CALDERON QUINTERO STEPHANIE', '<<NOMBRE INQUILINO>>', 2],
  ['1.026.292.644', '<<CEDULA INQUILINO>>', 1],
  ['UN MILLÓN DOSCIENTOS MIL PESOS COLOMBIANOS', '<<VALOR EN LETRA>>', 1],
  ['1.200.000', '<<VALOR>>', 1],
  ['del mes de mayo', 'del mes de <<MES>>', 1],
  ['CR 27 #4A-55 ETAP 2 AP 507 TORRE 6 UBICADO EN LA CIUDAD DE ZIPAQUIRA', '<<DIRECCION>> UBICADO EN LA CIUDAD DE <<CIUDAD>>', 1],
  ['Solicitud 11560802 - 25', 'Solicitud <<SOLICITUD>>', 1],
  ['______________________________________', '<<FIRMA PROPIETARIO>>\n______________________________________', 1],
];

(async () => {
  const [carpeta, ap] = process.argv.slice(2);
  const d = google.docs({ version: 'v1', auth }), dr = google.drive({ version: 'v3', auth });
  const texto = (await dr.files.export({ fileId: DOC, mimeType: 'text/plain' })).data;
  const cuenta = (t) => texto.split(t).length - 1;
  const malos = CAMBIOS.filter(([t, , n]) => cuenta(t) !== n);
  if (malos.length) { console.log('NO COINCIDE (¿ya se cambió?):', malos.map(([t, , n]) => `"${t}" aparece ${cuenta(t)} (esperado ${n})`)); return; }
  console.log(CAMBIOS.length, 'cambios verificados');
  if (ap !== '--aplicar') return console.log('(solo revisión)');

  fs.mkdirSync(carpeta, { recursive: true });
  const docx = await dr.files.export({ fileId: DOC, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, { responseType: 'arraybuffer' });
  const archivo = path.join(carpeta, 'CUENTA DE COBRO A CUENTA EXTERNA (plantilla maestra antes de llaves) ' + new Date().toISOString().slice(0, 10) + '.docx');
  fs.writeFileSync(archivo, Buffer.from(docx.data));
  console.log('respaldo:', archivo);

  const r = await d.documents.batchUpdate({ documentId: DOC, requestBody: { requests: CAMBIOS.map(([t, llave]) => ({ replaceAllText: { containsText: { text: t, matchCase: true }, replaceText: llave } })) } });
  r.data.replies.forEach((x, i) => console.log(CAMBIOS[i][1].split('\n')[0].padEnd(40), x.replaceAllText.occurrencesChanged || 0));
})();
