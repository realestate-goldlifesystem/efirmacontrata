// Prueba local de esPiezaDePublicacion (backend/GESTOR_CONTRATOS.js): qué archivos
// NO deben salir entre los documentos del contrato aunque lleven el código del
// registro en el nombre (portada, fotos, cartel de ventanilla, video).
//
// Uso: node test_pieza_publicacion.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../backend/GESTOR_CONTRATOS.js'), 'utf8');
const i = fuente.indexOf('function esPiezaDePublicacion(');
let nivel = 0, j = fuente.indexOf('{', i);
for (; j < fuente.length; j++) { if (fuente[j] === '{') nivel++; else if (fuente[j] === '}' && --nivel === 0) break; }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fuente.slice(i, j + 1), ctx);

let ok = 0, mal = 0;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}
const R = 'REG_21-09-2026-C49_(Cl 1 #2-3)_TORRE-3_APTO-405';
const es = ctx.esPiezaDePublicacion;

// --- Publicidad: fuera ---
[['1-Portada_Arriendo_' + R + '.png', 'image/png'], ['Cartel_Ventanilla_' + R + '.png', 'image/png'], ['Cartel_Ventanilla_' + R + '.pdf', 'application/pdf'],
 ['35-Foto_' + R + '.jpg', 'image/jpeg'], ['TOP_1_2-Portada_' + R + '.jpg', 'image/jpeg'], ['Video_Recorrido_' + R + '.mp4', 'video/mp4'],
 ['imagen_cualquiera_' + R + '.jpg', 'image/jpeg'], ['2-Portada_' + R, 'application/octet-stream']].forEach(([n, m]) =>
  igual('fuera: ' + n.slice(0, 28), es(n, m), true));

// --- Soportes del contrato: se quedan, aunque sean una foto ---
[['CEDULA_PROP_FRONTAL_[' + R + '].jpg', 'image/jpeg'], ['CEDULA_INQU_REVERSO_[' + R + '].png', 'image/png'], ['CEDULA_COD_1_FRONTAL_[' + R + '].jpg', 'image/jpeg'],
 ['CERT_TRADICION_[' + R + '].pdf', 'application/pdf'], ['CERT_BANCARIO_[' + R + '].jpg', 'image/jpeg'], ['CERTBANCARIO_[' + R + '].pdf', 'application/pdf'],
 ['FACTURA_AGUA_[' + R + '].jpg', 'image/jpeg'], ['SARLAFT_[' + R + '].pdf', 'application/pdf'], ['SOPORTES_INGRESO_INQU_[' + R + '].pdf', 'application/pdf'],
 ['COMPROBANTE_PAGO_INQU_[' + R + '].png', 'image/png'], ['RUT_[' + R + '].pdf', 'application/pdf']].forEach(([n, m]) =>
  igual('se queda: ' + n.slice(0, 26), es(n, m), false));

// --- Otros documentos (PDF o Docs sin etiqueta): se quedan, como antes ---
igual('acta de promoción en PDF se queda', es('Acta de acuerdo para promoción de inmueble ' + R + '.pdf', 'application/pdf'), false);
igual('un Google Doc se queda', es('Contrato ' + R, 'application/vnd.google-apps.document'), false);
igual('"FOTOCOPIA" no se confunde con una foto', es('FOTOCOPIA PODER ' + R + '.pdf', 'application/pdf'), false);
igual('"TRUTH" no cuenta como RUT... y al ser imagen sin etiqueta, sale', es('TRUTH_' + R + '.jpg', 'image/jpeg'), true);
igual('vacío o nulo no rompe', [es('', ''), es(null, null)], [false, false]);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
