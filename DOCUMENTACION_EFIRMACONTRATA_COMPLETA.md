# 📜 MANUAL MAESTRO DE ARQUITECTURA Y LÓGICA - E-FirmaContrata v3.1
**Real Estate Gold Life System**

Este documento centraliza, especifica y detalla de manera absoluta toda la arquitectura, lógica, flujos de datos, estados, componentes y reglas de negocio del sistema **E-FirmaContrata**.

---

## 🎯 1. Objetivo General del Sistema
Automatizar el proceso **end-to-end (de principio a fin)** de la recolección de datos, validación documental (vía OCR), revisión colaborativa y generación definitiva de contratos de arrendamiento, corretaje y venta, culminando en la preparación exacta para la firma electrónica externa (VíaFirma).

---

## 🏗️ 2. Arquitectura de Componentes

El sistema está dividido en módulos frontend (vistas web para clientes y administrador) y módulos backend (Google Apps Script).

### 🖥️ A. Frontend (Interfaces de Usuario)
1. **Formularios de Recolección (`formulario-inquilino.html`, `formulario-propietario.html`)**: Interfaces donde las partes suben sus documentos.
2. **Panel de Validación (`panel_validacion.html`)**: El "Centro de Mando" exclusivo del administrador. Se despliega como un *Sidebar* en Google Sheets. Controla todo el ciclo de vida del contrato.
3. **Validador Externo (`validador-de-contratos.html`)**: Página pública (pero segura) donde el Inquilino, Propietario y Codeudores leen el borrador del contrato y lo aprueban o rechazan.
4. **Revisión de Contrato (`revision-contrato.html`)**: Interfaz dedicada para que el Administrador revise las correcciones solicitadas por las partes y genere nuevas versiones del borrador.
5. **Popups de Correo**: Interfaces (`popup_email_inquilino.html`, `popup_email_propietario.html`) que le permiten al administrador disparar manualmente correos con enlaces únicos de carga documental a las partes.

### ⚙️ B. Backend (Scripts de Procesamiento)
1. **`GESTOR DE DOCUMENTOS.js`**: Maneja la recepción de archivos, evaluación del estado documental y almacenamiento en Drive.
2. **`GESTOR_CONTRATOS.js`**: El corazón del sistema. Ejecuta la creación de documentos (makeCopy), conversión a PDF, manejo de carpetas dinámicas, y envío de correos de aprobación y entrega final.
3. **`GESTOR DE ESTADOS.js` & `ESTADOS DOCUMENTALES.js`**: Centralizan las lógicas que determinan si un inquilino o propietario ya cumplió sus requisitos.
4. **`API_MULTIMEDIA.js` & `OCR-HANDLER.js`**: Conexión con Google Cloud Vision API para extraer texto de las cédulas y certificados de tradición, convirtiéndolos a texto plano.
5. **`UTIL_JerarquiaCarpetas.js`**: Garantiza que todo documento se guarde en la estructura exacta requerida por la empresa.

---

## 🔄 3. Flujo Lógico y Ciclo de Vida Completo

### FASE 1: Activación y Recolección Documental 📥
1. **Disparador Inicial (`UTIL_Triggers.js`)**: El flujo de E-FirmaContrata nace en la hoja de cálculo de Google Sheets. Cuando el administrador cambia la columna "ESTADO DEL INMUEBLE" a `ESTUDIO APROBADO`, el trigger `onEdit` detecta este cambio automáticamente.
2. **Levantamiento de Interfaz Inicial (Popups)**:
   - El backend invoca inmediatamente una interfaz flotante en la pantalla del administrador: `popup_email_inquilino.html` (o `popup_email_propietario.html` según corresponda).
   - Desde esta interfaz, el administrador confirma el envío del formulario.
3. **Despacho de Correos Transaccionales**:
   - Al confirmar en el popup, el backend empaqueta una URL encriptada (con el CDR como llave) y la inyecta en una plantilla de correo estético (`email_notificacion.html`).
   - El correo llega al Inquilino/Propietario dándole la bienvenida e invitándolo a su portal de carga segura.
4. **Interacción del Usuario Final (Frontend `formulario-inquilino.html` / `formulario-propietario.html`)**:
   - El Inquilino o Propietario abre la URL. La vista web (Frontend) procesa sus datos.
   - **Subida de Archivos**: Se adjuntan fotos de las cédulas (y Certificados de Tradición).
   - Al presionar "Enviar", el frontend empaqueta los archivos en formato `Base64` y hace una llamada directa al Backend.
5. **Recepción y Procesamiento en Backend (`GESTOR DE DOCUMENTOS.js` y `OCR-HANDLER.js`)**:
   - El `GESTOR DE DOCUMENTOS` recibe los archivos.
   - Pasa las imágenes por el **OCR** (`API_MULTIMEDIA.js`). Este cerebro extrae automáticamente:
     * Inquilino/Codeudor: Nombres y Cédula.
     * Propietario: Dirección, PIN y lista de propietarios vigentes.
   - Archivos anexos (Sarlaft, Recibos) se guardan directamente en Drive.
6. **Validación Automática de Estados**: El estado de los documentos de la persona pasa a `UPLOADED` en la base de datos (Sheets). Luego, el Administrador aprueba visualmente para pasarlos a `VALIDATED`.

### FASE 2: Elaboración del Borrador y "El Cerebro" 🧠
1. **Validación en Panel**: El Administrador abre el **Panel de Validación**. El sistema lee las columnas de estado. Si todos tienen documentos `VALIDATED`, el contrato se marca como "LISTO PARA GENERAR".
2. **El Cerebro (Single Source of Truth)**: Toda la inyección de datos para rellenar las llaves del contrato proviene directamente del documento maestro llamado `DATOS DE ELABORACION` (Cerebro). Ya no se depende de las columnas frágiles de la hoja de cálculo, garantizando una sincronización total de campos como correos, celulares y números de cédula exactos.
3. **Generación Dinámica**: 
   - El sistema ubica la **Carpeta Maestra del Inmueble**.
   - Navega internamente: `ENTREGAS DEL INMUEBLE` -> `[Año]` -> `DOCUMENTOS DE ENTREGA - INQUILINO` -> `2- CONTRATO DE ARRENDAMIENTO` (o Corretaje/Compraventa).
   - El sistema clona la "Plantilla de Borrador" en esta ruta específica.
   - Reemplaza todas las llaves (Ej. `{{NOMBRE_INQUILINO}}`) leyendo exclusivamente el Cerebro.

### FASE 3: Negociación y Aprobación Colaborativa (Bitácora Transparente) 🤝
1. **Envío del Borrador**: Desde el panel, el Admin hace clic en "Enviar Borrador a Revisión". Esto despacha correos transaccionales estéticos a Inquilino, Propietario y Codeudores con su link personalizado.
2. **El Semáforo de Firmas**: El panel de validación muestra tarjetas en tiempo real para Inquilino, Propietario y Codeudores, indicando quién falta por aprobar.
3. **Portal de Revisión Transparente**:
   - Cada parte entra a `validador-de-contratos.html`.
   - Si una parte pide cambios, las demás partes pueden ver la **Bitácora Transparente** en tiempo real, garantizando total transparencia en la negociación (todos saben qué se objeta y por qué).
   - Si todo está bien, le dan **"Aprobar"**.
   - Si hay errores, escriben un comentario y le dan **"Solicitar Correcciones"**.
4. **Ciclo de Corrección**:
   - Si solicitan correcciones, el panel alerta al Admin ("EN REVISIÓN").
   - El Admin lee la Bitácora centralizada, edita el Doc de Google Drive y genera una **Nueva Versión**.
   - Todos los semáforos se reinician (vuelven a gris) y se envía un nuevo correo transaccional indicando "Hay una nueva versión de tu contrato".
5. **Aprobación Total**: Cuando la última parte aprueba, el Estado Global del contrato pasa a verde: `APROBADO POR TODAS LAS PARTES`.

### FASE 4: Cierre y PDF Original Definitivo 🔏
1. **Botón Final**: El panel detecta que todos aprobaron y habilita el botón verde brillante: **"Generar y Descargar Original"**.
2. **Creación del PDF**:
   - El sistema busca el ID del Borrador aprobado.
   - Hace una copia, cambia internamente la palabra "BORRADOR" por "ORIGINAL" en el encabezado.
   - Lo convierte a formato inmodificable (PDF) en la misma carpeta exacta (`2- CONTRATO DE...`).
3. **Distribución Inteligente de Correos**:
   - **Administrador**: Recibe un email exclusivo con el PDF adjunto y un botón a Drive, indicando que el documento está listo para subir a VíaFirma.
   - **Clientes (Propietario, Inquilino, Codeudor)**: Reciben un email de notificación que les avisa que el contrato ya fue generado y deben *estar atentos a su bandeja de entrada* esperando el correo oficial del proveedor de firmas electrónicas. (No se les adjunta PDF para evitar filtraciones informales).
4. **Limpieza y Cierre Definitivo de UI (`panel_validacion.html`)**: 
   - Al generarse el PDF exitosamente, el Frontend activa `google.script.host.close()`, lo que ocasiona un **apagado y cierre automático** de todo el Sidebar/Panel de Validación y sus subpaneles.
   - Si el usuario decide volver a abrir el Panel de Validación, la lógica de backend (`obtenerContratosPendientes`) escanea los registros. Al detectar que este contrato ya posee el estado `CONTRATO ORIGINAL GENERADO`, el sistema tiene prohibido volver a renderizar esa tarjeta.
   - Si no quedan más contratos pendientes en la bandeja, el sistema simplemente omite mostrar tarjetas, manteniendo la interfaz "Contratos" totalmente limpia (eliminando el antiguo comportamiento de "DEBUG-EMPTY").

---

## 🗂️ 4. Diccionario de Estados del Sistema (Taxonomía)

El sistema opera bajo un riguroso esquema de estados en hojas de cálculo para mantener la lógica.

### A. Estados de Inmueble (Flujo Principal)
- `ESTUDIO APROBADO`: Fase donde las partes apenas subirán documentos.
- `READY_CONTRACT` o `CONTRATO GENERADO`: Borrador creado con éxito, esperando envío a las partes.
- `BORRADOR ENVIADO`: Se envió el link a las partes; se espera la lectura y validación de ellos.
- `EN REVISION`: Alguna de las partes rechazó el contrato y exigió correcciones. El administrador debe accionar.
- `APROBADO` o `CONTRATO APROBADO POR TODAS LAS PARTES`: Luz verde para generar el PDF final.
- `CONTRATO ORIGINAL GENERADO`: Fase culminada, contrato en PDF, sale de la lista de pendientes.

### B. Estados Documentales
- `PENDIENTE`: Falta subir documentos.
- `UPLOADED`: El cliente subió sus documentos (aún no validados por el admin).
- `VALIDATED`: Todo en regla.
- `REJECTED`: Hubo un error (ej. foto borrosa), el cliente debe re-subir.

### C. Estados de la Bitácora de Negociación (Historial)
- `CREADO`: Primer paso de un contrato.
- `ENVIADO`: Cuando el admin despacha el link.
- `APROBADO`: Cuando el Inquilino/Propietario le da click en "Sí, estoy de acuerdo".
- `CORRECCION`: Cuando la parte objeta cláusulas.

---

## 📁 5. Estructura Exacta de Carpetas (Jerarquía Dinámica en Drive)

El sistema NO puede arrojar archivos en cualquier parte. Utiliza lógica recursiva para hallar (o crear) la carpeta correcta basado en la ID del Registro.

📂 **[CARPETA ROOT]** (ej. 1. INMUEBLES REGISTRADOS)
 └─ 📂 **`[ID DE REGISTRO]`** (Ej. REG_28-05-2026-C43_(Cra 8 #170-92)_TORRE-9_APTO-702)
     └─ 📂 **`ENTREGAS DEL INMUEBLE`**
         └─ 📂 **`[Año]`** (Ej. 2024, 2026)
             └─ 📂 **`DOCUMENTOS DE ENTREGA - INQUILINO`**
                 └─ 📂 **`2- CONTRATO DE ARRENDAMIENTO`** (o VENTA / CORRETAJE)
                     ├─ 📄 Borrador_Contrato_... (GDoc)
                     ├─ 📄 Contrato_Original_..._FINAL (GDoc)
                     └─ 📄 Contrato_Original_..._FINAL.pdf (PDF Definitivo)

> **Nota Técnica de Respaldo (Fallback)**: Si por errores de permisos el sistema no halla la carpeta del ID de Registro en Drive de forma global, utilizará la variable `CARPETA_CONTRATOS_ID` como ruta segura de rescate, y si esa falla, lo enviará a la Raíz para evitar interrupción del servicio. En el flujo Original (paso final), hereda exactamente la carpeta madre del borrador para precisión del 100%.

---

## 🤖 6. Automatizaciones y OCR Avanzado

### Google Cloud Vision (Módulo OCR-HANDLER)
1. Extrae Nombres, Apellidos y Cédula de las fotografías de **Cédulas Colombianas**.
2. Extrae el PIN, Propietarios vigentes y la Dirección exacta leyendo el **Certificado de Tradición y Libertad**.
3. **Lógica Multipropietario**: Si en la fase de lectura de tradición y libertad se detectan > 2 propietarios, el sistema debe alertar para diligenciar un formulario auxiliar de firmas escalonadas.
4. **Optimización de Costos**: Se envía el `base64` directamente sin sobrecargar almacenamiento.

### Webhooks y Wompi (Integración en Fase Actual)
- El sistema tiene contemplada la lógica para bloquear formularios 2 y 3 hasta que el inquilino efectúe un pago exitoso validado por firma SHA-256 desde Wompi en el Formulario 1.

---
**Fin del Documento Maestro - E-FirmaContrata v3.1**
