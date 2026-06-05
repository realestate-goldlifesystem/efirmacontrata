# 💳 Plan de Implementación: Ecosistema Mercado Pago (Fase 5)

Este documento detalla el paso a paso técnico para integrar Mercado Pago en **E-FirmaContrata**, bloqueando el envío de documentos hasta validar el pago y habilitando la "Garantía Automática de 48h".

---

## 🛠️ Paso 1: Configuración de Credenciales y Entorno
*Esta fase ocurre fuera del código, directamente en el panel de Mercado Pago Developers.*

1. **Creación de Aplicación**: Ingresar a Mercado Pago Developers y crear una aplicación para obtener las **Credenciales de Prueba (Test)**:
   - `Public Key`: Se usará en el Frontend (`formulario-inquilino.html`).
   - `Access Token`: Se usará en el Backend (Google Apps Script).
2. **Configuración de Webhooks (IPN)**: Le diremos a Mercado Pago a qué URL de nuestro Apps Script (`doPost`) debe notificar cuando un pago sea "Aprobado".

---

## 🖥️ Paso 2: Adaptación del Frontend (`formulario-inquilino.html`)
*El objetivo es interceptar al usuario antes de que envíe sus documentos al backend.*

1. **Inyección del SDK**: Agregar la librería oficial de Mercado Pago (Checkout Bricks) en el `<head>` del HTML.
2. **Botón de Pago Previo**: 
   - Ocultar el botón original de "Enviar Documentos".
   - Mostrar un botón de "Pagar Estudio ($85.000)".
3. **Flujo de Experiencia**:
   - Al hacer clic en "Pagar", el frontend llama al Apps Script pidiendo una "Preferencia de Pago".
   - Se abre la ventana emergente de Mercado Pago.
   - Cuando el cliente paga con éxito, Mercado Pago devuelve un `payment_id`.
   - El frontend captura ese ID, revela el botón "Enviar Documentos" y anexa el `payment_id` al paquete de datos que viaja al backend.

---

## ⚙️ Paso 3: Backend - Motor de Pagos y Webhooks (Apps Script)
*Aquí el servidor genera los cobros y escucha las confirmaciones del banco.*

1. **Función `crearPreferenciaPago(datos)`**:
   - Un endpoint en Apps Script que usa `UrlFetchApp` para hablar con Mercado Pago.
   - Le envía el valor ($85.000), el título ("Derechos de Contrato - Inmueble XYZ") y recibe un `preference_id` que le devuelve al frontend.
2. **Endpoint de Seguridad (`doPost`)**:
   - Se crea (o actualiza) la función `doPost(e)` en Apps Script.
   - Cuando Mercado Pago detecta que la plata entró, hace un *PING* a esta función.
   - Nuestro código recibe el aviso, busca el ID de la transacción y escribe en la hoja de Google Sheets: `[VERIFICADO - Pago Exitoso]`.

---

## ⏱️ Paso 4: El Motor de Reembolsos Automáticos (Garantía 48h)
*La joya de la corona: Devolver el dinero sin intervención humana si el propietario no cumple.*

1. **Registro de Tiempos**: Cuando el inquilino paga y sube los documentos, el backend guarda en la hoja de cálculo el `payment_id` de Mercado Pago y un "Timestamp" (Fecha y Hora exacta del pago).
2. **El Gatillo (Time-driven Trigger)**: 
   - Se programa una función llamada `auditorDeContratosVencidos()` para que se ejecute **todos los días a las 2:00 AM** automáticamente en Google Cloud.
3. **Lógica de Reembolso (`UrlFetchApp`)**:
   - La función escanea la hoja buscando inmuebles en estado "PENDING" (es decir, el propietario aún no sube papeles).
   - Si la resta entre (Hora Actual - Hora de Pago) es mayor a 48 horas:
     - El script hace un POST a la API de Mercado Pago: `https://api.mercadopago.com/v1/payments/{payment_id}/refunds`.
     - Mercado Pago procesa la devolución inmediata (sin cobrarnos comisiones).
4. **Notificación al Cliente**:
   - El script marca la fila en rojo como `[REEMBOLSADO POR TIEMPO]`.
   - Despacha un correo automático al inquilino con la plantilla estética avisándole que su garantía se hizo efectiva y el dinero regresó a su cuenta de Mercado Pago.
