/**
 * ============================================================================
 *  CIERRE EN "NO" (23-nov-2026)
 * ============================================================================
 *  Al pasar un lead de captaciones a NO se pide la razón del cierre (en el Sheet
 *  con una ventana, en el panel con su modal). Queda como última anotación:
 *    "🔒 CERRADO EN NO · Razón: … · detalle"
 *  y si tenía un seguimiento pendiente (llamada o mensaje), se cancela: su evento
 *  queda en el calendario como "❌ CANCELADA" (historial), sin recordatorios.
 */
const CIERRE_NO = {
  ESTADO: 'NO',
  RAZONES: [
    'No quiere inmobiliaria', 'Ya lo arrendó o vendió', 'No acepta el % de comisión',
    'Lo tiene con otra inmobiliaria', 'Precio fuera de mercado', 'Nunca contestó', 'Ya no lo va a ofrecer', 'Otra razón'
  ]
};

/** Lo llama procesarEdicionCaptacion_ (GESTOR DE ESTADOS.js) al cambiar el estado. */
function abrirCierreNoSiToca_(e, hoja, colEstado) {
  const r = e.range;
  if (r.getNumRows() !== 1 || r.getNumColumns() !== 1 || r.getColumn() !== colEstado) return;
  if (r.getRow() < SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS) return;
  if (normalizarEstadoCaptacion_(e.value) !== CIERRE_NO.ESTADO) return;
  const d = datosFilaCaptacion_(hoja, r.getRow());
  d.idLead = idLeadDeFila_(hoja, r.getRow());
  d.razones = CIERRE_NO.RAZONES;
  const t = HtmlService.createTemplateFromFile('backend/MODAL_CIERRE_NO');
  t.DATOS = JSON.stringify(d);
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(500).setHeight(560), 'Cerrar lead en NO');
}

/** Texto de la anotación de cierre. */
function textoCierreNo_(razon, detalle) {
  const r = String(razon || '').trim(), dt = String(detalle || '').trim().slice(0, 400);
  return '🔒 CERRADO EN NO · Razón: ' + (r || 'sin razón') + (dt ? ' · ' + dt : '');
}

/**
 * Si hay un seguimiento pendiente (llamada o mensaje), lo cancela: el evento
 * queda "❌ CANCELADA" en el calendario y el motor ya no manda recordatorios.
 */
function cancelarSeguimientoPorCierre_(hoja, fila) {
  try {
    const col = columnasLlamada_(hoja), leer = (k) => hoja.getRange(fila, col[k]).getValue();
    if (LLAMADAS.PENDIENTES.indexOf(String(leer('LLAMADA ESTADO'))) === -1) return '';
    hoja.getRange(fila, col['LLAMADA ESTADO']).setValue('CANCELADA');
    const idEv = String(leer('LLAMADA EVENTO') || '');
    if (idEv) {
      try {
        const ev = CalendarApp.getDefaultCalendar().getEventById(idEv);
        if (ev && !/^❌/.test(ev.getTitle())) {
          ev.setTitle('❌ CANCELADA: ' + ev.getTitle());
          try { ev.setTransparency(CalendarApp.EventTransparency.TRANSPARENT); } catch (x) {}
          try { ev.removeAllReminders(); } catch (x) {}
        }
      } catch (e) {}
    }
    return String(leer('LLAMADA ID') || '');
  } catch (e) { Logger.log('No se pudo cancelar el seguimiento: ' + e.message); return ''; }
}

/** Desde la ventana del Sheet. d = { hoja, fila, razon, detalle } */
function cerrarLeadEnNo(d) {
  const hoja = SpreadsheetApp.getActive().getSheetByName(d.hoja);
  if (!hoja || SEGUIMIENTO_CAPTACIONES.HOJAS.indexOf(d.hoja) === -1) return { success: false, error: 'Pestaña no válida' };
  if (!String(d.razon || '').trim()) return { success: false, error: 'Elige la razón del cierre.' };
  const fila = Number(d.fila);
  const cancelada = cancelarSeguimientoPorCierre_(hoja, fila);
  anotarEnCRM_(hoja, fila, textoCierreNo_(d.razon, d.detalle) + (cancelada ? '\n' + 'Seguimiento ' + cancelada + ' cancelado' : ''), CIERRE_NO.ESTADO);
  return { success: true };
}
