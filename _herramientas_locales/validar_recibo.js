// Validación de la sala de recibo (RECIBO_INMUEBLE.js) en el inmueble de PRUEBA, en modo prueba sin correos.
// Corre el contrato para que termine en 10 días, lo deja TERMINADO y recorre todo: apertura, horarios,
// recibos, inventario, cierre (informe + paz y salvo) y el aviso del tope. Restaura todo al final.
// Requiere el case TEMP_recibo (backend/TEMP_RECIBO.js). 29-oct-2026.
// Uso: node validar_recibo.js <carpeta para los PDF> [--dejar]   (--dejar: deja la sala agendada para verla en la página)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
async function api(o) {
  for (let k = 0; k < 3; k++) {
    try { const r1 = await fetch(API, { method: 'POST', body: JSON.stringify(o), redirect: 'manual' }); return JSON.parse(await (await fetch(r1.headers.get('location'))).text()); }
    catch (e) { if (k === 2) throw e; await new Promise(z => setTimeout(z, 6000)); }
  }
}
const ID = 'ZA471452', salida = process.argv[2], dejar = process.argv.includes('--dejar');
const T = (que, extra) => api(Object.assign({ accion: 'TEMP_recibo', que, id: ID }, extra || {}));
let fallas = 0, nLog = 0;
const ok = (c, m) => { console.log(c ? '  OK ' : '  MAL', m); if (!c) fallas++; };
async function correos() {
  const l = (await T('log')).correos || []; const n = l.slice(nLog); nLog = l.length;
  n.forEach(c => console.log('     ✉', String(c.para).replace(/@.*/, '@…'), '| adj', c.adjuntos, '|', c.asunto));
  return n;
}
const enlace = u => { const q = new URL(u).searchParams; return { k: q.get('k'), f: q.get('f'), r: q.get('r'), t: q.get('t') }; };
const iso = d => d.toISOString().slice(0, 10);
const masDias = (s, n) => { const x = new Date(s + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
// Un PNG de 1x1 como "recibo" y "foto"
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

(async () => {
  try {
    ok((await T('on')).on === ID, 'modo prueba sin correos activo');
    await T('limpiar');
    const hoy = iso(new Date(Date.now() - 5 * 3600000));

    console.log('\n1. Apertura de la sala (15 días antes del final)');
    await T('preparar', { faltan: 20 });
    await T('revisar', { hoy });
    ok((await correos()).length === 0 && !(await T('estado')).rec.estado, 'faltando 20 días todavía no abre');
    await T('preparar', { faltan: 10 });
    await T('revisar', { hoy });
    const n1 = await correos();
    let e = await T('estado');
    ok(e.rec.estado === 'ABIERTA' && n1.length === 3, `faltando 10 días abre y avisa a los tres (termina ${e.fin}, tope ${e.tope}, negocio ${e.negocio})`);
    await T('revisar', { hoy });
    ok((await correos()).length === 0, 'no repite la apertura');
    const I = enlace(e.urlI), P = enlace(e.urlP), A = enlace(e.urlA);

    console.log('\n2. Horarios: el inquilino propone, el propietario elige');
    const info = await api({ accion: 'infoRecibo', ...I });
    ok(info.ok && info.rol === 'INQUILINO' && info.desde === hoy && info.hasta === e.tope, `la página abre: ventana ${info.desde} → ${info.hasta}`);
    ok(!(await api({ accion: 'infoRecibo', ...I, t: 'malo' })).ok, 'un token falso se rechaza');
    ok(!(await api({ accion: 'infoRecibo', ...I, r: 'a' })).ok, 'el token del inquilino no abre la vista de Leonardo');
    const libres = [];
    for (let d = 1; d <= 12 && libres.length < 6; d++) {
      const r = await api({ accion: 'disponibilidadRecibo', ...I, fecha: masDias(hoy, d) });
      (r.slots || []).slice(0, 2).forEach(s => libres.push(s.timestamp));
    }
    ok(libres.length >= 6, 'hay horarios libres en la ventana: ' + libres.length);
    ok((await api({ accion: 'disponibilidadRecibo', ...I, fecha: masDias(e.tope, 2) })).slots.length === 0, 'después del tope no ofrece horarios');
    ok(!(await api({ accion: 'proponerRecibo', ...P, pedidos: libres.slice(0, 3) })).ok, 'el propietario no puede proponer');
    let r = await api({ accion: 'proponerRecibo', ...I, pedidos: libres.slice(0, 3) });
    ok(r.ok, 'el inquilino propone 3: ' + (r.mensaje || ''));
    ok(!(await api({ accion: 'proponerRecibo', ...I, pedidos: libres.slice(3, 6) })).ok, 'no puede proponer otra vez mientras espera');
    await correos();
    r = await api({ accion: 'responderRecibo', ...P, ninguno: true });
    ok(r.ok, 'al propietario no le sirve ninguno');
    await correos();
    ok(!(await api({ accion: 'proponerRecibo', ...I, pedidos: [libres[0], libres[3], libres[4]] })).ok, 'un horario descartado no se puede volver a proponer');
    ok((await api({ accion: 'proponerRecibo', ...I, pedidos: libres.slice(3, 6) })).ok, 'propone otros 3');
    await correos();
    r = await api({ accion: 'responderRecibo', ...P, timestamp: libres[4] });
    ok(r.ok, 'el propietario elige uno: ' + (r.mensaje || ''));
    const n2 = await correos();
    e = await T('estado');
    ok(e.rec.estado === 'AGENDADA' && e.rec.cita.ts === libres[4] && !!e.rec.cita.evento && n2.length === 3, 'queda AGENDADA con evento en el calendario y avisos a los tres');

    console.log('\n3. Recibos de servicios');
    ok((await api({ accion: 'cargarReciboServicio', ...I, servicio: 'AGUA', base64: PNG, mimeType: 'image/png' })).ok, 'carga el de agua');
    ok((await api({ accion: 'cargarReciboServicio', ...I, servicio: 'LUZ', base64: PNG, mimeType: 'image/png' })).ok, 'carga el de luz');
    ok(!(await api({ accion: 'cargarReciboServicio', ...I, servicio: 'LUZ', base64: PNG, mimeType: 'text/plain' })).ok, 'un archivo que no es PDF ni foto no pasa');
    ok((await api({ accion: 'cargarReciboServicio', ...I, servicio: 'GAS', noAplica: true })).ok, 'dice que no tiene gas');
    ok((await correos()).length === 2, 'a Leonardo le llega cada recibo por revisar');
    ok(!(await api({ accion: 'revisarReciboServicio', ...I, servicio: 'AGUA', aprobar: true })).ok, 'el inquilino no puede aprobar');
    ok(!(await api({ accion: 'revisarReciboServicio', ...A, servicio: 'LUZ', aprobar: false })).ok, '"no es" sin motivo no pasa');
    ok((await api({ accion: 'revisarReciboServicio', ...A, servicio: 'LUZ', aprobar: false, motivo: 'Es del mes pasado' })).ok, 'Leonardo devuelve el de luz con motivo');
    const n3 = await correos();
    ok(n3.length === 1 && /luz/.test(n3[0].asunto), 'al inquilino le llega para cargarlo de nuevo');
    ok((await api({ accion: 'cargarReciboServicio', ...I, servicio: 'LUZ', base64: PNG, mimeType: 'image/png' })).ok, 'lo carga de nuevo');
    for (const s of ['AGUA', 'LUZ']) ok((await api({ accion: 'revisarReciboServicio', ...A, servicio: s, aprobar: true })).ok, 'Leonardo aprueba ' + s.toLowerCase());
    const infoP = await api({ accion: 'infoRecibo', ...P });
    ok(infoP.recibos.AGUA.estado === 'APROBADO' && !infoP.recibos.AGUA.url, 'el propietario ve el estado pero no el archivo');
    await correos();

    console.log('\n4. Inventario y cierre');
    ok(!(await api({ accion: 'cerrarRecibo', ...A })).ok, 'sin inventario no se puede cerrar');
    const foto = await api({ accion: 'subirFotoRecibo', ...A, espacio: 'Cocina', base64: PNG, mimeType: 'image/png' });
    ok(foto.ok && /drive\.google\.com/.test(foto.url), 'sube una foto de un espacio');
    ok(!(await api({ accion: 'guardarInventarioRecibo', ...A, espacios: [{ nombre: 'Cocina', estado: 'NOVEDAD', nota: '' }] })).ok, 'una novedad sin nota no pasa');
    const espacios = ['Sala y comedor', 'Cocina', 'Baño principal'].map(n => ({ nombre: n, estado: 'CONFORME', nota: '', fotos: n === 'Cocina' ? [foto.url, 'https://otro.sitio/x'] : [] }));
    ok((await api({ accion: 'guardarInventarioRecibo', ...A, espacios })).ok, 'guarda 3 espacios conformes');
    const infoA = await api({ accion: 'infoRecibo', ...A });
    ok(infoA.espacios.length === 3 && infoA.espacios[1].fotos.length === 1, 'quedan guardados (el enlace que no es de Drive se descarta)');
    console.log('     inventario de la entrega:', infoA.inventario ? 'encontrado' : 'NO encontrado', '· firma el paz y salvo:', infoA.firmante);
    r = await api({ accion: 'cerrarRecibo', ...A });
    ok(r.ok, 'cierre: ' + (r.mensaje || ''));
    const n4 = await correos();
    e = await T('estado');
    ok(e.rec.estado === 'RECIBIDO' && e.recibido, 'queda RECIBIDO (el motor de pagos deja de cobrar)');
    ok(e.estadoInm === 'PENDIENTE' && /listo para volver a publicar/.test(e.detalleInm), 'el inmueble queda PENDIENTE: ' + e.detalleInm);
    const conAdj = n4.filter(c => c.adjuntos >= 1);
    ok(conAdj.length === 2, 'a las dos partes les llega el cierre con adjuntos (' + conAdj.map(c => c.adjuntos).join(', ') + ')');
    ok(!!e.rec.cierre.informe && !!e.rec.cierre.pazYSalvo, 'salieron el informe y el paz y salvo');
    ok(!(await api({ accion: 'cerrarRecibo', ...A })).ok, 'no se puede cerrar dos veces');
    if (salida) for (const [n, u] of [['informe', e.rec.cierre.informe], ['paz_y_salvo', e.rec.cierre.pazYSalvo]]) {
      if (!u) continue;
      const d = await T('pdfTexto', { url: u });
      const pdf = path.join(salida, 'recibo_' + n + '.pdf');
      fs.writeFileSync(pdf, Buffer.from(d.pdf, 'base64'));
      try { execFileSync(path.join(__dirname, '..', 'poppler', 'poppler-24.08.0', 'Library', 'bin', 'pdftoppm.exe'), ['-png', '-r', '70', pdf, pdf.replace(/\.pdf$/, '')]); } catch (x) {}
      console.log('     ' + n + ': ' + pdf);
    }

    console.log('\n5. El tope: pasa sin recibirse');
    await T('limpiar'); await T('preparar', { faltan: 10 }); await T('revisar', { hoy }); await correos();
    e = await T('estado');
    await T('revisar', { hoy: masDias(e.tope, 1) });
    let n5 = await correos();
    ok(n5.length === 1 && /sin recibir/.test(n5[0].asunto), 'a Leonardo le llega el caso');
    await T('revisar', { hoy: masDias(e.tope, 2) });
    ok((await correos()).length === 0, 'no lo repite');
    if (dejar) {
      await T('limpiar'); await T('preparar', { faltan: 10 }); await T('revisar', { hoy }); e = await T('estado');
      console.log('\nPara ver la página:\n  inquilino:   ' + e.urlI + '\n  propietario: ' + e.urlP + '\n  Leonardo:    ' + e.urlA);
    }
  } finally {
    if (!dejar) { console.log('\nlimpieza:', JSON.stringify(await T('limpiar'))); await T('off'); console.log('modo prueba apagado'); }
    else console.log('\n(--dejar) contrato corrido y modo prueba ACTIVO: correr limpiar y off después');
  }
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO BIEN');
})().catch(x => { console.error('❌', x.message); process.exit(1); });
