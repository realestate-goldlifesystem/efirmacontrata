// Prueba local de las funciones PURAS de backend/GESTOR_PLAZOS.js: la decisión
// de cuándo vence cada etapa (o sea, cuándo se devuelve un pago), la marca de
// control, los recordatorios al agente, el formato de fechas y los correos.
//
// Uso: node test_plazos.js            → corre las pruebas
//      node test_plazos.js --ver      → además guarda los correos en HTML para verlos
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../backend/GESTOR_PLAZOS.js'), 'utf8');
const pura = fuente.slice(0, fuente.indexOf('// HOJA: CONTROL DE PLAZO'));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(pura, ctx);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}
const H = 3600000;
const T = Date.UTC(2026, 9, 5, 22, 41, 0);          // 5-oct-2026 5:41 p. m. en Colombia
const calc = (d) => { const r = ctx.plzCalcular(d); return [r.tipo, r.quien, r.vence ? (r.vence - T) / H : 0]; };

// --- Estado base ---
igual('base con lista de docs', ctx.plzEstadoBase('INQ_CORRECTION|cedula,recibo'), 'INQ_CORRECTION');
igual('base minúsculas y espacios', ctx.plzEstadoBase('  prop_validated '), 'PROP_VALIDATED');
igual('base vacío', ctx.plzEstadoBase(''), '');
igual('base null', ctx.plzEstadoBase(null), '');

// --- Cada etapa (plazo en horas contadas desde T) ---
igual('pagó y no ha enviado: 48 h del pago', calc({ estado: '', fechaPago: T }), ['vence', 'inquilino', 48]);
igual('inquilino envió: pausado (agente)', calc({ estado: 'INQ_SUBMITTED', fechaPago: T - 5 * H, fechaCambio: T }), ['pausado', 'agente', 0]);
igual('corrección al inquilino: 24 h', calc({ estado: 'INQ_CORRECTION|cedula', fechaPago: T - 30 * H, fechaCambio: T }), ['vence', 'inquilino', 24]);
igual('inquilino aprobado: propietario 48 h', calc({ estado: 'INQ_VALIDATED', fechaPago: T - 40 * H, fechaCambio: T }), ['vence', 'propietario', 48]);
igual('propietario envió: pausado (agente)', calc({ estado: 'PROP_SUBMITTED', fechaPago: T - 80 * H, fechaCambio: T }), ['pausado', 'agente', 0]);
igual('corrección al propietario: 24 h', calc({ estado: 'PROP_CORRECTION|rut', fechaPago: T - 90 * H, fechaCambio: T }), ['vence', 'propietario', 24]);
['PROP_VALIDATED', 'READY_CONTRACT', 'CONTRACT_GENERATED', 'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED'].forEach(e =>
  igual('consolidado: ' + e, calc({ estado: e, fechaPago: T - 500 * H, fechaCambio: T - 400 * H })[0], 'consolidado'));

// --- Lo que cambió respecto a la regla vieja ---
// Regla vieja: 48 h desde el pago, sin importar de quién fuera la demora.
igual('el inquilino tardó 40 h: el propietario conserva sus 48 h completas',
  calc({ estado: 'INQ_VALIDATED', fechaPago: T - 40 * H, fechaCambio: T }), ['vence', 'propietario', 48]);
igual('el propietario cargó a la hora 47: ya no vence aunque el agente tarde',
  calc({ estado: 'PROP_SUBMITTED', fechaPago: T - 200 * H, fechaCambio: T - 100 * H })[0], 'pausado');

// --- El pago nuevo tras un reembolso no nace vencido ---
igual('repago 5 días después: cuenta desde el pago, no desde la marca vieja',
  calc({ estado: 'INQ_VALIDATED', fechaPago: T, fechaCambio: T - 120 * H }), ['vence', 'propietario', 48]);

// --- Ante la duda, no se devuelve ---
igual('estado sin marca de fecha → desconocido', calc({ estado: 'INQ_VALIDATED', fechaPago: T, fechaCambio: 0 })[0], 'desconocido');
igual('corrección sin marca → desconocido', calc({ estado: 'PROP_CORRECTION', fechaPago: T, fechaCambio: 0 })[0], 'desconocido');
igual('sin estado y sin fecha de pago → desconocido', calc({ estado: '', fechaPago: 0 })[0], 'desconocido');
igual('estado que no existe → desconocido', calc({ estado: 'OTRA_COSA', fechaPago: T, fechaCambio: T })[0], 'desconocido');

// --- Marca de control ---
igual('marca ida y vuelta', ctx.plzLeerMarca(ctx.plzMarca('INQ_VALIDATED', T)), { estado: 'INQ_VALIDATED', ms: T });
igual('marca vacía', ctx.plzLeerMarca(''), { estado: '', ms: 0 });
igual('marca con fecha dañada', ctx.plzLeerMarca('INQ_VALIDATED|no-es-fecha'), { estado: 'INQ_VALIDATED', ms: 0 });
igual('marca solo estado', ctx.plzLeerMarca('INQ_VALIDATED'), { estado: '', ms: 0 });

// --- Recordatorios al agente ---
igual('a las 23 h todavía no', ctx.plzTocaRecordar(T, 0, T + 23 * H), false);
igual('a las 24 h sí', ctx.plzTocaRecordar(T, 0, T + 24 * H), true);
igual('recordado hace 2 h: no se repite', ctx.plzTocaRecordar(T, T + 24 * H, T + 26 * H), false);
igual('recordado hace 24 h: se repite', ctx.plzTocaRecordar(T, T + 24 * H, T + 48 * H), true);
igual('sin fecha de inicio: nunca', ctx.plzTocaRecordar(0, 0, T + 500 * H), false);

// --- Fechas en hora de Colombia ---
igual('fecha tarde', ctx.plzFechaLarga(T), 'lunes 5 de octubre a las 5:41 p. m.');
igual('fecha + 48 h', ctx.plzFechaLarga(T + 48 * H), 'miércoles 7 de octubre a las 5:41 p. m.');
igual('mediodía', ctx.plzFechaLarga(Date.UTC(2026, 9, 6, 17, 5)), 'martes 6 de octubre a las 12:05 p. m.');
igual('medianoche', ctx.plzFechaLarga(Date.UTC(2026, 9, 6, 5, 0)), 'martes 6 de octubre a las 12:00 a. m.');
igual('mañana', ctx.plzFechaLarga(Date.UTC(2026, 9, 6, 14, 30)), 'martes 6 de octubre a las 9:30 a. m.');
igual('cambio de día por zona (2 a. m. UTC = 9 p. m. del día anterior)', ctx.plzFechaLarga(Date.UTC(2026, 9, 7, 2, 0)), 'martes 6 de octubre a las 9:00 p. m.');
igual('fin de año', ctx.plzFechaLarga(Date.UTC(2027, 0, 1, 3, 0)), 'jueves 31 de diciembre a las 10:00 p. m.');

// --- Textos ---
igual('nombre propio', ctx.plzNombrePropio('  MARÍA   CAMILA JIMÉNEZ  '), 'María Camila Jiménez');
igual('nombre con ñ', ctx.plzNombrePropio('IÑAKI PEÑA'), 'Iñaki Peña');
igual('escape HTML', ctx.plzEsc('<b>"A&B"</b>'), '&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;');

// --- Correos: que digan lo que deben y no se cuele HTML del cliente ---
const base = { codigo: 'AA000000', direccion: 'Cl 100 #10-20', url: 'https://ejemplo.test/f?cdr=AA000000' };
const correos = {
  '1-inicial-inquilino': ctx.plzCorreoInicialInquilino({ nombre: 'JUAN PÉREZ', ...base }),
  '2-inquilino-aprobado': ctx.plzCorreoInquilinoAprobado({ nombre: 'JUAN PÉREZ', vence: T + 48 * H, ...base }),
  '3-propietario-formulario': ctx.plzCorreoPropietarioFormulario({ nombre: 'MARÍA LÓPEZ', vence: T + 48 * H, ...base }),
  '4-todo-aprobado': ctx.plzCorreoTodoAprobado({ rol: 'propietario', nombre: 'MARÍA LÓPEZ', ...base }),
  '7-reembolso-inquilino': ctx.plzCorreoReembolsoInquilino({ nombre: 'JUAN PÉREZ', ...base }),
  '8-reembolso-propietario': ctx.plzCorreoReembolsoPropietario({ nombre: 'MARÍA LÓPEZ', ...base }),
  '9-agente-carga': ctx.plzCorreoAgenteCarga({ quien: 'propietario', nombreCliente: 'MARÍA LÓPEZ', vence: T + 24 * H, urlHoja: 'https://ejemplo.test/hoja', ...base }),
  '10-agente-recordatorio': ctx.plzCorreoAgenteRecordatorio({ quien: 'inquilino', nombreCliente: 'JUAN PÉREZ', horas: 26, urlHoja: 'https://ejemplo.test/hoja', ...base }),
};
const tiene = (k, txt) => correos[k].html.includes(txt);
igual('1: saluda con nombre propio', tiene('1-inicial-inquilino', 'Juan Pérez'), true);
igual('1: lleva el botón al formulario', tiene('1-inicial-inquilino', 'href="https://ejemplo.test/f?cdr=AA000000"'), true);
igual('1: avisa las 48 h para enviar', tiene('1-inicial-inquilino', '48 horas'), true);
igual('1: conserva el asunto de siempre', correos['1-inicial-inquilino'].asunto, 'FORMULARIO DE ARRENDAMIENTO DEL INMUEBLE "Cl 100 #10-20" - AA000000');
igual('2: fecha límite exacta', tiene('2-inquilino-aprobado', 'miércoles 7 de octubre a las 5:41 p. m.'), true);
igual('2: promete devolución automática', tiene('2-inquilino-aprobado', 'le devuelve su pago automáticamente'), true);
igual('3: bienvenida', tiene('3-propietario-formulario', 'Le damos la bienvenida'), true);
igual('3: fecha límite exacta', tiene('3-propietario-formulario', 'miércoles 7 de octubre a las 5:41 p. m.'), true);
igual('3: dice que habría que empezar de cero', tiene('3-propietario-formulario', 'desde cero'), true);
igual('3: no usa "se detiene"', tiene('3-propietario-formulario', 'se detiene'), false);
igual('3: conserva el asunto de siempre', correos['3-propietario-formulario'].asunto, 'FORMULARIO DE PROPIETARIO DEL INMUEBLE "Cl 100 #10-20" - AA000000');
igual('3 sin plazo: no inventa fecha', ctx.plzCorreoPropietarioFormulario({ nombre: 'X', vence: 0, ...base }).html.includes('reserva este proceso'), false);
igual('4: promete el borrador en 24 h', tiene('4-todo-aprobado', '24 horas'), true);
igual('9: 24 h para revisar', tiene('9-agente-carga', 'Tienes 24 horas para revisarlos'), true);
igual('9: aclara que no hay reembolso en ese tramo', tiene('9-agente-carga', 'reloj del reembolso está detenido'), true);
igual('10: dice las horas', tiene('10-agente-recordatorio', '26 horas'), true);
igual('ningún correo nombra la plataforma de firma', Object.values(correos).some(c => /signio|v[ií]afirma/i.test(c.html)), false);
// "Asegurado" le suena al cliente a póliza de arrendamiento, y esto es solo la
// elaboración del contrato (corrección de Leonardo, 05-oct-2026).
igual('ningún correo usa "asegurar/asegurado" ni habla de pólizas',
  Object.values(correos).concat([{ html: ctx.plzAvisoCorreccionHtml(T) }, { html: ctx.plzTextoRevisionBorrador('propietario') }, { html: JSON.stringify(ctx.plzTextosContratoListo('X')) }])
    .some(c => /asegur|p[oó]liza/i.test(c.html)), false);
igual('3: el cierre habla de elaborar el contrato', tiene('3-propietario-formulario', 'elaborar su contrato'), true);
igual('todos escriben bien la marca', Object.values(correos).every(c => c.html.includes('E-FirmaContrata') && !/EFirmaContrata|E-firmaContrata/.test(c.html)), true);
igual('un nombre con HTML no se cuela', ctx.plzCorreoInquilinoAprobado({ nombre: '<script>x</script>', vence: T, ...base }).html.includes('<script>'), false);
igual('una dirección con HTML no se cuela', ctx.plzCorreoInquilinoAprobado({ nombre: 'A', vence: T, codigo: 'X', direccion: '<img src=x>' }).html.includes('<img'), false);
igual('corrección: dice las horas y la fecha exacta', ['Tiene 24 horas para enviar la corrección', 'miércoles 7 de octubre a las 5:41 p. m.', 'desde cero'].every(t => ctx.plzAvisoCorreccionHtml(T + 48 * H).includes(t)), true);
igual('revisión: nombra los botones reales de la pantalla',
  ['Aprobar Contrato', 'Solicitar Corrección', 'Observaciones', 'Historial de Revisiones', 'Seleccione su rol'].every(t => ctx.plzTextoRevisionBorrador('inquilino').includes(t)), true);

// ==========================================================================
// ENGANCHE CON EL AUDITOR: plzPagoVencido contra una hoja simulada.
// Es la función que le dice al auditor "devuelve este pago ya".
// ==========================================================================
function mundo(fila, opciones = {}) {
  const enc = opciones.sinControl
    ? ['ID DE REGISTRO', 'ESTADO DOCUMENTAL', 'NOMBRE COMPLETO INQUILINO', 'NOMBRES Y APELLIDOS DEL PROPIETARIO']
    : ['ID DE REGISTRO', 'ESTADO DOCUMENTAL', 'CONTROL DE PLAZO', 'NOMBRE COMPLETO INQUILINO', 'NOMBRES Y APELLIDOS DEL PROPIETARIO'];
  const celdas = enc.map(h => fila[h] === undefined ? '' : fila[h]);
  const correos = [], props = Object.assign({}, opciones.props || {});
  const sheet = {
    getLastColumn: () => enc.length,
    getRange: (r, c, nr, nc) => ({
      getValue: () => celdas[c - 1],
      setValue: (v) => { celdas[c - 1] = v; },
      getValues: () => r === 1 ? [enc.slice()] : [celdas.slice(c - 1, c - 1 + (nc || 1))],
    }),
  };
  const g = {
    Logger: { log: () => {} },
    MailApp: { sendEmail: (m) => correos.push(m) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getUrl: () => 'https://hoja.test', getSheetByName: () => sheet }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] === undefined ? null : props[k], setProperty: (k, v) => { props[k] = v; } }) },
    Date: opciones.Date || FechaFija,     // el "ahora" del servidor queda fijo en AHORA
  };
  vm.createContext(g);
  vm.runInContext(fuente.slice(0, fuente.indexOf('// PRUEBA MANUAL (editor de Apps Script)')), g);
  return { g, sheet, enc, correos, props, control: () => celdas[enc.indexOf('CONTROL DE PLAZO')] };
}
const AHORA = T + 100 * H;
class FechaFija extends Date { constructor(...a) { if (a.length) super(...a); else super(AHORA); } static now() { return AHORA; } }
const vencido = (m, pagoMs) => m.g.plzPagoVencido(m.sheet, 2, m.enc, pagoMs, AHORA);
const marca = (estado, hace) => `${estado}|${new Date(AHORA - hace * H).toISOString()}`;

let m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': '' });
igual('auditor: pagó hace 47 h y no ha enviado → espera', vencido(m, AHORA - 47 * H), false);
igual('auditor: pagó hace 49 h y no ha enviado → reembolso', vencido(m, AHORA - 49 * H), true);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'INQ_VALIDATED' });
igual('auditor: trámite en curso SIN marca (los que ya venían) → no reembolsa', vencido(m, AHORA - 90 * H), false);
igual('auditor: …y le deja la marca para empezar a contar desde ahora', String(m.control()).startsWith('INQ_VALIDATED|'), true);
igual('auditor: en la ronda siguiente sigue esperando', vencido(m, AHORA - 90 * H), false);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'INQ_VALIDATED', 'CONTROL DE PLAZO': marca('INQ_VALIDATED', 47) });
igual('auditor: propietario lleva 47 h sin cargar → espera', vencido(m, AHORA - 90 * H), false);
m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'INQ_VALIDATED', 'CONTROL DE PLAZO': marca('INQ_VALIDATED', 49) });
igual('auditor: propietario lleva 49 h sin cargar → reembolso', vencido(m, AHORA - 90 * H), true);
igual('auditor: mismo caso pero el inquilino volvió a pagar hace 1 h → espera', vencido(m, AHORA - 1 * H), false);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'PROP_CORRECTION|rut', 'CONTROL DE PLAZO': marca('PROP_CORRECTION', 25) });
igual('auditor: corrección del propietario vencida (25 h) → reembolso', vencido(m, AHORA - 200 * H), true);
m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'PROP_CORRECTION|rut', 'CONTROL DE PLAZO': marca('INQ_VALIDATED', 60) });
igual('auditor: acaban de pedirle la corrección (la marca era de la etapa anterior) → espera', vencido(m, AHORA - 200 * H), false);
igual('auditor: …y la marca pasa a la etapa nueva', String(m.control()).startsWith('PROP_CORRECTION|'), true);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'PROP_SUBMITTED', 'CONTROL DE PLAZO': marca('PROP_SUBMITTED', 300), 'NOMBRES Y APELLIDOS DEL PROPIETARIO': 'MARÍA LÓPEZ' });
igual('auditor: el propietario cargó hace 300 h y el agente no revisa → NUNCA reembolsa', vencido(m, AHORA - 400 * H), false);
igual('auditor: …pero le manda UN recordatorio al agente', m.correos.length, 1);
igual('auditor: …al correo del sistema', m.correos[0].to, 'realestate.goldlifesystem@gmail.com');
vencido(m, AHORA - 400 * H);
igual('auditor: en la ronda siguiente no repite el recordatorio', m.correos.length, 1);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'PROP_SUBMITTED', 'CONTROL DE PLAZO': marca('PROP_SUBMITTED', 5) });
igual('auditor: cargó hace 5 h → ni reembolso ni recordatorio', [vencido(m, AHORA - 400 * H), m.correos.length], [false, 0]);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'PROP_SUBMITTED', 'CONTROL DE PLAZO': marca('INQ_VALIDATED', 60), 'NOMBRES Y APELLIDOS DEL PROPIETARIO': 'MARÍA LÓPEZ' });
igual('auditor: detecta una carga que no avisó nadie → no reembolsa aunque la etapa anterior ya estuviera vencida', vencido(m, AHORA - 400 * H), false);
igual('auditor: …y le avisa al agente que el propietario cargó', [m.correos.length, /PROPIETARIO cargó/.test((m.correos[0] || {}).subject || '')], [1, true]);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'INQ_VALIDATED' }, { sinControl: true });
igual('auditor: si falta la columna de control → no reembolsa a nadie', vencido(m, AHORA - 900 * H), false);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'ALGO_RARO', 'CONTROL DE PLAZO': marca('ALGO_RARO', 900) });
igual('auditor: estado que no conoce → no reembolsa', vencido(m, AHORA - 900 * H), false);

m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'INQ_VALIDATED', 'CONTROL DE PLAZO': 'INQ_VALIDATED|fecha-rota' });
igual('auditor: marca con fecha dañada → la rehace y espera', [vencido(m, AHORA - 900 * H), /^INQ_VALIDATED\|\d{4}-/.test(m.control())], [false, true]);

// Si algo explota adentro, el auditor NO debe reembolsar
m = mundo({ 'ID DE REGISTRO': 'AA1', 'ESTADO DOCUMENTAL': 'INQ_VALIDATED', 'CONTROL DE PLAZO': marca('INQ_VALIDATED', 900) });
m.sheet.getRange = () => { throw new Error('hoja caída'); };
igual('auditor: si la hoja falla → no reembolsa', vencido(m, AHORA - 900 * H), false);

if (process.argv.includes('--ver')) {
  const dir = path.join(process.env.TEMP || '.', 'correos_plazos');
  fs.mkdirSync(dir, { recursive: true });
  Object.entries(correos).forEach(([k, c]) => fs.writeFileSync(path.join(dir, k + '.html'), '<meta charset="utf-8"><title>' + c.asunto + '</title>' + c.html));
  console.log('Correos guardados en ' + dir);
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
