import os

# ==============================================================================
# CONFIGURACIÓN DEL ROBOT CAPTADOR FINCARAIZ
# ==============================================================================

# Google Sheet ID & Pestañas
SPREADSHEET_ID = "1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc"
SHEET_TITLE_ARRIENDO = "1 - CAPTACIONES A"
SHEET_TITLE_VENTA = "1 - CAPTACIONES V"

# Ruta a la credencial JSON de Google Service Account
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "real-estate-ocr-468904-38d35bfd32d6.json")
if not os.path.exists(SERVICE_ACCOUNT_PATH):
    SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "..", "real-estate-ocr-468904-38d35bfd32d6.json")


# Datos de Contacto del Lead (se inyectan en el formulario)
LEAD_NAME = "jose gomez perez"
LEAD_PHONE = "3229763128"
LEAD_EMAIL = "rete.golte@gmail.com"
LEAD_MESSAGE = "Hola, vi esta propiedad en Fincaraiz y me interesa recibir más información."

# Lista de palabras clave para EXCLUIR inmobiliarias / brokers / empresas
EXCLUDED_KEYWORDS = [
    "inmobiliaria", "inmobiliarias", "broker", "brokers", "houm", "home",
    "propiedades", "bienes", "raices", "group", "asociados", "gestion",
    "gestión", "constructora", "s.a.s", "sas", "inc", "ltd", "soluciones",
    "metrocuadrado", "servicios", "fincaraiz", "realtor", "realty",
    "administracion", "administración", "arrendamientos", "comercializadora",
    "consultores", "consultoria", "consultoría", "inmuebles", "franquicia",
    "century", "max", "coldwell", "engel", "völkers", "volkers", "madrigal",
    "forma inmobiliaria", "tu llave", "total services", "uraki", "inmovibe"
]

# URLs Objetivo de Búsqueda ARRIENDO (con filtro ?particular=true)
TARGET_URLS_ARRIENDO = [
    # Usaquén (1, 2, 3 y 4 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/usaquen/bogota/4-habitaciones?particular=true",

    # Suba (1, 2, 3 y 4 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/suba/bogota/4-habitaciones?particular=true",

    # Chapinero y Sectores (1, 2, 3 y 4 habitaciones)
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/bogota/4-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero/zona-nororiental/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/arriendo/apartamentos-y-apartaestudios/chapinero-central/bogota/1-habitacion?particular=true"
]

# URLs Objetivo de Búsqueda VENTA (con filtro ?particular=true)
TARGET_URLS_VENTA = [
    # Usaquén (1, 2, 3 y 4 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/usaquen/bogota/4-habitaciones?particular=true",

    # Suba (1, 2, 3 y 4 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/suba/bogota/4-habitaciones?particular=true",

    # Chapinero y Sectores (1, 2, 3 y 4 habitaciones)
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/2-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/3-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/bogota/4-habitaciones?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero/zona-nororiental/bogota/1-habitacion?particular=true",
    "https://www.fincaraiz.com.co/venta/apartamentos-y-apartaestudios/chapinero-central/bogota/1-habitacion?particular=true"
]

def get_target_urls(mode="arriendo"):
    """Retorna la lista de URLs según el modo (arriendo o venta)."""
    return TARGET_URLS_VENTA if str(mode).lower() == "venta" else TARGET_URLS_ARRIENDO

def get_sheet_title(mode="arriendo"):
    """Retorna la pestaña del Sheet según el modo (arriendo o venta)."""
    return SHEET_TITLE_VENTA if str(mode).lower() == "venta" else SHEET_TITLE_ARRIENDO
