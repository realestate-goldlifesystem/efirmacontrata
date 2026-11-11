// Recorrido visual de los formularios con Chrome sin ventana (perfil limpio). Datos inventados.
// Uso: npm i puppeteer-core@22.15.0 (en una carpeta aparte) y: node recorrido_formularios.js <imagen> <pdf>
// Deja capturas movil-*.png / pc-*.png / inq-*.png junto al script e imprime checks y errores de consola.
const puppeteer = require('puppeteer-core'), path = require('path');
const OUT = __dirname, BASE = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/';
const IMG = process.argv[2], PDF = process.argv[3];
const w = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-first-run'] });
  const errores = [];
  for (const [nombre, vp] of [['movil', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['pc', { width: 1366, height: 900 }]]) {
    const p = await b.newPage(); await p.setViewport(vp);
    p.on('pageerror', e => errores.push(nombre + ' ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errores.push(nombre + ' consola: ' + m.text().slice(0, 160)); });
    await p.goto(BASE + 'formulario-propietario.html?cdr=PRUEBA_SARLAFT&dir=Calle%201%20%23%201-77%20PRUEBA&_=' + Date.now(), { waitUntil: 'networkidle2' });
    await w(1500); await p.screenshot({ path: path.join(OUT, nombre + '-1-bienvenida.png') });
    await p.click('#btnGoToPayment'); await w(1200);
    await p.screenshot({ path: path.join(OUT, nombre + '-2-vacio.png') });
    await p.select('#tipoDocumento', 'CC'); await w(300);
    const escribe = async (sel, txt) => { await p.waitForSelector(sel, { visible: true, timeout: 5000 }).catch(() => {}); await p.type(sel, txt, { delay: 8 }); await w(250); };
    await escribe('#numeroDocumento', '1000111222'); await escribe('#confirmarDocumento', '1000111222');
    await escribe('#nombres', 'Juan Carlos'); await escribe('#apellidos', 'Perez Gomez');
    await escribe('#email', 'prueba@correo.com'); await escribe('#confirmarEmail', 'prueba@correo.com');
    await escribe('#celular', '3001234567'); await escribe('#confirmarCelular', '3001234567');
    await w(900);
    const estado = await p.evaluate(() => ({
      checks: [...document.querySelectorAll('.prem-chk')].map(c => { const i = document.getElementById(c.dataset.para).getBoundingClientRect(), k = c.getBoundingClientRect(); return c.dataset.para + (c.classList.contains('si') ? '✓' : '✗') + (k.top >= i.top && k.bottom <= i.bottom ? '' : '(FUERA)'); }),
      siguiente: document.getElementById('btnNext').className, xp: document.getElementById('xpBar').style.width,
      pegar: (() => { const e = new Event('paste', { cancelable: true }); document.getElementById('confirmarEmail').dispatchEvent(e); return e.defaultPrevented; })(),
      anchoPagina: document.documentElement.scrollWidth, ancho: innerWidth
    }));
    console.log(nombre, JSON.stringify(estado));
    await p.screenshot({ path: path.join(OUT, nombre + '-3-lleno.png'), fullPage: true });
    await p.click('#btnNext'); await w(1400);
    await p.screenshot({ path: path.join(OUT, nombre + '-4-documentos.png'), fullPage: true });
    const fr = await p.$('#docFront'); if (fr) await fr.uploadFile(IMG); await w(1500);
    const bk = await p.$('#docBack'); if (bk) await bk.uploadFile(PDF); await w(2500);
    await p.screenshot({ path: path.join(OUT, nombre + '-5-buzones.png'), fullPage: true });
    if (nombre === 'movil') {
      await p.evaluate(() => { const x = document.getElementById('prog-prop-1-4'); if (x) { x.classList.remove('progressive-hidden'); x.classList.add('progressive-visible'); } });
      await p.click('#btnSarlaftDiligenciar').catch(e => errores.push('sarlaft ' + e.message)); await w(3500);
      await p.screenshot({ path: path.join(OUT, nombre + '-6-sarlaft.png') });
    }
    await p.close();
  }
  const q = await b.newPage(); await q.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  q.on('pageerror', e => errores.push('inq ' + e.message));
  await q.goto(BASE + 'formulario-inquilino.html?cdr=PRUEBA_SARLAFT&_=' + Date.now(), { waitUntil: 'networkidle2' }); await w(1500);
  await q.screenshot({ path: path.join(OUT, 'inq-1-bienvenida.png') });
  await b.close();
  console.log('ERRORES', JSON.stringify(errores));
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
