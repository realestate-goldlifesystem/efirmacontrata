/**
 * LISTA DE CONTRATOS VIGENTES Y SUS FECHAS — bloque 0 del plan de agendas (oct-2026)
 *
 * Hasta ahora el sistema sabía de un contrato mientras se hacía; cuando se
 * firmaba, dejaba de mirarlo. El comprobante mensual, la pregunta de continuar o
 * terminar, el IPC y la devolución del inmueble necesitan saber qué contratos
 * están corriendo y en qué fecha va cada uno. Eso lo resuelve este archivo.
 *
 * Reglas de Leonardo (PLAN_AGENDAS_Y_RECORDATORIOS.md):
 *  - Cada periodo mensual empieza el día de inicio del contrato, no el 1 del
 *    mes. Si ese día no existe en un mes (29, 30, 31), se toma el último día.
 *  - El "día 1 a 5" del periodo es la ventana de pago y de cargar el comprobante.
 *  - El aviso de terminación se da hasta 3 meses antes del final.
 *  - La devolución del inmueble es como tarde el día 5 del periodo siguiente al
 *    final (12 meses + 5 días para entregar, sin canon por esos días).
 *
 * Fechas de calendario como { y, m, d } (m de 1 a 12), sin horas: así no hay
 * líos de zona horaria. Las funciones `cv…` de arriba son puras (probadas en
 * _herramientas_locales/test_contratos_vigentes.js).
 */

// ---------- Puras: fechas de calendario ----------

function cvDiasDelMes(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

function cvNum(f) { return f.y * 10000 + f.m * 100 + f.d; }            // para comparar
function cvTexto(f) { return f ? f.y + '-' + ('0' + f.m).slice(-2) + '-' + ('0' + f.d).slice(-2) : ''; }

/** Suma meses respetando el día de origen (31 → 30 o 28/29 cuando el mes no lo tiene). */
function cvSumarMeses(f, n) {
  const total = (f.y * 12 + (f.m - 1)) + n;
  const y = Math.floor(total / 12), m = total - y * 12 + 1;
  return { y: y, m: m, d: Math.min(f.d, cvDiasDelMes(y, m)) };
}

function cvSumarDias(f, n) {
  const t = new Date(Date.UTC(f.y, f.m - 1, f.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function cvDiasEntre(a, b) {   // b - a, en días
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

/**
 * Lee una fecha como la deja la hoja: un Date, "16/10/2026" (día/mes/año) o
 * "2026-10-16". null si no se puede leer.
 */
function cvLeerFecha(v) {
  if (v instanceof Date && !isNaN(v)) return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() };
  const s = String(v === null || v === undefined ? '' : v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  let f = m ? { y: +m[3], m: +m[2], d: +m[1] } : null;
  if (!f) { m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); f = m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  if (!f || f.m < 1 || f.m > 12 || f.d < 1 || f.d > cvDiasDelMes(f.y, f.m)) return null;
  return f;
}

/**
 * Las fechas clave de un contrato.
 * @param {{y,m,d}} inicio
 * @param {{y,m,d}=} finRegistrado  FECHA FINAL DEL CONTRATO, si la hoja la trae
 */
function cvFechasClave(inicio, finRegistrado) {
  const fin = finRegistrado || cvSumarDias(cvSumarMeses(inicio, 12), -1);
  const siguiente = cvSumarDias(fin, 1);                       // día 1 del periodo siguiente
  const limiteAviso = cvSumarDias(cvSumarMeses(siguiente, -3), -1);
  return {
    inicio: inicio,
    fin: fin,
    topeDevolucion: cvSumarDias(siguiente, 4),                 // día 5 del periodo siguiente
    limiteAviso: limiteAviso,                                   // último día para avisar si continúan o terminan
    recordatoriosAviso: [                                       // 1 mes, 15 días, 5 días y el último día antes del límite
      { cuando: 'faltando 1 mes', fecha: cvSumarMeses(limiteAviso, -1) },
      { cuando: 'faltando 15 días', fecha: cvSumarDias(limiteAviso, -15) },
      { cuando: 'faltando 5 días', fecha: cvSumarDias(limiteAviso, -5) },
      { cuando: 'último día', fecha: limiteAviso }
    ]
  };
}

/**
 * En qué periodo mensual va el contrato el día `hoy`.
 * @return {null | {numero:number, inicio:{y,m,d}, fin:{y,m,d}, dia:number}}
 *   numero: 1 = primer mes del contrato; dia: 1 = primer día del periodo.
 *   null si `hoy` es anterior al inicio.
 */
function cvPeriodo(inicioContrato, hoy) {
  if (cvNum(hoy) < cvNum(inicioContrato)) return null;
  let k = (hoy.y - inicioContrato.y) * 12 + (hoy.m - inicioContrato.m);
  if (cvNum(cvSumarMeses(inicioContrato, k)) > cvNum(hoy)) k--;
  const ini = cvSumarMeses(inicioContrato, k);
  const fin = cvSumarDias(cvSumarMeses(inicioContrato, k + 1), -1);
  return { numero: k + 1, inicio: ini, fin: fin, dia: cvDiasEntre(ini, hoy) + 1 };
}

/**
 * ¿En qué momento de su vida está el contrato?
 * 'por_empezar' | 'vigente' | 'en_devolucion' (terminó, dentro de los 5 días para entregar) | 'terminado'
 */
function cvMomento(fechas, hoy) {
  const n = cvNum(hoy);
  if (n < cvNum(fechas.inicio)) return 'por_empezar';
  if (n <= cvNum(fechas.fin)) return 'vigente';
  if (n <= cvNum(fechas.topeDevolucion)) return 'en_devolucion';
  return 'terminado';
}

// ---------- Con servicios ----------

/**
 * Contratos con el contrato autenticado ya cargado (CARGA DEL CONTRATO = ✅) y
 * fecha de inicio, con sus fechas clave y en qué periodo van hoy.
 * @param {Object=} opciones  { incluirTerminados: false }
 */
function listarContratos(opciones) {
  const incluirTerminados = !!(opciones && opciones.incluirTerminados);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  const datos = sheet.getDataRange().getValues();
  const h = datos[0].map(x => String(x).trim());
  const col = (n) => h.indexOf(n);
  const v = (fila, n) => { const i = col(n); return i < 0 ? '' : fila[i]; };
  const colCarga = col('CARGA DEL CONTRATO') >= 0 ? 'CARGA DEL CONTRATO' : 'CARGAR CONTENIDO';

  const ahora = new Date();
  const hoy = cvLeerFecha(Utilities.formatDate(ahora, 'America/Bogota', 'yyyy-MM-dd'));
  const lista = [];
  datos.slice(1).forEach((fila, i) => {
    if (String(v(fila, colCarga)).trim() !== '✅') return;
    const inicio = cvLeerFecha(v(fila, 'FECHA INICIO DEL CONTRATO'));
    if (!inicio) return;
    const fechas = cvFechasClave(inicio, cvLeerFecha(v(fila, 'FECHA FINAL DEL CONTRATO')));
    const momento = cvMomento(fechas, hoy);
    if (momento === 'terminado' && !incluirTerminados) return;
    lista.push({
      fila: i + 2,
      id: String(v(fila, 'ID DE REGISTRO')).trim(),
      cdr: String(v(fila, 'CODIGO DE REGISTRO')).trim(),
      tipoNegocio: String(v(fila, 'TIPO DE NEGOCIO')).trim(),
      canon: Number(v(fila, 'CANON FINAL DEL CONTRATO')) || 0,
      inquilino: { nombre: String(v(fila, 'NOMBRE COMPLETO INQUILINO')).trim(), correo: String(v(fila, 'CORREO INQUILINO')).trim(), celular: String(v(fila, 'CELULAR INQUILINO')).trim() },
      propietario: { nombre: String(v(fila, 'NOMBRES Y APELLIDOS DEL PROPIETARIO')).trim(), correo: String(v(fila, 'Correo electrónico')).trim(), celular: String(v(fila, 'Celular')).trim() },
      fechas: fechas,
      momento: momento,
      periodo: cvPeriodo(inicio, hoy)
    });
  });
  return lista;
}

/** Para correr desde el editor: muestra los contratos vigentes y sus fechas (sin datos personales). */
function probarContratosVigentes() {
  const lista = listarContratos({ incluirTerminados: true });
  Logger.log(lista.length + ' contrato(s) con contrato autenticado y fecha de inicio:');
  lista.forEach(c => Logger.log(
    c.id + ' | ' + c.tipoNegocio + ' | ' + c.momento +
    ' | inicio ' + cvTexto(c.fechas.inicio) + ' · fin ' + cvTexto(c.fechas.fin) +
    ' · avisar hasta ' + cvTexto(c.fechas.limiteAviso) + ' · devolver hasta ' + cvTexto(c.fechas.topeDevolucion) +
    (c.periodo ? ' | periodo ' + c.periodo.numero + ', día ' + c.periodo.dia : '')
  ));
}
