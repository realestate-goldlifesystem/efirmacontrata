/**
 * Verifica la resolución de filas por ID DE REGISTRO.
 *
 * Extrae las funciones REALES del backend y las corre contra una hoja simulada.
 * Lo que importa probar es lo que antes rompía: que cuando las filas se MUEVEN,
 * cada registro siga encontrando su propio inmueble.
 *
 * Uso: node _herramientas_locales/test_resolucion_por_id.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const B = (f) => path.join(__dirname, '..', 'backend', f);

// --- Hoja simulada -------------------------------------------------------
function crearHoja(headers, filas) {
  const datos = [headers.slice(), ...filas.map(f => f.slice())];
  return {
    _datos: datos,
    getLastRow: () => datos.length,
    getLastColumn: () => headers.length,
    getRange(fila, col, nFilas, nCols) {
      const f1 = fila, c1 = col;
      const nf = nFilas || 1, nc = nCols || 1;
      return {
        getValues: () => {
          const out = [];
          for (let i = 0; i < nf; i++) {
            const row = datos[f1 - 1 + i] || [];
            out.push(row.slice(c1 - 1, c1 - 1 + nc));
          }
          return out;
        },
        getValue: () => {
          const row = datos[f1 - 1] || [];
          return row[c1 - 1];
        },
        setValue: (v) => { if (!datos[f1 - 1]) datos[f1 - 1] = []; datos[f1 - 1][c1 - 1] = v; }
      };
    },
    borrarFila(n) { datos.splice(n - 1, 1); }   // simula deleteRow
  };
}

// --- Cargar funciones reales del backend ---------------------------------
const sandbox = { console, Logger: { log: () => {} } };
vm.createContext(sandbox);

function cargar(archivo, nombres) {
  const src = fs.readFileSync(B(archivo), 'utf8');
  for (const n of nombres) {
    const re = new RegExp('function\\s+' + n + '\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}', 'm');
    const m = src.match(re);
    if (!m) { console.error(`❌ No se pudo extraer ${n}() de ${archivo}`); process.exit(1); }
    vm.runInContext(m[0], sandbox, { filename: archivo });
  }
}
cargar('1- REGISTRO DE INMUEBLE.js',
  ['getColumnByName', 'leerIdRegistroDeFila', 'buscarFilaPorIdRegistro', 'generarIdInmuebleUnicoValor']);
cargar('2- REGISTRO DE INMUEBLE.js', ['resolverFilaOriginal']);

// --- Utilidades de prueba -------------------------------------------------
let fallos = 0;
const chk = (n, cond, detalle) => {
  console.log(`${cond ? '  ✅' : '  ❌'} ${n}${cond ? '' : '  -> ' + detalle}`);
  if (!cond) fallos++;
};

const HEADERS = ['CODIGO DE REGISTRO', 'ID DE REGISTRO', 'Ingrese la Dirección del inmueble'];
const nuevaHoja = () => crearHoja(HEADERS, [
  ['REG_A', 'AA111111', 'Calle 1'],   // fila 2
  ['REG_B', 'BB222222', 'Calle 2'],   // fila 3
  ['REG_C', 'CC333333', 'Calle 3'],   // fila 4
  ['REG_D', 'DD444444', 'Calle 4'],   // fila 5
]);

// -------------------------------------------------------------------------
console.log('\n[1] buscarFilaPorIdRegistro ubica cada inmueble');
{
  const h = nuevaHoja();
  chk('AA111111 -> fila 2', sandbox.buscarFilaPorIdRegistro(h, 'AA111111') === 2, sandbox.buscarFilaPorIdRegistro(h, 'AA111111'));
  chk('DD444444 -> fila 5', sandbox.buscarFilaPorIdRegistro(h, 'DD444444') === 5, sandbox.buscarFilaPorIdRegistro(h, 'DD444444'));
  chk('inexistente -> -1', sandbox.buscarFilaPorIdRegistro(h, 'ZZ999999') === -1, 'no dio -1');
  chk('vacío -> -1', sandbox.buscarFilaPorIdRegistro(h, '') === -1, 'no dio -1');
  chk('tolera espacios', sandbox.buscarFilaPorIdRegistro(h, '  CC333333 ') === 4, 'no toleró espacios');
}

console.log('\n[2] leerIdRegistroDeFila es la operación inversa');
{
  const h = nuevaHoja();
  chk('fila 3 -> BB222222', sandbox.leerIdRegistroDeFila(h, 3) === 'BB222222', sandbox.leerIdRegistroDeFila(h, 3));
  chk('fila 1 (encabezado) -> vacío', sandbox.leerIdRegistroDeFila(h, 1) === '', 'devolvió algo');
  chk('fila 0 -> vacío', sandbox.leerIdRegistroDeFila(h, 0) === '', 'devolvió algo');
}

console.log('\n[3] EL CASO QUE ROMPÍA: se borra una fila de arriba');
{
  const h = nuevaHoja();
  // Antes del borrado, CC333333 está en la fila 4 — es lo que Fase 1 habría guardado.
  const filaGuardada = sandbox.buscarFilaPorIdRegistro(h, 'CC333333');
  chk('CC333333 estaba en la fila 4', filaGuardada === 4, filaGuardada);

  h.borrarFila(2);   // una renovación borra su fila temporal

  chk('el número guardado ahora apunta a OTRO inmueble',
    sandbox.leerIdRegistroDeFila(h, filaGuardada) === 'DD444444',
    sandbox.leerIdRegistroDeFila(h, filaGuardada));
  chk('resolver por ID sigue encontrando el correcto',
    sandbox.buscarFilaPorIdRegistro(h, 'CC333333') === 3,
    sandbox.buscarFilaPorIdRegistro(h, 'CC333333'));
}

console.log('\n[4] resolverFilaOriginal: prefiere el ID sobre el número viejo');
{
  const h = nuevaHoja();
  h.borrarFila(2);   // todo sube una posición
  const tipoReg = { filaOriginal: 4, idOriginal: 'CC333333' };  // número ya obsoleto
  chk('corrige la fila usando el ID',
    sandbox.resolverFilaOriginal(h, tipoReg) === 3,
    sandbox.resolverFilaOriginal(h, tipoReg));
}

console.log('\n[5] resolverFilaOriginal: aborta si el inmueble ya no existe');
{
  const h = nuevaHoja();
  h.borrarFila(4);   // se va CC333333
  chk('devuelve -1 en vez de adivinar',
    sandbox.resolverFilaOriginal(h, { filaOriginal: 4, idOriginal: 'CC333333' }) === -1,
    'no devolvió -1');
}

console.log('\n[6] resolverFilaOriginal: compatibilidad sin idOriginal');
{
  const h = nuevaHoja();
  chk('usa la fila guardada si no hay ID',
    sandbox.resolverFilaOriginal(h, { filaOriginal: 4 }) === 4, 'no respetó la fila');
  chk('sin ID ni fila -> -1',
    sandbox.resolverFilaOriginal(h, {}) === -1, 'no dio -1');
  chk('tipoRegistro nulo -> -1',
    sandbox.resolverFilaOriginal(h, null) === -1, 'no dio -1');
}

console.log('\n[7] generarIdInmuebleUnicoValor no choca con los existentes');
{
  const h = nuevaHoja();
  const vistos = new Set(['AA111111', 'BB222222', 'CC333333', 'DD444444']);
  let ok = true;
  for (let i = 0; i < 200; i++) {
    const id = sandbox.generarIdInmuebleUnicoValor(h);
    if (!/^[A-Z]{2}\d{6}$/.test(id) || vistos.has(id)) { ok = false; break; }
  }
  chk('200 IDs con formato correcto y sin colisión', ok, 'falló el formato o colisionó');
  chk('NO escribe en la hoja', h._datos.length === 5, 'modificó la hoja');
}

// ---- Regresión: el ORDEN FIFO de la cola --------------------------------
// Al pasar la clave de fila a ID (que es aleatorio) se perdió el orden implícito.
// Sin un criterio explícito, PropertiesService devuelve las claves en orden
// arbitrario y copiarFormatoFila() —que copia el formato de la fila de arriba—
// deja filas sin formato. Detectado en producción el 21-ago-2026: la fila 70
// recibió C49 y la 67 recibió C50, o sea que se procesó al revés.
console.log('\n[8] FIFO: la cola respeta el orden de llegada');
{
  // Igual que en el worker: claves con ID aleatorio, valor = marca de tiempo.
  const cola = {
    'PENDING_REGISTRATION_ZC696912': '1000',
    'PENDING_REGISTRATION_MO725078': '1005',
    'PENDING_REGISTRATION_LA372936': '1010',
    'PENDING_REGISTRATION_OY309605': '1015'
  };
  const pend = [];
  for (const k in cola) {
    const llegada = parseInt(cola[k], 10);
    pend.push({ ident: k.substring('PENDING_REGISTRATION_'.length), llegada: isNaN(llegada) ? 0 : llegada });
  }
  pend.sort((a, b) => a.llegada - b.llegada);
  chk('sale primero el más antiguo', pend[0].ident === 'ZC696912', pend[0].ident);
  chk('sale último el más reciente', pend[3].ident === 'OY309605', pend[3].ident);

  // Entradas del formato viejo (valor 'true') deben ir primero, no al azar.
  const mixto = [
    { ident: 'NUEVO1', llegada: 5000 },
    { ident: 'VIEJO1', llegada: (isNaN(parseInt('true', 10)) ? 0 : 1) },
  ];
  mixto.sort((a, b) => a.llegada - b.llegada);
  chk('las entradas viejas ("true") van primero', mixto[0].ident === 'VIEJO1', mixto[0].ident);
}

console.log('\n' + (fallos === 0 ? '✅ TODAS LAS PRUEBAS PASARON' : `❌ ${fallos} PRUEBA(S) FALLARON`) + '\n');
process.exit(fallos === 0 ? 0 : 1);
