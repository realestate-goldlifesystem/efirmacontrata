"""
Configuración central del Agente de Voz "Andrea".

Nada de secretos aquí: solo nombres, IDs públicos y parámetros. Las llaves
reales viven en Secret Manager y se inyectan como variables de entorno en
el despliegue de Cloud Run (ver agente_voz_implementacion.md FASE 4).
"""
import os

# --- Google Sheet ---
SPREADSHEET_ID = "1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc"
SHEET_VENTA = "1 - CAPTACIONES V"
SHEET_ARRIENDO = "1 - CAPTACIONES A"

# --- Credenciales (via variables de entorno, inyectadas desde Secret Manager) ---
TELNYX_API_KEY = os.environ.get("TELNYX_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ANDREA_PROMPT = os.environ.get("ANDREA_PROMPT", "")
# JSON completo de la Service Account (contenido, no una ruta) via Secret Manager
GOOGLE_SA_JSON = os.environ.get("GOOGLE_SA_JSON", "")

# --- Google Calendar (calendario real, ver calendario.py) ---
# Calendario dedicado del proyecto, ya compartido con la Service Account
# andrea-voz@... con permiso de editor.
GOOGLE_CALENDAR_ID = os.environ.get("GOOGLE_CALENDAR_ID", "realestate.goldlifesystem@gmail.com")
DURACION_VISITA_MINUTOS = int(os.environ.get("DURACION_VISITA_MINUTOS", "45"))

# Presentación virtual por Meet (Leonardo, como director de ventas). Tope
# de cupos APARTE del de visitas (decisión de Leonardo, 27-jul-2026): una
# reunión de Meet es mucho más corta que una visita presencial, así que no
# debe competir por el mismo cupo diario. El "4" es un punto de partida,
# no una medición -- ajústalo con la variable de entorno si en la práctica
# Leonardo puede (o no puede) atender más reuniones virtuales por día.
DURACION_MEET_MINUTOS = int(os.environ.get("DURACION_MEET_MINUTOS", "25"))
MAX_MEET_POR_DIA = int(os.environ.get("MAX_MEET_POR_DIA", "4"))

# Link fijo y reutilizable de Meet (respaldo si el link único por reunión no
# está disponible -- ver calendario.py). Se crea una sola vez a mano en
# meet.google.com, logueado como realestate.goldlifesystem@gmail.com:
# "Nueva reunión" -> "Crear una reunión para más tarde". Nunca expira.
MEET_LINK_FIJO = os.environ.get("MEET_LINK_FIJO", "")

# Credenciales OAuth (no la Service Account) para generar un link de Meet
# ÚNICO por reunión: JSON con client_id/client_secret/refresh_token, ver
# agente_voz_implementacion.md sección "Meet OAuth". Una Service Account no
# puede generar links de Meet en un calendario que no es de Google
# Workspace, sin importar qué permiso tenga compartido -- por eso hace
# falta esto aparte, autenticado como el usuario real.
GOOGLE_OAUTH_MEET_JSON = os.environ.get("GOOGLE_OAUTH_MEET_JSON", "")

# --- Telnyx ---
TELNYX_CONNECTION_ID = os.environ.get("TELNYX_CONNECTION_ID", "")
TELNYX_FROM_NUMBER = os.environ.get("TELNYX_FROM_NUMBER", "")
TELNYX_API_BASE = "https://api.telnyx.com/v2"

# --- OpenAI Realtime ---
# gpt-realtime-2.1-mini por defecto: si el piloto muestra que no sigue bien
# el guion, subir a "gpt-realtime-2.1" (ver PRUEBA 3 del plan).
REALTIME_MODEL = os.environ.get("REALTIME_MODEL", "gpt-realtime-2.1-mini")
REALTIME_VOICE = os.environ.get("REALTIME_VOICE", "marin")
REALTIME_WS_URL = f"wss://api.openai.com/v1/realtime?model={REALTIME_MODEL}"

# Modelo de texto para el análisis post-llamada (clasificar estado + resumen).
# Usa OpenAI porque esa llave ya está configurada; si más adelante se agrega
# una llave de Anthropic o Google, se puede apuntar a Sonnet 5 / Gemini Pro
# aquí sin tocar el resto del código (ver analisis.py).
ANALISIS_MODEL = os.environ.get("ANALISIS_MODEL", "gpt-4o-mini")

# --- Host público de este servicio (lo usa telnyx_client.py para armar
#     la URL del webhook y del stream de audio) ---
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "")  # ej: https://andrea-voz-xxxx.us-east4.run.app

# --- Horario permitido (hora Colombia) ---
# Lunes a viernes, 8:00-13:00 y 14:01-16:30. Sin sábados, domingos ni festivos.
HORARIO_MANANA_INICIO = (8, 0)
HORARIO_MANANA_FIN = (13, 0)
HORARIO_TARDE_INICIO = (14, 1)
HORARIO_TARDE_FIN = (16, 30)

# --- Estados de la columna H (ver agente_voz_guion.md sección 6 y decisiones
#     de Leonardo del 27-jul-2026: NO_CONTACTAR se descartó, queda unificado
#     bajo NO sin marca especial; MEET PRESENT es nuevo; BUZÓN sí se escribe ahora,
#     lo limpia el cron de Apps Script en UTIL_Triggers.js). ---
ESTADO_NUEVO = "NUEVO"
ESTADO_PRE_R_CAPTACION = "PRE-R CAPTACION"
ESTADO_SEGUIMIENTO = "SEGUIMIENTO"
ESTADO_NO = "NO"
ESTADO_INMOBILIARIA = "INMOBILIARIA"
ESTADO_MEET_PRESENT = "MEET PRESENT"
ESTADO_VOLVER_A_LLAMAR = "VOLVER A LLAMAR"
ESTADO_VOLVER_A_LLAMAR_2 = "VOLVER A LLAMAR 2"
ESTADO_BUZON = "BUZÓN"
ESTADO_NUMERO_INVALIDO = "NÚMERO INVÁLIDO"
ESTADO_ERROR_TECNICO = "ERROR TÉCNICO"
ESTADO_LLAMANDO = "LLAMANDO"
# CAPTADO es manual - el servicio nunca lo escribe.

# Lo que puede decidir el modelo de análisis post-llamada, leyendo la
# transcripción. VOLVER A LLAMAR NO está aquí a propósito: ese estado es
# puramente de "no contestó" (webhook de Telnyx, sin transcripción posible),
# nunca una conclusión de una conversación en vivo -- eso ahora es SEGUIMIENTO.
ESTADOS_VALIDOS_ANALISIS = {
    ESTADO_PRE_R_CAPTACION, ESTADO_SEGUIMIENTO, ESTADO_NO,
    ESTADO_INMOBILIARIA, ESTADO_MEET_PRESENT,
}

# Estados de "no contestó" que SÍ vuelven a la cola de leads llamables
# (además de NUEVO) -- son reintentos, no leads nuevos.
ESTADOS_REINTENTABLES = {ESTADO_VOLVER_A_LLAMAR, ESTADO_VOLVER_A_LLAMAR_2}

# Todo lo que el servicio tiene permitido escribir en la columna H, sin
# importar quién lo decida (el análisis post-llamada o el webhook de
# Telnyx). CAPTADO queda afuera a propósito: es manual, el servicio nunca
# lo escribe. NUEVO tampoco: es el estado de partida, no un desenlace.
ESTADOS_ESCRIBIBLES_POR_SERVICIO = ESTADOS_VALIDOS_ANALISIS | ESTADOS_REINTENTABLES | {
    ESTADO_LLAMANDO, ESTADO_BUZON, ESTADO_NUMERO_INVALIDO, ESTADO_ERROR_TECNICO,
}

# --- Límites de campaña (red de seguridad) ---
MAX_LLAMADAS_POR_TANDA = int(os.environ.get("MAX_LLAMADAS_POR_TANDA", "10"))
MAX_LLAMADAS_CONCURRENTES = int(os.environ.get("MAX_LLAMADAS_CONCURRENTES", "1"))
MAX_VISITAS_POR_DIA = int(os.environ.get("MAX_VISITAS_POR_DIA", "4"))

# Tamaño del pool de leads llamables que se considera para decidir el orden
# de la tanda (cola.py) -- no es cuántas llamadas se hacen, ver
# MAX_LLAMADAS_POR_TANDA para eso. 1000 sobra de sobra: hoy hay 349
# llamables en total entre las dos pestañas (CEREBRO_DEL_PROYECTO.md §2.8).
POOL_LEADS_MAXIMO = int(os.environ.get("POOL_LEADS_MAXIMO", "1000"))

# Cuántos minutos antes de la hora prometida de un SEGUIMIENTO, cola.py
# empieza a priorizarlo por encima de los leads en frío -- decisión de
# Leonardo (27-jul-2026): calibrado sobre que una llamada dura entre 2 y
# 10 min, así siempre alcanza a terminar la llamada en frío que tenga en
# curso y "cerrar la hora" prometida sin dejar esperando al propietario.
MINUTOS_ANTICIPACION_SEGUIMIENTO = int(os.environ.get("MINUTOS_ANTICIPACION_SEGUIMIENTO", "15"))

# Tope de seguridad: si una llamada nunca resuelve (nunca llega el webhook
# de cuelgue ni termina bridge.py), main.py deja de esperarla después de
# esto y sigue con la siguiente -- para que un caso raro no cuelgue toda
# la tanda. Muy por encima de los ~10 min que dura una llamada normal.
TIMEOUT_LLAMADA_SEGUNDOS = int(os.environ.get("TIMEOUT_LLAMADA_SEGUNDOS", "900"))

# --- Codec de audio (ambos lados hablan lo mismo, sin transcodificar) ---
AUDIO_FORMAT = "audio/pcmu"
AUDIO_SAMPLE_RATE = 8000  # 8000 muestras/seg, 1 byte/muestra (mu-law) -> 8 bytes = 1 ms
