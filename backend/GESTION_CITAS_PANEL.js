/**
 * CONTROL DE CITAS DESDE EL PANEL DEL AGENTE (oct-2026)
 *
 * Leonardo quiere que todo el control de las citas quede en un solo lugar: la
 * Agenda de Citas del portafolio. Desde la ventana de cada cita puede:
 *   - reagendar a un horario libre (lo acordó por teléfono con el propietario),
 *   - cancelarla con un motivo,
 *   - marcar si asistió o no,
 *   - guardar sus notas.
 *
 * Reagendar o cancelar le avisa al propietario por correo, igual que cuando él
 * mismo usa los botones de su correo. Nada se edita "a mano": cada acción mueve
 * a la vez la hoja, el evento de Google Calendar y el correo.
 *
 * Todas las acciones exigen la sesión de Google del agente, validada en el
 * servidor (_verificarAgenteGoogle).
 */

// En el panel el agente ya habló con el propietario: puede reagendar con 1 h de aviso.
const PANEL_ANTICIPACION_MIN = 60;

/** Tipo de agenda de una cita (PROPIETARIO, INTERESADO…). Vacío = citas viejas, de propietario. */
function tipoDeCita(cita) {
  const t = String(valorCita(cita.fila, cita.col, 'TIPO AGENDA') || '').trim().toUpperCase();
  return TIPOS_AGENDA[t] ? t : 'PROPIETARIO';
}

/** Horarios libres de un día para reagendar una cita (excluye el evento de la propia cita). */
function disponibilidadReagendarCita(datos) {
  const permiso = _verificarAgenteGoogle(datos && datos.credential);
  if (!permiso.ok) return { success: false, message: permiso.mensaje };
  const cita = _citaPorId(datos.idCita);
  if (!cita) return { success: false, message: 'No encontramos esa cita.' };
  return obtenerDisponibilidadAgenda(datos.fecha, tipoDeCita(cita), {
    anticipacionMin: PANEL_ANTICIPACION_MIN,
    excluirEventoId: String(valorCita(cita.fila, cita.col, 'ID EVENTO CALENDAR') || '')
  });
}

/**
 * Aplica una acción del panel sobre una cita.
 * datos: { credential, idCita, tipo: 'reagendar'|'cancelar'|'asistio'|'noasistio'|'notas', timestamp?, motivo?, texto? }
 */
function gestionarCitaPanel(datos) {
  const permiso = _verificarAgenteGoogle(datos && datos.credential);
  if (!permiso.ok) return { success: false, message: permiso.mensaje };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cita = _citaPorId(datos.idCita);
    if (!cita) return { success: false, message: 'No encontramos esa cita.' };
    const { sheet, col, numFila, fila } = cita;
    const tz = Session.getScriptTimeZone();
    const ahoraTxt = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss');
    const estado = String(valorCita(fila, col, 'ESTADO') || '').trim();
    const nombre = String(valorCita(fila, col, 'NOMBRE') || '');
    const correo = String(valorCita(fila, col, 'CORREO') || '');
    const servicio = String(valorCita(fila, col, 'TIPO SERVICIO') || '');
    const direccion = String(valorCita(fila, col, 'DIRECCION') || '');
    const fechaActual = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
    const textoFecha = (d) => Utilities.formatDate(d, tz, 'dd/MM/yyyy') + ' a las ' + formatAmPm(d);
    const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };

    switch (datos.tipo) {
      case 'notas': {
        escribir('NOTAS AGENTE', String(datos.texto || '').slice(0, 2000));
        return { success: true, mensaje: 'Notas guardadas.' };
      }

      case 'editar': {
        // Datos de contacto y del inmueble. La fecha y la hora NO se editan aquí:
        // eso es "reagendar", que revisa la disponibilidad y avisa al propietario.
        const c = datos.campos || {};
        const limpio = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);
        const nuevos = {
          NOMBRE: limpio(c.nombre, 120), CELULAR: limpio(c.celular, 30), CORREO: limpio(c.correo, 120),
          'TIPO SERVICIO': limpio(c.servicio, 80), DIRECCION: limpio(c.direccion, 200)
        };
        if (!nuevos.NOMBRE) return { success: false, message: 'El nombre no puede quedar vacío.' };
        if (nuevos.CORREO && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevos.CORREO)) return { success: false, message: 'El correo no es válido.' };
        Object.keys(nuevos).forEach(k => escribir(k, nuevos[k]));
        escribir('ULTIMO CAMBIO', ahoraTxt + ' · agente editó los datos desde el panel');

        const idEv = String(valorCita(fila, col, 'ID EVENTO CALENDAR') || '');
        try {
          const ev = idEv ? CalendarApp.getDefaultCalendar().getEventById(idEv) : null;
          if (ev) {
            ev.setTitle(tituloEventoCita(estado, nuevos['TIPO SERVICIO'], nuevos.NOMBRE));
            ev.setLocation(nuevos.DIRECCION);
            ev.setDescription(`Cita ${datos.idCita}\nPropietario: ${nuevos.NOMBRE}\nCelular: ${nuevos.CELULAR}\n` +
              `Correo: ${nuevos.CORREO}\nServicio: ${nuevos['TIPO SERVICIO']}\nDirección: ${nuevos.DIRECCION || 'N/A'}`);
          }
        } catch (e) { Logger.log('No se pudo actualizar el evento: ' + e.message); }
        return { success: true, mensaje: 'Datos actualizados.' };
      }

      case 'asistio':
      case 'noasistio': {
        if (!fechaActual || fechaActual.getTime() > Date.now()) {
          return { success: false, message: 'La asistencia se marca cuando la cita ya empezó.' };
        }
        if (estado === ESTADOS_CITA.CANCELADA) return { success: false, message: 'La cita está cancelada.' };
        const nuevo = datos.tipo === 'asistio' ? ESTADOS_CITA.ASISTIDA : ESTADOS_CITA.INASISTIDA;
        aplicarCambioEstadoCita(sheet, col, numFila, fila, nuevo, 'agente marcó ' + nuevo.toLowerCase() + ' desde el panel');
        return { success: true, mensaje: nuevo === ESTADOS_CITA.ASISTIDA ? 'Marcada: asistió.' : 'Marcada: no asistió.' };
      }

      case 'cancelar': {
        if (ESTADOS_CERRADOS_CITA.indexOf(estado) !== -1) {
          return { success: false, message: 'La cita ya está cerrada (' + estado.toLowerCase() + ').' };
        }
        const motivo = String(datos.motivo || '').trim();
        if (!motivo) return { success: false, message: 'Escribe el motivo de la cancelación.' };
        aplicarCambioEstadoCita(sheet, col, numFila, fila, ESTADOS_CITA.CANCELADA, 'agente canceló desde el panel: ' + motivo);
        try {
          enviarCorreoCita(
            correo,
            `❌ Tu cita del ${fechaActual ? textoFecha(fechaActual) : ''} fue cancelada - Gold Life`,
            'CITA CANCELADA',
            nombre,
            `Te informamos que tu cita para el servicio de <strong>${servicio}</strong>` +
            (fechaActual ? ` del <strong>${textoFecha(fechaActual)}</strong>` : '') + ' fue cancelada.<br><br>' +
            'Si deseas una nueva visita, puedes agendarla cuando quieras desde nuestra página.',
            htmlBotonesCorreo([{ texto: '📅 Agendar de nuevo', color: '#b8860b', url: urlAgendarDeNuevo(datosCorreoDeCita(fila, col).idInmueble) }])
          );
        } catch (e) { Logger.log('No se pudo avisar la cancelación: ' + e.message); }
        // Visita con acompañamiento: el propietario no se queda esperando para abrir
        avisarPropietarioVisitaCoordinada(fila, col,
          `La visita de <strong>${nombre}</strong>` + (fechaActual ? ` del <strong>${textoFecha(fechaActual)}</strong>` : '') +
          ' se canceló. No tienes que abrir el inmueble.', '❌ Visita cancelada - Gold Life', 'VISITA CANCELADA');
        const esVisitaCoordinada = String(valorCita(fila, col, 'MODO VISITA') || '') === 'COORDINADO';
        return { success: true, mensaje: 'Cita cancelada. Le avisamos a ' + (nombre || 'la persona') + ' por correo' + (esVisitaCoordinada ? ' y al propietario.' : '.') };
      }

      case 'reagendar': {
        const r = moverCita(cita, Number(datos.timestamp), { anticipacionMin: PANEL_ANTICIPACION_MIN, quien: 'agente' });
        if (r.ok) avisarPropietarioVisitaCoordinada(fila, col, `La entrega con <strong>${nombre}</strong> quedó para el <strong>${r.textoNueva}</strong>.`, '🔑 Cambió la fecha de la entrega - Gold Life', 'NUEVA FECHA');
        return r.ok
          ? { success: true, mensaje: 'Cita reagendada para el ' + r.textoNueva + '. Le avisamos a ' + (nombre || 'la persona') + ' por correo.' }
          : { success: false, message: r.mensaje };
      }

      case 'reabrirEntrega': {
        if (String(valorCita(fila, col, 'TIPO AGENDA')) !== 'ENTREGA') return { success: false, message: 'Esta acción es solo para entregas.' };
        if (estado === ESTADOS_CITA.ASISTIDA) return { success: false, message: 'La entrega ya se hizo.' };
        if (estado === ESTADO_POR_COORDINAR) return { success: false, message: 'La fecha ya está abierta: esperamos a que la elijan.' };
        const r = reabrirSalaEntrega_(sheet, col, numFila, fila, String(datos.motivo || '').trim());
        return r.ok ? { success: true, mensaje: r.mensaje } : { success: false, message: r.mensaje };
      }

      default:
        return { success: false, message: 'Acción no válida.' };
    }
  } catch (e) {
    Logger.log('Error en gestionarCitaPanel: ' + e.message);
    return { success: false, message: 'No se pudo aplicar el cambio: ' + e.message };
  } finally {
    lock.releaseLock();
  }
}

/** Busca una cita por ID. null si no existe. */
function _citaPorId(idCita) {
  const { sheet, col } = hojaCitasConColumnas();
  const ultima = sheet.getLastRow();
  if (ultima < 2) return null;
  const filas = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
  const idx = filas.findIndex(f => String(valorCita(f, col, 'ID CITA')).trim() === String(idCita || '').trim());
  return idx === -1 ? null : { sheet: sheet, col: col, numFila: idx + 2, fila: filas[idx] };
}


/**
 * Mueve una cita a otro horario: revisa que siga libre, mueve (o recrea) el
 * evento de Calendar, la deja CONFIRMADA y le manda al propietario el correo con
 * la nueva fecha. La usan el panel del agente y el propietario desde su correo.
 * @param {{sheet,col,numFila,fila}} cita  de _citaPorId
 * @param {number} timestamp  inicio nuevo (uno de los horarios que dio el motor)
 * @param {{anticipacionMin:number, quien:'agente'|'propietario'}} op
 * @return {{ok:boolean, mensaje?:string, textoNueva?:string, textoAntes?:string}}
 */
function moverCita(cita, timestamp, op) {
  const { sheet, col, numFila, fila } = cita;
  const tz = Session.getScriptTimeZone();
  const ahoraTxt = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss');
  const escribir = (n, v) => { if (col[n]) sheet.getRange(numFila, col[n]).setValue(v); };
  const idCita = String(valorCita(fila, col, 'ID CITA'));
  const estado = String(valorCita(fila, col, 'ESTADO') || '').trim();
  const nombre = String(valorCita(fila, col, 'NOMBRE') || '');
  const correo = String(valorCita(fila, col, 'CORREO') || '');
  const servicio = String(valorCita(fila, col, 'TIPO SERVICIO') || '');
  const direccion = String(valorCita(fila, col, 'DIRECCION') || '');
  const fechaActual = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
  const textoFecha = (d) => Utilities.formatDate(d, tz, 'dd/MM/yyyy') + ' a las ' + formatAmPm(d);

  if (estado === ESTADOS_CITA.ASISTIDA) return { ok: false, mensaje: 'Esta cita ya se realizó.' };
  const inicio = new Date(Number(timestamp));
  if (isNaN(inicio.getTime())) return { ok: false, mensaje: 'Horario no válido.' };

  // El horario tiene que seguir libre (se revisa aquí, no se confía en la pantalla)
  const idEvento = String(valorCita(fila, col, 'ID EVENTO CALENDAR') || '');
  const diaIso = Utilities.formatDate(inicio, 'America/Bogota', 'yyyy-MM-dd');
  const tipo = tipoDeCita(cita);
  const disp = obtenerDisponibilidadAgenda(diaIso, tipo, { anticipacionMin: op.anticipacionMin, excluirEventoId: idEvento });
  if (!disp.success || !disp.slots.some(x => x.timestamp === inicio.getTime())) {
    return { ok: false, mensaje: 'Ese horario ya no está libre. Elige otro.' };
  }

  const fin = new Date(inicio.getTime() + TIPOS_AGENDA[tipo].duracionMin * 60000);
  const cal = CalendarApp.getDefaultCalendar();
  let evento = null;
  try { evento = idEvento ? cal.getEventById(idEvento) : null; } catch (e) { evento = null; }
  // Agendar no es confirmar (Leonardo, 14-oct-2026): si el propietario reagenda,
  // vuelve a POR CONFIRMAR y sigue el flujo normal (recordatorio, y si no confirma
  // a tiempo se libera). Si reagenda el agente desde el panel, ya lo acordó con
  // él por teléfono: queda confirmada.
  const estadoNuevo = op.quien === 'agente' ? ESTADOS_CITA.CONFIRMADA : ESTADOS_CITA.PENDIENTE;
  const titulo = tituloEventoCita(estadoNuevo, servicio, nombre);
  if (evento) {
    evento.setTime(inicio, fin);
    evento.setTitle(titulo);
  } else {
    // Cancelada o "quiere reagendar" ya habían borrado el evento: se crea otro
    evento = cal.createEvent(titulo, inicio, fin, {
      description: `Cita reagendada (ID ${idCita})\nPropietario: ${nombre}\n` +
        `Celular: ${valorCita(fila, col, 'CELULAR')}\nCorreo: ${correo}\nServicio: ${servicio}\nDirección: ${direccion || 'N/A'}`,
      location: direccion,
      // Igual que al agendar: invitado sin correo de Google, para que en Gmail le
      // aparezca sola en su calendario
      guests: correo,
      sendInvites: false
    });
    escribir('ID EVENTO CALENDAR', evento.getId());
  }

  escribir('FECHA CITA', new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()));
  if (col['FECHA CITA']) sheet.getRange(numFila, col['FECHA CITA']).setNumberFormat('dd/MM/yyyy');
  escribir('HORA CITA', formatAmPm(inicio));
  escribir('ESTADO', estadoNuevo);
  // La línea de avisos vuelve a empezar desde la fecha nueva (CORREOS_CITA.js)
  escribir('ULTIMO AVISO', avisoVigenteCita((inicio.getTime() - Date.now()) / 60000, tipo));
  escribir('FECHA ULTIMO AVISO', '');
  const antes = fechaActual ? textoFecha(fechaActual) : '';
  escribir('ULTIMO CAMBIO', ahoraTxt + ' · ' + (op.quien === 'agente' ? 'agente reagendó desde el panel' : 'propietario reagendó desde su correo') +
    (antes ? ' (antes: ' + antes + ')' : ''));

  try {
    // Solo informa, sin botones: la confirmación se pide 1 hora antes
    enviarPasoCita('REAGENDADA', correo, {
      idCita: idCita, idInmueble: tipo === 'INTERESADO' ? String(valorCita(fila, col, 'ID INMUEBLE') || '') : '', token: String(valorCita(fila, col, 'TOKEN PROPIETARIO') || ''), nombre: nombre,
      servicio: servicio, direccion: direccion, inicio: inicio, confirmada: op.quien === 'agente', duracionMin: TIPOS_AGENDA[tipo].duracionMin
    });
  } catch (e) { Logger.log('No se pudo avisar el cambio de fecha: ' + e.message); }
  return { ok: true, textoNueva: textoFecha(inicio), textoAntes: antes };
}

// ---------- El propietario reagenda solo, desde el botón de su correo (frontend/cita.html) ----------

/** Valida el token del propietario y que la cita admita reagendar. */
function _citaDelPropietario(idCita, token) {
  const cita = _citaPorId(idCita);
  if (!cita) return { error: 'No encontramos esta cita.' };
  const t = String(token || '');
  if (!t || t !== String(valorCita(cita.fila, cita.col, 'TOKEN PROPIETARIO') || '')) return { error: 'Este enlace no es válido para esta acción.' };
  const estado = String(valorCita(cita.fila, cita.col, 'ESTADO') || '').trim();
  // Una cita cancelada (p. ej. liberada por no confirmar) se puede revivir
  // reagendando: el correo de "cita liberada" trae ese botón.
  if (['ASISTIDA', 'INASISTIDA'].indexOf(estado) !== -1) {
    return { error: 'Esta cita ya está cerrada (' + estado.toLowerCase() + '). Si quieres una visita nueva, agéndala desde nuestra página.' };
  }
  return { cita: cita };
}

/** Datos para la pantalla de reagendar (no cambia nada). */
function infoReagendarPropietario(datos) {
  const r = _citaDelPropietario(datos.idCita, datos.t);
  if (r.error) return { ok: false, mensaje: r.error };
  const { fila, col } = r.cita;
  const tz = Session.getScriptTimeZone();
  const f = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
  return {
    ok: true,
    nombre: String(valorCita(fila, col, 'NOMBRE') || ''),
    servicio: String(valorCita(fila, col, 'TIPO SERVICIO') || ''),
    fechaActual: f ? Utilities.formatDate(f, tz, 'dd/MM/yyyy') + ' a las ' + formatAmPm(f) : '',
    // Visita con acompañamiento (bloque 2): se reagenda en la página del inmueble,
    // contra los horarios del propietario, no en la agenda abierta de Leonardo
    // Entrega: la fecha la aprueban inquilino y propietario; se reabre la sala, no se mueve sola
    esEntrega: String(valorCita(fila, col, 'TIPO AGENDA') || '') === 'ENTREGA',
    urlCoordinada: String(valorCita(fila, col, 'MODO VISITA') || '') === 'COORDINADO'
      ? urlVisitaInmueble(valorCita(fila, col, 'ID INMUEBLE')) + '&c=' + encodeURIComponent(datos.idCita) + '&t=' + encodeURIComponent(datos.t)
      : ''
  };
}

/** Horarios libres de un día para el propietario (su propia cita no cuenta como ocupada). */
function disponibilidadReagendarPropietario(datos) {
  const r = _citaDelPropietario(datos.idCita, datos.t);
  if (r.error) return { success: false, error: r.error };
  return obtenerDisponibilidadAgenda(datos.fecha, tipoDeCita(r.cita), {
    excluirEventoId: String(valorCita(r.cita.fila, r.cita.col, 'ID EVENTO CALENDAR') || '')
  });
}

/** El propietario confirma el horario nuevo. Al agente le llega un aviso corto. */
function reagendarPorPropietario(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const r = _citaDelPropietario(datos.idCita, datos.t);
    if (r.error) return { ok: false, mensaje: r.error };
    const nombre = String(valorCita(r.cita.fila, r.cita.col, 'NOMBRE') || '');
    const m = moverCita(r.cita, Number(datos.timestamp), { anticipacionMin: TIPOS_AGENDA[tipoDeCita(r.cita)].anticipacionMin, quien: 'propietario' });
    if (!m.ok) return { ok: false, mensaje: m.mensaje };
    try {
      enviarCorreoCita(
        correoAgenteCitas(),
        `🔄 ${nombre} reagendó su cita para el ${m.textoNueva}`,
        'CITA REAGENDADA',
        'Agente',
        etiquetaTipoCitaHtml(valorCita(r.cita.fila, r.cita.col, 'TIPO AGENDA')) +
        `<strong>${nombre}</strong> reagendó su cita desde el correo.<br><br>` +
        (m.textoAntes ? `Antes: ${m.textoAntes}<br>` : '') + `<strong>Ahora: ${m.textoNueva}</strong><br><br>` +
        'Ya quedó movida en tu Calendar, por confirmar: una hora antes se le pedirá que la confirme. No tienes que hacer nada.',
        ''
      );
    } catch (e) { Logger.log('No se pudo avisar al agente: ' + e.message); }
    return { ok: true, mensaje: 'Tu cita quedó para el ' + m.textoNueva + '. Te avisaremos antes y, una hora antes, te pediremos que la confirmes.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * El inquilino tocó "Cambiar fecha" en un correo de su entrega: se reabre la sala para
 * que él y el propietario elijan otra (no se mueve sola, el propietario también aprueba).
 * Devuelve el enlace de su sala para llevarlo directo a proponer (24-oct-2026).
 */
function reabrirEntregaDesdeCorreo(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const r = _citaDelPropietario(datos.idCita, datos.t);
    if (r.error) return { ok: false, mensaje: r.error };
    const { sheet, col, numFila, fila } = r.cita;
    if (String(valorCita(fila, col, 'TIPO AGENDA') || '') !== 'ENTREGA') return { ok: false, mensaje: 'Esta acción es solo para entregas.' };
    const estado = String(valorCita(fila, col, 'ESTADO') || '').trim();
    if (estado === ESTADOS_CITA.ASISTIDA) return { ok: false, mensaje: 'La entrega ya se hizo.' };
    const url = urlSalaEntrega(datos.idCita, 'i', String(datos.t));
    if (estado === ESTADO_POR_COORDINAR) return { ok: true, url: url };
    const nombre = String(valorCita(fila, col, 'NOMBRE') || '');
    const antes = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
    reabrirSalaEntrega_(sheet, col, numFila, fila, 'el inquilino pidió cambiar la fecha');
    try {
      enviarCorreoCita(correoAgenteCitas(), `🔄 ${nombre} pidió cambiar la fecha de la entrega`, 'ENTREGA POR COORDINAR', 'Agente',
        etiquetaTipoCitaHtml('ENTREGA') + `<strong>${nombre}</strong> pidió cambiar la entrega` + (antes ? ` del <strong>${_textoHorario(antes.getTime())}</strong>` : '') +
        '. Se liberó tu calendario y le pedimos a él y al propietario que elijan otra fecha.', '');
    } catch (e) { Logger.log('No se pudo avisar al agente: ' + e.message); }
    return { ok: true, url: url };
  } finally {
    lock.releaseLock();
  }
}
