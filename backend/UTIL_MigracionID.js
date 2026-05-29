function generarIdInmueble() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numAleatorio = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const letra1 = letras.charAt(Math.floor(Math.random() * letras.length));
  const letra2 = letras.charAt(Math.floor(Math.random() * letras.length));
  return letra1 + letra2 + numAleatorio;
}

function migrarIdsAntiguos() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("1.1 - INMUEBLES REGISTRADOS");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const cdrCol = headers.indexOf('CODIGO DE REGISTRO') + 1;
  const idCol = headers.indexOf('ID DE REGISTRO') + 1;
  
  if (cdrCol === 0) {
    Logger.log("No se encontró la columna CODIGO DE REGISTRO.");
    return;
  }
  
  if (idCol === 0) {
    Logger.log("No se encontró la columna ID DE REGISTRO. Por favor créala primero.");
    return;
  }
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  let actualizados = 0;
  
  // Guardamos todos los IDs que existen para no repetir
  const idsExistentes = new Set();
  data.forEach(row => {
    if (row[idCol - 1]) idsExistentes.add(row[idCol - 1]);
  });
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const cdr = row[cdrCol - 1];
    const idActual = row[idCol - 1];
    
    // Si tiene CDR pero no tiene ID, le generamos uno
    if (cdr && !idActual) {
      let nuevoId = generarIdInmueble();
      while(idsExistentes.has(nuevoId)) {
        nuevoId = generarIdInmueble();
      }
      idsExistentes.add(nuevoId);
      
      sheet.getRange(i + 2, idCol).setValue(nuevoId);
      actualizados++;
    }
  }
  
  Logger.log(`Migración completada. Se generaron ${actualizados} IDs nuevos.`);
}
