function estandarizarNombresMayusculas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  
  if (!sheet) {
    Logger.log("Hoja '1.1 - INMUEBLES REGISTRADOS' no encontrada.");
    return;
  }
  
  // 1. Estandarizar Nombres en la Hoja de Cálculo
  Logger.log("Iniciando estandarización en Google Sheets...");
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  
  const colIndexNombre = headers.indexOf('NOMBRES Y APELLIDOS DEL PROPIETARIO');
  if (colIndexNombre === -1) {
    Logger.log("No se encontró la columna 'NOMBRES Y APELLIDOS DEL PROPIETARIO'.");
    return;
  }
  
  let rowsUpdated = 0;
  for (let i = 1; i < values.length; i++) {
    const currentName = String(values[i][colIndexNombre] || "");
    const upperName = currentName.toUpperCase();
    
    if (currentName !== upperName && currentName.trim() !== "") {
      sheet.getRange(i + 1, colIndexNombre + 1).setValue(upperName);
      rowsUpdated++;
    }
  }
  Logger.log(`Se actualizaron ${rowsUpdated} nombres en la hoja.`);
  
  // 2. Estandarizar Nombres en las Carpetas de Drive
  Logger.log("Iniciando estandarización en Google Drive...");
  const PARENT_FOLDER_ID = '1mBbFORjuddMN8nwU1zY27_wLa9iZWfvX';
  let foldersUpdated = 0;
  
  try {
    const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    const folders = parentFolder.getFolders();
    
    while (folders.hasNext()) {
      const folder = folders.next();
      const currentFolderName = folder.getName();
      const upperFolderName = currentFolderName.toUpperCase();
      
      if (currentFolderName !== upperFolderName) {
        folder.setName(upperFolderName);
        foldersUpdated++;
      }
    }
    Logger.log(`Se actualizaron ${foldersUpdated} carpetas en Drive.`);
  } catch (error) {
    Logger.log("Error accediendo a Drive: " + error.message);
  }
  
  Logger.log("Proceso de estandarización completado exitosamente.");
}
