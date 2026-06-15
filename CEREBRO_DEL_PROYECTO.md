# 🧠 CEREBRO DEL PROYECTO: GOLD LIFE SYSTEM (REAL ESTATE)

> **🚨 DIRECTIVA CRÍTICA Y OBLIGATORIA PARA AGENTES DE IA 🚨**
> **¡DETENTE INMEDIATAMENTE Y LEE ESTO!**
> Queda ESTRICTAMENTE PROHIBIDO asumir cosas, empezar a escribir código, o leer solo un fragmento de este documento. **ESTÁS OBLIGADO A LEER ESTE ARCHIVO COMPLETO, DE PRINCIPIO A FIN (hasta la última línea)** antes de emitir cualquier plan, modificar cualquier archivo o ejecutar un comando.
> Muchos agentes fallan porque encuentran algo que "les sirve" en la línea 30 y dejan de leer, rompiendo los flujos de despliegue, ignorando IDs de producción o dañando el ecosistema. **Tu primera herramienta debe ser visualizar el 100% de este CEREBRO**. Si no lo haces, dañarás el sistema de Google Apps Script irremediablemente.

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
- Carpeta exclusiva para scripts y utilidades de Node.js o Python creados por la IA para soporte o consultas locales.
- **Importante:** Todo lo que esté en esta carpeta NUNCA debe subir a Apps Script. Por ello, `_herramientas_locales/**` está estrictamente ignorado en `.claspignore`.

**INVENTARIO DE HERRAMIENTAS ACTUALES:**
Antes de crear un nuevo script para conectarte a Sheets o testear algo, **¡REVISA ESTA CARPETA PRIMERO!** Ya existen herramientas pre-construidas muy potentes:
- `sheets-helper.js`: Utilidad core para leer/escribir en Google Sheets directamente desde la consola usando la Service Account.
- `validar_sheet_pagos.js`: Para debuggear y validar el registro de transacciones.
- `debug_auth.js` / `simple_auth_backup.js`: Para pruebas rápidas de autenticación.
- `debug_html_service/`: Carpeta (Botiquín de primeros auxilios) con scripts (`split_script.js`, `extract_js.js`, `check_syntax.js`) para hacer ingeniería inversa de errores HTML/JS.

**💀 CUIDADO: EL BUG DEL MINIFICADOR DE GOOGLE APPS SCRIPT:**
Si en el frontend servido por Apps Script (`HtmlService`) aparece de la nada un error ciego como `Uncaught SyntaxError: Invalid or unexpected token` en una línea ilógica (ej. Línea 400+), **probablemente NO ES TU CÓDIGO**. El servidor de Google tiene un minificador antiguo que a veces elimina TODO lo que está después de un `//`, ¡incluso si el `//` está dentro de un string válido! (por ejemplo, recorta `embedUrl = 'https://docs...` dejándolo como `embedUrl = 'https:`).
**Solución:** Ofusca las dobles barras en los strings de URL (ej. `'https:/' + '/'`). Usa las herramientas de `debug_html_service/` para ver el HTML truncado que Google generó.

*(Nota: Hay varios scripts de refactorización (`fix_*.js`, `update_*.js`) que la IA anterior usó para editar el frontend masivamente. Siéntete libre de reusar su lógica de lectura de archivos).*

**POLÍTICA DE LIMPIEZA Y REUTILIZACIÓN:**
Cada vez que la IA cree herramientas "tras bambalinas" para debuggear, consultar datos o arreglar problemas, **DEBE** asegurarse de:
1. **Validar antes de crear:** Verifica en `_herramientas_locales/` si ya existe un script similar. Modifícalo en lugar de crear uno desde cero.
2. Si la herramienta es útil para el futuro, guardarla debidamente nombrada dentro de `_herramientas_locales/`.
3. Si la herramienta o archivo de prueba es "desechable" o momentáneo (como un `temp.js` creado en la raíz para evaluar código o chequear sintaxis), **BORRARLO LOCALMENTE ANTES de ejecutar `clasp push`**. Si no lo borras (o no está en `.claspignore`), Clasp lo subirá automáticamente a Google Apps Script. Si ese archivo tiene errores de sintaxis (`SyntaxError`) o conflictos globales, **corromperá la compilación global de todo el proyecto en la nube**, causando que las funciones nativas automáticas como `onOpen()` fallen silenciosamente y los menús personalizados (como el de "E-FirmaContrata") desaparezcan en Google Sheets.
4. Mantener siempre el espacio de trabajo local (Workspace) impecable y libre de scripts basura para no confundir el contexto en futuras sesiones.

**🎯 MANDATO OBLIGATORIO DE ARRANQUE (NUEVOS OBJETIVOS):**
Cuando el usuario (Leonardo) te asigne un nuevo objetivo grande o complejo, tu **PRIMER PASO antes de escribir código o proponer un plan técnico** debe ser:
- Ejecutar `node _herramientas_locales/sheets-helper.js` (u otra herramienta relevante) para extraer y leer la estructura en vivo (los Headers/Columnas actuales) de la hoja de Google Sheets.
- Basado en los datos *reales* que existen en la base de datos, elaborar y proponer el Plan de Acción. ¡NUNCA asumas los nombres de las columnas!

## 🚀 3. Reglas de Despliegue (CÓMO HACER TU TRABAJO)
Dado que el frontend depende de la URL `/exec` de Google, tú debes gobernar los despliegues de esta forma:

### 3.1 Flujo de Trabajo Backend (Apps Script y Clasp)
* El código se modifica localmente.
* Para sincronizar con Google Scripts, se usa la terminal de VSCode (o la local): `clasp push`.
* ⚠️ **OJO - TRAMPA MORTAL DE WEB APPS**: Si editas un archivo HTML o lógica del `doPost` que afecta al Web App (`/exec`), hacer `clasp push` **NO ES SUFICIENTE**. El Web App seguirá ejecutando el código viejo de la implementación anterior.
  - Para actualizar la URL en vivo sin cambiar de ID, DEBES hacer: `clasp deploy -i [ID_DE_IMPLEMENTACION_ACTUAL] -d "Mensaje de actualizacion"`.
  - El ID actual lo puedes encontrar en `frontend/config.js` en la variable `API_URL` (es la cadena larga entre `/s/` y `/exec`). 
  - Si no haces esto, los cambios de backend nunca se reflejarán en el frontend y te volverás loco buscando el bug.
  - **LÍMITE DE 200 VERSIONES:** Google Apps Script tiene un límite estricto de 200 versiones por proyecto. Si al hacer `clasp deploy` la consola arroja `Script has reached the limit of 200 versions`, **notifica inmediatamente al usuario (Leonardo)** para que entre al entorno visual de Apps Script (Historial del Proyecto) y borre implementaciones antiguas. No intentes forzarlo ni crear nuevos IDs.

### 3.2 Flujo de Trabajo Frontend (GitHub Pages / Arquitectura Global)
* **Hosting:** Todo el ecosistema de cliente (Frontend) NO está en Vercel. Se aloja de forma integral en **GitHub Pages**. 
* **Estructura Base URL:** `https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/`
* **Manejo de Páginas Clásicas (HTML/JS):** Páginas como el `validador.html`, `formulario-inquilino.html` o `sala_firmas.html` viven directamente en la carpeta `/frontend/`. Cualquier cambio en ellas simplemente requiere un `git push origin main`.
* **Aplicaciones Modernas (React / Vite):** Para módulos más complejos creados en React (ej. la subcarpeta `Portafolio-formulario de registro actualizacion form 1.0` u otras aplicaciones futuras):
  1. Realiza los cambios en los `.tsx` o fuente de la carpeta de desarrollo.
  2. Ejecuta la compilación con `npm run build` en su directorio de origen.
  3. MUEVE los archivos compilados de la carpeta `dist/` a su carpeta pública definitiva dentro de `/frontend/` (ej: `/frontend/portafolio/` para el portafolio actual). Reemplaza los `assets` e `index.html` anteriores.
  4. Desde la raíz del proyecto, sincroniza usando Git: `git add frontend/`, `git commit -m "update frontend"`, y `git push origin main`.
  5. GitHub Pages publicará automáticamente todo el contenido estático del directorio `/frontend/`. No esperes a Vercel ni a otras plataformas externas.

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
