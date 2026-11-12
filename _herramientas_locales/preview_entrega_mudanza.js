// Muestra (sin enviar) de los dos correos propuestos: entrega = paso 1 de 2, y cierre "Todo listo". 11-nov-2026.
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..', 'backend');
const ctx = { Session: { getScriptTimeZone: () => 'America/Bogota' }, Utilities: { formatDate: (d) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' },
  urlEstadoCita: () => '#', urlVisitaInmueble: () => '#', ESTADOS_CITA: {}, console, Date, Math, JSON, String, Object, encodeURIComponent,
  formatAmPm: (d) => { let h = d.getHours(), m = d.getMinutes(); const s = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + s; } };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(raiz, 'CORREOS_CITA.js'), 'utf8'), ctx);
const plantilla = fs.readFileSync(path.join(raiz, 'email_cita.html'), 'utf8').replace(/<\? if \(typeof MENSAJE_SECUNDARIO[^?]*\?>/, '').replace(/<\? \} \?>/, '');
const armar = (titulo, nombre, msg, sec) => plantilla.replace('<?!= MENSAJE_PRINCIPAL ?>', msg).replace('<?!= MENSAJE_SECUNDARIO ?>', sec || '')
  .replace(/<\?= NOMBRE_CLIENTE \?>/g, nombre).replace(/<\?= TITULO \?>/g, titulo);
const dir = 'CRA 7 #150-20 · CEDRITOS, BOGOTÁ';
const entrega = new Date(2026, 10, 13, 14, 0), mudanza = new Date(2026, 10, 14, 9, 0);

// Pasos: ✓ Entrega → ② Mudanza → Todo listo
const paso = (n, txt, est) => {
  const c = est === 'hecho' ? ['#1c1917', '#d4af37', '✓'] : est === 'actual' ? ['#b8860b', '#ffffff', n] : ['#e7e5e4', '#a8a29e', n];
  const t = est === 'pendiente' ? '#a8a29e' : '#1c1917';
  return `<td align="center" style="width:33%;"><div style="width:30px;height:30px;line-height:30px;border-radius:15px;background:${c[0]};color:${c[1]};font-weight:bold;font-size:14px;margin:0 auto;">${c[2]}</div>` +
    `<div style="font-size:12px;color:${t};margin-top:6px;font-weight:${est === 'actual' ? 'bold' : 'normal'};">${txt}</div></td>`;
};
const linea = (on) => `<td style="width:10%;"><div style="height:2px;background:${on ? '#d4af37' : '#e7e5e4'};margin-bottom:18px;"></div></td>`;
const pasos = (e) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 18px;"><tr>${paso('1', 'Entrega', e[0])}${linea(e[0] === 'hecho')}${paso('2', 'Mudanza', e[1])}${linea(e[1] === 'hecho')}${paso('3', 'Todo listo', e[2])}</tr></table>`;
const boton = (txt, url) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 4px;"><tr><td align="center"><a href="${url}" style="display:block;background:#b8860b;color:#ffffff;font-weight:bold;font-size:16px;padding:15px;border-radius:12px;text-decoration:none;">${txt}</a></td></tr></table>`;
const fecha = (d) => { const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], m = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']; return dias[d.getDay()] + ' ' + d.getDate() + ' de ' + m[d.getMonth()]; };

// 1) Paso 1 listo: resumen compacto de la entrega, protagonista la mudanza
const resumen = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 6px;border:1px solid #e7e5e4;border-radius:12px;"><tr><td style="padding:12px 16px;">` +
  `<div style="color:#a16207;font-size:11px;letter-spacing:2px;font-weight:bold;">✓ ENTREGA ACORDADA</div>` +
  `<div style="color:#1c1917;font-size:16px;font-weight:bold;margin-top:3px;">${fecha(entrega)} · ${ctx.formatAmPm(entrega)}</div>` +
  `<div style="color:#78716c;font-size:13px;margin-top:2px;">${dir}</div></td></tr></table>`;
const c1 = pasos(['hecho', 'actual', 'pendiente']) + 'Ya tienes fecha para recibir tu nuevo hogar. 🎉' + resumen +
  `<div style="margin-top:20px;font-size:18px;font-weight:bold;color:#1c1917;">Ahora elige el día de tu mudanza</div>` +
  `<div style="color:#57534e;margin-top:6px;">Siempre después de la entrega. Así coordinamos con la administración del conjunto el ingreso de tus cosas.</div>` +
  boton('🚚 Elegir mi mudanza', '#') +
  `<p style="margin:10px 0 0;font-size:13px;color:#78716c;text-align:center;">Antes de la entrega te avisaremos y una hora antes te pediremos que la confirmes.</p>`;

// 2) Cierre: las dos fechas en una tarjeta, con los botones de siempre
const filaFecha = (et, d, extra) => `<div style="color:#d4af37;font-size:12px;letter-spacing:2px;font-weight:bold;">${et}</div>` +
  `<div style="color:#ffffff;font-size:19px;font-weight:bold;margin-top:4px;">${fecha(d)}</div><div style="color:#e7e5e4;font-size:15px;margin-top:2px;">${ctx.formatAmPm(d)}${extra}</div>`;
const botones = ctx.botonesTarjetaCita_({ nombre: 'Laura', servicio: 'Entrega del inmueble', direccion: dir }, fecha(entrega), ctx.formatAmPm(entrega)).replace(/<img[^>]*>/g, '');
const tarjeta2 = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-radius:12px;background:#1c1917;"><tr><td style="padding:16px 18px;">` +
  filaFecha('🔑 ENTREGA', entrega, ' · Recibes el inmueble') +
  `<div style="border-top:1px solid #33302d;margin:14px 0;"></div>` + filaFecha('🚚 MUDANZA', mudanza, ' · Ingreso de tus cosas') +
  `<div style="color:#a8a29e;font-size:14px;margin-top:12px;">📍 ${dir}</div>` + botones + '</td></tr></table>';
const c2 = pasos(['hecho', 'hecho', 'hecho']) + '<strong>Ya está todo coordinado para tu llegada.</strong> Con estas fechas preparamos los documentos para la administración del conjunto.' + tarjeta2 +
  'Te avisaremos antes de cada fecha. <strong>Una hora antes de la entrega te pediremos que la confirmes.</strong>';
const sec2 = '<p style="margin:16px 0 0 0;font-size:13px;text-align:center;">📅 <a href="#" style="color:#a16207;font-weight:bold;">Guardar en mi calendario</a></p>';

fs.writeFileSync(path.join(__dirname, 'muestra_entrega_paso1.html'), armar('PASO 1 LISTO', 'LAURA GÓMEZ', c1, ''));
fs.writeFileSync(path.join(__dirname, 'muestra_entrega_todo_listo.html'), armar('¡TODO LISTO!', 'LAURA GÓMEZ', c2, sec2));
console.log('ok');
