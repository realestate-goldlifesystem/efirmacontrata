"""
Google Calendar real para las herramientas de agenda de Andrea
(consultar_agenda, agendar_visita, agendar_presentacion_meet en
herramientas.py).

Reemplaza el placeholder que tenía el proyecto (sheets.contar_visitas_en_fecha):
ese conteo solo veía las citas que Andrea misma ponía en la columna Q del
Sheet, así que una reserva puesta por fuera -- por ejemplo desde una página
de reservas externa -- no se reflejaba y Andrea podía ofrecer un cupo que ya
estaba tomado. Consultando el calendario real, cualquier evento que exista
ese día -- lo haya puesto Andrea, Leonardo o algo externo -- cuenta como
cupo ocupado.

Dos tipos de cita, cada uno con su propio tope diario (decisión de
Leonardo, 27-jul-2026: una reunión de Meet es mucho más corta que una
visita presencial, no deben competir por el mismo cupo):
  - 'visita': la visita de captación presencial, 45 min por defecto.
  - 'meet': la presentación virtual que da Leonardo, 25 min por defecto.
Ver hay_cupo() para cómo se distinguen sin perder la detección de
reservas externas.

Calendario: config.GOOGLE_CALENDAR_ID (realestate.goldlifesystem@gmail.com),
ya compartido con la Service Account andrea-voz@... con permiso de editor.
Usa la misma credencial que sheets.py (config.GOOGLE_SA_JSON) pero con su
propio scope de Calendar -- cada cliente pide solo el permiso que necesita.

Sigue siendo un tope simple de CITAS POR DÍA, no una revisión de huecos por
hora: es la misma simplificación deliberada que tenía el placeholder,
documentada en agente_voz_guion.md sección 5.
"""
import json
import re
import uuid
from datetime import date, datetime, timedelta
from typing import Optional

from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials as UserCredentials
from googleapiclient.discovery import build

import config
import horario

_MESES_ABREV = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}

_HORAS_EN_PALABRAS = {
    "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
    "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
    "once": 11, "doce": 12,
}

_MINUTOS_EN_PALABRAS = {"media": 30, "cuarto": 15}

_service = None


def get_calendar_service():
    """Cliente de Calendar API. Igual patrón que sheets.get_sheets_service():
    la credencial llega en GOOGLE_SA_JSON (contenido del JSON, no una ruta),
    inyectada desde Secret Manager -- nunca como archivo suelto en Cloud Run."""
    global _service
    if _service is not None:
        return _service
    if not config.GOOGLE_SA_JSON:
        raise RuntimeError("GOOGLE_SA_JSON no está configurado (ver Secret Manager).")
    info = json.loads(config.GOOGLE_SA_JSON)
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/calendar"]
    )
    _service = build("calendar", "v3", credentials=creds).events()
    return _service


def get_calendar_service_oauth():
    """
    Cliente de Calendar API autenticado como el USUARIO real
    (realestate.goldlifesystem@gmail.com) vía OAuth, no como la Service
    Account. Hace falta SOLO para generar un link de Meet único por
    reunión: Google no deja que una Service Account genere links de Meet en
    un calendario que no es de Google Workspace, sin importar qué permiso
    tenga compartido -- lo confirmamos en vivo (ver
    agente_voz_implementacion.md, "Meet OAuth").

    Devuelve None si GOOGLE_OAUTH_MEET_JSON no está configurado (todavía no
    se hizo la autorización, o se decidió no usarla) -- quien llama debe
    caer al link fijo (config.MEET_LINK_FIJO) en ese caso, nunca fallar la
    reserva por esto.

    Mientras la app quede en modo "de prueba" en Google Cloud, el
    refresh_token expira cada 7 días: si eso pasa, `creds.refresh()` lanza
    una excepción y quien llama también debe caer al link fijo.
    """
    if not config.GOOGLE_OAUTH_MEET_JSON:
        return None
    info = json.loads(config.GOOGLE_OAUTH_MEET_JSON)
    creds = UserCredentials(
        token=None,
        refresh_token=info["refresh_token"],
        client_id=info["client_id"],
        client_secret=info["client_secret"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    creds.refresh(GoogleAuthRequest())
    return build("calendar", "v3", credentials=creds).events()


def parsear_fecha(fecha_str: str) -> Optional[date]:
    """'28-jul-2026' -> date(2026, 7, 28). None si no calza el formato que
    pide el guion (DD-mmm-YYYY) -- mejor pedir que la repitan que agendar
    en la fecha equivocada."""
    m = re.match(r"^(\d{1,2})-([a-zA-Z]{3})-(\d{4})$", fecha_str.strip())
    if not m:
        return None
    dia, mes_abrev, anio = m.groups()
    mes = _MESES_ABREV.get(mes_abrev.lower())
    if not mes:
        return None
    try:
        return date(int(anio), mes, int(dia))
    except ValueError:
        return None


def parsear_hora(hora_str: str) -> Optional[tuple[int, int]]:
    """
    'tres de la tarde' -> (15, 0). 'diez y media de la mañana' -> (10, 30).
    None si no se puede interpretar -- mismo criterio que parsear_fecha: es
    mejor devolver error y que el modelo le pida al propietario que repita,
    que crear una cita a una hora inventada.
    """
    texto = hora_str.strip().lower()

    periodo = None
    if "tarde" in texto:
        periodo = "tarde"
    elif "mañana" in texto:
        periodo = "mañana"
    elif "noche" in texto:
        periodo = "noche"

    minuto = 0
    for palabra, valor in _MINUTOS_EN_PALABRAS.items():
        if f"y {palabra}" in texto:
            minuto = valor
            break

    hora = None
    for palabra in sorted(_HORAS_EN_PALABRAS, key=len, reverse=True):
        if re.search(rf"\b{palabra}\b", texto):
            hora = _HORAS_EN_PALABRAS[palabra]
            break
    if hora is None:
        return None

    if periodo in ("tarde", "noche") and hora != 12:
        hora += 12
    elif periodo == "mañana" and hora == 12:
        hora = 0

    return (hora, minuto)


def hay_cupo(fecha_dt: date, tipo: str = "visita") -> dict:
    """
    Cuenta los eventos que compiten por el cupo de ESTE tipo ('visita' o
    'meet') ese día y compara contra su tope diario (config.MAX_VISITAS_POR_DIA
    o config.MAX_MEET_POR_DIA -- son topes separados, decisión de Leonardo).

    Cada evento que este servicio crea queda marcado con
    extendedProperties.private.gls_tipo ('visita' o 'meet'). Un evento SIN
    esa marca -- una reserva externa, o algo que Leonardo puso a mano -- se
    cuenta contra AMBOS tipos: no hay forma de saber qué es, y es peor
    arriesgarse a sobrecargar el día que ser demasiado estricto. Solo se
    excluyen del conteo los eventos marcados explícitamente como del OTRO
    tipo.
    """
    service = get_calendar_service()
    inicio = datetime(fecha_dt.year, fecha_dt.month, fecha_dt.day, 0, 0, tzinfo=horario.TZ_COLOMBIA)
    fin = inicio + timedelta(days=1)

    resultado = service.list(
        calendarId=config.GOOGLE_CALENDAR_ID,
        timeMin=inicio.isoformat(),
        timeMax=fin.isoformat(),
        singleEvents=True,
    ).execute()

    items = resultado.get("items", [])
    otro_tipo = "meet" if tipo == "visita" else "visita"
    del_otro_tipo = sum(
        1 for e in items
        if e.get("extendedProperties", {}).get("private", {}).get("gls_tipo") == otro_tipo
    )
    usados = len(items) - del_otro_tipo
    tope = config.MAX_VISITAS_POR_DIA if tipo == "visita" else config.MAX_MEET_POR_DIA
    return {"usados": usados, "tope": tope, "disponible": usados < tope}


def _descripcion_evento(lead, extra: str = "") -> str:
    partes = [extra] if extra else []
    if lead.ubicacion:
        partes.append(f"Ubicación: {lead.ubicacion}")
    if lead.tipo_inmueble:
        partes.append(f"Tipo de inmueble: {lead.tipo_inmueble}")
    if lead.link:
        partes.append(f"Link del inmueble: {lead.link}")
    partes.append(f"Celular: {lead.celular}")
    return "\n".join(partes)


def crear_evento_visita(momento: datetime, lead, nombre_propietario: str) -> dict:
    """Crea el evento de la visita de captación (config.DURACION_VISITA_MINUTOS,
    45 por defecto) en el calendario real."""
    service = get_calendar_service()
    fin = momento + timedelta(minutes=config.DURACION_VISITA_MINUTOS)

    tipo_negocio = "Venta" if lead.es_venta else "Arriendo"
    resumen = f"Visita de captación ({tipo_negocio}) - {nombre_propietario or lead.nombre_propietario}"

    evento = {
        "summary": resumen,
        "description": _descripcion_evento(lead, "Agendada por Andrea (agente comercial)."),
        "start": {"dateTime": momento.isoformat(), "timeZone": "America/Bogota"},
        "end": {"dateTime": fin.isoformat(), "timeZone": "America/Bogota"},
        "extendedProperties": {"private": {"gls_tipo": "visita"}},
    }
    return service.insert(calendarId=config.GOOGLE_CALENDAR_ID, body=evento).execute()


def crear_evento_meet(momento: datetime, lead, nombre_propietario: str) -> dict:
    """
    Crea la reunión virtual de presentación (config.DURACION_MEET_MINUTOS,
    25 por defecto). La da Leonardo en persona, como director de ventas --
    esta herramienta solo reserva el espacio y consigue el link, no invita
    a nadie por correo porque los leads normalmente solo tienen celular,
    no email.

    Dos caminos para el link, en orden:
    1. Único por reunión, vía OAuth (get_calendar_service_oauth). Es el
       ideal, pero depende de una autorización que --mientras la app esté
       en modo "de prueba" en Google Cloud-- expira cada 7 días.
    2. Si el paso 1 no está configurado o falla (típicamente por esa
       expiración), cae SOLO al link fijo reutilizable
       (config.MEET_LINK_FIJO), creando el evento con la Service Account
       de siempre. La reserva nunca falla por esto -- en el peor caso, la
       reunión usa el link fijo en vez de uno nuevo.
    """
    tipo_negocio = "Venta" if lead.es_venta else "Arriendo"
    resumen = f"Presentación virtual Meet ({tipo_negocio}) - {nombre_propietario or lead.nombre_propietario}"
    descripcion_base = "Agendada por Andrea (agente comercial). La presenta Leonardo Gutiérrez, director de ventas."
    fin = momento + timedelta(minutes=config.DURACION_MEET_MINUTOS)

    evento_base = {
        "summary": resumen,
        "start": {"dateTime": momento.isoformat(), "timeZone": "America/Bogota"},
        "end": {"dateTime": fin.isoformat(), "timeZone": "America/Bogota"},
        "extendedProperties": {"private": {"gls_tipo": "meet"}},
    }

    servicio_oauth = None
    try:
        servicio_oauth = get_calendar_service_oauth()
    except Exception as e:
        print(f"[calendario] No se pudo autenticar el link único de Meet, se usará el fijo: {e}")

    if servicio_oauth is not None:
        try:
            evento = dict(evento_base)
            evento["description"] = _descripcion_evento(lead, descripcion_base)
            evento["conferenceData"] = {
                "createRequest": {
                    "requestId": str(uuid.uuid4()),
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                },
            }
            return servicio_oauth.insert(
                calendarId=config.GOOGLE_CALENDAR_ID, body=evento, conferenceDataVersion=1
            ).execute()
        except Exception as e:
            print(f"[calendario] Falló el link único de Meet, se usará el fijo: {e}")

    service = get_calendar_service()
    evento = dict(evento_base)
    extra = descripcion_base
    if config.MEET_LINK_FIJO:
        extra += f"\nEnlace de la reunión: {config.MEET_LINK_FIJO}"
    evento["description"] = _descripcion_evento(lead, extra)
    creado = service.insert(calendarId=config.GOOGLE_CALENDAR_ID, body=evento).execute()
    creado["hangoutLink"] = config.MEET_LINK_FIJO
    return creado
