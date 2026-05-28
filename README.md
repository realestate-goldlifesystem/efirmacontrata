# 🏠 Gold Life System - E-FirmaContrata

**SISTEMA DE GESTIÓN INMOBILIARIA (APPS SCRIPT + GITHUB PAGES)**

> ⚠️ **ATENCIÓN AGENTES DE IA (CEREBRO / REGLAS DE TRABAJO):**
> Este documento sirve como la fuente absoluta de verdad para el contexto del proyecto, arquitectura, flujos de despliegue y tus capacidades (Superpoderes). **Léelo con atención antes de realizar cualquier cambio o análisis.**

## 🧠 1. Arquitectura y "El Big Picture"
El proyecto se divide en dos mundos completamente distintos que se comunican por una API (JSONP):

### 1.1 Backend (Google Apps Script - Carpeta `backend/`)
- Contiene toda la lógica pesada (`*.js` y `*.html` para correos/paneles admin).
- **Base de Datos:** Google Sheets.
- **Módulos principales:** 
  - `GESTOR DE DOCUMENTOS.js` y `ESTADOS DOCUMENTALES.js`: Manejo de lógica y validación de links.
  - `GESTOR_CONTRATOS.js`: Toma la información de un "Documento Cerebro" en Drive y la inyecta en plantillas de Google Docs para generar los contratos.
- **La Fuente de Verdad del Contrato:** Los datos *no* viven permanentemente en las celdas del Sheet. Se extraen hacia un Documento en Drive llamado **"DATOS DE ELABORACION DE CONTRATO" (Cerebro)** que está en la subcarpeta `4- VARIOS` del registro. Ese documento es la fuente de verdad.

### 1.2 Frontend (GitHub Pages - Carpeta `frontend/`)
- Es la cara hacia los clientes (Inquilinos, Propietarios).
- Los formularios consumen la API de Google usando `config.js`, el cual apunta a la URL oficial de **Producción (`/exec`)**.

---

## 🚀 2. Flujos de Despliegue (CRÍTICO)
Dado que el frontend depende de la URL oficial (`/exec`), subir código al editor no es suficiente. Existen dos niveles de actualización:

1. **Guardar Cambios (Modo Borrador / `/dev`):**
   - Ejecuta: `cmd /c npx clasp push` (o el equivalente en la terminal, ej: npm run push)
   - Sube el código local a Google Apps Script. Solo los endpoints de desarrollo (`/dev`) y el Panel de Validación interno ven este cambio.

2. **Publicar Cambios (Producción / `/exec`):**
   - Ejecuta: `cmd /c npx clasp deploy -i "AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW" -d "Update mensaje"`
   - **MANDATORIO:** Si hiciste cambios en el backend de los cuales depende el frontend (ej. lógica de validación de links, o funciones de API), **tienes que hacer deploy** para congelar la nueva versión.

3. **Subir a GitHub (El Frontend y respaldos):**
   - Ejecuta: `git add .`, `git commit` y `git push origin main`.
   - El frontend está en GitHub Pages, así que las modificaciones a HTML/CSS/JS del frontend se reflejan en la web solo tras un `git push`.

---

## 🛠️ 3. Tus Superpoderes Locales (Lo que PUEDES hacer)
1. **Acceso y control de Git y Clasp:**
   - Puedes usar comandos en terminal para sincronizar y hacer deploy sin pedir permiso manual en el código, tú lideras el despliegue de las soluciones.
2. **Consultar la Base de Datos en tiempo real:**
   - Si no estás seguro de la estructura del Google Sheet, usa el script local (ej: `test_api.js`) pasándole por terminal el token correcto para pedirle a la API que devuelva los encabezados o datos reales. No trabajes a ciegas.
3. **Manejo de OCR:**
   - Las credenciales de Google Cloud Vision (`real-estate-ocr-*.json`) NO se deben subir jamás a Git. Confirma siempre que estén en `.gitignore`.
4. **Comunicaciones y Tareas en Segundo Plano:**
   - Apps Script maneja `GmailApp` (envío de correos HTML responsivos) y `Triggers` (tareas cronológicas). Utilízalos para automatizar recordatorios o validaciones sin intervención humana.

---

## 📐 4. Ecosistema "Subpanel de Negociación" (Fase 1 - Activo)
Para la creación de contratos, el flujo es:
1. Las partes envían su formulario (validado por `validador.html`).
2. En el **Panel de Validación** (`panel_validacion.html`), el administrador revisa los registros en la pestaña "Contratos".
3. El administrador genera un **Borrador de Google Docs**.
4. Este borrador pasa a tener **Semáforos** (progreso de firmas/validación externa).
5. Cuando los semáforos están 🟢 Aprobados por Inquilino, Propietario y Codeudor, se habilita la opción de generar el PDF inmutable definitivo.

¡Con esto estás listo para programar!
