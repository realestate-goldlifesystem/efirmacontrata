# 🚀 Plan de Implementación de Arquitectura y Refinamiento - E-FirmaContrata (Fase 1)

**Objetivo Global:** Transformar el sistema de recaudo de firmas en un ecosistema robusto, transparente y 100% automatizado, estableciendo un flujo de **Negociación Asíncrona** y corrigiendo la inyección de datos para tener un producto de nivel empresarial ("PropTech") previo a la integración con APIs de pago y firmas electrónicas certificadas (Fase 2).

---

## 🗺️ Hoja de Ruta Detallada (Checklist de Desarrollo)

### 1. ⚙️ Motor de Generación de Contratos (GESTOR_CONTRATOS)
*Objetivo: Lograr un cruce de datos perfecto y automatizado sin llaves vacías.*
- [x] **Auditoría de Llaves (`GESTOR_CONTRATOS.js` / `GESTOR DE DOCUMENTOS.js`):** Solucionado el problema de inyección leyendo los datos directamente del **"Cerebro"** (Documento maestro `DATOS DE ELABORACION`) en Drive, en lugar de buscar en columnas de la hoja de cálculo.
- [x] **Sincronización Total:** Validar que el Cerebro capture correctamente campos adicionales como el correo y celular para todas las partes, garantizando que el contrato se rellene en su totalidad.

### 2. 🤝 Nuevo Ecosistema: "Subpanel de Negociación y Bitácora Transparente"
*Objetivo: Empoderar al administrador y dar transparencia y seguridad a los clientes.*
- [x] **Migración a Fase Borrador:** Modificar la lógica para que la generación produzca un **Borrador en Google Docs** primero. (Completado)
- [x] **Integración en Panel (Admin):** 
  - Añadir en el Panel de Validación una vista del borrador y edición rápida del Cerebro.
  - Implementar una **Barra de Progreso / Semáforos** (🔴 Pendiente, 🟡 Con Observaciones, 🟢 Aprobado) en el subpanel lateral de contratos (`panel_validacion.html`). (Completado)
- [x] **Puesto de Control Central (Panel Admin):** 
  - Permitir al administrador ver el historial de observaciones/cambios directamente desde el subpanel, para que pueda realizar las ediciones de forma manual desde esta consola central (sin entrar obligatoriamente a editar el "Cerebro" de Drive a mano).
- [x] **Portal de Revisión para Clientes (GitHub Pages) con Transparencia:** 
  - En `validador-de-contratos.html`, si una parte (ej. Inquilino) pide cambios, las demás partes podrán ver qué cambios se solicitaron, garantizando total transparencia. Así cada perfil revisa, y elige si aprobar o solicitar más cambios, hasta lograr consenso total.
- [x] **Bitácora Transparente:** 
  - Centralizar el registro de la conversación en una tabla estructurada (o base de datos interna) que alimente tanto el Panel del Administrador como el Frontend, en lugar de inyectar los logs en el Documento Cerebro.
- [x] **Cierre Definitivo:** Cuando todas las partes aprueban, el sistema utiliza el mismo borrador negociado, le elimina las marcas de borrador, crea la versión definitiva FINAL en PDF y conserva intactas las modificaciones manuales.

### 3. 💌 Sistema de Correos Transaccionales (Estética Premium)
*Objetivo: Profesionalizar la comunicación y notificar a los usuarios para mantener el flujo activo.*
- [x] **Diseño Visual:** Crear/Refinar plantillas HTML (`email_firma_corretaje.html`, `email_notificacion.html`) con colores corporativos (GoldLife), diseño responsivo, botones CTA claros y tipografía moderna.
- [x] **Triggers (Disparadores) de Notificación:** 
  - Correo al generar el borrador: *"Tu borrador está listo para revisión, entra aquí"*.
  - Correo cuando una parte solicita un cambio o el Admin hace un ajuste: *"Se han solicitado/realizado cambios en el contrato, por favor revalida"*.
- [x] **Notificación Final al Admin:** Envío automático del PDF Final a `realestate.goldlifesystem@gmail.com` listo para subirse a la plataforma de firmas (Viafirma).

### 4. 🧪 Pruebas de Estrés y Aseguramiento de Calidad (QA) - [FINALIZADAS]
- [x] **Depuración de Carga Multimedia:** Corrección de la lógica de búsqueda de carpetas maestras usando el "CDR Largo" a partir de IDs cortos (`RI...`) para los formularios de Inquilino y Propietario.
- [x] **Simulación End-to-End (E2E) - Completada:** El usuario realizó la prueba maestra empezando desde el "Registro del Inmueble" hasta la generación de contrato, validando el éxito total del sistema.
- [x] **Validación de Correos y Estética:** Comprobado. Todos los correos llegan al buzón correcto con un renderizado visual perfecto y estético.

### 5. 💳 Integración Pasarela de Pagos y Reembolsos (Mercado Pago) - [FINALIZADA]
*Objetivo: Monetizar el flujo bloqueando el avance hasta validar el pago, y ofrecer una "Garantía Automática de 48h" de reembolso.*
- [x] **Widget Frontend:** Incrustar el Checkout Pro/API de Mercado Pago en `formulario-inquilino.html`.
- [x] **Validación Webhook (doPost):** Escuchar eventos de Mercado Pago para asentar el "Sello de Pago Verificado" en Google Sheets.
- [x] **Sistema de Reembolso Automático (Garantía 48h):** Programar un *Time-driven Trigger* en Apps Script que escanee contratos en PENDING. Si pasan 48h sin respuesta del propietario, consumir la API de Reembolsos (`/v1/payments/{id}/refunds`) para devolver el dinero automáticamente.

### 6. 👥 Escalabilidad de Múltiples Codeudores - [PRÓXIMO PASO]
*Objetivo: Escalar el formulario y todo el ecosistema (paneles, bitácora y PDF) para que soporte 'N' cantidad de codeudores de forma dinámica.*
- [ ] **Lógica Dinámica Frontend:** Adaptar el formulario de registro para permitir agregar codeudores adicionales dinámicamente.
- [ ] **Sincronización en el Cerebro:** Modificar el esquema de `DATOS DE ELABORACION` para aceptar y estructurar un arreglo de varios codeudores.
- [ ] **Adaptación del Panel y Bitácora:** Actualizar los semáforos de `panel_validacion.html` y los ciclos de aprobación para requerir el "Aprobado" de todos los codeudores involucrados.

### 7. ✍️ Automatización de Firmas (AutenticSign)
*Objetivo: Sustituir la generación manual de firmas conectando la API de AutenticSign para los contratos de arrendamiento.*
- [ ] **Integración API REST:** Configurar Google Apps Script para enviar el "PDF Original Definitivo" a los servidores de AutenticSign de forma invisible.
- [ ] **Flujo OTP:** Programar el envío de códigos SMS de validación a inquilinos y propietarios.

### 8. 🏢 Escalado: Contratos de Administración de Inmuebles
*Objetivo: Adaptar el motor E-FirmaContrata para captar propietarios que deseen ceder la administración de sus inmuebles.*
- [ ] **Nuevo Cerebro:** Crear las variables específicas (comisiones, pólizas) para este tipo de contrato.
- [ ] **Plantilla Dinámica:** Cargar la plantilla de Mandato/Administración y configurar las rutas de guardado en Drive.

### 9. 🏡 Escalado: Promesas de Compraventa y Sala de Negociación
*Objetivo: Abarcar transacciones de alto valor inmobiliario con flujos colaborativos entre compradores y vendedores.*
- [ ] **Adaptación del Frontend:** Generar los portales para recolección de documentos específicos de ventas (Promesas, Certificados de Tradición avanzados).
- [ ] **Sala de Negociación Privada (En Vivo):** Crear un entorno digital ("Bolsa de Valores Inmobiliaria") donde comprador y vendedor puedan enviarse ofertas y contraofertas económicas de forma asíncrona, eliminando la fricción emocional y generando urgencia/FOMO con el Polling Inteligente.
- [ ] **Integración "Escrow" (Retención de Arras Segura):** Conectar vía API con una Fintech (ej. Kustodio) o Fiduciaria Tradicional (ej. Fiduciaria Bogotá / Alianza) para custodiar el dinero de las arras de forma neutral y segura, protegiendo a ambas partes sin que Gold Life asuma el riesgo legal de la captación de dinero.
- [ ] **Generación y Firma Automática:** Cuando ambas partes lleguen a un acuerdo y aprueben la oferta final en la Sala de Negociación, E-FirmaContrata generará automáticamente la Promesa de Compraventa con las cláusulas pactadas (arras, fechas) y la enviará para su autenticación digital desde casa.

### 10. 🛡️ Acreditación Legal Premium (Olimpia IT)
*Objetivo: Blindar las Promesas de Compraventa con el estándar legal más alto (ONAC y Registraduría).*
- [ ] **Biometría Facial:** Conectar la API de Olimpia IT para exigir la validación facial de compradores/vendedores contra la Registraduría Nacional.
- [ ] **Certificación ONAC:** Garantizar la "Presunción de Derecho" en todos los contratos de alto valor.

### 11. 🏗️ Escalado del Sistema: Módulo "Registro del Inmueble"
*Objetivo: Una vez todo el ecosistema de contratos y firmas opere al 100%, llevaremos esta misma robustez tecnológica al módulo inicial de captación de inmuebles.*
- [ ] **Auditoría del Módulo de Registro:** Revisar la creación y enrutamiento inicial de carpetas en Google Drive (donde nacen los CDR largos).
- [ ] **Optimización y Estandarización:** Aplicar las lecciones aprendidas de validación asíncrona y correos al proceso en el que los asesores registran una propiedad.

### 12. ✨ UI/UX: Experiencia "Dark Luxury" y Gamificación
*Objetivo: Elevar la percepción de marca a un nivel premium y de alta gama en todos los portales, mejorando la satisfacción del cliente y del administrador.*
- [x] **Design System "Dark Luxury":** Implementar un fondo oscuro elegante (Dark Mode), tipografía limpia (ej. *Outfit*, *Inter* o *Cinzel* para títulos), y acentos de luz (neón sutil/dorado) para los llamados a la acción (CTAs).
- [x] **Estructura "Bento Grid":** Rediseñar el `panel_validacion.html` y los portales de clientes usando una cuadrícula estilo *Bento* (tarjetas modulares con bordes redondeados y efecto *Glassmorphism*).
- [x] **Gamificación y Micro-interacciones:** Añadir animaciones fluidas de transición, barras de progreso dinámicas, confeti digital o checks interactivos al completar hitos (ej. firmar un contrato o pagar), y *tooltips* interactivos.
- [ ] **Consistencia en Backend y Frontend:** Unificar el diseño para que el administrador sienta la misma fluidez y modernidad que experimenta el cliente final.

---

*Nota Arquitectónica: Esta hoja de ruta proyecta a Gold Life System desde un generador de PDFs hasta convertirse en una PropTech transaccional, biométrica y 100% automatizada a nivel bancario.*
