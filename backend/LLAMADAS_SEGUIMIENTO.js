// ==========================================
// LLAMADAS DE SEGUIMIENTO DEL CRM (6-nov-2026)
// ==========================================
// Al poner ESTADO DE LLAMADA = SEGUIMIENTO en "1 - CAPTACIONES A/V" se abre una ventana
// (MODAL_SEGUIMIENTO.html) para anotar el detalle y programar la llamada (fecha y hora).
// La llamada vive EN LA MISMA FILA del CRM (Leonardo, 6-nov-2026):
//   PRÓXIMA LLAMADA (visible) + columnas técnicas ocultas al final (LLAMADA …).
// Una sola llamada pendiente por propietario; el historial queda en DETALLES DE SEGUIMIENTO.
// El motor de citas (cada 5 min) le manda a Leonardo los recordatorios:
//   24 h, 3 h, 2 h, ¿confirmas? (1 h 30), 1 h, 30, 15 y 5 min, y a la hora.
// A la hora: Contestó / No contestó (→ reprogramar), WhatsApp, Llamar y agendar la
// presentación virtual o la captación presencial con los datos ya llenos.
// Cada propietario del CRM tiene un ID DE LEAD (LD-######) que amarra sus llamadas y citas.

const LLAMADAS = {
  COL_PROXIMA: 'PRÓXIMA LLAMADA',
  // Técnicas: se crean al final y ocultas
  TECNICAS: ['LLAMADA ID', 'LLAMADA ESTADO', 'LLAMADA AVISO', 'LLAMADA TOKEN', 'LLAMADA EVENTO', 'LLAMADA NOTA'],
  // [clave, minutos antes]; C90 = pedir confirmación
  AVISOS: [['H24', 1440], ['H3', 180], ['H2', 120], ['C90', 90], ['H1', 60], ['M30', 30], ['M15', 15], ['M5', 5], ['M0', 0]],
  PENDIENTES: ['PROGRAMADA', 'CONFIRMADA'],
  COL_ID_LEAD: 'ID DE LEAD',
  ESTADO_ABRE: 'SEGUIMIENTO',
  URL_PAGINA: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/llamada.html'
};

// ---------- Formato de fechas del CRM (6-nov-2026) ----------
// Uno solo, el de siempre: "7 de octubre de 2026". Se aplica a la columna entera
// en cada pasada del motor, así queda igual sin importar quién escribió la fecha.
const FORMATO_FECHA_CRM = 'd-mmm-yyyy';
const FORMATO_FECHA_HORA_CRM = 'd-mmm-yyyy h:mm am/pm';
function formatoFechasCRM_(hoja, enc, filas) {
  const ini = SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS;
  [[SEGUIMIENTO_CAPTACIONES.COL_FECHA, FORMATO_FECHA_CRM], [SEGUIMIENTO_CAPTACIONES.COL_CONTACTO, FORMATO_FECHA_CRM], ['FECHA DE CAPTACIÓN', FORMATO_FECHA_CRM],
   [LLAMADAS.COL_PROXIMA, FORMATO_FECHA_HORA_CRM]].forEach(function (p) {
    const c = enc.indexOf(p[0]) + 1;
    if (c) hoja.getRange(ini, c, filas, 1).setNumberFormat(p[1]);
  });
}

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
    const enc = encabezadosCRM_(hoja);
    formatoFechasCRM_(hoja, enc, filas);
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

function encabezadosCRM_(hoja) {
  return hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
}

/** Crea (si faltan) PRÓXIMA LLAMADA visible y las columnas técnicas ocultas al final. */
function columnasLlamada_(hoja) {
  const col = {};
  col[LLAMADAS.COL_PROXIMA] = columnaCaptacion_(hoja, LLAMADAS.COL_PROXIMA);
  LLAMADAS.TECNICAS.forEach(n => {
    const antes = encabezadosCRM_(hoja).indexOf(n) + 1;
    col[n] = antes || columnaCaptacion_(hoja, n);
    if (!antes) { try { hoja.hideColumns(col[n]); } catch (e) {} }
  });
  return col;
}

// ---------- Ubicar la llamada (fila del CRM) ----------
/** Fila del CRM por ID DE LEAD. */
function filaPorIdLead_(idLead) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const n of SEGUIMIENTO_CAPTACIONES.HOJAS) {
    const hoja = ss.getSheetByName(n);
    if (!hoja) continue;
    const c = encabezadosCRM_(hoja).indexOf(LLAMADAS.COL_ID_LEAD) + 1;
    if (!c) continue;
    const filas = hoja.getLastRow() - SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + 1;
    if (filas <= 0) continue;
    const i = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, c, filas, 1).getValues().findIndex(x => String(x[0]).trim() === idLead);
    if (i !== -1) return { hoja: hoja, fila: SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + i };
  }
  return null;
}

/** Llamada por su ID (LLAMADA ID). Devuelve lectura y escritura sobre la fila del CRM. */
function leerLlamada_(idLlamada) {
  if (!idLlamada) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const n of SEGUIMIENTO_CAPTACIONES.HOJAS) {
    const hoja = ss.getSheetByName(n);
    if (!hoja) continue;
    const enc = encabezadosCRM_(hoja);
    const cId = enc.indexOf('LLAMADA ID') + 1;
    if (!cId) continue;
    const filas = hoja.getLastRow() - SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + 1;
    if (filas <= 0) continue;
    const i = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, cId, filas, 1).getValues().findIndex(x => String(x[0]).trim() === idLlamada);
    if (i === -1) continue;
    const fila = SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + i;
    const f = hoja.getRange(fila, 1, 1, enc.length).getValues()[0];
    return { hoja: hoja, fila: fila, v: (k) => { const j = enc.indexOf(k); return j === -1 ? '' : f[j]; },
      poner: (k, valor) => { const j = enc.indexOf(k); if (j !== -1) hoja.getRange(fila, j + 1).setValue(valor); } };
  }
  return null;
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

/**
 * Programa la llamada en la fila del CRM (desde la ventana o al reprogramar).
 * d = { hoja, fila, idLead, nombre, celular, servicio, direccion, nota, timestamp, estadoNuevo }
 * Si ya había una pendiente, la reemplaza (su evento se borra).
 */
function programarLlamada(d) {
  const inicio = new Date(Number(d.timestamp));
  if (isNaN(inicio.getTime())) return { success: false, error: 'Elige la fecha y la hora.' };
  if (inicio.getTime() < Date.now() - 60000) return { success: false, error: 'Esa hora ya pasó.' };
  let ub = d.hoja && d.fila ? { hoja: SpreadsheetApp.getActive().getSheetByName(d.hoja), fila: Number(d.fila) } : null;
  if (!ub || !ub.hoja) ub = filaPorIdLead_(d.idLead);
  if (!ub) return { success: false, error: 'No encontramos al propietario en el CRM.' };
  const { hoja, fila } = ub;
  const col = columnasLlamada_(hoja);
  const leer = (k) => hoja.getRange(fila, col[k]).getValue();

  // Una sola pendiente: la anterior se reemplaza
  if (LLAMADAS.PENDIENTES.indexOf(String(leer('LLAMADA ESTADO'))) !== -1) borrarEventoLlamadaId_(String(leer('LLAMADA EVENTO') || ''));

  const id = 'LL-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const nota = String(d.nota || '').trim().slice(0, 500);
  let idEvento = '';
  try {
    const ev = CalendarApp.getDefaultCalendar().createEvent('📞 SEGUIMIENTO: ' + d.nombre + (d.servicio ? ' (' + d.servicio + ')' : ''),
      inicio, new Date(inicio.getTime() + 15 * 60000),
      { description: 'Llamada de seguimiento (' + id + ' · ' + d.idLead + ')\nCelular: ' + d.celular + (nota ? '\nNota: ' + nota : '') });
    ev.removeAllReminders();
    idEvento = ev.getId();
  } catch (e) { Logger.log('No se pudo crear el evento de la llamada: ' + e.message); }

  hoja.getRange(fila, col[LLAMADAS.COL_PROXIMA]).setValue(inicio).setNumberFormat(FORMATO_FECHA_HORA_CRM);
  const poner = (k, v) => hoja.getRange(fila, col[k]).setValue(v);
  poner('LLAMADA ID', id); poner('LLAMADA ESTADO', 'PROGRAMADA');
  // Los avisos que ya "pasaron" no se mandan de golpe: se sigue desde el siguiente
  poner('LLAMADA AVISO', avisoVigenteLlamada_((inicio.getTime() - Date.now()) / 60000));
  poner('LLAMADA TOKEN', Utilities.getUuid()); poner('LLAMADA EVENTO', idEvento); poner('LLAMADA NOTA', nota);

  anotarEnCRM_(hoja, fila, (nota ? nota + '\n' : '') + 'Llamada programada: ' + textoFechaLlamada_(inicio) + ' (' + id + ')', d.estadoNuevo);
  return { success: true, idLlamada: id, texto: textoFechaLlamada_(inicio) };
}

function anotarEnCRM_(hoja, fila, texto, estadoNuevo) {
  const enc = encabezadosCRM_(hoja);
  const c = (n) => enc.indexOf(n) + 1;
  if (estadoNuevo && c(SEGUIMIENTO_CAPTACIONES.COL_ESTADO)) hoja.getRange(fila, c(SEGUIMIENTO_CAPTACIONES.COL_ESTADO)).setValue(estadoNuevo);
  if (c(SEGUIMIENTO_CAPTACIONES.COL_DETALLES)) {
    const celda = hoja.getRange(fila, c(SEGUIMIENTO_CAPTACIONES.COL_DETALLES)), previo = String(celda.getValue() || '').trim();
    celda.setValue((previo ? previo + '\n' : '') + texto);
  }
  const sello = selloSeguimiento_();
  if (c(SEGUIMIENTO_CAPTACIONES.COL_FECHA)) hoja.getRange(fila, c(SEGUIMIENTO_CAPTACIONES.COL_FECHA)).setValue(sello.fecha).setNumberFormat(FORMATO_FECHA_CRM);
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
  // Si se saltaron pasos (el motor no corrió), solo se manda el último que toca
  LLAMADAS.AVISOS.forEach(([k, m], i) => { if (minFaltan <= m && i > yaIdx) toca = k; });
  if (toca === 'C90' && confirmada) toca = null;
  return toca;
}

function revisarLlamadas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ahora = Date.now();
  SEGUIMIENTO_CAPTACIONES.HOJAS.forEach(n => {
    const hoja = ss.getSheetByName(n);
    if (!hoja) return;
    const enc = encabezadosCRM_(hoja);
    const iEst = enc.indexOf('LLAMADA ESTADO');
    if (iEst === -1) return;
    const filas = hoja.getLastRow() - SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + 1;
    if (filas <= 0) return;
    const datos = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, 1, filas, enc.length).getValues();
    datos.forEach((f, k) => {
      const estado = String(f[iEst] || '');
      if (LLAMADAS.PENDIENTES.indexOf(estado) === -1) return;
      const v = (nom) => { const j = enc.indexOf(nom); return j === -1 ? '' : f[j]; };
      const fila = SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + k;
      const inicio = v(LLAMADAS.COL_PROXIMA);
      if (!(inicio instanceof Date)) return;
      const minFaltan = (inicio.getTime() - ahora) / 60000;
      if (minFaltan < -180) { hoja.getRange(fila, iEst + 1).setValue('SIN RESULTADO'); return; }
      const paso = avisoQueTocaLlamada_(minFaltan, String(v('LLAMADA AVISO') || ''), estado === 'CONFIRMADA');
      if (!paso) return;
      try { enviarAvisoLlamada_(paso, v, n, inicio); }
      catch (e) { Logger.log('Error en el aviso ' + paso + ' de ' + v('LLAMADA ID') + ': ' + e.message); }
      hoja.getRange(fila, enc.indexOf('LLAMADA AVISO') + 1).setValue(paso);
    });
  });
}

function urlLlamada_(id, token, accion) {
  return LLAMADAS.URL_PAGINA + '?l=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(token) + (accion ? '&a=' + accion : '');
}

function enviarAvisoLlamada_(paso, v, nombreHoja, inicio) {
  const id = String(v('LLAMADA ID')), token = String(v('LLAMADA TOKEN'));
  const nombre = String(v('NOMBRE DEL PROPIETARIO') || 'el propietario').trim();
  const cel = celularInternacional_(v('CELULAR'));
  const negocio = nombreHoja.slice(-1) === 'V' ? 'Venta' : 'Arriendo';
  const nota = String(v('LLAMADA NOTA') || '');
  const ubicacion = [v('UBICACIÓN'), v('LOCALIDAD')].filter(Boolean).join(', ');
  const cuando = { H24: 'mañana', H3: 'en 3 horas', H2: 'en 2 horas', C90: 'en 1 hora y 30 minutos', H1: 'en 1 hora', M30: 'en 30 minutos', M15: 'en 15 minutos', M5: 'en 5 minutos', M0: 'ahora' }[paso];
  const tarjeta = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0;border-radius:12px;background:#1c1917;"><tr><td style="padding:16px 18px;font-family:Arial,sans-serif;">' +
    '<div style="color:#d4af37;font-size:12px;letter-spacing:2px;font-weight:bold;">LLAMADA DE SEGUIMIENTO</div>' +
    `<div style="color:#fff;font-size:19px;font-weight:bold;margin-top:4px;">${nombre}</div>` +
    `<div style="color:#e7e5e4;font-size:15px;margin-top:2px;">${textoFechaLlamada_(inicio)} · ${negocio}</div>` +
    (ubicacion ? `<div style="color:#a8a29e;font-size:13px;margin-top:4px;">${ubicacion}${v('VALOR DE PROMOCIÓN') ? ' · ' + v('VALOR DE PROMOCIÓN') : ''}</div>` : '') +
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
    const agenda = (modo) => URL_PORTAFOLIO_CITAS + '?desdeLlamada=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(token) + '&modo=' + modo;
    herramientas.push(botonHerramientaCita_('meet', 'Presentación virtual', agenda('VIRTUAL')));
    herramientas.push(botonHerramientaCita_('ruta', 'Captación presencial', agenda('PRESENCIAL')));
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
function llamadaValida_(datos) {
  const l = leerLlamada_(String(datos.l || ''));
  return l && String(l.v('LLAMADA TOKEN')) === String(datos.t || '') ? l : null;
}

function infoLlamada(datos) {
  const l = llamadaValida_(datos);
  if (!l) return { ok: false, mensaje: 'Este enlace ya no es válido: puede que la llamada se haya reprogramado.' };
  const inicio = l.v(LLAMADAS.COL_PROXIMA);
  return { ok: true, nombre: String(l.v('NOMBRE DEL PROPIETARIO') || ''), estado: String(l.v('LLAMADA ESTADO') || ''),
    negocio: l.hoja.getName().slice(-1) === 'V' ? 'Venta' : 'Arriendo',
    cuando: inicio instanceof Date ? textoFechaLlamada_(inicio) : '', nota: String(l.v('LLAMADA NOTA') || '') };
}

/** a: CONFIRMAR | CONTESTO | NO_CONTESTO | REPROGRAMAR. Con NO_CONTESTO/REPROGRAMAR llega timestamp nuevo. */
function accionLlamada(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const l = llamadaValida_(datos);
    if (!l) return { ok: false, mensaje: 'Este enlace ya no es válido: puede que la llamada se haya reprogramado.' };
    const estado = String(l.v('LLAMADA ESTADO') || '');
    if (LLAMADAS.PENDIENTES.indexOf(estado) === -1) return { ok: false, mensaje: 'Esta llamada ya quedó cerrada (' + estado.toLowerCase() + ').' };
    const a = String(datos.a || '');
    const nota = String(datos.nota || '').trim().slice(0, 500);
    const idLl = String(l.v('LLAMADA ID'));
    if (a === 'CONFIRMAR') { l.poner('LLAMADA ESTADO', 'CONFIRMADA'); return { ok: true, mensaje: 'Listo, la llamada quedó confirmada. Te seguimos recordando.' }; }
    if (a === 'CONTESTO') {
      l.poner('LLAMADA ESTADO', 'CONTESTÓ'); l.poner(LLAMADAS.COL_PROXIMA, '');
      marcarEventoHecho_(String(l.v('LLAMADA EVENTO') || ''));
      anotarEnCRM_(l.hoja, l.fila, 'Contestó' + (nota ? ': ' + nota : '') + ' (' + idLl + ')');
      return { ok: true, mensaje: 'Anotado en el CRM. Si quedó lista la presentación, agéndala desde el correo.' };
    }
    if (a === 'NO_CONTESTO' || a === 'REPROGRAMAR') {
      if (!datos.timestamp) return { ok: false, mensaje: 'Elige la nueva fecha y hora.' };
      const noContesto = a === 'NO_CONTESTO';
      // Primer "no contestó": VOLVER A LLAMAR; si ya iba en ese, VOLVER A LLAMAR 2
      let estadoCRM = '';
      if (noContesto) {
        const actual = normalizarEstadoCaptacion_(l.v(SEGUIMIENTO_CAPTACIONES.COL_ESTADO));
        estadoCRM = actual === 'VOLVER A LLAMAR' || actual === 'VOLVER A LLAMAR 2' ? 'VOLVER A LLAMAR 2' : 'VOLVER A LLAMAR';
      }
      const d = datosFilaCaptacion_(l.hoja, l.fila);
      const r = programarLlamada({ hoja: l.hoja.getName(), fila: l.fila, idLead: String(l.v(LLAMADAS.COL_ID_LEAD)),
        nombre: d.nombre, celular: d.celular, servicio: d.servicio, direccion: d.direccion,
        nota: (noContesto ? 'No contestó' : 'Reprogramada') + (nota ? ': ' + nota : ''), timestamp: datos.timestamp, estadoNuevo: estadoCRM });
      if (!r.success) return { ok: false, mensaje: r.error };
      return { ok: true, mensaje: 'Nueva llamada programada para el ' + r.texto + '.' };
    }
    return { ok: false, mensaje: 'Acción no válida.' };
  } finally { lock.releaseLock(); }
}

function borrarEventoLlamadaId_(id) {
  if (!id) return;
  try { const ev = CalendarApp.getDefaultCalendar().getEventById(id); if (ev) ev.deleteEvent(); } catch (e) {}
}
function marcarEventoHecho_(id) {
  if (!id) return;
  try { const ev = CalendarApp.getDefaultCalendar().getEventById(id); if (ev) ev.setTitle('✅ ' + ev.getTitle()); } catch (e) {}
}

/** Datos para agendar la presentación desde el correo de la llamada (portafolio/?desdeLlamada=…). */
function datosDesdeLlamada(datos) {
  const l = llamadaValida_(datos);
  if (!l) return { ok: false };
  const d = datosFilaCaptacion_(l.hoja, l.fila);
  return { ok: true, nombre: d.nombre, celular: d.celular.length > 10 ? d.celular.slice(-10) : d.celular, correo: d.correo,
    servicio: d.servicio, direccion: d.direccion };
}

/** Quita la pestaña vieja "2.3 - LLAMADAS DE SEGUIMIENTO" si quedó vacía (las llamadas ahora viven en el CRM). */
function quitarHojaLlamadasVieja_() {
  const h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('2.3 - LLAMADAS DE SEGUIMIENTO');
  if (h && h.getLastRow() <= 1) { SpreadsheetApp.getActiveSpreadsheet().deleteSheet(h); return true; }
  return false;
}
