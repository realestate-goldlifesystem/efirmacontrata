// Simula la mezcla del formulario (RegisterPropertyForm.tsx, renovación): la fila del
// inmueble debe ganar sobre los valores por defecto, salvo lo editable.
// Uso: node test_renovacion_conserva_fila.js <ID DE REGISTRO>
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
(async () => {
  const s = google.sheets({ version: 'v4', auth });
  const r = await s.spreadsheets.values.get({ spreadsheetId: '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', range: "'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ" });
  const [h, ...f] = r.data.values; const row = f.find(x => x[h.indexOf('ID DE REGISTRO')] === process.argv[2]);
  const orig = {}; h.forEach((k, j) => { if (k.trim()) orig[k.trim()] = row[j] || ''; });
  const p = { accion: 'registrarInmueble', 'N° de Garajes': 'Ningun', 'PUNTO DE AGUA': 'NO', '¿Que tipo de cocina es?': '', ' [Zona interna #1 Citófono]': '',
    'PRECIO DE PROMOCION GENERAL': 9999, 'Ciudad de Expedicion': '', 'Celular': '3001112233', '¿Qué tipo de autorización desea con el agente?': 'NUEVA' };
  const editable = /PRECIO|PORCENTAJE|Porcentaje|autorizaci|portería|NOMBRE DEL INMUEBLE|administración desde|Correo electrónico de la administración|TIPO DE NEGOCIO|Fecha de registro/;
  const delPropietario = /PROPIETARIO|documento|Expedicion|celular|Celular|^Correo electrónico$/;
  const tecnicas = /^(accion|idEnvio|reutilizarMultimedia|flujoSolicitado|idInmuebleOriginal|cdrInmuebleOriginal)$/;
  const enPayload = new Map(Object.keys(p).map(k => [k.trim(), k]));
  const claves = new Set([...enPayload.keys(), ...Object.keys(orig).filter(k => /^\[|^¿/.test(k))]);
  claves.forEach(k => { if (tecnicas.test(k) || editable.test(k) || !(k in orig)) return; const d = enPayload.get(k) ?? k; const o = orig[k] ?? '';
    if (delPropietario.test(k)) { if (!String(p[d] ?? '').trim()) p[d] = o; return; } p[d] = o; });
  const ok = (c, m) => console.log(c ? 'OK ' : 'MAL', m);
  ok(p['N° de Garajes'] === orig['N° de Garajes'], 'garajes = ' + p['N° de Garajes']);
  ok(p['PUNTO DE AGUA'] === orig['PUNTO DE AGUA'], 'agua = ' + p['PUNTO DE AGUA']);
  ok(p['¿Que tipo de cocina es?'] === orig['¿Que tipo de cocina es?'], 'cocina = ' + p['¿Que tipo de cocina es?']);
  ok(p[' [Zona interna #1 Citófono]'] === orig['[Zona interna #1 Citófono]'] && !('[Zona interna #1 Citófono]' in p), 'zona en su clave original = ' + p[' [Zona interna #1 Citófono]']);
  ok(p['PRECIO DE PROMOCION GENERAL'] === 9999, 'precio editado se respeta');
  ok(p['¿Qué tipo de autorización desea con el agente?'] === 'NUEVA', 'autorización editada se respeta');
  ok(p['Celular'] === '3001112233', 'celular nuevo se respeta');
  ok(p['Ciudad de Expedicion'] === orig['Ciudad de Expedicion'], 'ciudad vacía se completa = ' + p['Ciudad de Expedicion']);
  ok(p['[Zona comunal #1 Ascensor]'] === orig['[Zona comunal #1 Ascensor]'], 'zona comunal agregada = ' + p['[Zona comunal #1 Ascensor]']);
})();
