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

/** Horarios libres de un día para reagendar una cita (excluye el evento de la propia cita). */
function disponibilidadReagendarCita(datos) {
  const permiso = _verificarAgenteGoogle(datos && datos.credential);
  if (!permiso.ok) return { success: false, message: permiso.mensaje };
  const cita = _citaPorId(datos.idCita);
  if (!cita) return { success: false, message: 'No encontramos esa cita.' };
  return obtenerDisponibilidadAgenda(datos.fecha, 'PROPIETARIO', {
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
            htmlBotonesCorreo([{ texto: '📅 Agendar de nuevo', color: '#b8860b',
              url: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/' }])
          );
        } catch (e) { Logger.log('No se pudo avisar la cancelación: ' + e.message); }
        return { success: true, mensaje: 'Cita cancelada. Se le avisó al propietario por correo.' };
      }

      case 'reagendar': {
        if (estado === ESTADOS_CITA.ASISTIDA) return { success: false, message: 'Esta cita ya se realizó.' };
        const inicio = new Date(Number(datos.timestamp));
        if (isNaN(inicio.getTime())) return { success: false, message: 'Horario no válido.' };

        // El horario tiene que seguir libre (se revisa aquí, no se confía en la pantalla)
        const idEvento = String(valorCita(fila, col, 'ID EVENTO CALENDAR') || '');
        const diaIso = Utilities.formatDate(inicio, 'America/Bogota', 'yyyy-MM-dd');
        const disp = obtenerDisponibilidadAgenda(diaIso, 'PROPIETARIO', { anticipacionMin: PANEL_ANTICIPACION_MIN, excluirEventoId: idEvento });
        if (!disp.success || !disp.slots.some(x => x.timestamp === inicio.getTime())) {
          return { success: false, message: 'Ese horario ya no está libre. Elige otro.' };
        }

        const fin = new Date(inicio.getTime() + TIPOS_AGENDA.PROPIETARIO.duracionMin * 60000);
        const cal = CalendarApp.getDefaultCalendar();
        let evento = null;
        try { evento = idEvento ? cal.getEventById(idEvento) : null; } catch (e) { evento = null; }
        // El propietario ya aceptó la nueva hora por teléfono: queda confirmada
        const titulo = tituloEventoCita(ESTADOS_CITA.CONFIRMADA, servicio, nombre);
        if (evento) {
          evento.setTime(inicio, fin);
          evento.setTitle(titulo);
        } else {
          // Cancelada o "quiere reagendar" ya habían borrado el evento: se crea otro
          evento = cal.createEvent(titulo, inicio, fin, {
            description: `Cita reagendada desde el panel (ID ${datos.idCita})\nPropietario: ${nombre}\n` +
              `Celular: ${valorCita(fila, col, 'CELULAR')}\nCorreo: ${correo}\nServicio: ${servicio}\nDirección: ${direccion || 'N/A'}`,
            location: direccion
          });
          escribir('ID EVENTO CALENDAR', evento.getId());
        }

        escribir('FECHA CITA', new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()));
        if (col['FECHA CITA']) sheet.getRange(numFila, col['FECHA CITA']).setNumberFormat('dd/MM/yyyy');
        escribir('HORA CITA', formatAmPm(inicio));
        escribir('ESTADO', ESTADOS_CITA.CONFIRMADA);
        // Con menos de 24 h, este correo ya hace de recordatorio
        const horas = (inicio.getTime() - Date.now()) / 3600000;
        escribir('RECORDATORIO ENVIADO', horas <= 24 ? ahoraTxt : '');
        escribir('ULTIMO CAMBIO', ahoraTxt + ' · agente reagendó desde el panel' + (fechaActual ? ' (antes: ' + textoFecha(fechaActual) + ')' : ''));

        try {
          const tokenProp = String(valorCita(fila, col, 'TOKEN PROPIETARIO') || '');
          enviarCorreoCita(
            correo,
            `🔄 Tu cita quedó para el ${textoFecha(inicio)} - Gold Life`,
            'CITA REAGENDADA',
            nombre,
            `Como lo acordamos, tu cita para el servicio de <strong>${servicio}</strong> quedó en la nueva fecha:<br><br>` +
            `🗓️ <strong>Fecha:</strong> ${Utilities.formatDate(inicio, tz, 'dd/MM/yyyy')}<br>⏰ <strong>Hora:</strong> ${formatAmPm(inicio)}<br>` +
            `📍 <strong>Inmueble:</strong> ${direccion || 'A convenir'}` +
            (tokenProp ? '<br><br>Si algo cambia, puedes reagendar o cancelar aquí:' : ''),
            tokenProp ? htmlBotonesCorreo([
              { texto: '🔄 Reagendar', color: '#b8860b', url: urlEstadoCita(datos.idCita, ESTADOS_CITA.QUIERE_REAGENDAR, tokenProp) },
              { texto: '❌ Cancelar', color: '#a3322a', url: urlEstadoCita(datos.idCita, ESTADOS_CITA.CANCELADA, tokenProp) }
            ]) : ''
          );
        } catch (e) { Logger.log('No se pudo avisar el cambio de fecha: ' + e.message); }
        return { success: true, mensaje: 'Cita reagendada para el ' + textoFecha(inicio) + '. Se le avisó al propietario por correo.' };
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
