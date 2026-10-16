// Renovación de un inmueble REAL armada desde su fila, igual que la envía el
// formulario (RegisterPropertyForm.tsx, flujo renovación): todo sale de la fila y
// solo se cambia lo que se pasa por parámetro. ENVÍA CORREO REAL al propietario
// (y a la administración si la fila lo tiene activado): usar solo con su visto bueno.
// Uso: node renovar_desde_fila.js <ID> <precio total con admin> <precio en letra> <porteria|copia|acompanamiento> [--enviar]
// Sin --enviar solo muestra lo que se mandaría.
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
const AUT = {
  porteria: ['El cual recoge las llaves en portería y después de la visita las deja nuevamente allí',
             'Siendo el nuevo ADMINISTRADOR, el cual recoge las llaves en portería y después de la visita las deja nuevamente allí'],
  copia: ['Disponiendo de copia de las llaves', 'Siendo el nuevo ADMINISTRADOR, disponiendo de copia de las llaves'],
  acompanamiento: ['Con acompañamiento de mi parte en las visitas de interesados',
                   'Siendo el nuevo ADMINISTRADOR, Con acompañamiento de mi parte en las visitas de interesados']
};

(async () => {
  const [id, precio, letra, aut, enviar] = process.argv.slice(2);
  const s = google.sheets({ version: 'v4', auth });
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
  const [h, ...filas] = r.data.values;
  const fila = filas.find(f => f[h.indexOf('ID DE REGISTRO')] === id);
  if (!fila) throw new Error('No está ' + id);
  const v = (k) => { const i = h.findIndex(x => x.trim() === k.trim()); return i >= 0 ? (fila[i] || '') : ''; };

  // Mismas claves que manda el formulario + las zonas ([...] y ¿...?) de la fila
  const claves = JSON.parse(fs.readFileSync(path.join(__dirname, 'claves_formulario_registro.json'), 'utf8'));
  const p = {};
  claves.forEach(k => { p[k] = v(k); });
  h.forEach((k, i) => { const t = k.trim(); if (/^\[|^¿/.test(t) && !(t in p)) p[t] = fila[i] || ''; });

  const negocio = v('TIPO DE NEGOCIO');
  const esAdmin = /Administraci|Admi-Venta/.test(negocio);
  const num = (x) => String(x).replace(/[^0-9]/g, '');
  Object.assign(p, {
    accion: 'registrarInmueble',
    idEnvio: 'renov-' + id + '-' + Date.now(),
    reutilizarMultimedia: 'SI',            // conserva fotos y video del inmueble
    flujoSolicitado: 'renovacion',
    idInmuebleOriginal: id,
    cdrInmuebleOriginal: v('CODIGO DE REGISTRO'),
    'Fecha de registro del inmueble.': new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
    'PRECIO DE PROMOCION GENERAL': Number(num(precio)),
    'PRECIO DE PROMOCION GENERAL EN LETRA': letra.toUpperCase(),
    'PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)': Number(num(v('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)'))) || '',
    '¿Qué tipo de autorización desea con el agente?': esAdmin ? '' : AUT[aut][0],
    '¿Qué tipo de autorización desea con el agente para administración?': esAdmin ? AUT[aut][1] : '',
  });

  ['NOMBRES Y APELLIDOS DEL PROPIETARIO', 'Correo electrónico', 'TIPO DE NEGOCIO', 'PRECIO DE PROMOCION GENERAL',
   'PRECIO DE PROMOCION GENERAL EN LETRA', 'PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)',
   'PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO', '¿Qué tipo de autorización desea con el agente?',
   'Correo electrónico de la administración', 'Escriba el barrio del inmueble', 'N° de Garajes', 'MEDIDAS DEL ESPACIO DE LA NEVERA',
   'cdrInmuebleOriginal', 'Fecha de registro del inmueble.']
    .forEach(k => console.log(k.padEnd(45).slice(0, 45), '|', p[k]));
  console.log('zonas con valor:', Object.keys(p).filter(k => /^\[/.test(k) && p[k]).length, '| claves:', Object.keys(p).length);

  if (enviar !== '--enviar') return console.log('\n(solo revisión: no se envió nada)');
  const r1 = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p), redirect: 'manual' });
  console.log(await (await fetch(r1.headers.get('location'))).text());
})();
