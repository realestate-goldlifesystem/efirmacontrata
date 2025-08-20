# Configuración de Producción - E-firmaContrata

## Descripción

El archivo `config_produccion.js` contiene la configuración unificada completa del sistema E-firmaContrata para el entorno de producción. Este archivo centraliza todos los parámetros, URLs, validaciones y funciones auxiliares necesarias para el correcto funcionamiento del sistema.

## Datos Reales de Producción

- **URL Apps Script**: https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec
- **Deployment ID**: AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL
- **Proyecto OCR**: real-estate-ocr-468904
- **GitHub Pages**: https://realestate-goldlifesystem.github.io/efirmacontrata
- **Usuario**: realestate-goldlifesystem

## Estructura de la Configuración

### 1. APIs y URLs Centralizadas
```javascript
CONFIG.API_URL              // URL del Google Apps Script
CONFIG.DEPLOYMENT_ID        // ID del deployment
CONFIG.BASE_URL             // URL base de GitHub Pages
CONFIG.FORMULARIOS          // URLs específicas de formularios
```

### 2. Configuración de OCR
```javascript
CONFIG.OCR.PROJECT_ID       // ID del proyecto Google Cloud Vision
CONFIG.OCR.VISION_API_ENDPOINT
CONFIG.OCR.SUPPORTED_MIME_TYPES
CONFIG.OCR.CONFIDENCE_THRESHOLD
```

### 3. Límites y Validaciones
```javascript
CONFIG.MAX_FILE_SIZE        // 10MB general
CONFIG.MAX_IMAGE_SIZE       // 5MB imágenes
CONFIG.FORMATOS_PERMITIDOS  // PDF, JPG, PNG, DOCX
CONFIG.MAX_CODEUDORES       // Máximo 3 codeudores
CONFIG.VALIDACIONES         // Regex para email, teléfono, etc.
```

### 4. Configuración de Pago
```javascript
CONFIG.PAGO.NEQUI          // 3177623878
CONFIG.PAGO.VALOR          // $60,000 COP
CONFIG.PAGO.WOMPI_LINK     // Link real de Wompi
```

### 5. Responsive y Dispositivos
```javascript
CONFIG.BREAKPOINTS         // Mobile, tablet, desktop
CONFIG.TOUCH               // Configuración táctil
CONFIG.VIEWPORT            // Configuración de viewport
```

### 6. Timeouts y Reintentos
```javascript
CONFIG.TIMEOUTS.API_CALL   // 30 segundos
CONFIG.REINTENTOS.MAX_ATTEMPTS // 3 intentos
CONFIG.REINTENTOS.DELAYS   // Delays progresivos
```

### 7. Mensajes del Sistema
```javascript
CONFIG.MESSAGES.EXITO_ENVIO
CONFIG.MESSAGES.ERROR_CONEXION
CONFIG.MESSAGES.CARGANDO
// ... y muchos más
```

### 8. Configuración de Producción
```javascript
CONFIG.DEBUG = false       // Deshabilitado en producción
CONFIG.LOGS.enabled = false
CONFIG.PERFORMANCE         // Optimizaciones
CONFIG.SECURITY           // Configuraciones de seguridad
```

### 9. Funciones Auxiliares

#### Validaciones
- `validarEmail(email)` - Valida formato de email
- `validarTelefono(telefono)` - Valida teléfono colombiano
- `validarDocumento(documento)` - Valida número de documento
- `validarNombre(nombre)` - Valida nombres y apellidos
- `validarArchivo(file, tipo)` - Validación completa de archivos

#### Utilidades
- `detectDevice()` - Detecta tipo de dispositivo
- `formatearMoneda(valor)` - Formatea moneda colombiana
- `formatearTelefono(telefono)` - Formatea teléfono para mostrar
- `generarCodigoRegistro()` - Genera códigos únicos
- `sanitizarInput(input)` - Sanitiza entradas del usuario

#### Manejo de Errores
- `ejecutarConReintentos(fn, intentos)` - Ejecuta con reintentos automáticos

### 10. Documentos SARLAFT
```javascript
CONFIG.DOCUMENTOS.SARLAFT_NATURAL
CONFIG.DOCUMENTOS.SARLAFT_JURIDICA
// Enlaces a formularios y documentos oficiales
```

## Uso en HTML

### Opción 1: Archivo Externo (Recomendado)
```html
<script src="config_produccion.js"></script>
<script>
  // La configuración estará disponible como CONFIG
  console.log(CONFIG.API_URL);
  
  // Las funciones estarán disponibles globalmente
  if (validarEmail('usuario@example.com')) {
    // Email válido
  }
</script>
```

### Opción 2: Reemplazar Configuración Embebida
Si el archivo HTML tiene una configuración embebida, puede reemplazarla con:
```html
<script src="config_produccion.js"></script>
```

## Migración desde config.js

Para migrar desde el `config.js` existente:

1. Reemplazar la referencia:
   ```html
   <!-- Cambiar de: -->
   <script src="config.js"></script>
   
   <!-- A: -->
   <script src="config_produccion.js"></script>
   ```

2. Las funciones y configuraciones mantienen compatibilidad total.

## Características de Producción

### Optimizaciones
- Logs silenciados en producción
- Manejo de errores optimizado
- Validaciones robustas
- Performance mejorada

### Seguridad
- Sanitización de inputs
- Validación de tipos de archivo
- Límites de tamaño estrictos
- Protección CSRF

### Mantenibilidad
- Código bien documentado
- Configuración centralizada
- Funciones modulares
- Fácil actualización

## Personalización

Para personalizar la configuración:

1. **Mensajes**: Editar `CONFIG.MESSAGES`
2. **Límites**: Ajustar `CONFIG.MAX_FILE_SIZE`, etc.
3. **URLs**: Actualizar `CONFIG.FORMULARIOS`
4. **Validaciones**: Modificar `CONFIG.VALIDACIONES`

## Monitoreo

El sistema incluye:
- Manejo de errores globales
- Logging configurable
- Métricas de performance
- Reintentos automáticos

## Soporte

Para dudas sobre la configuración:
- Revisar la documentación en el código
- Consultar los comentarios inline
- Verificar las validaciones existentes

---

**Versión**: 1.0  
**Última actualización**: 2024  
**Compatibilidad**: Todos los navegadores modernos