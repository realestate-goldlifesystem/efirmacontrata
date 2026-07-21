# 📜 E-FIRMACONTRATA: DOCUMENTACIÓN MAESTRA DE FLUJO Y ARQUITECTURA DETALLADA (END-TO-END)
**Real Estate - Gold Life System v3.1**

Este documento detalla de forma exhaustiva, función por función, interfaz por interfaz, correo por correo y estado por estado, todo el ciclo de vida de **E-FirmaContrata**.

---

## 🎯 1. Diagnóstico de Garantía y Diagnóstico Técnico (Solución al Reembolso Erróneo)

### ❌ ¿Por qué ocurrió el reembolso de las 48 horas si el borrador ya se había generado?
1. Cuando el administrador (o el sistema) genera el borrador desde el **Panel de Validación**, la función `actualizarEstadoContrato()` en `GESTOR_CONTRATOS.js` actualizaba la columna **`ESTADO DEL INMUEBLE`** a los siguientes valores en español:
   - `"CONTRATO GENERADO"`
   - `"CONTRATO EN REVISION"`
   - `"BORRADOR ENVIADO"`
2. Sin embargo, el script de auditoría automática `auditorDeContratosVencidos()` en `API_MERCADOPAGO.js` (encargado de devolver el dinero si transcurren más de 48h):
   - **Solo leía la columna `ESTADO DOCUMENTAL`** (e ignoraba la columna `ESTADO DEL INMUEBLE`).
   - Comparaba el valor únicamente contra constantes en inglés: `['READY_CONTRACT', 'CONTRACT_GENERATED', 'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED']`.
3. **Consecuencia:** Dado que la columna `ESTADO DOCUMENTAL` conservaba el valor anterior (`PROP_VALIDATED`), `auditorDeContratosVencidos()` determinó erróneamente que la solicitud fue abandonada y disparó la orden de reembolso automático vía API de Mercado Pago.

### 🛠️ Solución Aplicada y Desplegada
Se actualizó la función `auditorDeContratosVencidos()` en `API_MERCADOPAGO.js`. Ahora evalúa de forma combinada las tres columnas principales:
- `ESTADO DEL INMUEBLE`
- `ESTADO DOCUMENTAL`
- `DETALLES DEL ESTADO DEL INMUEBLE`

Asimismo, reconoce tanto etiquetas en inglés como en español (`CONTRATO GENERADO`, `CONTRATO EN REVISION`, `BORRADOR ENVIADO`, `CONTRATO ORIGINAL GENERADO`, `CONTRATO APROBADO`). Una vez generado el borrador, el cobro es **efectivo y definitivo**, evitando reembolsos imprevistos.

---

## 🗺️ 2. Mapa Global del Flujo End-to-End

```mermaid
flowchart TD
    A["1. Sheet: ESTUDIO APROBADO"] --> B["2. popup_email_inquilino.html"]
    B --> C["3. formulario-inquilino.html + Mercado Pago"]
    C --> D["4. formulario-propietario.html + OCR Tradición"]
    D --> E["5. panel_validacion.html (Sidebar Admin)"]
    E --> F["6. validador-de-contratos.html (Bitácora de Partes)"]
    F --> G["7. Generación PDF Original + Cierre UI"]
## 📊 4. Tabla Maestra de Seguimiento de Estados en Google Sheets

A continuación se detalla el valor exacto que adquiere la columna **`ESTADO DEL INMUEBLE`** (junto a `ESTADO DOCUMENTAL` y `DETALLES DEL ESTADO DEL INMUEBLE`) durante cada fase y formulario del proceso:

| Paso / Fase | Evento / Acción | `ESTADO DEL INMUEBLE` | `ESTADO DOCUMENTAL` | `DETALLES DEL ESTADO DEL INMUEBLE` |
| :--- | :--- | :--- | :--- | :--- |
| **0. Inicio** | Registro del Inmueble | `DISPONIBLE` / `REGISTRANDO` | `PENDIENTE` | `Inmueble habilitado para inicio de trámites` |
| **1. Disparador Inicial** | Admin selecciona `ESTUDIO APROBADO` y confirma popup (`popup_email_inquilino.html`) | `SOLICITUD ENVIADA AL INQUILINO` | `PENDIENTE` | `⏳ Esperando registro y documentación del inquilino` |
| **2. Formulario Inquilino** | Inquilino realiza pago en Mercado Pago y sube sus datos en `formulario-inquilino.html` | `SOLICITUD ENVIADA AL INQUILINO` | `INQ_SUBMITTED` | `📄 Formulario de inquilino diligenciado. Pendiente validación` |
| **3. Validación Inquilino** | Admin aprueba al inquilino desde `panel_validacion.html` | `SOLICITUD ENVIADA AL PROPIETARIO` | `INQ_VALIDATED` | `✅ Documentos del inquilino aprobados. Pendiente formulario propietario` |
| **4. Formulario Propietario** | Propietario sube sus datos y certificado en `formulario-propietario.html` | `SOLICITUD ENVIADA AL PROPIETARIO` | `PROP_SUBMITTED` | `📄 Formulario del propietario diligenciado. Pendiente validación` |
| **5. Validación Propietario** | Admin aprueba al propietario en `panel_validacion.html` | `READY_CONTRACT` | `READY_CONTRACT` | `🟢 Inquilino y Propietario validados. Listo para generar contrato.` |
| **6. Generar Borrador** | Admin presiona "📝 Generar Borrador" (`generarContrato(cdr, 'Borrador')`) | **`CONTRATO GENERADO`** | `CONTRACT_GENERATED` | `📝 Borrador generado (Arrendamiento). ID: [DocID]` |
| **7. Enviar a Revisión** | Admin presiona "📧 Enviar Borrador" (`enviarBorradorAValidar(cdr)`) | **`CONTRATO EN REVISION`** | `CONTRACT_REVIEW` | `📧 Enviado a las partes para revisión y aprobación.` |
| **8. Objeción Partes** | Alguna de las partes solicita cambios desde `validador-de-contratos.html` | **`EN REVISION`** / **`CORRECCION`** | `PROP_CORRECTION` / `INQ_CORRECTION` | `⚠️ Corrección solicitada por [Rol]: [Observaciones]` |
| **9. Aprobación Partes** | Inquilino, Propietario y Codeudores aprueban en `validador-de-contratos.html` | **`CONTRATO APROBADO POR TODAS LAS PARTES`** | `CONTRACT_FINAL` | `✅ Contrato aprobado por todas las partes.` |
| **10. PDF Final** | Admin presiona "🔏 Generar Original" (`generarContrato(cdr, 'Original')`) | **`CONTRATO ORIGINAL GENERADO`** | `COMPLETED` | `✅ PDF Final generado. ID: [FileID]` |

---

## 🔀 5. Desglose Exhaustivo Paso a Paso

---

### 🟢 PASO 1: Activación Inicial y Despacho al Inquilino

#### 1.1 Backend: Trigger de Detección
* **Archivo:** `UTIL_Triggers.js`
* **Función:** `onEdit(e)`
* **Mecánica:** Se dispara automáticamente al modificar la hoja `1.1 - INMUEBLES REGISTRADOS`. Cuando la columna `ESTADO DEL INMUEBLE` cambia a `"ESTUDIO APROBADO"`, extrae el `CODIGO DE REGISTRO` (CDR) y levanta la ventana emergente modal: `popup_email_inquilino.html`.

#### 1.2 Frontend Modal: `popup_email_inquilino.html`
* **Campos Formulario Modal:** 
  * Nombre del Inquilino (`#nombreInquilino`)
  * Correo del Inquilino (`#emailInquilino`)
  * Canon de Arrendamiento (`#canon`)
  * Cuota de Estudio ($85.000 COP)
* **Botón de Acción:** `<button id="btnEnviar">🚀 Enviar Enlace de Registro</button>`
* **Función JS Invocada:** Captura el formulario e invoca en backend: `enviarFormularioInquilino(...)`.

#### 1.3 Despacho del Correo
* **Archivo Backend:** `GESTOR DE DOCUMENTOS.js`
* **Función:** `enviarEmailInquilinoInicial(email, nombre, codigoRegistro, urlFormulario, direccion)`
* **Asunto del Correo:** `FORMULARIO DE ARRENDAMIENTO DEL INMUEBLE "[Dirección]" - [CDR]`
* **Cuerpo HTML del Correo enviado al Inquilino:**
```html
Estimado/a [Nombre del Inquilino],

Su solicitud de arrendamiento ha sido aprobada. Para continuar con el proceso en Gold Life System, 
necesitamos que complete el formulario con sus datos y documentos.

[ BOTÓN: DILIGENCIAR FORMULARIO ]
(URL: https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/formulario-inquilino.html?cdr=WCXXXXXX)
```
* **Transición de Estados en Google Sheets:**
  * `ESTADO DEL INMUEBLE`: `"SOLICITUD ENVIADA AL INQUILINO"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"⏳ Esperando registro y documentación del inquilino"`

---

### 💳 PASO 2: Formulario de Inquilino y Pasarela Mercado Pago

#### 2.1 Frontend: `formulario-inquilino.html`
* **Función JS Inicial:** `init()` lee el parámetro `?cdr=...` de la URL.
* **Consulta de Backend:** Ejecuta `verificarEstadoLink(cdr, 'inquilino')`.
* **Comprobación de Pago en `PAGOS_RECIBIDOS`:**
  * **Si NO tiene pago APROBADO:** Muestra la pantalla de bienvenida (`welcomeScreen`) y activa el botón de cobro ($85.000 COP).
  * **Si SÍ tiene pago APROBADO (o modo corrección):** Oculta la pantalla de pago e ingresa directamente al Wizard de carga documental (`mainWizard`).

#### 2.2 Backend: Pasarela Mercado Pago
* **Archivo:** `API_MERCADOPAGO.js`
* **Función:** `crearPreferenciaPago(cdr, monto)`
* **Botón en Frontend:** `<button id="btnPayMP">Pagar con Mercado Pago</button>`
* **Comportamiento:** Mercado Pago procesa el pago. Al ser aprobado, muestra el contador de 3 a 5 segundos y redirige con `auto_return: "approved"` a `formulario-inquilino.html?status=success`.

#### 2.3 Carga Documental y OCR
* **Pasos del Wizard:**
  * **Paso 1 (Datos):** Tipo Doc, Número Doc, Nombres, Correo, Celular. *(Campos con revelación progresiva y verificación doble)*.
  * **Paso 2 (Archivos):** Cédula Frontal (`#docFront`), Cédula Reverso (`#docBack`), Certificado de Ingresos (`#certIngresos`).
  * **Paso 3 (Codeudores):** Selección de tipo de codeudor y sus datos.
* **OCR Automático:** `API_MULTIMEDIA.js` pasa las imágenes por Google Cloud Vision API para extraer cédula y nombres.
* **Envío Final:** Botón `<button id="btnEnviar">✓ Enviar Formulario</button>` llama a `procesarFormularioInquilino(...)`.
* **Transición de Estados en Google Sheets:**
  * `ESTADO DOCUMENTAL`: `"INQ_SUBMITTED"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"📄 Formulario de inquilino diligenciado. Pendiente validación"`

---

### 🏠 PASO 3: Formulario del Propietario y Tradición y Libertad

#### 3.1 Frontend: `formulario-propietario.html`
* **Pasos:**
  * **Paso 1:** Datos personales del propietario.
  * **Paso 2:** Cédula Frontal, Reverso, SARLAFT y **Certificado de Tradición y Libertad**.
  * **Paso 3:** Datos bancarios (Tipo cuenta, Banco, Número, Certificación Bancaria).
  * **Paso 4:** Facturas de Servicios Públicos (Agua, Luz, Gas, Internet).

#### 3.2 OCR y Verificación de Certificado
* **Backend:** `validarCertificadoOCR(base64)` en `OCR-HANDLER.js`.
* **Validación:** Comprueba si el Certificado de Tradición tiene más de 30 días calendario de expedición.
* **Si está vencido o no es legible:** Abre el Modal `#modalOCRValidacion` ofreciendo la compra directa:
  * `<a href="https://certificados.supernotariado.gov.co/certificado">🌐 Comprar Certificado en SNR</a>`
* **Transición de Estados en Google Sheets:**
  * `ESTADO DOCUMENTAL`: `"PROP_SUBMITTED"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"📄 Formulario del propietario diligenciado. Pendiente validación"`

---

### 🧠 PASO 4: El Panel de Validación y Generación del Borrador

#### 4.1 Frontend Sidebar: `panel_validacion.html`
* **Invocación Backend:** `obtenerContratosPendientes()` analiza las filas activas en `1.1 - INMUEBLES REGISTRADOS`.
* **Visualización:** Despliega una tarjeta interactiva con semáforos por cada contrato en curso:
  * Semáforo Inquilino (`INQ_SUBMITTED` = Amarillo, `INQ_VALIDATED` = Verde)
  * Semáforo Propietario (`PROP_SUBMITTED` = Amarillo, `PROP_VALIDATED` = Verde)

#### 4.2 Botones de Validación del Admin
* `<button onclick="aprobarInquilino(...)">Validar Inquilino</button>`
  * Ejecuta `procesarAccionValidacion('aprobarInquilino')`.
  * `ESTADO DOCUMENTAL` = `"INQ_VALIDATED"`
* `<button onclick="aprobarPropietario(...)">Validar Propietario</button>`
  * Ejecuta `procesarAccionValidacion('aprobarPropietario')`.
  * Si ambos están validados -> `ESTADO DOCUMENTAL` = `"READY_CONTRACT"`
  * `DETALLES`: `"🟢 Inquilino y Propietario validados. Listo para generar contrato."`

#### 4.3 Generación del Borrador
* **Botón en Panel:** `<button id="btnGenerarBorrador">📝 Generar Borrador del Contrato</button>`
* **Función Backend:** `generarContrato(cdr, 'Borrador')` en `GESTOR_CONTRATOS.js`.
* **Acciones Internas:**
  1. Recopila la información consolidada desde el documento maestro **"El Cerebro"** (`DATOS DE ELABORACION`).
  2. Clona la plantilla de borrador (`PLANTILLA_CORRETAJE_BORRADOR_ID`).
  3. Guarda la copia en Drive en la carpeta: `INMUEBLES -> [ID] -> ENTREGAS DEL INMUEBLE -> [Año] -> DOCUMENTOS DE ENTREGA - INQUILINO -> 2- CONTRATO DE ARRENDAMIENTO`.
  4. Reemplaza todas las llaves (`{{NOMBRE_INQUILINO}}`, `{{CANON}}`, `{{DIRECCION}}`).
* **Transición de Estados en Google Sheets:**
  * `ESTADO DEL INMUEBLE`: `"CONTRATO GENERADO"`
  * `DETALLES DEL ESTADO DEL INMUEBLE`: `"📝 Borrador generado (Arrendamiento). ID: [DocID]"`

---

### 🤝 PASO 5: Envío a Negociación y Validador Transparente

#### 5.1 Despacho a Revisión
* **Botón en Panel:** `<button onclick="enviarBorrador(...)">📧 Enviar Borrador a las Partes</button>`
* **Función Backend:** `enviarBorradorAValidar(cdr, comentario_admin)`
* **Actualización Sincronizada en Google Sheets (`1.1 - INMUEBLES REGISTRADOS`):**
  * **`ESTADO DEL INMUEBLE`**: `"CONTRATO EN REVISION"`
  * **`ESTADO DOCUMENTAL`**: `"CONTRACT_REVIEW"`
  * **`DETALLES DEL ESTADO DEL INMUEBLE`**: `"📧 Enviado a las partes para revisión y aprobación."`

> [!IMPORTANT]
> **🔒 GARANTÍA DE RETENCIÓN DE PAGO Y PROTECCIÓN EN `PAGOS_RECIBIDOS`:**
> 1. **Pestaña `PAGOS_RECIBIDOS`:** El registro en la fila correspondiente al CDR permanece intacto con su estado en Columna E como `'APROBADO'` (Monto $85.000 COP).
> 2. **Comportamiento del Auditor (`auditorDeContratosVencidos()`):** Cada vez que se ejecuta el cron de 48 horas, consulta los 3 campos del inmueble. Al detectar la combinación (`CONTRATO EN REVISION` / `CONTRACT_REVIEW` / `📧 Enviado a las partes...`), la variable `esEstadoSeguro` toma el valor de `TRUE`.
> 3. **Bloqueo del Reembolso:** Al ser `esEstadoSeguro = TRUE`, el bloque de código de devolución API de Mercado Pago se omite por completo. El dinero queda **definitivamente consolidado para Gold Life System**, ya que el servicio contratado (estudio + generación del borrador + envío a validación) fue cumplido satisfactoriamente.

#### 5.2 Correos Enviados a las Partes

##### A. Email al Inquilino (`enviarEmailRevisionInquilino`):
* **Asunto:** `Borrador del Contrato de Arrendamiento para Revisión - [ID_REGISTRO]`
* **Título HTML:** `Borrador del Contrato Listo para Revisión como Inquilino`
* **Mensaje Principal:** *"El borrador de su contrato de arrendamiento está listo. Por favor, ingrese a nuestro portal de validación transparente para revisar los términos, aprobar el documento o solicitar cambios."*
* **Mensaje Secundario:** *"Nuestro sistema registrará cualquier observación en la bitácora del contrato, asegurando transparencia entre todas las partes involucradas."*
* **Botón:** `[ REVISAR Y VALIDAR BORRADOR DEL CONTRATO ]` -> Enlaza a `validador-de-contratos.html?cdr=ID&rol=inquilino`

##### B. Email al Propietario (`enviarEmailRevisionPropietario`):
* **Asunto:** `Borrador del Contrato de Arrendamiento para Revisión - [ID_REGISTRO]`
* **Título HTML:** `Borrador del Contrato Listo para Revisión como Propietario`
* **Mensaje Principal:** *"El borrador del contrato de arrendamiento de su propiedad está listo para revisión. Por favor, ingrese a nuestro portal de validación transparente y verifique que todos los términos sean correctos."*
* **Mensaje Secundario:** *"Nuestro sistema registrará cualquier observación en la bitácora del contrato, asegurando transparencia entre todas las partes involucradas."*
* **Botón:** `[ REVISAR Y VALIDAR BORRADOR DEL CONTRATO ]` -> Enlaza a `validador-de-contratos.html?cdr=ID&rol=propietario`

##### C. Email al Codeudor (`enviarEmailRevisionCodeudor`):
* **Asunto:** `Borrador del Contrato de Arrendamiento - Codeudor - [ID_REGISTRO]`
* **Título HTML:** `Borrador del Contrato Listo para Revisión como Codeudor`
* **Mensaje Principal:** *"Ha sido designado como codeudor en un contrato de arrendamiento. Por favor, ingrese a nuestro portal de validación transparente para revisar el borrador del contrato, sus responsabilidades y aprobar el documento."*
* **Mensaje Secundario:** *"Como codeudor, usted responde solidariamente por el pago del canon y garantiza el cumplimiento del contrato. Nuestro sistema registrará su aprobación en la bitácora del contrato."*
* **Botón:** `[ REVISAR Y VALIDAR BORRADOR DEL CONTRATO ]` -> Enlaza a `validador-de-contratos.html?cdr=ID&rol=codeudor`

#### 5.3 Interacción en `validador-de-contratos.html`
* Renderiza el visor embebido de Google Docs.
* Muestra la **Bitácora Transparente** con el historial de comentarios.
* **Si el usuario da clic en `[ ✅ Aprobar Contrato ]`:**
  * Invoca `registrarRespuestaValidacion(cdr, rol, 'APROBADO')`.
  * Si todas las partes aprueban -> `ESTADO DEL INMUEBLE` pasa a `"CONTRATO APROBADO POR TODAS LAS PARTES"`.
* **Si el usuario da clic en `[ ⚠️ Solicitar Corrección ]`:**
  * Captura el comentario de objeción y llama a `registrarRespuestaValidacion(cdr, rol, 'CORRECCION', comentario)`.
  * `ESTADO DEL INMUEBLE` pasa a `"EN REVISION"`.
  * Alerta al administrador en el Panel de Validación para que edite el documento en Drive y genere una nueva versión.

---

## 🔏 PASO 6: Generación del PDF Original y Auto-Apagado de UI

#### 6.1 Generación Definitiva
* **Botón en Panel:** `<button id="btnGenerarOriginal" class="btn-success">🔏 Generar y Descargar Original</button>`
* **Función Backend:** `generarContrato(cdr, 'Original')` en `GESTOR_CONTRATOS.js`.
* **Acciones Internas:**
  1. Toma la ID del Borrador Aprobado.
  2. Crea una copia final denominada `Contrato_[Tipo]_[Nombre]_[ID] - FINAL`.
  3. Abre la cabecera del documento y reemplaza la marca `"BORRADOR"` por `"ORIGINAL"`.
  4. Convierte el documento a PDF binario (`getAs(MimeType.PDF)`).
  5. Guarda el archivo `.pdf` final en la carpeta del inmueble en Drive.

#### 6.2 Correos de Cierre y Despacho

##### A. Correo al Administrador (`enviarEmailFinalAdmin`):
* **Asunto:** `PDF FINAL LISTO - Contrato [ID_REGISTRO]`
* **Título HTML:** `Contrato Definitivo Generado`
* **Mensaje:** *"El contrato de arrendamiento [ID] ha sido aprobado por todas las partes y el documento ORIGINAL en PDF ha sido generado exitosamente. El documento adjunto está listo para ser subido a VíaFirma."*
* **Adjunto:** `Contrato_[Tipo]_[Nombre]_[ID].pdf` (Archivo PDF).
* **Botón:** `[ VER PDF EN DRIVE ]`

##### B. Correo a los Clientes (Inquilino, Propietario, Codeudores):
* **Asunto:** `Contrato Aprobado - Esperando Firma: [ID_REGISTRO]`
* **Título HTML:** `Contrato Definitivo Generado`
* **Mensaje:** *"El contrato de arrendamiento [ID] ha sido aprobado por todas las partes y el documento definitivo ha sido generado exitosamente. Por favor esté atento a su bandeja de entrada. Muy pronto recibirá un correo oficial de la plataforma de firmas electrónicas para proceder con la firma digital del documento."*

#### 6.3 Cierre Definitivo de Interfaz
* **Transición Final de Estado en Google Sheets:**
  * **`ESTADO DEL INMUEBLE`**: `"CONTRATO ORIGINAL GENERADO"`
  * **`DETALLES DEL ESTADO DEL INMUEBLE`**: `"✅ PDF Final generado. ID: [FileID]"`
* **Auto-Apagado de la UI (`panel_validacion.html`):**
  * El frontend ejecuta la instrucción `google.script.host.close()`.
  * La ventana del Sidebar en Google Sheets **se cierra y destruye automáticamente**.
  * Al haber alcanzado el estado `"CONTRATO ORIGINAL GENERADO"`, el inmueble sale del grupo de contratos pendientes, manteniendo tu panel de control despejado.
