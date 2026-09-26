// Prueba local de handleVerificarEstadoFirma: carga las funciones REALES de
// backend/GESTOR_CONTRATOS.js y las corre contra un Drive y una hoja falsos.
//
// Cubre la tabla de decisión de la sala de firmas (26-sep-2026):
//   Doc vivo sin firmar                → hay que firmar
//   Doc vivo sin firmar + fila con un firmado viejo (renovación pendiente)
//                                      → hay que firmar (NO mostrar el viejo)
//   Doc firmado                        → el firmado MÁS RECIENTE de la fila
//   Doc en papelera                    → el más reciente de la fila
//   Doc borrado del todo, link viejo   → la fila se encuentra por &cdr=
//   Doc borrado y sin fila             → "no disponible"
//
// Uso: node test_verificar_estado_firma.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../backend/GESTOR_CONTRATOS.js'), 'utf8');
const extraer = (nombre) => {
  const i = fuente.indexOf('function ' + nombre + '(');
  if (i === -1) throw new Error('No encontré ' + nombre);
  let nivel = 0, j = fuente.indexOf('{', i);
  for (; j < fuente.length; j++) {
    if (fuente[j] === '{') nivel++;
    else if (fuente[j] === '}' && --nivel === 0) break;
  }
  return fuente.slice(i, j + 1);
};
const codigo = ['handleVerificarEstadoFirma', 'buscarPdfFirmadoDeDoc', 'buscarFirmadoMasRecienteEnHoja'].map(extraer).join('\n');

// ---------- Drive falso ----------
function crearDrive(archivos) {
  const archivo = (a) => ({
    isTrashed: () => !!a.papelera,
    getName: () => a.nombre,
    getDateCreated: () => new Date(a.creado),
    getUrl: () => 'https://drive/' + a.id,
    getParents: () => { let d = false; return { hasNext: () => !d, next: () => { d = true; return carpeta(a.padre); } }; },
  });
  const carpeta = (id) => ({
    searchFiles: (q) => {
      const titulo = q.match(/title = '(.*)' and trashed = false/)[1].replace(/\\'/g, "'");
      const lista = archivos.filter(a => a.padre === id && a.nombre === titulo && !a.papelera);
      let k = 0;
      return { hasNext: () => k < lista.length, next: () => archivo(lista[k++]) };
    },
  });
  return {
    getFileById: (id) => {
      const a = archivos.find(x => x.id === id);
      if (!a) throw new Error('No item with the given ID could be found');
      return archivo(a);
    },
  };
}

// ---------- Hoja falsa ----------
function crearHoja(filas) {
  const h = ['ID DE REGISTRO', 'Merged Doc ID - CORRETAJE', 'Merged Doc ID - VENTA', 'DOCUMENTO FIRMADO'];
  const valores = [h].concat(filas.map(f => [f.id, f.corretaje || '', f.venta || '', f.firmado ? '📄✅ FIRMADO' : '']));
  const formulas = [h.map(() => '')].concat(filas.map(f => ['', '', '', f.firmado ? `=HYPERLINK("${f.firmado}"; "📄✅ FIRMADO")` : '']));
  return {
    getActiveSpreadsheet: () => ({
      getSheetByName: () => ({
        getDataRange: () => ({ getValues: () => valores, getFormulas: () => formulas }),
      }),
    }),
  };
}

function correr(archivos, filas, datos) {
  const ctx = { DriveApp: crearDrive(archivos), SpreadsheetApp: crearHoja(filas), console: { error: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(codigo + '\nresultado = handleVerificarEstadoFirma(' + JSON.stringify(datos) + ');', ctx);
  return ctx.resultado;
}

// ---------- Escenarios ----------
const DOC = 'Acta de promoción de LADY';
let ok = 0, mal = 0;
function caso(nombre, obtenido, esperado) {
  const bien = Object.keys(esperado).every(k => obtenido[k] === esperado[k]);
  console.log(`${bien ? '✅' : '❌'} ${nombre}`);
  if (!bien) console.log('     esperado:', esperado, '\n     obtenido:', obtenido);
  bien ? ok++ : mal++;
}

caso('Doc vivo sin firmar → hay que firmar',
  correr([{ id: 'D1', nombre: DOC, padre: 'F', creado: '2026-09-21' }],
         [{ id: 'MN1', corretaje: 'D1' }],
         { docId: 'D1', cdr: 'MN1' }),
  { success: true, firmado: false });

caso('Renovación pendiente: Doc nuevo sin firmar, fila con firmado del año pasado → hay que firmar',
  correr([{ id: 'D2026', nombre: DOC, padre: 'F', creado: '2026-09-21' },
          { id: 'P2025', nombre: DOC + ' - FIRMADO.pdf', padre: 'F', creado: '2025-09-22' }],
         [{ id: 'MN1', corretaje: 'D2026', firmado: 'https://drive/P2025' }],
         { docId: 'D2026', cdr: 'MN1' }),
  { success: true, firmado: false });

caso('Doc firmado → muestra el firmado más reciente de la fila',
  correr([{ id: 'D1', nombre: DOC, padre: 'F', creado: '2026-09-21' },
          { id: 'P1', nombre: DOC + ' - FIRMADO.pdf', padre: 'F', creado: '2026-09-23' }],
         [{ id: 'MN1', corretaje: 'D1', firmado: 'https://drive/P1' }],
         { docId: 'D1', cdr: 'MN1' }),
  { success: true, firmado: true, pdfUrl: 'https://drive/P1' });

caso('Doc en la papelera tras firmar → sigue mostrando el firmado',
  correr([{ id: 'D1', nombre: DOC, padre: 'F', creado: '2026-09-21', papelera: true },
          { id: 'P1', nombre: DOC + ' - FIRMADO.pdf', padre: 'F', creado: '2026-09-23' }],
         [{ id: 'MN1', corretaje: 'D1', firmado: 'https://drive/P1' }],
         { docId: 'D1', cdr: 'MN1' }),
  { success: true, firmado: true, pdfUrl: 'https://drive/P1' });

caso('Link del año pasado, ya renovado y firmado → muestra el de este año',
  correr([{ id: 'D2025', nombre: DOC, padre: 'F', creado: '2025-09-21', papelera: true },
          { id: 'P2025', nombre: DOC + ' - FIRMADO.pdf', padre: 'F', creado: '2025-09-22' },
          { id: 'P2026', nombre: DOC + ' - FIRMADO.pdf', padre: 'F', creado: '2026-09-22' }],
         [{ id: 'MN1', corretaje: 'D2026', firmado: 'https://drive/P2026' }],
         { docId: 'D2025', cdr: 'MN1' }),
  { success: true, firmado: true, pdfUrl: 'https://drive/P2026' });

caso('Doc borrado del todo (pasaron 30 días), link viejo → encuentra la fila por cdr',
  correr([],
         [{ id: 'MN1', corretaje: 'D2026', firmado: 'https://drive/P2026' }],
         { docId: 'D2025', cdr: 'MN1' }),
  { success: true, firmado: true, pdfUrl: 'https://drive/P2026' });

caso('Doc borrado y sin fila → no disponible (antes mostraba un visor roto)',
  correr([], [], { docId: 'DX', cdr: 'NADA' }),
  { success: false, noDisponible: true });

caso('Doc firmado pero la fila aún sin DOCUMENTO FIRMADO → usa su propio PDF',
  correr([{ id: 'D1', nombre: DOC, padre: 'F', creado: '2026-09-21' },
          { id: 'P1', nombre: DOC + ' - FIRMADO.pdf', padre: 'F', creado: '2026-09-23' }],
         [{ id: 'MN1', corretaje: 'D1' }],
         { docId: 'D1', cdr: 'MN1' }),
  { success: true, firmado: true, pdfUrl: 'https://drive/P1' });

caso('Nombre con comilla simple no rompe la búsqueda',
  correr([{ id: 'D1', nombre: "Acta de O'NEIL", padre: 'F', creado: '2026-09-21' },
          { id: 'P1', nombre: "Acta de O'NEIL - FIRMADO.pdf", padre: 'F', creado: '2026-09-23' }],
         [],
         { docId: 'D1' }),
  { success: true, firmado: true, pdfUrl: 'https://drive/P1' });

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
