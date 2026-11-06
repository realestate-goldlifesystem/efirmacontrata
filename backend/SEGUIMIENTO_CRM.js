// ==========================================
// SEGUIMIENTO AUTOMÁTICO DEL CRM DE CAPTACIONES (6-nov-2026)
// ==========================================
// Una vez al día (desde las 8 a. m.) llega a Leonardo un resumen con los propietarios
// que se están enfriando en "1 - CAPTACIONES A" y "1 - CAPTACIONES V":
//   - CITA CANCELADA sin tocar hace 2 días o más
//   - SEGUIMIENTO    sin tocar hace 3 días o más
// "Sin tocar" = la FECHA DE SEGUIMIENTO (se vuelve a sellar sola cada vez que se escribe
// en DETALLES DE SEGUIMIENTO o cambia el estado). Para que un propietario deje de salir:
// escribir cualquier nota en DETALLES o cambiarle el estado.
// Lo llama el motor de citas cada hora (API_CRON_AGENDA.js); solo actúa una vez al día.

const SEGUIMIENTO_CRM = {
  HORA_ENVIO: 8,
  DIAS: { 'CITA CANCELADA': 2, 'SEGUIMIENTO': 3 },
  MAX_EN_CORREO: 25
};

function revisarSeguimientoCRM_() {
  const tz = 'America/Bogota';
  const ahora = new Date();
  if (Number(Utilities.formatDate(ahora, tz, 'H')) < SEGUIMIENTO_CRM.HORA_ENVIO) return;
  const hoyTxt = Utilities.formatDate(ahora, tz, 'yyyy-MM-dd');
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SEGUIMIENTO_CRM_ENVIADO') === hoyTxt) return;
  props.setProperty('SEGUIMIENTO_CRM_ENVIADO', hoyTxt);

  const lista = propietariosPorRetomar_(ahora);
  if (!lista.length) return;
  enviarCorreoCita(correoAgenteCitas(), `📋 ${lista.length} propietario${lista.length > 1 ? 's' : ''} por retomar hoy`,
    'SEGUIMIENTO DEL CRM', 'Leonardo', htmlSeguimientoCRM_(lista), '');
}

/** Filas en CITA CANCELADA / SEGUIMIENTO que llevan los días configurados sin tocarse. */
function propietariosPorRetomar_(ahora) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const lista = [];
  SEGUIMIENTO_CAPTACIONES.HOJAS.forEach(nombreHoja => {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) return;
    const n = hoja.getLastRow() - SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + 1;
    if (n <= 0) return;
    const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
    const i = (nom) => enc.indexOf(nom);
    const datos = hoja.getRange(SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS, 1, n, enc.length).getValues();
    datos.forEach((f, k) => {
      const estado = normalizarEstadoCaptacion_(f[i(SEGUIMIENTO_CAPTACIONES.COL_ESTADO)]);
      const dias = SEGUIMIENTO_CRM.DIAS[estado];
      if (!dias) return;
      const fecha = f[i(SEGUIMIENTO_CAPTACIONES.COL_FECHA)];
      if (!(fecha instanceof Date)) return;
      const quietos = Math.floor((hoy - new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())) / 86400000);
      if (quietos < dias) return;
      const det = String(f[i(SEGUIMIENTO_CAPTACIONES.COL_DETALLES)] || '').trim().split('\n').pop();
      lista.push({
        hoja: hoja, gid: hoja.getSheetId(), fila: SEGUIMIENTO_CAPTACIONES.PRIMERA_FILA_DATOS + k,
        negocio: nombreHoja.slice(-1) === 'V' ? 'Venta' : 'Arriendo',
        estado: estado, dias: quietos,
        nombre: String(f[i('NOMBRE DEL PROPIETARIO')] || 'Sin nombre').trim(),
        celular: String(f[i('CELULAR')] || '').replace(/\D/g, ''),
        lugar: [f[i('UBICACIÓN')], f[i('LOCALIDAD')]].filter(Boolean).join(', '),
        valor: String(f[i('VALOR DE PROMOCIÓN')] || ''),
        nota: det.slice(0, 140)
      });
    });
  });
  // Primero las citas canceladas, luego los que más tiempo llevan quietos
  lista.sort((a, b) => (a.estado === b.estado ? b.dias - a.dias : a.estado === 'CITA CANCELADA' ? -1 : 1));
  return lista;
}

function htmlSeguimientoCRM_(lista) {
  const urlHoja = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const boton = (icono, texto, url) =>
    `<a href="${url}" target="_blank" style="display:inline-block;margin:6px 6px 0 0;padding:7px 12px;border-radius:8px;border:1px solid #6b5a22;background:#1c1917;` +
    'color:#f5f5f4;font-size:13px;font-weight:bold;text-decoration:none;font-family:Arial,sans-serif;">' +
    `<img src="${ICONOS_CORREO_CITA + icono}.png" width="14" height="14" alt="" style="vertical-align:-2px;margin-right:6px;border:0;">${texto}</a>`;
  const tarjeta = (p) => {
    const cel = celularInternacional_(p.celular);
    const saludo = encodeURIComponent('Hola ' + p.nombre.split(' ')[0] + ', soy Leonardo de Gold Life Real Estate. ' +
      (p.estado === 'CITA CANCELADA' ? 'Te escribo porque no alcanzamos a vernos; ¿te parece si buscamos otro espacio para presentarte nuestro servicio?' : 'Te escribo para retomar lo de tu inmueble; ¿cómo vas con los detalles que estaban pendientes?'));
    const color = p.estado === 'CITA CANCELADA' ? '#a3322a' : '#b8860b';
    return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 10px;border:1px solid #e7e5e4;border-left:4px solid ' + color + ';border-radius:10px;">' +
      '<tr><td style="padding:12px 14px;font-family:Arial,sans-serif;">' +
      `<div style="font-size:11px;font-weight:bold;letter-spacing:.5px;color:${color};">${p.estado} · ${p.negocio} · hace ${p.dias} días</div>` +
      `<div style="font-size:15px;font-weight:bold;color:#1c1917;margin-top:3px;">${p.nombre}</div>` +
      `<div style="font-size:13px;color:#57534e;margin-top:2px;">${[p.lugar, p.valor].filter(Boolean).join(' · ')}</div>` +
      (p.nota ? `<div style="font-size:12.5px;color:#78716c;margin-top:4px;font-style:italic;">“${p.nota}”</div>` : '') +
      '<div>' +
      (cel ? boton('whatsapp', 'WhatsApp', 'https://wa.me/' + cel + '?text=' + saludo) + boton('llamar', 'Llamar', 'tel:+' + cel) : '') +
      boton('publicacion', 'Abrir en el CRM', urlHoja + '#gid=' + p.gid + '&range=A' + p.fila) +
      '</div></td></tr></table>';
  };
  const visibles = lista.slice(0, SEGUIMIENTO_CRM.MAX_EN_CORREO);
  return 'Estos propietarios se están enfriando. Un mensaje hoy puede recuperar la captación.' +
    '<div style="margin:14px 0 0;">' + visibles.map(tarjeta).join('') + '</div>' +
    (lista.length > visibles.length ? `<div style="font-size:13px;color:#78716c;">…y ${lista.length - visibles.length} más en el CRM.</div>` : '') +
    '<div style="font-size:12px;color:#a8a29e;margin-top:10px;">Para que alguien deje de aparecer, escribe una nota en DETALLES DE SEGUIMIENTO o cámbiale el estado.</div>';
}
