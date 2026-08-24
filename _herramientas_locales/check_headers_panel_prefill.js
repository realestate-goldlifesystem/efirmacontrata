/**
 * Audita las columnas que consume el PRELLENADO del Panel de Control.
 *
 * Contexto: `Biendorado - Panel de Control/src/components/AddPropertyModal.tsx`
 * tiene la función `aplicarInmueble()` (puerto de selectProperty() del form 1.0)
 * que vuelca un inmueble del portafolio sobre el formulario cuando el agente
 * elige RENOVACIÓN o CAMBIO DE NEGOCIO. Lee el Sheet por el encabezado literal
 * de cada columna, así que si una cambia de nombre el campo queda vacío EN
 * SILENCIO — no hay error, solo un formulario a medio llenar.
 *
 * Este script es el chequeo de esa lista. Correr después de cualquier
 * renombramiento de columnas (ver renombrar_columna_global.js).
 *
 * Uso: node _herramientas_locales/check_headers_panel_prefill.js
 */
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';

// Cada entrada es EXACTAMENTE la clave que usa aplicarInmueble().
// Ojo con "Area  M²": lleva DOS espacios, así está en la hoja.
const REQUERIDAS = [
  ['Ubicación',   'Ingrese la Dirección del inmueble'],
  ['Ubicación',   'Selecciona la localidad del inmueble'],
  ['Ubicación',   'Escriba el barrio del inmueble'],
  ['Identidad',   'N° de inmueble'],
  ['Identidad',   'N° o Letra de la Torre'],
  ['Clasificación', 'Define el propósito de tu inmueble'],
  ['Clasificación', 'Selecciona el tipo de inmueble'],
  ['Detalles',    'Area  M²'],
  ['Detalles',    'N° de Habitaciones'],
  ['Detalles',    'N° de Baños'],
  ['Detalles',    '¿Cual es el estrato?'],
  ['Detalles',    'Antiguedad del Inmueble'],
  ['Detalles',    'N° de piso'],
  ['Precios',     'PRECIO DE PROMOCION GENERAL'],
  ['Precios',     'PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)'],
  ['Precios',     'PRECIO DE PROMOCION EN VENTA'],
  ['Portería',    '¿El inmueble dispone de portería y administración para realizar un acta de notificación de promoción inmobiliaria he ingreso?'],
  ['Portería',    'NOMBRE DEL INMUEBLE/ADMINISTRACION'],
  ['Portería',    '¿Desea enviar el acta notificación de gestión inmobiliaria a la administración desde este formulario también?'],
  ['Portería',    'Correo electrónico de la administración'],
  ['Negocio',     'TIPO DE NEGOCIO'],
  // Usada por resumenInmueble() para listar el portafolio del propietario
  ['Listado',     'ID DE REGISTRO'],
];

// Distancia de edición, solo para sugerir el encabezado más parecido
// cuando uno no aparece (suele ser una tilde o un espacio de más).
function distancia(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

async function run() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ1",
  });
  const headers = (res.data.values[0] || []).map(h => (h ? h.toString().trim() : ''));

  console.log(`--- PRELLENADO DEL PANEL vs. SHEET (${headers.length} columnas leídas) ---\n`);

  let faltantes = 0;
  let grupoActual = '';

  REQUERIDAS.forEach(([grupo, col]) => {
    if (grupo !== grupoActual) {
      console.log(`\n[${grupo}]`);
      grupoActual = grupo;
    }
    const idx = headers.indexOf(col);
    const corto = col.length > 62 ? col.slice(0, 59) + '...' : col;
    if (idx !== -1) {
      console.log(`  OK   col ${String(idx + 1).padStart(3)}  ${corto}`);
    } else {
      faltantes++;
      const cerca = headers
        .filter(Boolean)
        .map(h => ({ h, d: distancia(col.toLowerCase(), h.toLowerCase()) }))
        .sort((a, b) => a.d - b.d)[0];
      console.log(`  FALTA          ${corto}`);
      if (cerca && cerca.d <= Math.max(4, col.length * 0.25)) {
        console.log(`         parecido -> "${cerca.h}"  (col ${headers.indexOf(cerca.h) + 1}, dif ${cerca.d})`);
      }
    }
  });

  console.log(`\n--- ${REQUERIDAS.length - faltantes}/${REQUERIDAS.length} encontradas, ${faltantes} faltantes ---`);
  if (faltantes > 0) {
    console.log('Cada FALTA es un campo que aplicarImueble() deja vacío sin avisar.');
    process.exitCode = 1;
  }
}

run().catch(e => { console.error('Error consultando el Sheet:', e.message); process.exitCode = 1; });
