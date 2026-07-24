import os

# Configuración Base del Robot Captador Fincaraiz
SPREADSHEET_ID = "1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc"  # O el ID configurado
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "real-estate-ocr-468904-38d35bfd32d6.json")

# Pestañas de Destino en Google Sheets
SHEET_TITLE_ARRIENDO = "1 - CAPTACIONES A"
SHEET_TITLE_VENTA = "1 - CAPTACIONES V"

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

# URLs Objetivo de Búsqueda ARRIENDO (con filtro ?particular=true)
TARGET_URLS_ARRIENDO = [
    # Usaquén (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/4-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/5-habitaciones?particular=true",

    # Suba (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/4-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/5-habitaciones?particular=true",

    # Chapinero y Sectores (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/4-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/5-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/zona-nororiental/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero-central/bogota/1-habitacion?particular=true"
]

# URLs Objetivo de Búsqueda VENTA (con filtro ?particular=true)
TARGET_URLS_VENTA = [
    # Usaquén (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/4-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/5-habitaciones?particular=true",

    # Suba (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/4-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/5-habitaciones?particular=true",

    # Chapinero y Sectores (1, 2, 3, 4 y 5 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/4-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/5-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/zona-nororiental/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero-central/bogota/1-habitacion?particular=true"
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
