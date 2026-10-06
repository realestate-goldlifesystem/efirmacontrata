// Prueba local de backend/OCR_FOLIO.js: la lectura del certificado de libertad y
// tradición por anotaciones (dueños actuales, embargos, hipotecas, cancelaciones).
//
// El texto de abajo es INVENTADO (nombres y cédulas falsos) pero copia la forma
// en que Vision entrega un certificado real: renglones desordenados, la "X" y la
// cédula en renglones aparte, encabezados de página metidos entre anotaciones.
// Para probar contra un certificado real:  node ocr_clt_local.js <ID>  (guarda el
// texto fuera del repo) y  node test_folio.js <ruta del .txt>
//
// Uso: node test_folio.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/OCR_FOLIO.js'), 'utf8'), ctx);

if (process.argv[2]) {       // modo "ver un certificado real"
  const f = ctx.folioAnalizar(fs.readFileSync(process.argv[2], 'utf8'));
  console.log('Fecha:', f.fechaImpresion, '| días:', ctx.folioDiasDesde(f.fechaImpresion));
  f.anotaciones.forEach(a => console.log(String(a.nro).padStart(3), a.tipo.padEnd(21), ctx.folioResumen(a), a.cancela.length ? '→ cancela ' + a.cancela : ''));
  console.log('Canceladas:', f.canceladas.join(', ') || 'ninguna');
  console.log('Titulares (anot. ' + f.titulares.anotacion + '):', f.titulares.nombres.length, 'personas,', f.titulares.cedulas.length, 'cédulas');
  console.log('Cautelares:', f.cautelares.map(ctx.folioResumen));
  console.log('Hipotecas :', f.gravamenes.map(ctx.folioResumen));
  console.log('Limitac.  :', f.limitaciones.map(ctx.folioResumen));
  process.exit(0);
}

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}

const ENCABEZADO = `SNR
CERTIFICADO DE TRADICION
MATRICULA INMOBILIARIA
Nro Matrícula: 50N-12345678
Impreso el 6 de Octubre de 2026 a las 09:54:17 AM
No tiene validez sin la firma del registrador en la ultima página
`;

// Caso base: apto en propiedad horizontal, dos dueños, hipoteca vieja cancelada e hipoteca nueva vigente
const CERT = ENCABEZADO + `DIRECCION DEL INMUEBLE
1) CARRERA 1 #2-3 APARTAMENTO 101
ANOTACION: Nro 001 Fecha: 09-11-2018 Radicación: 2018-50N-6-11111
Doc: ESCRITURA 100 DEL 25-10-2018 NOTARIA UNO DE BOGOTA D. C.
ESPECIFICACION: GRAVAMEN: 0219 HIPOTECA ABIERTA SIN LIMITE DE CUANTIA
` + ENCABEZADO + `PERSONAS QUE INTERVIENEN EN EL ACTO (X-Titular de derecho real de dominio,l-Titular de dominio incompleto)
DE: CONSTRUCTORA EJEMPLO S.A NIT 900.000.000-1
A: BANCO EJEMPLO S.A.
X
NIT# 8000000001
ANOTACION: Nro 002 Fecha: 22-09-2020 Radicación: 2020-50N-6-22222
ESPECIFICACION: LIMITACION AL DOMINIO: 0317 CONSTITUCION REGLAMENTO DE PROPIEDAD HORIZONTAL CONJUNTO EJEMPLO
A: CONSTRUCTORA EJEMPLO S.A
ANOTACION: Nro 003 Fecha: 15-08-2025 Radicación: 2025-50N-6-33333
ESPECIFICACION: MODO DE ADQUISICION: 0125 COMPRAVENTA
VALOR ACTO: $300,000,000
DE: CONSTRUCTORA EJEMPLO S.A COMO VOCERA DEL FIDEICOMISO PROYECTO
A
A: PEÑA GÓMEZ CARLOS ANDRES
A: GOMEZ RUIZ MARIA ELENA
NIT.900.000.000-1
CC# 1000111222 X
CC# 52000333
X
ANOTACION: Nro 004 Fecha: 15-08-2025 Radicación: 2025-50N-6-33333
ESPECIFICACION: GRAVAMEN: 0219 HIPOTECA ABIERTA SIN LIMITE DE CUANTIA
DE: PEÑA GÓMEZ CARLOS ANDRES
CC# 1000111222 X
` + ENCABEZADO + `DE: GOMEZ RUIZ MARIA ELENA
A: BANCO EJEMPLO S.A.
CC# 52000333
NIT# 8000000001
ANOTACION: Nro 005 Fecha: 15-08-2025 Radicación: 2025-50N-6-33333
Se cancela anotación No: 1
ESPECIFICACION: CANCELACION: 0843 CANCELACION POR VOLUNTAD DE LAS PARTES LIBERACION PARCIAL HIPOTECA CONSTITUIDA
DE: BANCO EJEMPLO S.A.
NRO TOTAL DE ANOTACIONES: *5*
SALVEDADES: (Información Anterior o Corregida)
Anotación Nro: 3
SE CORRIGE NOMBRE DE LA TITULAR
EXPEDIDO EN: BOGOTA
FECHA: 06-10-2026
`;

const f = ctx.folioAnalizar(CERT);
igual('lee las 5 anotaciones (las "Anotación Nro" de SALVEDADES no cuentan)', f.anotaciones.map(a => a.nro), [1, 2, 3, 4, 5]);
igual('clasifica cada acto', f.anotaciones.map(a => a.tipo), ['gravamen', 'propiedad_horizontal', 'adquisicion', 'gravamen', 'cancelacion']);
igual('fecha de expedición = la de "Impreso el"', f.fechaImpresion, '2026-10-06');
igual('la anotación 5 cancela la 1', f.canceladas, [1]);
igual('dueños: los dos "A:" de la compraventa', f.titulares.nombres, ['PEÑA GÓMEZ CARLOS ANDRES', 'GOMEZ RUIZ MARIA ELENA']);
igual('cédulas de los dueños', f.titulares.cedulas, ['1000111222', '52000333']);
igual('los dueños salen de la anotación 3', f.titulares.anotacion, 3);
// Lo que estaba mal en el panel:
igual('NO hay embargo: el reglamento de PH y la hipoteca no lo son', f.cautelares, []);
igual('la hipoteca cancelada no cuenta; queda solo la vigente', f.gravamenes.map(a => a.nro), [4]);
igual('el reglamento de propiedad horizontal no es una limitación a reportar', f.limitaciones, []);
igual('resumen legible', ctx.folioResumen(f.gravamenes[0]), '0219 HIPOTECA ABIERTA SIN LIMITE DE CUANTIA (anot. 4)');

// --- Cotejo con quien llenó el formulario ---
let c = ctx.folioCotejar(f, { documento: '1.000.111.222', nombre: 'Carlos Andrés Peña Gomez' });
igual('hijo: cédula coincide (con puntos)', c.cedulaCoincide, true);
igual('hijo: nombre coincide aunque venga en otro orden y sin tildes', c.nombreCoincide, true);
igual('hijo: la mamá aparece como copropietaria', c.otrosTitulares, ['GOMEZ RUIZ MARIA ELENA']);
c = ctx.folioCotejar(f, { documento: '52000333', nombre: 'MARIA ELENA GOMEZ RUIZ' });
igual('mamá: coincide y el hijo es el copropietario', [c.cedulaCoincide, c.nombreCoincide, c.otrosTitulares], [true, true, ['PEÑA GÓMEZ CARLOS ANDRES']]);
c = ctx.folioCotejar(f, { documento: '79999999', nombre: 'PEDRO PEREZ LOPEZ' });
igual('un extraño: nada coincide', [c.cedulaCoincide, c.nombreCoincide, c.otrosTitulares.length], [false, false, 2]);
c = ctx.folioCotejar(f, { documento: '52000333', nombre: 'MARIA' });
igual('un solo nombre común no basta... pero la cédula lo ubica', [c.cedulaCoincide, c.titularCoincidente], [true, 'GOMEZ RUIZ MARIA ELENA']);
c = ctx.folioCotejar(f, { documento: '', nombre: '' });
igual('sin datos → no coincide, sin romperse', [c.cedulaCoincide, c.nombreCoincide], [false, false]);

// --- Embargo real, y embargo ya cancelado ---
const conEmbargo = CERT.replace('NRO TOTAL DE ANOTACIONES', `ANOTACION: Nro 006 Fecha: 01-03-2026 Radicación: 2026-1
ESPECIFICACION: MEDIDA CAUTELAR: 0427 EMBARGO EJECUTIVO CON ACCION PERSONAL
DE: BANCO EJEMPLO S.A.
A: PEÑA GÓMEZ CARLOS ANDRES
CC# 1000111222 X
NRO TOTAL DE ANOTACIONES`);
let e = ctx.folioAnalizar(conEmbargo);
igual('embargo vigente → se reporta', e.cautelares.map(ctx.folioResumen), ['0427 EMBARGO EJECUTIVO CON ACCION PERSONAL (anot. 6)']);
igual('el embargo no cambia quiénes son los dueños', e.titulares.anotacion, 3);
e = ctx.folioAnalizar(conEmbargo.replace('NRO TOTAL DE ANOTACIONES', `ANOTACION: Nro 007 Fecha: 01-06-2026 Radicación: 2026-2
Se cancela anotación No: 6
ESPECIFICACION: CANCELACION: 0841 CANCELACION PROVIDENCIA JUDICIAL EMBARGO
NRO TOTAL DE ANOTACIONES`));
igual('embargo levantado → ya no se reporta', e.cautelares, []);

// --- Limitaciones que sí importan para arrendar ---
e = ctx.folioAnalizar(CERT.replace('NRO TOTAL DE ANOTACIONES', `ANOTACION: Nro 006 Fecha: 01-03-2026
ESPECIFICACION: LIMITACION AL DOMINIO: 0304 AFECTACION A VIVIENDA FAMILIAR
ANOTACION: Nro 007 Fecha: 01-03-2026
ESPECIFICACION: LIMITACION AL DOMINIO: 0314 USUFRUCTO
NRO TOTAL DE ANOTACIONES`));
igual('afectación a vivienda familiar y usufructo sí se muestran', e.limitaciones.map(a => a.codigo), ['0304', '0314']);

// --- Venta posterior: el dueño es el último comprador ---
e = ctx.folioAnalizar(CERT.replace('NRO TOTAL DE ANOTACIONES', `ANOTACION: Nro 006 Fecha: 01-03-2026
ESPECIFICACION: MODO DE ADQUISICION: 0125 COMPRAVENTA
DE: PEÑA GÓMEZ CARLOS ANDRES
A: LOPEZ DIAZ ANA
CC# 30111222 X
NRO TOTAL DE ANOTACIONES`));
igual('tras una venta, la dueña es la compradora', e.titulares.nombres, ['LOPEZ DIAZ ANA']);
c = ctx.folioCotejar(e, { documento: '1000111222', nombre: 'CARLOS ANDRES PEÑA GOMEZ' });
igual('el dueño anterior ya no coincide, y se dice en qué anotación aparece', [c.cedulaCoincide, c.cedulaEnAnotacion], [false, 4]);
e = ctx.folioAnalizar(CERT.replace('NRO TOTAL DE ANOTACIONES', `ANOTACION: Nro 006 Fecha: 01-03-2026
ESPECIFICACION: MODO DE ADQUISICION: 0307 COMPRAVENTA DERECHOS DE CUOTA 50%
A: LOPEZ DIAZ ANA
NRO TOTAL DE ANOTACIONES`));
igual('compra de una parte → se marca como parcial', e.titulares.parcial, true);

// --- Certificados sin el grupo, y textos ilegibles ---
e = ctx.folioAnalizar(`ANOTACION: Nro 1 Fecha: 01-01-1990
ESPECIFICACION: 101 COMPRAVENTA
A: RUIZ PEDRO
ANOTACION: Nro 2 Fecha: 01-01-1995
ESPECIFICACION: 401 EMBARGO
`);
igual('formato viejo sin grupo', [e.anotaciones.map(a => a.tipo), e.titulares.nombres], [['adquisicion', 'cautelar'], ['RUIZ PEDRO']]);
e = ctx.folioAnalizar('una foto borrosa sin nada reconocible HIPOTECA EMBARGO');
igual('sin anotaciones legibles → leido=false (el panel avisa, no inventa)', [e.leido, e.cautelares, e.titulares.nombres], [false, [], []]);
igual('texto vacío o nulo no rompe', [ctx.folioAnalizar('').leido, ctx.folioAnalizar(null).leido], [false, false]);

// --- Edad del certificado ---
const medianoche = Date.parse('2026-10-06T05:00:00Z');          // 6-oct 00:00 en Bogotá
igual('expedido hoy → 0 días (antes salía -1)', ctx.folioDiasDesde('2026-10-06', medianoche + 11 * 3600000), 0);
igual('expedido hoy, visto a las 11 pm → sigue en 0', ctx.folioDiasDesde('2026-10-06', medianoche + 23 * 3600000), 0);
igual('30 días', ctx.folioDiasDesde('2026-09-06', medianoche + 3600000), 30);
igual('fecha a futuro (reloj corrido) → 0, nunca negativo', ctx.folioDiasDesde('2026-10-09', medianoche), 0);
igual('sin fecha → null', ctx.folioDiasDesde(null, medianoche), null);
igual('fecha del pie si falta "Impreso el"', ctx.folioFechaImpresion('EXPEDIDO EN: BOGOTA\nFECHA: 06-10-2026'), '2026-10-06');

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
