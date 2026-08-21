// ==========================================
// AGENTE CAPTADOR FINCARAIZ - GOLD LIFE SYSTEM
// ==========================================

function ejecutarAgenteCaptadorArriendo() {
  ejecutarAgenteCaptador('arriendo');
}

function ejecutarAgenteCaptadorVenta() {
  ejecutarAgenteCaptador('venta');
}

// ==========================================
// RESUMEN DE CAPTACIONES
// ==========================================

var MESES_ES_CAPTADOR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
var TZ_CAPTADOR = 'America/Bogota';

/**
 * Abre el modal con las tarjetas de resumen de las ultimas corridas del robot.
 */
function mostrarResumenCaptaciones() {
  var template;
  try {
    template = HtmlService.createTemplateFromFile('backend/MODAL_RESUMEN');
  } catch (e) {
    template = HtmlService.createTemplateFromFile('MODAL_RESUMEN');
  }

  var html = template.evaluate().setWidth(580).setHeight(620);
  SpreadsheetApp.getUi().showModalDialog(html, 'Resumen de Captaciones');
}

/** Convierte una fecha a la misma forma que usa la hoja: 25-jul-2026 */
function _fechaEtiqueta(fecha) {
  var dd = Utilities.formatDate(fecha, TZ_CAPTADOR, 'dd');
  var mm = parseInt(Utilities.formatDate(fecha, TZ_CAPTADOR, 'MM'), 10);
  var yyyy = Utilities.formatDate(fecha, TZ_CAPTADOR, 'yyyy');
  return dd + '-' + MESES_ES_CAPTADOR[mm - 1] + '-' + yyyy;
}

/** Pasa '25-jul-2026' a '2026-07-25' para poder ordenar cronologicamente. */
function _fechaOrdenable(etiqueta) {
  var partes = String(etiqueta).split('-');
  if (partes.length !== 3) return '0000-00-00';
  var mes = MESES_ES_CAPTADOR.indexOf(partes[1].toLowerCase()) + 1;
  if (mes === 0) return '0000-00-00';
  return partes[2] + '-' + (mes < 10 ? '0' + mes : mes) + '-' + partes[0];
}

/**
 * Reune la informacion de las tarjetas combinando dos fuentes:
 *   - El Sheet   : cuantos propietarios entraron cada dia (arriendo y venta).
 *   - GitHub API : las corridas del workflow, con estado, duracion y enlace.
 *
 * Se agrupa POR DIA porque la columna FECHA DE CONTACTO solo guarda la fecha,
 * sin hora: no se puede atribuir una captacion a una corrida especifica.
 */
function obtenerResumenCaptaciones() {
  var resultado = { dias: [], totalCaptaciones: 0, avisoGithub: null };
  var mapa = {};

  function asegurarDia(etiqueta) {
    if (!mapa[etiqueta]) {
      mapa[etiqueta] = {
        etiqueta: etiqueta,
        orden: _fechaOrdenable(etiqueta),
        arriendo: 0,
        venta: 0,
        corridas: [],
        combinaciones: []
      };
    }
    return mapa[etiqueta];
  }

  // ---- 1. Captaciones por dia, desde las dos pestanas ----
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pestanas = [['1 - CAPTACIONES A', 'arriendo'], ['1 - CAPTACIONES V', 'venta']];

  pestanas.forEach(function (par) {
    var hoja = ss.getSheetByName(par[0]);
    if (!hoja) return;

    var ultimaFila = hoja.getLastRow();
    if (ultimaFila < 3) return;

    var encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    var colFecha = -1;
    var colCelular = -1;
    for (var i = 0; i < encabezados.length; i++) {
      var titulo = String(encabezados[i]).toLowerCase().trim();
      if (colFecha < 0 && titulo.indexOf('fecha de contacto') === 0) colFecha = i + 1;
      if (colCelular < 0 && titulo.indexOf('celular') === 0) colCelular = i + 1;
    }
    if (colFecha < 0 || colCelular < 0) return;

    var anchoLectura = Math.max(colFecha, colCelular);
    var celdas = hoja.getRange(3, 1, ultimaFila - 2, anchoLectura).getDisplayValues();

    celdas.forEach(function (fila) {
      // Una captacion se cuenta por el CELULAR, no por la fecha. La pestana de
      // venta tenia 344 filas vacias con fecha puesta y ninguna otra cosa, y
      // contarlas inflaba el total de 115 a 459.
      var celular = String(fila[colCelular - 1] || '').trim();
      if (!celular) return;

      var etiqueta = String(fila[colFecha - 1] || '').trim();
      if (!etiqueta) return;

      var dia = asegurarDia(etiqueta);
      dia[par[1]]++;
      resultado.totalCaptaciones++;
    });
  });

  // ---- 1b. Bitacora del robot: detalle por combinacion sector x habitaciones ----
  var hojaBitacora = ss.getSheetByName('0 - BITACORA ROBOT');
  if (hojaBitacora && hojaBitacora.getLastRow() > 1) {
    var filas = hojaBitacora.getRange(2, 1, hojaBitacora.getLastRow() - 1,
                                      hojaBitacora.getLastColumn()).getDisplayValues();
    filas.forEach(function (f) {
      var etiqueta = String(f[0]).trim();
      if (!etiqueta) return;
      var dia = asegurarDia(etiqueta);
      if (!dia.combinaciones) dia.combinaciones = [];
      dia.combinaciones.push({
        hora: f[1],
        modo: f[2],
        sector: f[3],
        habitaciones: f[4],
        estado: f[5],
        captados: Number(f[6]) || 0,
        cuota: Number(f[7]) || 0,
        paginas: Number(f[8]) || 0,
        duracion: f[12],
        detalle: f[13]
      });
    });
  }

  // ---- 2. Corridas del workflow, desde GitHub ----
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_PAT');
  var owner = props.getProperty('GITHUB_OWNER') || 'realestate-goldlifesystem';
  var repo = props.getProperty('GITHUB_REPO') || 'efirmacontrata';

  if (!token) {
    resultado.avisoGithub = 'Sin GITHUB_PAT configurado: solo se muestran las captaciones del Sheet.';
  } else {
    try {
      var url = 'https://api.github.com/repos/' + owner + '/' + repo +
                '/actions/workflows/scraper.yml/runs?per_page=40';
      var res = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'AppsScript-Bot'
        },
        muteHttpExceptions: true
      });

      if (res.getResponseCode() === 200) {
        var corridas = JSON.parse(res.getContentText()).workflow_runs || [];
        corridas.forEach(function (run) {
          var inicio = new Date(run.run_started_at || run.created_at);
          var dia = asegurarDia(_fechaEtiqueta(inicio));

          var duracion = '';
          if (run.updated_at && run.status === 'completed') {
            var seg = Math.round((new Date(run.updated_at) - inicio) / 1000);
            var min = Math.floor(seg / 60);
            duracion = min > 0 ? (min + ' min ' + (seg % 60) + ' s') : (seg + ' s');
          }

          dia.corridas.push({
            hora: Utilities.formatDate(inicio, TZ_CAPTADOR, 'HH:mm'),
            estado: run.status === 'completed' ? (run.conclusion || 'desconocido') : run.status,
            duracion: duracion,
            manual: run.event !== 'schedule',
            enlace: run.html_url || ''
          });
        });
      } else {
        resultado.avisoGithub = 'GitHub respondio ' + res.getResponseCode() +
                                '. Se muestran solo las captaciones del Sheet.';
      }
    } catch (e) {
      resultado.avisoGithub = 'No se pudo consultar GitHub: ' + e.toString();
    }
  }

  // ---- 3. Ordenar dias de mas reciente a mas antiguo ----
  var dias = [];
  for (var clave in mapa) {
    if (mapa.hasOwnProperty(clave)) dias.push(mapa[clave]);
  }
  dias.sort(function (a, b) { return a.orden < b.orden ? 1 : (a.orden > b.orden ? -1 : 0); });

  dias.forEach(function (d) {
    d.corridas.sort(function (a, b) { return a.hora < b.hora ? 1 : -1; });
    d.combinaciones = d.combinaciones || [];
    d.combinaciones.sort(function (a, b) { return a.hora < b.hora ? 1 : -1; });
    d.total = d.arriendo + d.venta;
    d.agotadas = d.combinaciones.filter(function (c) { return c.estado === 'AGOTADA'; }).length;
    d.completas = d.combinaciones.filter(function (c) { return c.estado === 'COMPLETA'; }).length;
    // SALTADA: la corrida automatica omitio esa combinacion porque ya habia
    // suficientes leads en NUEVO sin llamar (logica de reposicion).
    d.saltadas = d.combinaciones.filter(function (c) { return c.estado === 'SALTADA'; }).length;
  });

  resultado.dias = dias;
  return resultado;
}

/**
 * Muestra el Modal HTML estilizado con el selector de habitaciones
 * @param {string} modo - 'arriendo' o 'venta'
 */
function ejecutarAgenteCaptador(modo) {
  modo = modo || 'arriendo';
  var ui = SpreadsheetApp.getUi();
  var esVenta = modo === 'venta';
  var tipoTexto = esVenta ? 'VENTA' : 'ARRIENDO';

  var template;
  try {
    template = HtmlService.createTemplateFromFile('backend/MODAL_HABITACIONES');
  } catch (e) {
    template = HtmlService.createTemplateFromFile('MODAL_HABITACIONES');
  }
  template.modo = modo;
  template.tipoTexto = tipoTexto;

  // El alto real lo ajusta el propio modal al terminar de dibujarse
  // (google.script.host.setHeight en MODAL_HABITACIONES.html): el resumen
  // del plan cambia de 1 a 3 lineas segun lo que se marque, y con un alto
  // fijo o sobraba espacio abajo o aparecia scroll. Este valor es solo el
  // de arranque, antes de que el JS lo corrija.
  var html = template.evaluate()
    .setWidth(470)
    .setHeight(330);

  // Titulo CORTO a proposito: Google ensancha el diálogo para que quepa el
  // texto del titulo, y uno largo ("Miguel - Agente Captador Fincaraiz
  // (ARRIENDO)") dejaba una franja muerta a la derecha del contenido.
  ui.showModalDialog(html, 'Miguel · ' + tipoTexto);
}

var NOMBRE_SECTOR_CAPTADOR = { usaquen: 'Usaquén', suba: 'Suba', chapinero: 'Chapinero' };

/**
 * Arma en lenguaje natural una lista que puede venir con varios valores
 * separados por coma ("usaquen,chapinero" -> "Usaquén y Chapinero").
 */
function _listarSeleccion(csv, diccionario) {
  var nombres = String(csv).split(',').map(function (p) {
    var clave = p.trim();
    return (diccionario && diccionario[clave]) ? diccionario[clave] : clave;
  });
  if (nombres.length === 1) return nombres[0];
  return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
}

/** Cuántos valores trae la selección ('all' cuenta como el total del grupo). */
function _contarSeleccion(csv, totalSiTodos) {
  return (csv === 'all') ? totalSiTodos : String(csv).split(',').length;
}

/**
 * Núcleo compartido: dispara el workflow y DEVUELVE el resultado, sin tocar
 * la interfaz. Lo usan tanto el modal del Sheet (que encima muestra un
 * ui.alert) como el panel web del agente (que responde JSON) -- desde un
 * doPost no existe SpreadsheetApp.getUi(), así que la parte que llama a
 * GitHub tiene que vivir aparte de los alerts.
 *
 * @returns {{success: boolean, code: number, mensaje: string,
 *            sectorTexto: string, habTexto: string,
 *            combinaciones: number, techo: number, pestana: string}}
 */
function _lanzarBarridoMiguel(modo, bedrooms, sector) {
  modo = (modo === 'venta') ? 'venta' : 'arriendo';
  bedrooms = bedrooms || 'all';
  sector = sector || 'all';

  var habTexto = (bedrooms === 'all') ? 'Todas las habitaciones (1 a 5)'
                                      : _listarSeleccion(bedrooms) + ' habitación(es)';
  var sectorTexto = (sector === 'all') ? 'Usaquén, Suba y Chapinero'
                                       : _listarSeleccion(sector, NOMBRE_SECTOR_CAPTADOR);
  var combinaciones = _contarSeleccion(sector, 3) * _contarSeleccion(bedrooms, 5);

  var salida = {
    success: false,
    code: 0,
    mensaje: '',
    sectorTexto: sectorTexto,
    habTexto: habTexto,
    combinaciones: combinaciones,
    techo: combinaciones * 30,
    pestana: (modo === 'venta') ? '1 - CAPTACIONES V' : '1 - CAPTACIONES A'
  };

  var scriptProps = PropertiesService.getScriptProperties();
  var githubToken = scriptProps.getProperty('GITHUB_PAT');
  var repoOwner = scriptProps.getProperty('GITHUB_OWNER') || 'realestate-goldlifesystem';
  var repoName = scriptProps.getProperty('GITHUB_REPO') || 'efirmacontrata';

  if (!githubToken) {
    salida.mensaje = 'No se encontró la propiedad "GITHUB_PAT" en las Propiedades del Script.';
    return salida;
  }

  try {
    var url = "https://api.github.com/repos/" + repoOwner + "/" + repoName + "/actions/workflows/scraper.yml/dispatches";
    var options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + githubToken,
        "Accept": "application/vnd.github+json",
        "User-Agent": "AppsScript-Bot"
      },
      "payload": JSON.stringify({
        "ref": "main",
        "inputs": {
          "mode": modo,
          "bedrooms": bedrooms,
          "sector": sector
        }
      }),
      "muteHttpExceptions": true
    };

    var res = UrlFetchApp.fetch(url, options);
    salida.code = res.getResponseCode();
    salida.success = (salida.code === 204);
    if (!salida.success) {
      salida.mensaje = res.getContentText();
    }
  } catch (e) {
    salida.mensaje = e.toString();
  }
  return salida;
}

/**
 * Función backend invocada desde el Modal HTML del Sheet para disparar
 * GitHub Actions. Solo envuelve al núcleo con los alerts de la hoja.
 * @param {string} modo - 'arriendo' o 'venta'
 * @param {string} bedrooms - '1'..'5', varias separadas por coma ('1,2') o 'all'
 * @param {string} sector - 'usaquen'/'suba'/'chapinero', varias separadas por coma o 'all'
 */
function dispararWorkflowConHabitaciones(modo, bedrooms, sector) {
  var ui = SpreadsheetApp.getUi();
  var tipoTexto = (modo === 'venta') ? 'VENTA' : 'ARRIENDO';
  var r = _lanzarBarridoMiguel(modo, bedrooms, sector);

  if (r.success) {
    ui.alert(
      '🚀 ¡Barrido de ' + tipoTexto + ' Iniciado!',
      'Miguel está rastreando en la nube:\n\n' +
      '• Sector: ' + r.sectorTexto + '\n' +
      '• Habitaciones: ' + r.habTexto + '\n' +
      '• ' + r.combinaciones + ' barrido(s), máximo ' + r.techo + ' captaciones\n\n' +
      'Los inmuebles de propietarios directos comenzarán a escribirse automáticamente en la pestaña "' + r.pestana + '".',
      ui.ButtonSet.OK
    );
  } else if (r.code === 0 && r.mensaje.indexOf('GITHUB_PAT') >= 0) {
    ui.alert(
      '⚠️ Falta Configurar Token de GitHub',
      r.mensaje + '\n\nPor favor agregue la propiedad GITHUB_PAT en Extensiones > Apps Script > Configuración del proyecto > Propiedades del script.',
      ui.ButtonSet.OK
    );
  } else if (r.code === 0) {
    ui.alert('❌ Error de Conexión', r.mensaje, ui.ButtonSet.OK);
  } else {
    ui.alert('❌ Error al activar el Robot (Código ' + r.code + ')',
             'GitHub respondió:\n' + r.mensaje, ui.ButtonSet.OK);
  }
}

// --- Entrada desde el panel web del agente (Portafolio) ---------------------

// Mismo correo que ya valida el login del portafolio, pero aquí se comprueba
// del lado del servidor: la validación del navegador sirve para la experiencia,
// no como candado (cualquiera puede saltarse el JS de su propio navegador).
var CORREO_AGENTE_MIGUEL = 'realestate.goldlifesystem@gmail.com';
// Client ID de Google del portafolio: se exige que el token venga de ESA app,
// para que un token sacado desde otro sitio no sirva aquí.
var GOOGLE_CLIENT_ID_PORTAFOLIO = '825455387668-asnkq57s4voon63c38b41e4q8qvc0b2e.apps.googleusercontent.com';

/**
 * Verifica contra Google el token de sesión que manda el portafolio y
 * confirma que sea el correo autorizado. Devuelve {ok, mensaje}.
 */
function _verificarAgenteGoogle(credential) {
  if (!credential) {
    return { ok: false, mensaje: 'Falta la credencial de Google. Vuelve a iniciar sesión.' };
  }
  try {
    var resp = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
      { muteHttpExceptions: true }
    );
    if (resp.getResponseCode() !== 200) {
      return { ok: false, mensaje: 'Tu sesión de Google venció. Cierra sesión y vuelve a entrar.' };
    }
    var info = JSON.parse(resp.getContentText());
    if (String(info.aud) !== GOOGLE_CLIENT_ID_PORTAFOLIO) {
      return { ok: false, mensaje: 'La credencial no pertenece al portafolio de Gold Life.' };
    }
    if (String(info.email_verified) !== 'true') {
      return { ok: false, mensaje: 'El correo de Google no está verificado.' };
    }
    var email = String(info.email || '').toLowerCase().trim();
    if (email !== CORREO_AGENTE_MIGUEL) {
      return { ok: false, mensaje: 'El correo ' + email + ' no tiene permiso para lanzar a Miguel.' };
    }
    return { ok: true, mensaje: '', email: email };
  } catch (e) {
    return { ok: false, mensaje: 'No se pudo validar la sesión de Google: ' + e.toString() };
  }
}

/**
 * Handler del doPost: lanza a Miguel desde el panel de herramientas del
 * agente en el portafolio. Exige el token de Google del agente.
 */
function lanzarMiguelDesdeWeb(datos) {
  var permiso = _verificarAgenteGoogle(datos && datos.credential);
  if (!permiso.ok) {
    return { success: false, message: permiso.mensaje };
  }

  var r = _lanzarBarridoMiguel(datos.modo, datos.bedrooms, datos.sector);
  return {
    success: r.success,
    message: r.success
      ? ('Miguel arrancó: ' + r.sectorTexto + ' · ' + r.habTexto + ' · ' +
         r.combinaciones + ' barrido(s), máximo ' + r.techo + ' captaciones.')
      : ('No se pudo iniciar el barrido (código ' + r.code + '): ' + r.mensaje),
    sectorTexto: r.sectorTexto,
    habTexto: r.habTexto,
    combinaciones: r.combinaciones,
    techo: r.techo,
    pestana: r.pestana
  };
}
