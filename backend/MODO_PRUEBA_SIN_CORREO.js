// ===== Modo prueba sin correos (26-oct-2026) =====
// Para que Claude valide los flujos del inmueble de PRUEBA sin gastar el cupo diario de Gmail.
// Con la propiedad del script PRUEBA_SIN_CORREO = ID del inmueble de prueba, los correos de
// las peticiones y filas de ese inmueble no salen: quedan anotados (CacheService, 6 h).
// Los demás inmuebles y clientes no se tocan. Apagado (sin la propiedad), todo sale normal.

var _SIN_CORREO_ = false;

function _inmueblePruebaSinCorreo_() {
  return PropertiesService.getScriptProperties().getProperty('PRUEBA_SIN_CORREO') || '';
}

/** doPost: la petición es de la sala de entrega del inmueble de prueba. */
function activarSinCorreoPeticion_(datos) {
  _SIN_CORREO_ = false;
  const id = _inmueblePruebaSinCorreo_();
  if (!id || !datos) return;
  if (String(datos.id || datos.idInmueble || datos.k || '') === id) { _SIN_CORREO_ = true; return; }
  // Página del comprobante mensual: el enlace trae el ID del pago
  if (datos.p) {
    try { const p = _pagoPorId(datos.p); _SIN_CORREO_ = !!p && String(p.v('ID INMUEBLE')) === id; } catch (e) {}
    return;
  }
  if (datos.c) {
    try { const cita = _citaPorId(datos.c); _SIN_CORREO_ = !!cita && String(valorCita(cita.fila, cita.col, 'ID INMUEBLE')) === id; } catch (e) {}
  }
}

/** Motor de agenda: cada fila decide por su inmueble. */
function activarSinCorreoFila_(idInmueble) {
  const id = _inmueblePruebaSinCorreo_();
  _SIN_CORREO_ = !!id && String(idInmueble || '') === id;
}

/** Todo correo del sistema pasa por aquí. */
function enviarCorreo_(m) {
  if (!_SIN_CORREO_) return MailApp.sendEmail(m);
  const texto = String(m.htmlBody || m.body || '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const c = CacheService.getScriptCache();
  let lista = [];
  try { lista = JSON.parse(c.get('CORREOS_SIMULADOS') || '[]'); } catch (e) {}
  lista.push({ f: new Date().toISOString(), para: m.to, cc: m.cc || '', bcc: m.bcc || '', asunto: m.subject, adjuntos: (m.attachments || []).length, texto: texto.slice(0, 900) });
  c.put('CORREOS_SIMULADOS', JSON.stringify(lista.slice(-60)), 21600);
  Logger.log('✉️ (modo prueba, no enviado) ' + m.to + ' · ' + m.subject);
}
