# E-FirmaContrata: Design System "Dark Luxury Gamificado"

Este documento establece la única fuente de la verdad para los estilos visuales de E-FirmaContrata. Cualquier pantalla, formulario o portal debe guiarse estrictamente por estas reglas.

## 1. Concepto y Identidad
- **Tema Central:** Dark Luxury Gamificado.
- **Sensación:** Premium, Fintech, Seguro, Elegante, Moderno y Fluido.
- **Inspiración:** Paneles de banca privada, sistemas financieros de alto nivel, interfaces de videojuegos elegantes (Micro-interacciones).

## 2. Paleta de Colores (CSS Variables)

La paleta se define globalmente en `:root`. Ningún color debe usarse de forma aislada sin su variable correspondiente.

```css
:root {
  /* Fondo Principal (El espacio) */
  --dark: #0a0a0a;              /* Negro puro para el fondo extremo */
  --surface: #171018;           /* Charcoal muy oscuro para paneles base */
  --surface-hover: #221824;     /* Ligeramente más claro para hover en paneles */
  
  /* Color Primario (Oro/Dorado) */
  --primary: #d4af37;           /* Dorado Elegante (Botones, bordes, acentos) */
  --primary-glow: rgba(212, 175, 55, 0.4); /* Resplandor dorado */
  
  /* Color Secundario (Contrastes oscuros) */
  --secondary: #1e1e1e;         /* Gris oscuro para elementos secundarios */
  --secondary-dark: #0a0a0a;    /* Contraste profundo */
  
  /* Textos */
  --text-main: #ffffff;         /* Texto principal brillante */
  --text-muted: #a1a1aa;        /* Texto secundario/placeholder */
  
  /* Estados (Gamificación/Validaciones) */
  --success: #10b981;           /* Verde esmeralda */
  --success-glow: rgba(16, 185, 129, 0.2);
  --warning: #f59e0b;           /* Naranja ámbar */
  --danger: #ef4444;            /* Rojo carmesí */
  --danger-glow: rgba(239, 68, 68, 0.2);
  --info: #3b82f6;              /* Azul eléctrico */
  
  /* Bordes y Estructura */
  --border-color: rgba(212, 175, 55, 0.15); /* Borde dorado translúcido sutil */
  --border: rgba(212, 175, 55, 0.2);        /* Alternativa de borde */
}
```

## 3. Tipografía
- **Principal (Títulos y Headers):** `'Cinzel', serif`. Aporta el toque clásico y "Luxury". Letras mayúsculas recomendadas para branding.
- **Secundaria (Cuerpos, Inputs, Botones):** `'Outfit', 'Segoe UI', sans-serif`. Aporta legibilidad, modernidad y estilo técnico/fintech.

## 4. Fondos y Estructura Base (Body)
El fondo principal del sistema no es un color plano, es un degradado radial sutil que simula iluminación en el centro.

```css
body {
  background: radial-gradient(circle at 50% 0%, #1a1a1a 0%, var(--dark) 100%);
  color: var(--text-main);
}
```

## 5. Tarjetas y Contenedores (Glassmorphism & Neon Floating)
Las tarjetas no son blancas ni grises sólidas. Son contenedores de cristal oscuro con bordes y reflejos dorados.

```css
.card, .form-container, .modal-content {
  background: linear-gradient(145deg, rgba(30, 30, 35, 0.8), rgba(20, 20, 24, 0.95));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  border-radius: 16px; /* o 24px para paneles grandes */
  
  /* Efecto de Flotación Neón */
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.8),    /* Sombra de profundidad */
    0 0 20px rgba(212, 175, 55, 0.15);       /* Glow dorado ambiental */
}
```

## 6. Entradas de Texto (Inputs) y Formularios
Los campos de texto deben sentirse como paneles de control de alta tecnología, no como cajas blancas de papel.

```css
.input, .form-control {
  background: rgba(0, 0, 0, 0.3); /* Fondo interno muy oscuro */
  border: 1px solid var(--border); /* Borde dorado apagado */
  color: var(--text-main);
  border-radius: 12px;
}

.input:focus, .form-control:focus {
  background: rgba(0, 0, 0, 0.5);
  border-color: var(--primary);
  /* Glow al hacer focus (gamificación) */
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.2); 
  outline: none;
}
```

## 7. Botones (Call to Action)
Los botones principales deben ser el centro de atención, con gradientes vivos y físicas (movimiento) al interactuar.

```css
.btn-primary {
  background: linear-gradient(135deg, #d4af37, #f0c541); /* Gradiente dorado 3D */
  color: #0f172a; /* Texto oscuro para contraste sobre oro */
  font-weight: 700;
  border: none;
  border-radius: 12px; /* o 30px tipo píldora */
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px) scale(1.02); /* Se levanta hacia el usuario */
  box-shadow: 0 8px 25px rgba(212, 175, 55, 0.6); /* El glow se expande */
}
```

## 8. Gamificación Adicional (Barras de progreso, validaciones)
- **Barra de Progreso (Wizard):** Línea conectora dorada. Los pasos completados brillan, los inactivos son transparentes con bordes oscuros.
- **Upload de Archivos:** Caja tipo "drag & drop" con fondo `rgba(0,0,0,0.2)` y borde punteado dorado. Al hacer hover, se ilumina sutilmente en dorado.
- **Validaciones:** Si un campo es inválido, usar borde rojo (`var(--danger)`) sutil. No usar fondos blancos chillones para los errores.

## 9. Logos y Headers
Evitar emojis genéricos como 🏠. Reemplazar por logotipos SVG dorados o textos limpios usando la fuente `Cinzel` con resplandor (`text-shadow: 0 0 15px var(--primary-glow);`).

---
**Nota de Implementación Inmediata:** Los formularios de inquilino y propietario deben purgarse de cualquier CSS "hardcodeado" (como fondos blancos o grises) e implementar estas clases y variables directamente.
