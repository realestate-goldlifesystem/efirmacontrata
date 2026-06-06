function test_extract_cerebro() {
  const cdr = 'REG_28-05-2026-C43_(Cra 8 #170-92)_TORRE-9_APTO-702';
  try {
    const cdrEscaped = cdr.replace(/'/g, "\\'");
    console.log("Buscando CDR: " + cdrEscaped);
    
    // Buscar en todo Drive primero sin limitarlo, para ver si encontramos el archivo Cerebro y con qué nombre
    const s1 = DriveApp.searchFiles(`title contains '${cdrEscaped}' and trashed = false`);
    let foundCerebro = null;
    while (s1.hasNext()) {
      const f = s1.next();
      console.log("Encontrado archivo: " + f.getName() + " de tipo: " + f.getMimeType());
      if (f.getName().includes("DATOS DE ELABORACION")) {
        foundCerebro = f;
      }
    }
    
    if (!foundCerebro) {
      console.log("NO SE ENCONTRO NINGUN CEREBRO!");
      return;
    }
    
    const doc = DocumentApp.openById(foundCerebro.getId());
    const text = doc.getBody().getText();
    
    console.log("TEXTO DEL CEREBRO (primeros 500 chars):");
    console.log(text.substring(0, 500));
  } catch (e) {
    console.error(e.message, e.stack);
  }
}
