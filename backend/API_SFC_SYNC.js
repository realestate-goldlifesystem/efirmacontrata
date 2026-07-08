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
 * Consulta la API de inflación (usaremos Banco Mundial como ejemplo sólido JSON, 
 * aunque tenga algo de retraso, la lógica de validación lo soluciona)
 * y lo guarda ultra rápido en la memoria de Apps Script.
 */
function sincroIPC() {
  try {
    const props = PropertiesService.getScriptProperties();
    const currentYear = new Date().getFullYear();
    const targetYear = (currentYear - 1).toString(); // En 2026 buscamos el IPC de 2025
    
    // 1. CRUCE DE MEMORIA: Verificamos si YA logramos conseguir el de este año
    const anioGuardado = props.getProperty('IPC_ANIO_REGISTRADO');
    if (anioGuardado === targetYear) {
      Logger.log(`✅ IPC del ${targetYear} ya estaba guardado en memoria. Cancelando búsqueda redundante.`);
      return; 
    }

    // 2. CONSULTA A LA API (Banco Mundial como ejemplo JSON estructural)
    // El indicador FP.CPI.TOTL.ZG es "Inflation, consumer prices (annual %)"
    const url = "http://api.worldbank.org/v2/country/CO/indicator/FP.CPI.TOTL.ZG?format=json"; 
    
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      Logger.log("⚠️ Error al consultar IPC: " + response.getContentText());
      return;
    }
    
    const responseData = JSON.parse(response.getContentText());
    
    // La API del Banco Mundial devuelve la data en el segundo elemento del arreglo: responseData[1]
    if (responseData && responseData.length > 1 && Array.isArray(responseData[1])) {
      
      const apiData = responseData[1];
      
      // Buscar el registro exacto del año que necesitamos (targetYear)
      // Como viene ordenado descendente, el más reciente suele ser el primero, pero lo buscamos por seguridad.
      const registroObjetivo = apiData.find(item => item.date === targetYear && item.value !== null);
      
      if (registroObjetivo) {
        // 3. ¡BINGO! Encontramos el dato oficial
        // Lo redondeamos a 2 decimales por estética
        const ipcActual = parseFloat(registroObjetivo.value).toFixed(2); 
        
        // 4. GUARDAR EN MEMORIA (Cero latencia al consultar después y auto-apagado)
        props.setProperty('IPC_ACTUAL', ipcActual.toString());
        props.setProperty('IPC_ANIO_REGISTRADO', targetYear);
        props.setProperty('IPC_ULTIMA_ACTUALIZACION', new Date().toISOString());
        
        Logger.log(`🎯 ¡ÉXITO! IPC del ${targetYear} encontrado (${ipcActual}%). El robot se apagará hasta el otro año.`);
      } else {
        // La API aún no tiene el dato de este año (nos devolvió el del año antepasado).
        Logger.log(`⏳ La API aún no ha publicado el IPC de ${targetYear}. El robot lo volverá a intentar mañana.`);
      }
      
    } else {
      Logger.log("⚠️ La estructura de la API no es la esperada.");
    }
  } catch(e) {
    Logger.log("🛑 Error crítico en sincroIPC: " + e.message);
  }
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
