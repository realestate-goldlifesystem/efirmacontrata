# Plan de Acción y Cerebro de Integración (Autocrat & Backend)

Este documento centraliza el conocimiento sobre cómo están mapeados los datos desde el Frontend (React) hasta el CRM (Google Sheets) y finalmente a la generación de actas y contratos (Motor Autocrat Nativo). El objetivo es tener una visión 100% clara para futuras integraciones.

## 1. El Puente Frontend $\rightarrow$ CRM

El formulario en React (`RegisterPropertyForm.tsx`) genera un JSON `payload` donde las **claves** (keys) deben ser **exactamente iguales** a los encabezados de la pestaña `1.1 - INMUEBLES REGISTRADOS` en Google Sheets. 

Cualquier discrepancia (un espacio adicional, una tilde, o una letra diferente) hará que la columna quede vacía en la base de datos.

### Campos Calculados de Valor y Textos
Para evitar errores humanos y automatizar los contratos, los valores financieros se convierten automáticamente a texto en español y se dividen según el `TIPO DE NEGOCIO`:

- **Si es Venta, Admi-Venta o Vendi-Renta:**
  - `PRECIO DE PROMOCION EN VENTA` $\rightarrow$ Número
  - `PRECIO DE PROMOCION EN VENTA EN LETRA` $\rightarrow$ Texto
- **Si es Administración, Corretaje, Admi-Venta o Vendi-Renta:**
  - `PRECIO DE PROMOCION GENERAL` $\rightarrow$ Número
  - `PRECIO DE PROMOCION GENERAL EN LETRA` $\rightarrow$ Texto
- **Para Administración:**
  - `PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)` $\rightarrow$ Número
  - `PRECIO DE ADMINISTRACION PLENA EN LETRA` $\rightarrow$ Texto

---

## 2. El Motor de "Autocrat Nativo" (Backend Apps Script)

Como el formulario nativo de Google Forms fue reemplazado por la interfaz en React, la extensión de **Autocrat no se dispara automáticamente** por el evento `onFormSubmit` tradicional.

Por lo tanto, la arquitectura de Apps Script se modificó así:

1. `GESTOR DE DOCUMENTOS.js` recibe el Webhook desde React.
2. Añade la fila a `1.1 - INMUEBLES REGISTRADOS`.
3. Dispara manualmente `onFormSubmitInmueble()` (simulando un Form Submit).
4. El archivo `1- REGISTRO DE INMUEBLE.js` lee la fila, asigna IDs y programa el Archivo 2.
5. El archivo `2- REGISTRO DE INMUEBLE.js` **ejecuta `generarDocumentoNativo()`** (el reemplazo de Autocrat).
6. Este motor lee los tags de los documentos directamente (los tags configurados previamente en la pestaña *DO NOT DELETE - AutoCrat Job Settings*).
7. Finalmente, inyecta los `Merged Doc ID` en la hoja de Excel y mueve los PDFs a Drive.

### ¿Dónde verificar el mapeo de Tags de Autocrat?
Si en el futuro se requiere conectar un campo nuevo a los PDFs, debes consultar la pestaña oculta en el Excel: **`DO NOT DELETE - AutoCrat Job Settings`**. 
Esta pestaña sigue siendo el "cerebro" que indica qué columna de Excel (`<<TIPO DE NEGOCIO>>`) se reemplaza en qué plantilla de Google Docs.

---

## 3. Lista de Tareas para Asegurar el 100% de Integración

- [x] **Vigilancia, Zonas y Vías:** Se agregaron los campos extra y se mapearon a sus columnas exactas (Residencial, Comercial, Industrial, Campestre, etc).
- [x] **Traducción de Precios a Letras:** Se integró la función `numberToWordsSpanish` que pasa todo de número a letra para los contratos (Venta, General y Administración) incluyendo validación gramatical.
- [x] **Validación y Pruebas Reales:** Hacer un envío del formulario en vivo (tipo Vendi-Renta) para observar si la fila cae completa y si los PDFs se autogeneran con ambos valores en letra y en número. ¡Completado exitosamente!
- [x] **Verificación de Tags en Contratos:** Si un campo se muestra en blanco en los PDFs (ej. en la carpeta de Drive `17gAoQX9DQ8AaGT0_qHLYu7T1orh62v7c`), se debe revisar el archivo de Job Settings para confirmar que el Tag sea idéntico al Header. ¡Todo el mapeo fue validado con éxito!

> **💡 Nota Técnica:** Si en algún momento necesitas extraer toda la estructura del formulario o las columnas actualizadas, puedes llamar al endpoint `getFormStructure` de la API en el Gestor de Documentos.

---

## 4. Métodos de Validación y Mapeo Múltiple

Gracias a la información centralizada en el `CEREBRO_DEL_PROYECTO.md`, el sistema y yo tenemos la capacidad de cruzar y validar información por **4 vías distintas** para asegurar la conectividad al 100%:

1.- **Mapeo de Variables:** Cada Job tiene una correspondencia estricta entre una "Etiqueta" (Tag en el DOC) y un "Encabezado" (Header en la Columna).
- **Control de Ejecución:** Autocrat está configurado para ejecutarse bajo condiciones muy específicas, usualmente cuando un registro cambia de estado o se completa.
- **IDs de Plantillas de Google Docs por Negocio:**
  - Corretaje: `1b6aL71TyCNvgOVEh7krZNQIYJdbCA5Zx15BYD6FEnxE`
  - Administración: `1C_IJXKdf031UyWo2fO9O775DYZeWpKFxX53r3afoxmE`
  - Venta: `1uPe1pK_e1MPI87KiOepNAeqWYpxgG7wwhrKbgfa6UL8`
  - Vendi-Renta: `1RJDKSlknlIa9cxyAVICDck3HfwLP6y9m5PvP2MbyZqM`
  - Admi-Venta: `1IKmt_elr6neRUdN3lUtYmIdfgVYti4ULvef9sEz_E90`
  - Acta de Autorización de Ingreso: `1t4I70FYHWXVzN9HvYzFpjXQr5NrAkCeJqQvSAuz22Rs`
2. **Vía Sheet (Cabezales):** Analizando y validando directamente los títulos de la pestaña `1.1 - INMUEBLES REGISTRADOS` para que hagan *match* exacto con el JSON Payload enviado desde el Portafolio.
3. **Vía Archivo Físico (PDF):** Validando visual o textualmente la estructura del formulario oficial `FORMULARIO DE REGISTRO DE INMUEBLE PARA PROMOCIÓN INMOBILIARIA.pdf` para asegurar que el Frontend React replique la experiencia y los flujos condicionales de la empresa.
4. **Vía Documentos y Tags de Autocrat:** Cruzando las preguntas del formulario (cabezales) con los `<<TAGS>>` incrustados en las actas y contratos finales (como las actas en Drive: `17gAoQX9DQ8AaGT0_qHLYu7T1orh62v7c` y la de Autorización de Ingreso `1hLFCeF4F9HrlPFBp3ER9uytOBOzhxW7r`). Se pueden verificar los tags manualmente o mediante scripts que llamen a la API de Drive para escanear el contenido del documento.
5. **Vía el Cerebro de Autocrat (Pestaña del Sheet):** Si no queremos entrar directamente a los documentos físicos, podemos usar la pestaña oculta `DO NOT DELETE - AutoCrat Job Settings` en la hoja de cálculo. Esta pestaña es el "cerebro" donde reposan los IDs de las plantillas y el mapeo exacto de todos los `<<tags>>` versus las columnas, sirviendo como diccionario principal.
