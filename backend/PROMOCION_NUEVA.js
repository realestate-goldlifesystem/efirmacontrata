/**
 * ===== ¿Volvemos a promocionar el inmueble? (cierre del ciclo · 3-nov-2026) =====
 *
 * Al cerrar la sala de recibo (RECIBO_INMUEBLE.js → cerrarRecibo) se le pregunta al propietario
 * si quiere que volvamos a promocionar su inmueble:
 *   - Sí  → a Leonardo le llega la solicitud; el inmueble sigue PENDIENTE hasta que él actualice
 *           los valores y elija ACTIVAR (GESTOR DE ESTADOS.js lo publica según el tipo de negocio).
 *   - No  → el inmueble queda INACTIVO y a Leonardo le llega el aviso.
 *   - Sin respuesta → recordatorio a los 3 y a los 7 días; a los 10, el caso a Leonardo para llamarlo.
 *
 * Estado en Script Properties: PROMO_<id>_<fin>. Página: frontend/promocion.html
 * (?k=<id>&f=<fin>&t=<token>[&d=SI|NO]). El motor de pagos llama a revisarPromocion_.
 */

const URL_PAGINA_PROMOCION = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/promocion.html';
const DIAS_RECORDAR_PROMOCION = [3, 7];
const DIAS_CASO_PROMOCION = 10;

function _clavePromo_(idInm, fin) { return 'PROMO_' + idInm + '_' + cvTexto(fin); }
function _leerPromo_(idInm, fin) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(_clavePromo_(idInm, fin)) || '{}'); } catch (e) { return {}; }
}
function _guardarPromo_(idInm, fin, p) { PropertiesService.getScriptProperties().setProperty(_clavePromo_(idInm, fin), JSON.stringify(p)); }

function tokenPromocion(idInm, finTxt) {
  const firma = Utilities.computeHmacSha256Signature('PROMO:' + idInm + ':' + finTxt, _secretoCoordinar());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 32);
}
function urlPromocion(idInm, fin, decision) {
  return URL_PAGINA_PROMOCION + '?k=' + encodeURIComponent(idInm) + '&f=' + cvTexto(fin) + '&t=' + tokenPromocion(idInm, cvTexto(fin)) + (decision ? '&d=' + decision : '');
}

// ---------- 1. La pregunta (la hace cerrarRecibo) y los recordatorios (el motor) ----------

function preguntarPromocion_(idInm, partes, fin) {
  const p = _leerPromo_(idInm, fin);
  if (p.estado) return;
  _guardarPromo_(idInm, fin, { estado: 'PREGUNTADO', preguntado: cvTexto(_hoyCv_()), avisos: [] });
  _correoPromocion_(idInm, partes, fin, false);
}

function _correoPromocion_(idInm, partes, fin, recordatorio) {
  const prop = partes.PROPIETARIO;
  if (String(prop.correo).indexOf('@') === -1) return;
  _correoCitaSeguro(prop.correo, (recordatorio ? '⏰ ' : '🏡 ') + '¿Volvemos a promocionar tu inmueble? - Gold Life', 'TU INMUEBLE ESTÁ DISPONIBLE', _primerNombre_(prop.nombre),
    (recordatorio ? 'Te escribimos de nuevo porque aún no nos cuentas qué hacemos con tu inmueble.<br><br>' : '') +
    `Tu inmueble en <strong>${partes.direccion}</strong> ya quedó recibido y está disponible.<br><br>` +
    '¿Quieres que lo volvamos a promocionar para encontrar un nuevo inquilino? Si nos dices que sí, ' +
    'Leonardo te contacta para revisar los valores y firmas de nuevo la autorización con los valores actualizados.',
    // El sí a la derecha, bajo el pulgar (mismo criterio que botonesPropietarioCita)
    htmlBotonesCorreo([
      { texto: 'No por ahora', color: '#555555', url: urlPromocion(idInm, fin, 'NO') },
      { texto: '✅ Sí, promocionarlo', color: '#b8860b', url: urlPromocion(idInm, fin, 'SI') }
    ]));
}

function revisarPromocion_(idInm, c, hoy) {
  const fechas = fechasContratoVigente_(idInm, c);
  if (!fechas) return;
  const p = _leerPromo_(idInm, fechas.fin);
  if (p.estado !== 'PREGUNTADO') return;
  const dias = cvDiasEntre(cvLeerFecha(p.preguntado), hoy);
  const partes = _partesContrato_(idInm, c);
  if (dias >= DIAS_CASO_PROMOCION) {
    p.estado = 'SIN_RESPUESTA';
    _guardarPromo_(idInm, fechas.fin, p);
    _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '📞 Propietario sin responder · ' + idInm, 'PROMOCIÓN SIN RESPUESTA', 'Leonardo',
      `Hace ${dias} días le preguntamos a ${_primerNombre_(partes.PROPIETARIO.nombre)} si volvemos a promocionar el inmueble <strong>${idInm}</strong> (${partes.direccion}) ` +
      'y no ha respondido, ni con los recordatorios.<br><br>Llámalo para saber qué hacemos. El inmueble sigue <strong>PENDIENTE</strong>.',
      botonesContacto_([{ quien: 'propietario', cel: partes.PROPIETARIO.celular }]));
    return;
  }
  const toca = DIAS_RECORDAR_PROMOCION.filter(d => dias >= d && p.avisos.indexOf('R' + d) === -1);
  if (!toca.length) return;
  p.avisos = p.avisos.concat(toca.map(d => 'R' + d));
  _guardarPromo_(idInm, fechas.fin, p);
  _correoPromocion_(idInm, partes, fechas.fin, true);
}

// ---------- 2. La página del propietario ----------

function _promoDesdeEnlace_(datos) {
  const idInm = String(datos.k || '');
  if (!idInm || !datos.t || String(datos.t) !== tokenPromocion(idInm, String(datos.f || ''))) return { error: 'Este enlace no es válido.' };
  activarSinCorreoFila_(idInm);
  const c = _contratoDe(idInm);
  if (!c) return { error: 'No encontramos el inmueble.' };
  const fin = cvLeerFecha(String(datos.f));
  const p = _leerPromo_(idInm, fin);
  if (!p.estado) return { error: 'Esta pregunta todavía no está abierta.' };
  return { idInm: idInm, c: c, fin: fin, p: p };
}

function infoPromocion(datos) {
  const s = _promoDesdeEnlace_(datos);
  if (s.error) return { ok: false, mensaje: s.error };
  const partes = _partesContrato_(s.idInm, s.c);
  return { ok: true, direccion: partes.direccion, nombre: _primerNombre_(partes.PROPIETARIO.nombre), respuesta: s.p.respuesta || '' };
}

function responderPromocion(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const s = _promoDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { idInm, c, fin, p } = s;
    if (p.respuesta) return { ok: false, mensaje: 'Ya nos diste tu respuesta.' };
    const si = datos.respuesta === 'SI';
    if (!si && datos.respuesta !== 'NO') return { ok: false, mensaje: 'Elige una opción.' };
    const motivo = String(datos.motivo || '').trim().slice(0, 300);
    const hoy = new Date();
    Object.assign(p, { estado: 'RESPONDIDO', respuesta: si ? 'SI' : 'NO', fecha: hoy.toISOString(), motivo: motivo });
    _guardarPromo_(idInm, fin, p);

    const partes = _partesContrato_(idInm, c);
    const col = (n) => c.headers.indexOf(n) + 1;
    try {
      if (!si && col('ESTADO DEL INMUEBLE')) c.sheet.getRange(c.fila, col('ESTADO DEL INMUEBLE')).setValue(ESTADOS_SISTEMA.INACTIVO);
      if (col('DETALLES DEL ESTADO DEL INMUEBLE')) c.sheet.getRange(c.fila, col('DETALLES DEL ESTADO DEL INMUEBLE')).setValue(si
        ? '🔁 El ' + _fechaLarga_(hoy) + ' el propietario pidió volver a promocionarlo: actualiza los valores y elige ACTIVAR.'
        : '🚫 El ' + _fechaLarga_(hoy) + ' el propietario decidió no volver a promocionarlo' + (motivo ? ': ' + motivo : '.'));
    } catch (e) { Logger.log('⚠️ Estado del inmueble ' + idInm + ': ' + e.message); }

    const quien = _primerNombre_(partes.PROPIETARIO.nombre);
    _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, (si ? '🔁 Volver a promocionar · ' : '🚫 No vuelve a promocionar · ') + idInm, si ? 'SOLICITUD DE PROMOCIÓN' : 'PROMOCIÓN DESCARTADA', 'Leonardo',
      si
        ? `${quien} quiere que volvamos a promocionar el inmueble <strong>${idInm}</strong> (${partes.direccion}).<br><br>` +
          'Contáctalo para revisar los valores, actualízalos y elige <strong>ACTIVAR</strong> en la hoja para publicarlo de nuevo.'
        : `${quien} decidió no volver a promocionar el inmueble <strong>${idInm}</strong> (${partes.direccion}).` +
          (motivo ? '<br><br>Motivo: <em>' + motivo.replace(/[<>&]/g, '') + '</em>' : '') + '<br><br>El inmueble quedó <strong>INACTIVO</strong>.',
      botonesContacto_([{ quien: 'propietario', cel: partes.PROPIETARIO.celular }]));
    return { ok: true, mensaje: si
      ? 'Leonardo te contacta pronto para revisar los valores y firmar la nueva autorización.'
      : 'Gracias por contarnos. Si cambias de opinión, escríbenos y lo retomamos.' };
  } finally { lock.releaseLock(); }
}
