// ==========================================
// LLAMADAS DE SEGUIMIENTO DEL CRM (6-nov-2026)
// ==========================================
// Al poner ESTADO DE LLAMADA = SEGUIMIENTO en "1 - CAPTACIONES A/V" se abre una ventana
// (MODAL_SEGUIMIENTO.html) para anotar el detalle y programar la llamada (fecha y hora).
// La llamada queda en la hoja "2.3 - LLAMADAS DE SEGUIMIENTO" y en el calendario de
// Leonardo, y el motor de citas (cada 5 min) le manda a ÉL los recordatorios:
//   24 h, 3 h, 2 h, ¿confirmas? (1 h 30), 1 h, 30, 15 y 5 min, y a la hora.
// A la hora: Contestó / No contestó (→ reprogramar), WhatsApp, Llamar y agendar la
// presentación virtual o la captación presencial con los datos ya llenos.
// Cada propietario del CRM tiene un ID DE LEAD (LD-######) que amarra sus llamadas y citas.

const LLAMADAS = {
  HOJA: '2.3 - LLAMADAS DE SEGUIMIENTO',
  COLUMNAS: ['ID LLAMADA', 'ID LEAD', 'PESTAÑA', 'NOMBRE', 'CELULAR', 'NEGOCIO', 'UBICACIÓN', 'FECHA HORA',
    'NOTA', 'ESTADO', 'ULTIMO AVISO', 'TOKEN', 'ID EVENTO', 'CREADA', 'RESULTADO'],
  // [clave, minutos antes]; C90 = pedir confirmación
  AVISOS: [['H24', 1440], ['H3', 180], ['H2', 120], ['C90', 90], ['H1', 60], ['M30', 30], ['M15', 15], ['M5', 5], ['M0', 0]],
  COL_ID_LEAD: 'ID DE LEAD',
  ESTADO_ABRE: 'SEGUIMIENTO',
  URL_PAGINA: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/llamada.html'
};

// ---------- ID de lead ----------
function nuevoIdLead_() { return 'LD-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); }

/** Pone un ID DE LEAD a cada fila con celular que no lo tenga (corre con el motor, en lote). */
function asignarIdsLead_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SEGUIMIENTO_CAPTACIONES.HOJAS.forEach(n => {
    const hoja = ss.getSheetByName(n);
    if (!hoja) return;
    const filas = hoja.getLastRow() - SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + 1;
    if (filas <= 0) return;
    const cId = columnaCaptacion_(hoja, LLAMADAS.COL_ID_LEAD);
    const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
    const cCel = enc.indexOf('CELULAR') + 1;
    if (!cCel) return;
    const rangoId = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, cId, filas, 1);
    const ids = rangoId.getValues();
    const cels = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, cCel, filas, 1).getValues();
    let cambios = false;
    ids.forEach((x, i) => { if (!String(x[0]).trim() && String(cels[i][0]).replace(/\D/g, '').length >= 7) { x[0] = nuevoIdLead_(); cambios = true; } });
    if (cambios) rangoId.setValues(ids);
  });
}

function idLeadDeFila_(hoja, fila) {
  const c = columnaCaptacion_(hoja, LLAMADAS.COL_ID_LEAD);
  let id = String(hoja.getRange(fila, c).getValue() || '').trim();
  if (!id) { id = nuevoIdLead_(); hoja.getRange(fila, c).setValue(id); }
  return id;
}

/** Fila del CRM por ID DE LEAD. */
function filaPorIdLead_(idLead) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const n of SEGUIMIENTO_CAPTACIONES.HOJAS) {
    const hoja = ss.getSheetByName(n);
    if (!hoja) continue;
    const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
    const c = enc.indexOf(LLAMADAS.COL_ID_LEAD) + 1;
    if (!c) continue;
    const filas = hoja.getLastRow() - SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + 1;
    if (filas <= 0) continue;
    const i = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, c, filas, 1).getValues().findIndex(x => String(x[0]).trim() === idLead);
    if (i !== -1) return { hoja: hoja, fila: SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + i };
  }
  return null;
}

// ---------- Hoja de llamadas ----------
function hojaLlamadas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(LLAMADAS.HOJA);
  if (!h) {
    h = ss.insertSheet(LLAMADAS.HOJA);
    h.getRange(1, 1, 1, LLAMADAS.COLUMNAS.length).setValues([LLAMADAS.COLUMNAS]).setFontWeight('bold').setBackground('#1c1917').setFontColor('#d4af37');
    h.setFrozenRows(1);
  }
  const enc = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].map(x => String(x).trim());
  LLAMADAS.COLUMNAS.forEach(n => { if (enc.indexOf(n) === -1) { enc.push(n); h.getRange(1, enc.length).setValue(n).setFontWeight('bold'); } });
  const col = {}; enc.forEach((n, i) => col[n] = i + 1);
  return { hoja: h, col: col };
}

function leerLlamada_(idLlamada) {
  const { hoja, col } = hojaLlamadas_();
  const n = hoja.getLastRow() - 1;
  if (n <= 0) return null;
  const datos = hoja.getRange(2, 1, n, hoja.getLastColumn()).getValues();
  const i = datos.findIndex(f => String(f[col['ID LLAMADA'] - 1]).trim() === idLlamada);
  if (i === -1) return null;
  const f = datos[i], v = (k) => f[col[k] - 1];
  return { hoja: hoja, col: col, fila: i + 2, v: v,
    poner: (k, valor) => hoja.getRange(i + 2, col[k]).setValue(valor) };
}

// ---------- Ventana del CRM ----------
/** Lo llama procesarEdicionCaptacion_ al cambiar ESTADO DE LLAMADA. */
function abrirSeguimientoSiToca_(e, hoja, colEstado) {
  const r = e.range;
  if (r.getNumRows() !== 1 || r.getNumColumns() !== 1 || r.getColumn() !== colEstado) return;
  if (r.getRow() < SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS) return;
  if (normalizarEstadoCaptacion_(e.value) !== LLAMADAS.ESTADO_ABRE) return;
  abrirModalSeguimiento_(hoja, r.getRow());
}

function abrirModalSeguimiento_(hoja, fila) {
  const d = datosFilaCaptacion_(hoja, fila);
  d.idLead = idLeadDeFila_(hoja, fila);
  const t = HtmlService.createTemplateFromFile('backend/MODAL_SEGUIMIENTO');
  t.DATOS = JSON.stringify(d);
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(520).setHeight(600), 'Programar llamada de seguimiento');
}

/** Menú: programar la llamada para la fila seleccionada. */
function programarSeguimientoFilaActual() {
  const hoja = SpreadsheetApp.getActiveSheet();
  if (SEGUIMIENTO_CAPTACIONES.HOJAS.indexOf(hoja.getName()) === -1) {
    SpreadsheetApp.getUi().alert('Ubícate en una fila de "1 - CAPTACIONES A" o "1 - CAPTACIONES V".');
    return;
  }
  abrirModalSeguimiento_(hoja, hoja.getActiveRange().getRow());
}

/** Programa la llamada (desde la ventana del CRM o al reprogramar). d = { hoja, fila, idLead, nombre, celular, servicio, direccion, nota, timestamp } */
function programarLlamada(d) {
  const inicio = new Date(Number(d.timestamp));
  if (isNaN(inicio.getTime())) return { success: false, error: 'Elige la fecha y la hora.' };
  if (inicio.getTime() < Date.now() - 60000) return { success: false, error: 'Esa hora ya pasó.' };
  const { hoja, col } = hojaLlamadas_();
  const id = 'LL-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const token = Utilities.getUuid();
  const nota = String(d.nota || '').trim().slice(0, 500);

  let idEvento = '';
  try {
    const ev = CalendarApp.getDefaultCalendar().createEvent('📞 SEGUIMIENTO: ' + d.nombre + (d.servicio ? ' (' + d.servicio + ')' : ''),
      inicio, new Date(inicio.getTime() + 15 * 60000),
      { description: 'Llamada de seguimiento (' + id + ' · ' + d.idLead + ')\nCelular: ' + d.celular + (nota ? '\nNota: ' + nota : '') });
    ev.removeAllReminders();
    idEvento = ev.getId();
  } catch (e) { Logger.log('No se pudo crear el evento de la llamada: ' + e.message); }

  const fila = new Array(hoja.getLastColumn()).fill('');
  const poner = (k, v) => { if (col[k]) fila[col[k] - 1] = v; };
  poner('ID LLAMADA', id); poner('ID LEAD', d.idLead); poner('PESTAÑA', d.hoja); poner('NOMBRE', d.nombre);
  poner('CELULAR', textoCelda_(d.celular)); poner('NEGOCIO', d.servicio || ''); poner('UBICACIÓN', d.direccion || '');
  poner('FECHA HORA', inicio); poner('NOTA', nota); poner('ESTADO', 'PROGRAMADA');
  // Los avisos que ya "pasaron" no se mandan de golpe: se sigue desde el siguiente
  poner('ULTIMO AVISO', avisoVigenteLlamada_((inicio.getTime() - Date.now()) / 60000));
  poner('TOKEN', token); poner('ID EVENTO', idEvento); poner('CREADA', new Date());
  hoja.appendRow(fila);

  // En el CRM: la nota y la llamada programada en DETALLES, y el sello de seguimiento
  try {
    const ub = d.hoja && d.fila ? { hoja: SpreadsheetApp.getActive().getSheetByName(d.hoja), fila: Number(d.fila) } : filaPorIdLead_(d.idLead);
    if (ub && ub.hoja) anotarEnCRM_(ub.hoja, ub.fila, (nota ? nota + '\n' : '') + 'Llamada programada: ' + textoFechaLlamada_(inicio) + ' (' + id + ')', d.estadoNuevo);
  } catch (e) { Logger.log('No se pudo anotar la llamada en el CRM: ' + e.message); }
  return { success: true, idLlamada: id, texto: textoFechaLlamada_(inicio) };
}

function anotarEnCRM_(hoja, fila, texto, estadoNuevo) {
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
  const c = (n) => enc.indexOf(n) + 1;
  if (estadoNuevo && c(SEGUIMIENTO_CAPTACIONES.COL_ESTADO)) hoja.getRange(fila, c(SEGUIMIENTO_CAPTACIONES.COL_ESTADO)).setValue(estadoNuevo);
  if (c(SEGUIMIENTO_CAPTACIONES.COL_DETALLES)) {
    const celda = hoja.getRange(fila, c(SEGUIMIENTO_CAPTACIONES.COL_DETALLES)), previo = String(celda.getValue() || '').trim();
    celda.setValue((previo ? previo + '\n' : '') + texto);
  }
  const sello = selloSeguimiento_();
  if (c(SEGUIMIENTO_CAPTACIONES.COL_FECHA)) hoja.getRange(fila, c(SEGUIMIENTO_CAPTACIONES.COL_FECHA)).setValue(sello.fecha);
  if (c(SEGUIMIENTO_CAPTACIONES.COL_HORA)) hoja.getRange(fila, c(SEGUIMIENTO_CAPTACIONES.COL_HORA)).setValue(sello.hora);
}

function textoFechaLlamada_(d) {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const t = dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()] + ' · ' + formatAmPm(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ---------- Motor de avisos (lo llama el motor de citas cada 5 min) ----------
function avisoVigenteLlamada_(minFaltan) {
  let vigente = '';
  LLAMADAS.AVISOS.forEach(([k, m]) => { if (minFaltan <= m) vigente = k; });
  return vigente;
}
function avisoQueTocaLlamada_(minFaltan, ultimo, confirmada) {
  const orden = LLAMADAS.AVISOS.map(a => a[0]);
  const yaIdx = ultimo ? orden.indexOf(ultimo) : -1;
  let toca = null;
  LLAMADAS.AVISOS.forEach(([k, m], i) => { if (minFaltan <= m && i > yaIdx) toca = k; });
  if (toca === 'C90' && confirmada) toca = null;
  return toca;
}

function revisarLlamadas_() {
  const { hoja, col } = hojaLlamadas_();
  const n = hoja.getLastRow() - 1;
  if (n <= 0) return;
  const datos = hoja.getRange(2, 1, n, hoja.getLastColumn()).getValues();
  const ahora = Date.now();
  datos.forEach((f, i) => {
    const v = (k) => f[col[k] - 1];
    const estado = String(v('ESTADO') || '');
    if (estado !== 'PROGRAMADA' && estado !== 'CONFIRMADA') return;
    const inicio = v('FECHA HORA');
    if (!(inicio instanceof Date)) return;
    const minFaltan = (inicio.getTime() - ahora) / 60000;
    if (minFaltan < -180) { hoja.getRange(i + 2, col['ESTADO']).setValue('SIN RESULTADO'); return; }
    let paso = avisoQueTocaLlamada_(minFaltan, String(v('ULTIMO AVISO') || ''), estado === 'CONFIRMADA');
    // Si se saltaron pasos (p. ej. el motor no corrió), solo se manda el último que toca
    if (!paso) return;
    try { enviarAvisoLlamada_(paso, f, col, inicio, minFaltan); }
    catch (e) { Logger.log('Error en el aviso ' + paso + ' de ' + v('ID LLAMADA') + ': ' + e.message); }
    hoja.getRange(i + 2, col['ULTIMO AVISO']).setValue(paso);
  });
}

function urlLlamada_(id, token, accion) {
  return LLAMADAS.URL_PAGINA + '?l=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(token) + (accion ? '&a=' + accion : '');
}

function enviarAvisoLlamada_(paso, f, col, inicio, minFaltan) {
  const v = (k) => f[col[k] - 1];
  const id = String(v('ID LLAMADA')), token = String(v('TOKEN')), nombre = String(v('NOMBRE') || 'el propietario');
  const cel = celularInternacional_(v('CELULAR'));
  const negocio = String(v('NEGOCIO') || ''), nota = String(v('NOTA') || '');
  const cuando = { H24: 'mañana', H3: 'en 3 horas', H2: 'en 2 horas', C90: 'en 1 hora y 30 minutos', H1: 'en 1 hora', M30: 'en 30 minutos', M15: 'en 15 minutos', M5: 'en 5 minutos', M0: 'ahora' }[paso];
  const tarjeta = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0;border-radius:12px;background:#1c1917;"><tr><td style="padding:16px 18px;font-family:Arial,sans-serif;">' +
    '<div style="color:#d4af37;font-size:12px;letter-spacing:2px;font-weight:bold;">LLAMADA DE SEGUIMIENTO</div>' +
    `<div style="color:#fff;font-size:19px;font-weight:bold;margin-top:4px;">${nombre}</div>` +
    `<div style="color:#e7e5e4;font-size:15px;margin-top:2px;">${textoFechaLlamada_(inicio)}${negocio ? ' · ' + negocio : ''}</div>` +
    (v('UBICACIÓN') ? `<div style="color:#a8a29e;font-size:13px;margin-top:4px;">${v('UBICACIÓN')}</div>` : '') +
    (nota ? `<div style="color:#d6d3d1;font-size:13px;margin-top:8px;font-style:italic;">“${nota}”</div>` : '') +
    '</td></tr></table>';
  const herramientas = [];
  if (cel) {
    herramientas.push(botonHerramientaCita_('llamar', 'Llamar', 'tel:+' + cel));
    herramientas.push(botonHerramientaCita_('whatsapp', 'WhatsApp', 'https://wa.me/' + cel + '?text=' +
      encodeURIComponent('Hola ' + nombre.split(' ')[0] + ', soy Leonardo de Gold Life Real Estate. Te escribo para retomar lo de tu inmueble.')));
  }
  let asunto, titulo, mensaje, secundario = '';
  if (paso === 'M0') {
    asunto = `📞 Es hora de llamar a ${nombre}`;
    titulo = 'HORA DE LA LLAMADA';
    herramientas.push(botonHerramientaCita_('meet', 'Presentación virtual', URL_PORTAFOLIO_CITAS + '?desdeLlamada=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(token) + '&modo=VIRTUAL'));
    herramientas.push(botonHerramientaCita_('ruta', 'Captación presencial', URL_PORTAFOLIO_CITAS + '?desdeLlamada=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(token) + '&modo=PRESENCIAL'));
    mensaje = 'Es la hora de tu llamada de seguimiento.' + tarjeta +
      '<div style="margin:6px 0 4px;color:#78716c;font-size:12px;letter-spacing:.5px;text-align:center;">TUS HERRAMIENTAS</div>' + tablaHerramientasCita_(herramientas) +
      '<div style="margin:16px 0 4px;font-weight:bold;">¿Cómo te fue?</div>';
    secundario = htmlBotonesCorreo([
      { texto: '✅ Contestó', color: '#1f7a4d', url: urlLlamada_(id, token, 'CONTESTO') },
      { texto: '📵 No contestó', color: '#a3322a', url: urlLlamada_(id, token, 'NO_CONTESTO') }
    ]) + '<div style="color:#78716c;font-size:12.5px;text-align:center;">Si no contestó, eliges ahí mismo la nueva fecha y hora.</div>';
  } else if (paso === 'C90') {
    asunto = `⏰ ¿Vas a hacer la llamada a ${nombre}?`;
    titulo = 'CONFIRMA TU LLAMADA';
    mensaje = `Tu llamada de seguimiento es <strong>${cuando}</strong>. ¿La vas a hacer?` + tarjeta;
    secundario = htmlBotonesCorreo([
      { texto: '🔄 Reprogramar', color: '#b8860b', url: urlLlamada_(id, token, 'REPROGRAMAR') },
      { texto: '✅ Sí, la haré', color: '#1f7a4d', url: urlLlamada_(id, token, 'CONFIRMAR') }
    ]);
  } else {
    asunto = `📞 Llamada de seguimiento ${cuando}: ${nombre}`;
    titulo = 'RECORDATORIO DE LLAMADA';
    mensaje = `Tu llamada de seguimiento es <strong>${cuando}</strong>.` + tarjeta + (herramientas.length ? tablaHerramientasCita_(herramientas) : '');
    secundario = `<p style="margin:14px 0 0;font-size:13px;color:#78716c;text-align:center;"><a href="${urlLlamada_(id, token, 'REPROGRAMAR')}" style="color:#a16207;">Reprogramar la llamada</a></p>`;
  }
  enviarCorreoCita(correoAgenteCitas(), asunto, titulo, 'Leonardo', mensaje, secundario);
}

// ---------- Página de la llamada (frontend/llamada.html) ----------
function infoLlamada(datos) {
  const l = leerLlamada_(String(datos.l || ''));
  if (!l || String(l.v('TOKEN')) !== String(datos.t || '')) return { ok: false, mensaje: 'Enlace no válido.' };
  const inicio = l.v('FECHA HORA');
  return { ok: true, nombre: String(l.v('NOMBRE') || ''), estado: String(l.v('ESTADO') || ''), negocio: String(l.v('NEGOCIO') || ''),
    cuando: inicio instanceof Date ? textoFechaLlamada_(inicio) : '', nota: String(l.v('NOTA') || '') };
}

/** a: CONFIRMAR | CONTESTO | NO_CONTESTO | REPROGRAMAR. Con NO_CONTESTO/REPROGRAMAR llega timestamp nuevo. */
function accionLlamada(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const l = leerLlamada_(String(datos.l || ''));
    if (!l || String(l.v('TOKEN')) !== String(datos.t || '')) return { ok: false, mensaje: 'Enlace no válido.' };
    const estado = String(l.v('ESTADO') || '');
    if (['CONTESTÓ', 'NO CONTESTÓ', 'REPROGRAMADA', 'CANCELADA'].indexOf(estado) !== -1) return { ok: false, mensaje: 'Esta llamada ya quedó cerrada (' + estado.toLowerCase() + ').' };
    const a = String(datos.a || '');
    const nota = String(datos.nota || '').trim().slice(0, 500);
    const ub = filaPorIdLead_(String(l.v('ID LEAD')));
    if (a === 'CONFIRMAR') { l.poner('ESTADO', 'CONFIRMADA'); return { ok: true, mensaje: 'Listo, la llamada quedó confirmada. Te seguimos recordando.' }; }
    if (a === 'CONTESTO') {
      l.poner('ESTADO', 'CONTESTÓ'); l.poner('RESULTADO', nota);
      borrarEventoLlamada_(l, false);
      if (ub) anotarEnCRM_(ub.hoja, ub.fila, 'Contestó' + (nota ? ': ' + nota : '') + ' (' + l.v('ID LLAMADA') + ')');
      return { ok: true, mensaje: 'Anotado en el CRM. Si quedó lista la presentación, agéndala desde el correo.' };
    }
    if (a === 'NO_CONTESTO' || a === 'REPROGRAMAR') {
      if (!datos.timestamp) return { ok: false, mensaje: 'Elige la nueva fecha y hora.' };
      const noContesto = a === 'NO_CONTESTO';
      // Primer "no contestó": VOLVER A LLAMAR; si ya iba en ese, VOLVER A LLAMAR 2
      let estadoCRM = '';
      if (noContesto && ub) {
        const enc = ub.hoja.getRange(1, 1, 1, ub.hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
        const actual = normalizarEstadoCaptacion_(ub.hoja.getRange(ub.fila, enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_ESTADO) + 1).getValue());
        estadoCRM = actual === 'VOLVER A LLAMAR' || actual === 'VOLVER A LLAMAR 2' ? 'VOLVER A LLAMAR 2' : 'VOLVER A LLAMAR';
      }
      const r = programarLlamada({ idLead: String(l.v('ID LEAD')), hoja: ub ? ub.hoja.getName() : '', fila: ub ? ub.fila : '',
        nombre: String(l.v('NOMBRE')), celular: String(l.v('CELULAR')), servicio: String(l.v('NEGOCIO')), direccion: String(l.v('UBICACIÓN')),
        nota: (noContesto ? 'No contestó' : 'Reprogramada') + (nota ? ': ' + nota : ''), timestamp: datos.timestamp, estadoNuevo: estadoCRM });
      if (!r.success) return { ok: false, mensaje: r.error };
      l.poner('ESTADO', noContesto ? 'NO CONTESTÓ' : 'REPROGRAMADA'); l.poner('RESULTADO', 'Nueva llamada: ' + r.idLlamada);
      borrarEventoLlamada_(l, true);
      return { ok: true, mensaje: 'Nueva llamada programada para el ' + r.texto + '.' };
    }
    return { ok: false, mensaje: 'Acción no válida.' };
  } finally { lock.releaseLock(); }
}

function borrarEventoLlamada_(l, borrar) {
  const id = String(l.v('ID EVENTO') || '');
  if (!id) return;
  try { const ev = CalendarApp.getDefaultCalendar().getEventById(id); if (ev && borrar) ev.deleteEvent(); else if (ev) ev.setTitle('✅ ' + ev.getTitle()); } catch (e) {}
}

/** Datos para agendar la presentación desde el correo de la llamada (portafolio/?desdeLlamada=…). */
function datosDesdeLlamada(datos) {
  const l = leerLlamada_(String(datos.l || ''));
  if (!l || String(l.v('TOKEN')) !== String(datos.t || '')) return { ok: false };
  let correo = '';
  const ub = filaPorIdLead_(String(l.v('ID LEAD')));
  if (ub) correo = datosFilaCaptacion_(ub.hoja, ub.fila).correo;
  const cel = String(l.v('CELULAR') || '').replace(/\D/g, '');
  return { ok: true, nombre: String(l.v('NOMBRE') || ''), celular: cel.length > 10 ? cel.slice(-10) : cel, correo: correo,
    servicio: String(l.v('NEGOCIO') || ''), direccion: String(l.v('UBICACIÓN') || '') };
}
