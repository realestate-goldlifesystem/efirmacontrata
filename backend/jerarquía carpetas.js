function mostrarEstructuraCarpetasPlantilla() {
  var plantillaId = '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH'; // ID de PLANTILLA #1
  var carpetaRaiz = DriveApp.getFolderById(plantillaId);
  Logger.log(`📁 Carpeta raíz: ${carpetaRaiz.getName()}`);
  recorrerCarpetas(carpetaRaiz, 0);
}

function recorrerCarpetas(carpeta, nivel) {
  var espacios = '  '.repeat(nivel);
  var subcarpetas = carpeta.getFolders();

  while (subcarpetas.hasNext()) {
    var sub = subcarpetas.next();
    Logger.log(`${espacios}📂 Nivel ${nivel}: ${sub.getName()}`);
    recorrerCarpetas(sub, nivel + 1);
  }
}
