# Plan Lógico del Sistema (E-FirmaContrata v3.0)

Este documento explica en "lenguaje cristiano" cómo funciona (y cómo debe funcionar) el sistema que ya tienes diseñado en el código.

## 🔄 Resumen del Flujo
El sistema es una **tubería de 3 pasos** para cerrar un arriendo sin papeleo físico.

1.  **Paso 1: El Inquilino** (Llenado de datos + Pago)
2.  **Paso 2: El Propietario** (Validación + Carga de documentos legales)
3.  **Paso 3: El Contrato** (Revisión + Aprobación + Firma)

---

## 🧩 Detalle por Paso

### Paso 1: El Inicio (Trigger) 🚀
**¿Cómo arranca todo?**
1.  **Cambio de Estado:** Tú cambias la columna "ESTADO DEL INMUEBLE" en la hoja de cálculo.
2.  **Popup Automático:** El sistema detecta el cambio y muestra un **Popup** preguntando: *"¿Quieres iniciar el proceso de arriendo para este inmueble?"*.
3.  **Correo al Inquilino:** Al confirmar, el sistema envía el correo de bienvenida al inquilino con el link de su formulario.

### Paso 2: El Embudo de Documentos (Inquilino y Propietario) 📂
**El Panel de Gestión actúa como un semáforo:**

1.  **Inquilino:** Sube documentos -> El panel marca "En Revisión".
    *   Si algo está mal: Le das "Solicitar Corrección" -> Le llega correo al inquilino -> Él corrige -> Panel se actualiza.
2.  **Propietario:** Sube documentos -> El panel marca "En Revisión".
    *   Mismo flujo de corrección si es necesario.
3.  **Resultado:** Cuando ambos están en verde (Aprobados), el sistema habilita la opción **"Generar Borrador de Contrato"**.

### Paso 3: El Ciclo de Aprobación del Contrato 🤝
**Aquí es donde todos se ponen de acuerdo:**

1.  **Generación:** Tú generas el borrador desde el Panel.
2.  **Envío a Revisión:** El sistema envía un link único a Inquilino, Propietario y Codeudores.
3.  **Validación Remota:**
    *   Cada uno entra a una página web (`validacion-contrato.html`) donde ve el borrador.
    *   **Opción A (Todo OK):** Dan clic en "Aprobar" -> El panel muestra un check verde para esa persona.
    *   **Opción B (Cambios):** Envían "Comentarios/Ajustes" -> Te llegan al Panel -> Tú ajustas el borrador -> Se reinicia la aprobación.
4.  **Aprobación Total:** Cuando el Panel muestra que **TODOS** aprobaron (Inquilino + Propietario + Codeudores), el contrato pasa a estado "LISTO PARA FIRMA".

### Paso 4: Cierre y Firma ✍️
**El paso final manual-automático:**

1.  **Descarga Admin:** Tú descargas el PDF final del contrato desde el Panel (para tu gestión).
2.  **Instrucciones de Firma:**
    *   **Automáticamente**, al tú descargar/finalizar, el sistema envía un correo a todas las partes.
    *   Este correo NO es para firmar ahí mismo, sino que contiene las **Instrucciones** de cómo les llegará la firma (por el sistema externo que usas).
    *   *Ejemplo de correo:* "Hola, el contrato está aprobado. En breve recibirán un correo de [Tu Proveedor de Firma] para estampar su firma digital. Estén atentos."

---

## 🛠️ Estado Actual (Diagnóstico Rápido)

He revisado tu código y esto es lo que tenemos:

| Componente | Estado | Comentario |
| :--- | :--- | :--- |
| **Frontend (Las páginas web)** | 🟢 **Muy Bien** | Tienes 3 páginas HTML muy completas y bonitas (`formulario-inquilino`, `propietario`, `validación`). Están casi listas para usar. |
| **Backend (El cerebro)** | 🟡 **Completo pero dormido** | Tienes toda la lógica (`GESTOR DE DOCUMENTOS.js`), pero necesitamos "conectarla" para que responda a las páginas web. |
| **OCR (Lector de PDFs)** | 🟡 **Por probar** | El código está ahí, pero necesitamos verificar si la "Llave Maestra" (API Key) de Google Vision está activa. |
| **Base de Datos (Sheets)** | 🟢 **Lista** | Usas la hoja `1.1 - INMUEBLES REGISTRADOS`. Solo necesitamos asegurarnos que las columnas coincidan con lo que pide el código. |

## 🚀 Plan de Acción Inmediato

1.  **Mover Archivos Viejos:** Limpiar lo que sobra (lo que hablamos de la carpeta `_legacy`) para no confundirnos.
2.  **"Encender" el Cerebro:** Asegurarnos de que cuando alguien de clic en "Enviar" en la web, el código de Google Apps Script responda.
3.  **Prueba de Fuego:** Hacer un recorrido completo yo mismo (como si fuera inquilino) para ver si guarda los datos en tu hoja.
