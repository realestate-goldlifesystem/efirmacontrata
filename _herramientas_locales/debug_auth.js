const { google } = require('googleapis');
const path = require('path');

async function debugRow() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'1.1 - INMUEBLES REGISTRADOS'!A:ZZ",
    });

    const rows = res.data.values;
    if (!rows || rows.length < 2) {
      console.log('No data found.');
      return;
    }

    const headers = rows[0];
    
    // Find the row with ID VW834226
    let targetRowIndex = -1;
    let targetRow = null;
    let colIdRegistro = headers.findIndex(h => h && h.toString().trim() === 'ID DE REGISTRO');
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][colIdRegistro] === 'VW834226') {
        targetRowIndex = i;
        targetRow = rows[i];
        break;
      }
    }

    if (!targetRow) {
      console.log('Row VW834226 not found.');
      return;
    }

    console.log('--- DEBUGGING ROW VW834226 ---');
    
    // 1. Check if property has administration
    let colDisponePorteria = -1;
    for (let c = 0; c < headers.length; c++) {
      const hName = headers[c] ? headers[c].toString().toLowerCase() : '';
      if (hName.includes('dispone de portería') || hName.includes('dispone de porteria')) {
        colDisponePorteria = c;
        break;
      }
    }

    console.log(`Column for Porteria found at index: ${colDisponePorteria}`);
    console.log(`Header Name: ${headers[colDisponePorteria]}`);
    
    let enviarAutorizacion = false;
    let valorPorteria = '';
    if (colDisponePorteria >= 0) {
      valorPorteria = String(targetRow[colDisponePorteria] || '').toLowerCase().trim();
      console.log(`Value for Porteria in row: "${valorPorteria}"`);
      if (valorPorteria === 'si' || valorPorteria === 'sí') {
        enviarAutorizacion = true;
      }
    }

    console.log(`enviarAutorizacion resolved to: ${enviarAutorizacion}`);

    if (enviarAutorizacion) {
      let colAuthId = -1;
      for (let c = 0; c < headers.length; c++) {
        const hName = headers[c] ? headers[c].toString().toUpperCase() : '';
        if (hName.includes('MERGED DOC ID') && hName.includes('AUTORIZACI')) {
          colAuthId = c;
          break;
        }
      }
      console.log(`Column for Auth ID found at index: ${colAuthId}`);
      console.log(`Header Name: ${headers[colAuthId]}`);
      
      if (colAuthId >= 0) {
        const authDocId = targetRow[colAuthId];
        console.log(`Auth Doc ID Value in row: "${authDocId}"`);
        
        let adminInmuebleEmail = '';
        for (let c = 0; c < headers.length; c++) {
          const headerName = headers[c] ? headers[c].toString().toLowerCase() : '';
          if (headerName.includes('correo') && headerName.includes('administración')) {
            const maybeEmail = targetRow[c];
            if (maybeEmail && String(maybeEmail).includes('@')) {
              adminInmuebleEmail = String(maybeEmail).trim();
            }
            break;
          }
        }
        console.log(`Admin Email found: "${adminInmuebleEmail}"`);
        
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugRow();
