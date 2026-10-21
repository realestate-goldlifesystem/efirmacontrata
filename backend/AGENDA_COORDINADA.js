/**
 * AGENDAMIENTO COORDINADO — bloque 2 del plan de agendas (oct-2026)
 *
 * Para los inmuebles que se visitan CON ACOMPAÑAMIENTO del propietario (o de su
 * delegado). Decisiones de Leonardo: PLAN_AGENDAS_Y_RECORDATORIOS.md, 6.1.3 y 6.1.4.
 *
 *  1. El interesado, en visita.html, ve los horarios libres de Leonardo. Los que el
 *     propietario ya marcó como disponibles salen como "cruce": esos se agendan
 *     directo (quedan por confirmar, con la línea de avisos de siempre).
 *  2. Si no hay cruce, el interesado pide HASTA 3 horarios de los libres de
 *     Leonardo. Quedan APARTADOS (nadie más los ve) y al propietario le llega un
 *     correo con su enlace personal a coordinar.html.
 *  3. En coordinar.html el propietario acepta uno de los pedidos → visita agendada;
 *     o marca los horarios que puede esa semana (y quién abre) → al interesado le
 *     llega un correo para elegir entre ese cruce.
 *  4. Tarea automática (ejecutarMotorAgenda): a los 30 min sin respuesta del
 *     propietario se le avisa a Leonardo para que lo llame; cada horario pedido
 *     se cae 2 h antes de su hora; si se caen todos, la solicitud se cancela y al
 *     interesado le llega un correo para elegir otro.
 *
 * Datos:
 *  - Disponibilidad del propietario: pestaña "2.1 - DISPONIBILIDAD PROPIETARIOS",
 *    una fila por inmueble, BLOQUES = JSON con los timestamps marcados (futuros).
 *  - La solicitud es una fila más de "2 - AGENDA CITAS": ESTADO "POR COORDINAR",
 *    MODO VISITA "COORDINADO", HORARIOS PEDIDOS = JSON, QUIEN ABRE.
 *  - El enlace del propietario lleva un token derivado del ID del inmueble con una
 *    clave secreta del script (no se guarda, se recalcula).
 */

const HOJA_DISPONIBILIDAD = '2.1 - DISPONIBILIDAD PROPIETARIOS';
const COLUMNAS_DISPONIBILIDAD = ['ID INMUEBLE', 'BLOQUES', 'QUIEN ABRE', 'CELULAR QUIEN ABRE', 'ACTUALIZADO'];
const URL_PAGINA_COORDINAR = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/coordinar.html';
const MAX_PEDIDOS_COORDINADO = 3;
const MIN_AVISO_LLAMAR = 30;            // sin respuesta del propietario → aviso a Leonardo
const MIN_CAIDA_PEDIDO = 120;           // cada horario pedido se cae 2 h antes
const DIAS_SEMANA_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// ---------- Token del propietario ----------

function _secretoCoordinar() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SECRETO_COORDINAR');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('SECRETO_COORDINAR', s); }
  return s;
}

/** Token del enlace del propietario para un inmueble. Siempre el mismo para ese inmueble. */
function tokenCoordinarInmueble(idInmueble) {
  const firma = Utilities.computeHmacSha256Signature(String(idInmueble), _secretoCoordinar());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 32);
}

function urlCoordinarPropietario(idInmueble, idCita) {
  return URL_PAGINA_COORDINAR + '?i=' + encodeURIComponent(idInmueble) + '&t=' + tokenCoordinarInmueble(idInmueble) +
    (idCita ? '&c=' + encodeURIComponent(idCita) : '');
}

function _inmuebleDelPropietario(datos) {
  const id = String(datos.i || '').trim();
  if (!id || String(datos.t || '') !== tokenCoordinarInmueble(id)) return { error: 'Este enlace no es válido.' };
  const inm = _inmueblePorId(id);
  if (!inm) return { error: 'No encontramos este inmueble.' };
  return { inm: inm };
}

// ---------- Disponibilidad marcada por el propietario ----------

function _hojaDisponibilidad() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(HOJA_DISPONIBILIDAD);
  if (!sheet) {
    sheet = ss.insertSheet(HOJA_DISPONIBILIDAD);
    sheet.getRange(1, 1, 1, COLUMNAS_DISPONIBILIDAD.length).setValues([COLUMNAS_DISPONIBILIDAD]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** { fila, bloques:[timestamps futuros], quienAbre, celularAbre } del inmueble. */
function leerDisponibilidad(idInmueble) {
  const sheet = _hojaDisponibilidad();
  const datos = sheet.getDataRange().getValues();
  const ahora = Date.now();
  for (let k = 1; k < datos.length; k++) {
    if (String(datos[k][0]).trim() !== String(idInmueble)) continue;
    let bloques = [];
    try { bloques = JSON.parse(datos[k][1] || '[]'); } catch (e) {}
    return {
      fila: k + 1,
      bloques: bloques.map(Number).filter(t => t > ahora).sort((a, b) => a - b),
      quienAbre: String(datos[k][2] || ''),
      celularAbre: String(datos[k][3] || '')
    };
  }
  return { fila: 0, bloques: [], quienAbre: '', celularAbre: '' };
}

/** Reemplaza los bloques de una semana (lunes 00:00 Colombia a +7 días) y guarda quién abre. */
function _guardarDisponibilidad(idInmueble, lunesMs, bloquesSemana, quienAbre, celularAbre) {
  const sheet = _hojaDisponibilidad();
  const actual = leerDisponibilidad(idInmueble);
  const finSemana = lunesMs + 7 * 86400000;
  const otros = actual.bloques.filter(t => t < lunesMs || t >= finSemana);
  const nuevos = bloquesSemana.filter(t => t >= lunesMs && t < finSemana && t > Date.now());
  const todos = Array.from(new Set(otros.concat(nuevos))).sort((a, b) => a - b);
  const fila = [idInmueble, JSON.stringify(todos), quienAbre, celularAbre,
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')];
  if (actual.fila) sheet.getRange(actual.fila, 1, 1, fila.length).setValues([fila]);
  else sheet.appendRow(fila);
  return todos;
}

// ---------- Horarios apartados ----------

let _cacheApartados = null;

/** Horarios pedidos por interesados que esperan al propietario: bloquean la agenda de Leonardo. */
function apartadosVigentes(excluirIdCita) {
  if (!_cacheApartados) {
    _cacheApartados = [];
    const { sheet, col } = hojaCitasConColumnas();
    const ultima = sheet.getLastRow();
    if (ultima >= 2 && col['HORARIOS PEDIDOS']) {
      const filas = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
      const dur = TIPOS_AGENDA.INTERESADO.duracionMin * 60000;
      filas.forEach(f => {
        if (String(valorCita(f, col, 'ESTADO') || '').trim() !== ESTADO_POR_COORDINAR) return;
        const id = String(valorCita(f, col, 'ID CITA') || '').trim();
        _pedidosDe(f, col).forEach(t => _cacheApartados.push({ idCita: id, inicio: t, fin: t + dur }));
      });
    }
  }
  return _cacheApartados.filter(a => a.idCita !== excluirIdCita).map(a => ({ inicio: a.inicio, fin: a.fin }));
}

function _descartadosDe(fila, col) {
  try { return (JSON.parse(valorCita(fila, col, 'HORARIOS DESCARTADOS') || '[]') || []).map(Number).filter(isFinite); }
  catch (e) { return []; }
}

function _pedidosDe(fila, col) {
  try { return (JSON.parse(valorCita(fila, col, 'HORARIOS PEDIDOS') || '[]') || []).map(Number).filter(isFinite); }
  catch (e) { return []; }
}

/** ¿Ese timestamp es un horario libre de Leonardo para una visita? */
function _horarioLibre(ts, excluirIdCita) {
  const fecha = Utilities.formatDate(new Date(ts), 'America/Bogota', 'yyyy-MM-dd');
  const disp = obtenerDisponibilidadAgenda(fecha, 'INTERESADO', { excluirCita: excluirIdCita || '' });
  return !!(disp.success && disp.slots.some(s => s.timestamp === ts));
}

function _textoHorario(ts) {
  const d = new Date(ts);
  const dia = DIAS_SEMANA_LARGOS[Number(Utilities.formatDate(d, 'America/Bogota', 'u')) % 7];
  return dia + ' ' + Utilities.formatDate(d, 'America/Bogota', 'dd/MM') + ' a las ' + formatAmPm(d);
}

// ---------- Interesado ----------

/** Horarios de un día para un inmueble coordinado: los libres de Leonardo, marcando el cruce. */
function disponibilidadVisitaCoordinada(datos) {
  const inm = _inmueblePorId(datos.i);
  if (!inm) return { success: false, error: 'No encontramos este inmueble.' };
  const disp = obtenerDisponibilidadAgenda(datos.fecha, 'INTERESADO', { excluirCita: String(datos.c || '') });
  if (!disp.success) return disp;
  const marcados = leerDisponibilidad(inm.id).bloques;
  let descartados = [];
  if (datos.c) { const cita = _citaPorId(datos.c); if (cita) descartados = _descartadosDe(cita.fila, cita.col); }
  disp.slots = disp.slots.map(s => Object.assign(s, { cruce: marcados.indexOf(s.timestamp) !== -1, descartado: descartados.indexOf(s.timestamp) !== -1 }));
  return disp;
}

/**
 * Lo llama agendarVisitaInteresado cuando el inmueble es COORDINADO (ya con el lock).
 * datos.timestamp = un horario del cruce (se agenda), o datos.pedidos = hasta 3 horarios.
 */
function solicitarVisitaCoordinada_(datos, inm, negocio, nombre, correo, celular) {
  const disp = leerDisponibilidad(inm.id);
  const ts = Number(datos.timestamp);
  const pidioCruce = isFinite(ts) && ts > 0 && disp.bloques.indexOf(ts) !== -1;

  let pedidos = [];
  if (!pidioCruce) {
    pedidos = (Array.isArray(datos.pedidos) ? datos.pedidos : (isFinite(ts) && ts > 0 ? [ts] : []))
      .map(Number).filter(isFinite);
    pedidos = Array.from(new Set(pedidos)).sort((a, b) => a - b).slice(0, MAX_PEDIDOS_COORDINADO);
    if (!pedidos.length) return { success: false, error: 'Elige al menos un horario.' };
    const ocupado = pedidos.find(t => !_horarioLibre(t));
    if (ocupado) return { success: false, error: 'El horario del ' + _textoHorario(ocupado) + ' acaba de ser ocupado. Por favor elige otro.' };
  } else if (!_horarioLibre(ts)) {
    return { success: false, error: 'El horario acaba de ser ocupado. Por favor elige otro.' };
  }

  const tz = Session.getScriptTimeZone();
  const idCita = 'CIT-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const precal = textoPrecalificacion(negocio, datos.precalificacion);
  const { sheet, col } = hojaCitasConColumnas();
  const ahora = new Date();
  const ahoraTxt = Utilities.formatDate(ahora, tz, 'dd/MM/yyyy HH:mm:ss');
  const primera = new Date(pidioCruce ? ts : pedidos[0]);
  const fila = new Array(Math.max(sheet.getLastColumn(), COLUMNAS_CITAS.length)).fill('');
  const poner = (n, valor) => { if (col[n]) fila[col[n] - 1] = valor; };
  poner('ID CITA', idCita);
  poner('FECHA CREACION', ahoraTxt);
  poner('ESTADO', ESTADO_POR_COORDINAR);
  poner('FECHA CITA', new Date(primera.getFullYear(), primera.getMonth(), primera.getDate()));
  poner('HORA CITA', formatAmPm(primera));
  poner('NOMBRE', nombre);
  poner('CELULAR', celular);
  poner('CORREO', correo);
  poner('TIPO SERVICIO', 'Visita · ' + (negocio === 'VENTA' ? 'Venta' : 'Arriendo'));
  poner('DIRECCION', [inm.direccion, [inm.barrio, inm.ciudad].filter(Boolean).join(', ')].filter(Boolean).join(' · '));
  poner('NOTAS', precal + ' · Acceso: Con acompañamiento del propietario');
  poner('TOKEN PROPIETARIO', Utilities.getUuid());   // el token de quien agenda (aquí, el interesado)
  poner('TOKEN AGENTE', Utilities.getUuid());
  poner('ULTIMO CAMBIO', ahoraTxt + ' · ' + (pidioCruce ? 'agendada en un horario del propietario' : 'pidió ' + pedidos.length + ' horario(s): espera al propietario'));
  poner('TIPO AGENDA', 'INTERESADO');
  poner('ID INMUEBLE', inm.id);
  poner('MODO VISITA', 'COORDINADO');
  poner('HORARIOS PEDIDOS', pidioCruce ? '' : JSON.stringify(pedidos));
  poner('QUIEN ABRE', _quienAbreTexto(inm, disp));
  poner('FECHA ULTIMO AVISO', ahora);   // desde aquí cuentan los 30 min para avisar a Leonardo
  sheet.appendRow(fila);
  const numFila = sheet.getLastRow();
  if (col['FECHA CITA']) sheet.getRange(numFila, col['FECHA CITA']).setNumberFormat('dd/MM/yyyy');
  _cacheApartados = null;

  if (pidioCruce) {
    const f = sheet.getRange(numFila, 1, 1, sheet.getLastColumn()).getValues()[0];
    _agendarVisitaCoordinada(sheet, col, numFila, f, inm, ts, 'cruce');
    return { success: true, idCita: idCita, modo: 'COORDINADO', agendada: true };
  }

  // Correo al interesado: solicitud recibida
  try {
    enviarCorreoCita(correo, '📅 Recibimos tu solicitud de visita - Gold Life', 'SOLICITUD RECIBIDA', nombre,
      `Recibimos tu solicitud para visitar el ${inm.tipoInmueble.toLowerCase()} en <strong>${inm.barrio || 'el inmueble'}</strong>.<br><br>` +
      'Pediste estos horarios:<br>' + pedidos.map(t => '• <strong>' + _textoHorario(t) + '</strong>').join('<br>') + '<br><br>' +
      'Este inmueble se visita con el propietario. Ya le pedimos que nos confirme cuál le sirve y te escribimos apenas responda.', '');
  } catch (e) { Logger.log('Error enviando el correo al interesado: ' + e.message); }

  _correoPropietarioSolicitud(inm, idCita, nombre, precal, pedidos);
  _correoAgenteCoordinado(inm, nombre, celular, correo, precal,
    `👥 Visita por coordinar: ${nombre} · ${inm.id}`, 'VISITA POR COORDINAR',
    'Pidió estos horarios (quedaron apartados en tu agenda):<br>' + pedidos.map(t => '• ' + _textoHorario(t)).join('<br>') +
    '<br><br>Ya le escribimos al propietario. Si en 30 minutos no responde, te aviso para que lo llames.');
  return { success: true, idCita: idCita, modo: 'COORDINADO', agendada: false };
}

/** Desde el correo "ya puedes elegir": el interesado toma un horario del cruce o vuelve a pedir. */
function elegirHorarioCoordinado(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cita = _citaPorId(datos.c);
    if (!cita) return { success: false, error: 'No encontramos tu solicitud.' };
    const { sheet, col, numFila, fila } = cita;
    if (!datos.t || String(datos.t) !== String(valorCita(fila, col, 'TOKEN PROPIETARIO') || '')) return { success: false, error: 'Este enlace no es válido.' };
    const estado = String(valorCita(fila, col, 'ESTADO') || '').trim();
    if (['ASISTIDA', 'INASISTIDA'].indexOf(estado) !== -1) return { success: false, error: 'Esta visita ya se realizó.' };
    const inm = _inmueblePorId(valorCita(fila, col, 'ID INMUEBLE'));
    if (!inm || !negociosDeEstado(inm.estado).length) return { success: false, error: 'Este inmueble ya no está disponible para visitas.' };
    const idCita = String(datos.c);

    const ts = Number(datos.timestamp);
    if (isFinite(ts) && ts > 0) {
      if (leerDisponibilidad(inm.id).bloques.indexOf(ts) === -1) return { success: false, error: 'Ese horario ya no está disponible con el propietario. Elige otro.' };
      if (!_horarioLibre(ts, idCita)) return { success: false, error: 'El horario acaba de ser ocupado. Por favor elige otro.' };
      _agendarVisitaCoordinada(sheet, col, numFila, fila, inm, ts, 'interesado');
      return { success: true, idCita: idCita, modo: 'COORDINADO', agendada: true };
    }

    // Vuelve a pedir hasta 3 horarios
    let pedidos = (Array.isArray(datos.pedidos) ? datos.pedidos : []).map(Number).filter(isFinite);
    pedidos = Array.from(new Set(pedidos)).sort((a, b) => a - b).slice(0, MAX_PEDIDOS_COORDINADO);
    if (!pedidos.length) return { success: false, error: 'Elige al menos un horario.' };
    const descartados = _descartadosDe(fila, col);
    if (pedidos.some(t => descartados.indexOf(t) !== -1)) return { success: false, error: 'Uno de esos horarios ya lo descartó el propietario. Elige otro.' };
    const ocupado = pedidos.find(t => !_horarioLibre(t, idCita));
    if (ocupado) return { success: false, error: 'El horario del ' + _textoHorario(ocupado) + ' acaba de ser ocupado. Por favor elige otro.' };
    _liberarEventoCita(sheet, col, numFila, fila);
    const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
    const primera = new Date(pedidos[0]);
    escribir('ESTADO', ESTADO_POR_COORDINAR);
    escribir('FECHA CITA', new Date(primera.getFullYear(), primera.getMonth(), primera.getDate()));
    escribir('HORA CITA', formatAmPm(primera));
    escribir('HORARIOS PEDIDOS', JSON.stringify(pedidos));
    escribir('ULTIMO AVISO', '');
    escribir('FECHA ULTIMO AVISO', new Date());
    escribir('ULTIMO CAMBIO', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss') + ' · el interesado pidió ' + pedidos.length + ' horario(s) nuevos');
    _cacheApartados = null;
    const nombre = String(valorCita(fila, col, 'NOMBRE') || '');
    const precal = String(valorCita(fila, col, 'NOTAS') || '').split(' · Acceso')[0];
    _correoPropietarioSolicitud(inm, idCita, nombre, precal, pedidos);
    _correoAgenteCoordinado(inm, nombre, String(valorCita(fila, col, 'CELULAR') || ''), String(valorCita(fila, col, 'CORREO') || ''), precal,
      `👥 ${nombre} pidió otros horarios · ${inm.id}`, 'VISITA POR COORDINAR',
      'Pidió estos horarios:<br>' + pedidos.map(t => '• ' + _textoHorario(t)).join('<br>') + '<br><br>Ya le escribimos al propietario.');
    return { success: true, idCita: idCita, modo: 'COORDINADO', agendada: false };
  } finally {
    lock.releaseLock();
  }
}

/** Datos de la solicitud para visita.html cuando el interesado llega desde su correo. */
function infoSolicitudCoordinada(datos) {
  const cita = _citaPorId(datos.c);
  if (!cita) return { ok: false };
  const { col, fila } = cita;
  if (!datos.t || String(datos.t) !== String(valorCita(fila, col, 'TOKEN PROPIETARIO') || '')) return { ok: false };
  return {
    ok: true,
    nombre: String(valorCita(fila, col, 'NOMBRE') || ''),
    estado: String(valorCita(fila, col, 'ESTADO') || '').trim(),
    cruce: leerDisponibilidad(valorCita(fila, col, 'ID INMUEBLE')).bloques.filter(t => t > Date.now() + TIPOS_AGENDA.INTERESADO.anticipacionMin * 60000),
    descartados: _descartadosDe(fila, col)
  };
}

// ---------- Propietario (coordinar.html) ----------

/** Lo que ve el propietario al abrir su enlace. */
function infoCoordinarPropietario(datos) {
  const r = _inmuebleDelPropietario(datos);
  if (r.error) return { ok: false, mensaje: r.error };
  const inm = r.inm;
  const disp = leerDisponibilidad(inm.id);
  let solicitud = null;
  if (datos.c) {
    const cita = _citaPorId(datos.c);
    if (cita && String(valorCita(cita.fila, cita.col, 'ID INMUEBLE')) === inm.id) {
      const { fila, col } = cita;
      const estado = String(valorCita(fila, col, 'ESTADO') || '').trim();
      const limite = Date.now() + MIN_CAIDA_PEDIDO * 60000;
      const f = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
      solicitud = {
        idCita: String(datos.c),
        nombre: String(valorCita(fila, col, 'NOMBRE') || ''),
        notas: String(valorCita(fila, col, 'NOTAS') || '').split(' · Acceso')[0],
        estado: estado === ESTADO_POR_COORDINAR ? (_pedidosDe(fila, col).length ? 'PIDE' : 'ESPERA_INTERESADO')
          : (['CANCELADA', 'SIN RESPUESTA'].indexOf(estado) !== -1 ? 'CANCELADA' : (['ASISTIDA', 'INASISTIDA'].indexOf(estado) !== -1 ? 'CERRADA' : 'AGENDADA')),
        pedidos: _pedidosDe(fila, col).filter(t => t > limite).map(t => ({ timestamp: t, texto: _textoHorario(t) })),
        agendada: f ? _textoHorario(f.getTime()) : ''
      };
    }
  }
  return {
    ok: true,
    propietario: (inm.propietario || '').split(' ')[0],
    inmueble: { tipo: inm.tipoInmueble, barrio: inm.barrio, direccion: inm.direccion },
    quienAbre: disp.quienAbre, celularAbre: disp.celularAbre,
    marcados: disp.bloques.length,
    solicitud: solicitud
  };
}

/** Horarios libres de Leonardo de lunes a sábado de una semana, con lo que el propietario ya marcó. */
function semanaCoordinarPropietario(datos) {
  const r = _inmuebleDelPropietario(datos);
  if (r.error) return { success: false, error: r.error };
  const lunes = agLeerDia(datos.lunes);
  if (!lunes) return { success: false, error: 'Fecha no válida' };
  const marcados = leerDisponibilidad(r.inm.id).bloques;
  let pedidos = [];
  if (datos.c) { const c = _citaPorId(datos.c); if (c) pedidos = _pedidosDe(c.fila, c.col); }
  // La semana completa de una vez: un solo viaje a cada calendario (antes eran 6 y
  // la página tardaba unos 11 s en mostrar los horarios)
  const inicioSemana = new Date(agMs(lunes, 0, 0));
  const finSemana = new Date(inicioSemana.getTime() + 6 * 86400000);
  const eventos = CalendarApp.getDefaultCalendar().getEvents(inicioSemana, finSemana)
    .map(e => ({ inicio: e.getStartTime().getTime(), fin: e.getEndTime().getTime() }));
  const festivos = {};
  try {
    const cal = CalendarApp.getCalendarById(CONFIG_AGENDA.CALENDARIO_FESTIVOS_COLOMBIA);
    (cal ? cal.getEvents(inicioSemana, finSemana) : []).forEach(e => {
      festivos[Utilities.formatDate(e.getStartTime(), 'America/Bogota', 'yyyy-MM-dd')] = e.getTitle();
    });
  } catch (e) { Logger.log('⚠️ No se pudo leer el calendario de festivos: ' + e.message); }
  const apartados = apartadosVigentes(String(datos.c || ''));

  const dias = [];
  for (let k = 0; k < 6; k++) {
    const d = new Date(Date.UTC(lunes.y, lunes.m - 1, lunes.d + k));
    const iso = Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
    const disp = agHorariosLibres({ dia: agLeerDia(iso), tipo: 'INTERESADO', ocupados: eventos, apartados: apartados, ahoraMs: Date.now(), festivo: festivos[iso] || '' });
    dias.push({
      fecha: iso,
      titulo: DIAS_SEMANA_LARGOS[d.getUTCDay()] + ' ' + d.getUTCDate(),
      motivo: !disp.slots.length ? disp.motivo : '',
      slots: disp.slots.map(s => ({ timestamp: s.timestamp, horaAmPm: s.horaAmPm, marcado: marcados.indexOf(s.timestamp) !== -1, pedido: pedidos.indexOf(s.timestamp) !== -1 }))
    });
  }
  return { success: true, dias: dias };
}

/** El propietario acepta uno de los horarios que pidió el interesado. */
function aceptarHorarioPropietario(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const r = _inmuebleDelPropietario(datos);
    if (r.error) return { ok: false, mensaje: r.error };
    const cita = _citaPorId(datos.c);
    if (!cita || String(valorCita(cita.fila, cita.col, 'ID INMUEBLE')) !== r.inm.id) return { ok: false, mensaje: 'No encontramos esta solicitud.' };
    if (String(valorCita(cita.fila, cita.col, 'ESTADO') || '').trim() !== ESTADO_POR_COORDINAR) return { ok: false, mensaje: 'Esta solicitud ya no está pendiente.' };
    const ts = Number(datos.timestamp);
    if (_pedidosDe(cita.fila, cita.col).indexOf(ts) === -1) return { ok: false, mensaje: 'Ese horario ya no está en la solicitud.' };
    if (!_horarioLibre(ts, String(datos.c))) return { ok: false, mensaje: 'Ese horario ya no está libre. Marca otros horarios que puedas.' };
    if (datos.quienAbre !== undefined) _guardarQuienAbre(r.inm.id, datos.quienAbre, datos.celularAbre);
    _agendarVisitaCoordinada(cita.sheet, cita.col, cita.numFila, cita.fila, r.inm, ts, 'propietario');
    return { ok: true, mensaje: 'Listo: la visita quedó para el ' + _textoHorario(ts) + '. Te llegará un correo con los detalles.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * El propietario guarda los horarios que puede en una semana (y quién abre). Si viene
 * de una solicitud y no aceptó ninguno de los pedidos, al interesado le llega el
 * correo para elegir entre el cruce.
 */
function guardarDisponibilidadPropietario(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const r = _inmuebleDelPropietario(datos);
    if (r.error) return { ok: false, mensaje: r.error };
    const lunes = agLeerDia(datos.lunes);
    if (!lunes) return { ok: false, mensaje: 'Fecha no válida' };
    const lunesMs = agMs(lunes, 0, 0);
    const bloques = (Array.isArray(datos.bloques) ? datos.bloques : []).map(Number).filter(isFinite);
    const quien = String(datos.quienAbre || '').trim().slice(0, 80);
    const cel = String(datos.celularAbre || '').trim().slice(0, 30);
    const todos = _guardarDisponibilidad(r.inm.id, lunesMs, bloques, quien, cel);

    if (!datos.c) return { ok: true, mensaje: 'Guardamos tus horarios. Cuando un interesado elija uno, te avisamos.' };
    const cita = _citaPorId(datos.c);
    if (!cita || String(valorCita(cita.fila, cita.col, 'ID INMUEBLE')) !== r.inm.id) return { ok: true, mensaje: 'Guardamos tus horarios.' };
    const { sheet, col, numFila, fila } = cita;
    if (String(valorCita(fila, col, 'ESTADO') || '').trim() !== ESTADO_POR_COORDINAR) return { ok: true, mensaje: 'Guardamos tus horarios.' };

    // Si marcó uno de los que pidió el interesado, eso es aceptarlo
    const coincide = _pedidosDe(fila, col).filter(t => todos.indexOf(t) !== -1 && _horarioLibre(t, String(datos.c)));
    if (coincide.length) {
      _agendarVisitaCoordinada(sheet, col, numFila, fila, r.inm, coincide[0], 'propietario');
      return { ok: true, mensaje: 'Listo: la visita quedó para el ' + _textoHorario(coincide[0]) + ', uno de los horarios que pidió el interesado.' };
    }
    const cruce = todos.filter(t => t > Date.now() + TIPOS_AGENDA.INTERESADO.anticipacionMin * 60000);
    if (!cruce.length) return { ok: true, mensaje: 'Guardamos tus horarios.' };

    // Se liberan los pedidos (quedan como descartados: no se le vuelven a ofrecer) y el interesado elige del cruce
    const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
    escribir('HORARIOS DESCARTADOS', JSON.stringify(Array.from(new Set(_descartadosDe(fila, col).concat(_pedidosDe(fila, col)))).sort((a, b) => a - b)));
    escribir('HORARIOS PEDIDOS', '');
    escribir('ULTIMO AVISO', 'ELEGIR');
    escribir('FECHA ULTIMO AVISO', new Date());
    escribir('QUIEN ABRE', _quienAbreTexto(r.inm, { quienAbre: quien, celularAbre: cel }));
    escribir('ULTIMO CAMBIO', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss') + ' · el propietario marcó otros horarios: elige el interesado');
    _cacheApartados = null;
    const nombre = String(valorCita(fila, col, 'NOMBRE') || '');
    const correo = String(valorCita(fila, col, 'CORREO') || '');
    const token = String(valorCita(fila, col, 'TOKEN PROPIETARIO') || '');
    try {
      enviarCorreoCita(correo, '📅 Ya puedes elegir el horario de tu visita - Gold Life', 'ELIGE TU HORARIO', nombre,
        `El propietario del ${r.inm.tipoInmueble.toLowerCase()} en <strong>${r.inm.barrio || 'el inmueble'}</strong> no puede en los horarios que pediste, ` +
        'pero nos dejó los horarios en que sí puede.<br><br>Elige el que te sirva y tu visita queda agendada.',
        htmlBotonesCorreo([{ texto: '📅 Elegir horario', color: '#b8860b', url: urlVisitaInmueble(r.inm.id) + '&c=' + encodeURIComponent(datos.c) + '&t=' + encodeURIComponent(token) }]));
    } catch (e) { Logger.log('Error avisando al interesado: ' + e.message); }
    try {
      enviarCorreoCita(correoAgenteCitas(), `👥 El propietario marcó horarios · ${r.inm.id}`, 'VISITA POR COORDINAR', 'Agente',
        etiquetaTipoCitaHtml('INTERESADO') + `El propietario del inmueble <strong>${r.inm.id}</strong> no pudo en los horarios que pidió <strong>${nombre}</strong> y marcó los suyos:<br>` +
        cruce.slice(0, 12).map(t => '• ' + _textoHorario(t)).join('<br>') + '<br><br>Le pedimos al interesado que elija uno.', '');
    } catch (e) { Logger.log('Error avisando al agente: ' + e.message); }
    return { ok: true, mensaje: 'Guardamos tus horarios y le pedimos al interesado que elija uno. Te avisamos cuando quede agendada.' };
  } finally {
    lock.releaseLock();
  }
}

function _guardarQuienAbre(idInmueble, quien, cel) {
  const d = leerDisponibilidad(idInmueble);
  const sheet = _hojaDisponibilidad();
  const fila = [idInmueble, JSON.stringify(d.bloques), String(quien || '').trim().slice(0, 80), String(cel || '').trim().slice(0, 30),
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')];
  if (d.fila) sheet.getRange(d.fila, 1, 1, fila.length).setValues([fila]); else sheet.appendRow(fila);
}

function _quienAbreTexto(inm, disp) {
  if (disp && disp.quienAbre) return disp.quienAbre + (disp.celularAbre ? ' · ' + disp.celularAbre : '');
  return 'El propietario: ' + (inm.propietario || '') + (inm.celularPropietario ? ' · ' + inm.celularPropietario : '');
}

// ---------- Agendar (cualquiera de los caminos) ----------

/**
 * Deja la visita coordinada agendada en `ts`: evento en Calendar, estado por
 * confirmar (agendar no es confirmar), línea de avisos y correos a los tres.
 */
function _agendarVisitaCoordinada(sheet, col, numFila, fila, inm, ts, origen) {
  const tz = Session.getScriptTimeZone();
  const inicio = new Date(ts);
  const fin = new Date(ts + TIPOS_AGENDA.INTERESADO.duracionMin * 60000);
  const idCita = String(valorCita(fila, col, 'ID CITA'));
  const nombre = String(valorCita(fila, col, 'NOMBRE') || '');
  const correo = String(valorCita(fila, col, 'CORREO') || '');
  const celular = String(valorCita(fila, col, 'CELULAR') || '');
  const servicio = String(valorCita(fila, col, 'TIPO SERVICIO') || '');
  const direccion = String(valorCita(fila, col, 'DIRECCION') || '');
  const token = String(valorCita(fila, col, 'TOKEN PROPIETARIO') || '');
  const notas = String(valorCita(fila, col, 'NOTAS') || '');
  const disp = leerDisponibilidad(inm.id);
  const quienAbre = _quienAbreTexto(inm, disp);
  const yaEstaba = !!valorCita(fila, col, 'ID EVENTO CALENDAR');
  _liberarEventoCita(sheet, col, numFila, fila);

  const ev = CalendarApp.getDefaultCalendar().createEvent(
    `👥 VISITA ⏳ POR CONFIRMAR: ${inm.tipoInmueble} ${inm.barrio || ''} - ${nombre}`.replace(/\s+/g, ' '),
    inicio, fin, {
      description: `Visita de interesado (ID ${idCita}) al inmueble ${inm.id}\nAcceso: Con acompañamiento\nAbre: ${quienAbre}\n` +
        `Interesado: ${nombre}\nCelular: ${celular}\nCorreo: ${correo}\n${notas}`,
      location: direccion, guests: correo, sendInvites: false
    });

  const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
  escribir('ESTADO', ESTADOS_CITA.PENDIENTE);
  escribir('FECHA CITA', new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()));
  escribir('HORA CITA', formatAmPm(inicio));
  escribir('ID EVENTO CALENDAR', ev.getId());
  escribir('HORARIOS PEDIDOS', '');
  escribir('QUIEN ABRE', quienAbre);
  escribir('ULTIMO AVISO', avisoVigenteCita((ts - Date.now()) / 60000, 'INTERESADO'));
  escribir('FECHA ULTIMO AVISO', '');
  escribir('ULTIMO CAMBIO', Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss') + ' · agendada (' +
    ({ cruce: 'el interesado eligió un horario del propietario', propietario: 'el propietario aceptó el horario', interesado: 'el interesado eligió del cruce' }[origen] || origen) + ')');
  _cacheApartados = null;

  try {
    enviarPasoCita(yaEstaba ? 'REAGENDADA' : 'AGENDADA', correo, {
      idCita: idCita, idInmueble: inm.id, token: token, nombre: nombre, servicio: servicio, direccion: direccion,
      inicio: inicio, duracionMin: TIPOS_AGENDA.INTERESADO.duracionMin
    });
  } catch (e) { Logger.log('Error enviando el correo al interesado: ' + e.message); }

  try {
    if (inm.correoPropietario) {
      enviarCorreoCita(inm.correoPropietario, `📅 Visita agendada: ${_textoHorario(ts)} - Gold Life`, 'VISITA AGENDADA', (inm.propietario || '').split(' ')[0],
        `Quedó agendada una visita a tu ${inm.tipoInmueble.toLowerCase()} en <strong>${inm.barrio || ''}</strong>:<br><br>` +
        `🗓️ <strong>${_textoHorario(ts)}</strong> (40 minutos)<br>👤 Interesado: <strong>${nombre}</strong><br>🔑 Abre: ${quienAbre}<br><br>` +
        'Leonardo va a estar en la visita. Si algo cambia, te avisamos por aquí.',
        htmlBotonesCorreo([{ texto: '🗓️ Mis horarios', color: '#555555', url: urlCoordinarPropietario(inm.id) }]));
    }
  } catch (e) { Logger.log('Error avisando al propietario: ' + e.message); }

  _correoAgenteCoordinado(inm, nombre, celular, correo, notas.split(' · Acceso')[0],
    `👥 Visita agendada: ${nombre} · ${Utilities.formatDate(inicio, tz, 'dd/MM')} ${formatAmPm(inicio)} · ${inm.id}`, 'NUEVA VISITA',
    `🗓️ <strong>Visita:</strong> ${_textoHorario(ts)}<br>🔑 <strong>Abre:</strong> ${quienAbre}`);
}

function _liberarEventoCita(sheet, col, numFila, fila) {
  const idEvento = valorCita(fila, col, 'ID EVENTO CALENDAR');
  if (!idEvento) return;
  try { const ev = CalendarApp.getDefaultCalendar().getEventById(idEvento); if (ev) ev.deleteEvent(); } catch (e) {}
  if (col['ID EVENTO CALENDAR']) sheet.getRange(numFila, col['ID EVENTO CALENDAR']).setValue('');
}

// ---------- Correos ----------

function _correoPropietarioSolicitud(inm, idCita, nombre, precal, pedidos) {
  if (!inm.correoPropietario) { Logger.log('⚠️ El inmueble ' + inm.id + ' no tiene correo del propietario'); return; }
  try {
    enviarCorreoCita(inm.correoPropietario, '👥 Un interesado quiere visitar tu inmueble - Gold Life', 'SOLICITUD DE VISITA', (inm.propietario || '').split(' ')[0],
      `<strong>${nombre}</strong> quiere visitar tu ${inm.tipoInmueble.toLowerCase()} en <strong>${inm.barrio || ''}</strong> y pidió estos horarios:<br><br>` +
      pedidos.map(t => '• <strong>' + _textoHorario(t) + '</strong>').join('<br>') + '<br><br>' +
      (precal ? `💬 ${precal}<br><br>` : '') +
      'Elige el que te sirva o, si ninguno, marca los horarios en que tú (o quien abra) puedes esa semana.',
      htmlBotonesCorreo([{ texto: '📅 Responder', color: '#b8860b', url: urlCoordinarPropietario(inm.id, idCita) }]));
  } catch (e) { Logger.log('Error escribiendo al propietario: ' + e.message); }
}

function _correoAgenteCoordinado(inm, nombre, celular, correo, precal, asunto, titulo, detalleHtml) {
  try {
    const d = String(celular || '').replace(/\D/g, '');
    const wa = d.length === 10 ? '57' + d : d;
    enviarCorreoCita(correoAgenteCitas(), asunto, titulo, 'Agente',
      etiquetaTipoCitaHtml('INTERESADO') +
      `<strong>${nombre}</strong> · inmueble <strong>${inm.id}</strong> (${inm.tipoInmueble}, ${inm.barrio || 'sin barrio'}).<br><br>` +
      detalleHtml + '<br><br>' +
      `🔑 <strong>Acceso:</strong> Con acompañamiento del propietario<br>` +
      `🏠 <strong>Propietario:</strong> ${inm.propietario || 'N/A'} · ${inm.celularPropietario || 's/n'}<br>` +
      (precal ? `💬 ${precal}<br>` : '') + `📞 ${celular} · ✉️ ${correo}`,
      wa ? htmlBotonesCorreo([
        { texto: '📞 Llamar', color: '#555555', url: 'tel:+' + wa },
        { texto: '💬 WhatsApp', color: '#1f7a4d', url: 'https://wa.me/' + wa }
      ]) : '');
  } catch (e) { Logger.log('Error avisando al agente: ' + e.message); }
}

/** Aviso al propietario de una visita coordinada que se cancela o se reagenda. */
function avisarPropietarioVisitaCoordinada(fila, col, texto, asunto, titulo) {
  try {
    if (String(valorCita(fila, col, 'MODO VISITA') || '') !== 'COORDINADO') return;
    const inm = _inmueblePorId(valorCita(fila, col, 'ID INMUEBLE'));
    if (!inm || !inm.correoPropietario) return;
    enviarCorreoCita(inm.correoPropietario, asunto || '📅 Cambio en una visita a tu inmueble - Gold Life', titulo || 'CAMBIO EN LA VISITA',
      (inm.propietario || '').split(' ')[0], texto, '');
  } catch (e) { Logger.log('No se pudo avisar al propietario: ' + e.message); }
}

// ---------- Tarea automática ----------

/**
 * Revisa una solicitud POR COORDINAR (la llama ejecutarMotorAgenda). Devuelve true
 * si la manejó (la fila no sigue por las otras reglas).
 */
function revisarSolicitudCoordinada_(sheet, col, numFila, f) {
  if (String(valorCita(f, col, 'MODO VISITA') || '') !== 'COORDINADO') return false;
  const ahora = Date.now();
  const tz = Session.getScriptTimeZone();
  const idCita = String(valorCita(f, col, 'ID CITA'));
  const nombre = String(valorCita(f, col, 'NOMBRE') || '');
  const correo = String(valorCita(f, col, 'CORREO') || '');
  const idInm = String(valorCita(f, col, 'ID INMUEBLE') || '');
  const ultimo = String(valorCita(f, col, 'ULTIMO AVISO') || '').trim();
  const fechaUltimo = valorCita(f, col, 'FECHA ULTIMO AVISO');
  const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
  const pedidos = _pedidosDe(f, col);

  // El interesado debe elegir del cruce: si ya no queda ningún horario del propietario, se cierra
  if (ultimo === 'ELEGIR') {
    const cruce = leerDisponibilidad(idInm).bloques.filter(t => t > ahora + TIPOS_AGENDA.INTERESADO.anticipacionMin * 60000);
    if (!cruce.length) {
      _cancelarSolicitudCoordinada_(sheet, col, numFila, f, 'cancelada: el interesado no eligió y pasaron los horarios del propietario');
      try {
        enviarCorreoCita(correo, '📅 Tu solicitud de visita venció - Gold Life', 'SOLICITUD VENCIDA', nombre,
          'Pasaron los horarios que nos dio el propietario sin que eligieras uno. Si aún quieres la visita, pide nuevos horarios.',
          htmlBotonesCorreo([{ texto: '📅 Pedir otro horario', color: '#b8860b', url: urlVisitaInmueble(idInm) }]));
      } catch (e) { Logger.log('Error avisando a ' + idCita + ': ' + e.message); }
    }
    return true;
  }

  // Cada horario pedido se cae 2 h antes de su hora
  const vigentes = pedidos.filter(t => t - ahora > MIN_CAIDA_PEDIDO * 60000);
  if (vigentes.length !== pedidos.length) {
    escribir('HORARIOS PEDIDOS', vigentes.length ? JSON.stringify(vigentes) : '');
    _cacheApartados = null;
    if (vigentes.length) {
      const p = new Date(vigentes[0]);
      escribir('FECHA CITA', new Date(p.getFullYear(), p.getMonth(), p.getDate()));
      escribir('HORA CITA', formatAmPm(p));
    }
  }
  if (pedidos.length && !vigentes.length) {
    _cancelarSolicitudCoordinada_(sheet, col, numFila, f, 'cancelada: el propietario no respondió a tiempo');
    try {
      enviarCorreoCita(correo, '📅 No logramos coordinar tu visita - Gold Life', 'ELIGE OTRO HORARIO', nombre,
        'El propietario no alcanzó a confirmar ninguno de los horarios que pediste y ya están muy cerca, así que los liberamos.<br><br>' +
        'Si aún quieres la visita, pide otros horarios y volvemos a coordinar con él.',
        htmlBotonesCorreo([{ texto: '📅 Pedir otro horario', color: '#b8860b', url: urlVisitaInmueble(idInm) }]));
      enviarCorreoCita(correoAgenteCitas(), `❌ Se cayó la visita de ${nombre} · ${idInm}: el propietario no respondió`, 'VISITA NO COORDINADA', 'Agente',
        etiquetaTipoCitaHtml('INTERESADO') + `Los horarios que pidió <strong>${nombre}</strong> para el inmueble <strong>${idInm}</strong> se cayeron porque el propietario no respondió. Ya se liberaron y al interesado le llegó un correo para pedir otros.`, '');
    } catch (e) { Logger.log('Error avisando la caída de ' + idCita + ': ' + e.message); }
    return true;
  }

  // 30 min sin respuesta del propietario → aviso a Leonardo para que lo llame (una vez)
  const desde = fechaUltimo instanceof Date ? fechaUltimo.getTime() : 0;
  if (vigentes.length && !ultimo && desde && ahora - desde >= MIN_AVISO_LLAMAR * 60000) {
    const inm = _inmueblePorId(idInm);
    const d = String((inm && inm.celularPropietario) || '').replace(/\D/g, '');
    const wa = d.length === 10 ? '57' + d : d;
    try {
      enviarCorreoCita(correoAgenteCitas(), `📞 Llama al propietario de ${idInm}: no ha respondido la visita de ${nombre}`, 'LLAMA AL PROPIETARIO', 'Agente',
        etiquetaTipoCitaHtml('INTERESADO') +
        `Hace 30 minutos le pedimos al propietario <strong>${(inm && inm.propietario) || ''}</strong> que confirmara la visita de <strong>${nombre}</strong> y no ha respondido.<br><br>` +
        'Horarios pedidos (apartados en tu agenda):<br>' + vigentes.map(t => '• ' + _textoHorario(t)).join('<br>') +
        '<br><br>Cada uno se cae 2 horas antes si nadie lo confirma.',
        htmlBotonesCorreo([].concat(wa ? [{ texto: '📞 Llamar al propietario', color: '#555555', url: 'tel:+' + wa }, { texto: '💬 WhatsApp', color: '#1f7a4d', url: 'https://wa.me/' + wa }] : [],
          [{ texto: '📅 Su página', color: '#b8860b', url: urlCoordinarPropietario(idInm, idCita) }])));
    } catch (e) { Logger.log('Error avisando al agente de ' + idCita + ': ' + e.message); }
    escribir('ULTIMO AVISO', 'LLAMAR');
    escribir('FECHA ULTIMO AVISO', new Date());
  }
  return true;
}

function _cancelarSolicitudCoordinada_(sheet, col, numFila, f, motivo) {
  const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
  escribir('ESTADO', ESTADOS_CITA.CANCELADA);
  escribir('HORARIOS PEDIDOS', '');
  escribir('ULTIMO CAMBIO', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss') + ' · ' + motivo);
  _cacheApartados = null;
}
