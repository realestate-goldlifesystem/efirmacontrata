/**
 * TRÁMITE EN PAUSA POR REEMBOLSO (9-nov-2026, caso JK839596)
 *
 * Cuando el auditor de pagos (API_MERCADOPAGO.js) le devuelve el dinero al inquilino
 * porque el trámite no avanzó a tiempo, el trámite NO puede seguir como si estuviera
 * pagado. Regla de Leonardo: queda en pausa, fuera del panel de validación, y nadie lo
 * puede mover hasta que el inquilino pague de nuevo. Al pagar, continúa exactamente
 * donde iba (sin volver a cargar documentos), con el reloj de la etapa reiniciado.
 *
 *  - Pausa:  ESTADO DEL INMUEBLE = "TRÁMITE REEMBOLSADO" y un DETALLE sin las palabras
 *            que usa el panel para listarlo. El ESTADO DOCUMENTAL se conserva.
 *            Lo que había antes se guarda en la propiedad TRAMITE_PAUSA_<ID>.
 *  - Retomar: al llegar un pago aprobado nuevo se restauran estado y detalle, se
 *            reinicia CONTROL DE PLAZO y, si quedó una corrección pendiente, se le
 *            vuelve a pedir a quien le toca.
 */

var TRAMITE_PAUSA = {
  ESTADO: 'TRÁMITE REEMBOLSADO',
  PREFIJO: 'TRAMITE_PAUSA_'
};

function _trHoja() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
}

function _trEncabezados(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

/** ID de registro de la fila (la clave de la pausa). */
function _trIdDeFila(sheet, fila, headers) {
  var i = headers.indexOf('ID DE REGISTRO');
  var c = headers.indexOf('CODIGO DE REGISTRO');
  var id = i > -1 ? String(sheet.getRange(fila, i + 1).getValue() || '').trim() : '';
  return id || (c > -1 ? String(sheet.getRange(fila, c + 1).getValue() || '').trim() : '');
}

/** Pone el trámite en pausa. Lo llama el auditor justo después de un reembolso exitoso. */
function trPausarPorReembolso(sheet, fila, headers) {
  try {
    headers = headers.map(function (h) { return String(h).trim(); });
    var cEstado = headers.indexOf('ESTADO DEL INMUEBLE') + 1;
    var cDetalle = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    if (!cEstado || !cDetalle) return;
    var id = _trIdDeFila(sheet, fila, headers);
    if (!id) return;
    // Si el inquilino nunca envió su formulario no hay nada que retomar: el reembolso
    // es el de siempre y el inmueble sigue publicado para otros interesados.
    var cDoc = headers.indexOf('ESTADO DOCUMENTAL') + 1;
    if (!cDoc || !String(sheet.getRange(fila, cDoc).getValue() || '').trim()) return;

    var props = PropertiesService.getScriptProperties();
    if (props.getProperty(TRAMITE_PAUSA.PREFIJO + id)) return; // ya estaba en pausa

    var antes = {
      estado: String(sheet.getRange(fila, cEstado).getValue() || ''),
      detalle: String(sheet.getRange(fila, cDetalle).getValue() || ''),
      fecha: new Date().toISOString()
    };
    props.setProperty(TRAMITE_PAUSA.PREFIJO + id, JSON.stringify(antes));

    sheet.getRange(fila, cEstado).setValue(TRAMITE_PAUSA.ESTADO);
    sheet.getRange(fila, cDetalle).setValue('💸 Pago devuelto el ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy') +
      ': trámite en pausa. Continúa donde iba cuando el inquilino pague de nuevo.');
    Logger.log('⏸️ Trámite ' + id + ' en pausa por reembolso (antes: ' + antes.estado + ' / ' + antes.detalle + ')');
  } catch (e) {
    Logger.log('⚠️ trPausarPorReembolso: ' + e.message);
  }
}

/** ¿El trámite de este registro (CDR o ID) está en pausa por reembolso? */
function trEstaEnPausa(cdrOId) {
  try {
    var fila = buscarFilaPorCDR(cdrOId);
    if (!fila) return false;
    var sheet = _trHoja();
    var headers = _trEncabezados(sheet);
    var id = _trIdDeFila(sheet, fila, headers);
    return !!(id && PropertiesService.getScriptProperties().getProperty(TRAMITE_PAUSA.PREFIJO + id));
  } catch (e) {
    return false;
  }
}

var TR_MENSAJE_PAUSA = 'Este trámite está pendiente de un nuevo pago del inquilino, porque el anterior se le devolvió. Por ahora no se pueden cargar ni revisar documentos. Cuando el inquilino pague, el trámite se retoma donde iba y te avisaremos por correo para que continúes.';

/**
 * Retoma el trámite si estaba en pausa. Lo llama el webhook al anotar un pago aprobado.
 * @return {boolean} true si había pausa y se retomó
 */
function trRetomarSiPausado(cdrOId) {
  try {
    var fila = buscarFilaPorCDR(cdrOId);
    if (!fila) return false;
    var sheet = _trHoja();
    var headers = _trEncabezados(sheet);
    var id = _trIdDeFila(sheet, fila, headers);
    var props = PropertiesService.getScriptProperties();
    var guardado = id && props.getProperty(TRAMITE_PAUSA.PREFIJO + id);
    if (!guardado) return false;
    var antes = JSON.parse(guardado);

    var cEstado = headers.indexOf('ESTADO DEL INMUEBLE') + 1;
    var cDetalle = headers.indexOf('DETALLES DEL ESTADO DEL INMUEBLE') + 1;
    var cDoc = headers.indexOf('ESTADO DOCUMENTAL') + 1;
    var cControl = headers.indexOf('CONTROL DE PLAZO') + 1;
    if (cEstado) sheet.getRange(fila, cEstado).setValue(antes.estado);
    if (cDetalle) sheet.getRange(fila, cDetalle).setValue(antes.detalle);

    // El reloj de la etapa arranca desde este pago: si no, el plazo ya vencido
    // mandaría a devolver el pago nuevo en la siguiente ronda del auditor.
    var estadoDoc = cDoc ? String(sheet.getRange(fila, cDoc).getValue() || '') : '';
    var base = typeof plzEstadoBase === 'function' ? plzEstadoBase(estadoDoc) : '';
    if (cControl && base && typeof plzMarca === 'function') {
      sheet.getRange(fila, cControl).setValue(plzMarca(base, new Date().getTime()));
    }
    props.deleteProperty(TRAMITE_PAUSA.PREFIJO + id);
    SpreadsheetApp.flush();

    // Si quedó una corrección pendiente, se le vuelve a pedir a quien le toca.
    var correccion = /^(PROP|INQ)_CORRECTION/.exec(estadoDoc);
    if (correccion && typeof enviarCorreoCorreccion === 'function') {
      var docs = (estadoDoc.split('|')[1] || '').split(',').map(function (d) { return d.trim(); }).filter(String);
      enviarCorreoCorreccion(id, correccion[1] === 'PROP' ? 'propietario' : 'inquilino', {
        documentos: docs,
        observaciones: 'El inquilino retomó el trámite. Estos son los documentos que siguen pendientes por corregir.'
      });
    }

    enviarCorreo_({
      to: PLAZOS.CORREO_ADMIN,
      subject: '▶️ ' + id + ': el inquilino pagó de nuevo y el trámite continúa',
      htmlBody: plzP('El inquilino de <strong>' + plzEsc(id) + '</strong> volvió a pagar. El trámite continúa donde quedó:') +
        plzCaja('<strong>Estado:</strong> ' + plzEsc(antes.estado) + '<br><strong>Detalle:</strong> ' + plzEsc(antes.detalle) +
          (correccion ? '<br><br>Se le volvió a enviar la solicitud de corrección a ' + (correccion[1] === 'PROP' ? 'la parte propietaria' : 'la parte inquilina') + ', con su plazo completo.' : ''))
    });
    Logger.log('▶️ Trámite ' + id + ' retomado tras el pago nuevo.');
    return true;
  } catch (e) {
    Logger.log('⚠️ trRetomarSiPausado: ' + e.message);
    return false;
  }
}

/** Sin correos: deja JK839596 (u otro) en pausa a mano, para registros reembolsados antes de este cambio. */
function trPausarRegistroManual(id) {
  var fila = buscarFilaPorCDR(id);
  if (!fila) throw new Error('No encontré ' + id);
  var sheet = _trHoja();
  trPausarPorReembolso(sheet, fila, _trEncabezados(sheet));
}

/** ¿El inquilino ya envió su formulario? (hay un ESTADO DOCUMENTAL en la fila) */
function formularioInquilinoYaEnviado(cdrOId) {
  try {
    var fila = buscarFilaPorCDR(cdrOId);
    if (!fila) return false;
    var sheet = _trHoja();
    var cDoc = _trEncabezados(sheet).indexOf('ESTADO DOCUMENTAL') + 1;
    return !!(cDoc && String(sheet.getRange(fila, cDoc).getValue() || '').trim());
  } catch (e) {
    return false;
  }
}
