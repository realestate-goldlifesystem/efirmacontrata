# 📜 MANUAL MAESTRO Y DOCUMENTACIÓN ULTRA DETALLADA - E-FIRMACONTRATA v3.1
**Real Estate Gold Life System**

> **Estado del Sistema:** Producción Activa  
> **Despliegue Apps Script Backend:** Versión Activa `@HEAD` (URL `/exec`)  
> **ID de Implementación en Config (`config.js`):** `AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW`  
> **Frontend:** GitHub Pages (`https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/`)

---

## 🎯 1. Objetivo General del Sistema

Automatizar el proceso **end-to-end (de principio a fin)** de recolección de datos, pago inicial del estudio, validación documental (vía OCR con Google Cloud Vision), revisión colaborativa mediante bitácora transparente y generación definitiva de contratos (Arrendamiento, Corretaje, Compraventa) en PDF Original, culminando en la entrega oficial para la firma electrónica externa (VíaFirma).

---

## 🏗️ 2. Arquitectura de Componentes

### 🖥️ A. Frontend (Interfaces de Usuario en GitHub Pages)
1. **Formulario de Inquilino (`formulario-inquilino.html`)**: Recoge datos del inquilino, codeudores y procesa la preferencia de pago vía Mercado Pago.
2. **Formulario de Propietario (`formulario-propietario.html`)**: Recoge datos del propietario, inmueble y Certificado de Tradición y Libertad (con enlace directo de compra a la SNR `https://certificados.supernotariado.gov.co/certificado`).
3. **Panel de Validación (`panel_validacion.html`)**: "Centro de Mando" exclusivo del administrador (desplegado como Sidebar en Google Sheets). Controla las aprobaciones, la generación de borradores y el despacho de correos.
4. **Validador Transparente (`validador-de-contratos.html`)**: Portal público colaborativo donde Inquilino, Propietario y Codeudores visualizan el borrador en Google Docs, revisan la bitácora de comentarios y aprueban o solicitan correcciones.
5. **Popups de Correo (`popup_email_inquilino.html`, `popup_email_propietario.html`)**: Modales del administrador en Google Sheets para iniciar las solicitudes a las partes.

### ⚙️ B. Backend (Google Apps Script)
1. **`GESTOR DE DOCUMENTOS.js`**: Maneja la recepción de formularios, almacenamiento en Drive y lógica de actualización de estados documentales.
2. **`GESTOR_CONTRATOS.js`**: Motor maestro de contratos. Clona plantillas, inyecta datos desde "El Cerebro", genera borradores, envía correos de revisión y convierte el documento final a PDF Original.
3. **`API_MERCADOPAGO.js`**: Crea preferencias de pago, procesa el webhook `notification_url`, registra pagos en `PAGOS_RECIBIDOS` y ejecuta el cron de auditoría de reembolsos (`auditorDeContratosVencidos`).
4. **`API_MULTIMEDIA.js` & `OCR-HANDLER.js`**: Integración con Google Cloud Vision API para lectura de Cédulas y Certificados de Tradición y Libertad.
5. **`UTIL_JerarquiaCarpetas.js`**: Estructura de directorios estandarizada en Google Drive por Inmueble y Año.

---

## 🔍 3. Análisis de la Garantía de Reembolso Mercado Pago (48 Horas)

### 3.1 Regla de Negocio
El cliente realiza el pago del estudio ($85.000 COP) al inicio del trámite. Mercado Pago ofrece una garantía de reembolso automático si el servicio no es entregado dentro de las **48 horas** (`minutesDiff >= 2880`).

### 3.2 Protección del Pago y Candado de Seguridad
Para evitar reembolsos indebidos una vez que el administrador o el sistema ha generado el borrador o iniciado el envío a validación, el script `auditorDeContratosVencidos()` ejecuta la siguiente verificación:

1. **Lectura Multicolumna Dinámica:** En la hoja `1.1 - INMUEBLES REGISTRADOS`, lee simultáneamente las 3 columnas de estado del inmueble:
   * `ESTADO DEL INMUEBLE`
   * `ESTADO DOCUMENTAL`
   * `DETALLES DEL ESTADO DEL INMUEBLE`
2. **Evaluación de Estado Seguro:** Combina los valores (`textoCombinado`) y verifica si contiene alguno de los términos clave:
   * `"CONTRATO GENERADO"`, `"CONTRATO EN REVISION"`, `"BORRADOR ENVIADO"`, `"EN REVISION"`, `"CONTRATO APROBADO POR TODAS LAS PARTES"`, `"CONTRATO ORIGINAL GENERADO"`, `"READY_CONTRACT"`, `"CONTRACT_GENERATED"`, `"CONTRACT_REVIEW"`, `"CONTRACT_FINAL"`, `"COMPLETED"`, `"BORRADOR"`, `"CONTRATO"`.
3. **Bloqueo del Reembolso:** Si `esEstadoSeguro = TRUE`, el bloque de devolución API a Mercado Pago **se ignora**. El dinero en `PAGOS_RECIBIDOS` permanece en estado **`APROBADO`** y queda definitivamente consolidado como ingreso para Gold Life System.

---

## 🛠️ 4. Flujo Detallado Paso a Paso (Passes 1 a 6)

### 📌 PASO 1: Disparador Inicial y Envío de Enlace al Inquilino
* **Acción Admin:** Cambia `ESTADO DEL INMUEBLE` a `ESTUDIO APROBADO` en Google Sheets.
* **Backend (`UTIL_Triggers.js`):** El trigger `onEdit` detecta la edición y despliega `popup_email_inquilino.html`.
* **Disparo de Email (`enviarEmailInquilinoInicial`):**
  * **Asunto:** `Solicitud de Datos y Documentos para Contrato - [ID_REGISTRO]`
  * **Título HTML:** `Bienvenido al Proceso de Arrendamiento`
  * **Mensaje Principal:** *"Ha sido seleccionado para iniciar el proceso de arrendamiento del inmueble. Por favor ingrese al formulario seguro para completar sus datos y adjuntar su documentación."*
  * **Botón:** `[ DILIGENCIAR FORMULARIO DE INQUILINO ]` ➡️ Enlaza a `formulario-inquilino.html?cdr=ID`
* **Transición en Sheet:**
  * `ESTADO DEL INMUEBLE`: `"SOLICITUD ENVIADA AL INQUILINO"`
  * `ESTADO DOCUMENTAL`: `"PENDIENTE"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"⏳ Esperando registro y documentación del inquilino"`

---

### 📌 PASO 2: Formulario Inquilino, Pago en Mercado Pago y OCR Cédula
* **Usuario:** Inquilino ingresa a `formulario-inquilino.html`.
* **Pasarela de Pago:** El backend (`API_MERCADOPAGO.js`) genera la preferencia de Mercado Pago. El inquilino paga $85.000 COP.
* **Procesamiento de Pago:** Webhook recibe el evento, guarda la transacción en la pestaña **`PAGOS_RECIBIDOS`** con estado **`APROBADO`**.
* **Carga Documental:** Inquilino sube foto de Cédula y datos de Codeudores.
* **OCR (`OCR-HANDLER.js`):** Extrae nombres, apellidos y número de documento.
* **Transición en Sheet:**
  * `ESTADO DEL INMUEBLE`: `"SOLICITUD ENVIADA AL INQUILINO"`
  * `ESTADO DOCUMENTAL`: `"INQ_SUBMITTED"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"📄 Formulario de inquilino diligenciado. Pendiente validación"`

---

### 📌 PASO 3: Validación del Inquilino y Solicitud al Propietario
* **Acción Admin:** En `panel_validacion.html`, aprueba la documentación del inquilino.
* **Disparo de Email (`enviarEmailPropietarioInicial`):**
  * **Asunto:** `Solicitud de Documentación del Propietario - [ID_REGISTRO]`
  * **Título HTML:** `Registro de Documentos del Propietario`
  * **Mensaje Principal:** *"El estudio del inquilino ha sido aprobado. Requerimos completar la información del propietario y cargar el Certificado de Tradición y Libertad."*
  * **Botón:** `[ DILIGENCIAR FORMULARIO DE PROPIETARIO ]` ➡️ Enlaza a `formulario-propietario.html?cdr=ID`
* **Transición en Sheet:**
  * `ESTADO DEL INMUEBLE`: `"SOLICITUD ENVIADA AL PROPIETARIO"`
  * `ESTADO DOCUMENTAL`: `"INQ_VALIDATED"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"✅ Documentos del inquilino aprobados. Pendiente formulario propietario"`

---

### 📌 PASO 4: Formulario Propietario, OCR Certificado SNR y Generación de Borrador
* **Usuario:** Propietario entra a `formulario-propietario.html`.
* **Certificado SNR:** Si el propietario no lo tiene o está vencido (>30 días), la interfaz provee el enlace directo: `https://certificados.supernotariado.gov.co/certificado`.
* **OCR SNR (`OCR-HANDLER.js`):** Extrae dirección, PIN de la propiedad y nombres de propietarios registrados.
* **Aprobación Admin:** En `panel_validacion.html`, el admin presiona **"📝 Generar Borrador"**.
* **Ejecución Backend (`generarContrato(cdr, 'Borrador')`):**
  1. Toma la plantilla de borrador.
  2. Crea la copia en la carpeta del inmueble: `ENTREGAS DEL INMUEBLE -> [Año] -> DOCUMENTOS DE ENTREGA - INQUILINO -> 2- CONTRATO DE ARRENDAMIENTO`.
  3. Reemplaza las etiquetas (`{{NOMBRE_INQUILINO}}`, `{{CANON}}`, etc.) desde "El Cerebro".
* **Transición en Sheet:**
  * `ESTADO DEL INMUEBLE`: `"CONTRATO GENERADO"`
  * `ESTADO DOCUMENTAL`: `"CONTRACT_GENERATED"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"📝 Borrador generado (Arrendamiento). ID: [DocID]"`

---

### 📌 PASO 5: Envío a Negociación y Bitácora Transparente
* **Botón en Panel:** `<button onclick="enviarBorrador(...)">📧 Enviar Borrador a las Partes</button>`
* **Función Backend:** `enviarBorradorAValidar(cdr, comentario_admin)`
* **Transición en Sheet:**
  * `ESTADO DEL INMUEBLE`: `"CONTRATO EN REVISION"`
  * `ESTADO DOCUMENTAL`: `"CONTRACT_REVIEW"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"📧 Enviado a las partes para revisión y aprobación."`

#### ✉️ Plantillas de Correo de Revisión Enviadas a las Partes:

##### A. Email al Inquilino (`enviarEmailRevisionInquilino`):
* **Asunto:** `Borrador del Contrato de Arrendamiento para Revisión - [ID_REGISTRO]`
* **Título HTML:** `Borrador del Contrato Listo para Revisión como Inquilino`
* **Mensaje Principal:** *"El borrador de su contrato de arrendamiento está listo. Por favor, ingrese a nuestro portal de validación transparente para revisar los términos, aprobar el documento o solicitar cambios."*
* **Mensaje Secundario:** *"Nuestro sistema registrará cualquier observación en la bitácora del contrato, asegurando transparencia entre todas las partes involucradas."*
* **Botón:** `[ REVISAR Y VALIDAR BORRADOR DEL CONTRATO ]` ➡️ Enlaza a `validador-de-contratos.html?cdr=ID&rol=inquilino`

##### B. Email al Propietario (`enviarEmailRevisionPropietario`):
* **Asunto:** `Borrador del Contrato de Arrendamiento para Revisión - [ID_REGISTRO]`
* **Título HTML:** `Borrador del Contrato Listo para Revisión como Propietario`
* **Mensaje Principal:** *"El borrador del contrato de arrendamiento de su propiedad está listo para revisión. Por favor, ingrese a nuestro portal de validación transparente y verifique que todos los términos sean correctos."*
* **Mensaje Secundario:** *"Nuestro sistema registrará cualquier observación en la bitácora del contrato, asegurando transparencia entre todas las partes involucradas."*
* **Botón:** `[ REVISAR Y VALIDAR BORRADOR DEL CONTRATO ]` ➡️ Enlaza a `validador-de-contratos.html?cdr=ID&rol=propietario`

##### C. Email al Codeudor (`enviarEmailRevisionCodeudor`):
* **Asunto:** `Borrador del Contrato de Arrendamiento - Codeudor - [ID_REGISTRO]`
* **Título HTML:** `Borrador del Contrato Listo para Revisión como Codeudor`
* **Mensaje Principal:** *"Ha sido designado como codeudor en un contrato de arrendamiento. Por favor, ingrese a nuestro portal de validación transparente para revisar el borrador del contrato, sus responsabilidades y aprobar el documento."*
* **Mensaje Secundario:** *"Como codeudor, usted responde solidariamente por el pago del canon y garantiza el cumplimiento del contrato. Nuestro sistema registrará su aprobación en la bitácora del contrato."*
* **Botón:** `[ REVISAR Y VALIDAR BORRADOR DEL CONTRATO ]` ➡️ Enlaza a `validador-de-contratos.html?cdr=ID&rol=codeudor`

---

### 📌 PASO 6: Generación del PDF Original, Despacho Final y Auto-Apagado de UI
* **Botón en Panel:** `<button id="btnGenerarOriginal" class="btn-success">🔏 Generar y Descargar Original</button>`
* **Función Backend:** `generarContrato(cdr, 'Original')`
* **Acciones Internas:**
  1. Toma la ID del Borrador Aprobado.
  2. Crea la versión definitiva sustituyendo "BORRADOR" por "ORIGINAL".
  3. Convierte a PDF binario (`getAs(MimeType.PDF)`).
  4. Guarda el PDF en Drive (`2- CONTRATO DE ARRENDAMIENTO`).

#### ✉️ Plantillas de Correo de Despacho Final:

##### A. Correo al Administrador (`enviarEmailFinalAdmin`):
* **Asunto:** `PDF FINAL LISTO - Contrato Original de Arrendamiento - [ID_REGISTRO]`
* **Título HTML:** `Contrato Original Definitivo Generado`
* **Mensaje Principal:** *"El contrato de arrendamiento <strong>[ID]</strong> ha sido aprobado por todas las partes y el documento ORIGINAL en PDF ha sido generado exitosamente."*
* **Mensaje Secundario:** *"El documento adjunto está listo para ser subido a la plataforma de firmas electrónicas (VíaFirma)."*
* **Adjunto:** `Contrato_[Tipo]_[Nombre]_[ID].pdf` (Archivo PDF).
* **Botón:** `[ VER PDF ORIGINAL EN DRIVE ]`

##### B. Correo a los Clientes (Inquilino, Propietario, Codeudores):
* **Asunto:** `Contrato Original Aprobado - Listo para Firma Electrónica: [ID_REGISTRO]`
* **Título HTML:** `Contrato Original Definitivo Listo para Firma`
* **Mensaje Principal:** *"El contrato de arrendamiento <strong>[ID]</strong> ha sido aprobado por todas las partes y el documento definitivo ha sido generado exitosamente en formato PDF Original."*
* **Mensaje Secundario:** *"Por favor esté atento a su bandeja de entrada. Muy pronto recibirá el correo oficial de la plataforma de firmas electrónicas para proceder con la firma digital del documento."*

#### 🛑 Cierre Definitivo de UI (`panel_validacion.html`):
* **Transición Final:**
  * `ESTADO DEL INMUEBLE`: `"CONTRATO ORIGINAL GENERADO"`
  * `ESTADO DOCUMENTAL`: `"COMPLETED"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"✅ PDF Final generado. ID: [FileID]"`
* **Auto-Apagado de UI:** `google.script.host.close()` destruye automáticamente el Sidebar en Google Sheets, manteniendo limpia la bandeja de entrada del administrador.

---

## 📊 5. Tabla Maestra de Seguimiento de Estados en Google Sheets

| # | Etapa / Evento | `ESTADO DEL INMUEBLE` | `ESTADO DOCUMENTAL` | `DETALLES DEL ESTADO DEL INMUEBLE` | Reembolso MP |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **0** | Registro Inicial | `DISPONIBLE` / `REGISTRANDO` | `PENDIENTE` | `Inmueble habilitado para inicio de trámites` | N/A |
| **1** | Disparador Inicial | `SOLICITUD ENVIADA AL INQUILINO` | `PENDIENTE` | `⏳ Esperando registro y documentación del inquilino` | Evalúa 48h |
| **2** | Formulario Inquilino & Pago | `SOLICITUD ENVIADA AL INQUILINO` | `INQ_SUBMITTED` | `📄 Formulario de inquilino diligenciado. Pendiente validación` | Evalúa 48h |
| **3** | Validación Inquilino | `SOLICITUD ENVIADA AL PROPIETARIO` | `INQ_VALIDATED` | `✅ Documentos del inquilino aprobados. Pendiente formulario propietario` | Evalúa 48h |
| **4** | Formulario Propietario | `SOLICITUD ENVIADA AL PROPIETARIO` | `PROP_SUBMITTED` | `📄 Formulario del propietario diligenciado. Pendiente validación` | Evalúa 48h |
| **5** | Validación Propietario | `READY_CONTRACT` | `READY_CONTRACT` | `🟢 Inquilino y Propietario validados. Listo para generar contrato.` | **BLOQUEADO** |
| **6** | Generar Borrador | **`CONTRATO GENERADO`** | `CONTRACT_GENERATED` | `📝 Borrador generado (Arrendamiento). ID: [DocID]` | **BLOQUEADO** |
| **7** | Enviar a Revisión | **`CONTRATO EN REVISION`** | `CONTRACT_REVIEW` | `📧 Enviado a las partes para revisión y aprobación.` | **BLOQUEADO** |
| **8** | Objeción de Partes | **`EN REVISION`** | `PROP_CORRECTION` | `⚠️ Corrección solicitada por [Rol]: [Observaciones]` | **BLOQUEADO** |
| **9** | Aprobación Total | **`CONTRATO APROBADO POR TODAS LAS PARTES`** | `CONTRACT_FINAL` | `✅ Contrato aprobado por todas las partes.` | **BLOQUEADO** |
| **10**| PDF Original Final | **`CONTRATO ORIGINAL GENERADO`** | `COMPLETED` | `✅ PDF Final generado. ID: [FileID]` | **BLOQUEADO** |

---

## 📁 6. Jerarquía Dinámica de Carpetas en Google Drive

📂 **[CARPETA PRINCIPAL DE INMUEBLES]**  
 └─ 📂 **`REG_[FECHA]_[DIRECCION]`** (Carpeta del Inmueble)  
     └─ 📂 **`ENTREGAS DEL INMUEBLE`**  
         └─ 📂 **`2026`** (Año en curso)  
             └─ 📂 **`DOCUMENTOS DE ENTREGA - INQUILINO`**  
                 └─ 📂 **`2- CONTRATO DE ARRENDAMIENTO`**  
                     ├─ 📄 `Borrador_Contrato_Arrendamiento_CL500666` (GDoc editable)  
                     └─ 📄 `Contrato_Arrendamiento_CL500666_FINAL.pdf` (PDF Original inmodificable)

---
**Fin del Manual Maestro - E-FirmaContrata v3.1**
