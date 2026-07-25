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

# URLs Objetivo de Búsqueda ARRIENDO
# NOTA: se removió `?particular=true` porque Fincaraiz lo ignora por completo
# (idéntico total de resultados con y sin el parámetro). El filtrado real de
# particulares lo hace el robot leyendo owner.particular del listado.
TARGET_URLS_ARRIENDO = [
    # Usaquén (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/1-habitacion",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/2-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/3-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/4-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/5-habitaciones",

    # Suba (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/1-habitacion",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/2-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/3-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/4-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/5-habitaciones",

    # Chapinero y Sectores (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/1-habitacion",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/2-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/3-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/4-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/5-habitaciones",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/zona-nororiental/bogota/1-habitacion",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero-central/bogota/1-habitacion"
]

# URLs Objetivo de Búsqueda VENTA (sin `?particular=true`, ver nota arriba)
TARGET_URLS_VENTA = [
    # Usaquén (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/1-habitacion",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/2-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/3-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/4-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/5-habitaciones",

    # Suba (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/1-habitacion",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/2-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/3-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/4-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/5-habitaciones",

    # Chapinero y Sectores (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/1-habitacion",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/2-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/3-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/4-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/5-habitaciones",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/zona-nororiental/bogota/1-habitacion",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero-central/bogota/1-habitacion"
]

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
