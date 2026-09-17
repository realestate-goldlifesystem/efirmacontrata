/**
 * Prueba la logica REAL de citas (backend/API_AGENDA.js + API_CRON_AGENDA.js)
 * con una hoja, un Calendar y un correo simulados. Uso:
 *   node _herramientas_locales/test_agenda_citas.js
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const leer = f => fs.readFileSync(path.join(__dirname, '../backend', f), 'utf8');

function entorno(filasIniciales) {
  const correos = [], eventosBorrados = [], titulos = {};
  let hoja = filasIniciales.map(r => r.slice());
  const pad = n => String(n).padStart(2, '0');
  const ctx = {
    console, Date, Math, JSON, String, Number, Array, Object, isNaN, parseInt, encodeURIComponent, RegExp,
    Logger: { log() {} },
    Session: { getScriptTimeZone: () => 'America/Bogota', getEffectiveUser: () => ({ getEmail: () => 'agente@x.com' }) },
    Utilities: {
      getUuid: (() => { let n = 0; return () => 'tok-' + (++n); })(),
      formatDate: (d, tz, f) => f
        .replace('dd', pad(d.getDate())).replace('MM', pad(d.getMonth() + 1)).replace('yyyy', d.getFullYear())
        .replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())).replace('ss', pad(d.getSeconds()))
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    LockService: { getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: m => correos.push(m) },
    HtmlService: {
      createTemplateFromFile: () => {
        const t = {};
        t.evaluate = () => ({ getContent: () => (t.MENSAJE_PRINCIPAL || '') + (t.MENSAJE_SECUNDARIO || '') });
        return t;
      },
      createHtmlOutput: h => ({ html: h, setTitle() { return this; }, addMetaTag() { return this; } })
    },
    CalendarApp: {
      getDefaultCalendar: () => ({
        getEventById: id => ({ deleteEvent: () => eventosBorrados.push(id), setTitle: t => { titulos[id] = t; } }),
        getEvents: () => [],
        createEvent: () => ({ getId: () => 'EV-NUEVO' })
      })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => ({
          getLastRow: () => hoja.length,
          getLastColumn: () => Math.max(...hoja.map(r => r.length), 1),
          insertRowBefore: () => hoja.unshift([]),
          appendRow: r => hoja.push(r.slice()),
          getRange: (r, c, nr, nc) => ({
            getValues: () => {
              const out = [];
              for (let i = 0; i < (nr || 1); i++) {
                const fila = hoja[r - 1 + i] || [];
                out.push(Array.from({ length: nc || 1 }, (_, j) => fila[c - 1 + j] === undefined ? '' : fila[c - 1 + j]));
              }
              return out;
            },
            getValue: () => (hoja[r - 1] || [])[c - 1],
            setValue: v => { hoja[r - 1] = hoja[r - 1] || []; hoja[r - 1][c - 1] = v; return { setFontWeight() {} }; },
            setValues: vals => {
              vals[0].forEach((v, j) => { hoja[r - 1] = hoja[r - 1] || []; hoja[r - 1][c - 1 + j] = v; });
              return { setFontWeight() {} };
            },
            setNumberFormat() {}
          })
        })
      })
    }
  };
  ctx._verificarAgenteGoogle = cred => cred === 'ok'
    ? { ok: true }
    : { ok: false, mensaje: 'El correo x no tiene permiso para lanzar a Miguel.' };
  vm.createContext(ctx);
  vm.runInContext(leer('API_AGENDA.js') + '\n' + leer('API_CRON_AGENDA.js') +
    '\nthis.api={hojaCitasConColumnas,fechaHoraDeCita,ejecutarMotorAgenda,localizarCitaConToken,' +
    'aplicarEstadoCitaDesdeCorreo,handleEstadoCitaGet,obtenerCitasPanel,COLUMNAS_CITAS};', ctx);
  return { api: ctx.api, correos, eventosBorrados, titulos, hoja: () => hoja };
}

let fallos = 0;
function t(n, real, esp) {
  const ok = JSON.stringify(real) === JSON.stringify(esp);
  if (!ok) fallos++;
  console.log((ok ? 'OK   ' : 'FALLA ') + n + (ok ? '' : '  (esperado ' + JSON.stringify(esp) + ', real ' + JSON.stringify(real) + ')'));
}

const H = ['ID CITA', 'FECHA CREACION', 'ESTADO', 'FECHA CITA', 'HORA CITA', 'NOMBRE', 'CELULAR', 'CORREO',
  'TIPO SERVICIO', 'DIRECCION', 'ID EVENTO CALENDAR', 'NOTAS', 'RECORDATORIO ENVIADO',
  'TOKEN PROPIETARIO', 'TOKEN AGENTE', 'ULTIMO CAMBIO'];
const ahora = Date.now();
function dentroDe(h) { const d = new Date(ahora + h * 3600000); d.setSeconds(0, 0); return d; }
function hora12(d) {
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m + ' ' + ap;
}
function fila(id, estado, cuando, extra) {
  const f = new Array(H.length).fill('');
  const set = (k, v) => { f[H.indexOf(k)] = v; };
  set('ID CITA', id); set('ESTADO', estado);
  // como la guarda el Sheet: fecha real, no texto
  set('FECHA CITA', new Date(cuando.getFullYear(), cuando.getMonth(), cuando.getDate()));
  set('HORA CITA', hora12(cuando)); set('NOMBRE', 'Ana'); set('CELULAR', '3001234567');
  set('CORREO', 'ana@x.com'); set('TIPO SERVICIO', 'Administracion'); set('ID EVENTO CALENDAR', 'EV-' + id);
  set('TOKEN PROPIETARIO', 'P-' + id); set('TOKEN AGENTE', 'A-' + id);
  Object.keys(extra || {}).forEach(k => set(k, extra[k]));
  return f;
}
function estadoDe(e, id) { return e.hoja().find(r => r[0] === id)[H.indexOf('ESTADO')]; }

console.log('--- lectura de fecha (el fallo que dejo el motor muerto) ---');
{
  const e = entorno([H]);
  const d = e.api.fechaHoraDeCita(new Date(2026, 5, 22), '8:00 AM');
  t('fecha como Date (como la guarda el Sheet)', d && d.getTime(), new Date(2026, 5, 22, 8, 0).getTime());
  t('fecha como texto', e.api.fechaHoraDeCita('22/06/2026', '1:30 PM').getTime(), new Date(2026, 5, 22, 13, 30).getTime());
  t('12:00 PM es mediodia', e.api.fechaHoraDeCita('22/06/2026', '12:00 PM').getHours(), 12);
  t('12:00 AM es medianoche', e.api.fechaHoraDeCita('22/06/2026', '12:00 AM').getHours(), 0);
  t('fecha vacia -> null', e.api.fechaHoraDeCita('', '8:00 AM'), null);
}

console.log('--- encabezados ---');
{
  const e = entorno([['CIT-1', 'x', 'PENDIENTE']]);
  e.api.hojaCitasConColumnas();
  t('sin encabezados: inserta fila arriba sin pisar la cita', [e.hoja()[0][0], e.hoja()[1][0]], ['ID CITA', 'CIT-1']);
}

console.log('--- motor ---');
{
  const e = entorno([H, fila('R1', 'PENDIENTE', dentroDe(20))]);
  e.api.ejecutarMotorAgenda();
  t('recordatorio a 20h: se envia', e.correos.length, 1);
  t('   lleva los 3 botones', ['Confirmar', 'Reagendar', 'Cancelar'].every(x => e.correos[0].htmlBody.includes(x)), true);
  e.api.ejecutarMotorAgenda();
  t('segunda corrida: NO se repite', e.correos.length, 1);
}
{
  const e = entorno([H, fila('R2', 'PENDIENTE', dentroDe(40))]);
  e.api.ejecutarMotorAgenda();
  t('a 40h: aun no se envia', e.correos.length, 0);
}
{
  const e = entorno([H, fila('C1', 'PENDIENTE', dentroDe(1.5), { 'RECORDATORIO ENVIADO': 'x' })]);
  e.api.ejecutarMotorAgenda();
  t('pendiente a 1,5h ya avisada: se cancela sola', estadoDe(e, 'C1'), 'CANCELADA');
  t('   libera el horario en Calendar', e.eventosBorrados, ['EV-C1']);
}
{
  const e = entorno([H, fila('C2', 'PENDIENTE', dentroDe(1.5))]);
  e.api.ejecutarMotorAgenda();
  t('pendiente a 1,5h SIN aviso previo: no se cancela', estadoDe(e, 'C2'), 'PENDIENTE');
}
{
  const e = entorno([H, fila('V1', 'PENDIENTE', dentroDe(-72), { 'TOKEN PROPIETARIO': '', 'TOKEN AGENTE': '' })]);
  e.api.ejecutarMotorAgenda();
  t('cita vieja pendiente (como las de junio): SIN RESPUESTA', estadoDe(e, 'V1'), 'SIN RESPUESTA');
  t('   sin mandar correos', e.correos.length, 0);
}
{
  const e = entorno([H, fila('A1', 'CONFIRMADA', dentroDe(-0.2))]);
  e.api.ejecutarMotorAgenda();
  t('confirmada que empieza: aviso al agente', e.correos.map(c => c.to), ['agente@x.com']);
  t('   pasa a CONFIRMADA_NOTIFICADA', estadoDe(e, 'A1'), 'CONFIRMADA_NOTIFICADA');
}

console.log('--- botones del correo ---');
{
  const e = entorno([H, fila('B1', 'PENDIENTE', dentroDe(30))]);
  const pag = e.api.handleEstadoCitaGet('B1', 'CANCELADA', 'P-B1');
  t('abrir el enlace NO cambia el estado', estadoDe(e, 'B1'), 'PENDIENTE');
  t('   muestra un boton para confirmar', /<button/.test(pag.html), true);
  t('propietario confirma', e.api.aplicarEstadoCitaDesdeCorreo('B1', 'CONFIRMADA', 'P-B1').ok, true);
  t('   estado CONFIRMADA', estadoDe(e, 'B1'), 'CONFIRMADA');
  t('   titulo del evento marcado', /CONFIRMADA/.test(e.titulos['EV-B1'] || ''), true);
}
{
  const e = entorno([H, fila('B2', 'PENDIENTE', dentroDe(30))]);
  const r = e.api.aplicarEstadoCitaDesdeCorreo('B2', 'QUIERE REAGENDAR', 'P-B2');
  t('propietario pide reagendar', [r.ok, estadoDe(e, 'B2')], [true, 'QUIERE REAGENDAR']);
  t('   se libera el horario', e.eventosBorrados, ['EV-B2']);
  t('   aviso al agente con WhatsApp', e.correos.length === 1 && e.correos[0].to === 'agente@x.com' &&
    e.correos[0].htmlBody.includes('wa.me/573001234567'), true);
  const r2 = e.api.aplicarEstadoCitaDesdeCorreo('B2', 'CONFIRMADA', 'P-B2');
  t('   despues NO puede confirmar con el correo viejo', [r2.ok, estadoDe(e, 'B2')], [false, 'QUIERE REAGENDAR']);
}
{
  const e = entorno([H, fila('B3', 'PENDIENTE', dentroDe(30))]);
  t('token incorrecto: rechazado', e.api.aplicarEstadoCitaDesdeCorreo('B3', 'CANCELADA', 'otro').ok, false);
  t('propietario no puede marcar ASISTIDA', e.api.aplicarEstadoCitaDesdeCorreo('B3', 'ASISTIDA', 'P-B3').ok, false);
  t('agente si puede marcar ASISTIDA', e.api.aplicarEstadoCitaDesdeCorreo('B3', 'ASISTIDA', 'A-B3').ok, true);
  t('cita cerrada no admite cambios', e.api.aplicarEstadoCitaDesdeCorreo('B3', 'CANCELADA', 'P-B3').ok, false);
}
{
  const e = entorno([H, fila('B4', 'CANCELADA', dentroDe(30))]);
  const r = e.api.aplicarEstadoCitaDesdeCorreo('B4', 'CANCELADA', 'P-B4');
  t('doble clic en cancelar: la segunda no hace nada', [r.ok, e.correos.length, e.eventosBorrados.length], [false, 0, 0]);
}

console.log('--- panel ---');
{
  const e = entorno([H, fila('P1', 'CONFIRMADA', dentroDe(30)), fila('P2', 'PENDIENTE', dentroDe(5))]);
  t('sin sesion valida: rechazado', e.api.obtenerCitasPanel({ credential: 'mal' }).success, false);
  const r = e.api.obtenerCitasPanel({ credential: 'ok' });
  t('con sesion: citas ordenadas por fecha', r.citas.map(c => c.idCita), ['P2', 'P1']);
  t('   NUNCA manda los tokens al navegador', JSON.stringify(r).includes('P-P1') || JSON.stringify(r).includes('A-P1'), false);
}

console.log(fallos ? '\n' + fallos + ' FALLAN' : '\nTODAS PASAN');
process.exit(fallos ? 1 : 0);
