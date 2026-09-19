// Llena la plantilla REAL de Autocrat (bajada por la Service Account) con cada
// combinación de valores que permite el formulario y la pasa por
// pulirDescripcion(). Marca cualquier defecto conocido.
//
// Uso: node test_descripcion_combinaciones.js [--ver]   (--ver imprime cada caso)
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');

const lib = fs.readFileSync(path.join(__dirname, '../backend/LIB_TextExtractor.js'), 'utf8');
const pulirDescripcion = new Function(lib.slice(lib.indexOf('function pulirDescripcion(')) + '\nreturn pulirDescripcion;')();
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'] });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const VER = process.argv.includes('--ver');
const H = 'ㅤ'; // relleno invisible que pone el formulario

const DEFECTOS = [
  [/\(es\)|\(s\)/, 'plural genérico'], [/El\/la/, 'El/la'], [/\$\s*\$/, '$ repetido'],
  [/[●○]\s*[●○]/, 'viñeta repetida'], [/^[●○]\s*$/m, 'viñeta vacía'], [/ㅤ/, 'invisible'],
  [/\bvia\b/, 'via'], [/\bDeposito\b/, 'Deposito'], [/<<|>>/, 'etiqueta sin llenar'],
  [/Ning[uú]n/i, 'Ningun'], [/Comunal parqueadero/i, 'Comunal parqueadero'],
  [/adicionando que\s*[.\n]/, 'adicionando que vacío'], [/como:\s*$/m, '"como:" colgando'],
  [/:\s*\n\s*\n\s*(?:[^\w\s●○•]|todo)/, 'sección vacía'], [/cocina \w+ (u|isla)\b/i, 'cocina u/isla'],
  [/\b(\w+) \1\b/i, 'palabra repetida'], [/ {2,}/, 'doble espacio'],
];

function llenar(tpl, v) {
  return tpl.replace(/<<([^>]+)>>/g, (m, tag) => (tag in v ? v[tag] : ''));
}

(async () => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc', range: "'DO NOT DELETE - AutoCrat Job Settings'!A1:C20" });
  const tplId = r.data.values.find(x => x[1] === 'CORRETAJE')[2];
  const txt = (await drive.files.export({ fileId: tplId, mimeType: 'text/plain' }, { responseType: 'text' })).data;
  const i = txt.indexOf('DESCRIPCIÓN DEL INMUEBLE') + 'DESCRIPCIÓN DEL INMUEBLE'.length;
  const fin = 'y vive en el apartamento de tus sueños';
  const tpl = txt.slice(i, txt.indexOf(fin, i) + fin.length).replace(/^\s*\n/, '');

  const base = {
    OTROBARRIO: 'CEDRO NARVAEZ', 'DIRECCIÓN DEL INM': 'Cl 143 #9-55', HAB: '2', 'BAÑ': '2', AREA: '60',
    'PRECIO DE ARRIENDO EN NUM': '$ 3.100.000', 'TIPO INM': 'Apartamento', 'TPO VÍA': 'Secundaria',
    'INT-EXT': 'Exterior', 'Zona Residencial': 'Zona Residencial' + H, 'TPO VIGILANCIA': 'vigilancia de celaduría',
    'EST COCINA': 'Americana', 'TPO COCINA': 'Integral', GAR: '1', 'IND-SER': 'Independiente', 'CUB-DES': 'Cubierto',
    'ESTUDIO': '•Estudio' + H, 'BALCÓN': '•Balcón' + H, 'DEPÓSITO': 'Deposito' + H, 'DESCRIPCIÓN DEL INMUEBLE': 'tiene persianas',
    ASCENSOR: '•Ascensor' + H, 'ZONA INFANTIL': '•Zona Infantil' + H, GYM: '•Gimnasio' + H,
    'PRECIO DE ADMIN EN NUM': '455.000', 'MEDIDA ESPACIO NEVERA': '0.60x0.70x1.80', 'PUNTO DE AGUA': 'SI',
    'MEDIDA ESPACIO LAVADORA': '0.69x0.66x1.13', 'PUNTO DE GAS': 'SI',
    'MED HABITACIÓN PRINCIPAL': 'Dormitorio principal: Cama doble (matrimonial) + Mesas de noche (1.35 m + 0.60 m x 2) en total: 2.55 m',
    MASCOTAS: 'SI', 'CUALES MASCOTAS': 'Solo perros',
  };

  const casos = [];
  for (const gar of ['Ningun', 'Comunal', '1', '3']) {
    for (const ind of (gar === 'Ningun' ? [''] : ['Independiente', 'Servidumbre'])) {
      for (const cub of (gar === 'Ningun' ? [''] : ['Cubierto', 'Descubierto'])) {
        casos.push([`garaje ${gar} ${ind} ${cub}`, { GAR: gar, 'IND-SER': ind, 'CUB-DES': cub }, gar]);
      }
    }
  }
  for (const est of ['Abierta(CO)', 'cerrada', 'Americana', 'Isla', 'U'])
    for (const tipo of ['Integral', 'Semi-Integral']) casos.push([`cocina ${est} ${tipo}`, { 'EST COCINA': est, 'TPO COCINA': tipo }]);
  for (const via of ['Principal', 'Secundaria', 'Privada']) casos.push([`vía ${via}`, { 'TPO VÍA': via }]);
  for (const vista of ['Interior', 'Exterior', 'Interior y Exterior']) casos.push([`vista ${vista}`, { 'INT-EXT': vista }]);
  for (const vig of ['vigilancia de celaduría', 'vigilancia electrónica', 'puerta de seguridad']) casos.push([`vigilancia ${vig}`, { 'TPO VIGILANCIA': vig }]);
  casos.push(['mascotas NO', { MASCOTAS: 'NO', 'CUALES MASCOTAS': '' }]);
  casos.push(['mascotas SI todas', { MASCOTAS: 'SI', 'CUALES MASCOTAS': 'Todas las mascotas' }]);
  casos.push(['sin depósito', { 'DEPÓSITO': H }]);
  casos.push(['sin características ni texto', { ESTUDIO: '', 'BALCÓN': '', 'DEPÓSITO': H, 'DESCRIPCIÓN DEL INMUEBLE': '' }]);
  casos.push(['solo texto libre', { ESTUDIO: '', 'BALCÓN': '', 'DEPÓSITO': H, 'DESCRIPCIÓN DEL INMUEBLE': 'Tiene persianas' }]);
  casos.push(['características sin texto', { 'DESCRIPCIÓN DEL INMUEBLE': '' }]);
  casos.push(['sin zonas comunales', { ASCENSOR: '', 'ZONA INFANTIL': '', GYM: '' }]);
  casos.push(['sin administración', { 'PRECIO DE ADMIN EN NUM': '' }]);
  casos.push(['1 habitación 1 baño', { HAB: '1', 'BAÑ': '1' }]);
  for (const t of ['Casa', 'Apartaestudio']) casos.push([`tipo ${t}`, { 'TIPO INM': t }, '1', t]);

  let fallas = 0;
  for (const [nombre, cambios, garajes, tipoInm] of casos) {
    const lleno = llenar(tpl, { ...base, ...cambios });
    const lineas = lleno.split(/\r?\n/).map(l => l.replace(/^ {3,}\* /, '○ ').replace(/^\* /, '● '));
    const dep = String(({ ...base, ...cambios })['DEPÓSITO']).includes('Deposito');
    const out = pulirDescripcion(lineas, { numGarajes: garajes || '1', tieneDeposito: dep, codigoRegistro: 'AB123', tipoInmueble: tipoInm || 'Apartamento' });
    const malos = DEFECTOS.filter(([re]) => re.test(out)).map(([, n]) => n);
    if (malos.length) fallas++;
    const clave = out.split('\n').filter(l => /parqueadero|cocina|vía|vista|vigilancia|mascotas|características|Zonas Comunales|Administración|habitaci|casa|apartaestudio/i.test(l));
    console.log(`${malos.length ? '❌' : '✅'} ${nombre}${malos.length ? '  → ' + malos.join(', ') : ''}`);
    if (VER || malos.length) console.log('   ' + (VER ? out.replace(/\n/g, '\n   ') : clave.join('\n   ')));
  }
  console.log(fallas ? `\n${fallas} caso(s) con defectos de ${casos.length}` : `\n✅ ${casos.length} combinaciones sin defectos`);
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
