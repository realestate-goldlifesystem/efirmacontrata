// ==========================================
// MOTOR CRON - GESTIÓN ASÍNCRONA DE CITAS
// Sistema de Gestión Inmobiliaria
// Archivo: API_CRON_AGENDA.js
// ==========================================

/**
 * Instala el trigger horario. Solo hace falta una vez desde el editor
 * (ya está instalado: ejecutarMotorAgenda corre cada hora).
 */
function instalarCronAgenda() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'ejecutarMotorAgenda') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ejecutarMotorAgenda').timeBased().everyHours(1).create();
  Logger.log("✅ Cron Motor Agenda instalado para ejecutarse cada hora.");
}

/**
 * Motor principal. Corre cada hora y decide qué hacer con cada cita según el
 * tiempo que falta y su estado.
 *
 * ⚠️ Hasta sep-2026 este motor NO procesó ninguna cita: leía la fecha con
 * fecha.split('/') pero el Sheet la guarda como fecha real, así que fallaba en
 * silencio y la saltaba. Las cuatro citas de junio quedaron para siempre en
 * PENDIENTE sin recordatorio. Ahora la fecha se lee con fechaHoraDeCita().
 */
function ejecutarMotorAgenda() {
  try {
    const { sheet, col } = hojaCitasConColumnas();
    const ultima = sheet.getLastRow();
    if (ultima < 2) return;

    const tz = Session.getScriptTimeZone();
    const filas = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
    const ahora = new Date();
    const ahoraTxt = Utilities.formatDate(ahora, tz, "dd/MM/yyyy HH:mm:ss");

    const escribir = (numFila, nombreCol, valor) => {
      if (col[nombreCol]) sheet.getRange(numFila, col[nombreCol]).setValue(valor);
    };

    filas.forEach((f, idx) => {
      const numFila = idx + 2;
      const idCita = String(valorCita(f, col, 'ID CITA') || '').trim();
      if (!idCita) return;

      const fechaCita = fechaHoraDeCita(valorCita(f, col, 'FECHA CITA'), valorCita(f, col, 'HORA CITA'));
      if (!fechaCita) return;

      const estado = String(valorCita(f, col, 'ESTADO') || '').trim();
      const nombre = valorCita(f, col, 'NOMBRE');
      const correo = valorCita(f, col, 'CORREO');
      const servicio = valorCita(f, col, 'TIPO SERVICIO');
      const direccion = valorCita(f, col, 'DIRECCION');
      const tokenProp = valorCita(f, col, 'TOKEN PROPIETARIO');
      const tokenAgente = valorCita(f, col, 'TOKEN AGENTE');
      const recordatorioEnviado = String(valorCita(f, col, 'RECORDATORIO ENVIADO') || '').trim();
      const horasFaltantes = (fechaCita.getTime() - ahora.getTime()) / 3600000;
      const fechaStr = Utilities.formatDate(fechaCita, tz, 'dd/MM/yyyy');
      const horaStr = formatAmPm(fechaCita);

      // Citas antiguas sin tokens (agendadas antes de sep-2026): no se les
      // pueden mandar botones válidos. Solo se cierran si ya pasaron.
      const tieneTokens = !!(tokenProp && tokenAgente);

      // ── REGLA 1: RECORDATORIO (24 h antes, UNA sola vez) ───────────────
      // Antes la ventana era "entre 23 y 24,5 h": con el motor cada hora podía
      // mandarlo dos veces, y una cita agendada con menos de 23 h de antelación
      // no lo recibía nunca. Ahora se marca RECORDATORIO ENVIADO.
      if (tieneTokens && !recordatorioEnviado && horasFaltantes > 2 && horasFaltantes <= 24 &&
          (estado === ESTADOS_CITA.PENDIENTE || estado === ESTADOS_CITA.CONFIRMADA)) {
        try {
          const yaConfirmo = estado === ESTADOS_CITA.CONFIRMADA;
          enviarCorreoCita(
            correo,
            yaConfirmo ? `⏰ Te esperamos mañana: ${fechaStr} a las ${horaStr} - Gold Life`
                       : `⏳ Confirma tu cita del ${fechaStr} a las ${horaStr} - Gold Life`,
            'RECORDATORIO DE CITA',
            nombre,
            `Te recordamos tu cita para el servicio de <strong>${servicio}</strong>.<br><br>` +
            `🗓️ <strong>Fecha:</strong> ${fechaStr}<br>⏰ <strong>Hora:</strong> ${horaStr}<br>` +
            `📍 <strong>Inmueble:</strong> ${direccion || 'A convenir'}<br><br>` +
            (yaConfirmo
              ? 'Ya confirmaste tu asistencia, ¡gracias! Si algo cambió, puedes reagendar o cancelar aquí:'
              : '<strong>Por favor confirma tu asistencia.</strong> Si no la confirmas, la cita se liberará automáticamente 2 horas antes.'),
            yaConfirmo
              ? htmlBotonesCorreo([
                  { texto: '🔄 Reagendar', color: '#b8860b', url: urlEstadoCita(idCita, ESTADOS_CITA.QUIERE_REAGENDAR, tokenProp) },
                  { texto: '❌ Cancelar', color: '#a3322a', url: urlEstadoCita(idCita, ESTADOS_CITA.CANCELADA, tokenProp) }
                ])
              : botonesPropietarioCita(idCita, tokenProp)
          );
          escribir(numFila, 'RECORDATORIO ENVIADO', ahoraTxt);
        } catch (e) {
          Logger.log('Error enviando recordatorio de ' + idCita + ': ' + e.message);
        }
        return;
      }

      // ── REGLA 2: AUTO-CANCELACIÓN (2 h antes, si nunca confirmó) ────────
      // Solo si de verdad se le avisó: cancelar una cita sin haber mandado el
      // recordatorio (p. ej. porque falló el correo) sería injusto con él.
      if (estado === ESTADOS_CITA.PENDIENTE && recordatorioEnviado &&
          horasFaltantes > 0 && horasFaltantes <= 2) {
        aplicarCambioEstadoCita(sheet, col, numFila, f, ESTADOS_CITA.CANCELADA, 'cancelada automáticamente: no se confirmó a tiempo');
        try {
          enviarCorreoCita(
            correo,
            '❌ Tu cita fue liberada por falta de confirmación - Gold Life',
            'CITA LIBERADA',
            nombre,
            `Como no recibimos la confirmación de tu cita del <strong>${fechaStr} a las ${horaStr}</strong>, liberamos ese horario.<br><br>` +
            'Si aún deseas la visita, agenda un nuevo horario desde nuestra página.',
            htmlBotonesCorreo([{ texto: '📅 Agendar de nuevo', color: '#b8860b',
              url: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/' }])
          );
        } catch (e) { Logger.log('Error avisando auto-cancelación de ' + idCita + ': ' + e.message); }
        return;
      }

      // ── REGLA 3: AVISO AL AGENTE AL EMPEZAR UNA CITA CONFIRMADA ────────
      if (estado === ESTADOS_CITA.CONFIRMADA && tieneTokens && horasFaltantes <= 0 && horasFaltantes >= -1) {
        try {
          enviarCorreoCita(
            correoAgenteCitas(),
            `🔔 Empieza tu cita con ${nombre} - control de asistencia`,
            'INICIO DE CITA',
            'Agente',
            `La cita con <strong>${nombre}</strong> (${servicio}, ${direccion || 'sin dirección'}) acaba de empezar.<br><br><strong>¿Asistió?</strong>`,
            htmlBotonesCorreo([
              { texto: '✅ Sí asistió', color: '#1f7a4d', url: urlEstadoCita(idCita, ESTADOS_CITA.ASISTIDA, tokenAgente) },
              { texto: '❌ No asistió', color: '#a3322a', url: urlEstadoCita(idCita, ESTADOS_CITA.INASISTIDA, tokenAgente) },
              { texto: '🔄 Reagendada', color: '#b8860b', url: urlEstadoCita(idCita, ESTADOS_CITA.REAGENDADA, tokenAgente) }
            ])
          );
        } catch (e) { Logger.log('Error avisando al agente de ' + idCita + ': ' + e.message); }
        escribir(numFila, 'ESTADO', ESTADOS_CITA.CONFIRMADA_NOTIFICADA);
        return;
      }

      // ── REGLA 4: CITAS PASADAS QUE NADIE RESOLVIÓ ──────────────────────
      // Sin esto una cita sin confirmar queda para siempre en PENDIENTE y el
      // calendario del panel la muestra como si siguiera viva. Sin correo.
      if (estado === ESTADOS_CITA.PENDIENTE && horasFaltantes < -2) {
        escribir(numFila, 'ESTADO', ESTADOS_CITA.SIN_RESPUESTA);
        escribir(numFila, 'ULTIMO CAMBIO', ahoraTxt + ' · pasó la fecha sin confirmar');
      }
    });
  } catch (error) {
    Logger.log("Error en ejecutarMotorAgenda: " + error.message);
  }
}

/**
 * Aplica un cambio de estado a una fila: hoja + Google Calendar.
 * Usado tanto por el motor como por los botones del correo.
 */
function aplicarCambioEstadoCita(sheet, col, numFila, fila, nuevoEstado, motivo) {
  const tz = Session.getScriptTimeZone();
  const ahoraTxt = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy HH:mm:ss");
  if (col['ESTADO']) sheet.getRange(numFila, col['ESTADO']).setValue(nuevoEstado);
  if (col['ULTIMO CAMBIO']) sheet.getRange(numFila, col['ULTIMO CAMBIO']).setValue(ahoraTxt + ' · ' + motivo);

  const idEvento = valorCita(fila, col, 'ID EVENTO CALENDAR');
  if (!idEvento) return;
  try {
    const evento = CalendarApp.getDefaultCalendar().getEventById(idEvento);
    if (!evento) return;
    // Cancelada o "quiere reagendar": ese horario ya no se va a usar, así que se
    // libera para que otro propietario pueda tomarlo.
    if (nuevoEstado === ESTADOS_CITA.CANCELADA || nuevoEstado === ESTADOS_CITA.QUIERE_REAGENDAR) {
      evento.deleteEvent();
    } else {
      evento.setTitle(tituloEventoCita(nuevoEstado, valorCita(fila, col, 'TIPO SERVICIO'), valorCita(fila, col, 'NOMBRE')));
    }
  } catch (e) {
    Logger.log('No se pudo actualizar el evento de Calendar: ' + e.message);
  }
}

// Qué puede hacer cada quien desde su correo.
const ACCIONES_PROPIETARIO_CITA = ['CONFIRMADA', 'QUIERE REAGENDAR', 'CANCELADA'];
const ACCIONES_AGENTE_CITA = ['ASISTIDA', 'INASISTIDA', 'REAGENDADA'];
// Estados en los que la cita ya está cerrada y no admite cambios desde el correo.
const ESTADOS_CERRADOS_CITA = ['CANCELADA', 'ASISTIDA', 'INASISTIDA', 'SIN RESPUESTA'];

/** Busca la cita por ID y valida el token. Devuelve {ok, mensaje, ...}. */
function localizarCitaConToken(idCita, nuevoEstado, token) {
  const { sheet, col } = hojaCitasConColumnas();
  const ultima = sheet.getLastRow();
  if (ultima < 2) return { ok: false, mensaje: 'No encontramos esta cita.' };

  const filas = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
  const idx = filas.findIndex(f => String(valorCita(f, col, 'ID CITA')).trim() === String(idCita || '').trim());
  if (idx === -1) return { ok: false, mensaje: 'No encontramos esta cita. Puede que el enlace esté incompleto.' };

  const fila = filas[idx];
  const tokenProp = String(valorCita(fila, col, 'TOKEN PROPIETARIO') || '');
  const tokenAgente = String(valorCita(fila, col, 'TOKEN AGENTE') || '');
  const t = String(token || '');

  // El token decide quién está pulsando y qué puede hacer. Sin él, cualquiera
  // podría cambiar el estado de una cita adivinando su ID en la URL.
  let esAgente = false;
  if (t && t === tokenProp && ACCIONES_PROPIETARIO_CITA.indexOf(nuevoEstado) !== -1) {
    esAgente = false;
  } else if (t && t === tokenAgente && ACCIONES_AGENTE_CITA.indexOf(nuevoEstado) !== -1) {
    esAgente = true;
  } else {
    return { ok: false, mensaje: 'Este enlace no es válido para esta acción.' };
  }

  const estadoActual = String(valorCita(fila, col, 'ESTADO') || '').trim();
  // Tras pedir reagendar, el horario ya se liberó en Calendar. Si desde el
  // correo viejo pulsara "Confirmar", la cita quedaría confirmada sin evento.
  if (!esAgente && estadoActual === 'QUIERE REAGENDAR' && nuevoEstado !== 'QUIERE REAGENDAR') {
    return { ok: false, cerrada: true, mensaje: 'Ya pediste reagendar esta cita. Un asesor te llamará para acordar la nueva fecha.' };
  }
  if (ESTADOS_CERRADOS_CITA.indexOf(estadoActual) !== -1) {
    return { ok: false, cerrada: true, mensaje: 'Esta cita ya está cerrada (' + estadoActual.toLowerCase() + ') y no admite cambios.' };
  }
  if (estadoActual === nuevoEstado ||
      (nuevoEstado === 'CONFIRMADA' && estadoActual === 'CONFIRMADA_NOTIFICADA')) {
    return { ok: false, yaHecho: true, mensaje: 'Esta acción ya estaba registrada. No hace falta hacer nada más.' };
  }

  const tz = Session.getScriptTimeZone();
  const fecha = fechaHoraDeCita(valorCita(fila, col, 'FECHA CITA'), valorCita(fila, col, 'HORA CITA'));
  return {
    ok: true, sheet: sheet, col: col, numFila: idx + 2, fila: fila, esAgente: esAgente,
    fechaTxt: fecha ? Utilities.formatDate(fecha, tz, 'dd/MM/yyyy') + ' a las ' + formatAmPm(fecha) : '',
    nombre: valorCita(fila, col, 'NOMBRE')
  };
}

const TEXTOS_ACCION_CITA = {
  'CONFIRMADA':       { pregunta: '¿Confirmas tu asistencia a la cita?', boton: 'Sí, confirmo mi asistencia', color: '#1f7a4d', hecho: '¡Listo! Tu asistencia quedó confirmada. Te esperamos.' },
  'QUIERE REAGENDAR': { pregunta: '¿Quieres cambiar la fecha de tu cita?', boton: 'Sí, quiero reagendar', color: '#b8860b', hecho: 'Recibimos tu solicitud. Un asesor te llamará para acordar una nueva fecha.' },
  'CANCELADA':        { pregunta: '¿Seguro que quieres cancelar tu cita?', boton: 'Sí, cancelar la cita', color: '#a3322a', hecho: 'Tu cita quedó cancelada. Si cambias de opinión, puedes agendar de nuevo desde nuestra página.' },
  'ASISTIDA':         { pregunta: '¿Marcar la cita como ASISTIDA?', boton: 'Sí, asistió', color: '#1f7a4d', hecho: 'Cita marcada como asistida.' },
  'INASISTIDA':       { pregunta: '¿Marcar que NO asistió?', boton: 'Sí, no asistió', color: '#a3322a', hecho: 'Cita marcada como no asistida.' },
  'REAGENDADA':       { pregunta: '¿Marcar la cita como reagendada?', boton: 'Sí, reagendada', color: '#b8860b', hecho: 'Cita marcada como reagendada.' }
};

/** Página HTML común para las respuestas de los botones. */
function paginaCita(titulo, cuerpoHtml) {
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Gold Life - Cita</title></head>' +
    '<body style="margin:0;background:#141414;font-family:Arial,sans-serif;color:#f5f5f5;">' +
    '<div style="max-width:460px;margin:40px auto;padding:32px 24px;background:#1f1f1f;border:1px solid #3a3222;border-radius:16px;text-align:center;">' +
    '<div style="color:#d4af37;font-size:13px;letter-spacing:2px;font-weight:bold;">REAL ESTATE · GOLD LIFE</div>' +
    '<h2 style="color:#d4af37;margin:18px 0 12px;">' + titulo + '</h2>' + cuerpoHtml +
    '</div></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Gold Life - Cita')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * doGet (accion=estadoCita). Se abre desde un botón del correo.
 *
 * ⚠️ NO cambia nada solo por abrir el enlace: muestra una pregunta y el cambio
 * lo hace un segundo clic. Los antivirus de correo (Outlook, Gmail empresarial)
 * visitan los enlaces por su cuenta para comprobarlos; si el enlace aplicara el
 * cambio, podrían confirmar o cancelar citas sin que nadie pulsara nada.
 */
function handleEstadoCitaGet(idCita, nuevoEstado, token) {
  try {
    const estado = String(nuevoEstado || '').trim();
    const textos = TEXTOS_ACCION_CITA[estado];
    if (!textos) return paginaCita('Enlace no válido', '<p>La acción solicitada no existe.</p>');

    const cita = localizarCitaConToken(idCita, estado, token);
    if (!cita.ok) {
      return paginaCita(cita.yaHecho ? 'Todo en orden' : 'No se pudo aplicar', '<p>' + cita.mensaje + '</p>');
    }

    const datosJs = JSON.stringify({ idCita: String(idCita), estado: estado, token: String(token) });
    const cuerpo =
      '<p style="line-height:1.6;">' + textos.pregunta + '</p>' +
      '<p style="color:#bbb;">' + (cita.nombre ? cita.nombre + '<br>' : '') + cita.fechaTxt + '</p>' +
      '<button id="b" style="margin-top:18px;padding:14px 22px;border:0;border-radius:10px;background:' + textos.color +
      ';color:#fff;font-size:16px;font-weight:bold;cursor:pointer;">' + textos.boton + '</button>' +
      '<p id="m" style="margin-top:18px;line-height:1.6;"></p>' +
      '<script>' +
      'var d=' + datosJs + ';var b=document.getElementById("b"),m=document.getElementById("m");' +
      'b.onclick=function(){b.disabled=true;b.style.opacity=".6";b.innerText="Guardando...";' +
      'google.script.run.withSuccessHandler(function(r){b.style.display="none";m.innerText=r.mensaje;})' +
      '.withFailureHandler(function(e){b.disabled=false;b.style.opacity="1";b.innerText="Intentar de nuevo";m.innerText="No se pudo guardar: "+e.message;})' +
      '.aplicarEstadoCitaDesdeCorreo(d.idCita,d.estado,d.token);};' +
      '</script>';
    return paginaCita('Tu cita', cuerpo);

  } catch (e) {
    return paginaCita('Error', '<p>Ocurrió un error interno. Intenta de nuevo más tarde.</p>');
  }
}

/**
 * Aplica el cambio pedido desde la página del correo (google.script.run).
 * Vuelve a validar todo: la página es pública y no se puede confiar en ella.
 */
function aplicarEstadoCitaDesdeCorreo(idCita, nuevoEstado, token) {
  const lock = LockService.getDocumentLock() || LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const estado = String(nuevoEstado || '').trim();
    const textos = TEXTOS_ACCION_CITA[estado];
    if (!textos) return { ok: false, mensaje: 'Acción no válida.' };

    const cita = localizarCitaConToken(idCita, estado, token);
    if (!cita.ok) return { ok: !!cita.yaHecho, mensaje: cita.mensaje };

    const quien = cita.esAgente ? 'agente' : 'propietario';
    aplicarCambioEstadoCita(cita.sheet, cita.col, cita.numFila, cita.fila, estado, quien + ' marcó ' + estado.toLowerCase() + ' desde el correo');

    // El agente se entera de lo que haga el propietario.
    if (!cita.esAgente && (estado === 'QUIERE REAGENDAR' || estado === 'CANCELADA')) {
      try {
        const f = cita.fila, c = cita.col;
        const celular = String(valorCita(f, c, 'CELULAR') || '');
        const soloDigitos = celular.replace(/\D/g, '');
        const wa = soloDigitos.length === 10 ? '57' + soloDigitos : soloDigitos;
        enviarCorreoCita(
          correoAgenteCitas(),
          estado === 'CANCELADA'
            ? `❌ ${cita.nombre} canceló su cita del ${cita.fechaTxt}`
            : `🔄 ${cita.nombre} quiere REAGENDAR su cita — llámalo`,
          estado === 'CANCELADA' ? 'CITA CANCELADA' : 'SOLICITUD DE REAGENDAR',
          'Agente',
          `<strong>${cita.nombre}</strong> ${estado === 'CANCELADA' ? 'canceló' : 'pidió reagendar'} su cita del <strong>${cita.fechaTxt}</strong>.<br><br>` +
          `🏠 <strong>Servicio:</strong> ${valorCita(f, c, 'TIPO SERVICIO')}<br>` +
          `📍 <strong>Inmueble:</strong> ${valorCita(f, c, 'DIRECCION') || 'N/A'}<br>` +
          `📞 <strong>Celular:</strong> ${celular || 'N/A'}<br>` +
          `✉️ <strong>Correo:</strong> ${valorCita(f, c, 'CORREO') || 'N/A'}<br><br>` +
          'El horario se liberó en tu Google Calendar.',
          wa ? htmlBotonesCorreo([
            { texto: '💬 WhatsApp', color: '#1f7a4d', url: 'https://wa.me/' + wa },
            { texto: '📞 Llamar', color: '#555555', url: 'tel:+' + wa }
          ]) : ''
        );
      } catch (e) {
        Logger.log('No se pudo avisar al agente: ' + e.message);
      }
    }

    return { ok: true, mensaje: textos.hecho };
  } finally {
    lock.releaseLock();
  }
}
