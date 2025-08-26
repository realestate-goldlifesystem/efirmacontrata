// ======================
// CONFIG GLOBAL E-FIRMACONTRATA
// ======================
const CONFIG = {
  // -------- Backend --------
  API_URL: "https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec",
  // URL base del frontend en GitHub Pages
  BASE_URL: 'https://realestate-goldlifesystem.github.io/efirmacontrata',

  // -------- Límites / Front --------
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB

  // ======================
  // PAGOS (REMITENCIAS Y PASARELA)
  // ======================

  // Número para transferencias Bre-B / Nequi / Daviplata
  // (Se usará también en el modal de “copiar al portapapeles”)
  PAY_BREB_NEQUI_DAVIPLATA: "3177623878",

  // Alias de compatibilidad para integraciones existentes (si las hay)
  // - Si algún HTML espera una URL para abrir en nueva pestaña, dejamos un `tel:` operativo.
  // - El Paso 2 añadirá un modal con “copiar” para este mismo número.
  PAY_BREB_URL:  "tel:+573177623878",
  NEQUI_URL:     "tel:+573177623878",
  DAVIPLATA_URL: "tel:+573177623878",

  // Pasarela para tarjeta crédito/débito (Wompi)
  PAY_WOMPI_URL: "https://checkout.wompi.co/l/kcweII",

  // Objeto agrupado (opcional): consumo más declarativo desde el front
  PAGO: {
    BREB_NEQUI_DAVIPLATA: "tel:+573177623878", // fallback clickable
    TARJETA: "https://checkout.wompi.co/l/kcweII"
  }
};

// Exponer en window si hace falta en páginas estáticas
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}
