/**
 * Pone al día, de una sola pasada, las actas de TODA la hoja:
 *
 *  A. Actas firmadas antes del 26-sep-2026 (la firma dejaba el Doc borrador al
 *     lado de su PDF): link visible → PDF firmado, y el Doc a la PAPELERA.
 *  B. Links viejos del MVP: "Link to merged Doc - <negocio>" que apunta a un
 *     documento que ya no existe (o que no tiene link) → se reapunta al acta
 *     que sí está en ARCHIVOS DEL INMUEBLE / AUTORIZACIONES DE COMERCIALIZACIÓN.
 *     Si hay varias: FIRMADO > PDF > Doc; a igualdad, la más reciente.
 *  C. "DOCUMENTO FIRMADO" vacío o roto → el PDF FIRMADO más reciente de la
 *     carpeta. Solo PDFs que digan FIRMADO: no se le pone ese rótulo a un acta
 *     que no consta firmada.
 *
 * NO toca:
 *   - "Merged Doc ID": con él la firma encuentra la fila. Si quedó muerto o con
 *     un PDF (MVP), la sala igual resuelve por DOCUMENTO FIRMADO.
 *   - Actas SIN firmar con el Doc vivo: ese Doc se necesita para firmar.
 *   - El Doc de la autorización de ingreso (no se firma; es la única versión).
 *   - Ningún PDF: todos los firmados se conservan como historial.
 *   - Links que ya están sanos.
 *
 * Uso:
 *   revisarActasFirmadas()             → solo mira y reporta
 *   limpiarActasFirmadas_CONFIRMADO()  → escribe la hoja y manda los Doc a la papelera
 */

// Qué archivo corresponde a cada columna. ⚠️ Columnas por NOMBRE.
var ACTAS_POR_NEGOCIO = [
  { negocio: 'CORRETAJE',      patron: /promoci[oó]n de inmueble en arriendo/i, seFirma: true },
  { negocio: 'ADMINISTRACIÓN', patron: /^acta de administraci[oó]n de inmueble/i, seFirma: true },
  { negocio: 'VENTA',          patron: /promoci[oó]n de inmueble en venta/i,    seFirma: true },
  { negocio: 'VENDI-RENTA',    patron: /vendi-?renta/i,                         seFirma: true },
  { negocio: 'ADMI-VENTA',     patron: /admi-?venta/i,                          seFirma: true },
  { negocio: 'AUTORIZACIÓN DE INGRESO AL INMUEBLE', patron: /^acta de autorizaci[oó]n de ingreso/i, seFirma: false }
];

function revisarActasFirmadas() {
  _actasFirmadas(false);
}

function limpiarActasFirmadas_CONFIRMADO() {
  _actasFirmadas(true);
}

function _actasFirmadas(aplicar) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_INMUEBLES.HOJA_PRINCIPAL);
  var rango = sheet.getDataRange();
  var datos = rango.getValues();
  var formulas = rango.getFormulas();
  var ricos = rango.getRichTextValues();
  var headers = datos[0].map(function (h) { return String(h).trim(); });

  var colId = headers.indexOf('ID DE REGISTRO');
  var colReg = headers.indexOf('LINK DE CARPETA REG');
  var colFirmado = headers.indexOf('DOCUMENTO FIRMADO');
  if (colId === -1 || colReg === -1 || colFirmado === -1) {
    throw new Error('Faltan ID DE REGISTRO / LINK DE CARPETA REG / DOCUMENTO FIRMADO');
  }

  Logger.log(aplicar ? '🧹 APLICANDO' : '🔎 SIMULACIÓN');

  var docsPapelera = 0, linksReparados = 0, firmadosPuestos = 0, sinActa = 0, errores = 0;
  var limite = new Date().getTime() + 5 * 60 * 1000;

  for (var r = 1; r < datos.length; r++) {
    if (new Date().getTime() > limite) {
      Logger.log('⏱️ Se acabó el tiempo en la fila ' + (r + 1) + '. Vuelve a ejecutar: lo ya hecho no se repite.');
      break;
    }
    var id = String(datos[r][colId] || '').trim();
    if (!id) continue;

    var avisos = [];
    try {
      var urlDe = function (col) { return _actaUrlDeCelda(formulas[r][col], datos[r][col], ricos[r][col]); };

      // Actas que hay de verdad en la carpeta del inmueble (se lee una sola vez)
      var archivos = _actaArchivosDeCarpeta(_actaIdDeUrl(urlDe(colReg)));
      var firmadoMasReciente = null;

      for (var n = 0; n < ACTAS_POR_NEGOCIO.length; n++) {
        var def = ACTAS_POR_NEGOCIO[n];
        var colDoc = headers.indexOf('Merged Doc ID - ' + def.negocio);
        var colLink = headers.indexOf('Link to merged Doc - ' + def.negocio);
        if (colDoc === -1) continue;

        var docId = String(datos[r][colDoc] || '').trim();
        var textoLink = colLink !== -1 ? String(datos[r][colLink] || '').trim() : '';
        if (!docId && !textoLink) continue;                 // este negocio no aplica a la fila

        var candidatos = archivos.filter(function (a) { return def.patron.test(a.nombre); });
        var mejor = _actaMejor(candidatos);
        if (def.seFirma) {
          var firm = _actaMejor(candidatos.filter(function (a) { return /firmado/i.test(a.nombre); }));
          if (firm && (!firmadoMasReciente || firm.creado > firmadoMasReciente.creado)) firmadoMasReciente = firm;
        }

        // --- A. Doc vivo con su PDF firmado → a la papelera ---
        var doc = _actaArchivoVivo(docId);
        var esDoc = doc && doc.getMimeType() === MimeType.GOOGLE_DOCS;
        if (def.seFirma && esDoc) {
          // Plantilla que quedó con el marcador sin reemplazar (pruebas del
          // MVP): su "FIRMADO" no es un acta de verdad. No se toca ni se enlaza.
          if (/<<.*>>/.test(doc.getName())) {
            avisos.push('   👀 ' + def.negocio + ': es una plantilla sin llenar, se deja para revisar a mano');
            continue;
          }
          var pdfPropio = buscarPdfFirmadoDeDoc(doc);        // GESTOR_CONTRATOS.js
          if (!pdfPropio) continue;                          // sin firmar: no se toca nada
          avisos.push('   🗑️ ' + def.negocio + ': Doc a la papelera (' + doc.getName() + ')');
          if (aplicar) {
            if (colLink !== -1) _actaPonerLink(sheet, r, colLink, pdfPropio, doc.getName() + ' - FIRMADO.pdf');
            doc.setTrashed(true);
          }
          docsPapelera++;
          continue;
        }
        if (!def.seFirma && esDoc) continue;                 // autorización con su Doc vivo: sana

        // --- B. Link visible roto o sin link → reapuntar ---
        if (colLink === -1) continue;
        var destinoActual = _actaIdDeUrl(urlDe(colLink));
        if (destinoActual && _actaArchivoVivo(destinoActual)) continue;   // link sano
        if (!mejor) {
          avisos.push('   ⚠️ ' + def.negocio + ': link roto y no hay acta de ese tipo en la carpeta');
          sinActa++;
          continue;
        }
        avisos.push('   🔗 ' + def.negocio + ' → ' + mejor.nombre);
        if (aplicar) _actaPonerLink(sheet, r, colLink, mejor.url, mejor.nombre);
        linksReparados++;
      }

      // --- C. DOCUMENTO FIRMADO vacío o roto ---
      var firmadoActual = _actaIdDeUrl(urlDe(colFirmado));
      var firmadoSano = firmadoActual && _actaArchivoVivo(firmadoActual);
      if (!firmadoSano && firmadoMasReciente) {
        avisos.push('   📄 DOCUMENTO FIRMADO → ' + firmadoMasReciente.nombre);
        if (aplicar) _actaPonerLink(sheet, r, colFirmado, firmadoMasReciente.url, '📄✅ FIRMADO');
        firmadosPuestos++;
      }
    } catch (e) {
      errores++;
      avisos.push('   ❌ ' + e.message);
    }

    if (avisos.length) {
      Logger.log('📄 fila ' + (r + 1) + ' — ' + id);
      avisos.forEach(function (a) { Logger.log(a); });
    }
  }

  Logger.log('───────────────────────────────');
  Logger.log('Doc a la papelera: ' + docsPapelera +
             ' | links de acta reparados: ' + linksReparados +
             ' | DOCUMENTO FIRMADO puestos: ' + firmadosPuestos +
             ' | sin acta que apuntar: ' + sinActa +
             ' | errores: ' + errores);
  if (!aplicar && (docsPapelera || linksReparados || firmadosPuestos)) {
    Logger.log('(simulación: ejecuta limpiarActasFirmadas_CONFIRMADO para hacerlo de verdad)');
  }
}

/** URL que esconde una celda: fórmula HYPERLINK, texto plano o enlace enriquecido. */
function _actaUrlDeCelda(formula, valor, rico) {
  var m = String(formula || '').match(/HYPERLINK\("([^"]+)"/i);
  if (m) return m[1];
  if (String(valor || '').indexOf('http') === 0) return String(valor);
  if (rico) {
    var url = rico.getLinkUrl();
    if (url) return url;
    var partes = rico.getRuns();
    for (var i = 0; i < partes.length; i++) {
      if (partes[i].getLinkUrl()) return partes[i].getLinkUrl();
    }
  }
  return '';
}

/** ID de Drive de una URL de carpeta, de archivo o de Doc. */
function _actaIdDeUrl(url) {
  var s = String(url || '');
  var m = s.match(/(?:folders|\/d)\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : '';
}

/** El archivo si existe y no está en la papelera; si no, null. */
function _actaArchivoVivo(id) {
  if (!id) return null;
  try {
    var f = DriveApp.getFileById(id);
    return f.isTrashed() ? null : f;
  } catch (e) {
    return null;
  }
}

/** Actas de REG / ARCHIVOS DEL INMUEBLE / AUTORIZACIONES DE COMERCIALIZACIÓN. */
function _actaArchivosDeCarpeta(regId) {
  var out = [];
  if (!regId) return out;
  var reg;
  try { reg = DriveApp.getFolderById(regId); } catch (e) { return out; }

  var archivosFolder = getFolderByName(reg, 'ARCHIVOS DEL INMUEBLE');
  if (!archivosFolder) return out;
  var aut = null;
  var hijas = archivosFolder.getFolders();
  while (hijas.hasNext()) {
    var h = hijas.next();
    if (h.getName().indexOf('AUTORIZACIONES') === 0) { aut = h; break; }
  }
  if (!aut) return out;

  var files = aut.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.isTrashed()) continue;
    if (/<<.*>>/.test(f.getName())) continue;      // plantilla que quedó sin llenar
    out.push({
      nombre: f.getName(),
      url: f.getUrl(),
      creado: f.getDateCreated().getTime(),
      esPdf: f.getMimeType() === MimeType.PDF
    });
  }
  return out;
}

/** FIRMADO > PDF > Doc; a igualdad, la más reciente. */
function _actaMejor(candidatos) {
  if (!candidatos.length) return null;
  var rango = function (a) { return /firmado/i.test(a.nombre) ? 3 : a.esPdf ? 2 : 1; };
  return candidatos.slice().sort(function (a, b) {
    return rango(b) - rango(a) || b.creado - a.creado;
  })[0];
}

function _actaPonerLink(sheet, r, col, url, rotulo) {
  sheet.getRange(r + 1, col + 1)
    .setFormula('=HYPERLINK("' + url + '"; "' + String(rotulo).replace(/"/g, "'") + '")');
}

// ==========================================
// ACTAS CON EL NOMBRE DEL ARCHIVO SIN LLENAR
// ==========================================

/**
 * Arregla las actas cuyo ARCHIVO quedó llamado "… de <<Ingrese Nombres y
 * Apellidos>>" (registros del 23–24 de junio de 2026: PP402012 y CL500666).
 * Por dentro están bien — nombre del propietario, sin marcadores y con su
 * certificado de firma —; lo único malo es el título del archivo.
 *
 * Por cada una:
 *   1. Se comprueba que el propietario de la hoja aparezca DENTRO del
 *      documento. Si no aparece, no se toca: no se le pone el nombre de una
 *      persona a un documento que no la menciona.
 *   2. Se renombran el Doc y su PDF firmado con el nombre real.
 *   3. Si está firmada: el link de la hoja pasa al PDF, DOCUMENTO FIRMADO se
 *      llena si estaba vacío y el Doc va a la papelera (lo mismo que hace la
 *      firma). La autorización de ingreso solo se renombra.
 *
 * Uso: revisarActasConNombreSinLlenar()  /  arreglarActasConNombreSinLlenar_CONFIRMADO()
 */
function revisarActasConNombreSinLlenar() { _actasNombreSinLlenar(false); }
function arreglarActasConNombreSinLlenar_CONFIRMADO() { _actasNombreSinLlenar(true); }

function _actasNombreSinLlenar(aplicar) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_INMUEBLES.HOJA_PRINCIPAL);
  var rango = sheet.getDataRange();
  var datos = rango.getValues();
  var formulas = rango.getFormulas();
  var ricos = rango.getRichTextValues();
  var headers = datos[0].map(function (h) { return String(h).trim(); });
  var colId = headers.indexOf('ID DE REGISTRO');
  var colNombre = headers.indexOf('NOMBRES Y APELLIDOS DEL PROPIETARIO');
  var colFirmado = headers.indexOf('DOCUMENTO FIRMADO');
  var MARCADOR = /<<[^>]*>>/;
  var sinTildes = function (s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); };

  Logger.log(aplicar ? '🧹 APLICANDO' : '🔎 SIMULACIÓN');
  var arregladas = 0, saltadas = 0;

  for (var r = 1; r < datos.length; r++) {
    var id = String(datos[r][colId] || '').trim();
    if (!id) continue;
    var propietario = String(datos[r][colNombre] || '').replace(/\s+/g, ' ').trim();

    for (var n = 0; n < ACTAS_POR_NEGOCIO.length; n++) {
      var def = ACTAS_POR_NEGOCIO[n];
      var colDoc = headers.indexOf('Merged Doc ID - ' + def.negocio);
      var colLink = headers.indexOf('Link to merged Doc - ' + def.negocio);
      if (colDoc === -1) continue;
      var doc = _actaArchivoVivo(String(datos[r][colDoc] || '').trim());
      if (!doc || doc.getMimeType() !== MimeType.GOOGLE_DOCS || !MARCADOR.test(doc.getName())) continue;

      var nombreViejo = doc.getName();
      Logger.log('📄 fila ' + (r + 1) + ' — ' + id + ' [' + def.negocio + ']');
      Logger.log('     ' + nombreViejo);

      // 1. ¿El documento es de verdad de este propietario?
      var primerNombre = sinTildes(propietario).split(' ')[0];
      var texto = sinTildes(DocumentApp.openById(doc.getId()).getBody().getText());
      if (!propietario || !primerNombre || texto.indexOf(primerNombre) === -1) {
        Logger.log('     ⚠️ "' + propietario + '" no aparece dentro del documento. No se toca.');
        saltadas++; continue;
      }
      if (MARCADOR.test(texto)) {
        Logger.log('     ⚠️ Por dentro todavía tiene marcadores sin llenar. No se toca.');
        saltadas++; continue;
      }

      var nombreNuevo = nombreViejo.replace(MARCADOR, propietario.toUpperCase());

      // 2. Su PDF firmado (mismo criterio que la sala: el que nació justo después del Doc)
      var pdf = null, menor = Infinity;
      if (def.seFirma) {
        var padres = doc.getParents();
        if (padres.hasNext()) {
          var candidatos = padres.next().getFilesByName(nombreViejo + ' - FIRMADO.pdf');
          while (candidatos.hasNext()) {
            var c = candidatos.next();
            var dif = c.getDateCreated().getTime() - doc.getDateCreated().getTime();
            if (!c.isTrashed() && dif >= 0 && dif < menor) { menor = dif; pdf = c; }
          }
        }
      }

      Logger.log('     → ' + nombreNuevo + (pdf ? '  (+ su PDF FIRMADO; el Doc va a la papelera)' : (def.seFirma ? '  (sin firmar: solo se renombra)' : '  (solo se renombra)')));
      arregladas++;
      if (!aplicar) continue;

      doc.setName(nombreNuevo);
      if (pdf) {
        pdf.setName(nombreNuevo + ' - FIRMADO.pdf');
        if (colLink !== -1) _actaPonerLink(sheet, r, colLink, pdf.getUrl(), pdf.getName());
        var firmadoActual = _actaIdDeUrl(_actaUrlDeCelda(formulas[r][colFirmado], datos[r][colFirmado], ricos[r][colFirmado]));
        if (!firmadoActual || !_actaArchivoVivo(firmadoActual)) _actaPonerLink(sheet, r, colFirmado, pdf.getUrl(), '📄✅ FIRMADO');
        doc.setTrashed(true);
      }
      Logger.log('     ✅ hecho');
    }
  }

  Logger.log('───────────────────────────────');
  Logger.log('Actas ' + (aplicar ? 'arregladas' : 'por arreglar') + ': ' + arregladas + ' | no se tocaron: ' + saltadas);
  if (!aplicar && arregladas) Logger.log('(simulación: ejecuta arreglarActasConNombreSinLlenar_CONFIRMADO para hacerlo)');
}
