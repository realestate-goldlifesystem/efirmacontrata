// ==========================================
// API DE AGENDAMIENTO - GOOGLE CALENDAR
// Sistema de Gestión Inmobiliaria
// Archivo: API_AGENDA.js
// ==========================================

const CONFIG_AGENDA = {
  HOJA_CITAS: '2 - AGENDA CITAS',
  DURACION_CITA_MINUTOS: 60,
  TIEMPO_BUFFER_MINUTOS: 30, // Colchón de transporte/preparación entre citas
  MINIMO_AVISO_HORAS: 12, // No se puede agendar con menos de 12h de anticipación
  HORARIO: {
    LUNES_VIERNES: { inicio: 8, fin: 18 }, // 8:00 AM a 6:00 PM
    SABADO: { inicio: 8, fin: 13 } // 8:00 AM a 1:00 PM
  },
  CALENDARIO_FESTIVOS_COLOMBIA: 'es.co#holiday@group.v.calendar.google.com'
};

/**
 * Obtiene los bloques de 1 hora disponibles para una fecha específica.
 * Maneja bloqueo de festivos, zonas ocupadas y márgenes de tiempo.
 */
function obtenerDisponibilidad(fechaIsoString) {
  try {
    const fechaSolicitada = new Date(fechaIsoString);
    const tz = Session.getScriptTimeZone();
    
    // 1. Validar que la fecha cumpla con el pre-aviso mínimo (Minimum Notice)
    const ahora = new Date();
    const tiempoDiferenciaHoras = (fechaSolicitada.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    
    // Validamos solo el inicio del día para permitir el despliegue de slots, 
    // luego filtraremos los slots individuales
    const fechaInicioDia = new Date(fechaSolicitada.getFullYear(), fechaSolicitada.getMonth(), fechaSolicitada.getDate(), 0, 0, 0);
    
    // 2. Comprobar si es domingo o día festivo en Colombia
    const diaSemana = fechaSolicitada.getDay(); // 0 = Domingo
    if (diaSemana === 0) {
      return { success: true, libre: false, motivo: 'Día de descanso (Domingo)', slots: [] };
    }

    // Comprobar festivos
    const calFestivos = CalendarApp.getCalendarById(CONFIG_AGENDA.CALENDARIO_FESTIVOS_COLOMBIA);
    if (calFestivos) {
      const eventosFestivos = calFestivos.getEventsForDay(fechaSolicitada);
      if (eventosFestivos.length > 0) {
        return { success: true, libre: false, motivo: `Día festivo: ${eventosFestivos[0].getTitle()}`, slots: [] };
      }
    }

    // 3. Determinar horario laboral del día
    let horaInicio = CONFIG_AGENDA.HORARIO.LUNES_VIERNES.inicio;
    let horaFin = CONFIG_AGENDA.HORARIO.LUNES_VIERNES.fin;
    if (diaSemana === 6) { // Sábado
      horaInicio = CONFIG_AGENDA.HORARIO.SABADO.inicio;
      horaFin = CONFIG_AGENDA.HORARIO.SABADO.fin;
    }

    // 4. Obtener eventos ocupados del calendario principal del Agente
    const calendario = CalendarApp.getDefaultCalendar();
    const eventosDelDia = calendario.getEventsForDay(fechaSolicitada);
    
    // Mapear zonas ocupadas
    const zonasOcupadas = eventosDelDia.map(e => ({
      inicio: e.getStartTime().getTime(),
      fin: e.getEndTime().getTime()
    }));

    // 5. Generar slots de tiempo posibles (intervalos de 30 mins)
    const slotsDisponibles = [];
    const tiempoTotalRequerido = (CONFIG_AGENDA.DURACION_CITA_MINUTOS + CONFIG_AGENDA.TIEMPO_BUFFER_MINUTOS) * 60000; 
    
    let currentSlot = new Date(fechaSolicitada.getFullYear(), fechaSolicitada.getMonth(), fechaSolicitada.getDate(), horaInicio, 0, 0);
    const finDia = new Date(fechaSolicitada.getFullYear(), fechaSolicitada.getMonth(), fechaSolicitada.getDate(), horaFin, 0, 0);

    while (currentSlot.getTime() + (CONFIG_AGENDA.DURACION_CITA_MINUTOS * 60000) <= finDia.getTime()) {
      const inicioSlot = currentSlot.getTime();
      const finCitaSlot = inicioSlot + (CONFIG_AGENDA.DURACION_CITA_MINUTOS * 60000);
      const finTotalConBuffer = finCitaSlot + (CONFIG_AGENDA.TIEMPO_BUFFER_MINUTOS * 60000);

      // Regla: Minimum Notice
      const horasParaSlot = (inicioSlot - ahora.getTime()) / (1000 * 60 * 60);
      if (horasParaSlot >= CONFIG_AGENDA.MINIMO_AVISO_HORAS) {
        
        // Verificar choque con ocupados
        let hayChoque = false;
        for (let i = 0; i < zonasOcupadas.length; i++) {
          const occ = zonasOcupadas[i];
          // Hay choque si nuestro bloque (incluyendo buffer) se superpone con un evento existente
          // O si un evento existente (asumiendo que tiene su propio buffer no calculado) se superpone con nuestra cita pura
          if (
            (inicioSlot < occ.fin && finTotalConBuffer > occ.inicio)
          ) {
            hayChoque = true;
            break;
          }
        }

        if (!hayChoque) {
          slotsDisponibles.push({
            horaString: Utilities.formatDate(currentSlot, tz, "HH:mm"),
            horaAmPm: formatAmPm(currentSlot),
            timestamp: inicioSlot
          });
        }
      }

      // Avanzar en intervalos de 30 mins para ofrecer más opciones (8:00, 8:30, 9:00...)
      currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
    }

    return { 
      success: true, 
      libre: slotsDisponibles.length > 0,
      motivo: slotsDisponibles.length === 0 ? 'Sin horarios disponibles' : 'Horarios encontrados',
      slots: slotsDisponibles 
    };

  } catch (error) {
    Logger.log("Error en obtenerDisponibilidad: " + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Recibe los datos del cliente, crea el evento y guarda en BD.
 */
function agendarCita(datos) {
  // datos = { fechaTimestamp, nombreCliente, celular, correo, tipoServicio, direccion, detalles }
  try {
    const tz = Session.getScriptTimeZone();
    const fechaInicio = new Date(datos.fechaTimestamp);
    const fechaFin = new Date(fechaInicio.getTime() + (CONFIG_AGENDA.DURACION_CITA_MINUTOS * 60000));
    
    // 1. Doble check de disponibilidad
    const calendario = CalendarApp.getDefaultCalendar();
    const conflictos = calendario.getEvents(fechaInicio, fechaFin);
    if (conflictos.length > 0) {
      return { success: false, error: "El horario acaba de ser ocupado. Por favor elige otro." };
    }

    // 2. Crear evento en Calendar
    const tituloEvento = `📍 VISITA: ${datos.tipoServicio} - ${datos.nombreCliente}`;
    const descEvento = `
      Cita agendada vía E-FirmaContrata\n
      Cliente: ${datos.nombreCliente}\n
      Celular: ${datos.celular}\n
      Correo: ${datos.correo}\n
      Servicio: ${datos.tipoServicio}\n
      Dirección/Enlace: ${datos.direccion || 'N/A'}\n
      Notas: ${datos.detalles || 'N/A'}\n
      \n
      *Recuerda validar la asistencia desde el panel para las métricas.*
    `;
    
    const evento = calendario.createEvent(tituloEvento, fechaInicio, fechaFin, {
      description: descEvento,
      location: datos.direccion || '',
      guests: datos.correo, // Auto-invitar al cliente
      sendInvites: false // Se desactiva la invitación fea nativa de Google
    });
    
    const idEvento = evento.getId();

    // 3. Generar ID único de Cita
    const idCita = "CIT-" + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    // 4. Guardar en Base de Datos Plana (2 - AGENDA CITAS)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_AGENDA.HOJA_CITAS);
    if (!sheet) throw new Error("No se encontró la hoja de BD_CITAS");

    const fechaCreacion = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy HH:mm:ss");
    const fechaCitaStr = Utilities.formatDate(fechaInicio, tz, "dd/MM/yyyy");
    const horaCitaStr = formatAmPm(fechaInicio);

    const nuevaFila = [
      idCita,
      fechaCreacion,
      "PENDIENTE", // ESTADO INICIAL
      fechaCitaStr,
      horaCitaStr,
      datos.nombreCliente,
      datos.celular,
      datos.correo,
      datos.tipoServicio,
      datos.direccion || "",
      idEvento,
      datos.detalles || ""
    ];

    sheet.appendRow(nuevaFila);

    // 5. Enviar Email Elegante Premium
    try {
      const htmlTemplate = HtmlService.createTemplateFromFile('backend/email_notificacion');
      htmlTemplate.TITULO = 'VISITA AGENDADA';
      htmlTemplate.NOMBRE_CLIENTE = datos.nombreCliente;
      htmlTemplate.MENSAJE_PRINCIPAL = `Nos complace confirmarle que su cita para el servicio de <strong>${datos.tipoServicio}</strong> ha sido registrada en nuestra agenda oficial. <br><br>🗓️ <strong>Fecha:</strong> ${fechaCitaStr}<br>⏰ <strong>Hora:</strong> ${horaCitaStr}`;
      htmlTemplate.MENSAJE_SECUNDARIO = `📍 <strong>Dirección/Lugar:</strong> ${datos.direccion || 'A convenir o Virtual'}<br>📝 <strong>Notas:</strong> ${datos.detalles || 'Ninguna'}`;
      htmlTemplate.URL_ACCION = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/';
      htmlTemplate.TEXTO_BOTON = 'IR AL PORTAFOLIO';

      const cuerpoHTML = htmlTemplate.evaluate().getContent();

      MailApp.sendEmail({
        to: datos.correo,
        subject: `✅ Cita Confirmada: ${fechaCitaStr} a las ${horaCitaStr} - Gold Life`,
        htmlBody: cuerpoHTML
      });
    } catch(errMail) {
      Logger.log("Error enviando email premium: " + errMail.message);
    }

    return { 
      success: true, 
      idCita: idCita, 
      mensaje: "Cita agendada y registrada exitosamente" 
    };

  } catch (error) {
    Logger.log("Error en agendarCita: " + error.message);
    return { success: false, error: error.message };
  }
}

// Utilidad para formatear 12h AM/PM
function formatAmPm(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutes + ' ' + ampm;
}
