// ==========================================
// MOTOR CRON - GESTIÓN ASÍNCRONA DE CITAS
// Sistema de Gestión Inmobiliaria
// Archivo: API_CRON_AGENDA.js
// ==========================================

/**
 * Función para instalar el gatillo (trigger) que correrá cada hora.
 * Solo debe ejecutarse una vez desde el editor.
 */
function instalarCronAgenda() {
  // Limpiar gatillos anteriores si existen
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'ejecutarMotorAgenda') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('ejecutarMotorAgenda')
    .timeBased()
    .everyHours(1)
    .create();
    
  Logger.log("✅ Cron Motor Agenda instalado para ejecutarse cada hora.");
}

/**
 * Motor Principal. Revisa la base de datos de citas y toma acciones
 * basándose en el tiempo faltante y el estado actual.
 */
function ejecutarMotorAgenda() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_AGENDA.HOJA_CITAS);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const ahora = new Date();
    
    // Configuración de URLs
    const props = PropertiesService.getScriptProperties();
    const API_URL = props.getProperty('WEB_APP_URL') || 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec'; 

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const idCita = row[0];
      const estado = row[2];
      const fechaStr = row[3]; // dd/MM/yyyy
      const horaStr = row[4];  // hh:mm AM/PM
      const nombre = row[5];
      const correo = row[7];
      const idEvento = row[10];

      if (!idCita || !fechaStr || !horaStr) continue;

      // Calcular objeto Date de la cita
      const fechaCita = parseFechaHoraCita(fechaStr, horaStr);
      if (!fechaCita) continue;

      const horasFaltantes = (fechaCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      // ==========================================
      // REGLA 1: RECORDATORIO AL CLIENTE (-24h)
      // ==========================================
      if (estado === 'PENDIENTE') {
        if (horasFaltantes <= 24.5 && horasFaltantes >= 23.0) {
          // Generar Enlaces de Acción
          const urlConfirmar = `${API_URL}?accion=estadoCita&idCita=${idCita}&nuevoEstado=CONFIRMADA`;
          const urlCancelar = `${API_URL}?accion=estadoCita&idCita=${idCita}&nuevoEstado=CANCELADA`;

          enviarCorreoAccion(
            correo, 
            `⏳ Confirma tu visita de mañana - Gold Life`, 
            nombre,
            `Te recordamos que tienes una cita programada para mañana <strong>${fechaStr} a las ${horaStr}</strong>.<br><br>Por favor, confirma tu asistencia haciendo clic en el siguiente botón:`,
            urlConfirmar,
            "✅ CONFIRMAR ASISTENCIA",
            `<br><br><small>Si no puedes asistir, por favor <a href="${urlCancelar}" style="color:red;">cancela la cita aquí</a> para liberar el espacio en nuestra agenda.</small>`
          );
          
          // Opcional: Podríamos marcar un flag en la hoja para no re-enviar, 
          // pero el margen de 23-24.5h asegura que solo se envíe en la corrida de esa hora.
        }
        
        // ==========================================
        // REGLA 2: AUTO-CANCELACIÓN (-2h)
        // ==========================================
        else if (horasFaltantes <= 2.0 && horasFaltantes > 0) {
          // Si faltan menos de 2 horas y sigue en PENDIENTE, se cancela automáticamente.
          cancelarCitaYEvento(sheet, i + 1, idCita, idEvento, correo, nombre);
        }
      }

      // ==========================================
      // REGLA 3: NOTIFICACIÓN AL ADMINISTRADOR (Inicio de la cita)
      // ==========================================
      else if (estado === 'CONFIRMADA') {
        // Justo al inicio de la hora de la cita (0 a -1 horas)
        if (horasFaltantes <= 0 && horasFaltantes >= -1.0) {
          // Enviar correo al Administrador (Agente)
          const correoAdmin = Session.getActiveUser().getEmail(); // O un correo fijo configurado
          
          const urlAsistio = `${API_URL}?accion=estadoCita&idCita=${idCita}&nuevoEstado=ASISTIDA`;
          const urlInasistio = `${API_URL}?accion=estadoCita&idCita=${idCita}&nuevoEstado=INASISTIDA`;
          const urlReagendar = `${API_URL}?accion=estadoCita&idCita=${idCita}&nuevoEstado=REAGENDADA`;

          const msgAdmin = `
            La cita con <strong>${nombre}</strong> (ID: ${idCita}) acaba de iniciar.<br><br>
            <strong>¿El cliente asistió a la cita?</strong><br><br>
            <a href="${urlAsistio}" style="padding:10px 20px; background:green; color:white; text-decoration:none; border-radius:5px; margin-right:10px;">✅ SÍ, ASISTIÓ</a>
            <a href="${urlInasistio}" style="padding:10px 20px; background:red; color:white; text-decoration:none; border-radius:5px; margin-right:10px;">❌ NO ASISTIÓ</a>
            <a href="${urlReagendar}" style="padding:10px 20px; background:orange; color:white; text-decoration:none; border-radius:5px;">🔄 REAGENDAR</a>
          `;

          enviarCorreoAccion(
            correoAdmin, 
            `🔔 INICIO DE CITA: Control de asistencia - ${nombre}`, 
            "Agente",
            msgAdmin,
            "", // Sin botón principal, los botones ya van en el texto
            "",
            ""
          );
          
          // Cambiamos temporalmente a un estado intermedio o marcamos para no repetir el correo
          sheet.getRange(i + 1, 3).setValue('CONFIRMADA_NOTIFICADA');
        }
      }
    }
  } catch (error) {
    Logger.log("Error en ejecutarMotorAgenda: " + error.message);
  }
}

/**
 * Función para parsear la fecha y hora de la hoja de cálculo a Date
 */
function parseFechaHoraCita(fechaStr, horaStr) {
  try {
    const partesFecha = fechaStr.split('/');
    if (partesFecha.length !== 3) return null;
    const dia = parseInt(partesFecha[0], 10);
    const mes = parseInt(partesFecha[1], 10) - 1;
    const anio = parseInt(partesFecha[2], 10);

    const matchHora = horaStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!matchHora) return null;
    let horas = parseInt(matchHora[1], 10);
    const mins = parseInt(matchHora[2], 10);
    const ampm = matchHora[3].toUpperCase();

    if (ampm === 'PM' && horas < 12) horas += 12;
    if (ampm === 'AM' && horas === 12) horas = 0;

    return new Date(anio, mes, dia, horas, mins, 0);
  } catch (e) {
    return null;
  }
}

/**
 * Utilidad de envío de correos estandarizados para notificaciones de Agenda
 */
function enviarCorreoAccion(destino, asunto, nombre, mensaje, url, textoBoton, notas) {
  try {
    const htmlTemplate = HtmlService.createTemplateFromFile('backend/email_notificacion');
    htmlTemplate.TITULO = asunto.replace(/[^a-zA-Z0-9 ñÑáéíóúÁÉÍÓÚ]/g, ''); // Limpiar emojis del título grande
    htmlTemplate.NOMBRE_CLIENTE = nombre;
    htmlTemplate.MENSAJE_PRINCIPAL = mensaje;
    htmlTemplate.MENSAJE_SECUNDARIO = notas;
    htmlTemplate.URL_ACCION = url;
    htmlTemplate.TEXTO_BOTON = textoBoton;

    const cuerpoHTML = htmlTemplate.evaluate().getContent();

    MailApp.sendEmail({
      to: destino,
      subject: asunto,
      htmlBody: cuerpoHTML
    });
  } catch(e) {
    Logger.log("Error en enviarCorreoAccion: " + e.message);
  }
}

/**
 * Maneja la actualización de estado a través de un enlace de correo HTTP GET
 */
function handleEstadoCitaGet(idCita, nuevoEstado) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_AGENDA.HOJA_CITAS);
    if (!sheet) return HtmlService.createHtmlOutput('Error: Hoja no encontrada');

    const data = sheet.getDataRange().getValues();
    let filaEncontrada = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === idCita) {
        filaEncontrada = i + 1;
        break;
      }
    }

    if (filaEncontrada === -1) {
      return HtmlService.createHtmlOutput('Error: Cita no encontrada o ID inválido.');
    }

    // Actualizar Estado
    sheet.getRange(filaEncontrada, 3).setValue(nuevoEstado);

    // Cancelar en Google Calendar si aplica
    if (nuevoEstado === 'CANCELADA') {
      const idEvento = sheet.getRange(filaEncontrada, 11).getValue();
      if (idEvento) {
        try {
          CalendarApp.getDefaultCalendar().getEventById(idEvento).deleteEvent();
        } catch(e) {} // Ignorar si ya no existe en Calendar
      }
    }

    const htmlExito = `
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #d4af37;">¡ESTADO ACTUALIZADO!</h2>
        <p>La cita ha sido marcada como: <strong>${nuevoEstado}</strong></p>
        <p>Ya puedes cerrar esta ventana.</p>
      </div>
    `;

    return HtmlService.createHtmlOutput(htmlExito);

  } catch (e) {
    return HtmlService.createHtmlOutput('Error interno: ' + e.message);
  }
}

/**
 * Cancela una cita y elimina el evento en Calendar (Regla 2)
 */
function cancelarCitaYEvento(sheet, filaIdx, idCita, idEvento, correo, nombre) {
  try {
    // 1. Eliminar de Calendar
    if (idEvento) {
      const evento = CalendarApp.getDefaultCalendar().getEventById(idEvento);
      if (evento) evento.deleteEvent();
    }
    
    // 2. Actualizar Hoja
    sheet.getRange(filaIdx, 3).setValue('CANCELADA');
    sheet.getRange(filaIdx, 12).setValue(sheet.getRange(filaIdx, 12).getValue() + " [Cancelada automáticamente por falta de confirmación]");

    // 3. Notificar al Cliente
    enviarCorreoAccion(
      correo,
      "❌ Cita Cancelada por Falta de Confirmación",
      nombre,
      `Te informamos que debido a la falta de confirmación de asistencia, tu cita (ID: ${idCita}) ha sido cancelada automáticamente en nuestro sistema.<br><br>Si aún deseas realizar la visita, por favor agenda un nuevo horario a través de nuestra plataforma.`,
      "https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/",
      "AGENDAR NUEVA CITA",
      ""
    );

  } catch(e) {
    Logger.log("Error auto-cancelando: " + e.message);
  }
}
