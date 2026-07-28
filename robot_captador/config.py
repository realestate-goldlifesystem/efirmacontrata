import os

# Configuración Base del Robot Captador Fincaraiz
SPREADSHEET_ID = "1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc"  # O el ID configurado
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "real-estate-ocr-468904-38d35bfd32d6.json")

# Pestañas de Destino en Google Sheets
SHEET_TITLE_ARRIENDO = "1 - CAPTACIONES A"
SHEET_TITLE_VENTA = "1 - CAPTACIONES V"

# Pestaña donde el robot deja el registro de cada corrida. La crea sola si no
# existe. De aquí lee el modal "Resumen de Captaciones" del menú del Sheet.
SHEET_TITLE_BITACORA = "0 - BITACORA ROBOT"

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

# Una LOCALIDAD puede estar partida en varias zonas dentro de Fincaraiz.
# Chapinero son 4 listados distintos que NO se contienen entre si; se agrupan
# aqui porque para el usuario "Chapinero" es un solo sector y comparte su cuota.
LOCALIDADES = {
    "usaquen":   ["usaquen"],
    "suba":      ["suba"],
    "chapinero": [
        "chapinero",
        "chapinero/zona-nororiental",
        "chapinero-central",
        "chapinero-alto",
    ],
}

# Lista plana de todas las zonas (se conserva por compatibilidad).
SECTORES = [z for zonas in LOCALIDADES.values() for z in zonas]

# Letra que Miguel escribe en la columna "LOCALIDAD" del Sheet al capturar
# cada fila. Reemplaza cualquier intento de adivinar la localidad a partir
# del texto libre de UBICACIÓN (que trae el barrio, no la localidad).
LOCALIDAD_LETRA = {"usaquen": "U", "suba": "S", "chapinero": "C"}

# --- Lógica de reposición de inventario (barrido automático, --reponer) ---
# Antes de capturar una combinación localidad x habitación, se cuenta cuántas
# filas en estado NUEVO ya existen para esa combinación exacta (filtrando por
# la columna LOCALIDAD). Si ya hay este umbral o más, se salta esa combinación
# para no acumular más backlog del que se alcanza a llamar.
UMBRAL_REPOSICION = 5

BEDROOM_SLUGS = {
    "1": "1-habitacion",
    "2": "2-habitaciones",
    "3": "3-habitaciones",
    "4": "4-habitaciones",
    "5": "5-habitaciones",
}

_BASE = "https://www.fincaraiz.com.co/{op}/apartamentos-y-apartaestudios/{sector}/bogota/{hab}"

def get_localidades(sector="all"):
    """Localidades a recorrer. 'all' devuelve las tres."""
    s = str(sector).lower().strip()
    if not s or s in ("all", "todos", "todas"):
        return list(LOCALIDADES.keys())
    return [s] if s in LOCALIDADES else list(LOCALIDADES.keys())

def get_bedrooms(bedrooms="all"):
    """Cantidades de habitaciones a recorrer. 'all' devuelve de 1 a 5."""
    b = str(bedrooms).lower().strip()
    if not b or b in ("all", "todas", "0"):
        return list(BEDROOM_SLUGS.keys())
    return [b] if b in BEDROOM_SLUGS else list(BEDROOM_SLUGS.keys())

def urls_de(operacion, localidad, bedrooms):
    """URLs de una combinacion concreta: una localidad y una cantidad de habitaciones."""
    slug = BEDROOM_SLUGS.get(str(bedrooms), BEDROOM_SLUGS["1"])
    return [
        _BASE.format(op=operacion, sector=zona, hab=slug)
        for zona in LOCALIDADES.get(localidad, [])
    ]

def get_sheet_title(mode="arriendo"):
    """Retorna la pestaña del Sheet según el modo (arriendo o venta)."""
    return SHEET_TITLE_VENTA if str(mode).lower() == "venta" else SHEET_TITLE_ARRIENDO
