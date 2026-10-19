// Prueba de punta a punta del registro de inmuebles: nuevo, renovación y cambio de
// modelo de negocio, enviando EXACTAMENTE lo que manda el formulario del portafolio
// (RegisterPropertyForm.tsx) a la acción registrarInmueble.
//
// Toma como molde las respuestas de un inmueble existente (solo características del
// inmueble) y pone un propietario y una dirección DE PRUEBA. Todos los correos
// (propietario y administración) van al correo del sistema.
//
// Uso:
//   node prueba_registro.js nuevo <molde ID> <Negocio> <autorizacion>
//   node prueba_registro.js renovar <ID prueba> <autorizacion> [canon]
//   node prueba_registro.js cambiar <ID prueba> <Negocio nuevo> <autorizacion>
//   node prueba_registro.js ver <ID prueba>
// Negocio: Corretaje | Administración | Venta | Vendi-Renta | Admi-Venta
// autorizacion: porteria | copia | acompanamiento
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const SHEET = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
const CORREO_SISTEMA = 'realestate.goldlifesystem@gmail.com';
const PROPIETARIO = { nombre: 'PRUEBA SISTEMA GOLD LIFE', cedula: '1000000777', celular: '3000000777' };
const DIRECCION = 'Calle 1 # 1-77 PRUEBA SISTEMA';

const AUT = {
  porteria: ['El cual recoge las llaves en portería y después de la visita las deja nuevamente allí',
             'Siendo el nuevo ADMINISTRADOR, el cual recoge las llaves en portería y después de la visita las deja nuevamente allí'],
  copia: ['Disponiendo de copia de las llaves', 'Siendo el nuevo ADMINISTRADOR, disponiendo de copia de las llaves'],
  acompanamiento: ['Con acompañamiento de mi parte en las visitas de interesados',
                   'Siendo el nuevo ADMINISTRADOR, Con acompañamiento de mi parte en las visitas de interesados']
};
const esAdmin = (n) => n === 'Administración' || n === 'Admi-Venta';

const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

async function leerHoja() {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
  const [h, ...filas] = r.data.values;
  return { h, filas, fila: (id) => filas.find(f => f[h.indexOf('ID DE REGISTRO')] === id) };
}

async function post(cuerpo) {
  // Apps Script responde con una redirección: hay que seguirla con GET
  const r1 = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), redirect: 'manual' });
  const url = r1.headers.get('location');
  const r2 = url ? await fetch(url) : r1;
  return r2.text();
}

function payloadDesde(h, fila, cambios) {
  const claves = JSON.parse(fs.readFileSync(path.join(__dirname, 'claves_formulario_registro.json'), 'utf8'));
  const p = {};
  claves.forEach(k => { const i = h.indexOf(k); p[k] = i >= 0 ? (fila[i] || '') : ''; });
  return Object.assign(p, cambios);
}

function datosPropietario(negocio, aut, precio) {
  return {
    'NOMBRES Y APELLIDOS DEL PROPIETARIO': PROPIETARIO.nombre,
    'TIPO DOCUMENTO PROPIETARIO': 'Cédula de ciudadanía',
    'Número de documento': PROPIETARIO.cedula,
    'Pais del celular': '+57',
    'Celular': PROPIETARIO.celular,
    'Correo electrónico': CORREO_SISTEMA,
    'Ingrese la Dirección del inmueble': DIRECCION,
    'TIPO DE NEGOCIO': negocio,
    'Fecha de registro del inmueble.': new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
    '¿El inmueble dispone de portería y administración para realizar un acta de notificación de promoción inmobiliaria he ingreso?': 'SI',
    'NOMBRE DEL INMUEBLE/ADMINISTRACION': 'CONJUNTO DE PRUEBA SISTEMA',
    '¿Desea enviar el acta notificación de gestión inmobiliaria a la administración desde este formulario también?': 'SI',
    'Correo electrónico de la administración': CORREO_SISTEMA,
    '¿Qué tipo de autorización desea con el agente para administración?': esAdmin(negocio) ? AUT[aut][1] : '',
    '¿Qué tipo de autorización desea con el agente?': esAdmin(negocio) ? '' : AUT[aut][0],
    ...(precio ? { 'PRECIO DE PROMOCION GENERAL': String(precio) } : {})
  };
}

(async () => {
  const [modo, a1, a2, a3] = process.argv.slice(2);
  const { h, fila } = await leerHoja();
  const col = (n) => h.indexOf(n);

  if (modo === 'ver') {
    const f = fila(a1);
    if (!f) { console.log('No está', a1); return; }
    ['ID DE REGISTRO', 'CODIGO DE REGISTRO', 'TIPO DE NEGOCIO', 'ESTADO DEL INMUEBLE', 'DETALLES DEL ESTADO DEL INMUEBLE',
     'PRECIO DE PROMOCION GENERAL', '¿Qué tipo de autorización desea con el agente?', '¿Qué tipo de autorización desea con el agente para administración?',
     'Merged Doc ID - CORRETAJE', 'Merged Doc ID - ADMINISTRACIÓN', 'Merged Doc ID - VENTA',
     'Merged Doc ID - VENDI-RENTA', 'Merged Doc ID - ADMI-VENTA', 'Merged Doc ID - AUTORIZACIÓN DE INGRESO AL INMUEBLE', 'LINK DE CARPETA REG']
      .forEach(n => console.log((n.split(' - ').pop() + '                                        ').slice(0, 42), '|', String(f[col(n)] || '').slice(0, 90)));
    return;
  }

  let cuerpo;
  if (modo === 'nuevo') {
    const molde = fila(a1);
    cuerpo = payloadDesde(h, molde, datosPropietario(a2, a3));
    cuerpo.flujoSolicitado = 'normal';
  } else {
    const prueba = fila(a1);
    if (!prueba) { console.log('No está el inmueble de prueba', a1); return; }
    const negocio = modo === 'renovar' ? prueba[col('TIPO DE NEGOCIO')] : a2;
    const aut = modo === 'renovar' ? a2 : a3;
    cuerpo = payloadDesde(h, prueba, datosPropietario(negocio, aut, modo === 'renovar' ? a3 : ''));
    cuerpo.flujoSolicitado = modo === 'renovar' ? 'renovacion' : 'cambio_negocio';
    cuerpo.idInmuebleOriginal = a1;
    cuerpo.cdrInmuebleOriginal = prueba[col('CODIGO DE REGISTRO')] || '';
  }
  cuerpo.accion = 'registrarInmueble';
  cuerpo.idEnvio = 'prueba-' + Date.now();
  cuerpo.reutilizarMultimedia = 'SI';
  // Campos extra para una prueba puntual: EXTRA='{"columna":"valor"}'
  if (process.env.EXTRA) Object.assign(cuerpo, JSON.parse(process.env.EXTRA));
  console.log(modo, '→', cuerpo['TIPO DE NEGOCIO'], '| flujo', cuerpo.flujoSolicitado, '| aut', (cuerpo['¿Qué tipo de autorización desea con el agente?'] || cuerpo['¿Qué tipo de autorización desea con el agente para administración?']).slice(0, 50));
  console.log(await post(cuerpo));
})();
