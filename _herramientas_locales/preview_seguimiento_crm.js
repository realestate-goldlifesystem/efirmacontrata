// Vista previa local del resumen diario de seguimiento del CRM (SEGUIMIENTO_CRM.js), con datos de ejemplo.
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..', 'backend');
const ctx = { console, encodeURIComponent, String, Math,
  ICONOS_CORREO_CITA: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/assets/correo/',
  celularInternacional_: c => '57' + c, SpreadsheetApp: { getActiveSpreadsheet: () => ({ getUrl: () => '#' }) } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, 'SEGUIMIENTO_CRM.js'), 'utf8'), ctx);
const lista = [
  { gid: 0, fila: 10, negocio: 'Arriendo', estado: 'CITA CANCELADA', dias: 2, nombre: 'Ana Prueba', celular: '3000000000', lugar: 'Cedritos, Usaquén', valor: '$2.650.000', nota: 'Cita cancelada por el propietario (CIT-000000)' },
  { gid: 0, fila: 11, negocio: 'Venta', estado: 'SEGUIMIENTO', dias: 4, nombre: 'Carlos Ejemplo', celular: '3110000000', lugar: 'Lisboa, Suba', valor: '$520.000.000', nota: 'Solo presentación: falta volver a captar (CIT-000001)' }
];
const cuerpo = ctx.htmlSeguimientoCRM_(lista);
let html = fs.readFileSync(path.join(raiz, 'email_cita.html'), 'utf8')
  .replace(/<\? if \(typeof MENSAJE_SECUNDARIO[^?]*\?>/, '').replace(/<\? \} \?>/, '')
  .replace('<?!= MENSAJE_PRINCIPAL ?>', cuerpo).replace('<?!= MENSAJE_SECUNDARIO ?>', '')
  .replace(/<\?= NOMBRE_CLIENTE \?>/g, 'Leonardo').replace(/<\?= TITULO \?>/g, 'SEGUIMIENTO DEL CRM');
fs.writeFileSync(path.join(__dirname, 'preview_seguimiento_crm.html'), html);
console.log('ok');
