// ¿La hoja apunta al acta MÁS RECIENTE, o se quedó con la del año pasado?
//
// Al renovar, el acta nueva se genera y se firma en una FILA TEMPORAL que
// después se borra. transferirCaracteristicasFormulario se salta a propósito
// todas las columnas "Link to merged Doc" / "Merged Doc ID" / "Merged Doc URL" /
// "Document Merge Status" (ver 2- REGISTRO DE INMUEBLE.js), así que la fila
// original conserva el acta vieja.
//
// Esto compara, para cada fila y cada negocio, la fecha del acta a la que
// apunta la hoja contra la del acta más nueva que hay en la carpeta.
//
// Solo lee.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJA = '1.1 - INMUEBLES REGISTRADOS';

const NEGOCIOS = [
  { n: 'CORRETAJE',      patron: /promoci[oó]n de inmueble en arriendo/i },
  { n: 'ADMINISTRACIÓN', patron: /^acta de administraci[oó]n de inmueble/i },
  { n: 'VENTA',          patron: /promoci[oó]n de inmueble en venta/i },
  { n: 'VENDI-RENTA',    patron: /vendi-?renta/i },
  { n: 'ADMI-VENTA',     patron: /admi-?venta/i },
  { n: 'AUTORIZACIÓN DE INGRESO AL INMUEBLE', patron: /^acta de autorizaci[oó]n de ingreso/i },
];

const hijos = async (id) => (await drive.files.list({ q: `'${id}' in parents and trashed=false`, fields: 'files(id,name,mimeType,createdTime)', pageSize: 500 })).data.files;
const idDeDrive = (t) => { const m = String(t || '').match(/(?:folders|\/d)\/([\w-]{20,})/); return m ? m[1] : ''; };
const fecha = (s) => String(s || '').slice(0, 10);

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${HOJA}'!A1:ZZ`, valueRenderOption: 'FORMULA' });
  const [h, ...filas] = r.data.values;
  const cId = h.indexOf('ID DE REGISTRO'), cReg = h.indexOf('LINK DE CARPETA REG'), cEst = h.indexOf('ESTADO DEL INMUEBLE');

  let alDia = 0, atrasados = 0, sinDato = 0;

  for (let f = 0; f < filas.length; f++) {
    const fila = filas[f];
    const id = String(fila[cId] || '').trim();
    if (!id) continue;

    const regId = idDeDrive(fila[cReg]);
    if (!regId) continue;

    let aut;
    try {
      const arch = (await hijos(regId)).find(x => x.name === 'ARCHIVOS DEL INMUEBLE');
      aut = arch && (await hijos(arch.id)).find(x => x.name.indexOf('AUTORIZACIONES') === 0);
    } catch (e) { continue; }
    if (!aut) continue;

    const archivos = (await hijos(aut.id)).filter(x => !x.mimeType.includes('folder') && !/<<.*>>/.test(x.name));
    if (!archivos.length) continue;

    const avisos = [];
    for (const neg of NEGOCIOS) {
      const cDocId = h.indexOf('Merged Doc ID - ' + neg.n);
      if (cDocId === -1) continue;
      const docId = String(fila[cDocId] || '').trim();
      if (!docId) continue;

      let apuntado;
      try { apuntado = (await drive.files.get({ fileId: docId, fields: 'name,createdTime,trashed' })).data; }
      catch (e) { avisos.push(`   ⚠️ ${neg.n}: el acta apuntada ya no existe`); sinDato++; continue; }

      const candidatos = archivos.filter(a => neg.patron.test(a.name));
      if (!candidatos.length) continue;

      const masNueva = candidatos.slice().sort((a, b) => String(b.createdTime).localeCompare(String(a.createdTime)))[0];
      if (String(masNueva.createdTime) > String(apuntado.createdTime)) {
        atrasados++;
        avisos.push(`   🔴 ${neg.n}`);
        avisos.push(`        hoja apunta a:  ${fecha(apuntado.createdTime)}  ${apuntado.name}`);
        avisos.push(`        la más nueva:   ${fecha(masNueva.createdTime)}  ${masNueva.name}`);
      } else alDia++;
    }

    if (avisos.length) {
      console.log(`\n📄 fila ${f + 2} — ${id}   [${String(fila[cEst] || '').trim()}]`);
      avisos.forEach(a => console.log(a));
    }
  }

  console.log(`\nActas al día: ${alDia} | desactualizadas: ${atrasados} | apuntadas que ya no existen: ${sinDato}`);
})().catch(e => { console.error(e.message); process.exit(1); });
