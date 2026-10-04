// ==========================================
// SEGUIMIENTO DE CAPTACIONES
// ==========================================
// Cuando un lead sale de NUEVO hacia cualquier otro estado (NO, SEGUIMIENTO,
// CERRADO...), deja en FECHA DE SEGUIMIENTO y HORA SEGUIMIENTO el momento
// exacto del cambio.
//
// Es un onEdit SIMPLE a propósito: no ocupa uno de los 20 activadores del
// proyecto y no hay que instalarlo. Solo se dispara con ediciones hechas a
// mano en el Sheet; lo que escriben el robot o Andrea por API no pasa por aquí.

const SEGUIMIENTO_CAPTACIONES = {
  HOJAS: ['1 - CAPTACIONES A', '1 - CAPTACIONES V'],
  PRIMERA_FILA_DATOS: 3, // fila 1 = encabezados, fila 2 = filtro
  COL_ESTADO: 'ESTADO DE LLAMADA',
  COL_FECHA: 'FECHA DE SEGUIMIENTO',
  COL_HORA: 'HORA SEGUIMIENTO',
  ESTADO_INICIAL: 'NUEVO'
};

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (SEGUIMIENTO_CAPTACIONES.HOJAS.indexOf(hoja.getName()) === -1) return;
    marcarSeguimientoCaptacion_(e, hoja);
  } catch (err) {
    console.error('onEdit seguimiento captaciones: ' + err);
  }
}

function marcarSeguimientoCaptacion_(e, hoja) {
  const cfg = SEGUIMIENTO_CAPTACIONES;
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toUpperCase(); });
  const colEstado = encabezados.indexOf(cfg.COL_ESTADO) + 1;
  const colFecha = encabezados.indexOf(cfg.COL_FECHA) + 1;
  const colHora = encabezados.indexOf(cfg.COL_HORA) + 1;
  if (!colEstado || !colFecha || !colHora) return;

  const rango = e.range;
  if (colEstado < rango.getColumn() || colEstado > rango.getLastColumn()) return;

  const filaInicial = Math.max(rango.getRow(), cfg.PRIMERA_FILA_DATOS);
  const filaFinal = rango.getLastRow();
  if (filaFinal < filaInicial) return;

  const ahora = new Date();
  const zona = Session.getScriptTimeZone();
  const p = Utilities.formatDate(ahora, zona, 'yyyy-M-d').split('-');
  const fecha = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); // solo el día, sin hora
  // AM/PM armado a mano: el formato 'a' depende del idioma y devuelve "p. m."
  const hm = Utilities.formatDate(ahora, zona, 'H:mm').split(':');
  const h24 = Number(hm[0]);
  const hora = (h24 % 12 || 12) + ':' + hm[1] + (h24 < 12 ? ' AM' : ' PM');

  const normalizar = function (v) { return String(v == null ? '' : v).trim().toUpperCase(); };
  const unaCelda = rango.getNumRows() === 1 && rango.getNumColumns() === 1;

  if (unaCelda) {
    // Caso normal: se sabe con certeza de qué estado venía.
    const nuevo = normalizar(e.value);
    if (normalizar(e.oldValue) !== cfg.ESTADO_INICIAL) return;
    if (!nuevo || nuevo === cfg.ESTADO_INICIAL) return;
    hoja.getRange(filaInicial, colFecha).setValue(fecha);
    hoja.getRange(filaInicial, colHora).setValue(hora);
    return;
  }

  // Pegado o arrastre sobre varias filas: Sheets no entrega el valor anterior.
  // Un lead que nunca salió de NUEVO no tiene seguimiento, así que se marca
  // solo donde ambas celdas siguen vacías.
  const n = filaFinal - filaInicial + 1;
  const estados = hoja.getRange(filaInicial, colEstado, n, 1).getValues();
  const fechas = hoja.getRange(filaInicial, colFecha, n, 1).getValues();
  const horas = hoja.getRange(filaInicial, colHora, n, 1).getValues();
  for (let i = 0; i < n; i++) {
    const estado = normalizar(estados[i][0]);
    if (!estado || estado === cfg.ESTADO_INICIAL) continue;
    if (fechas[i][0] !== '' || horas[i][0] !== '') continue;
    hoja.getRange(filaInicial + i, colFecha).setValue(fecha);
    hoja.getRange(filaInicial + i, colHora).setValue(hora);
  }
}
