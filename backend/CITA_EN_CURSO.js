// ==========================================
// CORREO AL AGENTE CUANDO EMPIEZA UNA PRESENTACIÓN AL PROPIETARIO (5-nov-2026)
// ==========================================
// Lo manda la regla 3 del motor de citas (API_CRON_AGENDA.js) para las citas de
// tipo PROPIETARIO. Es la herramienta de Leonardo durante la cita:
//   Presencial: ¿cómo salió? (Captado / Solo presentación · seguimiento / No asistió)
//               + nueva visita para captar, registrar inmueble, WhatsApp, llamar, cómo llegar.
//   Virtual:    unirme por Meet, WhatsApp, llamar, agendar presencial
//               + ¿asistió? (Sí / No).
// "Captado" y "Seguimiento" dejan la cita como ASISTIDA y ponen ese estado en el CRM
// de captaciones (fila con el mismo celular).

const URL_PORTAFOLIO_CITAS = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/';

/** Botón de herramienta para los correos al agente (oscuro, borde dorado, ícono dorado). */
function botonHerramientaCita_(icono, texto, url) {
  return '<td width="50%" style="padding:4px;">' +
    `<a href="${url}" target="_blank" style="display:block;padding:12px 8px;border-radius:10px;border:1px solid #6b5a22;background:#1c1917;` +
    'color:#f5f5f4;font-size:14px;font-weight:bold;text-decoration:none;text-align:center;white-space:nowrap;font-family:Arial,sans-serif;">' +
    `<img src="${ICONOS_CORREO_CITA + icono}.png" width="16" height="16" alt="" style="vertical-align:-3px;margin-right:7px;border:0;">${texto}</a></td>`;
}
function tablaHerramientasCita_(botones) {
  let filas = '';
  for (let i = 0; i < botones.length; i += 2) filas += '<tr>' + botones[i] + (botones[i + 1] || '<td width="50%"></td>') + '</tr>';
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 4px;">' + filas + '</table>';
}

/** Envía el correo de "empieza tu cita" de una presentación al propietario. */
function correoInicioPresentacion_(f, col, idCita, tokenAgente, nombre, servicio, direccion, horaStr) {
  const virtual = String(valorCita(f, col, 'MODALIDAD') || '').toUpperCase() === 'VIRTUAL';
  const linkMeet = String(valorCita(f, col, 'LINK MEET') || '');
  const cel = celularInternacional_(valorCita(f, col, 'CELULAR'));
  const nuevaCita = URL_PORTAFOLIO_CITAS + '?nuevaCita=' + encodeURIComponent(idCita) + '&t=' + encodeURIComponent(tokenAgente);
  const negocio = /venta/i.test(servicio) ? 'Venta' : /arriendo/i.test(servicio) ? 'Arriendo' : servicio;

  const herramientas = [];
  if (virtual && linkMeet) herramientas.push(botonHerramientaCita_('meet', 'Unirme por Meet', linkMeet));
  if (cel) {
    herramientas.push(botonHerramientaCita_('whatsapp', 'WhatsApp', 'https://wa.me/' + cel + '?text=' +
      encodeURIComponent('Hola ' + String(nombre).split(' ')[0] + ', soy Leonardo de Gold Life Real Estate. ' +
        (virtual ? 'Ya estoy en la reunión de Meet, te espero.' : 'Voy en camino a nuestra cita.'))));
    herramientas.push(botonHerramientaCita_('llamar', 'Llamar', 'tel:+' + cel));
  }
  if (virtual) {
    herramientas.push(botonHerramientaCita_('ruta', 'Agendar presencial', nuevaCita));
  } else {
    if (direccion) herramientas.push(botonHerramientaCita_('ruta', 'Cómo llegar', 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(direccion + ', Colombia')));
    herramientas.push(botonHerramientaCita_('publicacion', 'Registrar inmueble', URL_PORTAFOLIO_CITAS + '?panel=registrar&cita=' + encodeURIComponent(idCita)));
  }

  const resultado = virtual
    ? htmlBotonesCorreo([
        { texto: '✅ Sí asistió', color: '#1f7a4d', url: urlEstadoCita(idCita, ESTADOS_CITA.ASISTIDA, tokenAgente) },
        { texto: '❌ No asistió', color: '#a3322a', url: urlEstadoCita(idCita, ESTADOS_CITA.INASISTIDA, tokenAgente) }
      ])
    : htmlBotonesCorreo([
        { texto: '🏆 Captado', color: '#1f7a4d', url: urlEstadoCita(idCita, 'CAPTADO', tokenAgente) },
        { texto: '🗣️ Solo presentación', color: '#b8860b', url: urlEstadoCita(idCita, 'SEGUIMIENTO', tokenAgente) },
        { texto: '❌ No asistió', color: '#a3322a', url: urlEstadoCita(idCita, ESTADOS_CITA.INASISTIDA, tokenAgente) }
      ]);

  const titulo = virtual ? 'PRESENTACIÓN VIRTUAL' : 'CAPTACIÓN PRESENCIAL';
  const cuerpo = etiquetaTipoCitaHtml('PROPIETARIO') +
    `Empieza tu ${virtual ? 'presentación virtual' : 'cita de captación'} con <strong>${nombre}</strong> a las <strong>${horaStr}</strong>` +
    ` (${negocio}${direccion && !virtual ? ' · ' + direccion : ''}).` +
    '<div style="margin:14px 0 4px;color:#78716c;font-size:12px;letter-spacing:.5px;text-align:center;">TUS HERRAMIENTAS PARA LA CITA</div>' +
    tablaHerramientasCita_(herramientas) +
    `<div style="margin:18px 0 4px;font-weight:bold;">${virtual ? '¿Se hizo la presentación?' : '¿Cómo salió la cita?'}</div>` +
    (virtual ? '' : '<div style="color:#78716c;font-size:13px;margin-bottom:4px;">“Solo presentación” lo deja en seguimiento en el CRM; con “Nueva visita para captar” agendas la siguiente.</div>');
  const extra = virtual ? '' : tablaHerramientasCita_([botonHerramientaCita_('ruta', 'Nueva visita para captar', nuevaCita)]);
  enviarCorreoCita(correoAgenteCitas(), (virtual ? '💻 ' : '🤝 ') + `Empieza tu ${virtual ? 'presentación virtual' : 'captación'} con ${nombre}`, titulo, 'Agente', cuerpo, resultado + extra);
}

/** "Captado" / "Solo presentación" desde el correo: la cita queda ASISTIDA y el CRM toma el estado. */
function aplicarResultadoCaptacion_(cita, estado) {
  aplicarCambioEstadoCita(cita.sheet, cita.col, cita.numFila, cita.fila, ESTADOS_CITA.ASISTIDA,
    'agente marcó ' + (estado === 'CAPTADO' ? 'captado' : 'solo presentación (seguimiento)') + ' desde el correo');
  try { marcarCaptacionEnCRM_(valorCita(cita.fila, cita.col, 'CELULAR'), estado, String(valorCita(cita.fila, cita.col, 'ID CITA') || '')); }
  catch (e) { Logger.log('No se pudo actualizar el CRM: ' + e.message); }
}

/**
 * Busca en las dos pestañas de captaciones la fila de ese propietario y le pone el estado.
 * Primero por la columna ID CITA (la cita que se agendó desde esa fila); si no, por el celular.
 */
function marcarCaptacionEnCRM_(celular, estado, idCita, notaDetalle, soloSiEstado) {
  const cel10 = String(celular || '').replace(/\D/g, '').slice(-10);
  if (cel10.length < 10 && !idCita) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const nombreHoja of SEGUIMIENTO_CAPTACIONES.HOJAS) {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) continue;
    const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
    const cCel = enc.indexOf('CELULAR') + 1, cEst = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_ESTADO) + 1;
    const cDet = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_DETALLES) + 1;
    const cF = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_FECHA) + 1, cH = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_HORA) + 1;
    if (!cCel || !cEst) continue;
    const n = hoja.getLastRow() - SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + 1;
    if (n <= 0) continue;
    const cels = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, cCel, n, 1).getValues();
    const cId = enc.indexOf(AGENDA_CAPTACION.COL_ID_CITA) + 1;
    const ids = cId ? hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, cId, n, 1).getValues() : [];
    let i = idCita && cId ? ids.findIndex(x => String(x[0]).trim() === idCita) : -1;
    // Si no, la más reciente con ese celular (abajo es lo último que entró)
    if (i === -1 && cel10.length === 10) for (let k = n - 1; k >= 0; k--) { if (String(cels[k][0]).replace(/\D/g, '').slice(-10) === cel10) { i = k; break; } }
    if (i !== -1) {
      const fila = SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + i;
      // Solo si la fila sigue en ese estado (p. ej. no pisar un CAPTADO con "cita cancelada")
      if (soloSiEstado && normalizarEstadoCaptacion_(hoja.getRange(fila, cEst).getValue()) !== soloSiEstado) return false;
      asegurarOpcionEstadoCaptacion_(hoja, cEst, estado);
      hoja.getRange(fila, cEst).setValue(estado);
      if (cDet) {
        const celda = hoja.getRange(fila, cDet), previo = String(celda.getValue() || '').trim();
        celda.setValue((previo ? previo + '\n' : '') + (notaDetalle || (estado === 'CAPTADO' ? 'Captado' : 'Solo presentación: falta volver a captar')) + (idCita ? ' (' + idCita + ')' : ''));
      }
      const sello = selloSeguimiento_();
      if (cF) hoja.getRange(fila, cF).setValue(sello.fecha);
      if (cH) hoja.getRange(fila, cH).setValue(sello.hora);
      return true;
    }
  }
  return false;
}

/** Agrega la opción a la lista desplegable de ESTADO DE LLAMADA si todavía no está. */
function asegurarOpcionEstadoCaptacion_(hoja, cEst, opcion) {
  const filaRef = SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS;
  const regla = hoja.getRange(filaRef, cEst).getDataValidation();
  if (!regla || regla.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) return;
  const valores = regla.getCriteriaValues()[0] || [];
  if (valores.indexOf(opcion) !== -1) return;
  const nueva = regla.copy().requireValueInList(valores.concat([opcion]), regla.getCriteriaValues()[1] !== false).build();
  hoja.getRange(filaRef, cEst, Math.max(hoja.getMaxRows() - filaRef + 1, 1), 1).setDataValidation(nueva);
}

/**
 * Al terminar el registro de un inmueble (handleRegistrarInmueble), el propietario
 * queda CAPTADO en el CRM. Llega idCitaCaptacion si se entró por "Registrar inmueble"
 * del correo de la cita; si no, se busca por el celular del propietario.
 * Solo registros nuevos: una renovación o un cambio de negocio no es una captación.
 */
function marcarCaptadoPorRegistro_(datos) {
  try {
    if (datos.flujoSolicitado && datos.flujoSolicitado !== 'normal') return;
    let idCita = String(datos.idCitaCaptacion || '').trim();
    let celular = String(datos['Celular'] || '');
    if (idCita && !celular) {
      const { sheet, col } = hojaCitasConColumnas();
      const f = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), sheet.getLastColumn()).getValues()
        .find(x => String(valorCita(x, col, 'ID CITA')).trim() === idCita);
      if (f) celular = String(valorCita(f, col, 'CELULAR') || '');
    }
    marcarCaptacionEnCRM_(celular, 'CAPTADO', idCita, 'Captado: inmueble registrado');
  } catch (e) { Logger.log('No se pudo marcar CAPTADO por el registro: ' + e.message); }
}

/**
 * Datos de una cita para agendar la siguiente desde el correo del agente
 * (portafolio/?nuevaCita=…&t=…). Exige el token del agente de esa cita.
 */
function datosNuevaCita(datos) {
  const { sheet, col } = hojaCitasConColumnas();
  const ultima = sheet.getLastRow();
  if (ultima < 2) return { ok: false };
  const filas = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
  const f = filas.find(x => String(valorCita(x, col, 'ID CITA')).trim() === String(datos.idCita || '').trim());
  if (!f || !datos.t || String(valorCita(f, col, 'TOKEN AGENTE') || '') !== String(datos.t)) return { ok: false, mensaje: 'Enlace no válido.' };
  const cel = String(valorCita(f, col, 'CELULAR') || '').replace(/\D/g, '');
  return {
    ok: true,
    nombre: String(valorCita(f, col, 'NOMBRE') || ''),
    celular: cel.length > 10 ? cel.slice(-10) : cel,
    correo: String(valorCita(f, col, 'CORREO') || ''),
    servicio: String(valorCita(f, col, 'TIPO SERVICIO') || '').replace(/\s*·.*$/, ''),
    direccion: String(valorCita(f, col, 'DIRECCION') || '')
  };
}
