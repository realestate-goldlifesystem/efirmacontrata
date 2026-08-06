"""
Lectura de leads llamables y escritura del resultado de cada llamada.

Complementa (no reemplaza) a robot_captador/sheets_handler.py: ese módulo
CREA filas nuevas cuando el robot capta un propietario; este módulo LEE
filas existentes en estado NUEVO y ACTUALIZA columnas puntuales (H, N, Q, R)
cuando una llamada termina. Reutiliza el mismo patrón de reintentos, el
mismo mapeo dinámico de encabezados y las mismas reglas de escritura
aprendidas por el robot (CEREBRO sección 2.7):
  - fechas con RAW, nunca USER_ENTERED (evita que Sheets las vuelva número
    de serie);
  - nunca tocar la columna C (WHA), que lleva una fórmula HYPERLINK.
"""
import json
import re
import time
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build

import config


def con_reintentos(operacion, descripcion="operación de Sheets"):
    """Igual que en sheets_handler.py: reintenta ante 429/500/502/503/504."""
    ultimo_error = None
    for intento in range(1, 4):
        try:
            return operacion()
        except Exception as e:
            texto = str(e)
            recuperable = any(c in texto for c in ("429", "500", "502", "503", "504",
                                                     "rateLimitExceeded", "backendError",
                                                     "internalError", "timed out"))
            if not recuperable or intento == 3:
                raise
            ultimo_error = e
            time.sleep(2 ** intento)
    if ultimo_error:
        raise ultimo_error


def normalize_header(h: str) -> str:
    if not h:
        return ""
    text = unicodedata.normalize("NFD", str(h)).encode("ascii", "ignore").decode("utf-8")
    return text.lower().strip()


def clean_phone(phone_str: str) -> str:
    """Igual que sheets_handler.py: solo dígitos, sin el prefijo 57 del país."""
    if not phone_str:
        return ""
    digits = re.sub(r"\D", "", str(phone_str))
    if digits.startswith("57") and len(digits) > 10:
        digits = digits[2:]
    return digits


def col_to_letter(col_idx: int) -> str:
    """Índice base-0 -> letra de Excel (0 -> A, 7 -> H)."""
    result = ""
    col_idx += 1
    while col_idx > 0:
        col_idx, remainder = divmod(col_idx - 1, 26)
        result = chr(65 + remainder) + result
    return result


_service = None


def get_sheets_service():
    """
    Cliente de Sheets API usando la Service Account.

    La credencial llega en GOOGLE_SA_JSON como el CONTENIDO del JSON (no una
    ruta de archivo), inyectada desde Secret Manager -- nunca vive como
    archivo suelto en el contenedor de Cloud Run.
    """
    global _service
    if _service is not None:
        return _service
    if not config.GOOGLE_SA_JSON:
        raise RuntimeError("GOOGLE_SA_JSON no está configurado (ver Secret Manager).")
    info = json.loads(config.GOOGLE_SA_JSON)
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    _service = build("sheets", "v4", credentials=creds).spreadsheets()
    return _service


@dataclass
class Lead:
    fila: int  # número de fila real en el Sheet (1-indexado)
    tab: str
    celular: str
    es_arriendo: bool
    es_venta: bool
    nombre_propietario: str = ""
    valor_promocion: str = ""
    tipo_inmueble: str = ""
    habitaciones: str = ""
    ubicacion: str = ""
    link: str = ""
    estado_actual: str = ""
    # Columnas Q/R -- la hora exacta que Andrea prometió para el recontacto
    # (herramienta programar_recontacto en herramientas.py). Solo están
    # pobladas cuando estado_actual es SEGUIMIENTO y sí hubo una promesa
    # concreta -- si el propietario solo dijo "necesito pensarlo" sin dar
    # hora, quedan vacías y cola.py no las trata como recontacto urgente.
    fecha_seguimiento: str = ""
    hora_seguimiento: str = ""


def _mapear_columnas(header_row: list) -> dict:
    col_map = {}
    for idx, nombre in enumerate(header_row):
        norm = normalize_header(nombre)
        if norm:
            col_map[norm] = idx
    return col_map


def _valor(row: list, col_map: dict, nombre_col: str) -> str:
    idx = col_map.get(normalize_header(nombre_col))
    if idx is None or len(row) <= idx:
        return ""
    return (row[idx] or "").strip()


def obtener_leads_llamables(tab: str, limite: int) -> list[Lead]:
    """
    Filas llamables, en orden de aparición en el Sheet: NUEVO, un estado
    reintentable (VOLVER A LLAMAR / VOLVER A LLAMAR 2), o SEGUIMIENTO CON
    una hora de recontacto prometida (columnas Q/R pobladas -- ver
    programar_recontacto en herramientas.py). Un SEGUIMIENTO sin promesa
    concreta ("necesito pensarlo") NO entra aquí -- ese lo decide Leonardo
    a mano. `limite` es el TAMAÑO DEL POOL a considerar, no cuántas
    llamadas se van a hacer -- main.py usa cola.elegir_siguiente sobre este
    pool para decidir el orden real. No filtra por horario -- eso lo decide
    quien llama a esta función, antes de disparar la campaña.

    Incluir los reintentables es lo que hace que la cola de "a quién llamar"
    de verdad avance -- antes de esto, una fila que quedaba en VOLVER A
    LLAMAR se quedaba ahí para siempre, porque solo se miraba NUEVO.
    """
    service = get_sheets_service()
    range_name = f"'{tab}'!A1:S3000"
    result = con_reintentos(
        lambda: service.values().get(spreadsheetId=config.SPREADSHEET_ID, range=range_name).execute(),
        f"lectura de '{tab}'",
    )
    rows = result.get("values", [])
    if not rows:
        return []

    col_map = _mapear_columnas(rows[0])
    leads = []
    estados_siempre_llamables = {config.ESTADO_NUEVO} | config.ESTADOS_REINTENTABLES

    for idx, row in enumerate(rows[1:], start=2):  # fila 2 en adelante (1 = encabezados)
        estado = _valor(row, col_map, "estado de llamada")
        fecha_seguimiento = _valor(row, col_map, "fecha de seguimiento")
        hora_seguimiento = _valor(row, col_map, "hora de seguimiento")

        es_seguimiento_prometido = (
            estado == config.ESTADO_SEGUIMIENTO and fecha_seguimiento and hora_seguimiento
        )
        if estado not in estados_siempre_llamables and not es_seguimiento_prometido:
            continue

        celular_crudo = _valor(row, col_map, "celular")
        celular = clean_phone(celular_crudo)
        if not celular or len(celular) < 10:
            continue

        leads.append(Lead(
            fila=idx,
            tab=tab,
            celular=celular,
            es_arriendo=_valor(row, col_map, "arriendo").upper() == "TRUE",
            es_venta=_valor(row, col_map, "venta").upper() == "TRUE",
            nombre_propietario=_valor(row, col_map, "nombre del propietario"),
            valor_promocion=_valor(row, col_map, "valor de promocion") or _valor(row, col_map, "valor de promoción"),
            tipo_inmueble=_valor(row, col_map, "tipo de inmueble"),
            habitaciones=_valor(row, col_map, "habitaciones"),
            ubicacion=_valor(row, col_map, "ubicacion") or _valor(row, col_map, "ubicación"),
            link=_valor(row, col_map, "link del inmueble publicado"),
            estado_actual=estado,
            fecha_seguimiento=fecha_seguimiento,
            hora_seguimiento=hora_seguimiento,
        ))
        if len(leads) >= limite:
            break

    return leads


def escribir_resultado(
    tab: str,
    fila: int,
    estado: str,
    resumen: str = "",
    fecha_cita: str = "",
    hora_cita: str = "",
):
    """
    Escribe el desenlace de una llamada: columna H (estado) y N (resumen)
    siempre; Q y R (fecha/hora de la cita) solo si se agendó.

    RAW en las tres columnas: son texto plano (estado, resumen) o fechas
    que NO deben interpretarse como número de serie -- ver CEREBRO 2.7 y
    agente_voz_guion.md sección 6. Nunca se toca la columna C (WHA).
    """
    if estado not in config.ESTADOS_ESCRIBIBLES_POR_SERVICIO:
        raise ValueError(f"Estado no reconocido o no permitido para el servicio: {estado!r}")

    service = get_sheets_service()

    # H y N siempre. H=col 8 (letra H), N=col 14 (letra N) en la estructura
    # de 19 columnas confirmada en vivo (agente_voz_guion.md sección 2).
    con_reintentos(
        lambda: service.values().update(
            spreadsheetId=config.SPREADSHEET_ID,
            range=f"'{tab}'!H{fila}:H{fila}",
            valueInputOption="RAW",
            body={"values": [[estado]]},
        ).execute(),
        f"escritura de estado en '{tab}'!H{fila}",
    )

    if resumen:
        con_reintentos(
            lambda: service.values().update(
                spreadsheetId=config.SPREADSHEET_ID,
                range=f"'{tab}'!N{fila}:N{fila}",
                valueInputOption="RAW",
                body={"values": [[resumen]]},
            ).execute(),
            f"escritura de resumen en '{tab}'!N{fila}",
        )

    if fecha_cita and hora_cita:
        con_reintentos(
            lambda: service.values().update(
                spreadsheetId=config.SPREADSHEET_ID,
                range=f"'{tab}'!Q{fila}:R{fila}",
                valueInputOption="RAW",
                body={"values": [[fecha_cita, hora_cita]]},
            ).execute(),
            f"escritura de cita en '{tab}'!Q{fila}:R{fila}",
        )
