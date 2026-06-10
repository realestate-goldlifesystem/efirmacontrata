# 🧠 CEREBRO DEL PROYECTO: GOLD LIFE SYSTEM (REAL ESTATE)

> **ATENCIÓN AGENTES DE IA (Y NUEVOS DESARROLLADORES):**  
> Este es tu documento principal de memoria, personalidad y contexto. Si estás leyendo esto, es porque has sido invocado para trabajar en este proyecto. Tu objetivo principal es mantener la coherencia con esta arquitectura, evitar dañar flujos de Google Apps Script y usar tus herramientas correctamente.

## 🏢 1. ¿Qué es este proyecto en Global?
Es un sistema integral de **Gestión Inmobiliaria** ("Real Estate") construido sobre la infraestructura de Google Workspace (Apps Script + Sheets + Drive) y Github Pages. 
*Nota: "E-FirmaContrata" es solo uno de los módulos/marcas del sistema, no es el todo.*

El ecosistema global administra:
1. **Inmuebles:** Registro y perfilamiento de propiedades.
2. **Documentación y OCR:** Carga, validación automática de documentos e integración con Google Cloud Vision para leer cédulas o documentos.
3. **Contratos (E-FirmaContrata):** Generación dinámica de contratos a partir de Google Docs, manejo de versiones borrador, bitácora de negociación y semáforos de firma (Fase 1). 
4. **Firmas y Pagos:** (Futura Fase 2) Integración con ViaFirma y pasarelas de pago.

## 🧩 2. Estructura y Módulos
El proyecto vive en dos repositorios/carpetas que se hablan mediante una API (JSONP/Fetch):

### 2.1 Backend (`backend/`) -> Google Apps Script
- **Motor de Datos:** Google Sheets (ej: hoja `1.1 - INMUEBLES REGISTRADOS`).
- **Módulos Principales (JS):**
  - `1- REGISTRO DE INMUEBLE.js` / `2-...`: Lógica de dar de alta propiedades.
  - `GESTOR DE DOCUMENTOS.js` / `ESTADOS DOCUMENTALES.js`: Manejan creación de links únicos (CDR/ID de Registro), validaciones y ciclo de vida de la documentación.
  - `GESTOR_CONTRATOS.js`: El motor maestro que extrae datos del Sheet hacia un Documento en Drive (El Cerebro) y luego genera el PDF final del contrato.
  - `OCR-HANDLER.js`: Lógica de visión artificial.
- **Frontend Interno:** El administrador usa `panel_validacion.html` (vía Web App de Google) para gobernar el sistema (ver semáforos, contratos, registros).

### 2.2 Frontend (`frontend/`) -> GitHub Pages
- Es la cara pública para clientes (Inquilinos, Propietarios).
- Archivos clave: `formulario-inquilino.html`, `validador.html`, `validador-de-contratos.html`, `sala_firmas.html`.
- Usa el archivo `config.js` para comunicarse estrictamente con la **URL de Producción (`/exec`)** del backend de Apps Script.

### 2.3 Herramientas Locales IA (`_herramientas_locales/`)
- Carpeta exclusiva para scripts y utilidades de Node.js o Python (ej. `sheets-helper.js`, `simple_auth_backup.js`) creados por la IA para soporte o consultas locales.
- **Importante:** Todo lo que esté en esta carpeta NUNCA debe subir a Apps Script. Por ello, `_herramientas_locales/**` está estrictamente ignorado en `.claspignore`.

## 🚀 3. Reglas de Despliegue (CÓMO HACER TU TRABAJO)
Dado que el frontend depende de la URL `/exec` de Google, tú debes gobernar los despliegues de esta forma:

### 6. Flujo de Trabajo (Apps Script y Clasp)
* El código se modifica localmente.
* Para sincronizar con Google Scripts, se usa la terminal de VSCode (o la local): `clasp push`.
* ⚠️ **OJO - TRAMPA MORTAL DE WEB APPS**: Si editas un archivo HTML o lógica del `doPost` que afecta al Web App (`/exec`), hacer `clasp push` **NO ES SUFICIENTE**. El Web App seguirá ejecutando el código viejo de la implementación anterior.
  - Para actualizar la URL en vivo sin cambiar de ID, DEBES hacer: `clasp deploy -i [ID_DE_IMPLEMENTACION_ACTUAL] -d "Mensaje de actualizacion"`.
  - El ID actual lo puedes encontrar en `frontend/config.js` en la variable `API_URL` (es la cadena larga entre `/s/` y `/exec`). 
  - Si no haces esto, los cambios de backend nunca se reflejarán en el frontend y te volverás loco buscando el bug.
  - **LÍMITE DE 200 VERSIONES:** Google Apps Script tiene un límite estricto de 200 versiones por proyecto. Si al hacer `clasp deploy` la consola arroja `Script has reached the limit of 200 versions`, **notifica inmediatamente al usuario (Leonardo)** para que entre al entorno visual de Apps Script (Historial del Proyecto) y borre implementaciones antiguas. No intentes forzarlo ni crear nuevos IDs.
* IMPORTANTE: No modificar archivos locales sin un `clasp pull` previo si hay riesgo de cambios remotos. Pero nuestra política es **Source of Truth = Local**, así que todo cambio se hace local y se pushea.

1. **Modo Borrador / Desarrollo (`clasp push`):**
   Si modificas un script en `backend/`, ejecuta en terminal `cmd /c npx clasp push`. Esto sube el código a Google. **OJO:** El frontend público no verá estos cambios aún, solo las URLs de prueba (`/dev`).
2. **Modo Producción (`clasp deploy`):**
   Si necesitas que tus cambios en el backend funcionen inmediatamente con el Frontend en GitHub, **TIENES** que crear una nueva versión de despliegue oficial.
   Ejecuta: `cmd /c npx clasp deploy -i "AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW" -d "Parche IA"`
3. **Frontend (GitHub):**
   Si cambias algo en la carpeta `frontend/`, haz `git add .`, `git commit` y `git push origin main`. GitHub Pages se encargará del resto.

## 🛠️ 4. Tus Superpoderes y Limitaciones (IA)
1. **Despliegue Autónomo:** Eres capaz de usar la terminal (cmd/powershell) para hacer `push` y `deploy` de Clasp y Git. ¡Hazlo! No esperes a que el usuario lo haga a mano.
2. **Conexión Directa:** Si no estás seguro de cómo se llama una columna en la hoja de cálculo, no adivines ni dañes el código. Ejecuta scripts de pruebas en la consola local para consultar los datos en vivo.
3. **Privacidad Extrema:** Ciertas credenciales (como los `.json` del OCR de Google Cloud) NUNCA deben subir a GitHub. Verifica que tu `.gitignore` los esté bloqueando.
4. **Cero Dependencias de Celdas:** Recuerda que la "fuente de la verdad" para crear contratos NO son las celdas en blanco de Google Sheets, sino el "Documento Cerebro" alojado en Drive. No intentes modificar la lógica para guardar variables del contrato en columnas de Excel.
5. **Cuidado con Clasp y Frontend:** Clasp subirá POR DEFECTO todos los archivos `.js` o `.html` al backend de Apps Script. Si subes código puro del frontend (como `frontend/js/multimedia.js`) al backend, al evaluar variables globales como `document` o `window` el script principal (`onOpen`) explotará con un `ReferenceError` y desaparecerán los menús personalizados en Sheets. **Regla de oro:** Mantén siempre `frontend/**` rigurosamente en tu `.claspignore` (cuidado con dejar espacios en blanco al final de la línea en Windows).
6. **Manejo de Etiquetas del Contrato:** En `GESTOR_CONTRATOS.js`, ten en cuenta lo siguiente:
   - Los reemplazos de `header` y `footer` DEBEN ir en un bloque `try/catch` porque Google Docs arroja excepciones y crashea el script si se aplica "Primera página diferente".
   - Las fechas dobles (ej. `2026 de 2026`) suceden porque la plantilla suele tener `{{fecha}} de 2(000)`. Se deben absorber esas cadenas compuestas (junto con su año) ANTES del reemplazo del año suelto.
   - La etiqueta de pie de página para identificar el contrato es `{{CDR}}`, pero el valor que el sistema inyecta allí debe ser preferiblemente la columna `ID DE REGISTRO` (usando el CDR bruto solo como plan B).

## 🔌 5. Túnel VIP (Service Account Local)
El proyecto cuenta con un superpoder de acceso directo a la base de datos sin depender de `clasp run`.
Existe un archivo local llamado `real-estate-ocr-468904-38d35bfd32d6.json` (Service Account) que tiene permisos de lectura/escritura sobre el Google Sheet `1.1 - INMUEBLES REGISTRADOS` (gracias a que el correo `ocr-vision@real-estate-ocr-468904.iam.gserviceaccount.com` fue agregado como editor).

**¿Cómo usar este poder (Agente IA)?**
1. Si necesitas leer datos en vivo o depurar, crea un script temporal usando la librería `googleapis` de npm.
2. Inyecta la credencial JSON y usa los scopes necesarios:
   - **Sheets:** `https://www.googleapis.com/auth/spreadsheets` (Leer/escribir registros).
   - **Drive:** `https://www.googleapis.com/auth/drive` (Subir PDFs, leer actas, gestionar carpetas).
   - **Docs:** `https://www.googleapis.com/auth/documents` (Leer/escribir en el "Cerebro" y contratos).
3. El ID de la hoja principal es: `1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc`.
8. Ejecuta el script localmente con `node script_name.js`. ¡Es 100 veces más rápido que subir logs a Apps Script!

## 🤖 6. Manejo de Autocrat y Tiempos de Espera (Crucial)
Autocrat es un Add-on externo que se dispara con "On Form Submit". Tarda entre 30 y 60 segundos en generar los PDFs y escribir los `Merged Doc IDs` de vuelta a la hoja temporal.
- **NUNCA** elimines una fila temporal recién creada por un form si Autocrat aún no ha escrito sus resultados, de lo contrario arruinarás todo el pipeline.
- Para flujos síncronos (como el Archivo 2: `continuarRegistroInmuebleParte2`), el sistema **debe esperar activamente** a que Autocrat deposite su enlace (un bucle `while` con `Utilities.sleep(5000)` esperando un máximo de 60 segundos) antes de intentar copiar esos enlaces (TIPO 2 / TIPO 4), enviar correos iniciales, o borrar la fila temporal.

¡Actúa con seguridad y confianza, y siempre infórmale al usuario qué nivel de despliegue realizaste!
