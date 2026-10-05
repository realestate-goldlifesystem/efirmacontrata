// Lleva el registro de prueba ("PRUEBA QA BORRAR") hasta el punto en que el
// admin debe cargar el comprobante de pago del propietario, saltándose el medio
// del proceso (estudio, borrador, aprobaciones y firma del contrato):
//
//   1. Escribe CANON FINAL DEL CONTRATO = precio general − administración, que
//      es lo que quedaría al descargar el contrato ORIGINAL.
//   2. Carga un PDF de mentira como "contrato autenticado" por la misma acción
//      que usa la página (guardarContratoAutenticado). Eso dispara: permisos y
//      correo de carpetas, la cuenta de cobro al propietario y el correo al
//      admin pidiendo el comprobante.
//
// ⚠️ Manda correos REALES al correo del propietario de prueba.
// Requiere que el registro ya haya terminado (node ver_estado_registro_qa.js).
// Para borrar todo después: limpiar_pruebas_qa.js.
//
// Uso:
//   node qa_llevar_a_comprobante.js            → muestra lo que haría
//   node qa_llevar_a_comprobante.js --enviar   → lo hace
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const EXEC_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
const PROPIETARIO_PRUEBA = 'PRUEBA QA BORRAR';
const ENVIAR = process.argv.includes('--enviar');

const letra = (i) => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

/** PDF mínimo válido de una página, con un texto que deja claro que es de prueba. */
function pdfDePrueba() {
  const texto = 'CONTRATO AUTENTICADO DE PRUEBA - NO VALIDO - BORRAR';
  const contenido = `BT /F1 14 Tf 60 720 Td (${texto}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const pos = [];
  objs.forEach((o, i) => { pos.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1').toString('base64');
}

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${HOJA}'!A1:ZZ`, valueRenderOption: 'UNFORMATTED_VALUE' });
  const [h, ...filas] = r.data.values;
  const c = (n) => h.map(x => String(x).trim()).indexOf(n);
  const pruebas = filas.map((f, i) => ({ f, fila: i + 2 }))
    .filter(x => String(x.f[c('NOMBRES Y APELLIDOS DEL PROPIETARIO')] || '').trim() === PROPIETARIO_PRUEBA);

  if (pruebas.length !== 1) throw new Error(`Esperaba exactamente 1 registro de prueba y hay ${pruebas.length}.`);
  const { f, fila } = pruebas[0];
  const v = (n) => f[c(n)];

  const id = String(v('ID DE REGISTRO') || '').trim();
  const precio = Number(v('PRECIO DE PROMOCION GENERAL')) || 0;
  const admin = Number(v('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)')) || 0;
  const canon = precio - admin;
  const cCanon = c('CANON FINAL DEL CONTRATO');
  if (!id) throw new Error('El registro de prueba todavía no tiene ID.');
  if (cCanon === -1) throw new Error('No existe la columna CANON FINAL DEL CONTRATO.');
  if (canon <= 0) throw new Error(`Canon no válido: precio ${precio} − administración ${admin}.`);
  if (String(v('TIPO DE NEGOCIO')).trim() !== 'Corretaje') throw new Error('El registro de prueba no es de Corretaje.');

  console.log(`Registro de prueba: fila ${fila} | ID ${id} | ${v('CODIGO DE REGISTRO')}`);
  console.log(`Canon final: ${precio} − ${admin} = ${canon} | comisión: ${v('PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO')}`);
  console.log(`Correos reales a: ${v('Correo electrónico')}`);

  if (!ENVIAR) { console.log('\n(simulación: agrega --enviar para hacerlo)'); return; }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET, range: `'${HOJA}'!${letra(cCanon)}${fila}`,
    valueInputOption: 'RAW', requestBody: { values: [[canon]] },
  });
  console.log('\n✅ Canon final escrito en la hoja.');

  // El recibo necesita la FECHA INICIO DEL CONTRATO para el "periodo del servicio".
  // En un caso real la llena la elaboración del contrato, que aquí nos saltamos.
  const cInicio = c('FECHA INICIO DEL CONTRATO');
  if (cInicio !== -1 && !String(v('FECHA INICIO DEL CONTRATO') || '').trim()) {
    const en10dias = Math.floor(Date.now() / 86400000) + 25569 + 10;      // número de serie de Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET, range: `'${HOJA}'!${letra(cInicio)}${fila}`,
      valueInputOption: 'RAW', requestBody: { values: [[en10dias]] },
    });
    console.log('✅ Fecha de inicio del contrato escrita (hoy + 10 días).');
  }

  console.log('📤 Cargando el contrato autenticado de prueba...');
  const t0 = Date.now();
  const res = await fetch(EXEC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      accion: 'guardarContratoAutenticado',
      cdr: id,
      base64Pdf: pdfDePrueba(),
      nombreArchivo: `Contrato_Autenticado_PRUEBA_${id}.pdf`,
      emailAdmin: 'prueba-automatizada',
    }),
    redirect: 'follow',
  });
  const texto = await res.text();
  console.log(`HTTP ${res.status} en ${Math.round((Date.now() - t0) / 1000)} s`);
  try { console.log(JSON.stringify(JSON.parse(texto), null, 2)); }
  catch (e) { console.log(texto.slice(0, 600)); }
})().catch(e => { console.error('❌ ' + e.message); process.exit(1); });
