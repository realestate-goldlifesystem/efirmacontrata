// ==========================================
// CRM DE INMUEBLES DESDE EL PANEL DEL AGENTE (19-nov-2026)
// ==========================================
// La herramienta "Inmuebles" del portafolio es una ventana sobre la pestaña
// "1.1 - INMUEBLES REGISTRADOS": no guarda nada aparte.
//
// Cada columna se busca por su NOMBRE (encabezado), nunca por su posición. Los
// encabezados se comparan sin mayúsculas ni espacios repetidos ("Area  M²").
// Si dos columnas se llaman igual (p. ej. "Facultades:"), se toma la primera.
//
// Cambiar el estado desde el panel hace lo mismo que en el Sheet: el onEdit no
// corre con escrituras por código, así que se llama a procesarCambioEstado
// (GESTOR DE ESTADOS.js) a mano. ESTUDIO APROBADO, que en el Sheet abre la
// ventana "Enviar formulario al inquilino", aquí le pide al panel abrir la suya,
// que usa el mismo envío (procesarEmailInquilinoEnFila_, GESTOR DE DOCUMENTOS.js).

const CRM_INMUEBLES = {
  HOJA: '1.1 - INMUEBLES REGISTRADOS',
  // Etapas del trámite, en el orden real del flujo (MENSAJES_ESTADO)
  ETAPAS: ['Registro', 'Publicado', 'Estudio', 'Contrato', 'Entrega', 'Póliza', 'Administra'],
  // Mismos tipos que exige la ventana del inquilino en el Sheet
  TIPOS_FORMULARIO_INQUILINO: ['Arriendo', 'Vendi-Renta', 'Admi-Venta', 'Corretaje', 'Administración', 'Administracion']
};

/** Una sola entrada desde doPost: datos.op = listar | cambiarEstado | emailInquilino. */
function crmInmueblesDesdeWeb(datos) {
  const permiso = _verificarAgenteGoogle(datos && datos.credential);
  if (!permiso.ok) {
    return { success: false, message: String(permiso.mensaje).replace('lanzar a Miguel', 'ver los inmuebles') };
  }
  try {
    switch (datos.op) {
      case 'listar': return crmInmueblesListar_();
      case 'cambiarEstado': return crmInmCambiarEstado_(datos);
      case 'emailInquilino': return crmInmEmailInquilino_(datos);
      default: return { success: false, message: 'Operación desconocida: ' + datos.op };
    }
  } catch (e) {
    Logger.log('crmInmueblesDesdeWeb ' + datos.op + ': ' + e.stack);
    return { success: false, message: 'Error en el CRM de inmuebles: ' + e.message };
  }
}

/**
 * Quita el relleno invisible que dejan los formularios: "ㅤ" (U+3164), marcas de
 * dirección (U+200E/F), espacios de ancho cero y la viñeta "•".
 */
function crmInmLimpio_(v) {
  return String(v == null ? '' : v).replace(/[ㅤ​-‏⁠﻿•]/g, '').replace(/\s+/g, ' ').trim();
}

/** Clave para comparar encabezados: sin mayúsculas, tildes ni espacios repetidos. */
function crmInmClave_(h) {
  return crmInmLimpio_(h).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Etapa del trámite según el estado del desplegable, en el orden real del flujo
 * (MENSAJES_ESTADO, GESTOR DE ESTADOS.js); -1 = cerrado; null = no se reconoce.
 *   0 Registro    REGISTRANDO · PENDIENTE · ACTUALIZAR · ACTIVAR
 *   1 Publicado   PUBLICADO ARRIENDO · PUBLICADO VENTA · PUBLICADO VENTA/RENTA
 *   2 Estudio     ESTUDIO APROBADO · FORMULARIO ENVIADO
 *   3 Contrato    BORRADOR ENVIADO · BORRADOR APROBADO · CONTRATO ENVIADO · CONTRATO FIRMADO
 *   4 Entrega     ENTREGA/TRASTEO COORDINADO · CUENTA DE COBRO ENVIADA ·
 *                 LINKS CARPETAS ENVIADOS · ENTREGA DEL INM COMPLETA · RECIBO ENVIADO
 *   5 Póliza      POLIZA SOLICITADA · PÓLIZA PAGADA · PÓLIZA CANCELADA
 *   6 Administra  ADMINISTRANDO
 *  -1 Cerrado     INACTIVO · VENDIDO
 */
function crmInmEtapa_(estado) {
  const e = crmInmClave_(estado);
  if (!e) return null;
  if (/INACTIV|VENDIDO/.test(e)) return -1;
  if (/ADMINISTRAND/.test(e)) return 6;
  if (/POLIZA/.test(e)) return 5;
  if (/RECIBO|ENTREGA|TRASTEO|CUENTA DE COBRO|LINKS CARPETAS/.test(e)) return 4;
  if (/CONTRATO|BORRADOR|RENOVACION/.test(e)) return 3;
  if (/ESTUDIO|FORMULARIO/.test(e)) return 2;
  if (/PUBLICAD/.test(e)) return 1;
  if (/PENDIENTE|REGISTRAND|ACTUALIZAR|ACTIVAR|COMPLETO|ERROR|TIPO_4/.test(e)) return 0;
  return null;
}

function crmInmueblesListar_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CRM_INMUEBLES.HOJA);
  if (!hoja) return { success: false, message: 'No existe la pestaña ' + CRM_INMUEBLES.HOJA };
  const nFilas = hoja.getLastRow() - 1, nCols = hoja.getLastColumn();
  if (nFilas <= 0) return { success: true, inmuebles: [], etapas: CRM_INMUEBLES.ETAPAS, estados: crmInmEstados_(hoja), ahora: Date.now() };

  const enc = hoja.getRange(1, 1, 1, nCols).getValues()[0];
  const idx = {};
  enc.forEach((h, i) => { const k = crmInmClave_(h); if (k && !(k in idx)) idx[k] = i; });
  const rango = hoja.getRange(2, 1, nFilas, nCols);
  const vals = rango.getValues(), txt = rango.getDisplayValues();

  // Zonas: columnas "[Zona interna #1 Citófono]", "[Zona comunal #3 Zonas Verdes]"…
  const zonas = [];
  enc.forEach((h, i) => {
    const m = crmInmLimpio_(h).match(/^\[(Zona (?:interna|comunal|h[uú]medas)|Cancha deportiva) #\d+ (.+)\]$/i);
    if (m) zonas.push({ i: i, nombre: m[2].trim() });
  });

  const inmuebles = [];
  for (let f = 0; f < nFilas; f++) {
    const t = (nombre) => { const k = idx[crmInmClave_(nombre)]; return k === undefined ? '' : crmInmLimpio_(txt[f][k]); };
    const ms = (nombre) => { const k = idx[crmInmClave_(nombre)]; if (k === undefined) return null; const x = vals[f][k]; return x instanceof Date && !isNaN(x.getTime()) ? x.getTime() : null; };
    const si = (nombre) => { const v = crmInmClave_(t(nombre)); return !!v && v !== 'NO' && v !== 'FALSE' && v !== '0'; };
    const id = t('ID DE REGISTRO'), cdr = t('CODIGO DE REGISTRO');
    if (!id && !cdr) continue;
    const estado = t('ESTADO DEL INMUEBLE');
    const localidad = t('Selecciona la localidad del inmueble');
    inmuebles.push({
      fila: f + 2,
      id: id || cdr, cdr: cdr,
      registroMs: ms('Fecha de registro del inmueble.') || ms('Marca temporal'),
      fechaRegistro: t('Fecha de registro del inmueble.'),
      estado: estado,
      etapa: crmInmEtapa_(estado),
      detalleEstado: t('DETALLES DEL ESTADO DEL INMUEBLE'),
      // Lo escribe E-FirmaContrata: PROP_SUBMITTED → PROP_VALIDATED → INQ_… → COMPLETED
      estadoDocumental: t('ESTADO DOCUMENTAL'),
      detalleDocumental: t('DETALLES ESTADO DOCUMENTAL'),
      negocio: t('TIPO DE NEGOCIO'),
      tipo: t('Selecciona el tipo de inmueble'),
      localidad: localidad ? localidad.charAt(0).toUpperCase() + localidad.slice(1).toLowerCase() : '',
      barrio: t('Escriba el barrio del inmueble'),
      edificio: t('NOMBRE DEL INMUEBLE/ADMINISTRACION'),
      direccion: t('Ingrese la Dirección del inmueble'),
      ciudad: t('Ingrese la Ciudad del inmueble'),
      area: t('Area M²'),
      habitaciones: t('N° de Habitaciones'),
      banos: t('N° de Baños'),
      estrato: t('¿Cual es el estrato?'),
      antiguedad: t('Antiguedad del Inmueble'),
      piso: t('N° de piso'),
      garajes: t('N° de Garajes'),
      deposito: t('¿Dispone de deposito?'),
      mascotas: t('¿Se permite mascota?'),
      vigilancia: t('¿Qué tipo de vigilancia dispone?'),
      zonas: zonas.filter(z => { const v = crmInmClave_(txt[f][z.i]); return v && v !== 'NO' && v !== 'FALSE'; }).map(z => z.nombre),
      depositoSi: si('¿Dispone de deposito?'),
      precio: t('PRECIO DE PROMOCION GENERAL'),
      precioVenta: t('PRECIO DE PROMOCION EN VENTA'),
      administracion: t('PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)'),
      canonFinal: t('CANON FINAL DEL CONTRATO'),
      propietario: t('NOMBRES Y APELLIDOS DEL PROPIETARIO'),
      celular: t('Celular').replace(/[^\d+]/g, ''),
      paisCelular: t('Pais del celular'),
      correo: t('Correo electrónico'),
      inquilino: t('NOMBRE COMPLETO INQUILINO'),
      celularInquilino: t('CELULAR INQUILINO').replace(/[^\d+]/g, ''),
      correoInquilino: t('CORREO INQUILINO'),
      inicioContrato: t('FECHA INICIO DEL CONTRATO'),
      finContrato: t('FECHA FINAL DEL CONTRATO'),
      entrega: t('FECHA DE ENTREGA DEL INMUEBLE'),
      autorizacion: t('¿Qué tipo de autorización desea realizar?'),
      video: si('CHECK YT'),
      multimedia: si('CHECK MULTIMEDIA'),
      firmado: /FIRMADO/i.test(t('DOCUMENTO FIRMADO')),
      links: {
        anuncio: t('LINK DEL INMUEBLE PUBLICADO'),
        video: t('LINK DEL VIDEO DEL INMUEBLE'),
        carpeta: t('LINK DE CARPETA REG'),
        contenido: t('LINK CARPETA DE CONTENIDO'),
        propietario: t('LINK CARPETA DE PROPIETARIO'),
        inquilino: t('LINK CARPETA DE INQUILINO'),
        acuerdoCorretaje: t('Link to merged Doc - CORRETAJE'),
        acuerdoAdministracion: t('Link to merged Doc - ADMINISTRACIÓN'),
        acuerdoVenta: t('Link to merged Doc - VENTA'),
        autorizacionIngreso: t('Link to merged Doc - AUTORIZACIÓN DE INGRESO AL INMUEBLE')
      }
    });
  }
  return { success: true, inmuebles: inmuebles, etapas: CRM_INMUEBLES.ETAPAS, estados: crmInmEstados_(hoja), ahora: Date.now() };
}

// ---------- Estados y cambios ----------

/** Los estados del desplegable de ESTADO DEL INMUEBLE, en su orden. */
function crmInmEstados_(hoja) {
  try {
    const c = getColumnIndex(hoja, ESTADOS_CONFIG.COLUMNAS.ESTADO);
    if (c < 1) return [];
    const dv = hoja.getRange(2, c).getDataValidation();
    return dv ? (dv.getCriteriaValues()[0] || []).map(x => String(x).trim()).filter(Boolean) : [];
  } catch (e) {
    Logger.log('No se pudo leer el desplegable de estados de inmuebles: ' + e.message);
    return [];
  }
}

/** Fila del inmueble por su CODIGO DE REGISTRO (nunca por el número de fila del navegador). */
function crmInmFila_(cdr) {
  const fila = findRowByCDR(String(cdr || '').trim());
  if (fila < 2) throw new Error('No encontramos este inmueble en el Sheet. Recarga la lista.');
  return fila;
}

/**
 * Cambia ESTADO DEL INMUEBLE como si se hiciera en el Sheet.
 * datos = { cdr, estado }. Devuelve la lista actualizada y, con ESTUDIO APROBADO
 * en un tipo de negocio que lo permite, abrir = 'emailInquilino'.
 */
function crmInmCambiarEstado_(datos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { success: false, message: 'El Sheet está ocupado, intenta de nuevo en unos segundos.' };
  let abrir = '';
  try {
    const hoja = getSheet();
    const fila = crmInmFila_(datos.cdr);
    const nuevo = String(datos.estado || '').trim();
    const validos = crmInmEstados_(hoja);
    if (!nuevo || (validos.length && validos.indexOf(nuevo) === -1)) {
      return { success: false, message: 'El estado "' + nuevo + '" no está en el desplegable del Sheet.' };
    }
    const cEstado = getColumnIndex(hoja, ESTADOS_CONFIG.COLUMNAS.ESTADO);
    const cDetalles = getColumnIndex(hoja, ESTADOS_CONFIG.COLUMNAS.DETALLES);
    hoja.getRange(fila, cEstado).setValue(nuevo);

    if (nuevo === ESTADOS_SISTEMA.ESTUDIO_APROBADO) {
      // Igual que en el Sheet, menos la ventana: esa la abre el panel
      hoja.getRange(fila, cDetalles).setValue(MENSAJES_ESTADO.ESTUDIO_APROBADO);
      const tipo = String(safeGetValue(hoja, fila, ESTADOS_CONFIG.COLUMNAS.TIPO_NEGOCIO) || '').trim();
      if (CRM_INMUEBLES.TIPOS_FORMULARIO_INQUILINO.indexOf(tipo) !== -1) abrir = 'emailInquilino';
      logCambioEstado(fila, nuevo);
    } else {
      procesarCambioEstado(hoja, fila, nuevo, cEstado, cDetalles);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  const r = crmInmueblesListar_();
  r.abrir = abrir;
  return r;
}

/**
 * Envía el formulario de E-FirmaContrata al inquilino, como la ventana del Sheet.
 * datos = { cdr, nombre, email }. Exige ESTUDIO APROBADO, igual que el Sheet.
 */
function crmInmEmailInquilino_(datos) {
  const hoja = getSheet();
  const fila = crmInmFila_(datos.cdr);
  const estado = String(safeGetValue(hoja, fila, ESTADOS_CONFIG.COLUMNAS.ESTADO) || '').trim();
  if (estado !== ESTADOS_SISTEMA.ESTUDIO_APROBADO) {
    return { success: false, message: 'Para enviar el formulario, el inmueble debe estar en ESTUDIO APROBADO (está en "' + estado + '").' };
  }
  const tipo = String(safeGetValue(hoja, fila, ESTADOS_CONFIG.COLUMNAS.TIPO_NEGOCIO) || '').trim();
  if (CRM_INMUEBLES.TIPOS_FORMULARIO_INQUILINO.indexOf(tipo) === -1) {
    return { success: false, message: 'Esta función solo aplica para contratos de: ' + CRM_INMUEBLES.TIPOS_FORMULARIO_INQUILINO.join(', ') + '.' };
  }
  const r = procesarEmailInquilinoEnFila_(fila, String(datos.cdr).trim(), String(datos.email || '').trim(), String(datos.nombre || '').trim());
  if (!r.success) return r;
  const lista = crmInmueblesListar_();
  lista.message = r.message;
  return lista;
}
