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
- [ ] **Migración a Fase Borrador:** Modificar la lógica para que la generación produzca un **Borrador en Google Docs** primero.
- [x] **Integración en Panel (Admin):** 
  - Añadir en el Panel de Validación una vista del borrador y edición rápida del Cerebro.
  - Implementar una **Barra de Progreso / Semáforos** (🔴 Pendiente, 🟡 Con Observaciones, 🟢 Aprobado) en el subpanel lateral de contratos (`panel_validacion.html`).
- [ ] **Portal de Revisión para Clientes (GitHub Pages):** 
  - Crear un portal estático HTML/CSS/JS (`portal-firmantes/index.html`) para subir a GitHub Pages y evitar logins de Google.
  - Opciones de validación: **"👍 Aprobar Contrato"** o **"✍️ Solicitar Cambios"**.
- [ ] **Bitácora Transparente (Tabla Segura):** 
  - Inyectar una tabla al final de la página del Documento Cerebro donde se registrarán los logs de la conversación de forma segura (sin depender de funciones experimentales de Pestañas).
- [ ] **Cierre Definitivo:** Cuando todas las partes aprueban, se habilita la generación del PDF Final inmutable, notificando al administrador por correo.

### 3. 💌 Sistema de Correos Transaccionales (Estética Premium)
*Objetivo: Profesionalizar la comunicación y notificar a los usuarios para mantener el flujo activo.*
- [ ] **Diseño Visual:** Crear/Refinar plantillas HTML (`email_firma_corretaje.html`, `email_notificacion.html`) con colores corporativos (GoldLife), diseño responsivo, botones CTA (Call to Action) claros y tipografía moderna.
- [ ] **Triggers (Disparadores) de Notificación:** 
  - Correo al generar el borrador: *"Tu borrador está listo para revisión, entra aquí"*.
  - Correo cuando el Administrador aplica un cambio: *"GoldLife ha realizado el ajuste solicitado, por favor revalida"*.
- [ ] **Notificación Final al Admin:** Envío automático del PDF Final a `realestate.goldlifesystem@gmail.com` listo para subirse a la plataforma de firmas (Viafirma).

### 4. 🧪 Pruebas de Estrés y Aseguramiento de Calidad (QA)
- [ ] **Simulación End-to-End (E2E):** Ejecutar 3 casos de prueba:
  - 1: Flujo perfecto (Sin rechazos).
  - 2: Flujo con solicitud de cambios en la Bitácora por parte del inquilino.
  - 3: Validación de correos y renderizado visual en móvil.

---

*Nota Arquitectónica: Al completar esta Fase 1, E-FirmaContrata no será solo un generador de PDFs, sino un CRM legal especializado en arrendamientos, dejando la mesa servida para una integración "Plug & Play" con Viafirma en el futuro.*
