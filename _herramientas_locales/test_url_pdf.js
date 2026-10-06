// Prueba local de urlPdfDelDocumento (frontend/validador-de-contratos.html): el botón
// "Descargar Borrador" debe entregar SOLO un PDF, nunca el documento editable.
//
// Uso: node test_url_pdf.js
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '../frontend/validador-de-contratos.html'), 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
let m, errores = 0;
while ((m = re.exec(s))) { try { new Function('return (async()=>{' + m[1] + '})')(); } catch (e) { errores++; console.log('❌ sintaxis de la página: ' + e.message); } }
const i = s.indexOf('function urlPdfDelDocumento(');
let k = 0, j = s.indexOf('{', i);
for (; j < s.length; j++) { if (s[j] === '{') k++; else if (s[j] === '}' && --k === 0) break; }
const f = new Function(s.slice(i, j + 1) + ';return urlPdfDelDocumento')();

let ok = 0, mal = errores;
function igual(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!bien) console.log(`❌ ${nombre}\n     esperado: ${JSON.stringify(esperado)}\n     obtenido: ${JSON.stringify(obtenido)}`);
  bien ? ok++ : mal++;
}
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const PDF = 'https://docs.google.com/document/d/' + ID + '/export?format=pdf';
igual('Google Doc en modo edición', f('https://docs.google.com/document/d/' + ID + '/edit?usp=sharing'), PDF);
igual('Google Doc en vista previa', f('https://docs.google.com/document/d/' + ID + '/preview'), PDF);
igual('Google Doc sin nada después del ID', f('https://docs.google.com/document/d/' + ID), PDF);
igual('archivo de Drive (PDF ya firmado)', f('https://drive.google.com/file/d/' + ID + '/view?usp=drivesdk'), 'https://drive.google.com/uc?export=download&id=' + ID);
igual('enlace viejo open?id=', f('https://drive.google.com/open?id=' + ID), 'https://drive.google.com/uc?export=download&id=' + ID);
igual('otro sitio → se deja igual', f('https://otro.sitio/x.pdf'), 'https://otro.sitio/x.pdf');
igual('vacío o nulo no rompe', [f(''), f(null), f(undefined)], ['', '', '']);
igual('nunca devuelve un enlace de edición de un Doc', /\/edit/.test(f('https://docs.google.com/document/d/' + ID + '/edit')), false);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
