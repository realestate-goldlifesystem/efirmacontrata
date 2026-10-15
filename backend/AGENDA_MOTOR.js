/**
 * MOTOR DE HORARIOS CON TIPOS DE AGENDA — bloque 0 del plan de agendas (oct-2026)
 *
 * Las cuatro agendas (interesados, propietario, entrega, devolución) usan el
 * mismo cálculo de horarios libres sobre el calendario de Leonardo. Cambia solo
 * la configuración de cada una: duración, colchón y anticipación mínima.
 * Ver PLAN_AGENDAS_Y_RECORDATORIOS.md, secciones 6.1 a 6.4.
 *
 * Diferencia con el cálculo anterior (obtenerDisponibilidad de API_AGENDA.js):
 * el colchón ahora se respeta ANTES y DESPUÉS de cada cita ya agendada. Antes
 * solo se miraba después del horario nuevo, así que una cita podía quedar pegada
 * al final de otra, sin tiempo para desplazarse.
 *
 * Las funciones `ag…` de arriba son puras (probadas en
 * _herramientas_locales/test_agenda_motor.js). Trabajan en hora de Colombia,
 * que no tiene horario de verano: UTC-5 fijo.
 */

const AG_OFFSET_MS = 5 * 3600000;   // Colombia = UTC-5
const AG_PASO_MIN = 30;             // se ofrecen horarios cada 30 minutos

const TIPOS_AGENDA = {
  // Etapa 1 (decidido 12-oct-2026): visitas de interesados
  INTERESADO: { nombre: 'Visita de interesado', duracionMin: 40, colchonMin: 30, anticipacionMin: 60 },
  // Etapa 2: presentación del negocio y registro del inmueble. La anticipación
  // pasa a 2 h en el bloque 3; mientras tanto conserva la de hoy (12 h).
  PROPIETARIO: { nombre: 'Presentación y registro del inmueble', duracionMin: 60, colchonMin: 30, anticipacionMin: 12 * 60 },
  // Etapa 3: entrega del inmueble al inquilino
  ENTREGA: { nombre: 'Entrega del inmueble', duracionMin: 60, colchonMin: 30, anticipacionMin: 120 },
  // Etapa 4: devolución del inmueble (cuando Leonardo asiste)
  DEVOLUCION: { nombre: 'Devolución del inmueble', duracionMin: 60, colchonMin: 30, anticipacionMin: 120 }
};

// Lunes a viernes 8:00 a 18:00; sábados 8:00 a 13:00; domingo y festivos, nada.
const AG_HORARIO = { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [8, 13] };

// Almuerzo de Leonardo, lunes a viernes de 1:00 a 2:00 p. m. (decidido 14-oct-2026).
// Se bloquea SIN colchón: la hora de almuerzo ya sirve para desplazarse, así
// que a las 2:00 se puede empezar. Con esto caben 6 citas de propietario al día.
const AG_ALMUERZO = { 1: [13, 14], 2: [13, 14], 3: [13, 14], 4: [13, 14], 5: [13, 14] };

// ---------- Puras ----------

/** "2026-10-15" → { y, m, d } (m de 1 a 12). null si no es una fecha válida. */
function agLeerDia(texto) {
  const m = String(texto || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = +m[1], mes = +m[2], d = +m[3];
  const prueba = new Date(Date.UTC(y, mes - 1, d));
  if (prueba.getUTCMonth() !== mes - 1 || prueba.getUTCDate() !== d) return null;
  return { y: y, m: mes, d: d };
}

/** Milisegundos de una hora del día en Colombia. */
function agMs(dia, hora, minuto) {
  return Date.UTC(dia.y, dia.m - 1, dia.d, hora, minuto || 0) + AG_OFFSET_MS;
}

/** 0 = domingo … 6 = sábado, para ese día. */
function agDiaSemana(dia) {
  return new Date(Date.UTC(dia.y, dia.m - 1, dia.d)).getUTCDay();
}

/** "9:30 AM" */
function agHoraAmPm(ms) {
  const f = new Date(ms - AG_OFFSET_MS);
  let h = f.getUTCHours(); const mi = f.getUTCMinutes();
  const sufijo = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + (mi < 10 ? '0' : '') + mi + ' ' + sufijo;
}

/**
 * Horarios libres de un día para un tipo de agenda.
 * @param {Object} o
 *   o.dia        { y, m, d }
 *   o.tipo       clave de TIPOS_AGENDA
 *   o.ocupados   [{ inicio, fin }] en ms: lo que ya hay en el calendario
 *   o.apartados  [{ inicio, fin }] en ms: horarios retenidos mientras se negocia (bloque 2)
 *   o.ahoraMs    momento actual
 *   o.festivo    nombre del festivo, o '' si no lo es
 *   o.anticipacionMin  (opcional) reemplaza la del tipo: el agente, que ya habló
 *                con el propietario, puede reagendar con menos aviso
 * @return {{libre:boolean, motivo:string, slots:Array<{timestamp:number, horaAmPm:string}>}}
 */
function agHorariosLibres(o) {
  const cfg = TIPOS_AGENDA[o.tipo];
  if (!cfg) return { libre: false, motivo: 'Tipo de agenda desconocido: ' + o.tipo, slots: [] };
  if (!o.dia) return { libre: false, motivo: 'Fecha no válida', slots: [] };
  const ds = agDiaSemana(o.dia);
  if (ds === 0) return { libre: false, motivo: 'Día de descanso (domingo)', slots: [] };
  if (o.festivo) return { libre: false, motivo: 'Día festivo: ' + o.festivo, slots: [] };
  const horario = AG_HORARIO[ds];

  const colchon = cfg.colchonMin * 60000;
  const duracion = cfg.duracionMin * 60000;
  // Cada cita ocupada bloquea también su colchón, antes y después
  const bloqueos = (o.ocupados || []).concat(o.apartados || [])
    .filter(b => b && isFinite(b.inicio) && isFinite(b.fin))
    .map(b => ({ inicio: b.inicio - colchon, fin: b.fin + colchon }));
  const almuerzo = AG_ALMUERZO[ds];
  if (almuerzo) bloqueos.push({ inicio: agMs(o.dia, almuerzo[0], 0), fin: agMs(o.dia, almuerzo[1], 0) });

  const finDia = agMs(o.dia, horario[1], 0);
  const anticipacion = isFinite(o.anticipacionMin) ? o.anticipacionMin : cfg.anticipacionMin;
  const minimo = (o.ahoraMs || 0) + anticipacion * 60000;
  const slots = [];
  for (let t = agMs(o.dia, horario[0], 0); t + duracion <= finDia; t += AG_PASO_MIN * 60000) {
    if (t < minimo) continue;
    const choca = bloqueos.some(b => t < b.fin && t + duracion > b.inicio);
    if (!choca) slots.push({ timestamp: t, horaAmPm: agHoraAmPm(t) });
  }
  return { libre: slots.length > 0, motivo: slots.length ? 'Horarios encontrados' : 'Sin horarios disponibles', slots: slots };
}

// ---------- Con servicios ----------

/**
 * Disponibilidad real de un día para un tipo de agenda: lee el calendario de
 * Leonardo y el de festivos de Colombia.
 * @param {string} fechaIso  "2026-10-15" (o "2026-10-15T08:00:00", como manda el formulario)
 * @param {string} tipo      clave de TIPOS_AGENDA
 * @param {Object=} opciones { anticipacionMin, excluirEventoId }: para reagendar
 *   desde el panel (el evento de la propia cita no cuenta como ocupado)
 */
function obtenerDisponibilidadAgenda(fechaIso, tipo, opciones) {
  opciones = opciones || {};
  try {
    const dia = agLeerDia(fechaIso);
    if (!dia) return { success: false, error: 'Fecha no válida' };
    const referencia = new Date(agMs(dia, 12, 0));

    let festivo = '';
    try {
      const cal = CalendarApp.getCalendarById(CONFIG_AGENDA.CALENDARIO_FESTIVOS_COLOMBIA);
      const ev = cal ? cal.getEventsForDay(referencia) : [];
      if (ev.length) festivo = ev[0].getTitle();
    } catch (e) { Logger.log('⚠️ No se pudo leer el calendario de festivos: ' + e.message); }

    const ocupados = CalendarApp.getDefaultCalendar().getEventsForDay(referencia)
      .filter(e => !opciones.excluirEventoId || e.getId() !== opciones.excluirEventoId)
      .map(e => ({ inicio: e.getStartTime().getTime(), fin: e.getEndTime().getTime() }));

    const r = agHorariosLibres({ dia: dia, tipo: tipo || 'PROPIETARIO', ocupados: ocupados, apartados: [], ahoraMs: Date.now(), festivo: festivo, anticipacionMin: opciones.anticipacionMin });
    // Mismo formato que devolvía obtenerDisponibilidad, para no romper el formulario actual
    return {
      success: true, libre: r.libre, motivo: r.motivo,
      slots: r.slots.map(s => ({ timestamp: s.timestamp, horaAmPm: s.horaAmPm, horaString: Utilities.formatDate(new Date(s.timestamp), 'America/Bogota', 'HH:mm') }))
    };
  } catch (error) {
    Logger.log('Error en obtenerDisponibilidadAgenda: ' + error.message);
    return { success: false, error: error.message };
  }
}
