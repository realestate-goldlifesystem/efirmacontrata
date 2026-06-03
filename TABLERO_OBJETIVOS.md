# 🚀 Plan de Implementación de Arquitectura y Refinamiento - E-FirmaContrata (Fase 1)

**Objetivo Global:** Transformar el sistema de recaudo de firmas en un ecosistema robusto, transparente y 100% automatizado, estableciendo un flujo de **Negociación Asíncrona** y corrigiendo la inyección de datos para tener un producto de nivel empresarial ("PropTech") previo a la integración con APIs de pago y firmas electrónicas certificadas (Fase 2).

---

## 🗺️ Hoja de Ruta Detallada (Checklist de Desarrollo)

### 1. ⚙️ Motor de Generación de Contratos (GESTOR_CONTRATOS)
*Objetivo: Lograr un cruce de datos perfecto y automatizado sin llaves vacías.*
- [x] **Auditoría de Llaves (`GESTOR_CONTRATOS.js` / `GESTOR DE DOCUMENTOS.js`):** Solucionado el problema de inyección leyendo los datos directamente del **"Cerebro"** (Documento maestro `DATOS DE ELABORACION`) en Drive, en lugar de buscar en columnas de la hoja de cálculo.
- [ ] **Sincronización Total:** Validar que el Cerebro capture correctamente campos adicionales como el correo y celular para todas las partes, garantizando que el contrato se rellene en su totalidad.

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

### 4. 🧪 Pruebas de Estrés y Aseguramiento de Calidad (QA) - [EN PROCESO]
- [x] **Depuración de Carga Multimedia:** Corrección de la lógica de búsqueda de carpetas maestras usando el "CDR Largo" a partir de IDs cortos (`RI...`) para los formularios de Inquilino y Propietario.
- [ ] **Simulación End-to-End (E2E) - En curso:** El usuario está realizando la prueba maestra empezando desde el "Registro del Inmueble" hasta la generación del contrato.
- [ ] **Validación de Correos y Estética:** Comprobar que todos los correos lleguen al buzón correcto con un renderizado visual perfecto.

### 5. 🏗️ Escalado del Sistema: Módulo "Registro del Inmueble"
*Objetivo: Una vez la elaboración de contratos (E-FirmaContrata) quede operativa, llevaremos la misma robustez y validación al módulo inicial del sistema.*
- [ ] **Auditoría del Módulo de Registro:** Revisar la creación y enrutamiento inicial de carpetas en Google Drive (donde nacen los CDR largos).
- [ ] **Optimización y Estandarización:** Aplicar las lecciones aprendidas de validación asíncrona y correos transaccionales al proceso en el que los asesores o clientes registran una nueva propiedad.

---

*Nota Arquitectónica: Al completar esta Fase 1, E-FirmaContrata no será solo un generador de PDFs, sino el motor de un CRM Inmobiliario unificado. La siguiente evolución (Fase 2) apuntará hacia arquitecturas de carga asíncrona (tipo Firebase) y automatización avanzada (VíaFirma).*
