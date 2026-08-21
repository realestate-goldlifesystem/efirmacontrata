"""
PROTOTIPO DE PRUEBA - Metrocuadrado como segunda fuente para Miguel.

No toca scraper.py, sheets_handler.py ni config.py de produccion. Escribe
UNICAMENTE en la pestana "PRUEBA METROCUADRADO" (copia de estructura de
"1 - CAPTACIONES A" creada a proposito para esto). No dispara nada en las
pestanas reales ni en el flujo automatico de GitHub Actions.

Alcance de esta prueba: Usaquen + Suba + Chapinero, las 5 habitaciones,
arriendo. Cuota de 5 particulares por habitacion, repartida entre las 3
localidades (no 5 por cada localidad por separado). Ver
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
BASE_URL = "https://www.metrocuadrado.com/apartamento-apartaestudio/{operacion}/{lugar}/{hab}-habitaciones"

# Mismo endpoint y API key (publica, del propio JS del sitio) que usa el
# buscador de Metrocuadrado para autocompletar. Se consulta en vivo cada vez
# que corre el bot -- no una lista fija -- para no quedar desactualizados si
# el sitio agrega/quita/renombra barrios.
API_URL_LOCATIONS = "https://www.metrocuadrado.com/rest-selector-option/selector/locations?location={query}"
API_KEY_METROCUADRADO = "P1MfFHfQMOtL16Zpg36NcntJYCLFm8FqFfudnavl"

# Reutiliza la misma logica de normalizacion de texto que ya usa Miguel para Fincaraiz
sys_path_original = list(sys.path)


def obtener_lugares_dinamicos(context, query):
    """
    Consulta en vivo el mismo endpoint que usa el buscador de Metrocuadrado
    para "query" (ej: "usaquen") y devuelve los urlFragment (ej:
    "bogota/bella-suiza-usaquen") de todos los barrios que arroje HOY --
    en vez de depender de una lista fija que se puede quedar vieja o
    incompleta si el sitio cambia.
    """
    url = API_URL_LOCATIONS.format(query=query)
    resp = context.request.get(url, headers={"X-Api-Key": API_KEY_METROCUADRADO})
    data = resp.json()
    lugares = []
    for n in data.get("neighborhoods", []):
        frag = n.get("urlFragment")
        if frag:
            lugares.append(frag)
    return lugares


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

# Fragmentos que se buscan como SUBCADENA sobre el nombre compactado (sin
# espacios ni simbolos). Solo van aqui pedazos que NO aparecen dentro del
# nombre de una persona real, porque un falso positivo aqui descarta a un
# propietario legitimo. Esto es lo que atrapa los nombres pegados sin
# espacio ("WIKIREALTORS", "REINMOBA") que se colaban con la regla de
# palabra completa.
FRAGMENTOS_EMPRESA = [
    "inmobiliar", "inmob", "realtor", "realestate", "bienesraices",
    "fincaraiz", "propiedad", "arriendo", "inversion", "constructora",
    "inmueble", "corretaje", "avaluo", "vivienda", "habitat",
    "arrendamiento", "urbanismo", "consultorinmob",
]

# Marcas conocidas de inmobiliarias. Tambien por subcadena sobre el nombre
# compactado, para que den igual los espacios y simbolos con que las
# escriban ("Engel & Volkers", "ENGEL&VOLKERS", "Century 21" -> century21).
MARCAS_INMOBILIARIAS = [
    "engel", "volkers", "coldwell", "sotheby", "century21", "remax",
    "kellerwilliams", "lahaus", "aptuno", "tutecho", "coninsa", "habitea",
    "ciencuadras", "metrocuadrado",
    # Vistas colandose en corridas reales (nombre de marca, sin ninguna
    # palabra generica que las delate):
    "espaciosurbanos", "coolhouse", "casascasas",
]

# Numero del asistente de IA propio de Metrocuadrado ("Pedrito Cuadrado"),
# confirmado por busqueda web -- NO es el celular de ningun anunciante. Si
# una peticion resuelve a este numero (en vez de al clic real), se descarta
# igual que un timeout: no es un dato valido de propietario.
TELEFONO_BOT_METROCUADRADO = "3154587708"

# Las 20 localidades de Bogota. El buscador de Metrocuadrado a veces
# devuelve anuncios de OTRA localidad al buscar por un barrio puntual
# (visto hoy: buscando "usaquen" salio un anuncio de "Engativa" y otro de
# "Teusaquillo") -- probablemente porque rellena resultados con anuncios
# cercanos cuando un barrio especifico tiene pocos. Se usa para descartar
# esos casos comparando contra el texto de "Barrio comun" del anuncio.
LOCALIDADES_BOGOTA = [
    "usaquen", "chapinero", "santa fe", "san cristobal", "usme", "tunjuelito",
    "bosa", "kennedy", "fontibon", "engativa", "suba", "barrios unidos",
    "teusaquillo", "los martires", "antonio narino", "puente aranda",
    "la candelaria", "rafael uribe uribe", "ciudad bolivar", "sumapaz",
]


def pertenece_a_otra_localidad(ubicacion, localidad_buscada):
    """
    True si el texto de ubicacion menciona explicitamente una localidad de
    Bogota DISTINTA a la que se esta buscando (ej: se busco "usaquen" pero
    el anuncio dice "Engativa").
    """
    norm = normalizar(ubicacion)
    buscada_norm = normalizar(localidad_buscada)
    for loc in LOCALIDADES_BOGOTA:
        if loc == buscada_norm:
            continue
        if loc in norm:
            return True
    return False


def extraer_habitaciones_de_url(url):
    """
    Cada anuncio trae su numero real de habitaciones incrustado en el slug
    de su PROPIA url (ej: "...-1-habitaciones-1-banos/MC123"), generado por
    Metrocuadrado -- no es el filtro de busqueda que nosotros pedimos, asi
    que sirve para validar cuando el filtro de la busqueda falla (mismo
    problema visto con el barrio: el filtro no es 100% exacto).
    """
    m = re.search(r'-(\d+)-habitaciones', url.lower())
    return m.group(1) if m else None


def extraer_operacion_de_url(url):
    """La operacion (arriendo/venta) tambien viene en el slug de la propia url."""
    u = url.lower()
    if "/arriendo-" in u:
        return "arriendo"
    if "/venta-" in u:
        return "venta"
    return None


def es_inmobiliaria(nombre):
    """
    Heuristica de deteccion (Metrocuadrado no tiene un campo limpio tipo
    owner.particular como Fincaraiz -- se verifico en vivo el HTML del
    anuncio y NO existe ningun campo de publicador/inmobiliaria). Solo por
    palabras clave -- NO por mayusculas/minusculas: Playwright lee el texto
    ya renderizado, y la pagina muestra ALGUNOS nombres de personas reales
    en mayusculas por estilo visual, asi que las mayusculas no distinguen
    nada aqui.

    Dos pasadas, a proposito:
      1) FRAGMENTOS y MARCAS se buscan como SUBCADENA sobre el nombre
         "compactado" (sin espacios ni simbolos). Asi caen tanto los nombres
         pegados sin espacio ("WIKIREALTORS" -> realtor) como las marcas
         escritas de cualquier forma ("Engel & Volkers", "Century 21").
         Solo van aqui fragmentos que NO aparecen en el nombre de una
         persona, para no descartar propietarios reales por accidente.
      2) La lista negra general de config sigue exigiendo PALABRA COMPLETA,
         porque trae palabras cortas y ambiguas ("pad", "sas", "grupo") que
         como subcadena darian falsos positivos (ej. "pad" dentro de
         "Padilla").
    """
    if not nombre:
        return False

    norm = normalizar(nombre)
    compacto = re.sub(r"[^a-z0-9]", "", norm)

    for frag in FRAGMENTOS_EMPRESA + MARCAS_INMOBILIARIAS:
        if frag and frag in compacto:
            return True

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


def _scroll_hasta_agotar(page, max_intentos=60, estabilidad_requerida=3, intentos_minimos=5):
    """
    Hace scroll repetidamente hasta que el numero de anuncios cargados en el
    DOM deja de crecer durante `estabilidad_requerida` intentos seguidos (o
    hasta un tope de seguridad). Un numero FIJO de scrolls se quedaba corto
    en paginas con mas contenido del esperado (se vio en logs: paginas
    seguidas reportando casi el mismo conteo, señal de que se cortaba el
    scroll antes de que la pagina terminara de cargar todo lo disponible).

    Ojo: "estable en 0" NO cuenta como agotado -- se vio en logs reales que
    la primera busqueda de una corrida a veces se lee ANTES de que el
    listado termine de renderizar (recien navegado), y 0==0==0 durante los
    primeros intentos se detectaba como "estable" y cortaba el scroll antes
    de que cargara ningun anuncio real. Por eso se exige conteo > 0 Y un
    minimo de intentos antes de aceptar la estabilidad como valida.
    """
    anterior = -1
    estable = 0
    for intento in range(max_intentos):
        page.evaluate("window.scrollBy(0, 900)")
        time.sleep(0.3)
        actual = page.eval_on_selector_all(
            'a[href*="/inmueble/"]',
            "els => new Set(els.map(e => e.href.split('?')[0])).size"
        )
        if actual == anterior and actual > 0 and intento >= intentos_minimos:
            estable += 1
            if estable >= estabilidad_requerida:
                break
        else:
            estable = 0
        anterior = actual


def recolectar_links(page, url_busqueda, max_paginas=10):
    """
    Recolecta los links de un listado, agotando primero el scroll perezoso
    de la pagina actual (hasta que deje de crecer, ver _scroll_hasta_agotar)
    y despues avanzando por la paginacion (biblioteca "rc-pagination": boton
    ".rc-pagination-next", se deshabilita con la clase
    "rc-pagination-disabled" cuando ya no hay mas paginas). La paginacion es
    por estado de React, no cambia la URL -- por eso hay que darle clic de
    verdad en vez de armar una URL con numero de pagina.
    """
    ruta_pedida = url_busqueda.split("?")[0].rstrip("/")

    def url_correcta():
        return page.url.split("?")[0].rstrip("/") == ruta_pedida

    for intento_general in range(3):
        print(f"[INFO] Cargando listado: {url_busqueda}")
        try:
            page.goto(url_busqueda, wait_until="domcontentloaded", timeout=45000)
        except Exception as e:
            # Puede chocar con una navegacion anterior todavia pendiente (ej:
            # el clic de WhatsApp de un anuncio previo que quedo "colgado"
            # navegando hacia api.whatsapp.com y aun no habia terminado) --
            # se ve como "Navigation to X is interrupted by another
            # navigation to Y". Se reintenta desde cero en vez de dejar que
            # tumbe todo el script.
            print(f"⚠️ [AVISO] No se pudo cargar el listado (intento general {intento_general+1}/3): {e}")
            continue
        time.sleep(2)
        if not url_correcta():
            print(f"⚠️ [AVISO] La URL real ({page.url}) no coincide con la pedida (intento general {intento_general+1}/3). Reintentando desde cero...")
            continue

        # Aceptar cookies si aparece el banner (solo la primera vez)
        try:
            boton = page.query_selector('button:has-text("Aceptar")')
            if boton:
                boton.click()
                time.sleep(0.5)
        except Exception:
            pass

        # Cuando este lugar+habitaciones no tiene NINGUN anuncio real,
        # Metrocuadrado no dice "0 resultados" -- muestra "No encontramos lo
        # que buscabas, pero te recomendamos..." y rellena con anuncios
        # RANDOM de cualquier parte de Bogota (visto en vivo: "el-pedregal-
        # usaquen" cayo aqui y broto un listado de 500+ anuncios sin
        # relacion real con el lugar buscado). Se detecta ese texto y se
        # trata como lugar vacio, en vez de recolectar esos anuncios random.
        if "No encontramos lo que buscabas" in page.inner_text("body"):
            print(f"[INFO] Metrocuadrado no tiene anuncios reales para este lugar (mostró recomendaciones genéricas de otras zonas). Se omite.")
            return []

        todos_los_links = []
        num_pagina = 1
        max_pagina_real = None
        reiniciar = False
        while True:
            _scroll_hasta_agotar(page)

            # Una navegacion tardia (ej: el clic de WhatsApp de un anuncio
            # anterior resolviendo con retraso) puede aterrizar de vuelta en
            # una pagina de resultados VIEJA usando su propio "src_url" de
            # referencia -- eso ya paso en una corrida real (un lugar chico
            # termino leyendo el resultado de otro lugar completamente
            # distinto). Se revisa la URL en CADA vuelta, no solo al
            # principio, y si cambio se descarta todo y se reinicia limpio.
            if not url_correcta():
                print(f"⚠️ [AVISO] La página cambió sola durante la recolección ({page.url}). Descartando y reiniciando este lugar...")
                reiniciar = True
                break

            if max_pagina_real is None:
                # El boton ".rc-pagination-next" a veces sigue apareciendo
                # habilitado DESPUES de la ultima pagina real -- se vio en
                # vivo: dos lugares chicos distintos ("usaquen-chico",
                # "maranta-usaquen") terminaron con el MISMO catalogo de
                # "recomendados" (anuncios identicos, sin relacion con lo
                # buscado) apenas se paso de la pagina real. Los NUMEROS de
                # pagina mostrados (.rc-pagination-item) son mas confiables
                # que el estado del boton -- nunca se avanza mas alla del
                # numero mas alto mostrado ahi. Se lee DESPUES de agotar el
                # scroll de la pagina 1 (no antes): el control de paginacion
                # puede tardar en terminar de renderizarse, y leerlo
                # demasiado pronto devolvia "1" incluso en lugares con 2
                # paginas reales (ej "usaquen" general).
                numeros_pagina = page.eval_on_selector_all(
                    '.rc-pagination-item',
                    "els => els.map(e => parseInt(e.textContent)).filter(n => !isNaN(n))"
                )
                max_pagina_real = max(numeros_pagina) if numeros_pagina else 1
                print(f"[INFO] Páginas reales mostradas por el sitio para este lugar: {max_pagina_real}")

            links_pagina = page.eval_on_selector_all(
                'a[href*="/inmueble/"]',
                "els => [...new Set(els.map(e => e.href.split('?')[0]))]"
            )
            print(f"[INFO] --- Página {num_pagina}: {len(links_pagina)} anuncios ---")
            for link in links_pagina:
                print(f"    [pág. {num_pagina}] {link}")
            todos_los_links.extend(links_pagina)

            if num_pagina >= max_paginas:
                print(f"[INFO] Tope de {max_paginas} páginas alcanzado, se detiene la paginación.")
                break

            if num_pagina >= max_pagina_real:
                print(f"[INFO] Ya se llegó a la última página real ({max_pagina_real}), no se avanza más aunque el botón siga habilitado.")
                break

            boton_siguiente = page.query_selector('.rc-pagination-next:not(.rc-pagination-disabled)')
            if not boton_siguiente:
                break

            try:
                boton_siguiente.click()
                page.wait_for_timeout(1500)
            except Exception as e:
                print(f"⚠️ [AVISO] No se pudo pasar de página: {e}")
                break

            num_pagina += 1

        if reiniciar:
            continue

        links_unicos = list(dict.fromkeys(todos_los_links))
        print(f"[INFO] === Total páginas alcanzadas: {num_pagina} | {len(links_unicos)} anuncios únicos ===")
        return links_unicos

    print(f"⚠️ [AVISO] No se pudo recolectar el listado tras 3 intentos generales, se omite: {url_busqueda}")
    return []


def procesar_anuncio(page, context, url, estado_telefono, localidad_buscada, lugar_buscado,
                      habitaciones_esperadas, operacion_esperada):
    # Validar contra el propio slug del anuncio (dato real de Metrocuadrado,
    # no nuestro filtro de busqueda) antes de siquiera cargar la pagina --
    # mismo problema visto con el barrio: el filtro de busqueda no es exacto.
    habitaciones_url = extraer_habitaciones_de_url(url)
    if habitaciones_url and habitaciones_url != str(habitaciones_esperadas):
        print(f"[DESCARTADO] Habitaciones no coinciden (se buscaban {habitaciones_esperadas}, el anuncio dice {habitaciones_url}) -> {url}")
        return None

    operacion_url = extraer_operacion_de_url(url)
    if operacion_url and operacion_url != operacion_esperada:
        print(f"[DESCARTADO] Operación no coincide (se buscaba {operacion_esperada}, el anuncio dice {operacion_url}) -> {url}")
        return None

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

    barrio = extraer_campo(texto, r'Barrio común:\s*(.+)')

    if pertenece_a_otra_localidad(barrio, localidad_buscada):
        print(f"[DESCARTADO] Otra localidad detectada en '{barrio}' (se buscaba '{lugar_buscado}' dentro de {localidad_buscada}) -> {url}")
        return None

    print(f"[ACEPTADO] '{nombre or '(sin nombre, probable particular)'}'")

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
        # Cerrar cualquier pestaña extra que el clic haya abierto (popup) --
        # esto SI hace falta, para no ir acumulando pestañas. NO se intenta
        # "regresar" (go_back) si la pagina principal quedo navegada fuera
        # del anuncio: nunca hace falta, porque cada anuncio se visita
        # navegando DIRECTO a su propia URL (la lista completa ya se saco
        # de antemano en recolectar_links), nunca haciendo clic para volver
        # al portal. Intentar "regresar" con el historial del navegador era
        # justamente lo que podia aterrizar en cualquier pagina vieja
        # impredecible si una navegacion tardia llegaba en mal momento.
        for otra in list(context.pages):
            if otra is not page:
                try:
                    otra.close()
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
        # localidad la asigna quien llama (segun la busqueda usada, ej "usaquen")
    }


def main():
    OPERACION = "arriendo"
    LOCALIDADES = ["usaquen", "suba", "chapinero"]
    HABITACIONES_LISTA = ["1", "2", "3", "4", "5"]
    CUOTA_POR_HABITACION = 5

    print("=" * 70)
    print("🤖 PRUEBA MIGUEL-METROCUADRADO | Usaquén + Suba + Chapinero | 5 habitaciones | Arriendo")
    print(f"   Cuota objetivo: {CUOTA_POR_HABITACION} por habitación, repartida entre las 3 localidades")
    print(f"   Escribiendo en la pestaña: '{PESTANA_PRUEBA}'")
    print("=" * 70)

    sheets = SheetsHandler(mode=OPERACION)
    sheets.sheet_title = PESTANA_PRUEBA
    sheets.load_existing_data()

    capturados_total = 0
    saltados_duplicado_total = 0

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

        # Lugares dinamicos por localidad, pedidos UNA sola vez -- se
        # reutilizan para las 5 habitaciones, ya que solo cambia el filtro
        # de habitaciones en la URL, no la lista de barrios de la localidad.
        lugares_por_localidad = {}
        for localidad in LOCALIDADES:
            lugares = obtener_lugares_dinamicos(context, localidad)
            lugares_por_localidad[localidad] = lugares
            print(f"[INFO] {len(lugares)} lugares encontrados dinámicamente para '{localidad}'.")

        for hab in HABITACIONES_LISTA:
            print("")
            print("=" * 70)
            print(f"=== HABITACIÓN {hab} — cuota objetivo: {CUOTA_POR_HABITACION} (repartida entre localidades) ===")
            print("=" * 70)

            capturados_esta_hab = 0
            saltados_duplicado_esta_hab = 0
            vistos_en_esta_corrida = set()
            localidades_con_aporte = []

            for localidad in LOCALIDADES:
                if capturados_esta_hab >= CUOTA_POR_HABITACION:
                    print(f"[STOP] Cuota de {CUOTA_POR_HABITACION} para {hab} habitación(es) ya alcanzada, se salta '{localidad}'.")
                    break

                lugares = lugares_por_localidad[localidad]
                print(f"\n[INFO] --- Localidad '{localidad}' para {hab} habitación(es): {len(lugares)} lugares ---")
                capturados_antes_localidad = capturados_esta_hab

                for idx, lugar in enumerate(lugares, start=1):
                    if capturados_esta_hab >= CUOTA_POR_HABITACION:
                        print(f"[STOP] Cuota de {CUOTA_POR_HABITACION} para {hab} habitación(es) ya alcanzada.")
                        break

                    print(f"\n[INFO] >>> Lugar {idx}/{len(lugares)} ({localidad}, {hab} hab): {lugar} <<<")

                    url_busqueda = BASE_URL.format(operacion=OPERACION, lugar=lugar, hab=hab)
                    links = recolectar_links(page, url_busqueda)

                    # Muchos barrios chicos quedan totalmente cubiertos por una
                    # busqueda mas amplia ya recorrida antes en esta misma
                    # habitacion (ej: "usaquen" general, que se busca de
                    # primero) -- esto es normal y evita evaluar el mismo
                    # anuncio dos veces, no es un error.
                    ya_vistos = sum(1 for l in links if l.lower().strip() in vistos_en_esta_corrida)
                    nuevos = len(links) - ya_vistos
                    print(f"[INFO] De estos {len(links)} anuncios: {ya_vistos} ya se habían visto en un lugar anterior de esta misma habitación (se saltan sin evaluar) y {nuevos} son nuevos para evaluar.")

                    capturados_antes_lugar = capturados_esta_hab
                    evaluados_este_lugar = 0
                    saltados_duplicado_antes_lugar = saltados_duplicado_esta_hab

                    for link in links:
                        if capturados_esta_hab >= CUOTA_POR_HABITACION:
                            print(f"[STOP] Cuota de {CUOTA_POR_HABITACION} para {hab} habitación(es) ya alcanzada.")
                            break
                        link_norm = link.lower().strip()
                        if link_norm in vistos_en_esta_corrida:
                            continue
                        vistos_en_esta_corrida.add(link_norm)
                        if link_norm in sheets.existing_links:
                            saltados_duplicado_esta_hab += 1
                            continue

                        print(f"\n🔍 [EVALUANDO] ({localidad} / {lugar}) -> {link}")
                        evaluados_este_lugar += 1
                        datos = procesar_anuncio(page, context, link, estado_telefono, localidad, lugar,
                                                  hab, OPERACION)

                        if datos is None:
                            # Distinguir "no se pudo" de "descartado por inmobiliaria" ya se
                            # imprime dentro de procesar_anuncio; aqui solo contamos si aplica
                            continue

                        datos["localidad"] = localidad
                        if sheets.append_captacion(datos):
                            capturados_esta_hab += 1
                            capturados_total += 1
                            print(f"✨ Capturados en {hab} hab: {capturados_esta_hab}/{CUOTA_POR_HABITACION} | Total corrida: {capturados_total}")

                    print(f"[RESUMEN LUGAR {idx}/{len(lugares)} - {lugar}] evaluados: {evaluados_este_lugar} | "
                          f"capturados nuevos: {capturados_esta_hab - capturados_antes_lugar} | "
                          f"saltados por duplicado (ya en el Sheet): {saltados_duplicado_esta_hab - saltados_duplicado_antes_lugar}")

                aporte_localidad = capturados_esta_hab - capturados_antes_localidad
                print(f"[RESUMEN LOCALIDAD '{localidad}' - {hab} hab] aporte: {aporte_localidad} particulares")
                if aporte_localidad > 0:
                    localidades_con_aporte.append(localidad)

            saltados_duplicado_total += saltados_duplicado_esta_hab
            print("")
            print(f"[RESUMEN HABITACIÓN {hab}] capturados: {capturados_esta_hab}/{CUOTA_POR_HABITACION} | "
                  f"localidades usadas: {', '.join(localidades_con_aporte) if localidades_con_aporte else 'ninguna'} | "
                  f"saltados por duplicado: {saltados_duplicado_esta_hab}")

        browser.close()

    print("")
    print("=" * 70)
    print(f"🎯 RESULTADO FINAL DE LA PRUEBA")
    print(f"   Particulares capturados (total) : {capturados_total}")
    print(f"   Saltados por duplicado (total)  : {saltados_duplicado_total}")
    print(f"   Pestaña destino                 : {PESTANA_PRUEBA}")
    print("=" * 70)


if __name__ == "__main__":
    main()
