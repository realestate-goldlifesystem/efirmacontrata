// Vista previa local del correo al agente cuando empieza una presentación (CITA_EN_CURSO.js).
// Uso: node preview_correo_inicio_cita.js [VIRTUAL]   → genera preview_inicio_cita.html (no envía nada)
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..', 'backend');
const virtual = process.argv[2] === 'VIRTUAL';
let capturado = null;
const ctx = {
  console, encodeURIComponent, String, Object,
  ICONOS_CORREO_CITA: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/assets/correo/',
  ESTADOS_CITA: { ASISTIDA: 'ASISTIDA', INASISTIDA: 'INASISTIDA' },
  urlEstadoCita: () => '#', correoAgenteCitas: () => 'agente@ejemplo.com',
  etiquetaTipoCitaHtml: () => '', celularInternacional_: () => '573000000000',
  valorCita: (f, c, n) => ({ MODALIDAD: virtual ? 'VIRTUAL' : 'PRESENCIAL', 'LINK MEET': virtual ? 'https://meet.google.com/abc-defg-hij' : '', CELULAR: '3000000000' }[n] || ''),
  enviarCorreoCita: (dest, asunto, titulo, nombre, msg, sec) => { capturado = { asunto, titulo, nombre, msg, sec }; }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, 'API_AGENDA.js'), 'utf8').match(/function htmlBotonesCorreo[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, 'CITA_EN_CURSO.js'), 'utf8'), ctx);
ctx.correoInicioPresentacion_({}, {}, 'CIT-000000', 'tok', 'Ana Prueba', 'Arriendo', 'Cra 10A #134B-18, Lisboa, Bogotá', '10:00 AM');
let html = fs.readFileSync(path.join(raiz, 'email_cita.html'), 'utf8')
  .replace(/<\? if \(typeof MENSAJE_SECUNDARIO[^?]*\?>/, '').replace(/<\? \} \?>/, '')
  .replace('<?!= MENSAJE_PRINCIPAL ?>', capturado.msg).replace('<?!= MENSAJE_SECUNDARIO ?>', capturado.sec)
  .replace(/<\?= NOMBRE_CLIENTE \?>/g, capturado.nombre).replace(/<\?= TITULO \?>/g, capturado.titulo);
const salida = path.join(__dirname, 'preview_inicio_cita' + (virtual ? '_virtual' : '') + '.html');
fs.writeFileSync(salida, `<!-- Asunto: ${capturado.asunto} -->\n` + html);
console.log('Asunto:', capturado.asunto, '->', salida);
