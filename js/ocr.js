// ==========================================
// OCR E-FIRMACONTRATA
// Integración con Google Vision API para OCR
// ==========================================

// ==============================
// CONFIGURACIÓN OCR
// ==============================
const OCR = {
  projectId: 'real-estate-ocr-468904',
  apiEndpoint: 'https://vision.googleapis.com/v1/images:annotate',
  enabled: false, // Se activará cuando tengamos las credenciales adecuadas
  
  // Configuración de detección
  features: [
    {
      type: 'TEXT_DETECTION',
      maxResults: 1
    },
    {
      type: 'DOCUMENT_TEXT_DETECTION',
      maxResults: 1
    }
  ]
};

// ==============================
// FUNCIONES PRINCIPALES OCR
// ==============================
async function extraerTextoImagen(archivoBase64) {
  if (!OCR.enabled) {
    console.warn('⚠️ OCR no está habilitado');
    return null;
  }
  
  try {
    // Preparar la imagen para la API
    const imagenBase64 = archivoBase64.split(',')[1]; // Remover data:image/...;base64,
    
    const requestBody = {
      requests: [
        {
          image: {
            content: imagenBase64
          },
          features: OCR.features
        }
      ]
    };
    
    mostrarOverlay(true, 'Extrayendo texto de la imagen...');
    
    const response = await fetch(OCR.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Aquí iría la autenticación de Google Cloud
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const resultado = await response.json();
    
    if (CONFIG.DEBUG) {
      console.log('🔍 Resultado OCR:', resultado);
    }
    
    mostrarOverlay(false);
    
    return procesarResultadoOCR(resultado);
    
  } catch (error) {
    console.error('❌ Error en OCR:', error);
    mostrarOverlay(false);
    return null;
  }
}

function procesarResultadoOCR(resultado) {
  if (!resultado.responses || resultado.responses.length === 0) {
    return null;
  }
  
  const respuesta = resultado.responses[0];
  
  if (respuesta.error) {
    console.error('❌ Error en respuesta OCR:', respuesta.error);
    return null;
  }
  
  // Extraer texto completo
  const textoCompleto = respuesta.fullTextAnnotation?.text || '';
  
  // Extraer textos individuales
  const textosDetectados = respuesta.textAnnotations || [];
  
  return {
    textoCompleto: textoCompleto,
    textos: textosDetectados.map(t => ({
      texto: t.description,
      confianza: t.confidence || 0,
      coordenadas: t.boundingPoly
    })),
    metadata: {
      idioma: respuesta.fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0] || 'es',
      confianzaPromedio: calcularConfianzaPromedio(textosDetectados)
    }
  };
}

function calcularConfianzaPromedio(textos) {
  if (!textos || textos.length === 0) return 0;
  
  const confianzas = textos
    .filter(t => t.confidence !== undefined)
    .map(t => t.confidence);
  
  if (confianzas.length === 0) return 0;
  
  return confianzas.reduce((sum, conf) => sum + conf, 0) / confianzas.length;
}

// ==============================
// EXTRACCIÓN DE DATOS ESPECÍFICOS
// ==============================
function extraerDatosCedula(textoOCR) {
  if (!textoOCR || !textoOCR.textoCompleto) {
    return null;
  }
  
  const texto = textoOCR.textoCompleto;
  const datos = {};
  
  // Extraer número de cédula
  const regexCedula = /(\d{6,12})/g;
  const numerosCedula = texto.match(regexCedula);
  if (numerosCedula && numerosCedula.length > 0) {
    // Tomar el número más largo como probable número de cédula
    datos.numeroCedula = numerosCedula.reduce((a, b) => a.length > b.length ? a : b);
  }
  
  // Extraer nombres (esto es complejo y puede requerir más lógica)
  const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Buscar patrones comunes de nombres en cédulas colombianas
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    
    // Si contiene "NOMBRES" o similar
    if (/nombres?/i.test(linea) && i + 1 < lineas.length) {
      datos.nombres = lineas[i + 1];
    }
    
    // Si contiene "APELLIDOS" o similar
    if (/apellidos?/i.test(linea) && i + 1 < lineas.length) {
      datos.apellidos = lineas[i + 1];
    }
    
    // Fecha de nacimiento
    if (/nacimiento|nac\./i.test(linea)) {
      const fechas = linea.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/g);
      if (fechas && fechas.length > 0) {
        datos.fechaNacimiento = fechas[0];
      }
    }
    
    // Lugar de expedición
    if (/expedici[oó]n|exp\./i.test(linea) && i + 1 < lineas.length) {
      datos.lugarExpedicion = lineas[i + 1];
    }
  }
  
  return datos;
}

function extraerDatosPasaporte(textoOCR) {
  if (!textoOCR || !textoOCR.textoCompleto) {
    return null;
  }
  
  const texto = textoOCR.textoCompleto;
  const datos = {};
  
  // Extraer número de pasaporte
  const regexPasaporte = /[A-Z]{2}\d{6,8}/g;
  const numerosPasaporte = texto.match(regexPasaporte);
  if (numerosPasaporte && numerosPasaporte.length > 0) {
    datos.numeroPasaporte = numerosPasaporte[0];
  }
  
  // Extraer fechas de expedición y vencimiento
  const fechas = texto.match(/\d{2}[-\/]\d{2}[-\/]\d{4}/g);
  if (fechas && fechas.length >= 2) {
    datos.fechaExpedicion = fechas[0];
    datos.fechaVencimiento = fechas[1];
  }
  
  return datos;
}

// ==============================
// UTILIDADES OCR
// ==============================
function prepararImagenParaOCR(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const img = new Image();
      
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Optimizar tamaño para OCR (máximo 2048px)
        const maxWidth = 2048;
        const maxHeight = 2048;
        
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Mejorar contraste para OCR
        ctx.filter = 'contrast(1.2) brightness(1.1)';
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      
      img.onerror = reject;
      img.src = e.target.result;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(archivo);
  });
}

function validarImagenParaOCR(archivo) {
  const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png'];
  const tamanoMaximo = 5 * 1024 * 1024; // 5MB
  
  if (!tiposPermitidos.includes(archivo.type)) {
    throw new Error('Tipo de archivo no compatible para OCR. Use JPG o PNG.');
  }
  
  if (archivo.size > tamanoMaximo) {
    throw new Error('Archivo muy grande para OCR. Máximo 5MB.');
  }
  
  return true;
}

// ==============================
// FUNCIONES DE AUTOCOMPLETADO
// ==============================
async function autocompletarConOCR(inputFile, tipoDocumento) {
  try {
    const archivo = inputFile.files[0];
    if (!archivo) return;
    
    // Validar archivo
    validarImagenParaOCR(archivo);
    
    // Preparar imagen
    const imagenOptimizada = await prepararImagenParaOCR(archivo);
    
    // Extraer texto
    const resultadoOCR = await extraerTextoImagen(imagenOptimizada);
    
    if (!resultadoOCR) {
      mostrarMensaje('No se pudo extraer texto de la imagen', 'warning');
      return;
    }
    
    // Extraer datos según tipo de documento
    let datosExtraidos = null;
    
    switch (tipoDocumento) {
      case 'CC':
      case 'CE':
        datosExtraidos = extraerDatosCedula(resultadoOCR);
        break;
      case 'PA':
        datosExtraidos = extraerDatosPasaporte(resultadoOCR);
        break;
    }
    
    if (datosExtraidos && Object.keys(datosExtraidos).length > 0) {
      aplicarDatosExtraidos(datosExtraidos);
      mostrarMensaje('✅ Datos extraídos automáticamente', 'success');
    } else {
      mostrarMensaje('No se pudieron extraer datos específicos', 'info');
    }
    
    // Guardar resultado para debugging
    if (CONFIG.DEBUG) {
      console.log('🔍 OCR Resultado completo:', resultadoOCR);
      console.log('📋 Datos extraídos:', datosExtraidos);
    }
    
  } catch (error) {
    console.error('❌ Error en autocompletado OCR:', error);
    mostrarMensaje('Error procesando imagen: ' + error.message, 'error');
  }
}

function aplicarDatosExtraidos(datos) {
  // Aplicar datos extraídos a los campos del formulario
  if (datos.numeroCedula) {
    const campoNumero = document.getElementById('numeroDocumento');
    if (campoNumero && !campoNumero.value) {
      campoNumero.value = datos.numeroCedula;
    }
  }
  
  if (datos.nombres) {
    const campoNombres = document.getElementById('nombres');
    if (campoNombres && !campoNombres.value) {
      campoNombres.value = datos.nombres;
    }
  }
  
  if (datos.apellidos) {
    const campoApellidos = document.getElementById('apellidos');
    if (campoApellidos && !campoApellidos.value) {
      campoApellidos.value = datos.apellidos;
    }
  }
}

// ==============================
// INICIALIZACIÓN
// ==============================
if (CONFIG.DEBUG) {
  console.log('🔍 OCR configurado:', {
    projectId: OCR.projectId,
    enabled: OCR.enabled
  });
}

console.info('✅ [OCR] Sistema OCR cargado (deshabilitado por defecto)');