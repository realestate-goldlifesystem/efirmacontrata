// PRUEBA DE PUNTA A PUNTA del trámite documental, contra producción, sobre el
// registro de prueba ("PRUEBA QA BORRAR"). Recorre el camino completo CON
// correcciones y, después de cada paso, lee la hoja y la compara con lo esperado:
//
//   0. pago del inquilino (fila de mentira en PAGOS_RECIBIDOS)
//   1. el inquilino envía su formulario            → INQ_SUBMITTED
//   2. el agente le pide una corrección            → INQ_CORRECTION|docs
//   3. el inquilino corrige                        → INQ_SUBMITTED|docs
//   4. el agente aprueba al inquilino              → INQ_VALIDATED
//   5. el propietario envía su formulario          → PROP_SUBMITTED
//   6. el agente le pide una corrección            → PROP_CORRECTION|docs
//   7. el propietario corrige                      → PROP_SUBMITTED|docs
//   8. el agente aprueba al propietario            → PROP_VALIDATED + pago CONSOLIDADO
//
// En cada paso revisa ESTADO DOCUMENTAL, que CONTROL DE PLAZO haya pasado a la
// etapa nueva con una fecha de este momento, y el plazo que resulta (GESTOR_PLAZOS).
// Usa las mismas acciones que usan los formularios y el panel.
//
// ⚠️ Manda correos REALES: los del inquilino y el propietario van a EMAIL_PRUEBA
// (una cuenta tuya) y los avisos del agente al correo del sistema.
// Requiere el registro de prueba ya creado (prueba_concurrencia_enviar.js CASO=1
// y esperar con ver_estado_registro_qa.js). Al final borra el pago de mentira;
// el registro se borra aparte con limpiar_pruebas_qa.js.
//
// Uso:  EMAIL_PRUEBA=tucorreo@dominio.com node qa_flujo_documental.js
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';
const PAGOS = 'PAGOS_RECIBIDOS';
const EXEC_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
const PROPIETARIO_PRUEBA = 'PRUEBA QA BORRAR';
const EMAIL = process.env.EMAIL_PRUEBA;
if (!EMAIL) { console.error('❌ Falta EMAIL_PRUEBA (una cuenta tuya: recibe correos reales).'); process.exit(1); }

const H = 3600000;
// PNG de 1×1: basta para que el backend tenga "un documento" que guardar
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const archivo = (nombre) => ({ nombre, tipo: 'image/png', contenido: PNG });

async function post(cuerpo) {
  const t0 = Date.now();
  const res = await fetch(EXEC_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), redirect: 'follow' });
  const texto = await res.text();
  let json; try { json = JSON.parse(texto); } catch (e) { json = { success: false, message: 'Respuesta no JSON: ' + texto.slice(0, 200) }; }
  return { json, seg: Math.round((Date.now() - t0) / 1000) };
}

async function leerFila() {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${HOJA}'!A1:ZZ` });
  const [h, ...filas] = r.data.values;
  const enc = h.map(x => String(x).trim());
  const i = filas.findIndex(f => String(f[enc.indexOf('NOMBRES Y APELLIDOS DEL PROPIETARIO')] || '').trim() === PROPIETARIO_PRUEBA);
  if (i === -1) return null;
  const v = (n) => String(filas[i][enc.indexOf(n)] === undefined ? '' : filas[i][enc.indexOf(n)]).trim();
  return { fila: i + 2, id: v('ID DE REGISTRO'), estadoDoc: v('ESTADO DOCUMENTAL'), control: v('CONTROL DE PLAZO'), detalles: v('DETALLES DEL ESTADO DEL INMUEBLE') };
}

async function estadoPago(id) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${PAGOS}'!A1:E` });
  const f = (r.data.values || []).filter(x => String(x[2] || '').trim() === id);
  return f.length ? String(f[f.length - 1][4] || '').trim() : '(sin pago)';
}

const horaCol = (ms) => new Date(ms - 5 * H).toISOString().slice(5, 16).replace('T', ' ');
let fallos = 0;

/** Compara la hoja con lo esperado tras un paso. plazo: {tipo:'vence', horas} | {tipo:'pausado'} | {tipo:'consolidado'} */
async function revisar(paso, esperado, antesMs) {
  const f = await leerFila();
  const base = f.estadoDoc.split('|')[0];
  const [cEstado, cFecha] = f.control.split('|');
  const cMs = Date.parse(cFecha || '');
  const problemas = [];

  if (f.estadoDoc !== esperado.estadoDoc && base !== esperado.estadoDoc) problemas.push(`ESTADO DOCUMENTAL es "${f.estadoDoc}", esperaba "${esperado.estadoDoc}"`);
  if (esperado.conDocs && f.estadoDoc.indexOf('|') === -1) problemas.push('ESTADO DOCUMENTAL perdió la lista de documentos a corregir');
  if (cEstado !== base) problemas.push(`CONTROL DE PLAZO sigue en "${cEstado}", debía pasar a "${base}"`);
  if (!(cMs >= antesMs - 5000 && cMs <= Date.now() + 5000)) problemas.push(`la fecha de CONTROL DE PLAZO (${cFecha}) no es de este paso`);

  let plazo = '';
  if (esperado.plazo.tipo === 'vence') plazo = `vence ${horaCol(cMs + esperado.plazo.horas * H)} (${esperado.plazo.horas} h, le toca al ${esperado.plazo.quien})`;
  if (esperado.plazo.tipo === 'pausado') plazo = 'reloj detenido (le toca al agente, 24 h, solo recordatorio)';
  if (esperado.plazo.tipo === 'consolidado') plazo = 'pago en firme';

  if (esperado.pago) {
    const p = await estadoPago(f.id);
    if (p !== esperado.pago) problemas.push(`el pago está en "${p}", esperaba "${esperado.pago}"`);
    else plazo += ` | pago: ${p}`;
  }

  if (problemas.length) fallos++;
  console.log(`${problemas.length ? '❌' : '✅'} ${paso}`);
  console.log(`     estado: ${f.estadoDoc}`);
  console.log(`     control: ${f.control}`);
  console.log(`     plazo: ${plazo}`);
  console.log(`     detalle: ${f.detalles.slice(0, 100)}`);
  problemas.forEach(p => console.log(`     ⚠️ ${p}`));
  return !problemas.length;
}

async function paso(nombre, cuerpo, esperado) {
  const antes = Date.now();
  const { json, seg } = await post(cuerpo);
  if (!json.success) {
    fallos++;
    console.log(`❌ ${nombre}\n     el servidor respondió: ${JSON.stringify(json).slice(0, 300)}`);
    return false;
  }
  console.log(`   (${seg} s) ${String(json.message || '').slice(0, 110)}`);
  return revisar(nombre, esperado, antes);
}

(async () => {
  const f0 = await leerFila();
  if (!f0) throw new Error('No hay registro de prueba en la hoja. Créalo primero.');
  if (f0.estadoDoc) throw new Error(`El registro de prueba ya tiene ESTADO DOCUMENTAL "${f0.estadoDoc}". Usa uno nuevo.`);
  const id = f0.id;
  console.log(`Registro de prueba: fila ${f0.fila} | ID ${id}\nCorreos del cliente → ${EMAIL}\n`);

  // 0. Pago de mentira (el formulario del inquilino exige un pago aprobado)
  const idPago = 'QA-PRUEBA-' + Date.now();
  const d = new Date(Date.now() - 5 * H);
  const fecha = `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET, range: `'${PAGOS}'!A:F`, valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[fecha, idPago, id, 85000, 'APROBADO', '{"prueba":true}']] },
  });
  console.log(`✅ 0. Pago de mentira anotado (${idPago})\n`);

  const inquilino = { tipoDocumento: 'CC', numeroDocumento: '999000222', nombre: 'INQUILINO PRUEBA QA', email: EMAIL, celular: '3000000001', ocupacion: 'Por definir' };
  const propietario = { tipoDocumento: 'CC', numeroDocumento: '999000111', nombre: PROPIETARIO_PRUEBA, email: EMAIL, celular: '3000000000' };
  const inicio = new Date(Date.now() + 10 * 24 * H).toISOString().split('T')[0];
  const docsInq = ['CEDULA_INQU_FRONTAL'];
  const docsProp = ['CERTIFICADO_BANCARIO'];

  const pasos = [
    ['1. El inquilino envía su formulario',
      { accion: 'procesarFormularioInquilino', codigoRegistro: id, datosFormulario: { inquilino, codeudor: null, fechaInicio: inicio, modoCorreccion: false }, archivosBase64: { docFront: archivo('frente.png'), docBack: archivo('reverso.png') } },
      { estadoDoc: 'INQ_SUBMITTED', plazo: { tipo: 'pausado' } }],
    ['2. El agente le pide una corrección al inquilino',
      { accion: 'enviarCorreccionInquilino', cdr: id, tipo: 'inquilino', observaciones: 'PRUEBA: la cédula no se lee bien.', documentosCorregir: docsInq },
      { estadoDoc: 'INQ_CORRECTION', conDocs: true, plazo: { tipo: 'vence', horas: 24, quien: 'inquilino' } }],
    ['3. El inquilino corrige',
      { accion: 'procesarFormularioInquilino', codigoRegistro: id, datosFormulario: { inquilino, codeudor: null, fechaInicio: inicio, modoCorreccion: true }, archivosBase64: { docFront: archivo('frente_corregido.png') } },
      { estadoDoc: 'INQ_SUBMITTED', conDocs: true, plazo: { tipo: 'pausado' } }],
    ['4. El agente aprueba al inquilino',
      { accion: 'procesarValidacionInquilino', cdr: id, tipo: 'inquilino', estado: 'aprobado', documentosCorregir: [], observaciones: '' },
      { estadoDoc: 'INQ_VALIDATED', plazo: { tipo: 'vence', horas: 48, quien: 'propietario' }, pago: 'APROBADO' }],
    ['5. El propietario envía su formulario',
      { accion: 'procesarFormularioPropietario', codigoRegistro: id, datosFormulario: { propietario, bancarios: { tipoCuenta: 'Ahorros', numeroCuenta: '00000000000', banco: 'Banco de prueba', titularCuenta: PROPIETARIO_PRUEBA, documentoTitular: '999000111' }, serviciosPublicos: {}, modoCorreccion: false }, archivosBase64: { docFront: archivo('frente.png'), docBack: archivo('reverso.png') } },
      { estadoDoc: 'PROP_SUBMITTED', plazo: { tipo: 'pausado' } }],
    ['6. El agente le pide una corrección al propietario',
      { accion: 'enviarCorreccionPropietario', cdr: id, tipo: 'propietario', observaciones: 'PRUEBA: falta el certificado bancario.', documentosCorregir: docsProp },
      { estadoDoc: 'PROP_CORRECTION', conDocs: true, plazo: { tipo: 'vence', horas: 24, quien: 'propietario' } }],
    ['7. El propietario corrige',
      { accion: 'procesarFormularioPropietario', codigoRegistro: id, datosFormulario: { propietario, bancarios: { tipoCuenta: 'Ahorros', numeroCuenta: '00000000000', banco: 'Banco de prueba', titularCuenta: PROPIETARIO_PRUEBA, documentoTitular: '999000111' }, serviciosPublicos: {}, modoCorreccion: true }, archivosBase64: { certBancario: archivo('certificado.png') } },
      { estadoDoc: 'PROP_SUBMITTED', conDocs: true, plazo: { tipo: 'pausado' } }],
    ['8. El agente aprueba al propietario',
      { accion: 'procesarValidacionPropietario', cdr: id, tipo: 'propietario', estado: 'aprobado', documentosCorregir: [], observaciones: '' },
      { estadoDoc: 'PROP_VALIDATED', plazo: { tipo: 'consolidado' }, pago: 'CONSOLIDADO' }],
  ];

  let hasta = 0;
  for (const [nombre, cuerpo, esperado] of pasos) {
    const ok = await paso(nombre, cuerpo, esperado);
    console.log('');
    hasta++;
    if (!ok && !process.argv.includes('--seguir')) { console.log('⛔ Se detiene aquí: el paso siguiente depende de este.'); break; }
  }

  // Limpieza del pago de mentira (la fila del inmueble se borra con limpiar_pruebas_qa.js)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET, fields: 'sheets(properties(title,sheetId))' });
  const sheetId = meta.data.sheets.find(s => s.properties.title === PAGOS).properties.sheetId;
  const rp = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${PAGOS}'!A1:C` })).data.values || [];
  const filaPago = rp.findIndex(x => String(x[1] || '') === idPago);
  if (filaPago > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET, requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: filaPago, endIndex: filaPago + 1 } } }] } });
    console.log('🧹 Pago de mentira borrado de PAGOS_RECIBIDOS.');
  }

  console.log(`\n${hasta}/${pasos.length} pasos recorridos | ${fallos ? fallos + ' con problemas' : 'todos correctos'}`);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('❌ ' + e.message); process.exit(1); });
