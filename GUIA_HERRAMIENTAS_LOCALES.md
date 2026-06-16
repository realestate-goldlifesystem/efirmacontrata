# Guía de Herramientas Locales de Refactorización y Auditoría 🛠️

Este documento reúne todas las herramientas locales ubicadas en la carpeta `_herramientas_locales/`, sus objetivos, comandos de ejecución y plantillas de comandos de lenguaje natural (prompts) para utilizarlas y automatizar tareas en el CRM de Gold Life System.

---

## 🚀 Herramienta Principal: Renombrar Columna Global (`renombrar_columna_global.js`)

Esta herramienta fue repotenciada con una fase de escaneo profundo y ejecución paralela para realizar refactorizaciones end-to-end (base de datos + plantillas de AutoCrat + código local en paralelo).

### ¿Qué hace esta herramienta?
* **Fase 1 (Base de Datos):** Conecta con Google Sheets API y actualiza la fila 1 de la hoja `1.1 - INMUEBLES REGISTRADOS` reemplazando el nombre de columna viejo por el nuevo.
* **Fase 2 (AutoCrat):** Re-mapea dinámicamente los tags de combinación en la hoja oculta `DO NOT DELETE - AutoCrat Job Settings` para evitar errores de generación de PDFs.
* **Fase 3 (Refactorización Local Paralela):** Escanea de manera recursiva y paralela (usando `Promise.all` asíncrono) todos los archivos de código (`.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.md`, `.html`, `.txt`) del proyecto y actualiza todas las referencias del string.

### Comando de Ejecución
Desde la terminal en la raíz del proyecto, ejecuta:
```bash
node _herramientas_locales/renombrar_columna_global.js "Nombre Viejo de Columna" "Nombre Nuevo de Columna"
```

### 💡 Prompt Recomendado para el Asistente AI
> **Prompt para Refactor Global:**
> *"Usa la herramienta local `_herramientas_locales/renombrar_columna_global.js` para renombrar la columna del CRM de '[NombreViejo]' a '[NombreNuevo]' globalmente. Realiza la validación posterior del código frontend y backend."*

---

## 🔍 Herramientas de Auditoría y Verificación del CRM

Estas herramientas permiten verificar la integridad de las columnas del Google Sheet y sincronizar los payloads con la base de datos.

### 1. Verificación de Cabeceras Reales (`ver_headers.js`)
* **Propósito:** Muestra un array JSON con todos los nombres de columnas de la hoja del CRM actual.
* **Ejecución:** 
  ```bash
  node _herramientas_locales/ver_headers.js
  ```
* **Prompt para AI:** *"Corre el script de headers para listar todas las columnas actuales del Google Sheet y compáralas con la estructura interna."*

### 2. Auditoría de Columnas Específicas (`check_columns.js`)
* **Propósito:** Obtiene el índice de las columnas de fechas claves de contrato.
* **Ejecución:**
  ```bash
  node _herramientas_locales/check_columns.js
  ```

### 3. Detector de Campos de Fecha (`check_fecha.js`)
* **Propósito:** Lista todas las columnas en la base de datos que contienen la palabra "FECHA".
* **Ejecución:**
  ```bash
  node _herramientas_locales/check_fecha.js
  ```

### 4. Auditoría de Parámetros del Formulario React (`check_keys.js`)
* **Propósito:** Cruza los campos definidos en el payload de `RegisterPropertyForm.tsx` con las columnas registradas en `db_headers.json` para detectar incoherencias o campos huérfanos.
* **Ejecución:**
  ```bash
  node _herramientas_locales/check_keys.js
  ```
* **Prompt para AI:** *"Ejecuta `check_keys.js` para validar si el payload enviado por el formulario React coincide exactamente con las columnas esperadas en el archivo de cabeceras local."*

### 5. Inspección de Última Fila e Integridad (`check_ultima_fila.js` y `check_tipo.js`)
* **Propósito:** Inspecciona los datos ingresados en la última fila del CRM (código CDR, tipo de negocio, estado y fechas de contrato) para verificar la consistencia del procesamiento.
* **Ejecución:**
  ```bash
  node _herramientas_locales/check_ultima_fila.js
  node _herramientas_locales/check_tipo.js
  ```

---

## 📑 Herramientas de Configuración de AutoCrat

Permiten leer y actualizar las configuraciones serializadas de AutoCrat.

### 1. Ver Trabajos Disponibles (`job_names.js`)
* **Propósito:** Lista los nombres de los Jobs y sus IDs configurados en AutoCrat.
* **Ejecución:**
  ```bash
  node _herramientas_locales/job_names.js
  ```

### 2. Inspección de Mapeos de AutoCrat (`read_autocrat_tags.js` / `read_autocrat_tags2.js`)
* **Propósito:** Inspecciona los mapeos de tags JSON que realiza AutoCrat hacia las plantillas PDF.
* **Ejecución:**
  ```bash
  node _herramientas_locales/read_autocrat_tags.js
  ```

### 3. Actualización Manual de Tags (`update_autocrat_tags.js` / `update_autocrat_tags2.js`)
* **Propósito:** Permite corregir o forzar el mapeo de un tag en los jobs de combinación.
* **Ejecución:**
  ```bash
  node _herramientas_locales/update_autocrat_tags.js
  ```

---

## 🛠️ Herramientas de Normalización y Ajustes de Dirección

* **`api_address.js` / `fetch_address.js` / `jsonp_address.js`**: Permiten interactuar y depurar el servicio de normalización de direcciones catastrales y georreferenciadas que usa el frontend para estandarizar las direcciones ingresadas al CRM.

---

## 🛡️ Checklist de Validación Post-Refactor

Cada vez que realices un cambio global con `renombrar_columna_global.js`, asegúrate de correr las siguientes comprobaciones:

1. **Compilar el Frontend React:**
   ```bash
   cmd /c npm run build
   ```
   *(Verificar que no haya errores de compilación TSX)*
2. **Comprobar Sintaxis Backend:**
   ```bash
   node --check backend/*.js
   ```
3. **Copiar Assets Compilados:**
   ```bash
   cmd /c xcopy /Y /E "Portafolio-formulario de registro actualizacion form 1.0\dist\*.*" "frontend\portafolio\"
   ```
