// ==========================================
// PRUEBA MIGUEL-METROCUADRADO - GOLD LIFE SYSTEM
// Dispara la corrida de prueba (Usaquen + Suba + Chapinero, 5 habitaciones,
// cuota de 5 particulares por habitacion repartida entre localidades).
// Escribe UNICAMENTE en la pestana "PRUEBA METROCUADRADO" -- no toca las
// pestanas reales. Ver robot_captador/prueba_metrocuadrado.py.
// ==========================================

/**
 * Confirma con el usuario y dispara el workflow de prueba de Metrocuadrado.
 */
function ejecutarAgenteCaptadorMetrocuadrado() {
  var ui = SpreadsheetApp.getUi();

  var resp = ui.alert(
    '🧪 Prueba Miguel-Metrocuadrado',
    'Esto va a recorrer Usaquén, Suba y Chapinero en las 5 habitaciones ' +
    '(cuota de 5 particulares por habitación, repartida entre las 3 localidades).\n\n' +
    'Escribe SOLO en la pestaña de prueba "PRUEBA METROCUADRADO" -- no toca ' +
    'las pestañas reales de captaciones.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp !== ui.Button.OK) return;

  var scriptProps = PropertiesService.getScriptProperties();
  var githubToken = scriptProps.getProperty('GITHUB_PAT');
  var repoOwner = scriptProps.getProperty('GITHUB_OWNER') || 'realestate-goldlifesystem';
  var repoName = scriptProps.getProperty('GITHUB_REPO') || 'efirmacontrata';

  if (!githubToken) {
    ui.alert(
      '⚠️ Falta Configurar Token de GitHub',
      'No se encontró la propiedad "GITHUB_PAT" en las Propiedades del Script.\n\nPor favor agregue la propiedad GITHUB_PAT en Extensiones > Apps Script > Configuración del proyecto > Propiedades del script.',
      ui.ButtonSet.OK
    );
    return;
  }

  try {
    var url = "https://api.github.com/repos/" + repoOwner + "/" + repoName +
               "/actions/workflows/prueba-metrocuadrado.yml/dispatches";

    var options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + githubToken,
        "Accept": "application/vnd.github+json",
        "User-Agent": "AppsScript-Bot"
      },
      "payload": JSON.stringify({
        "ref": "main"
      }),
      "muteHttpExceptions": true
    };

    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();

    if (code === 204) {
      ui.alert(
        '🧪 ¡Prueba de Metrocuadrado Iniciada!',
        'Corriendo en la nube sobre Usaquén, Suba y Chapinero (5 habitaciones, cuota 5 por habitación).\n\nLos resultados solo se escriben en la pestaña de prueba -- revisa el detalle en la pestaña "Actions" del repositorio.',
        ui.ButtonSet.OK
      );
    } else {
      var errorMsg = res.getContentText();
      ui.alert(
        '❌ Error al activar la prueba (Código ' + code + ')',
        'GitHub respondió:\n' + errorMsg,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    ui.alert('❌ Error de Conexión', e.toString(), ui.ButtonSet.OK);
  }
}
