// Oculta (no borra) las columnas del Google Form viejo que ya no se usan: barrios
// viejos y cláusulas que llenaba Autocrat. Google no deja borrarlas mientras la
// pestaña esté vinculada al formulario (16-oct-2026). Verifica letra y nombre.
// Uso: node ocultar_columnas_formulario_viejo.js [--aplicar]
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', PESTANA = '1.1 - INMUEBLES REGISTRADOS';
const OCULTAR = {
  U: 'Selecciona el barrio de PASEO DE LOS LIBERTADORES de tu inmueble', V: 'Selecciona el barrio de VERBENAL de tu inmueble',
  W: 'Selecciona el barrio de LA URIBE de tu inmueble', X: 'Selecciona el barrio de SAN CRISTOBAL NORTE tu inmueble',
  Y: 'Selecciona el barrio de TOBERIN de tu inmueble', Z: 'Selecciona el barrio de LOS CEDROS de tu inmueble',
  AA: 'Selecciona el barrio de USAQUEN de tu inmueble', AB: 'Selecciona el barrio del COUNTRY CLUB de tu inmueble',
  AC: 'Selecciona el barrio de SANTA BARBARA de tu inmueble',
  AX: 'Precio:', BB: 'Mérito Ejecutivo',
  BH: 'Facultades del Administrador. Este debe de:', BI: 'Facultades del Propietario. EL PROPIETARIO autoriza a EL ADMINISTRADOR para:',
  BJ: 'Garantía. LA ASEGURADORA y EL ADMINISTRADOR garantiza al PROPIETARIO:', BK: 'Obligaciones del Propietario. EL PROPIETARIO se compromete a:',
  BL: 'Vigencia.', BM: 'Terminación anticipada.', BN: 'Preavisos y responsabilidades.', BO: 'Pólizas y seguros.', BP: 'Cláusula de venta.', BQ: 'Mérito ejecutivo.',
  BX: 'Precio:', CB: 'Mérito Ejecutivo', CF: 'Precio:', CJ: 'Mérito Ejecutivo',
  CT: 'Facultades del Administrador. Este debe de:', CU: 'Facultades del Propietario. EL PROPIETARIO autoriza a EL ADMINISTRADOR para:',
  CV: 'Garantía.  LA ASEGURADORA garantiza al PROPIETARIO:', CW: 'Obligaciones del Propietario. EL PROPIETARIO se compromete a:',
  CX: 'Vigencia.', CY: 'Terminación anticipada.', CZ: 'Preavisos y responsabilidades.', DA: 'Pólizas y seguros.', DB: 'Cláusula de venta.', DC: 'Mérito ejecutivo.',
};
const indice = (l) => [...l].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
(async () => {
  const s = google.sheets({ version: 'v4', auth });
  const meta = await s.spreadsheets.get({ spreadsheetId: SHEET, fields: 'sheets.properties' });
  const sheetId = meta.data.sheets.find(x => x.properties.title === PESTANA).properties.sheetId;
  const h = (await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${PESTANA}'!1:1` })).data.values[0];
  const malas = Object.entries(OCULTAR).filter(([l, n]) => String(h[indice(l)] || '').trim() !== n);
  if (malas.length) return console.log('NO COINCIDEN, no se oculta nada:', malas);
  console.log(Object.keys(OCULTAR).length, 'columnas verificadas');
  if (!process.argv.includes('--aplicar')) return;
  const requests = Object.keys(OCULTAR).map(indice).map(i => ({ updateDimensionProperties: {
    range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { hiddenByUser: true }, fields: 'hiddenByUser' } }));
  await s.spreadsheets.batchUpdate({ spreadsheetId: SHEET, requestBody: { requests } });
  console.log('ocultas', requests.length);
})();
