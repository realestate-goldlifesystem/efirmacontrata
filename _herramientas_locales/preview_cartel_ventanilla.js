/**
 * Vista previa del CARTEL DE VENTANILLA.
 *
 * NO reimplementa la lógica: carga y ejecuta la función real
 * `generarCartelVentanilla` de backend/API_MULTIMEDIA.js con stubs de
 * DriveApp/SlidesApp, y captura los replaceAllText que haría en la plantilla.
 * Así el preview siempre refleja el código de producción.
 *
 * Uso: node _herramientas_locales/preview_cartel_ventanilla.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'backend', 'API_MULTIMEDIA.js');

// ---- Stubs mínimos del entorno Apps Script -------------------------------
let capturado = {};
const slideStub = {
  getObjectId: () => 'slide_preview',
  replaceAllText: (tag, val) => { capturado[tag] = val; }
};
const sandbox = {
  console,
  Logger: { log: () => {} },
  DriveApp: {
    getFileById: () => ({ makeCopy: () => ({ getId: () => 'temp_id', setTrashed: () => {} }) })
  },
  SlidesApp: {
    openById: () => ({ getSlides: () => [slideStub], saveAndClose: () => {} })
  },
  ScriptApp: { getOAuthToken: () => 'token' },
  UrlFetchApp: {
    fetch: () => ({ getBlob: () => ({ setName: () => ({}) }) })
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: SRC });

const carpetaStub = { createFile: () => ({ getUrl: () => '', getId: () => '' }) };

// ---- Headers reales del Sheet (nombres exactos) --------------------------
const HEADERS = [
  'TIPO DE NEGOCIO',
  'Selecciona el tipo de inmueble',
  'N° de Habitaciones',
  'N° de Baños',
  'N° de Garajes',
  '¿Dispone de deposito?',
  'PRECIO DE PROMOCION GENERAL',
  'PRECIO DE PROMOCION EN VENTA'
];

const SI_DEP = 'Depositoㅤ'; // valores literales que manda el formulario React
const NO_DEP = 'ㅤ';

// ---- Escenarios ----------------------------------------------------------
const ESCENARIOS = [
  { titulo: 'ARRIENDO (Corretaje) · 1 garaje · con depósito',
    fila: ['Corretaje','Apartamento','3','2','1',SI_DEP,'2500000',''] },
  { titulo: 'ARRIENDO (Administración) · SIN garaje · SIN depósito',
    fila: ['Administración','Apartaestudio','1','1','Ningun',NO_DEP,'1800000',''] },
  { titulo: 'ARRIENDO · garaje COMUNAL · con depósito',
    fila: ['Corretaje','Casa','4','3','Comunal',SI_DEP,'4200000',''] },
  { titulo: 'VENTA · 2 garajes · SIN depósito',
    fila: ['Venta','Apartamento','2','2','2',NO_DEP,'','450000000'] },
  { titulo: 'VENTA · SIN garaje · con depósito',
    fila: ['Venta','Casa','5','4','Ningun',SI_DEP,'','780000000'] },
  { titulo: 'MIXTO (Vendi-Renta) · 1 garaje · con depósito',
    fila: ['Vendi-Renta','Apartamento','3','2','1',SI_DEP,'2500000','500000000'] },
  { titulo: 'MIXTO (Admi-Venta) · COMUNAL · SIN depósito',
    fila: ['Admi-Venta','Apartamento','2','2','Comunal',NO_DEP,'3100000','620000000'] }
];

// ---- Ejecutar ------------------------------------------------------------
const resultados = ESCENARIOS.map(esc => {
  capturado = {};
  sandbox.generarCartelVentanilla(esc.fila, HEADERS, carpetaStub, 'CDR_PREVIEW');
  // El código sustituye vacío por ' ' para borrar el tag del slide.
  const g = t => (capturado[t] === ' ' ? '' : (capturado[t] || ''));
  return {
    titulo: esc.titulo,
    negocio: g('<<TIPO DE NEGOCIO>>'),
    inm: g('<<TIPO INM>>'),
    lineas: [g('<<HAB>>'), g('<<BAÑ>>'), g('<<GAR>>'), g('<<DEPÓSITO>>')].filter(Boolean),
    precio: (g('<<PRECIO DE VENTA EN NUM>>') + g('<<PRECIO DE ARRIENDO EN NUM>>')).trim(),
    admin: g('<<ADMIN>>')
  };
});

// ---- Consola -------------------------------------------------------------
resultados.forEach(r => {
  console.log('\n' + '─'.repeat(46));
  console.log('  ' + r.titulo);
  console.log('─'.repeat(46));
  console.log(`        SE ${r.negocio}`);
  console.log(`        ${r.inm}`);
  console.log('');
  r.lineas.forEach(l => console.log(`        ${l}`));
  console.log('');
  console.log(`        ${r.precio}`);
  if (r.admin) console.log(`        ${r.admin}`);
  console.log('        CELULAR: 3177623878');
});
console.log('\n' + '─'.repeat(46) + '\n');

// ---- HTML ----------------------------------------------------------------
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const cards = resultados.map(r => `
  <figure class="item">
    <figcaption>${esc(r.titulo)}</figcaption>
    <div class="cartel">
      <div class="tit">SE ${esc(r.negocio)}<br>${esc(r.inm)}</div>
      <div class="specs">${r.lineas.map(l => `<div>${esc(l)}</div>`).join('') || '<div class="vacio">(sin características)</div>'}</div>
      <div class="precio">${esc(r.precio)}</div>
      <div class="adm">${esc(r.admin)}</div>
      <div class="cel">CELULAR: 3177623878</div>
    </div>
  </figure>`).join('');

const html = `<!doctype html><meta charset="utf-8">
<title>Preview Cartel de Ventanilla</title>
<style>
  body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:0;padding:28px}
  h1{font-size:19px;margin:0 0 4px}
  p.sub{color:#9a9a9a;font-size:13px;margin:0 0 24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:22px}
  figcaption{font-size:12px;color:#D4AF37;margin-bottom:8px;font-weight:600}
  .cartel{background:#fff;color:#000;aspect-ratio:4/3;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;
    font-family:Arial,Helvetica,sans-serif;font-weight:bold;border:1px solid #444;padding:16px}
  .tit{font-size:26px;line-height:1.12;margin-bottom:16px}
  .specs{font-size:15px;line-height:1.45;margin-bottom:16px}
  .vacio{color:#bbb;font-weight:normal;font-style:italic;font-size:12px}
  .precio{font-size:17px}
  .adm{font-size:13px;font-weight:normal}
  .cel{font-size:16px;margin-top:12px}
</style>
<h1>Cartel de Ventanilla — vista previa</h1>
<p class="sub">Generado ejecutando la función real <code>generarCartelVentanilla</code> de API_MULTIMEDIA.js</p>
<div class="grid">${cards}</div>`;

const out = path.join(__dirname, 'preview_cartel_ventanilla.html');
fs.writeFileSync(out, html, 'utf8');
console.log('HTML -> ' + out);
