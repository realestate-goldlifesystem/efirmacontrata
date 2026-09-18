// Vuelve a registrar un inmueble a partir del respaldo JSON de su fila
// (encabezado -> valor), por la MISMA ruta que usa el formulario
// (accion 'registrarInmueble'), así pasa por todo el flujo normal:
// cola, CDR, carpetas, actas y correo.
//
// Uso:  node reenviar_registro_desde_respaldo.js <respaldo.json> "<dirección corregida>" [--enviar]
// Sin --enviar solo muestra el payload.
//
// El respaldo tiene datos personales: guardarlo FUERA del repo (es público).
const fs = require('fs');
const crypto = require('crypto');

const [, , rutaRespaldo, direccion, flag] = process.argv;
if (!rutaRespaldo || !direccion) {
  console.error('Uso: node reenviar_registro_desde_respaldo.js <respaldo.json> "<dirección>" [--enviar]');
  process.exit(1);
}
const URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

// Columnas que genera el sistema: NO se reenvían, las vuelve a crear el flujo.
const GENERADAS = [
  'CODIGO DE REGISTRO', 'ID DE REGISTRO', 'Marca temporal', 'ESTADO DEL INMUEBLE',
  'DETALLES DEL ESTADO DEL INMUEBLE', 'LINK DE CARPETA RPR', 'INMUEBLES REGISTRADOS',
  'LINK DE CARPETA REG', 'LINK CARPETA DE CONTENIDO', 'SOPORTES CONTABLES',
  'LINK CARPETA DE PROPIETARIO', 'LINK CARPETA DE INQUILINO', 'CHECK MULTIMEDIA', 'LINK VIDEO'
];

const respaldo = JSON.parse(fs.readFileSync(rutaRespaldo, 'utf8'));
const payload = {
  accion: 'registrarInmueble',
  idEnvio: crypto.randomUUID(),
  flujoSolicitado: 'normal',
  idInmuebleOriginal: '',
  cdrInmuebleOriginal: '',
  reutilizarMultimedia: 'SI' // mismo valor por defecto que el formulario
};
for (const [col, valor] of Object.entries(respaldo)) {
  if (GENERADAS.includes(col.trim()) || col.startsWith('Merged Doc')) continue;
  payload[col] = valor;
}
payload['Ingrese la Dirección del inmueble'] = direccion;
// El formulario manda la fecha como AAAA-MM-DD (en el respaldo viene como serial de Sheets).
const f = respaldo['Fecha de registro del inmueble.'];
if (typeof f === 'number') {
  const d = new Date(Math.round((f - 25569) * 86400 * 1000));
  payload['Fecha de registro del inmueble.'] = d.toISOString().slice(0, 10);
}

console.log(`Campos: ${Object.keys(payload).length}`);
console.log(`Dirección: ${payload['Ingrese la Dirección del inmueble']}  |  Fecha: ${payload['Fecha de registro del inmueble.']}  |  Negocio: ${payload['TIPO DE NEGOCIO']}`);

if (flag !== '--enviar') {
  console.log('(simulación: agrega --enviar para registrar de verdad)');
  process.exit(0);
}

(async () => {
  const r = await fetch(URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  console.log(await r.text());
})();
