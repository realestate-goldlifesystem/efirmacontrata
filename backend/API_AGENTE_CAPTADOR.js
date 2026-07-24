// ==========================================
// AGENTE CAPTADOR FINCARAIZ - GOLD LIFE SYSTEM
// ==========================================

function ejecutarAgenteCaptadorArriendo() {
  ejecutarAgenteCaptador('arriendo');
}

function ejecutarAgenteCaptadorVenta() {
  ejecutarAgenteCaptador('venta');
}

/**
 * Muestra el Modal HTML estilizado con el selector de habitaciones
 * @param {string} modo - 'arriendo' o 'venta'
 */
function ejecutarAgenteCaptador(modo) {
  modo = modo || 'arriendo';
  var ui = SpreadsheetApp.getUi();
  var esVenta = modo === 'venta';
  var tipoTexto = esVenta ? 'VENTA' : 'ARRIENDO';

  var template;
  try {
    template = HtmlService.createTemplateFromFile('backend/MODAL_HABITACIONES');
  } catch (e) {
    template = HtmlService.createTemplateFromFile('MODAL_HABITACIONES');
  }
  template.modo = modo;
  template.tipoTexto = tipoTexto;

  var html = template.evaluate()
    .setWidth(440)
    .setHeight(230);

  ui.showModalDialog(html, '🚀 Agente Captador - Fincaraiz (' + tipoTexto + ')');
}

/**
 * Función backend invocada desde el Modal HTML para disparar GitHub Actions
 * @param {string} modo - 'arriendo' o 'venta'
 * @param {string} bedrooms - '1', '2', '3', '4', '5' o 'all'
 */
function dispararWorkflowConHabitaciones(modo, bedrooms) {
  modo = modo || 'arriendo';
  bedrooms = bedrooms || 'all';

  var ui = SpreadsheetApp.getUi();
  var esVenta = modo === 'venta';
  var tipoTexto = esVenta ? 'VENTA' : 'ARRIENDO';
  var pestanaTexto = esVenta ? '1 - CAPTACIONES V' : '1 - CAPTACIONES A';

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
    var url = "https://api.github.com/repos/" + repoOwner + "/" + repoName + "/actions/workflows/scraper.yml/dispatches";
    var habTexto = (bedrooms === 'all') ? 'Todas las habitaciones (1 a 5+)' : bedrooms + ' Habitación(es)';

    var options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + githubToken,
        "Accept": "application/vnd.github+json",
        "User-Agent": "AppsScript-Bot"
      },
      "payload": JSON.stringify({
        "ref": "main",
        "inputs": {
          "mode": modo,
          "bedrooms": bedrooms
        }
      }),
      "muteHttpExceptions": true
    };

    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();

    if (code === 204) {
      ui.alert(
        '🚀 ¡Barrido de ' + tipoTexto + ' Iniciado!',
        'El Agente Captador está rastreando Fincaraiz en la nube (' + tipoTexto + ' | ' + habTexto + ').\n\nLos inmuebles de propietarios directos comenzarán a escribirse automáticamente en la pestaña "' + pestanaTexto + '".',
        ui.ButtonSet.OK
      );
    } else {
      var errorMsg = res.getContentText();
      ui.alert(
        '❌ Error al activar el Robot (Código ' + code + ')',
        'GitHub respondió:\n' + errorMsg,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    ui.alert('❌ Error de Conexión', e.toString(), ui.ButtonSet.OK);
  }
}
