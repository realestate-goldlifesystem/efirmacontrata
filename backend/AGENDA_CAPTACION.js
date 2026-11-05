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
  COL_CORREO: 'CORREO DEL PROPIETARIO',
  // La cita de presentación que se agendó desde esa fila: enlaza el CRM con la agenda y el registro
  COL_ID_CITA: 'ID CITA'
};

/** Lo llama procesarEdicionCaptacion_ (GESTOR DE ESTADOS.js) al cambiar ESTADO DE LLAMADA. */
function abrirAgendaCaptacionSiToca_(e, hoja, colEstado) {
  const r = e.range;
  if (r.getNumRows() !== 1 || r.getNumColumns() !== 1 || r.getColumn() !== colEstado) return;
  if (r.getRow() < SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS) return;
  if (normalizarEstadoCaptacion_(e.value) !== AGENDA_CAPTACION.ESTADO) return;
  abrirModalAgendaCaptacion_(hoja, r.getRow());
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
  const ubicacion = [de('UBICACIÓN'), de('LOCALIDAD')].filter(Boolean).join(', ');
  const tipo = [de('TIPO DE INMUEBLE'), de('HABITACIONES') ? de('HABITACIONES') + ' hab.' : ''].filter(Boolean).join(' · ');
  return {
    hoja: hoja.getName(), fila: fila,
    nombre: de('NOMBRE DEL PROPIETARIO'),
    celular: de('CELULAR').replace(/\D/g, ''),
    correo: de(AGENDA_CAPTACION.COL_CORREO),
    servicio: hoja.getName().slice(-1) === 'V' ? 'Venta' : 'Arriendo',
    direccion: ubicacion,
    notas: [tipo, de('VALOR DE PROMOCIÓN') ? 'Valor publicado: ' + de('VALOR DE PROMOCIÓN') : '', de('LINK DEL INMUEBLE PUBLICADO')].filter(Boolean).join('\n')
  };
}

function abrirModalAgendaCaptacion_(hoja, fila) {
  columnaCorreoCaptacion_(hoja);
  const t = HtmlService.createTemplateFromFile('backend/MODAL_AGENDA_CAPTACION');
  t.DATOS = JSON.stringify(datosFilaCaptacion_(hoja, fila));
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(560).setHeight(640), 'Agendar presentación al propietario');
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
  hoja.getRange(d.fila, columnaCorreoCaptacion_(hoja)).setValue(correo);

  const r = agendarCita({
    nombreCliente: d.nombre, celular: '+57 ' + String(d.celular || '').replace(/\D/g, '').replace(/^57(?=\d{10}$)/, ''),
    correo: correo, tipoServicio: d.servicio, direccion: d.direccion, detalles: d.notas, modalidad: d.modalidad,
    fechaTimestamp: Number(d.timestamp)
  });
  if (r.success) {
    try { hoja.getRange(d.fila, columnaCaptacion_(hoja, AGENDA_CAPTACION.COL_ID_CITA)).setValue(r.idCita); } catch (e) {}
    try {
      const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
      const cDet = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_DETALLES) + 1;
      if (cDet) {
        const celda = hoja.getRange(d.fila, cDet);
        const previo = String(celda.getValue() || '').trim();
        celda.setValue((previo ? previo + '\n' : '') + 'Cita agendada: ' + d.textoCita + ' (' + r.idCita + ')');
        const sello = selloSeguimiento_();
        const cF = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_FECHA) + 1, cH = enc.indexOf(SEGUIMIENTO_CAPTACIONES.COL_HORA) + 1;
        if (cF) hoja.getRange(d.fila, cF).setValue(sello.fecha);
        if (cH) hoja.getRange(d.fila, cH).setValue(sello.hora);
      }
    } catch (e) { Logger.log('No se pudo anotar la cita en la captación: ' + e.message); }
  }
  return r;
}
