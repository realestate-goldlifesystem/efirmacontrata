// Conecta la zona interna "Alarma" a las actas (19-oct-2026). Era la única zona
// interna sin etiqueta: el propietario la marcaba y no salía ni en el acta ni en la
// descripción (que se extrae del acta).
//   - En las 5 plantillas de negocio: <<OTRO INTERNO>> → <<ALARMA>><<OTRO INTERNO>>
//     (casilla ZONA #14 de la tabla y párrafo "características adicionales como").
//   - En 'DO NOT DELETE - AutoCrat Job Settings': etiqueta ALARMA → " [Zona interna #8 Alarma]".
// Idempotente: si ya está, no repite. Guarda la configuración anterior en <respaldo>.
// Uso: node agregar_etiqueta_alarma.js <respaldo.json> [--aplicar]
const fs = require('fs');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/documents'] });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const CONFIG = "'DO NOT DELETE - AutoCrat Job Settings'";
const NEGOCIOS = ['CORRETAJE', 'ADMINISTRACIÓN', 'VENTA', 'VENDI-RENTA', 'ADMI-VENTA'];
const ETIQUETA = { tag: 'ALARMA', type: 'STANDARD', details: { headerMap: ' [Zona interna #8 Alarma]', isUnmapped: false } };

(async () => {
  const [respaldo, ap] = process.argv.slice(2);
  const aplicar = ap === '--aplicar';
  const s = google.sheets({ version: 'v4', auth }), d = google.docs({ version: 'v1', auth });
  const filas = (await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: CONFIG + '!A1:Z' })).data.values;
  if (aplicar) fs.writeFileSync(respaldo, JSON.stringify(filas));

  for (let i = 1; i < filas.length; i++) {
    const negocio = String(filas[i][1] || '').trim().toUpperCase();
    if (!NEGOCIOS.includes(negocio)) continue;
    const plantilla = filas[i][2];
    const tags = JSON.parse(filas[i][14]);

    const doc = await d.documents.get({ documentId: plantilla });
    const texto = JSON.stringify(doc.data.body);
    const yaPlantilla = texto.includes('<<ALARMA>>');
    const yaConfig = tags.some(t => t.tag === 'ALARMA');
    console.log(negocio.padEnd(15), '| plantilla:', yaPlantilla ? 'ya tiene' : 'agregar', '| config:', yaConfig ? 'ya tiene' : 'agregar');
    if (!aplicar) continue;

    if (!yaPlantilla) {
      const r = await d.documents.batchUpdate({ documentId: plantilla, requestBody: { requests: [
        { replaceAllText: { containsText: { text: '<<OTRO INTERNO>>', matchCase: true }, replaceText: '<<ALARMA>><<OTRO INTERNO>>' } }] } });
      console.log('   reemplazos en plantilla:', r.data.replies[0].replaceAllText.occurrencesChanged);
    }
    if (!yaConfig) {
      tags.push(ETIQUETA);
      await s.spreadsheets.values.update({ spreadsheetId: SHEET, range: `${CONFIG}!O${i + 1}`, valueInputOption: 'RAW', requestBody: { values: [[JSON.stringify(tags)]] } });
      console.log('   etiqueta agregada a la configuración');
    }
  }
  if (!aplicar) console.log('\n(solo revisión)');
})();
