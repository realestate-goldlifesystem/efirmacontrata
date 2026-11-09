// Renderiza el correo de corrección (enviarCorreoCorreccion) a un HTML local, sin enviar nada.
// Uso: node vista_correo_correccion.js <salida.html>   (datos inventados)
const fs = require('fs');
const path = require('path');
const leer = f => fs.readFileSync(path.join(__dirname, '..', 'backend', f), 'utf8');
const d = leer('ESTADOS DOCUMENTALES.js'), g = leer('GESTOR_PLAZOS.js');
const fn = (src, nombre) => src.match(new RegExp('function ' + nombre + '\\([\\s\\S]*?\\n\\}'))[0];

let out;
global.enviarCorreo_ = m => { out = m; };
global.CONFIG_DOCUMENTAL = { COLUMNAS: { EMAIL_PROPIETARIO: 'e', EMAIL_INQUILINO: 'e' } };
global.getSheetDocumental = () => 0;
global.findRowByCDRDocumental = () => 2;
global.safeGetValueDocumental = (s, r, c) => (c === 'e' ? 'prueba@example.com' : 'ANA MARIA PEREZ');
global.obtenerIdRegistro = () => 'AB123456';
global.logAccionDocumental = () => {};
global.logErrorDocumental = console.log;

const codigo = ['plzEsc', 'plzNombrePropio', 'plzHtml', 'plzP', 'plzCaja'].map(n => fn(g, n))
  .concat([fn(d, 'nombreDocumentoLegible'), fn(d, 'enviarCorreoCorreccion')]).join('\n');
eval(codigo + `
enviarCorreoCorreccion('REG_X', 'propietario', {
  documentos: ['🧾 [Propietario] FACTURA_AGUA_[REG_01-01-2026-A1_(CALLE 1 #2-3)].jpg', '🧾 [Propietario] FACTURA_LUZ_[REG_X].jpg'],
  observaciones: 'El inquilino retomó el trámite. Estos son los documentos que siguen pendientes por corregir.'
});`);
console.log(out.subject);
fs.writeFileSync(process.argv[2] || 'correo_correccion.html', '<meta charset="utf-8">' + out.htmlBody);
