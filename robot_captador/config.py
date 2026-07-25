import os

# Configuración Base del Robot Captador Fincaraiz
SPREADSHEET_ID = "1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc"  # O el ID configurado
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "real-estate-ocr-468904-38d35bfd32d6.json")

# Pestañas de Destino en Google Sheets
SHEET_TITLE_ARRIENDO = "1 - CAPTACIONES A"
SHEET_TITLE_VENTA = "1 - CAPTACIONES V"

# Fila que se usa como PLANTILLA de formato para las filas nuevas.
# Debe ser una fila de datos con el formato correcto (bordes, colores,
# validaciones). Se usa una fila fija y conocida como buena, no la anterior,
# para no propagar el formato de una fila que ya haya quedado mal.
FORMAT_REFERENCE_ROW = 3

# Columna "WHA": enlace directo a WhatsApp del propietario.
# Se escribe como fórmula HYPERLINK apuntando a la celda del celular, así el
# link sigue siendo correcto si algún día se corrige el número a mano.
WHATSAPP_COUNTRY_CODE = "57"   # Colombia, sin el '+'
WHATSAPP_EMOJI = "🟢"          # Texto visible del enlace

# Separador de argumentos de las fórmulas del Sheet.
# Depende de la configuración regional del archivo: el Sheet está en es_CO,
# que usa punto y coma. Con coma las fórmulas devuelven #ERROR!.
# Si algún día se cambia el idioma del Sheet a inglés, poner ",".
FORMULA_ARG_SEPARATOR = ";"

# Datos fijos para el formulario de Fincaraiz
LEAD_NAME = "jose gomez perez"
LEAD_PHONE = "3229763128"
LEAD_EMAIL = "rete.golte@gmail.com"
LEAD_MESSAGE = "Hola, vi esta propiedad en Fincaraiz y me interesa recibir más información."

# Palabras Clave de Filtro Persona Natural (BÚSQUEDA EXCLUSIVA PROPIETARIOS DIRECTOS)
FILTER_KEYWORDS_NATURAL_PERSON = [
    "particular", "propietario", "directo", "persona natural"
]

# Lista Negra de Palabras Clave para Descartar Inmobiliarias / Brokers / Empresas
KEYWORD_BLACKLIST = [
    "inmobiliaria", "inmobiliarios", "inmobiliaria sas", "finca raiz", "real estate",
    "realtor", "brokers", "broker", "asociados", "asociado", "propiedades",
    "bienes raices", "consultores", "grupo", "group", "s.a.s", "sas",
    "soluciones", "servicios", "gestion", "gerencia", "asesores", "asesor",
    "inversiones", "desarrollo", "constructora", "century 21", "re/max", "remax",
    "pad", "pads", "arriendos", "ventas", "comercializadora", "capital",
    "homie", "aptuno", "cobi", "houm", "lahaus", "habitea"
]
EXCLUDED_KEYWORDS = KEYWORD_BLACKLIST

# --- Configuración de Paginación ---
# Fincaraiz pagina de a 21 anuncios con el formato /paginaN, y el JSON del listado
# expone paginatorInfo.lastPage, así que no hay que sondear para hallar el final.
#
# El robot recorre DE ATRÁS HACIA ADELANTE (última página -> página 1) porque el
# orden por "Popularidad" deja a los particulares al final del listado.
# Medido en vivo (25-jul-2026):
#   venta/suba/3-habitaciones    -> 2050 anuncios, 98 páginas, los 15 particulares en p97-p98
#   arriendo/usaquen/2-habitac.  -> 525 anuncios, 25 páginas, 16 de 63 particulares en p25
#
# Ojo: la barra de paginación de la web solo muestra hasta 50 páginas, pero es
# cosmética; el listado real puede ser mucho más largo (98 en el caso de venta).
MAX_PAGES_PER_SEARCH = 150  # Salvaguarda contra bucles si el sitio se comporta raro
PAGE_ERROR_TOLERANCE = 3    # Páginas seguidas con error antes de abandonar la búsqueda

# Filtrar por owner.particular del listado ANTES de abrir el detalle.
# El JSON del listado ya indica si el anunciante es particular o inmobiliaria,
# así el robot no gasta navegaciones abriendo inmobiliarias para descartarlas.
STRICT_PARTICULAR_FILTER = True

# ---------------------------------------------------------------------------
# MATRIZ DE BÚSQUEDA
# ---------------------------------------------------------------------------
# Antes las URLs estaban escritas a mano una por una, y por eso los sectores de
# Chapinero solo tenían la de 1 habitación: para 2, 3, 4 y 5 el robot no miraba
# nada. Medido el 25-jul-2026, ese hueco escondía miles de anuncios
# (ej: venta en chapinero/zona-nororiental de 3 habitaciones = 886 anuncios).
#
# Ahora la matriz se genera a partir de estas dos listas. Para cubrir un sector
# nuevo basta agregarlo a SECTORES y queda cubierto en arriendo y venta, en
# todas las cantidades de habitaciones.
#
# NOTA: los sectores NO se contienen entre sí. "chapinero" (52 anuncios en
# 2 habitaciones) no incluye "chapinero/zona-nororiental" (194). Son listados
# distintos y hay que pedirlos por separado.

SECTORES = [
    "usaquen",
    "suba",
    "chapinero",
    "chapinero/zona-nororiental",
    "chapinero-central",
    "chapinero-alto",
]

BEDROOM_SLUGS = {
    "1": "1-habitacion",
    "2": "2-habitaciones",
    "3": "3-habitaciones",
    "4": "4-habitaciones",
    "5": "5-habitaciones",
}

_BASE = "https://www.fincaraiz.com.co/{op}/apartamentos-y-apartaestudios/{sector}/bogota/{hab}"

def _construir_urls(operacion):
    """Genera la matriz completa sector x habitaciones para una operación."""
    return [
        _BASE.format(op=operacion, sector=sector, hab=slug)
        for sector in SECTORES
        for slug in BEDROOM_SLUGS.values()
    ]

TARGET_URLS_ARRIENDO = _construir_urls("arriendo")
TARGET_URLS_VENTA = _construir_urls("venta")

def get_target_urls(mode="arriendo", bedrooms="all"):
    """Retorna la lista de URLs según el modo (arriendo o venta) y filtro opcional de habitaciones."""
    base_urls = TARGET_URLS_VENTA if str(mode).lower() == "venta" else TARGET_URLS_ARRIENDO
    b_str = str(bedrooms).lower().strip()
    if not b_str or b_str in ["all", "todas", "0"]:
        return base_urls

    filtered = []
    target_pattern = f"/{b_str}-habitacio"
    for url in base_urls:
        if target_pattern in url:
            filtered.append(url)
    
    return filtered if filtered else base_urls

def get_sheet_title(mode="arriendo"):
    """Retorna la pestaña del Sheet según el modo (arriendo o venta)."""
    return SHEET_TITLE_VENTA if str(mode).lower() == "venta" else SHEET_TITLE_ARRIENDO
