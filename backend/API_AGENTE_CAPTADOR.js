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

  // Medido con el contenido mas alto posible ("Todos" + "Todas las
  // habitaciones", que lleva el resumen del plan a 3 lineas): 364 px.
  // Se deja margen para diferencias de renderizado de fuentes.
  var html = template.evaluate()
    .setWidth(470)
    .setHeight(420);

  ui.showModalDialog(html, '🚀 Agente Captador - Fincaraiz (' + tipoTexto + ')');
}

/**
 * Función backend invocada desde el Modal HTML para disparar GitHub Actions
 * @param {string} modo - 'arriendo' o 'venta'
 * @param {string} bedrooms - '1', '2', '3', '4', '5' o 'all'
 */
function dispararWorkflowConHabitaciones(modo, bedrooms, sector) {
  modo = modo || 'arriendo';
  bedrooms = bedrooms || 'all';
  sector = sector || 'all';

  var ui = SpreadsheetApp.getUi();
  var esVenta = modo === 'venta';
  var tipoTexto = esVenta ? 'VENTA' : 'ARRIENDO';
  var pestanaTexto = esVenta ? '1 - CAPTACIONES V' : '1 - CAPTACIONES A';

  var scriptProps = PropertiesService.getScriptProperties();
  var githubToken = scriptProps.getProperty('GITHUB_PAT');
  var repoOwner = scriptProps.getProperty('GITHUB_OWNER') || 'realestate-goldlifesystem';
  var repoName = scriptProps.getProperty('GITHUB_REPO') || 'efirmacontrata';

  if (!githubToken) {
    ui.alert(
      '⚠️ Falta Configurar Token de GitHub',
      'No se encontró la propiedad "GITHUB_PAT" en las Propiedades del Script.\n\nPor favor agregue la propiedad GITHUB_PAT en Extensiones > Apps Script > Configuración del proyecto > Propiedades del script.',
      ui.ButtonSet.OK
    );
    return;
  }

  try {
    var url = "https://api.github.com/repos/" + repoOwner + "/" + repoName + "/actions/workflows/scraper.yml/dispatches";
    var habTexto = (bedrooms === 'all') ? 'Todas las habitaciones (1 a 5)' : bedrooms + ' Habitación(es)';
    var sectorTexto = (sector === 'all') ? 'Usaquén, Suba y Chapinero' :
                      sector.charAt(0).toUpperCase() + sector.slice(1);
    var combinaciones = (sector === 'all' ? 3 : 1) * (bedrooms === 'all' ? 5 : 1);
    var techo = combinaciones * 30;

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
    var code = res.getResponseCode();

    if (code === 204) {
      ui.alert(
        '🚀 ¡Barrido de ' + tipoTexto + ' Iniciado!',
        'El Agente Captador está rastreando Fincaraiz en la nube (' + tipoTexto + ' | ' + habTexto + ').\n\nLos inmuebles de propietarios directos comenzarán a escribirse automáticamente en la pestaña "' + pestanaTexto + '".',
        ui.ButtonSet.OK
      );
    } else {
      var errorMsg = res.getContentText();
      ui.alert(
        '❌ Error al activar el Robot (Código ' + code + ')',
        'GitHub respondió:\n' + errorMsg,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    ui.alert('❌ Error de Conexión', e.toString(), ui.ButtonSet.OK);
  }
}
