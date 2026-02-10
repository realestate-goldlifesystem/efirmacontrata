# 🏠 Gold Life System - Real Estate Apps Script

Sistema de gestión inmobiliaria desarrollado con Google Apps Script, vinculado a Google Sheets.

## 📁 Estructura

```
├── backend/          ← Archivos de Apps Script (sincronizados via clasp)
│   ├── appsscript.json
│   ├── *.js          ← Código del backend
│   └── *.html        ← Templates HTML
├── frontend/         ← Web app (GitHub Pages) - próximamente
│   ├── css/
│   ├── js/
│   └── assets/
└── .gitignore
```

## 🔧 Setup para Desarrollo

### Requisitos
- Node.js v24+
- npm
- clasp v2.4.1 (`npm install -g @google/clasp@2.4.1`)

### Flujo de trabajo
```bash
# Descargar cambios de Apps Script
cd backend && clasp pull

# Subir cambios a Apps Script
cd backend && clasp push

# Subir cambios a GitHub
git add . && git commit -m "mensaje" && git push
```

## 📋 Módulos
- **Registro de Inmueble** - Registro y gestión de propiedades
- **Gestor de Documentos** - Manejo de documentación inmobiliaria
- **Gestor de Estados** - Control de estados documentales
- **Gestor de Contratos** - Administración de contratos
- **OCR Handler** - Procesamiento de documentos con OCR
- **Verificación de Carpetas** - Validación de estructura de archivos
