// Prueba local de la lista de bancos:
//   - frontend/js/bancos.js: qué entidades del servidor se SUMAN a la lista fija
//     del formulario del propietario (sin duplicar las que ya están con otro nombre);
//   - backend/GESTOR_BANCOS.js: leer la respuesta de Mercado Pago, validar la copia
//     guardada y decidir cuándo toca refrescar.
//
// Uso: node test_bancos.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const front = {};
front.globalThis = front;
vm.createContext(front);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/js/bancos.js'), 'utf8'), front);

const back = {};
vm.createContext(back);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/GESTOR_BANCOS.js'), 'utf8') +
  '\nthis.DIAS = BANCOS_DIAS_VIGENCIA; this.HORAS = BANCOS_HORAS_ENTRE_REINTENTOS;', back);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}

// La lista fija del formulario, leída del propio HTML (texto y valor de cada opción)
const html = fs.readFileSync(path.join(__dirname, '../frontend/formulario-propietario.html'), 'utf8');
const sel = html.slice(html.indexOf('<select id="banco"'), html.indexOf('</select>', html.indexOf('<select id="banco"')));
const base = [];
sel.replace(/<option value="([^"]+)">([^<]+)<\/option>/g, (_, v, t) => { base.push(t, v); });
igual('la lista fija se pudo leer del formulario', base.length >= 40, true);

const misma = front.efcMismaEntidadBancaria;
const agregar = (nuevos) => front.efcBancosPorAgregar(base, nuevos);

// --- Mismo banco escrito distinto: NO se duplica ---
[['Bancolombia', 'BANCOLOMBIA'], ['Banco Davivienda', 'BANCO DAVIVIENDA'], ['Banco de Bogotá', 'BANCO DE BOGOTA'],
 ['BBVA Colombia', 'BBVA'], ['Banco AV Villas', 'AV VILLAS'], ['Itaú', 'BANCO ITAU'], ['Banco Falabella', 'BANCO FALABELLA S.A.'],
 ['Banco Finandina', 'FINANDINA'], ['Bancoomeva', 'BANCOOMEVA S.A.'], ['Lulo Bank', 'LULO BANK S.A.']].forEach(([a, b]) =>
  igual(`"${a}" = "${b}"`, misma(a, b), true));

// --- Bancos distintos que se parecen: NO se confunden ---
[['Davivienda', 'Daviplata'], ['Bancolombia', 'Bancoomeva'], ['Banco Popular', 'Banco Pichincha'], ['Nu', 'Nequi'],
 ['Banco de Bogotá', 'Banco de Occidente'], ['Banco', 'Banco Agrario'], ['', 'Nequi']].forEach(([a, b]) =>
  igual(`"${a}" ≠ "${b}"`, misma(a, b), false));

// --- Qué se agrega ---
igual('nada nuevo → no agrega nada', agregar(['BANCOLOMBIA', 'NEQUI', 'BANCO DE BOGOTA']), []);
igual('agrega solo las nuevas, en orden alfabético', agregar(['Ualá', 'BANCOLOMBIA', 'Nu', 'Global66']), ['Global66', 'Nu', 'Ualá']);
igual('no repite una nueva que viene dos veces', agregar(['Nu', 'NU', 'Banco Nu S.A.']), ['Nu']);
igual('ignora vacíos, nulos y textos absurdos', agregar(['', null, undefined, '   ', 'x'.repeat(200)]), []);
igual('limpia espacios de más', agregar(['  Banco   Nuevo  ']), ['Banco Nuevo']);
igual('sin lista del servidor → nada', front.efcBancosPorAgregar(base, null), []);
igual('sin base → agrega todas', front.efcBancosPorAgregar([], ['B', 'A']), ['A', 'B']);

// --- Servidor: leer a Mercado Pago ---
const pse = (n) => ({ id: 'pse', financial_institutions: n.map((d, i) => ({ id: String(i), description: d })) });
igual('extrae las entidades de PSE', back.bcoExtraerDeMercadoPago([{ id: 'visa' }, pse(['Nequi', ' Nu ', 'NEQUI', ''])]), ['Nequi', 'Nu']);
igual('sin método PSE → vacío', back.bcoExtraerDeMercadoPago([{ id: 'visa' }]), []);
igual('respuesta de error (objeto) → vacío', back.bcoExtraerDeMercadoPago({ message: 'unauthorized' }), []);

igual("fuera fiduciarias y banca corporativa", back.bcoSoloParaPersonas(["Nequi", "ALIANZA FIDUCIARIA S.A.", "J.P. Morgan", "Citibank", "Banco Mundo Mujer"]), ["Nequi", "Banco Mundo Mujer"]);
igual("DAVIbank no se duplica con su nombre nuevo", agregar(["DAVIbank S.A."]), []);

// --- Servidor: la copia guardada ---
const diez = Array.from({ length: 12 }, (_, i) => 'Banco ' + i);
igual('copia buena', back.bcoLeerCopia(JSON.stringify({ ts: 5, bancos: diez })).bancos.length, 12);
igual('formato viejo de la simulación → no sirve', back.bcoLeerCopia(JSON.stringify([{ nombre: 'Bancolombia' }, { nombre: 'Banco Nuevo Colombia (Test API)' }])), null);
igual('copia con muy pocos → no sirve', back.bcoLeerCopia(JSON.stringify({ ts: 5, bancos: ['A', 'B'] })), null);
igual('vacío o basura → no sirve', [back.bcoLeerCopia(null), back.bcoLeerCopia('{{')], [null, null]);

// --- Servidor: cuándo ir a Mercado Pago ---
const DIA = 86400000, HORA = 3600000, AHORA = 1e12;
const copia = (edadMs, intentoHaceMs) => ({ ts: AHORA - edadMs, intento: AHORA - (intentoHaceMs === undefined ? edadMs : intentoHaceMs), bancos: diez });
igual('sin copia → refresca', back.bcoTocaRefrescar(null, AHORA), true);
igual('copia de ayer → no', back.bcoTocaRefrescar(copia(DIA), AHORA), false);
igual('copia vencida → refresca', back.bcoTocaRefrescar(copia((back.DIAS + 1) * DIA), AHORA), true);
igual('vencida pero falló hace 1 h → espera', back.bcoTocaRefrescar(copia(30 * DIA, HORA), AHORA), false);
igual('vencida y el fallo ya es viejo → reintenta', back.bcoTocaRefrescar(copia(30 * DIA, (back.HORAS + 1) * HORA), AHORA), true);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
