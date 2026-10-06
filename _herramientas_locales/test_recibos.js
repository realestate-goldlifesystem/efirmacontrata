// Prueba local de backend/OCR_RECIBOS.js: lectura de recibos de servicios página
// por página, para el caso en que el propietario sube UN solo PDF con agua, luz y
// gas en las tres casillas.
//
// Los textos son INVENTADOS (números falsos) pero copian la forma en que Vision
// entrega un recibo real de Vanti, Enel y Acueducto de Bogotá.
// Con un caso real:  node ocr_recibos_local.js <ID> <carpeta fuera del repo>
//                    node test_recibos.js <ese .txt>
//
// Uso: node test_recibos.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/OCR_RECIBOS.js'), 'utf8'), ctx);

if (process.argv[2]) {       // modo "ver un archivo real" (no imprime los números)
  const pags = fs.readFileSync(process.argv[2], 'utf8').split(/\n=====PAGINA \d+=====\n/).slice(1);
  ['AGUA', 'LUZ', 'GAS', 'INTERNET', ''].forEach(t => {
    const r = ctx.recAnalizar(pags, t);
    console.log((t || '(sin casilla)').padEnd(14), `→ pág ${r.pagina}/${r.totalPaginas} | ${r.tipo || '?'} | ${r.empresa} | referencia de ${String(r.referenciaPago).length} caracteres (${r.origenReferencia || 'sin hallar'}) | combinado ${r.combinado} | noCorresponde ${r.noCorresponde}`);
  });
  process.exit(0);
}

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}

const GAS = `Entidad vigilada por la Superintendencia de Servicios Públicos Domiciliarios. VANTI SA
ESP NIT. 800.000.000-5
Factura de gas
Cuenta o referencia de pago
Septiembre 2026
11223344
BOGOTA
Pago
oportuno
05 Oct. 2026
CONSUMO GAS
1- Total
$16.610,00`;

const LUZ = `enel Bogotá
ENEL COLOMBIA SA ESP
KR 1 NO 2 - 3 TO 1 AP 101
DOCUMENTO EQUIVALENTE ELECTRÓNICO No. 400000000-1
Para pagos y consultas
tu número de cliente es: 7654321-0
No. Medidor: 12345
Clase de servicio: Residencial
Operador Claro
Valor a pagar
$83.510
Consumo
del periodo
49 kWh`;

const AGUA = `DOMICILIARIOS NRO. ÚNICO DE REGISTRO EAB-ESP
Tu consumo en este período
Acueducto Alcantarillado
Total a pagar
$62.930
Acueducto y Alcantarillado
FACTURA DEL SERVICIO PUBLICO No.
Valor a pagar
(415)7700000000001(8020)998877665544(3900)000000062930`;

// --- Reconocer cada página ---
igual('página de gas', ctx.recClasificarPagina(GAS), 'GAS');
igual('página de luz', ctx.recClasificarPagina(LUZ), 'LUZ');
igual('página de agua', ctx.recClasificarPagina(AGUA), 'AGUA');
igual('una foto cualquiera → no se reconoce', ctx.recClasificarPagina('hola esto es un panel de madera'), '');
igual('"PANEL" no cuenta como ENEL', ctx.recTienePalabra('UN PANEL SOLAR', 'ENEL'), false);
igual('"ENEL" suelto sí', ctx.recTienePalabra('PAGUE EN ENEL.', 'ENEL'), true);
igual('vacío o nulo no rompe', [ctx.recClasificarPagina(''), ctx.recClasificarPagina(null)], ['', '']);

// --- La casilla sale del nombre del archivo ---
igual('FACTURA_AGUA_[REG…]', ctx.recTipoDeNombre('FACTURA_AGUA_[REG_21-09-2026-C49].pdf'), 'AGUA');
igual('FACTURALUZ pegado', ctx.recTipoDeNombre('facturaLuz_algo.pdf'), 'LUZ');
igual('otro documento', ctx.recTipoDeNombre('CERT_TRADICION_[REG].pdf'), '');

// --- EL CASO: un solo PDF con los tres, subido en las tres casillas ---
const TRES = [GAS, LUZ, AGUA];
let r = ctx.recAnalizar(TRES, 'GAS');
igual('casilla GAS → página 1, referencia del gas', [r.pagina, r.tipo, r.empresa, r.referenciaPago, r.combinado], [1, 'GAS', 'Gas (Vanti)', '11223344', true]);
r = ctx.recAnalizar(TRES, 'LUZ');
igual('casilla LUZ → página 2, número de cliente de Enel', [r.pagina, r.tipo, r.empresa, r.referenciaPago], [2, 'LUZ', 'Energía (Enel)', '7654321-0']);
r = ctx.recAnalizar(TRES, 'AGUA');
igual('casilla AGUA → página 3, referencia del código de barras', [r.pagina, r.tipo, r.empresa, r.referenciaPago, r.origenReferencia], [3, 'AGUA', 'Acueducto (EAAB)', '998877665544', 'codigo_barras']);
igual('avisa cuáles son las otras páginas', r.otros.map(o => o.tipo + o.pagina), ['GAS1', 'LUZ2']);
igual('el orden de las páginas no importa', ctx.recAnalizar([AGUA, GAS, LUZ], 'LUZ').pagina, 3);
igual('minúsculas en la casilla', ctx.recAnalizar(TRES, 'agua').pagina, 3);

// --- Casilla que no está en el archivo: NO se guarda el número de otro servicio ---
r = ctx.recAnalizar(TRES, 'INTERNET');
igual('casilla INTERNET sin recibo de internet → avisa y no devuelve referencia', [r.noCorresponde, r.referenciaPago, r.pagina], [true, 'No detectada', 0]);
igual('...y dice qué trae el archivo', r.otros.map(o => o.tipo), ['GAS', 'LUZ', 'AGUA']);
r = ctx.recAnalizar([LUZ], 'AGUA');
igual('subió la luz en la casilla del agua → avisa', [r.noCorresponde, r.referenciaPago], [true, 'No detectada']);

// --- Lo de siempre: un recibo por casilla ---
r = ctx.recAnalizar([LUZ], 'LUZ');
igual('un solo recibo → no es combinado', [r.pagina, r.totalPaginas, r.combinado, r.noCorresponde, r.referenciaPago], [1, 1, false, false, '7654321-0']);
r = ctx.recAnalizar([LUZ, 'publicidad de enel sin numeros kWh'], 'LUZ');
igual('recibo de 2 hojas del mismo servicio → no es combinado, toma la que trae el número', [r.pagina, r.combinado], [1, false]);
r = ctx.recAnalizar([GAS], '');
igual('sin casilla → lee la primera', [r.tipo, r.referenciaPago, r.noCorresponde], ['GAS', '11223344', false]);
r = ctx.recAnalizar(['texto ilegible'], 'AGUA');
igual('no se reconoce nada → sin referencia y sin acusar de "no corresponde"', [r.referenciaPago, r.noCorresponde, r.tipo], ['No detectada', false, '']);
igual('sin páginas no rompe', ctx.recAnalizar([], 'AGUA').referenciaPago, 'No detectada');
igual('agua con "cuenta contrato" escrita → manda sobre el código de barras',
  ctx.recReferencia('ACUEDUCTO\nCuenta contrato\n12345678\n(8020)999999999999', 'AGUA'), { referencia: '12345678', origen: 'etiqueta' });

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
