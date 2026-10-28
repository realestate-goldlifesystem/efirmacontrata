/**
 * SCRIPT PARA SINCRONIZAR TASAS DE LA SÚPER FINANCIERA (SFC)
 * Se ejecuta mediante un Trigger (Time-Driven) cada semana.
 */

function sincroTasasSFC() {
  const url = "https://www.datos.gov.co/resource/w9zh-vetq.json?$limit=50000&$order=fecha_corte DESC";
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      Logger.log("Error al consultar SFC: " + response.getContentText());
      return;
    }
    
    const data = JSON.parse(response.getContentText());
    if (!data || data.length === 0) {
      Logger.log("No se obtuvieron datos de la API de la SFC.");
      return;
    }
    
    // Escribir en la hoja de Google Sheets
    const tasasExtraidas = [];
    // Objeto para llevar control de lo que ya hemos agregado (solo la tasa más reciente por banco y tipo)
    const bancosProcesados = {};
    
    // Los datos vienen ordenados por fecha_corte DESC (los más recientes primero)
    for (let i = 0; i < data.length; i++) {
      const fila = data[i];
      const entidad = fila.nombre_entidad;
      const tipo_credito = fila.tipo_de_cr_dito;
      const modalidad = fila.producto_de_cr_dito;
      const tasaEA = parseFloat(fila.tasa_efectiva_promedio);
      
      if (!entidad || !modalidad || isNaN(tasaEA)) continue;
      
      // Filtrar solo las de Vivienda
      if (tipo_credito === "Vivienda") {
        const key = entidad + "_" + modalidad;
        
        // Si aún no hemos procesado a este banco para esta modalidad, lo guardamos.
        // Como están ordenados por fecha de corte descendente, garantizamos que es la más reciente.
        if (!bancosProcesados[key]) {
          bancosProcesados[key] = true;
          
          tasasExtraidas.push([
            entidad,
            modalidad,
            tasaEA,
            fila.fecha_corte // Para saber de cuándo es el dato
          ]);
        }
      }
    }
    
    // Escribir en la hoja de Google Sheets
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("TASAS_BANCOS");
    
    if (!sheet) {
      sheet = ss.insertSheet("TASAS_BANCOS");
    }
    
    // Limpiar hoja y preparar headers
    sheet.clear();
    const headers = [["ENTIDAD", "TIPO_CREDITO", "TASA_EA", "FECHA_CORTE", "ULTIMA_ACTUALIZACION"]];
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers).setFontWeight("bold").setBackground("#d9ead3");
    
    // Añadir fecha de actualización del script a cada fila
    const timestamp = new Date();
    const formattedData = tasasExtraidas.map(row => [...row, timestamp]);
    
    if (formattedData.length > 0) {
      // Escribir todas las tasas
      sheet.getRange(2, 1, formattedData.length, formattedData[0].length).setValues(formattedData);
      
      // Ajustar ancho de columnas
      sheet.autoResizeColumns(1, 5);
      
      Logger.log("Tasas de la SFC sincronizadas correctamente. Total: " + formattedData.length);
    } else {
      Logger.log("No se encontraron tasas de Vivienda en la respuesta.");
    }
    
  } catch (e) {
    Logger.log("Fallo en sincroTasasSFC: " + e.message);
  }
}

/**
 * Endpoint para que el Frontend (React) consuma las tasas.
 * En el doPost principal (si usas doPost) o en un doGet se debe enrutar hacia esta función.
 */
function obtenerTasasParaFrontend() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("TASAS_BANCOS");
  
  if (!sheet) return JSON.stringify([]);
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return JSON.stringify([]);
  
  const result = [];
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    result.push({
      entidad: row[0],
      tipoCredito: row[1],
      tasaEA: row[2],
      fechaSFC: row[3]
    });
  }
  
  return JSON.stringify(result);
}

// ==========================================
// SINCRONIZACIÓN DE IPC (ÍNDICE DE PRECIOS AL CONSUMIDOR)
// ==========================================

/**
 * Trae el IPC total del año anterior (variación a diciembre) del anexo oficial del DANE (IPC_DANE.js),
 * que es el tope legal del aumento del canon (Ley 820, art. 20). Lo guarda en IPC_<año> y destraba
 * los ajustes anuales que lo estaban esperando (AJUSTE_ANUAL_IPC.js). El DANE lo publica hacia el
 * 8 de enero; antes de eso el anexo no existe y se vuelve a intentar al día siguiente.
 * Lo llama el cron horario una vez al día (sincroIPCDiario_). Se puede correr a mano desde el editor.
 */
function sincroIPC(anioForzado) {
  try {
    const props = PropertiesService.getScriptProperties();
    const anios = {};
    anios[anioForzado || (new Date().getFullYear() - 1)] = true;
    _ajustesEsperandoIpc_().forEach(function (x) { anios[x.a.anioIpc] = true; });
    Object.keys(anios).forEach(function (anio) {
      if (props.getProperty('IPC_' + anio) === null) {
        const r = leerIpcDane_(Number(anio));
        if (!r.ok) { Logger.log(`⏳ IPC ${anio}: ${r.mensaje}. Se intenta mañana.`); return; }
        props.setProperty('IPC_' + anio, String(r.ipc));
        props.setProperty('IPC_FUENTE_' + anio, r.url + ' · ' + new Date().toISOString());
        Logger.log(`🎯 IPC ${anio} = ${r.ipc}% (DANE)`);
        _correoCitaSeguro(CUENTA_COBRO.CORREO_ADMIN, '📈 IPC ' + anio + ' guardado: ' + String(r.ipc).replace('.', ',') + '%', 'IPC DEL AÑO ' + anio, 'Leonardo',
          `El DANE publicó el IPC del año <strong>${anio}</strong>: <strong>${String(r.ipc).replace('.', ',')}%</strong>. Ya quedó guardado y se aplica solo a los contratos que renueven con ese año.<br><br>` +
          'Igual revisas cada caso antes de que le llegue al inquilino.', htmlBotonesCorreo([{ texto: '📄 Ver el anexo del DANE', color: '#b8860b', url: r.url }]));
      }
      const ipc = props.getProperty('IPC_' + anio);
      if (ipc !== null) props.setProperty('IPC_ACTUAL', ipc), props.setProperty('IPC_ANIO_REGISTRADO', String(anio));
    });
    _destrabarAjustesConIpc_();
  } catch (e) {
    Logger.log("🛑 Error crítico en sincroIPC: " + e.message);
  }
}

/** Una vez al día, desde el cron horario. */
function sincroIPCDiario_() {
  const cache = CacheService.getScriptCache();
  if (cache.get('IPC_REVISADO_HOY')) return;
  cache.put('IPC_REVISADO_HOY', '1', 6 * 3600);
  sincroIPC();
}

/**
 * Función pública para que el Gestor de Contratos o cualquier otro módulo 
 * consuma el IPC instantáneamente sin hacer llamados externos.
 */
function getIPCGlobal() {
  const ipc = PropertiesService.getScriptProperties().getProperty('IPC_ACTUAL');
  // Si por alguna razón no existe, devolvemos 0 para que no rompa las calculadoras
  return ipc ? parseFloat(ipc) : 0; 
}
