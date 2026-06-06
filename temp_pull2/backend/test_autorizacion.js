function TEST_MANUAL_AUTORIZACION() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  
  // En lugar de buscar un ID fijo, tomaremos la ÚLTIMA fila de la hoja
  // que corresponde a tu última prueba
  let targetRowData = sheetData[sheetData.length - 1];
  
  if (!targetRowData) {
    Logger.log("La hoja está vacía.");
    return;
  }
  
  let colId = headers.findIndex(h => h && h.toString().trim() === 'ID DE REGISTRO');
  Logger.log("Fila encontrada con ID: " + (colId >= 0 ? targetRowData[colId] : "Desconocido"));

  let colDisponePorteria = 0;
  for (let c = 0; c < headers.length; c++) {
    const hName = headers[c] ? headers[c].toString().toLowerCase() : '';
    if (hName.includes('dispone de portería') || hName.includes('dispone de porteria')) {
      colDisponePorteria = c + 1;
      break;
    }
  }
  
  let enviarAutorizacion = false;
  if (colDisponePorteria > 0) {
    const valorPorteria = String(targetRowData[colDisponePorteria - 1] || '').toLowerCase().trim();
    Logger.log("Valor porteria: " + valorPorteria);
    if (valorPorteria === 'si' || valorPorteria === 'sí') {
      enviarAutorizacion = true;
    }
  }

  Logger.log("enviarAutorizacion: " + enviarAutorizacion);

  if (enviarAutorizacion) {
    let colAuthId = 0;
    for (let c = 0; c < headers.length; c++) {
      const hName = headers[c] ? headers[c].toString().toUpperCase() : '';
      if (hName.includes('MERGED DOC ID') && hName.includes('AUTORIZACI')) {
        colAuthId = c + 1;
        break;
      }
    }
    
    if (colAuthId > 0) {
      const authDocId = targetRowData[colAuthId - 1];
      Logger.log("Auth Doc ID: " + authDocId);
      
      if (authDocId && authDocId.toString().trim() !== '') {
        Logger.log("Fetching PDF...");
        try {
          const authFile = DriveApp.getFileById(authDocId);
          const authPdfBlob = authFile.getAs(MimeType.PDF);
          Logger.log("PDF fetched successfully.");
          
          let adminInmuebleEmail = '';
          for (let c = 0; c < headers.length; c++) {
            const headerName = headers[c] ? headers[c].toString().toLowerCase() : '';
            if (headerName.includes('correo') && headerName.includes('administración')) {
              const maybeEmail = targetRowData[c];
              if (maybeEmail && String(maybeEmail).includes('@')) {
                adminInmuebleEmail = String(maybeEmail).trim();
              }
              break;
            }
          }
          Logger.log("Admin Email: " + adminInmuebleEmail);

          const colNombreInmueble = headers.findIndex(h => h && h.toString().toUpperCase().includes('NOMBRE DEL INMUEBLE/ADMINISTRACION'));
          const nombreInmueble = colNombreInmueble > 0 ? targetRowData[colNombreInmueble] : 'la Administración';

          let colEmailProp = headers.findIndex(h => h && h.toString().toUpperCase().includes('CORREO ELECTRÓNICO'));
          let emailCliente = colEmailProp >= 0 ? targetRowData[colEmailProp] : Session.getActiveUser().getEmail();

          let colNombrePropietario = headers.findIndex(h => h && h.toString().toUpperCase().includes('INGRESE NOMBRES Y APELLIDOS'));
          let nombreCliente = colNombrePropietario >= 0 ? targetRowData[colNombrePropietario] : 'TEST CLIENTE';

          let subjectAuth = `AUTORIZACION DE INGRESO AL INMUEBLE PARA GESTION INMOBILIARIA POR ${nombreCliente} en ${nombreInmueble} - REAL ESTATE Gold Life System`;
          
          var templateAuth = HtmlService.createTemplateFromFile('backend/email_autorizacion');
          templateAuth.NOMBRE_CLIENTE = nombreCliente;
          templateAuth.NOMBRE_INMUEBLE = nombreInmueble;
          templateAuth.ADMIN_EMAIL = adminInmuebleEmail || '';
          templateAuth.ANIO = new Date().getFullYear();
          var htmlBodyAuth = templateAuth.evaluate().getContent();

          let optionsAuth = {
            to: emailCliente,
            subject: subjectAuth,
            htmlBody: htmlBodyAuth,
            attachments: [authPdfBlob]
          };
          
          if (adminInmuebleEmail && adminInmuebleEmail.trim() !== '') {
            optionsAuth.cc = adminInmuebleEmail.trim();
          }

          Logger.log("Sending email...");
          MailApp.sendEmail(optionsAuth);
          Logger.log("Email sent successfully!");
        } catch (e) {
          Logger.log("ERROR SENDING EMAIL: " + e.toString());
        }
      }
    }
  }
}
