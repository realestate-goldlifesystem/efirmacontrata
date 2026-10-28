/**
 * ===== Renovar o terminar el contrato (etapa 3, parte 1 · 28-oct-2026) =====
 *
 * Todo cuenta hacia el último día para decidir: 3 meses antes del final del contrato
 * (cvFechasClave → limiteAviso). A las dos partes les llega un aviso faltando 15, 5, 3 y
 * 1 día, y el mismo día límite (ese trae los botones Renovar / Terminar).
 *
 * - Cualquiera de los dos termina → el contrato termina. Sale la "NOTIFICACIÓN DE
 *   TERMINACIÓN DE CONTRATO DE ARRENDAMIENTO" desde la plantilla maestra (texto tal cual:
 *   solo se llenan los espacios y se deja el párrafo de quien notifica).
 * - Los dos renuevan → el contrato sigue otro año (meses 13, 14…). El canon con IPC es la parte 2.
 * - Pasa el día límite sin que los dos respondan → a Leonardo le llega el caso para llamar.
 *
 * El estado vive en Script Properties: RENOV_<id>_<fin del periodo>. Página: frontend/renovacion.html
 * (?k=<id>&f=<fin>&r=i|p&t=<token>). El motor de pagos (revisarPagosMensuales_) llama a revisarRenovacion_.
 */

const AVISOS_RENOVACION = [['D15', 15], ['D5', 5], ['D3', 3], ['D1', 1], ['D0', 0]];
const MOTIVOS_TERMINACION = {
  INQUILINO: ['Mudanza', 'Compra de vivienda', 'Valor del arriendo', 'Otro'],
  PROPIETARIO: ['Venta del inmueble', 'Lo voy a ocupar', 'Otro']
};
const URL_PAGINA_RENOVACION = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/renovacion.html';
const PLANTILLA_TERMINACION_ID = '1-qSXnB2iuiOjS81b-Uh4bNNNvD_uUshAA2JKWS6z8tI';
const ROL_RENOV = { i: 'INQUILINO', p: 'PROPIETARIO' };

// ---------- Estado y enlaces ----------

function _claveRenov_(idInm, fin) { return 'RENOV_' + idInm + '_' + cvTexto(fin); }
function _leerRenov_(idInm, fin) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(_claveRenov_(idInm, fin)) || '{}'); } catch (e) { return {}; }
}
function _guardarRenov_(idInm, fin, r) { PropertiesService.getScriptProperties().setProperty(_claveRenov_(idInm, fin), JSON.stringify(r)); }

function tokenRenovacion(idInm, finTxt, rol) {
  const firma = Utilities.computeHmacSha256Signature('RENOV:' + idInm + ':' + finTxt + ':' + rol, _secretoCoordinar());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 32);
}
function urlRenovacion(idInm, fin, rol, decision) {
  const r = rol === 'INQUILINO' ? 'i' : 'p';
  return URL_PAGINA_RENOVACION + '?k=' + encodeURIComponent(idInm) + '&f=' + cvTexto(fin) + '&r=' + r + '&t=' + tokenRenovacion(idInm, cvTexto(fin), rol) + (decision ? '&d=' + decision : '');
}

/** El final del periodo vigente: el registrado y, por cada año renovado, uno más. */
function finVigenteContrato_(idInm, inicio, finRegistrado) {
  let fin = cvFechasClave(inicio, finRegistrado).fin;
  for (let k = 0; k < 30 && _leerRenov_(idInm, fin).resultado === 'RENOVADO'; k++) fin = cvSumarDias(cvSumarMeses(cvSumarDias(fin, 1), 12), -1);
  return fin;
}

/** Fechas clave del periodo vigente de un contrato (con las renovaciones ya sumadas). */
function fechasContratoVigente_(idInm, c) {
  const inicio = cvLeerFecha(c.v('FECHA INICIO DEL CONTRATO'));
  if (!inicio) return null;
  const fin = finVigenteContrato_(idInm, inicio, cvLeerFecha(c.v('FECHA FINAL DEL CONTRATO')));
  return Object.assign(cvFechasClave(inicio, fin), { inicioContrato: inicio });
}

const _fechaCv_ = (f) => new Date(f.y, f.m - 1, f.d, 12);
const _textoCv_ = (f) => _fechaLarga_(_fechaCv_(f));

/** Las dos partes, con lo que hace falta para escribirles y llenar el documento. */
function _partesContrato_(idInm, c) {
  const rc = recopilarDatosContrato(String(idInm));
  const d = rc && rc.success ? rc.data : { inquilino: {}, propietario: {}, inmueble: {} };
  // Celulares y documentos guardados como número en la hoja: sin notación científica
  const txt = (v) => typeof v === 'number' ? v.toFixed(0) : String(v || '').trim();
  return {
    direccion: String(c.v('Ingrese la Dirección del inmueble') || (d.inmueble || {}).direccion || ''),
    ciudad: (d.inmueble || {}).ciudad || '',
    INQUILINO: { nombre: d.inquilino.nombre || String(c.v('NOMBRE COMPLETO INQUILINO') || ''), documento: txt(d.inquilino.numeroDocumento),
      celular: txt(d.inquilino.celular || c.v('CELULAR INQUILINO')), correo: String(d.inquilino.email || c.v('CORREO INQUILINO') || '').trim(), direccion: '' },
    PROPIETARIO: { nombre: d.propietario.nombre || String(c.v('NOMBRES Y APELLIDOS DEL PROPIETARIO') || ''), documento: txt(d.propietario.numeroDocumento),
      celular: txt(d.propietario.celular || c.v('Celular')), correo: String(d.propietario.email || c.v('Correo electrónico') || '').trim(), direccion: d.propietario.direccion || '' }
  };
}
const _otroRol_ = (rol) => rol === 'INQUILINO' ? 'PROPIETARIO' : 'INQUILINO';
const _primerNombre_ = (t) => { const x = String(t || '').trim().split(/\s+/)[0] || ''; return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase(); };

// ---------- 1. Los avisos (los llama el motor de pagos) ----------

function revisarRenovacion_(idInm, c, hoy) {
  const fechas = fechasContratoVigente_(idInm, c);
  if (!fechas || cvMomento(fechas, hoy) !== 'vigente') return;
  const r = _leerRenov_(idInm, fechas.fin);
  if (r.resultado) return;
  const faltan = cvDiasEntre(hoy, fechas.limiteAviso);
  const partes = _partesContrato_(idInm, c);

  // Pasó el día límite y falta alguien: el caso a Leonardo, una vez
  if (faltan < 0) {
    if (r.sinRespuesta) return;
    const estado = rol => r[rol] ? (r[rol].decision === 'RENOVAR' ? 'quiere renovar' : r[rol].decision) : 'no respondió';
    _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '📞 Renovación sin respuesta · ' + idInm, 'RENOVACIÓN SIN RESPUESTA', 'Leonardo',
      `Venció el plazo para decidir si renuevan el contrato del inmueble <strong>${idInm}</strong> (${partes.direccion}), que termina el <strong>${_textoCv_(fechas.fin)}</strong>.<br><br>` +
      `👤 Inquilino: <strong>${partes.INQUILINO.nombre}</strong> · ${estado('INQUILINO')}<br>🏠 Propietario: <strong>${partes.PROPIETARIO.nombre}</strong> · ${estado('PROPIETARIO')}<br><br>` +
      'No se renueva en silencio: llámalos para definirlo.',
      botonesContacto_([{ quien: 'inquilino', cel: partes.INQUILINO.celular }, { quien: 'propietario', cel: partes.PROPIETARIO.celular }]));
    r.sinRespuesta = cvTexto(hoy);
    _guardarRenov_(idInm, fechas.fin, r);
    return;
  }

  // El aviso más reciente que ya tocó (si el motor se atrasó, no se mandan varios de golpe)
  const toca = AVISOS_RENOVACION.filter(a => faltan <= a[1]).pop();
  r.avisos = r.avisos || [];
  if (!toca || r.avisos.indexOf(toca[0]) !== -1) return;
  ['INQUILINO', 'PROPIETARIO'].forEach(rol => { if (!r[rol]) _avisoRenovacion_(idInm, fechas, partes, rol, toca[0], faltan); });
  AVISOS_RENOVACION.slice(0, AVISOS_RENOVACION.indexOf(toca) + 1).forEach(a => { if (r.avisos.indexOf(a[0]) === -1) r.avisos.push(a[0]); });
  _guardarRenov_(idInm, fechas.fin, r);
}

function _avisoRenovacion_(idInm, fechas, partes, rol, paso, faltan) {
  const p = partes[rol];
  if (String(p.correo).indexOf('@') === -1) return;
  const limite = _textoCv_(fechas.limiteAviso), fin = _textoCv_(fechas.fin);
  const ultimo = paso === 'D0';
  const asunto = ultimo ? '📝 Hoy es el último día: ¿renuevas o terminas tu contrato?'
    : paso === 'D1' ? '📝 Mañana es el último día para decidir si renuevas tu contrato'
    : `📝 Faltan ${faltan} días para decidir si renuevas tu contrato`;
  const cuerpo = ultimo
    ? `Hoy, <strong>${limite}</strong>, es el último día para decidir si deseas <strong>renovar tu contrato de arrendamiento por un nuevo año</strong> o <strong>terminarlo</strong>.<br><br>` +
      `El contrato del inmueble en <strong>${partes.direccion}</strong> termina el <strong>${fin}</strong>. Elige una opción:`
    : `Tu contrato de arrendamiento del inmueble en <strong>${partes.direccion}</strong> termina el <strong>${fin}</strong>.<br><br>` +
      `Tienes hasta el <strong>${limite}</strong> para decidir si lo <strong>renuevas por un nuevo año</strong> o lo <strong>terminas</strong>` +
      (paso === 'D1' ? ' (es decir, <strong>mañana</strong>).' : '.') + ' Si cualquiera de las dos partes decide terminarlo, el contrato termina en esa fecha.';
  const botones = ultimo
    ? htmlBotonesCorreo([{ texto: '✋ Terminar', color: '#57534e', url: urlRenovacion(idInm, fechas.fin, rol, 'TERMINAR') }, { texto: '🔄 Renovar', color: '#b8860b', url: urlRenovacion(idInm, fechas.fin, rol, 'RENOVAR') }])
    : htmlBotonesCorreo([{ texto: '📝 Renovar o terminar', color: '#b8860b', url: urlRenovacion(idInm, fechas.fin, rol) }]);
  _correoCitaSeguro(p.correo, asunto + ' - Gold Life', ultimo ? 'ÚLTIMO DÍA PARA DECIDIR' : 'RENOVACIÓN DEL CONTRATO', _primerNombre_(p.nombre), cuerpo, botones);
}

// ---------- 2. La página: ver y decidir ----------

function _renovDesdeEnlace_(datos) {
  const rol = ROL_RENOV[datos.r];
  const idInm = String(datos.k || '');
  if (!rol || !idInm || !datos.t || String(datos.t) !== tokenRenovacion(idInm, String(datos.f || ''), rol)) return { error: 'Este enlace no es válido.' };
  const c = _contratoDe(idInm);
  if (!c) return { error: 'No encontramos el contrato.' };
  const fechas = fechasContratoVigente_(idInm, c);
  if (!fechas) return { error: 'El contrato no tiene fecha de inicio.' };
  // El enlace es de un periodo concreto: si ya se renovó, el del año anterior queda cerrado
  const finEnlace = cvLeerFecha(String(datos.f));
  const r = finEnlace ? _leerRenov_(idInm, finEnlace) : {};
  if (!finEnlace || cvTexto(finEnlace) !== cvTexto(fechas.fin)) {
    if (r.resultado === 'RENOVADO') return { error: 'Este contrato ya se renovó. Te llegará un enlace nuevo cuando toque decidir otra vez.' };
    if (!r.resultado) return { error: 'Este enlace no es del periodo actual del contrato.' };
  }
  return { rol: rol, idInm: idInm, c: c, fechas: Object.assign({}, fechas, { fin: finEnlace }), r: r };
}

function infoRenovacion(datos) {
  const s = _renovDesdeEnlace_(datos);
  if (s.error) return { ok: false, mensaje: s.error };
  const partes = _partesContrato_(s.idInm, s.c);
  const hoy = cvLeerFecha(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd'));
  const f = cvFechasClave(s.fechas.inicioContrato, s.fechas.fin);
  return {
    ok: true, rol: s.rol, nombre: partes[s.rol].nombre, otro: partes[_otroRol_(s.rol)].nombre, direccion: partes.direccion,
    fin: cvTexto(f.fin), finTexto: _textoCv_(f.fin), limite: cvTexto(f.limiteAviso), limiteTexto: _textoCv_(f.limiteAviso),
    topeTexto: _textoCv_(f.topeDevolucion), mesFinal: cvPeriodo(s.fechas.inicioContrato, f.fin).numero,
    faltan: cvDiasEntre(hoy, f.limiteAviso),
    mia: s.r[s.rol] || null, otra: s.r[_otroRol_(s.rol)] ? { decision: s.r[_otroRol_(s.rol)].decision } : null,
    resultado: s.r.resultado || '', terminadoPor: s.r.terminadoPor || '',
    motivos: MOTIVOS_TERMINACION[s.rol]
  };
}

function decidirRenovacion(datos) {
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    _prog_(datos, 8, 'Revisando tu contrato');
    const s = _renovDesdeEnlace_(datos);
    if (s.error) return { ok: false, mensaje: s.error };
    const { rol, idInm, c, fechas, r } = s;
    const otro = _otroRol_(rol);
    if (r.resultado === 'TERMINADO') return { ok: false, mensaje: 'El contrato ya se terminó: la otra parte notificó la terminación.' };
    if (r.resultado === 'RENOVADO') return { ok: false, mensaje: 'El contrato ya se renovó.' };
    if (r[rol]) return { ok: false, mensaje: 'Ya registraste tu decisión.' };
    const hoy = cvLeerFecha(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd'));
    const f = cvFechasClave(fechas.inicioContrato, fechas.fin);
    if (cvDiasEntre(hoy, f.limiteAviso) < 0) return { ok: false, mensaje: 'Ya pasó el último día para decidir (' + _textoCv_(f.limiteAviso) + '). Comunícate con Leonardo.' };
    const decision = datos.decision === 'TERMINAR' ? 'TERMINAR' : datos.decision === 'RENOVAR' ? 'RENOVAR' : '';
    if (!decision) return { ok: false, mensaje: 'Elige renovar o terminar.' };
    let motivo = '';
    if (decision === 'TERMINAR') {
      if (MOTIVOS_TERMINACION[rol].indexOf(datos.motivo) === -1) return { ok: false, mensaje: 'Elige el motivo.' };
      motivo = datos.motivo === 'Otro' ? String(datos.motivoOtro || '').replace(/\s+/g, ' ').trim().slice(0, 300) : datos.motivo;
      if (!motivo) return { ok: false, mensaje: 'Escribe el motivo.' };
    }
    r[rol] = { decision: decision, motivo: motivo, fecha: new Date().toISOString() };
    const partes = _partesContrato_(idInm, c);

    if (decision === 'TERMINAR') {
      r.resultado = 'TERMINADO'; r.terminadoPor = rol;
      _guardarRenov_(idInm, f.fin, r);
      _prog_(datos, 25, 'Preparando el documento de terminación');
      let doc = null;
      try { doc = _documentoTerminacion_(c, partes, rol, motivo, f); r.documento = doc.url; _guardarRenov_(idInm, f.fin, r); }
      catch (e) { Logger.log('⚠️ Documento de terminación de ' + idInm + ': ' + e.message); }
      _prog_(datos, 60, 'Enviando la notificación a las dos partes');
      _correosTerminacion_(idInm, partes, rol, motivo, f, doc);
      _prog_(datos, 96, 'Terminando');
      return { ok: true, mensaje: 'Registramos la terminación de tu contrato. Te enviamos el documento por correo.' };
    }

    // Renovar: solo queda renovado cuando los dos lo eligen
    _prog_(datos, 40, 'Guardando tu decisión');
    if (r[otro] && r[otro].decision === 'RENOVAR') {
      r.resultado = 'RENOVADO';
      _guardarRenov_(idInm, f.fin, r);
      _prog_(datos, 65, 'Avisándoles a las dos partes');
      _correosRenovado_(idInm, partes, f);
      _prog_(datos, 80, 'Preparando el canon del nuevo año');
      try { iniciarAjusteAnual_(idInm, c, partes, f); } catch (e) { Logger.log('⚠️ Ajuste anual de ' + idInm + ': ' + e.message); }
      _prog_(datos, 96, 'Terminando');
      return { ok: true, mensaje: '¡Listo! Las dos partes renovaron: el contrato sigue un año más.' };
    }
    _guardarRenov_(idInm, f.fin, r);
    _prog_(datos, 96, 'Terminando');
    return { ok: true, mensaje: 'Registramos que deseas renovar. Te avisamos cuando ' + _primerNombre_(partes[otro].nombre) + ' decida.' };
  } finally { lock.releaseLock(); }
}

// ---------- 3. Documento y correos ----------

/** Copia la plantilla maestra, deja el párrafo de quien notifica y llena los espacios (el texto no se toca). */
function _documentoTerminacion_(c, partes, rol, motivo, f) {
  const cdr = String(c.v('CODIGO DE REGISTRO') || c.v('ID DE REGISTRO'));
  let destino = null;
  try {
    let carpeta = buscarCarpetaContratoDinamica({ cdr: cdr, tipoNegocio: 'Arriendo' });
    for (let k = 0; k < 7 && carpeta && !destino; k++) {
      const it = carpeta.getFoldersByName('4- ACTA DE TERMINACION DE CONTRATO');
      if (it.hasNext()) destino = it.next();
      else { const ps = carpeta.getParents(); carpeta = ps.hasNext() ? ps.next() : null; }
    }
  } catch (e) { Logger.log('Carpeta del acta de terminación: ' + e.message); }
  if (!destino) destino = DriveApp.getFileById(PLANTILLA_TERMINACION_ID).getParents().next();

  const quien = partes[rol], para = partes[_otroRol_(rol)];
  const calidad = rol === 'INQUILINO' ? 'ARRENDATARIO' : 'ARRENDADOR';
  const nombreArchivo = 'NOTIFICACIÓN DE TERMINACIÓN - ' + c.v('ID DE REGISTRO') + ' - ' + calidad + ' - ' + Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd');
  const copia = DriveApp.getFileById(PLANTILLA_TERMINACION_ID).makeCopy(nombreArchivo, destino);
  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();

  // Párrafos marcados: queda solo el de quien notifica, sin la etiqueta
  const ps = body.getParagraphs();
  ps.forEach(p => {
    const t = p.getText();
    const m = t.match(/^\s*\[(?:PÁRRAFO OPCIONAL )?PARA (ARRENDADOR|ARRENDATARIO)\]:\s*/);
    if (!m) return;
    if (m[1] !== calidad) { try { p.removeFromParent(); } catch (e) { p.clear(); } return; }
    p.editAsText().deleteText(0, m[0].length - 1);
  });

  const hoy = new Date();
  const poner = (buscar, valor) => body.replaceText(buscar, String(valor || '').replace(/\$/g, '\\$'));
  poner('00 de Mes de 2099', _fechaLarga_(hoy));
  poner('\\[Nombre completo del arrendador/arrendatario\\]', para.nombre);
  poner('\\[Dirección completa del inmueble\\]', partes.direccion);
  poner('\\[Dirección\\]', rol === 'INQUILINO' ? (para.direccion || partes.direccion) : partes.direccion);
  poner('\\[Ciudad\\]', partes.ciudad);
  poner('\\[Nombre completo\\]', quien.nombre);
  poner('\\[Número de cédula\\]', quien.documento);
  poner('\\[ARRENDADOR/ARRENDATARIO\\]', calidad);
  poner('\\[Fecha de inicio del contrato\\]', _textoCv_(f.inicio));
  poner('\\[Fecha de terminación\\]', _textoCv_(f.fin));
  poner('\\[indicar la causal[^\\]]*\\]', motivo);
  poner('\\[puede indicar motivo[^\\]]*\\]', motivo);
  poner('\\[la entrega/recepción\\]', rol === 'INQUILINO' ? 'la entrega' : 'la recepción');
  poner('\\[Firma\\]', 'Confirmado en la plataforma el ' + Utilities.formatDate(hoy, 'America/Bogota', 'dd/MM/yyyy HH:mm'));
  poner('Nombre completo:', 'Nombre completo: ' + quien.nombre);
  poner('C\\.C\\.:', 'C.C.: ' + quien.documento);
  poner('Celular:', 'Celular: ' + quien.celular);
  poner('Correo electrónico:', 'Correo electrónico: ' + quien.correo);
  poner('\\[Correo certificado / Correo electrónico/ WhatsApp\\]', 'Correo electrónico');
  poner('Fecha de envío: \\[Fecha\\]', 'Fecha de envío: ' + _fechaLarga_(hoy));
  // "Enviado: -[…]-[…]": el primero es el correo y el segundo el celular de quien recibe
  [para.correo, para.celular].forEach(v => {
    const r = body.findText('\\[Dirección/Email/celular\\]');
    if (r) r.getElement().asText().deleteText(r.getStartOffset(), r.getEndOffsetInclusive()).insertText(r.getStartOffset(), ' ' + String(v || '') + ' ');
  });
  doc.saveAndClose();

  const pdf = copia.getAs(MimeType.PDF).setName(nombreArchivo + '.pdf');
  destino.createFile(pdf);
  return { url: copia.getUrl(), pdf: pdf };
}

function _correosTerminacion_(idInm, partes, rol, motivo, f, doc) {
  const fin = _textoCv_(f.fin), tope = _textoCv_(f.topeDevolucion);
  const adj = doc ? [doc.pdf] : null;
  const quien = partes[rol];
  // Al inquilino: entregar acorde al inventario, máximo 5 días después del final
  const textoInq = `<br><br>🔑 <strong>La entrega del inmueble:</strong> el contrato termina el <strong>${fin}</strong>. Tienes como máximo hasta el <strong>${tope}</strong> ` +
    '(5 días después) para entregar el inmueble; te recomendamos entregarlo unos días antes.<br><br>' +
    '📋 <strong>El inmueble se entrega acorde al inventario</strong> con el que lo recibiste: en el mismo estado, salvo el deterioro natural por el uso, y al día en el arriendo, los servicios públicos y la administración.';
  const textoProp = `<br><br>🔑 <strong>El recibo del inmueble:</strong> el contrato termina el <strong>${fin}</strong>. Tienes como máximo hasta el <strong>${tope}</strong> ` +
    '(5 días después) para recibir el inmueble, o pueden coordinar una fecha antes de que termine el año. Se revisa contra el inventario de la entrega.';
  ['INQUILINO', 'PROPIETARIO'].forEach(r => {
    const p = partes[r];
    if (String(p.correo).indexOf('@') === -1) return;
    const cuerpo = (r === rol
      ? `Registramos que decidiste <strong>terminar el contrato de arrendamiento</strong> del inmueble en <strong>${partes.direccion}</strong>. Le enviamos la notificación a ${_primerNombre_(partes[_otroRol_(rol)].nombre)}.`
      : `<strong>${quien.nombre}</strong> notificó la <strong>terminación del contrato de arrendamiento</strong> del inmueble en <strong>${partes.direccion}</strong>` + (motivo ? ` (motivo: ${motivo})` : '') + '.') +
      (adj ? '<br><br>📄 Adjuntamos el documento de terminación.' : '') + (r === 'INQUILINO' ? textoInq : textoProp);
    try {
      enviarCorreoCita(p.correo, '📄 Terminación del contrato de arrendamiento - Gold Life', 'TERMINACIÓN DEL CONTRATO', _primerNombre_(p.nombre), cuerpo, '', adj);
    } catch (e) { Logger.log('⚠️ Correo de terminación a ' + r + ': ' + e.message); }
  });
  _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '📄 Terminación del contrato · ' + idInm + ' · la notificó el ' + rol.toLowerCase(), 'TERMINACIÓN DEL CONTRATO', 'Leonardo',
    `<strong>${quien.nombre}</strong> (${rol.toLowerCase()}) terminó el contrato del inmueble <strong>${idInm}</strong> (${partes.direccion}).<br>` +
    `Motivo: <em>${motivo}</em><br>Termina el <strong>${fin}</strong> · entrega como máximo el <strong>${tope}</strong>.` +
    (doc ? `<br><br><a href="${doc.url}">📄 Ver el documento de terminación</a>` : '<br><br>⚠️ El documento no se pudo generar: hazlo a mano.'),
    botonesContacto_([{ quien: 'inquilino', cel: partes.INQUILINO.celular }, { quien: 'propietario', cel: partes.PROPIETARIO.celular }]));
}

function _correosRenovado_(idInm, partes, f) {
  const nuevoFin = cvSumarDias(cvSumarMeses(cvSumarDias(f.fin, 1), 12), -1);
  ['INQUILINO', 'PROPIETARIO'].forEach(r => {
    const p = partes[r];
    if (String(p.correo).indexOf('@') === -1) return;
    _correoCitaSeguro(p.correo, '🔄 Tu contrato se renovó por un año más - Gold Life', 'CONTRATO RENOVADO', _primerNombre_(p.nombre),
      `Las dos partes decidieron <strong>renovar</strong> el contrato de arrendamiento del inmueble en <strong>${partes.direccion}</strong>.<br><br>` +
      `El nuevo año va del <strong>${_textoCv_(cvSumarDias(f.fin, 1))}</strong> al <strong>${_textoCv_(nuevoFin)}</strong>. Antes de empezar te confirmamos el valor del canon del nuevo año.`, '');
  });
  _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '🔄 Contrato renovado · ' + idInm, 'CONTRATO RENOVADO', 'Leonardo',
    `Las dos partes renovaron el contrato del inmueble <strong>${idInm}</strong> (${partes.direccion}). El nuevo año va hasta el <strong>${_textoCv_(nuevoFin)}</strong>.<br><br>` +
    'Pendiente: el canon del nuevo año con el IPC.', '');
}
