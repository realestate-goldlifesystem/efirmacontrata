# Configuración Centralizada E-firmaContrata

## Archivo: `config_produccion.js`

Este archivo unifica toda la configuración del sistema E-firmaContrata para producción.

### 🎯 Funcionalidades Implementadas

#### ✅ 1. URLs centralizadas del backend (Google Apps Script)
- URL principal de producción configurada
- Endpoints específicos para cada operación
- Estructura organizada bajo `CONFIG_PRODUCCION.BACKEND`

#### ✅ 2. Configuración de Google Cloud Vision API para OCR
- Configuración completa para reconocimiento de texto
- Soporte para múltiples tipos de documentos (Cédula, Pasaporte, Licencia)
- Timeouts y reintentos configurados
- Estructura: `CONFIG_PRODUCCION.OCR`

#### ✅ 3. IDs de documentos y carpetas de Google Drive
- Carpetas principales organizadas por tipo
- Templates de documentos configurados
- Estructura jerárquica completa
- Ubicación: `CONFIG_PRODUCCION.GOOGLE_DRIVE`

#### ✅ 4. Configuración de límites de archivos y validaciones
- Tamaños máximos para archivos e imágenes
- Extensiones permitidas por categoría
- Tipos MIME soportados
- Validaciones de calidad de compresión

#### ✅ 5. Mensajes del sistema unificados
- Mensajes de formularios
- Mensajes de conexión y errores
- Mensajes de carga y procesamiento
- Mensajes específicos de OCR y validación
- Estructura: `CONFIG_PRODUCCION.MENSAJES`

#### ✅ 6. Configuración responsive y de dispositivos
- Breakpoints para diferentes tamaños de pantalla
- Configuraciones específicas por tipo de dispositivo
- Detección automática de características del dispositivo
- Función `detectarDispositivo()` disponible

#### ✅ 7. URLs del frontend en GitHub Pages
- URL base de producción
- Rutas de formularios organizadas
- Referencias a assets del sistema
- Estructura: `CONFIG_PRODUCCION.FRONTEND`

#### ✅ 8. Configuración de timeouts y reintentos
- Timeouts diferenciados por tipo de operación
- Configuración de reintentos con backoff exponencial
- Timeouts específicos para OCR y subida de archivos
- Ubicación: `CONFIG_PRODUCCION.TIMEOUTS`

#### ✅ 9. Configuración de pago (Nequi/Wompi)
- Configuración completa de Nequi
- Integración con Wompi configurada
- Valores, moneda y comisiones definidas
- Estructura: `CONFIG_PRODUCCION.PAGO`

#### ✅ 10. Sistema de logs de producción
- Logs silenciados en producción por defecto
- Sistema de logging remoto configurado
- Niveles de log diferenciados
- Función `logSistema()` para logging inteligente

### 🔧 Características del código

#### ✅ Producción ready
- `DEBUG: false` por defecto
- Logs silenciados para optimización
- URLs de producción configuradas
- Optimizaciones para rendimiento

#### ✅ Fácil mantenimiento
- Estructura modular y organizada
- Comentarios claros en cada sección
- Nomenclatura consistente
- Separación por funcionalidades

#### ✅ Validaciones integradas
- Función `validarConfiguracion()` incluida
- Validaciones de URLs críticas
- Verificación de IDs de Google Drive
- Reportes de errores estructurados

#### ✅ Detección automática de entorno
- Función `detectarEntorno()` implementada
- Identificación automática de producción/desarrollo
- Configuración adaptativa según entorno
- Logging contextual del entorno

#### ✅ Funciones auxiliares
- `validarEmail()`, `validarTelefono()`, `validarDocumento()`
- `formatearMoneda()`, `validarTamanoArchivo()`
- `obtenerExtension()`, `validarExtension()`
- `detectarDispositivo()`, `obtenerConfiguracionDispositivo()`

### 🔄 Compatibilidad con código anterior

El archivo incluye una capa de compatibilidad completa:

```javascript
const CONFIG = {
  API_URL: CONFIG_PRODUCCION.BACKEND.API_URL,
  DEBUG: CONFIG_PRODUCCION.ENTORNO.DEBUG,
  // ... mapeo completo
};
```

También incluye:
- `EXTENSIONES_PERMITIDAS` para compatibilidad
- `detectDevice()` como alias de `detectarDispositivo()`
- Todas las funciones de validación originales

### 📁 Archivos actualizados

1. **formulario-inquilino.html**: Cambiado a `<script src="config_produccion.js"></script>`
2. **formulario-propietario.html**: Cambiado a `<script src="config_produccion.js"></script>`
3. **selector.html**: Cambiado a `<script src="config_produccion.js"></script>`

### 🚀 Uso

```javascript
// Acceso a configuración nueva
CONFIG_PRODUCCION.BACKEND.API_URL
CONFIG_PRODUCCION.OCR.GOOGLE_CLOUD.API_ENDPOINT
CONFIG_PRODUCCION.GOOGLE_DRIVE.CARPETAS.CONTRATOS_PRINCIPAL

// Acceso compatible con código anterior
CONFIG.API_URL
CONFIG.DEBUG
CONFIG.MAX_FILE_SIZE

// Funciones de validación
validarEmail('test@example.com')
validarTelefono('3001234567')
formatearMoneda(60000)

// Detección de dispositivo
const dispositivo = detectarDispositivo();
console.log(dispositivo.isMobile);
```

### 🛡️ Seguridad

- API keys y credenciales sensibles NO están en el frontend
- URLs de producción validadas
- Configuración de CORS apropiada para GitHub Pages
- Validaciones de entrada en todas las funciones críticas

### 📋 Lista de verificación

- [x] URLs centralizadas configuradas
- [x] OCR Google Cloud Vision configurado  
- [x] Google Drive IDs implementados
- [x] Límites de archivos definidos
- [x] Mensajes unificados creados
- [x] Responsive configurado
- [x] URLs frontend establecidas
- [x] Timeouts y reintentos configurados
- [x] Pago Nequi/Wompi implementado
- [x] Sistema de logs de producción activo
- [x] Compatibilidad backward mantenida
- [x] Archivos HTML actualizados
- [x] Validaciones de configuración incluidas
- [x] Detección de entorno implementada
- [x] Funciones auxiliares disponibles

### 🎉 Estado: ✅ COMPLETADO

La configuración centralizada `config_produccion.js` está lista para producción y cumple con todos los requisitos especificados.