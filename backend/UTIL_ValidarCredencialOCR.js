// ==========================================
// VALIDADOR DE LA CREDENCIAL OCR
// ==========================================
// Utilidad puntual para confirmar que la propiedad OCR_PRIVATE_KEY quedo bien
// puesta despues de rotar la llave de la Service Account.
//
// NO imprime la llave. Solo reporta:
//   - si las propiedades existen y tienen la forma correcta
//   - una HUELLA (hash SHA-256) de la llave, para poder compararla contra el
//     archivo .json local sin exponer el contenido
//   - si Google acepta la credencial pidiendo un token de verdad
//
// Se puede borrar este archivo cuando la rotacion quede confirmada.

function validarCredencialOCR() {
  var props = PropertiesService.getScriptProperties();
  var privateKey = props.getProperty('OCR_PRIVATE_KEY');
  var clientEmail = props.getProperty('OCR_CLIENT_EMAIL');
  var lineas = [];

  lineas.push('=== VALIDACION DE LA CREDENCIAL OCR ===');
  lineas.push('');

  // --- 1. Existencia ---
  if (!privateKey) {
    lineas.push('ERROR: la propiedad OCR_PRIVATE_KEY no existe o esta vacia.');
    Logger.log(lineas.join('\n'));
    return lineas.join('\n');
  }
  lineas.push('OCR_CLIENT_EMAIL : ' + (clientEmail || '(FALTA)'));
  lineas.push('OCR_PRIVATE_KEY  : presente, ' + privateKey.length + ' caracteres');

  // --- 2. Forma ---
  var tieneInicio = privateKey.indexOf('BEGIN PRIVATE KEY') >= 0;
  var tieneFin = privateKey.indexOf('END PRIVATE KEY') >= 0;
  lineas.push('  marca BEGIN    : ' + (tieneInicio ? 'si' : 'NO  <-- falta'));
  lineas.push('  marca END      : ' + (tieneFin ? 'si' : 'NO  <-- falta'));

  if (!tieneInicio || !tieneFin) {
    lineas.push('');
    lineas.push('ERROR: la llave quedo incompleta al pegarla.');
    lineas.push('Debe incluir las lineas -----BEGIN PRIVATE KEY----- y -----END PRIVATE KEY-----');
    Logger.log(lineas.join('\n'));
    return lineas.join('\n');
  }

  // Misma normalizacion que usa OCR-HANDLER.js
  var llaveNormalizada = privateKey.indexOf('\\n') >= 0
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey;

  // --- 3. Huella, para comparar contra el .json local ---
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    llaveNormalizada,
    Utilities.Charset.UTF_8
  );
  var hex = digest.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');

  lineas.push('');
  lineas.push('HUELLA (SHA-256, primeros 24) : ' + hex.substring(0, 24));

  // --- 4. Prueba real: pedirle un token a Google ---
  lineas.push('');
  try {
    var ahora = Math.floor(Date.now() / 1000);
    var jwt = createJWT({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-vision',
      aud: 'https://oauth2.googleapis.com/token',
      exp: ahora + 3600,
      iat: ahora
    }, llaveNormalizada);

    var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      payload: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      },
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200 && JSON.parse(res.getContentText()).access_token) {
      lineas.push('PRUEBA REAL : Google acepto la credencial y entrego un token. OK');
    } else {
      lineas.push('PRUEBA REAL : Google RECHAZO la credencial.');
      lineas.push('  codigo    : ' + res.getResponseCode());
      lineas.push('  respuesta : ' + res.getContentText().substring(0, 200));
    }
  } catch (e) {
    lineas.push('PRUEBA REAL : fallo al firmar el JWT -> ' + e.toString());
    lineas.push('  Suele significar que la llave quedo mal pegada o con saltos de linea rotos.');
  }

  var salida = lineas.join('\n');
  Logger.log(salida);
  return salida;
}
