"""
PROTOTIPO DE PRUEBA - Metrocuadrado como segunda fuente para Miguel.

No toca scraper.py, sheets_handler.py ni config.py de produccion. Escribe
UNICAMENTE en la pestana "PRUEBA METROCUADRADO" (copia de estructura de
"1 - CAPTACIONES A" creada a proposito para esto). No dispara nada en las
pestanas reales ni en el flujo automatico de GitHub Actions.

Alcance de esta prueba: Usaquen, 1 habitacion, arriendo. Ver
plan_implementacion_metrocuadrado.txt para el detalle completo de lo
investigado (patron de URL, deteccion de particular, revelado de telefono).
"""
import re
import sys
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

import config
from sheets_handler import SheetsHandler, ahora_colombia, get_spanish_date_str

PESTANA_PRUEBA = "PRUEBA METROCUADRADO"
BASE_URL = "https://www.metrocuadrado.com/apartamento-apartaestudio/{operacion}/bogota/{lugar}/{hab}-habitaciones/?search=form"

# Reutiliza la misma logica de normalizacion de texto que ya usa Miguel para Fincaraiz
sys_path_original = list(sys.path)


def normalizar(texto):
    import unicodedata
    if not texto:
        return ""
    t = unicodedata.normalize('NFD', texto).encode('ascii', 'ignore').decode('utf-8')
    return t.lower().strip()


# Etiquetas de interfaz que a veces quedan como "ultima linea" antes de
# 'Antigüedad:' cuando el anuncio NO tiene ningun nombre de publicador.
# Sin este filtro, se leian como si fueran el nombre.
ETIQUETAS_UI = {"ver lugares cercanos", "ver mas", "ver más"}

# Palabras adicionales de empresa vistas hoy en Metrocuadrado que no estan
# en la lista negra de Fincaraiz (esa es la fuente principal; esta es solo
# un complemento local para este sitio).
PALABRAS_EMPRESA_METROCUADRADO = ["cia", "s en c", "realtors", "roastbeef"]

# Numero del asistente de IA propio de Metrocuadrado ("Pedrito Cuadrado"),
# confirmado por busqueda web -- NO es el celular de ningun anunciante. Si
# una peticion resuelve a este numero (en vez de al clic real), se descarta
# igual que un timeout: no es un dato valido de propietario.
TELEFONO_BOT_METROCUADRADO = "3154587708"


def es_inmobiliaria(nombre):
    """
    Heuristica de deteccion (Metrocuadrado no tiene un campo limpio tipo
    owner.particular como Fincaraiz). Solo por palabras clave -- NO por
    mayusculas/minusculas: Playwright lee el texto ya renderizado, y la
    pagina muestra ALGUNOS nombres de personas reales en mayusculas por
    estilo visual, asi que las mayusculas no distinguen nada aqui.
    """
    if not nombre:
        return False
    norm = normalizar(nombre)
    palabras = norm.split()
    for kw in list(config.KEYWORD_BLACKLIST) + PALABRAS_EMPRESA_METROCUADRADO:
        kwn = normalizar(kw)
        if not kwn:
            continue
        if not kwn.isalnum():
            if kwn in norm:
                return True
        elif len(kwn) >= 6:
            if kwn in palabras or (kwn + "s") in palabras:
                return True
        else:
            if kwn in palabras:
                return True
    return False


def extraer_nombre_publicador(texto):
    """
    El nombre del publicador aparece como la ultima linea antes de
    'Antigüedad:', que a su vez esta antes de 'Código:'. Sin campo
    estructurado limpio, se lee por posicion en el texto visible.
    Si esa ultima linea es una etiqueta de interfaz (pasa cuando el
    anuncio no tiene ningun nombre), se trata como vacio.
    """
    idx_codigo = texto.find('Código:')
    if idx_codigo == -1:
        return ""
    bloque = texto[:idx_codigo]
    idx_antig = bloque.find('Antigüedad')
    if idx_antig == -1:
        return ""
    antes = bloque[:idx_antig]
    lineas = [l.strip() for l in antes.split('\n') if l.strip()]
    if not lineas:
        return ""
    candidato = lineas[-1]
    if normalizar(candidato) in ETIQUETAS_UI:
        return ""
    # Un nombre real (persona o empresa) nunca es tan largo. Si la ultima
    # linea antes de 'Antigüedad' es larga, es que no hay separador visible
    # (tipo 'Ver lugares cercanos') entre la descripcion y 'Antigüedad', y se
    # esta agarrando parte de la descripcion en vez de un nombre.
    if len(candidato) > 60:
        return ""
    return candidato


def extraer_campo(texto, patron):
    m = re.search(patron, texto)
    return m.group(1).strip() if m else ""


def extraer_id_inmueble(url):
    """El ID del anuncio es el ultimo segmento de la URL (ej: MC6875856, 13436-M6705147)."""
    return url.rstrip('/').split('/')[-1]


def crear_escucha_whatsapp(estado_telefono):
    """
    Escucha PASIVA (sin abortar nada) de peticiones en TODO el contexto --
    alcanza tanto a la pagina principal como a cualquier pestaña nueva que
    el clic abra. Interceptar con `route()+abort()` rompio el mecanismo por
    completo (0 de 9 capturas): al parecer el flujo necesita completar la
    peticion de verdad antes de exponer el numero. Aqui solo se OBSERVA.

    El parametro `text` del mensaje trae el ID del anuncio ("...ID: XXX que
    encontre..."). Se guarda junto al telefono para poder verificar en
    procesar_anuncio que la revelacion es del mismo anuncio que se clickeo,
    y no de un click anterior que resolvio con retraso.
    """
    def handler(request):
        url = request.url
        if "api.whatsapp.com" in url:
            m = re.search(r'phone=(\d+)', url)
            if not m:
                return
            telefono = m.group(1)
            if telefono.startswith("57") and len(telefono) > 10:
                telefono = telefono[2:]
            if telefono == TELEFONO_BOT_METROCUADRADO:
                return
            m_id = re.search(r'ID%3A\+([\w-]+)\+que', url)
            estado_telefono["valor"] = telefono
            estado_telefono["id_anuncio"] = m_id.group(1) if m_id else None
    return handler


def recolectar_links(page, url_busqueda, max_scrolls=25):
    print(f"[INFO] Cargando listado: {url_busqueda}")
    page.goto(url_busqueda, wait_until="domcontentloaded", timeout=45000)
    time.sleep(2)

    # Aceptar cookies si aparece el banner (solo la primera vez)
    try:
        boton = page.query_selector('button:has-text("Aceptar")')
        if boton:
            boton.click()
            time.sleep(0.5)
    except Exception:
        pass

    for _ in range(max_scrolls):
        page.evaluate("window.scrollBy(0, 900)")
        time.sleep(0.3)

    links = page.eval_on_selector_all(
        'a[href*="/inmueble/"]',
        "els => [...new Set(els.map(e => e.href.split('?')[0]))]"
    )
    print(f"[INFO] {len(links)} anuncios encontrados en el listado.")
    return links


def procesar_anuncio(page, context, url, estado_telefono):
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        time.sleep(1.5)
    except Exception as e:
        print(f"⚠️ [AVISO] No se pudo cargar el anuncio: {url} ({e})")
        return None

    texto = page.inner_text("body")
    if 'Código:' not in texto:
        print(f"⚠️ [AVISO] Estructura inesperada, se omite: {url}")
        return None

    nombre = extraer_nombre_publicador(texto)
    if es_inmobiliaria(nombre):
        print(f"[DESCARTADO] Inmobiliaria detectada: '{nombre}'")
        return None

    print(f"[ACEPTADO] '{nombre or '(sin nombre, probable particular)'}'")

    barrio = extraer_campo(texto, r'Barrio común:\s*(.+)')
    precio = extraer_campo(texto, r'\$\s*([\d.,]+)\s*\n')
    tipo = "Apartaestudio" if "apartaestudio" in url.lower() else "Apartamento"

    # Boton de WhatsApp: un clic REAL de Playwright (no .click() de JS) navega
    # directo a api.whatsapp.com con el telefono en el parametro `phone`.
    boton = page.query_selector('[element-id="btnContactWhatsapp"]')
    if not boton:
        print("⚠️ [AVISO] Sin botón de WhatsApp visible, se omite.")
        return None

    # El clic puede abrir pestaña nueva (popup) o navegar la misma pagina,
    # a veces con retraso. Se intenta primero detectar un popup explicito
    # (mecanismo original, el unico que hasta ahora revelo numeros reales);
    # si no abre ninguno en unos segundos, se asume que el flujo sigue en
    # la misma pagina y se cae al respaldo: la escucha pasiva de peticiones
    # (crear_escucha_whatsapp, registrada sobre el contexto completo) sigue
    # activa en ambos casos y es la que realmente entrega el telefono+ID;
    # aqui solo se usa expect_page para saber SI abrio popup o no.
    id_anuncio_actual = extraer_id_inmueble(url)
    estado_telefono["valor"] = None
    estado_telefono["id_anuncio"] = None
    nueva_pagina = None
    try:
        boton.scroll_into_view_if_needed()
        try:
            with context.expect_page(timeout=5000) as info_pagina_nueva:
                boton.click()
            nueva_pagina = info_pagina_nueva.value
            print("   [INFO] Popup detectado, esperando que revele el teléfono...")
        except PlaywrightTimeoutError:
            print("   [INFO] Sin popup (flujo en la misma página o sin respuesta).")
        for _ in range(75):  # hasta 15s esperando la peticion (el clic real a veces tarda)
            if estado_telefono["valor"]:
                break
            time.sleep(0.2)
    except Exception as e:
        print(f"⚠️ [AVISO] No se pudo hacer clic en WhatsApp: {e}")
        return None
    finally:
        # Cerrar cualquier pestaña extra que el clic haya abierto (popup),
        # y si la pagina PRINCIPAL quedo navegada fuera del anuncio (a veces
        # pasa en vez de abrir popup), regresar a el explicitamente antes de
        # seguir -- evita que una navegacion tardia choque con la carga del
        # siguiente anuncio.
        for otra in list(context.pages):
            if otra is not page:
                try:
                    otra.close()
                except Exception:
                    pass
        try:
            if page.url != url and "metrocuadrado.com" in page.url:
                page.go_back(wait_until="domcontentloaded", timeout=8000)
        except Exception:
            pass

    telefono = estado_telefono["valor"]
    id_revelado = estado_telefono["id_anuncio"]

    if not telefono:
        print("⚠️ [AVISO] No se reveló ningún teléfono.")
        return None

    if id_revelado and id_revelado != id_anuncio_actual:
        print(f"⚠️ [AVISO] Teléfono revelado pertenece a otro anuncio (esperado {id_anuncio_actual}, llegó {id_revelado}). Descartado.")
        return None

    print(f"📞 Teléfono verificado ({id_anuncio_actual}): {telefono}")

    return {
        "owner_name": nombre or "Propietario Directo",
        "phone": telefono,
        "link": url,
        "property_type": tipo,
        "bedrooms": "1",
        "price": precio,
        "location": barrio,
        "localidad": "usaquen",
    }


def main():
    OPERACION = "arriendo"
    LUGAR = "usaquen"
    HABITACIONES = "1"
    CUOTA = 20

    print("=" * 70)
    print("🤖 PRUEBA MIGUEL-METROCUADRADO | Usaquén | 1 habitación | Arriendo")
    print(f"   Escribiendo en la pestaña: '{PESTANA_PRUEBA}'")
    print("=" * 70)

    sheets = SheetsHandler(mode=OPERACION)
    sheets.sheet_title = PESTANA_PRUEBA
    sheets.load_existing_data()

    url_busqueda = BASE_URL.format(operacion=OPERACION, lugar=LUGAR, hab=HABITACIONES)

    capturados = 0
    descartados_inmobiliaria = 0
    saltados_duplicado = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="es-CO",
        )

        estado_telefono = {"valor": None}
        context.on("request", crear_escucha_whatsapp(estado_telefono))

        page = context.new_page()

        links = recolectar_links(page, url_busqueda)

        for link in links:
            if capturados >= CUOTA:
                print(f"[STOP] Cuota de {CUOTA} alcanzada.")
                break
            if link.lower().strip() in sheets.existing_links:
                saltados_duplicado += 1
                continue

            print(f"\n🔍 [EVALUANDO] -> {link}")
            datos = procesar_anuncio(page, context, link, estado_telefono)

            if datos is None:
                # Distinguir "no se pudo" de "descartado por inmobiliaria" ya se
                # imprime dentro de procesar_anuncio; aqui solo contamos si aplica
                continue

            if sheets.append_captacion(datos):
                capturados += 1
                print(f"✨ Total capturados: {capturados}")

        browser.close()

    print("")
    print("=" * 70)
    print(f"🎯 RESULTADO DE LA PRUEBA")
    print(f"   Particulares capturados : {capturados}")
    print(f"   Saltados por duplicado  : {saltados_duplicado}")
    print(f"   Pestaña destino         : {PESTANA_PRUEBA}")
    print("=" * 70)


if __name__ == "__main__":
    main()
