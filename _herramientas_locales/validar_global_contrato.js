// Prueba global de la etapa 3 (renovar/terminar → IPC → sala de recibo) en el inmueble de PRUEBA, sin correos.
// A: renuevan → esperan el IPC → se destraba → propietario → aprobación → mes 13 → terminan el año 2 → recibo sin novedades.
// B: terminan el año 1 → recibo con novedad (sin paz y salvo). Restaura todo. Requiere el case TEMP_global. 30-oct-2026.
const API = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
async function api(o) {
  for (let k = 0; k < 3; k++) {
    try { const r1 = await fetch(API, { method: 'POST', body: JSON.stringify(o), redirect: 'manual' }); return JSON.parse(await (await fetch(r1.headers.get('location'))).text()); }
    catch (e) { if (k === 2) throw e; await new Promise(z => setTimeout(z, 6000)); }
  }
}
const ID = 'ZA471452', T = (que, x) => api(Object.assign({ accion: 'TEMP_global', que, id: ID }, x || {}));
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
let fallas = 0, nLog = 0;
const ok = (c, m) => { console.log(c ? '  OK ' : '  MAL', m); if (!c) fallas++; };
async function correos() { const l = (await T('log')).correos || []; const n = l.slice(nLog); nLog = l.length; n.forEach(c => console.log('     ✉', String(c.para).replace(/@.*/, '@…'), '| adj', c.adjuntos, '|', c.asunto)); return n; }
const enl = u => Object.fromEntries(new URL(u).searchParams);
const masDias = (s, n) => { const x = new Date(s + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

async function recibo(e, conNovedad) {
  await T('revisarRecibo', { hoy: masDias(e.fin, -16) });
  ok(!(await T('estado')).rec.estado, 'faltando 16 días la sala sigue cerrada');
  await T('revisarRecibo', { hoy: masDias(e.fin, -15) });
  e = await T('estado');
  ok(e.rec.estado === 'ABIERTA', 'faltando 15 días se abre la sala de recibo');
  await correos();
  const I = enl(e.urlI), P = enl(e.urlP), A = enl(e.urlA), libres = [];
  for (let d = -10; d <= 3 && libres.length < 3; d++) ((await api({ accion: 'disponibilidadRecibo', ...I, fecha: masDias(e.fin, d) })).slots || []).slice(0, 1).forEach(s => libres.push(s.timestamp));
  ok(libres.length === 3 && (await api({ accion: 'proponerRecibo', ...I, pedidos: libres })).ok, 'el inquilino propone 3 horarios');
  ok((await api({ accion: 'responderRecibo', ...P, timestamp: libres[1] })).ok, 'el propietario elige uno');
  for (const s of ['AGUA', 'LUZ']) { await api({ accion: 'cargarReciboServicio', ...I, servicio: s, base64: PNG, mimeType: 'image/png' }); await api({ accion: 'revisarReciboServicio', ...A, servicio: s, aprobar: true }); }
  await api({ accion: 'cargarReciboServicio', ...I, servicio: 'GAS', noAplica: true });
  await correos();
  ok((await api({ accion: 'guardarInventarioRecibo', ...A, espacios: [{ nombre: 'Sala', estado: 'CONFORME' }, conNovedad ? { nombre: 'Cocina', estado: 'NOVEDAD', nota: 'Mesón rayado' } : { nombre: 'Cocina', estado: 'CONFORME' }] })).ok, 'Leonardo marca el inventario');
  const r = await api({ accion: 'cerrarRecibo', ...A });
  ok(r.ok, r.mensaje || 'cierre');
  const n = await correos();
  ok(n.filter(c => c.adjuntos === (conNovedad ? 1 : 2)).length === 2, `las dos partes reciben ${conNovedad ? 'solo el informe' : 'informe y paz y salvo'}`);
  e = await T('estado');
  ok(e.recibido && e.rec.estado === 'RECIBIDO' && e.estadoInm === 'PENDIENTE', 'RECIBIDO, cobros apagados, inmueble PENDIENTE');
  ok(conNovedad ? !e.rec.cierre.pazYSalvo : !!e.rec.cierre.pazYSalvo, conNovedad ? 'con novedad no sale paz y salvo' : 'salió el paz y salvo');
  return e;
}

(async () => {
  try {
    const on = await T('on');
    if (on.otrosEsperando || on.ipc2026 !== null) throw new Error('No es seguro seguir: hay ajustes reales esperando IPC o ya existe IPC_2026 ' + JSON.stringify(on));
    console.log('\n=== A. Renuevan → IPC → año 2 → terminan → recibo ===');
    await T('preparar', { faltan: 105 });
    let e = await T('estado');
    const finAno1 = e.fin;
    await T('revisarRenov', { hoy: masDias(e.limite, -15) });
    ok((await correos()).length === 2, 'parte 1: el aviso de renovación sale a las dos partes');
    ok((await api({ accion: 'decidirRenovacion', ...enl(e.urlIR), decision: 'RENOVAR' })).ok, 'el inquilino renueva');
    ok((await api({ accion: 'decidirRenovacion', ...enl(e.urlPR), decision: 'RENOVAR' })).ok, 'el propietario renueva');
    await correos();
    e = await T('estado');
    ok(e.fin > finAno1, 'el contrato pasa al año 2: termina ' + e.fin);
    ok(e.ajuste && e.ajuste.estado === 'ESPERANDO_IPC' && e.ajuste.anioIpc === 2026, 'parte 2: se crea el ajuste y espera el IPC 2026 (el DANE aún no lo publica)');
    await T('ipc', { ipc: 5.1 });
    await correos();
    e = await T('estado');
    const canon = Math.round(e.ajuste.canonAnterior * 1.051 / 100) * 100;
    ok(e.ajuste.estado === 'ESPERANDO_PROPIETARIO' && e.ajuste.canonNuevo === canon, `al llegar el IPC sigue solo: canon ${e.ajuste.canonAnterior} → ${canon}`);
    ok((await api({ accion: 'enviarAjustePropietario', ...enl(e.urlAjP), admin: '260000', base64: PNG, mimeType: 'image/png' })).ok, 'el propietario envía administración y recibo');
    ok((await api({ accion: 'revisarAjusteAnual', ...enl(e.urlAjA), decision: 'APROBAR' })).ok, 'Leonardo aprueba');
    const nA = await correos();
    ok(nA.filter(c => c.adjuntos === 1).length === 2, 'las dos partes reciben el acta de incremento');
    e = await T('estado');
    ok(e.mes12.canon === e.ajuste.canonAnterior && e.mes13.canon === canon && e.mes13.admin === 260000, 'el mes 12 conserva el valor y el mes 13 toma el nuevo');
    const m = await T('momento', { hoy: masDias(finAno1, 1) });
    ok(m.momento === 'vigente' && m.mes === 13, 'el día siguiente al año 1 el contrato sigue vigente, mes 13');
    ok(!e.recibido, 'los cobros siguen activos');
    await T('revisarRecibo', { hoy: masDias(e.fin, -5) });
    ok(!(await T('estado')).rec.estado, 'renovado: no se abre sala de recibo');
    const t = await api({ accion: 'decidirRenovacion', ...enl(e.urlIR), decision: 'TERMINAR', motivo: 'Mudanza' });
    ok(t.ok, 'en el año 2 el inquilino termina');
    ok((await correos()).filter(c => c.adjuntos === 1).length === 2, 'notificación de terminación a las dos partes');
    await recibo(await T('estado'), false);

    console.log('\n=== B. Terminan en el año 1 → recibo con novedad ===');
    await T('preparar', { faltan: 105 });
    e = await T('estado');
    ok((await api({ accion: 'decidirRenovacion', ...enl(e.urlPR), decision: 'TERMINAR', motivo: 'Venta del inmueble' })).ok, 'el propietario termina');
    await correos();
    e = await T('estado');
    ok(e.fin === finAno1 && !e.ajuste, 'no se suma otro año ni se crea ajuste de IPC');
    await recibo(e, true);
    const fuera = await T('momento', { hoy: masDias(e.tope, 1) });
    ok(fuera.momento === 'terminado', 'pasado el tope el contrato queda terminado');
  } finally {
    console.log('\nlimpieza:', JSON.stringify(await T('limpiar'))); await T('off'); console.log('modo prueba apagado');
  }
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO BIEN');
})().catch(x => { console.error('❌', x.message); process.exit(1); });
