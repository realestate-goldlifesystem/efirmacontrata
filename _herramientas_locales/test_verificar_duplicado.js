/**
 * Prueba el endpoint verificarInmuebleExistente contra producción.
 * Uso: node _herramientas_locales/test_verificar_duplicado.js
 */
const EXEC = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

const CASOS = [
  { n: 'Existe exacto (dato de prueba)',        p: { direccion: 'CRA 99 #99-1 PRUEBA-QA', torre: '', apto: '901' }, espera: true },
  { n: 'Mismo pero en minúsculas + espacios',   p: { direccion: '  cra 99   #99-1 prueba-qa ', torre: '', apto: ' 901 ' }, espera: true },
  { n: 'Misma dirección, OTRO apartamento',     p: { direccion: 'CRA 99 #99-1 PRUEBA-QA', torre: '', apto: '999' }, espera: false },
  { n: 'Dirección inexistente',                 p: { direccion: 'CALLE FALSA 123 NO EXISTE', torre: '', apto: '1' }, espera: false },
  { n: 'Existe pero le inventamos una torre',   p: { direccion: 'CRA 99 #99-1 PRUEBA-QA', torre: '5', apto: '901' }, espera: false },
  { n: 'Sin apto (debe rechazar la consulta)',  p: { direccion: 'CRA 99 #99-1 PRUEBA-QA', torre: '', apto: '' }, esperaError: true }
];

(async () => {
  let fallos = 0;
  for (const c of CASOS) {
    const r = await fetch(EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ accion: 'verificarInmuebleExistente' }, c.p))
    });
    const d = await r.json();

    let ok;
    if (c.esperaError) {
      ok = d.success === false;
    } else {
      ok = d.success === true && d.existe === c.espera;
    }
    if (!ok) fallos++;

    console.log(`${ok ? '✅' : '❌'} ${c.n}`);
    console.log(`     -> ${JSON.stringify(d).slice(0, 220)}`);
    if (d.existe && d.coincidencias && d.coincidencias[0]) {
      const m = d.coincidencias[0];
      console.log(`     -> encontrado: ${m.cdr} | ${m.tipoNegocio} | ${m.propietario}`);
    }
    console.log('');
  }
  console.log(fallos === 0 ? '✅ TODAS PASARON' : `❌ ${fallos} FALLARON`);
  process.exit(fallos === 0 ? 0 : 1);
})();
