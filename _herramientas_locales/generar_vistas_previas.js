// Genera frontend/v/<ID>/index.html + portada.jpg para cada inmueble publicado, para
// que el enlace que se comparte por WhatsApp/Facebook muestre la foto de portada,
// el título y el precio (etiquetas og:). Esas apps leen el HTML sin ejecutar código,
// por eso visita.html?i=… (que carga todo con JavaScript) no mostraba nada.
//
// La página solo lleva a visita.html?i=<ID> (la de agendar). Se quitan las carpetas de
// los inmuebles que dejaron de estar publicados.
//
// La corre cada hora .github/workflows/vistas-previas.yml. A mano:
//   node _herramientas_locales/generar_vistas_previas.js
// Sin dependencias: solo Node 18+ (fetch).
const fs = require('fs');
const path = require('path');

const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
const BASE = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend';
const DIR = path.join(__dirname, '..', 'frontend', 'v');
const esc = (t) => String(t || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(cuerpo) {
  // Apps Script responde con una redirección: se sigue con GET. A veces devuelve una
  // página de error de Google en vez del JSON (servidor ocupado o publicando una
  // versión): se reintenta hasta 3 veces antes de fallar.
  let ultimo;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r1 = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), redirect: 'manual' });
      const r2 = await fetch(r1.headers.get('location'));
      return JSON.parse(await r2.text());
    } catch (e) {
      ultimo = e;
      console.log(`⚠️ Intento ${intento} falló (${e.message}); reintentando…`);
      await new Promise(z => setTimeout(z, 20000 * intento));
    }
  }
  throw ultimo;
}

function pagina(inm, conFoto) {
  const destino = `../../visita.html?i=${encodeURIComponent(inm.id)}`;
  const url = `${BASE}/v/${encodeURIComponent(inm.id)}/`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(inm.titulo)} · Gold Life Real Estate</title>
  <meta name="description" content="${esc(inm.descripcion)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Gold Life Real Estate">
  <meta property="og:title" content="${esc(inm.titulo)}">
  <meta property="og:description" content="${esc(inm.descripcion)}">
  <meta property="og:url" content="${url}">
${conFoto ? `  <meta property="og:image" content="${url}portada.jpg">
  <meta property="og:image:secure_url" content="${url}portada.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="${esc(inm.titulo)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${url}portada.jpg">
` : ''}  <meta name="robots" content="noindex">
  <link rel="canonical" href="${url}">
  <meta http-equiv="refresh" content="0; url=${destino}">
  <style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0a09;color:#d4af37;font-family:-apple-system,'Segoe UI',Roboto,sans-serif}a{color:#d4af37}</style>
</head>
<body>
  <p><a href="${destino}">Abriendo el inmueble…</a></p>
  <script>location.replace(${JSON.stringify(destino)});</script>
</body>
</html>
`;
}

(async () => {
  const r = await api({ accion: 'listarVistasPrevias' });
  if (!r || !r.ok || !Array.isArray(r.inmuebles)) throw new Error('Respuesta inesperada: ' + JSON.stringify(r).slice(0, 200));
  fs.mkdirSync(DIR, { recursive: true });
  const vigentes = new Set();
  for (const inm of r.inmuebles) {
    if (!/^[A-Z0-9-]{4,20}$/i.test(inm.id)) continue;   // el ID va en la ruta: solo letras y números
    vigentes.add(inm.id);
    const carpeta = path.join(DIR, inm.id);
    fs.mkdirSync(carpeta, { recursive: true });
    let conFoto = false;
    if (inm.foto) {
      try {
        // 800 px de ancho y forzada a JPG ("-rj"): WhatsApp a veces no muestra imágenes
        // de más de ~300 KB, y las portadas en PNG pesaban casi 1 MB.
        const idFoto = (inm.foto.match(/id=([\w-]+)/) || [])[1];
        const f = await fetch(idFoto ? `https://lh3.googleusercontent.com/d/${idFoto}=w800-rj` : inm.foto);
        const tipo = f.headers.get('content-type') || '';
        if (f.ok && tipo.startsWith('image/')) {
          const buf = Buffer.from(await f.arrayBuffer());
          const ruta = path.join(carpeta, 'portada.jpg');
          // Solo se reescribe si cambió (así el commit solo trae lo que de verdad cambió)
          if (!fs.existsSync(ruta) || !fs.readFileSync(ruta).equals(buf)) fs.writeFileSync(ruta, buf);
          conFoto = true;
        } else console.log('⚠️ ' + inm.id + ': la portada no respondió como imagen (' + f.status + ' ' + tipo + ')');
      } catch (e) { console.log('⚠️ ' + inm.id + ': no se pudo bajar la portada: ' + e.message); }
    }
    const html = pagina(inm, conFoto);
    const rutaHtml = path.join(carpeta, 'index.html');
    if (!fs.existsSync(rutaHtml) || fs.readFileSync(rutaHtml, 'utf8') !== html) fs.writeFileSync(rutaHtml, html);
    console.log('✅ ' + inm.id + (conFoto ? '' : ' (sin foto)') + ' · ' + inm.titulo);
  }
  // Inmuebles que ya no están publicados: fuera
  for (const nombre of fs.readdirSync(DIR)) {
    if (!vigentes.has(nombre) && fs.statSync(path.join(DIR, nombre)).isDirectory()) {
      fs.rmSync(path.join(DIR, nombre), { recursive: true, force: true });
      console.log('🗑️ ' + nombre + ' ya no está publicado');
    }
  }
  console.log(`${vigentes.size} inmuebles publicados.`);
})().catch(e => { console.error('❌ ' + e.message); process.exit(1); });
