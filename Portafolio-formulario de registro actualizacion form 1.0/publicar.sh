#!/usr/bin/env bash
#
# Publica la landing del portafolio en GitHub Pages.
#
# POR QUE EXISTE ESTE SCRIPT
# --------------------------
# GitHub Pages NO compila este repo. El workflow "pages build and deployment"
# solo copia lo que ya esta commiteado en main. Es decir: se publica el
# CONTENIDO DE frontend/portafolio/, no el codigo fuente.
#
# Eso hace que commitear solo el fuente pase el check en VERDE sin cambiar nada
# en produccion. Paso el 2026-08-29: el Action dio exito y la landing seguia
# igual. Un check verde aqui NO significa desplegado.
#
# Este script hace el ciclo completo en el orden correcto y verifica el
# resultado, para que no haya que recordarlo a mano.
#
# Uso:  bash publicar.sh
#
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI" && git rev-parse --show-toplevel)"
DESTINO="$RAIZ/frontend/portafolio"

cd "$AQUI"

# 1. Compilar. Sin esto el paso siguiente copiaria un build viejo.
echo "==> Compilando..."
npm run build

# 2. Un .git dentro de dist/ o del destino rompe la copia con "permission
#    denied" (los objetos de git son de solo lectura). Aparecieron en junio de
#    2026 al usar la dependencia gh-pages, que crea un repo temporal dentro de
#    dist/ y luego se propago al destino con un cp -r. Si vuelven, se avisa en
#    vez de fallar a media copia dejando el destino inconsistente.
for G in "$AQUI/dist/.git" "$DESTINO/.git"; do
  if [ -e "$G" ]; then
    echo "ERROR: hay un repo git anidado en $G" >&2
    echo "       Borralo antes de publicar: chmod -R +w '$G' && rm -rf '$G'" >&2
    exit 1
  fi
done

# 3. Sincronizar con --delete. Copiar encima sin borrar es lo que acumulo 145
#    archivos huerfanos y 124 MB de builds viejos en un repo publico: vite
#    pone un hash nuevo en cada nombre, asi que el anterior nunca se pisa.
#    Se borra el CONTENIDO de assets/, no el directorio: en Windows, con el
#    explorador o un dev server mirando la carpeta, borrarla entera falla con
#    "Device or resource busy" y deja la publicacion a medias.
echo "==> Sincronizando build -> frontend/portafolio ..."
mkdir -p "$DESTINO/assets"
find "$DESTINO/assets" -mindepth 1 -delete
cp -r "$AQUI/dist/." "$DESTINO/"

# 4. Comprobar que lo que index.html pide existe de verdad en el destino.
#    Barato, y atrapa una copia a medias antes de que llegue a produccion.
echo "==> Verificando integridad..."
FALTAN=0
while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  if [ ! -f "$DESTINO/assets/$ref" ]; then
    echo "   FALTA: assets/$ref" >&2
    FALTAN=$((FALTAN + 1))
  fi
done < <(grep -oE 'assets/[A-Za-z0-9._-]+' "$DESTINO/index.html" | sed 's|assets/||' | sort -u)

if [ "$FALTAN" -gt 0 ]; then
  echo "ERROR: el index.html publicado referencia $FALTAN archivo(s) inexistente(s)." >&2
  exit 1
fi

echo "   OK - index.html y sus assets estan completos."
echo
echo "==> Listo para commitear. Falta:"
echo "     git add frontend/portafolio"
echo "     git commit -m 'Publica build de la landing'"
echo "     git push origin main"
echo
echo "   Despues del push, comprobar en la URL real (el check verde no basta):"
echo "     https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/"
