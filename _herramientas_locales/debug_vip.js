function testDebugVip() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  const idxEstado = headers.indexOf('ESTADO DEL INMUEBLE');
  const idxCarpeta = headers.indexOf('LINK DE CARPETA REG');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const estado = String(row[idxEstado] || '').toUpperCase();
    if (estado.includes('PUBLICADO')) {
      const folderLink = row[idxCarpeta];
      Logger.log("Row " + i + ": " + folderLink);
      if (folderLink && typeof folderLink === 'string') {
        const match = folderLink.match(/(?:id=|folders\/|d\/)([a-zA-Z0-9_-]{25,})/);
        if (match && match[1]) {
          Logger.log("Match: " + match[1]);
          try {
            const mainFolder = DriveApp.getFolderById(match[1]);
            const photoFolders = mainFolder.getFoldersByName('FOTOGRAFÍAS');
            if (photoFolders.hasNext()) {
              Logger.log("Found FOTOGRAFÍAS");
              const files = photoFolders.next().getFiles();
              let count = 0;
              while (files.hasNext()) {
                const f = files.next();
                Logger.log("File: " + f.getName() + " - Mime: " + f.getMimeType());
                count++;
                if (count > 2) break;
              }
            } else {
               Logger.log("NOT FOUND FOTOGRAFÍAS");
            }
          } catch(e) {
            Logger.log("Error: " + e.message);
          }
        }
      }
      break; // Just one
    }
  }
}
