// Vista previa local de un correo de cita (sin enviar nada). Uso: node preview_correo_cita.js R60 [salida.html]
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..', 'backend');
const ctx = {
  Session: { getScriptTimeZone: () => 'America/Bogota' },
  Utilities: { formatDate: (d) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' },
  urlEstadoCita: () => '#', urlVisitaInmueble: () => '#?i=EJEMPLO', botonesPropietarioCita: () => '',
  ESTADOS_CITA: { CANCELADA: 'CANCELADA', QUIERE_REAGENDAR: 'QUIERE REAGENDAR' },
  formatAmPm: (d) => { let h = d.getHours(), m = d.getMinutes(); const s = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + s; },
  console, Date, Math, JSON, String, Object
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, 'CORREOS_CITA.js'), 'utf8'), ctx);
const paso = process.argv[2] || 'R60';
const inicio = new Date(Date.now() + 60 * 60000); inicio.setSeconds(0, 0);
const m = ctx.correoPasoCita(paso, { inicio, servicio: 'Visita al inmueble', direccion: 'Cra 10A #134B-18 · Lisboa', idCita: 'EJEMPLO', token: 'x', idInmueble: 'EJEMPLO', nombre: 'Ana' });
let html = fs.readFileSync(path.join(raiz, 'email_cita.html'), 'utf8')
  .replace(/<\? if \(typeof MENSAJE_SECUNDARIO[^?]*\?>/, '').replace(/<\? \} \?>/, '')
  .replace('<?!= MENSAJE_PRINCIPAL ?>', m.mensaje).replace('<?!= MENSAJE_SECUNDARIO ?>', m.secundario || '')
  .replace(/<\?= NOMBRE_CLIENTE \?>/g, m.nombre || 'Ana').replace(/<\?= TITULO \?>/g, m.titulo);
html = html.replace('<body', `<body data-asunto="${m.asunto}"`);
const salida = process.argv[3] || path.join(__dirname, 'preview_correo_' + paso + '.html');
fs.writeFileSync(salida, `<!-- Asunto: ${m.asunto} -->\n` + html);
console.log('Asunto:', m.asunto, '\n->', salida);
