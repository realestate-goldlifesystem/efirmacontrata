// Elimina columnas de "1.1 - INMUEBLES REGISTRADOS" ya revisadas con Leonardo
// (monitoreo_columnas_inmuebles.js). Cada columna se identifica por letra Y nombre:
// si alguna no coincide, no borra nada. Antes guarda la pestaña completa (JSON y CSV)
// en la carpeta indicada, que debe estar FUERA del repo (tiene datos personales).
// Uso: node eliminar_columnas_inmuebles.js <carpeta respaldo> [--aplicar]
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const PESTANA = '1.1 - INMUEBLES REGISTRADOS';

// 16-oct-2026. A: barrios del formulario viejo (ya vacíos, el barrio vive en
// "Escriba el barrio del inmueble"). C: cláusulas que llenaba Autocrat y ya no se
// usan. D: salidas viejas de Autocrat que nada lee (los "Link to merged Doc" se quedan).
const BORRAR = {
  // A y C (U a DC) son columnas del Google Form viejo vinculado: Google no deja
  // borrarlas mientras la pestaña esté vinculada al formulario. Solo D por ahora.
  /* U: 'Selecciona el barrio de PASEO DE LOS LIBERTADORES de tu inmueble',
  V: 'Selecciona el barrio de VERBENAL de tu inmueble',
  W: 'Selecciona el barrio de LA URIBE de tu inmueble',
  X: 'Selecciona el barrio de SAN CRISTOBAL NORTE tu inmueble',
  Y: 'Selecciona el barrio de TOBERIN de tu inmueble',
  Z: 'Selecciona el barrio de LOS CEDROS de tu inmueble',
  AA: 'Selecciona el barrio de USAQUEN de tu inmueble',
  AB: 'Selecciona el barrio del COUNTRY CLUB de tu inmueble',
  AC: 'Selecciona el barrio de SANTA BARBARA de tu inmueble',
  AX: 'Precio:', BB: 'Mérito Ejecutivo',
  BH: 'Facultades del Administrador. Este debe de:',
  BI: 'Facultades del Propietario. EL PROPIETARIO autoriza a EL ADMINISTRADOR para:',
  BJ: 'Garantía. LA ASEGURADORA y EL ADMINISTRADOR garantiza al PROPIETARIO:',
  BK: 'Obligaciones del Propietario. EL PROPIETARIO se compromete a:',
  BL: 'Vigencia.', BM: 'Terminación anticipada.', BN: 'Preavisos y responsabilidades.',
  BO: 'Pólizas y seguros.', BP: 'Cláusula de venta.', BQ: 'Mérito ejecutivo.',
  BX: 'Precio:', CB: 'Mérito Ejecutivo', CF: 'Precio:', CJ: 'Mérito Ejecutivo',
  CT: 'Facultades del Administrador. Este debe de:',
  CU: 'Facultades del Propietario. EL PROPIETARIO autoriza a EL ADMINISTRADOR para:',
  CV: 'Garantía.  LA ASEGURADORA garantiza al PROPIETARIO:',
  CW: 'Obligaciones del Propietario. EL PROPIETARIO se compromete a:',
  CX: 'Vigencia.', CY: 'Terminación anticipada.', CZ: 'Preavisos y responsabilidades.',
  DA: 'Pólizas y seguros.', DB: 'Cláusula de venta.', DC: 'Mérito ejecutivo.',
  */
  HP: 'Merged Doc URL - CORRETAJE', HQ: 'Document Merge Status - CORRETAJE',
  HT: 'Merged Doc URL - ADMINISTRACIÓN', HU: 'Document Merge Status - ADMINISTRACIÓN',
  HX: 'Merged Doc URL - VENTA', HY: 'Document Merge Status - VENTA',
  IB: 'Merged Doc URL - VENDI-RENTA', IC: 'Document Merge Status - VENDI-RENTA',
  IF: 'Merged Doc URL - ADMI-VENTA', IG: 'Document Merge Status - ADMI-VENTA',
  IJ: 'Merged Doc URL - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
  IK: 'Document Merge Status - AUTORIZACIÓN DE INGRESO AL INMUEBLE',
};
const indice = (l) => [...l].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
const csv = (filas) => filas.map(f => f.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');

(async () => {
  const [carpeta, ap] = process.argv.slice(2);
  const s = google.sheets({ version: 'v4', auth });
  const meta = await s.spreadsheets.get({ spreadsheetId: SHEET, fields: 'sheets.properties' });
  const sheetId = meta.data.sheets.find(x => x.properties.title === PESTANA).properties.sheetId;
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${PESTANA}'!A1:ZZ`, valueRenderOption: 'FORMULA' });
  const h = r.data.values[0];
  const malas = Object.entries(BORRAR).filter(([l, n]) => String(h[indice(l)] || '').trim() !== n);
  if (malas.length) { console.log('NO COINCIDEN, no se borra nada:', malas.map(([l, n]) => `${l}="${h[indice(l)]}" esperado "${n}"`)); return; }
  console.log(Object.keys(BORRAR).length, 'columnas verificadas por letra y nombre');
  if (ap !== '--aplicar') return;

  fs.mkdirSync(carpeta, { recursive: true });
  const base = path.join(carpeta, 'INMUEBLES REGISTRADOS antes de borrar columnas ' + new Date().toISOString().slice(0, 10));
  fs.writeFileSync(base + '.json', JSON.stringify(r.data.values));
  fs.writeFileSync(base + '.csv', '﻿' + csv(r.data.values));
  const cols = Object.keys(BORRAR).map(indice);
  fs.writeFileSync(base + ' - solo columnas borradas.csv', '﻿' + csv(r.data.values.map(f => cols.map(i => f[i] ?? ''))));
  console.log('respaldo:', base + '.json / .csv');

  const requests = cols.sort((a, b) => b - a)
    .map(i => ({ deleteDimension: { range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 } } }));
  await s.spreadsheets.batchUpdate({ spreadsheetId: SHEET, requestBody: { requests } });
  console.log('eliminadas', requests.length);
})();
