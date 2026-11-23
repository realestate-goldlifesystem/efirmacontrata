// ==========================================
// CRM DE CAPTACIONES DESDE EL PANEL DEL AGENTE (18-nov-2026)
// ==========================================
// La herramienta "Captaciones" del portafolio es una ventana sobre las pestañas
// "1 - CAPTACIONES A" / "1 - CAPTACIONES V": no guarda nada aparte. Lo que se cambia
// desde el panel queda en la misma fila del Sheet, y lo que se cambia en el Sheet
// se ve en el panel.
//
// Reglas que se respetan igual que en el Sheet:
//   - Al salir de NUEVO se sella FECHA/HORA DE SEGUIMIENTO (marcarSeguimientoCaptacion_).
//   - Al escribir en DETALLES DE SEGUIMIENTO se vuelve a sellar (marcarSeguimientoPorDetalles_).
//   - Programar la llamada usa programarLlamada (LLAMADAS_SEGUIMIENTO.js).
//   - Agendar la presentación usa agendarDesdeCaptacion (AGENDA_CAPTACION.js).
// El onEdit no corre con escrituras por código, por eso aquí se aplican a mano.
//
// Cada propietario se ubica por su ID DE LEAD, nunca por el número de fila que
// mandó el navegador: si alguien ordenó o insertó filas en el Sheet entre tanto,
// el número viejo apuntaría a otra persona.

const CRM_PANEL = {
  HOJAS: { A: '1 - CAPTACIONES A', V: '1 - CAPTACIONES V' },
  MAX_NOTA: 1000
};

/** Una sola entrada desde doPost: datos.op = listar | actualizar | ocupado | programar | agendar. */
function crmCaptacionesDesdeWeb(datos) {
  const permiso = _verificarAgenteGoogle(datos && datos.credential);
  if (!permiso.ok) {
    return { success: false, message: String(permiso.mensaje).replace('lanzar a Miguel', 'ver las captaciones') };
  }
  try {
    switch (datos.op) {
      case 'listar': return crmListar_(datos);
      case 'actualizar': return crmActualizar_(datos);
      case 'ocupado': return crmOcupado_(datos);
      case 'programar': return crmProgramar_(datos);
      case 'agendar': return crmAgendar_(datos);
      case 'editar': return crmEditar_(datos);
      default: return { success: false, message: 'Operación desconocida: ' + datos.op };
    }
  } catch (e) {
    Logger.log('crmCaptacionesDesdeWeb ' + datos.op + ': ' + e.stack);
    return { success: false, message: 'Error en el CRM: ' + e.message };
  }
}

// ---------- Lectura ----------

function crmListar_(datos) {
  const op = datos.operacion === 'V' ? 'V' : 'A';
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CRM_PANEL.HOJAS[op]);
  if (!hoja) return { success: false, message: 'No existe la pestaña ' + CRM_PANEL.HOJAS[op] };
  const enc = encabezadosCRM_(hoja);
  const p0 = SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS;
  const n = hoja.getLastRow() - p0 + 1;
  const leads = [];
  if (n > 0) {
    const rango = hoja.getRange(p0, 1, n, enc.length);
    const vals = rango.getValues(), txt = rango.getDisplayValues();
    for (let i = 0; i < n; i++) {
      const lead = crmLeadDeValores_(enc, vals[i], txt[i], p0 + i);
      if (lead) leads.push(lead);
    }
  }
  return {
    success: true, operacion: op, pestana: hoja.getName(), ahora: Date.now(),
    estados: crmEstadosConColor_(hoja, enc), leads: leads
  };
}

/** Un propietario a partir de su fila. null si la fila no tiene celular (fila vacía). */
function crmLeadDeValores_(enc, v, t, fila) {
  const i = (nombre) => enc.indexOf(nombre);
  const txt = (nombre) => { const k = i(nombre); return k === -1 ? '' : String(t[k] == null ? '' : t[k]).trim(); };
  const ms = (nombre) => {
    const k = i(nombre);
    if (k === -1) return null;
    const x = v[k];
    return x instanceof Date && !isNaN(x.getTime()) ? x.getTime() : null;
  };
  const celular = txt('CELULAR').replace(/\D/g, '');
  if (!celular) return null;
  return {
    idLead: txt(LLAMADAS.COL_ID_LEAD),
    fila: fila,
    n: txt('N'),
    nombre: txt('NOMBRE DEL PROPIETARIO'),
    celular: celular,
    link: txt('LINK DEL INMUEBLE PUBLICADO'),
    estado: normalizarEstadoCaptacion_(txt(SEGUIMIENTO_CAPTACIONES.COL_ESTADO)),
    tipo: txt('TIPO DE INMUEBLE'),
    habitaciones: txt('HABITACIONES'),
    valor: txt('VALOR DE PROMOCIÓN'),
    ubicacion: txt('UBICACIÓN'),
    localidad: txt('LOCALIDAD'),
    torre: txt(AGENDA_CAPTACION.COL_TORRE),
    numInmueble: txt(AGENDA_CAPTACION.COL_NUM_INMUEBLE),
    detalles: txt(SEGUIMIENTO_CAPTACIONES.COL_DETALLES),
    fechaSeguimiento: txt(SEGUIMIENTO_CAPTACIONES.COL_FECHA),
    horaSeguimiento: txt(SEGUIMIENTO_CAPTACIONES.COL_HORA),
    seguimientoMs: ms(SEGUIMIENTO_CAPTACIONES.COL_FECHA),
    fechaContacto: txt(SEGUIMIENTO_CAPTACIONES.COL_CONTACTO),
    fechaCaptacion: txt('FECHA DE CAPTACIÓN'),
    captacionMs: ms('FECHA DE CAPTACIÓN') || ms(SEGUIMIENTO_CAPTACIONES.COL_CONTACTO),
    proximaLlamadaMs: ms(LLAMADAS.COL_PROXIMA),
    llamadaEstado: txt('LLAMADA ESTADO'),
    llamadaTipo: tipoSeguimiento_(txt('LLAMADA TIPO')),
    correo: txt(AGENDA_CAPTACION.COL_CORREO),
    idCita: txt(AGENDA_CAPTACION.COL_ID_CITA),
    // % de oferta negociado, en puntos (70, 2.5); '' si no hay
    ofertaA: i(AGENDA_CAPTACION.COL_OFERTA.A) === -1 ? '' : ofertaEnPuntos_(v[i(AGENDA_CAPTACION.COL_OFERTA.A)]),
    ofertaV: i(AGENDA_CAPTACION.COL_OFERTA.V) === -1 ? '' : ofertaEnPuntos_(v[i(AGENDA_CAPTACION.COL_OFERTA.V)])
  };
}

/**
 * Los estados del desplegable de la columna de estado, en su orden, con los
 * colores de las reglas de formato condicional del propio Sheet. Así el panel
 * pinta lo mismo que el Sheet y un estado nuevo aparece solo.
 */
function crmEstadosConColor_(hoja, enc) {
  const cEstado = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_ESTADO) + 1;
  const cCel = enc.indexOf('CELULAR') + 1;
  let lista = [];
  try {
    const dv = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, cEstado).getDataValidation();
    if (dv) lista = (dv.getCriteriaValues()[0] || []).map(x => String(x).trim()).filter(Boolean);
    // REAGENDAR (23-nov-2026): se agrega una sola vez al desplegable, justo después de PRE-R CAPTACION
    if (dv && lista.length && lista.map(normalizarEstadoCaptacion_).indexOf(AGENDA_CAPTACION.ESTADO_REAGENDAR) === -1) {
      const pos = lista.map(normalizarEstadoCaptacion_).indexOf(AGENDA_CAPTACION.ESTADO);
      lista.splice(pos === -1 ? lista.length : pos + 1, 0, AGENDA_CAPTACION.ESTADO_REAGENDAR);
      const regla = dv.copy().requireValueInList(lista, true).build();
      const p0 = SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS;
      hoja.getRange(p0, cEstado, Math.max(hoja.getMaxRows() - p0 + 1, 1), 1).setDataValidation(regla);
      const fmt = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(AGENDA_CAPTACION.ESTADO_REAGENDAR)
        .setBackground('#fde68a').setFontColor('#92400e').setRanges([hoja.getRange(p0, cEstado, Math.max(hoja.getMaxRows() - p0 + 1, 1), 1)]).build();
      const reglas = hoja.getConditionalFormatRules(); reglas.push(fmt); hoja.setConditionalFormatRules(reglas);
    }
  } catch (e) { Logger.log('No se pudo leer el desplegable de estados: ' + e.message); }

  // Primero las reglas sobre la columna de estado; las de CELULAR solo llenan huecos
  const colores = {};
  const tomar = (columna) => hoja.getConditionalFormatRules().forEach(regla => {
    const bc = regla.getBooleanCondition();
    if (!bc) return;
    const enColumna = regla.getRanges().some(r => r.getColumn() <= columna && r.getLastColumn() >= columna);
    if (!enColumna) return;
    const valores = bc.getCriteriaValues().map(String);
    let nombre = '';
    if (String(bc.getCriteriaType()) === 'TEXT_EQUAL_TO') nombre = valores[0];
    else { const m = (valores[0] || '').match(/=\s*"([^"]+)"/); if (m) nombre = m[1]; }
    nombre = normalizarEstadoCaptacion_(nombre);
    if (!nombre || colores[nombre]) return;
    const fondo = crmColor_(bc, 'getBackgroundObject', 'getBackground');
    if (fondo) colores[nombre] = { fondo: fondo, texto: crmColor_(bc, 'getFontColorObject', 'getFontColor') || '' };
  });
  if (cEstado) tomar(cEstado);
  if (cCel) tomar(cCel);

  return lista.map(nombre => {
    const c = colores[normalizarEstadoCaptacion_(nombre)] || {};
    return { nombre: nombre, fondo: c.fondo || '', texto: c.texto || '' };
  });
}

function crmColor_(bc, metodoObjeto, metodoTexto) {
  try {
    const o = bc[metodoObjeto] && bc[metodoObjeto]();
    if (o && o.getColorType && String(o.getColorType()) === 'RGB') return o.asRgbColor().asHexString();
  } catch (e) {}
  try { const s = bc[metodoTexto] && bc[metodoTexto](); return s ? String(s) : ''; } catch (e) { return ''; }
}

/** Ubica al propietario por su ID DE LEAD y devuelve también la fila ya leída. */
function crmUbicar_(idLead) {
  const ub = filaPorIdLead_(String(idLead || '').trim());
  if (!ub) return null;
  const enc = encabezadosCRM_(ub.hoja);
  const r = ub.hoja.getRange(ub.fila, 1, 1, enc.length);
  ub.enc = enc;
  ub.lead = crmLeadDeValores_(enc, r.getValues()[0], r.getDisplayValues()[0], ub.fila);
  return ub;
}

function crmReleer_(idLead) {
  const ub = crmUbicar_(idLead);
  return ub ? ub.lead : null;
}

// ---------- Escritura ----------

/**
 * Cambia el estado y/o agrega una nota en DETALLES DE SEGUIMIENTO.
 * datos = { idLead, estado?, nota? }
 */
function crmActualizar_(datos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { success: false, message: 'El CRM está ocupado, intenta de nuevo en unos segundos.' };
  try {
    const ub = crmUbicar_(datos.idLead);
    if (!ub) return { success: false, message: 'No encontramos a este propietario en el CRM. Recarga la lista.' };
    const hoja = ub.hoja, fila = ub.fila, enc = ub.enc;
    const col = (n) => enc.indexOf(n) + 1;
    const cfg = SEGUIMIENTO_CAPTACIONES;
    let sellar = false;

    if (datos.estado) {
      const nuevo = String(datos.estado).trim();
      const validos = crmEstadosConColor_(hoja, enc).map(e => normalizarEstadoCaptacion_(e.nombre));
      if (validos.length && validos.indexOf(normalizarEstadoCaptacion_(nuevo)) === -1) {
        return { success: false, message: 'El estado "' + nuevo + '" no está en el desplegable del Sheet.' };
      }
      const anterior = ub.lead ? ub.lead.estado : '';
      hoja.getRange(fila, col(cfg.COL_ESTADO)).setValue(nuevo);
      // Igual que en el Sheet: solo se sella al salir de NUEVO
      if (anterior === cfg.ESTADO_INICIAL && normalizarEstadoCaptacion_(nuevo) !== cfg.ESTADO_INICIAL) sellar = true;
    }

    let nota = String(datos.nota || '').trim().slice(0, CRM_PANEL.MAX_NOTA);
    // Cierre en NO desde el panel: razón + cancela el seguimiento pendiente (CIERRE_NO.js)
    if (datos.cierreNo) {
      const cancelada = cancelarSeguimientoPorCierre_(hoja, fila);
      nota = textoCierreNo_(datos.razon, datos.detalle) + (cancelada ? '\n' + 'Seguimiento ' + cancelada + ' cancelado' : '');
    }
    if (nota && col(cfg.COL_DETALLES)) {
      anexarDetalleCaptacion_(hoja.getRange(fila, col(cfg.COL_DETALLES)), nota);
      sellar = true;
    }

    if (sellar) {
      const sello = selloSeguimiento_();
      if (col(cfg.COL_FECHA)) hoja.getRange(fila, col(cfg.COL_FECHA)).setValue(sello.fecha).setNumberFormat(FORMATO_FECHA_CRM);
      if (col(cfg.COL_HORA)) hoja.getRange(fila, col(cfg.COL_HORA)).setValue(sello.hora);
    }
    SpreadsheetApp.flush();
    return { success: true, lead: crmReleer_(datos.idLead) };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Edita los datos del propietario y del inmueble desde el lápiz de la ficha
 * (19-nov-2026). Solo se escriben los campos que llegan, por NOMBRE de columna.
 * datos = { idLead, cambios: { nombre?, celular?, correo?, ubicacion?, localidad?, habitaciones?, valor?, tipo? } }
 * No sella FECHA/HORA DE SEGUIMIENTO: corregir un dato no es una gestión.
 */
function crmCamposEditables_() {
  return {
    nombre: 'NOMBRE DEL PROPIETARIO', celular: 'CELULAR', correo: AGENDA_CAPTACION.COL_CORREO,
    ubicacion: 'UBICACIÓN', localidad: 'LOCALIDAD', habitaciones: 'HABITACIONES',
    valor: 'VALOR DE PROMOCIÓN', tipo: 'TIPO DE INMUEBLE',
    ofertaA: AGENDA_CAPTACION.COL_OFERTA.A, ofertaV: AGENDA_CAPTACION.COL_OFERTA.V
  };
}
function crmEditar_(datos) {
  const CRM_CAMPOS_EDITABLES = crmCamposEditables_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { success: false, message: 'El CRM está ocupado, intenta de nuevo en unos segundos.' };
  try {
    const ub = crmUbicar_(datos.idLead);
    if (!ub) return { success: false, message: 'No encontramos a este propietario en el CRM. Recarga la lista.' };
    const hoja = ub.hoja, fila = ub.fila, enc = ub.enc;
    const cambios = datos.cambios || {};
    const escribir = [];
    for (const campo in cambios) {
      if (!CRM_CAMPOS_EDITABLES[campo]) continue;
      const c = enc.indexOf(CRM_CAMPOS_EDITABLES[campo]) + 1;
      if (!c) return { success: false, message: 'No existe la columna "' + CRM_CAMPOS_EDITABLES[campo] + '" en el Sheet.' };
      let v = String(cambios[campo] == null ? '' : cambios[campo]).trim().slice(0, 300);
      if (campo === 'celular') {
        v = v.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');
        if (!/^\d{10}$/.test(v)) return { success: false, message: 'El celular debe tener 10 dígitos.' };
        // Igual que Miguel: un celular no se repite en la misma pestaña
        const p0 = SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, n = hoja.getLastRow() - p0 + 1;
        const cels = n > 0 ? hoja.getRange(p0, c, n, 1).getDisplayValues() : [];
        const otra = cels.findIndex((x, k) => p0 + k !== fila && String(x[0]).replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '') === v);
        if (otra !== -1) return { success: false, message: 'Ese celular ya está en la fila ' + (p0 + otra) + ' de esta pestaña.' };
      }
      if (campo === 'correo' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { success: false, message: 'Escribe un correo válido.' };
      if (campo === 'localidad') {
        v = v.toUpperCase();
        if (v && ['U', 'S', 'C'].indexOf(v) === -1) return { success: false, message: 'La localidad debe ser U, S o C.' };
      }
      if (campo === 'nombre' && !v) return { success: false, message: 'El nombre no puede quedar vacío.' };
      if (campo === 'ofertaA' || campo === 'ofertaV') {
        const o = ofertaCaptacionValida_(campo.slice(-1), v);
        if (!o.ok) return { success: false, message: o.error };
        v = o.vacio ? '' : o.fraccion;
      }
      escribir.push([c, v, campo]);
    }
    escribir.forEach(([c, v, campo]) => {
      const celda = hoja.getRange(fila, c);
      if (campo === 'celular') celda.setNumberFormat('@');
      if (campo === 'ofertaA' || campo === 'ofertaV') celda.setNumberFormat(AGENDA_CAPTACION.FORMATO_OFERTA[campo.slice(-1)]);
      celda.setValue(v);
    });
    SpreadsheetApp.flush();
    return { success: true, lead: crmReleer_(datos.idLead) };
  } finally {
    lock.releaseLock();
  }
}

/** Horas ocupadas para la ventana de programar llamada (lo mismo que ve el Sheet). */
function crmOcupado_(datos) {
  const ub = crmUbicar_(datos.idLead);
  if (!ub) return { success: false, message: 'No encontramos a este propietario en el CRM.' };
  return {
    success: true,
    ocupado: ocupadoParaLlamada({ hoja: ub.hoja.getName(), fila: ub.fila, desde: Number(datos.desde), hasta: Number(datos.hasta) })
  };
}

/** Programa la llamada o el mensaje de seguimiento. datos = { idLead, nota, timestamp, tipo? } (tipo: LLAMADA | MENSAJE) */
function crmProgramar_(datos) {
  const ub = crmUbicar_(datos.idLead);
  if (!ub) return { success: false, message: 'No encontramos a este propietario en el CRM.' };
  const d = datosFilaCaptacion_(ub.hoja, ub.fila);
  const r = programarLlamada({
    hoja: ub.hoja.getName(), fila: ub.fila, idLead: ub.lead.idLead, nombre: d.nombre, celular: d.celular,
    servicio: d.servicio, direccion: d.direccion, nota: datos.nota, timestamp: Number(datos.timestamp),
    tipo: tipoSeguimiento_(datos.tipo), ofertaA: datos.ofertaA, ofertaV: datos.ofertaV,
    estadoNuevo: datos.estadoNuevo === 'SEGUIMIENTO' ? 'SEGUIMIENTO' : ''
  });
  if (r && r.success) r.lead = crmReleer_(datos.idLead);
  else if (r && r.error) r.message = r.error;
  return r;
}

/**
 * Agenda la presentación (virtual o presencial) con la agenda del portal.
 * datos = { idLead, nombre, celular, correo, servicio, direccion, notas, timestamp, textoCita, modalidad }
 */
function crmAgendar_(datos) {
  const ub = crmUbicar_(datos.idLead);
  if (!ub) return { success: false, message: 'No encontramos a este propietario en el CRM.' };
  const r = agendarDesdeCaptacion({
    hoja: ub.hoja.getName(), fila: ub.fila, nombre: datos.nombre, celular: datos.celular, correo: datos.correo,
    servicio: datos.servicio, direccion: datos.direccion, notas: datos.notas, timestamp: Number(datos.timestamp),
    textoCita: datos.textoCita, modalidad: datos.modalidad, torre: datos.torre, numInmueble: datos.numInmueble,
    ofertaA: datos.ofertaA, ofertaV: datos.ofertaV, reagendar: !!datos.reagendar
  });
  if (r && r.success) r.lead = crmReleer_(datos.idLead);
  else if (r && (r.error || r.message)) r.message = r.error || r.message;
  return r;
}
