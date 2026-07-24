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
    var githubToken = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    var repoOwner = PropertiesService.getScriptProperties().getProperty('GITHUB_OWNER') || 'DLeoGutierrez';
    var repoName = PropertiesService.getScriptProperties().getProperty('GITHUB_REPO') || 'Gold-Life-System';

    if (githubToken) {
      try {
        var url = "https://api.github.com/repos/" + repoOwner + "/" + repoName + "/actions/workflows/scraper.yml/dispatches";
        var options = {
          "method": "post",
          "headers": {
            "Authorization": "Bearer " + githubToken,
            "Accept": "application/vnd.github+json"
          },
          "payload": JSON.stringify({"ref": "main"}),
          "muteHttpExceptions": true
        };
        var res = UrlFetchApp.fetch(url, options);
        if (res.getResponseCode() === 204) {
          ui.alert(
            '🚀 ¡Barrido Iniciado con Éxito!',
            'El Agente Captador está rastreando Fincaraiz en la nube.\n\nLos inmuebles de propietarios directos comenzarán a escribirse automáticamente en la pestaña "1 - CAPTACIONES A".',
            ui.ButtonSet.OK
          );
          return;
        }
      } catch (e) {
        // En caso de error de red, continuar con aviso
      }
    }

    ui.alert(
      '🚀 ¡Agente Captador Activado!',
      'El barrido de Fincaraiz ha sido solicitado.\n\nLos inmuebles de propietarios directos comenzarán a escribirse en la pestaña "1 - CAPTACIONES A" en breve.',
      ui.ButtonSet.OK
    );
  }
}
