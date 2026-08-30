/**
 * Prueba normalizarImagenesAJpg() con una carpeta de Drive simulada.
 * Uso: node _herramientas_locales/test_normalizar_jpg.js
 */
const fs = require('fs');
const path = require('path');

// Se carga la funcion REAL desde el backend, no una copia.
const src = fs.readFileSync(path.join(__dirname, '../backend/API_MULTIMEDIA.js'), 'utf8');
const ini = src.indexOf('var EXTENSIONES_IMAGEN');
const fin = src.indexOf('/** Nombre anterior');
if (ini === -1 || fin === -1) { console.error('No se encontro la funcion'); process.exit(1); }
const codigo = src.slice(ini, fin);
const console_ = { log(){}, error(){} };
const fabricar = new Function('console', codigo + '; return normalizarImagenesAJpg;');
const normalizar = fabricar(console_);

const carpetaFalsa = (nombres) => {
  // Cada entrada puede ser "nombre" o ["nombre", "mimeType"], para poder probar
  // los archivos sin extension, donde el tipo real es lo unico que decide.
  const files = nombres.map(e => {
    const [n, mime] = Array.isArray(e) ? e : [e, 'application/octet-stream'];
    return { _n: n, _m: mime, getName(){return this._n;}, setName(v){this._n=v;},
             getMimeType(){return this._m;} };
  });
  return { files, getName: () => 'FOTOS', getFiles(){ let i=0; return {hasNext:()=>i<files.length, next:()=>files[i++]}; } };
};

let fallos = 0;
const t = (titulo, entrada, esperado) => {
  const f = carpetaFalsa(entrada);
  normalizar(f);
  const real = f.files.map(x => x._n).sort();
  const esp = [...esperado].sort();
  const ok = JSON.stringify(real) === JSON.stringify(esp);
  if (!ok) fallos++;
  console.log(`${ok ? '✅' : '❌'} ${titulo}`);
  if (!ok) { console.log('     esperado:', esp); console.log('     real    :', real); }
};

t('DNG y HEIC (lo que ya hacia)', ['a.DNG','b.HEIC'], ['a.jpg','b.jpg']);
t('PNG y WEBP (lo nuevo)', ['c.PNG','d.webp'], ['c.jpg','d.jpg']);
t('.JPG en mayuscula se normaliza', ['e.JPG'], ['e.jpg']);
t('.jpg correcto no se toca', ['f.jpg'], ['f.jpg']);
t('videos y PDF intactos', ['v.mp4','doc.pdf','x.MOV'], ['v.mp4','doc.pdf','x.MOV']);
t('colision png + jpg no se pisan', ['foto.png','foto.jpg'], ['foto.jpg','foto-2.jpg']);
t('nombre con puntos', ['casa.2026.final.PNG'], ['casa.2026.final.jpg']);
t('"png" dentro del nombre no confunde', ['pngfoto.mp4'], ['pngfoto.mp4']);
t('mezcla real', ['1.DNG','2.HEIC','3.PNG','4.jpg','5.JPEG','video.mp4'],
               ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','video.mp4']);
t('triple colision', ['g.png','g.webp','g.jpg'], ['g.jpg','g-2.jpg','g-3.jpg']);

// Casos de las fotos que sube carga_multimedia.html
t('foto SIN extension que es imagen -> .jpg',
  [['2-Portada_YB383511','image/jpeg']], ['2-Portada_YB383511.jpg']);
t('varias sin extension (portada + fotos)',
  [['2-Portada_YB383511','image/jpeg'], ['3-Foto_YB383511','image/png']],
  ['2-Portada_YB383511.jpg', '3-Foto_YB383511.jpg']);
t('TOP 10 sin extension',
  [['TOP_1_2-Portada_YB383511','image/jpeg']], ['TOP_1_2-Portada_YB383511.jpg']);
t('sin extension pero NO es imagen: no se toca',
  [['ARCHIVO_RARO','application/octet-stream']], ['ARCHIVO_RARO']);
t('sin extension y es video: no se toca',
  [['clip_sin_ext','video/mp4']], ['clip_sin_ext']);
t('colision: sin extension y ya existe el .jpg',
  [['2-Portada_X','image/jpeg'], '2-Portada_X.jpg'],
  ['2-Portada_X.jpg', '2-Portada_X-2.jpg']);
t('nombre con punto interno pero sin extension real',
  [['CDR_2026.FINAL','image/jpeg']], ['CDR_2026.FINAL.jpg']);

t('imagen con extension desconocida: se anade, no se recorta',
  [['captura.xyz','image/jpeg']], ['captura.xyz.jpg']);
t('PDF con nombre de imagen no se toca',
  [['contrato.pdf','application/pdf']], ['contrato.pdf']);

console.log(fallos === 0 ? '\nTODAS PASAN' : `\n${fallos} FALLAN`);
process.exit(fallos ? 1 : 0);
