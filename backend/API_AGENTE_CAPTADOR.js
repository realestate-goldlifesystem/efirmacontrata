// ==========================================
// AGENTE CAPTADOR FINCARAIZ - GOLD LIFE SYSTEM
// ==========================================

/**
 * Función principal disparada desde el menú '🤖 Agente Captador' en Google Sheets
 */
function ejecutarAgenteCaptador() {
  var ui = SpreadsheetApp.getUi();
  
  var respuesta = ui.alert(
    '🤖 Agente Captador - Fincaraiz',
    '¿Deseas iniciar el barrido automático de inmuebles de propietarios directos en Fincaraiz en este momento?',
    ui.ButtonSet.YES_NO
  );

  if (respuesta === ui.Button.YES) {
    var scriptProps = PropertiesService.getScriptProperties();
    var githubToken = scriptProps.getProperty('GITHUB_PAT');
    var repoOwner = scriptProps.getProperty('GITHUB_OWNER') || 'realestate-goldlifesystem';
    var repoName = scriptProps.getProperty('GITHUB_REPO') || 'efirmacontrata';

    if (!githubToken) {
      ui.alert(
        '⚠️ Falta Configurar Token de GitHub',
        'No se encontró la propiedad "GITHUB_PAT" en las Propiedades del Script.\n\nPara que el botón active el robot en GitHub, necesitas agregar tu GitHub Token (PAT).\n\n¿Deseas agregarlo o verificar la configuración?',
        ui.ButtonSet.OK
      );
      return;
    }

    try {
      var url = "https://api.github.com/repos/" + repoOwner + "/" + repoName + "/actions/workflows/scraper.yml/dispatches";
      var options = {
        "method": "post",
        "headers": {
          "Authorization": "Bearer " + githubToken,
          "Accept": "application/vnd.github+json",
          "User-Agent": "AppsScript-Bot"
        },
        "payload": JSON.stringify({"ref": "main"}),
        "muteHttpExceptions": true
      };
      var res = UrlFetchApp.fetch(url, options);
      var code = res.getResponseCode();

      if (code === 204) {
        ui.alert(
          '🚀 ¡Barrido Iniciado con Éxito!',
          'El Agente Captador está rastreando Fincaraiz en la nube.\n\nLos inmuebles de propietarios directos comenzarán a escribirse automáticamente en la pestaña "1 - CAPTACIONES A".',
          ui.ButtonSet.OK
        );
      } else {
        var errorMsg = res.getContentText();
        ui.alert(
          '❌ Error al activar el Robot (Código ' + code + ')',
          'GitHub respondió:\n' + errorMsg + '\n\nVerifica que el token GITHUB_PAT tenga permisos de "repo" / "workflow" y apunte a ' + repoOwner + '/' + repoName + '.',
          ui.ButtonSet.OK
        );
      }
    } catch (e) {
      ui.alert('❌ Error de Conexión', e.toString(), ui.ButtonSet.OK);
    }
  }
}
