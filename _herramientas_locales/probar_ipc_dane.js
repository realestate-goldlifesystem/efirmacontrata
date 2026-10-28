// Prueba el IPC automático del DANE (IPC_DANE.js + sincroIPC) con el inmueble de prueba, sin correos.
// Requiere un case TEMP_ipcDane en el doPost (se quitó tras la prueba del 28-oct-2026; ver git).
// "leer" solo lee el anexo; sin él simula enero: ajuste esperando ese IPC → sincroIPC → propietario. Todo se restaura.
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
(async () => {
  const r1 = await fetch(API, { method: 'POST', body: JSON.stringify({ accion: 'TEMP_ipcDane', anio: process.argv[2], que: process.argv[3] || 'simular' }), redirect: 'manual' });
  console.log(JSON.stringify(JSON.parse(await (await fetch(r1.headers.get('location'))).text()), null, 1));
})();
