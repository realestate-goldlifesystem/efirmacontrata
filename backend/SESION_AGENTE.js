// =============================================================================
// SESIÓN DEL AGENTE EN EL PORTAFOLIO
// =============================================================================
// El token de Google vence a la hora y no se puede alargar, así que Google solo
// sirve para ENTRAR: al entrar, el servidor confirma el correo contra Google una
// vez y entrega un pase propio, firmado con una llave que solo vive en las
// propiedades del script. El pase dura 12 horas y se renueva mientras el agente
// usa el panel; las herramientas lo validan con la firma, sin llamar a Google.
//
// "Cerrar sesión en todos los dispositivos" cambia la llave: todos los pases
// que existan dejan de servir de una vez.
//
// Formato: gls1.<datos en base64url>.<firma HMAC-SHA256 en base64url>
// =============================================================================

var SESION_AGENTE = {
  PREFIJO: 'gls1',
  DURACION_MS: 12 * 60 * 60 * 1000,
  PROP_LLAVE: 'SESION_AGENTE_LLAVE'
};

/** Llave de firma; se crea sola la primera vez. rotar = true invalida todos los pases. */
function sesionAgenteLlave_(rotar) {
  var props = PropertiesService.getScriptProperties();
  var llave = props.getProperty(SESION_AGENTE.PROP_LLAVE);
  if (!llave || rotar) {
    llave = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(SESION_AGENTE.PROP_LLAVE, llave);
  }
  return llave;
}

function sesionAgenteB64_(x) {
  return Utilities.base64EncodeWebSafe(x).replace(/=+$/, '');
}

function sesionAgenteFirma_(texto) {
  return sesionAgenteB64_(Utilities.computeHmacSha256Signature(texto, sesionAgenteLlave_(false)));
}

/** Pase nuevo de 12 horas para el correo ya verificado. */
function sesionAgenteEmitir_(email) {
  var ahora = Date.now();
  var cuerpo = sesionAgenteB64_(JSON.stringify({ e: email, iat: ahora, exp: ahora + SESION_AGENTE.DURACION_MS }));
  var base = SESION_AGENTE.PREFIJO + '.' + cuerpo;
  return base + '.' + sesionAgenteFirma_(base);
}

function sesionAgenteEsPase_(token) {
  return String(token || '').indexOf(SESION_AGENTE.PREFIJO + '.') === 0;
}

/** Valida un pase. Devuelve {ok, mensaje, email}. */
function sesionAgenteValidar_(token) {
  var partes = String(token || '').split('.');
  var vencida = { ok: false, mensaje: 'Tu sesión terminó. Vuelve a iniciar sesión.' };
  if (partes.length !== 3 || partes[0] !== SESION_AGENTE.PREFIJO) return vencida;
  var esperada = sesionAgenteFirma_(partes[0] + '.' + partes[1]);
  // Comparación sin cortar en el primer carácter distinto
  var dif = esperada.length ^ partes[2].length;
  for (var i = 0; i < esperada.length; i++) dif |= esperada.charCodeAt(i) ^ (partes[2].charCodeAt(i) || 0);
  if (dif !== 0) return vencida;
  var datos;
  try {
    var b64 = partes[1] + '===='.slice((partes[1].length % 4) || 4);
    datos = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b64)).getDataAsString());
  } catch (e) {
    return vencida;
  }
  if (!datos || typeof datos.exp !== 'number' || datos.exp < Date.now()) return vencida;
  var email = String(datos.e || '').toLowerCase().trim();
  if (email !== CORREO_AGENTE_MIGUEL) return { ok: false, mensaje: 'Este correo no tiene permiso para el panel del agente.' };
  return { ok: true, mensaje: '', email: email };
}

/**
 * Entrada desde doPost (accion: sesionAgente). datos.op:
 *   entrar      credential = token de Google → { sesion }
 *   renovar     credential = pase vigente    → { sesion } con 12 horas nuevas
 *   cerrarTodas credential = pase vigente    → invalida todos los pases
 */
function sesionAgenteDesdeWeb(datos) {
  var op = String((datos && datos.op) || '');
  var credential = datos && datos.credential;
  if (op === 'entrar') {
    if (sesionAgenteEsPase_(credential)) return { success: false, message: 'Para entrar hace falta iniciar sesión con Google.' };
    var g = _verificarAgenteGoogle(credential);
    if (!g.ok) return { success: false, message: g.mensaje };
    return { success: true, sesion: sesionAgenteEmitir_(g.email) };
  }
  if (op === 'renovar' || op === 'cerrarTodas') {
    // vencida = true le dice al portafolio que salga; cualquier otro error es pasajero
    if (!sesionAgenteEsPase_(credential)) return { success: false, vencida: true, message: 'Tu sesión terminó. Vuelve a iniciar sesión.' };
    var p = sesionAgenteValidar_(credential);
    if (!p.ok) return { success: false, vencida: true, message: p.mensaje };
    if (op === 'renovar') return { success: true, sesion: sesionAgenteEmitir_(p.email) };
    sesionAgenteLlave_(true);
    return { success: true, message: 'Se cerró la sesión en todos los dispositivos.' };
  }
  return { success: false, message: 'Operación de sesión no reconocida.' };
}
