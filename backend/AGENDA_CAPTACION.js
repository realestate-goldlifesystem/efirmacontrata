// ==========================================
// AGENDA DESDE EL CRM DE CAPTACIONES (5-nov-2026)
// ==========================================
// En "1 - CAPTACIONES A" / "1 - CAPTACIONES V", al poner ESTADO DE LLAMADA en
// "PRE-R CAPTACION" se abre una ventana para agendar la presentación al
// propietario con la misma agenda del portal (agendarCita, tipo PROPIETARIO):
// mismos horarios, mismo evento en Calendar, mismos correos y recordatorios.
// La ventana toma nombre, celular y ubicación del registro; el correo se pide en
// la llamada y queda guardado en la columna CORREO DEL PROPIETARIO.

const AGENDA_CAPTACION = {
  ESTADO: 'PRE-R CAPTACION',
  // REAGENDAR (23-nov-2026): abre la misma ventana para una cita NUEVA; la anterior queda
  // cancelada (❌ en el calendario, como historial) y el CRM vuelve a PRE-R CAPTACION.
  ESTADO_REAGENDAR: 'REAGENDAR',
  COL_CORREO: 'CORREO DEL PROPIETARIO',
  // La cita de presentación que se agendó desde esa fila: enlaza el CRM con la agenda y el registro
  COL_ID_CITA: 'ID CITA',
  // % de oferta negociado con el propietario: solo para el agente (no va al
  // calendario ni al correo). Cada pestaña exige el suyo (A arriendo, V venta);
  // el otro es opcional, para servicios mixtos (Vendi-Renta, Admi-Venta).
  COL_OFERTA: { A: '% DE OFERTA A', V: '% DE OFERTA V' },
  FORMATO_OFERTA: { A: '0%', V: '0.0%' },
  OFERTAS_VENTA: [1, 1.5, 2, 2.5, 3]
};

/**
 * Valida un % de oferta escrito en puntos (70, "2,5", "70 %").
 * Arriendo: entero de 50 a 100. Venta: 1, 1.5, 2, 2.5 o 3.
 * Devuelve { ok, vacio, fraccion (lo que va en la celda: 0.7), puntos, error }.
 */
function ofertaCaptacionValida_(clase, valor) {
  const s = String(valor == null ? '' : valor).replace('%', '').replace(',', '.').trim();
  if (!s) return { ok: true, vacio: true };
  const n = Number(s);
  if (clase === 'A') {
    if (!Number.isInteger(n) || n < 50 || n > 100) return { ok: false, error: 'El % de oferta en arriendo debe ser un número entero entre 50 y 100.' };
  } else if (AGENDA_CAPTACION.OFERTAS_VENTA.indexOf(n) === -1) {
    return { ok: false, error: 'El % de oferta en venta debe ser 1, 1.5, 2, 2.5 o 3.' };
  }
  return { ok: true, vacio: false, puntos: n, fraccion: Math.round(n * 10) / 1000 };
}

/**
 * Qué % pide cada servicio de la ventana: Venta → venta; Vendi-Renta y Admi-Venta
 * → los dos; Arriendo y Administración → arriendo. Manda el servicio elegido, no la pestaña.
 */
function ofertasDelServicio_(servicio) {
  const s = String(servicio || '').toLowerCase();
  if (/vendi|admi-venta/.test(s)) return ['A', 'V'];
  if (/venta/.test(s)) return ['V'];
  return ['A'];
}

/** Valor de la celda de % (0.7, 1, "3%") → puntos (70, 100, 3); '' si está vacía. */
function ofertaEnPuntos_(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'number') return Math.round(v * 1000) / 10;
  const s = String(v).replace(',', '.');
  const m = s.match(/\d+(\.\d+)?/);
  if (!m) return '';
  const n = Number(m[0]);
  return s.indexOf('%') !== -1 || n > 1 ? n : Math.round(n * 1000) / 10;
}

/** "70 % arriendo · 2,5 % venta" con los puntos que haya. */
function textoOfertaCaptacion_(a, v) {
  return [a !== '' && a != null ? String(a).replace('.', ',') + ' % arriendo' : '',
          v !== '' && v != null ? String(v).replace('.', ',') + ' % venta' : ''].filter(Boolean).join(' · ');
}

/** Lo llama procesarEdicionCaptacion_ (GESTOR DE ESTADOS.js) al cambiar ESTADO DE LLAMADA. */
function abrirAgendaCaptacionSiToca_(e, hoja, colEstado) {
  const r = e.range;
  if (r.getNumRows() !== 1 || r.getNumColumns() !== 1 || r.getColumn() !== colEstado) return;
  if (r.getRow() < SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS) return;
  const est = normalizarEstadoCaptacion_(e.value);
  if (est !== AGENDA_CAPTACION.ESTADO && est !== AGENDA_CAPTACION.ESTADO_REAGENDAR) return;
  abrirModalAgendaCaptacion_(hoja, r.getRow(), est === AGENDA_CAPTACION.ESTADO_REAGENDAR);
}

/** Menú o atajo: abre la ventana para la fila seleccionada. */
function agendarCaptacionFilaActual() {
  const hoja = SpreadsheetApp.getActiveSheet();
  if (SEGUIMIENTO_CAPTACIONES.HOJAS.indexOf(hoja.getName()) === -1) {
    SpreadsheetApp.getUi().alert('Ubícate en una fila de "1 - CAPTACIONES A" o "1 - CAPTACIONES V".');
    return;
  }
  abrirModalAgendaCaptacion_(hoja, hoja.getActiveRange().getRow());
}

function columnaCorreoCaptacion_(hoja) {
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
  let c = enc.indexOf(AGENDA_CAPTACION.COL_CORREO) + 1;
  if (!c) {
    // Al final, para no correr las columnas que escribe el robot captador
    c = hoja.getLastColumn() + 1;
    hoja.getRange(1, c).setValue(AGENDA_CAPTACION.COL_CORREO).setFontWeight('bold');
  }
  return c;
}

/** Columna (al final si no existe) de la pestaña de captaciones. */
function columnaCaptacion_(hoja, nombre) {
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
  let c = enc.indexOf(nombre) + 1;
  if (!c) { c = hoja.getLastColumn() + 1; hoja.getRange(1, c).setValue(nombre).setFontWeight('bold'); }
  return c;
}

function datosFilaCaptacion_(hoja, fila) {
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
  const v = hoja.getRange(fila, 1, 1, enc.length).getValues()[0];
  const de = (n) => { const i = enc.indexOf(n); return i === -1 ? '' : String(v[i] == null ? '' : v[i]).trim(); };
  const pct = (clase) => { const i = enc.indexOf(AGENDA_CAPTACION.COL_OFERTA[clase]); return i === -1 ? '' : ofertaEnPuntos_(v[i]); };
  const ubicacion = [de('UBICACIÓN'), de('LOCALIDAD')].filter(Boolean).join(', ');
  const tipo = [de('TIPO DE INMUEBLE'), de('HABITACIONES') ? de('HABITACIONES') + ' hab.' : ''].filter(Boolean).join(' · ');
  return {
    hoja: hoja.getName(), fila: fila,
    nombre: de('NOMBRE DEL PROPIETARIO'),
    celular: de('CELULAR').replace(/\D/g, ''),
    correo: de(AGENDA_CAPTACION.COL_CORREO),
    servicio: hoja.getName().slice(-1) === 'V' ? 'Venta' : 'Arriendo',
    clase: hoja.getName().slice(-1) === 'V' ? 'V' : 'A',
    ofertaA: pct('A'), ofertaV: pct('V'),
    idCitaAnterior: de(AGENDA_CAPTACION.COL_ID_CITA),
    direccion: ubicacion,
    notas: [tipo, de('VALOR DE PROMOCIÓN') ? 'Valor publicado: ' + de('VALOR DE PROMOCIÓN') : '', de('LINK DEL INMUEBLE PUBLICADO')].filter(Boolean).join('\n')
  };
}

function abrirModalAgendaCaptacion_(hoja, fila, reagendar) {
  columnaCorreoCaptacion_(hoja);
  const t = HtmlService.createTemplateFromFile('backend/MODAL_AGENDA_CAPTACION');
  const d = datosFilaCaptacion_(hoja, fila);
  d.reagendar = !!reagendar;
  t.DATOS = JSON.stringify(d);
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(560).setHeight(700),
    reagendar ? 'Reagendar presentación al propietario' : 'Agendar presentación al propietario');
}

/** Horarios del día para la ventana (misma agenda del portal). */
function disponibilidadCaptacion(fechaIso) {
  return obtenerDisponibilidad(fechaIso);
}

/** Agenda la cita, guarda el correo en la fila y deja nota en el seguimiento. */
function agendarDesdeCaptacion(d) {
  const ss = SpreadsheetApp.getActive();
  const hoja = ss.getSheetByName(d.hoja);
  if (!hoja || SEGUIMIENTO_CAPTACIONES.HOJAS.indexOf(d.hoja) === -1) return { success: false, error: 'Pestaña no válida' };
  const correo = String(d.correo || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { success: false, error: 'Escribe un correo válido' };
  // % de oferta: obligatorio el que pide el servicio elegido; el otro no se toca
  const piden = ofertasDelServicio_(d.servicio);
  const ofertas = {};
  ['A', 'V'].forEach(k => { ofertas[k] = piden.indexOf(k) === -1 ? { ok: true, vacio: true } : ofertaCaptacionValida_(k, k === 'A' ? d.ofertaA : d.ofertaV); });
  if (!ofertas.A.ok) return { success: false, error: ofertas.A.error };
  if (!ofertas.V.ok) return { success: false, error: ofertas.V.error };
  const faltan = piden.filter(k => ofertas[k].vacio).map(k => (k === 'V' ? 'venta' : 'arriendo'));
  if (faltan.length) return { success: false, error: 'Escribe el % de oferta en ' + faltan.join(' y ') + ' que negociaste con el propietario.' };
  hoja.getRange(d.fila, columnaCorreoCaptacion_(hoja)).setValue(correo);
  const idAnterior = String(hoja.getRange(d.fila, columnaCaptacion_(hoja, AGENDA_CAPTACION.COL_ID_CITA)).getValue() || '').trim();

  const r = agendarCita({
    nombreCliente: d.nombre, celular: '+57 ' + String(d.celular || '').replace(/\D/g, '').replace(/^57(?=\d{10}$)/, ''),
    correo: correo, tipoServicio: d.servicio, direccion: d.direccion, detalles: d.notas, modalidad: d.modalidad,
    fechaTimestamp: Number(d.timestamp),
    agendaAgente: true // la agenda el agente: no hace falta avisarle a él mismo
  });
  if (r.success) {
    try { hoja.getRange(d.fila, columnaCaptacion_(hoja, AGENDA_CAPTACION.COL_ID_CITA)).setValue(r.idCita); } catch (e) {}
    // El % solo queda en el Sheet y en la nota del agente; nunca en la cita
    ['A', 'V'].forEach(k => {
      if (ofertas[k].vacio) return;
      try {
        hoja.getRange(d.fila, columnaCaptacion_(hoja, AGENDA_CAPTACION.COL_OFERTA[k]))
          .setNumberFormat(AGENDA_CAPTACION.FORMATO_OFERTA[k]).setValue(ofertas[k].fraccion);
      } catch (e) { Logger.log('No se pudo guardar el % de oferta ' + k + ': ' + e.message); }
    });
    try {
      const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
      const cDet = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_DETALLES) + 1;
      if (cDet) {
        anexarDetalleCaptacion_(hoja.getRange(d.fila, cDet), (d.reagendar ? '🔄 Cita REAGENDADA: ' : 'Cita agendada: ') + d.textoCita + ' (' + r.idCita + ')' +
          (d.reagendar && idAnterior ? ' · reemplaza la cita ' + idAnterior : '') + '\n' +
          'Oferta negociada: ' + textoOfertaCaptacion_(ofertas.A.vacio ? '' : ofertas.A.puntos, ofertas.V.vacio ? '' : ofertas.V.puntos));
        const sello = selloSeguimiento_();
        const cF = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_FECHA) + 1, cH = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_HORA) + 1;
        if (cF) hoja.getRange(d.fila, cF).setValue(sello.fecha).setNumberFormat(FORMATO_FECHA_CRM);
        if (cH) hoja.getRange(d.fila, cH).setValue(sello.hora);
      }
    } catch (e) { Logger.log('No se pudo anotar la cita en la captación: ' + e.message); }
    if (d.reagendar) {
      // La cita anterior, si seguía viva, queda cancelada (❌ en el calendario, no se borra)
      try {
        const vieja = idAnterior && idAnterior !== r.idCita ? _citaPorId(idAnterior) : null;
        const est = vieja ? String(valorCita(vieja.fila, vieja.col, 'ESTADO') || '').trim() : '';
        if (vieja && [ESTADOS_CITA.CANCELADA, ESTADOS_CITA.ASISTIDA, ESTADOS_CITA.INASISTIDA].indexOf(est) === -1)
          aplicarCambioEstadoCita(vieja.sheet, vieja.col, vieja.numFila, vieja.fila, ESTADOS_CITA.CANCELADA, 'reagendada por el agente: la reemplaza ' + r.idCita);
      } catch (e) { Logger.log('No se pudo cancelar la cita anterior: ' + e.message); }
      // El CRM sigue el flujo normal de la cita nueva
      try {
        const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
        const cE = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_ESTADO) + 1;
        if (cE) hoja.getRange(d.fila, cE).setValue(AGENDA_CAPTACION.ESTADO);
      } catch (e) {}
    }
  }
  return r;
}
