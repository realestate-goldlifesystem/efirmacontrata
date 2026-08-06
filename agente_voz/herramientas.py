"""
Las 6 herramientas de Andrea (agente_voz_guion.md sección 5): consultar_agenda,
agendar_visita, agendar_presentacion_meet, programar_recontacto, calcular_canon
y finalizar_llamada.

Ninguna de las seis escribe el estado final de la llamada (columna H)
dejándolo a medias -- eso normalmente lo hace analisis.py al colgar, leyendo
la transcripción completa. Las escrituras inmediatas (agendar_visita,
agendar_presentacion_meet, programar_recontacto) son para HECHOS concretos
que no necesitan interpretación; analisis.py las respeta vía los flags de
ContextoLlamada en vez de adivinar de nuevo.

`consultar_agenda`, `agendar_visita` y `agendar_presentacion_meet` usan el
Google Calendar real (calendario.py, calendario config.GOOGLE_CALENDAR_ID)
-- reemplaza el placeholder que había antes (sheets.contar_visitas_en_fecha),
que solo veía lo que Andrea misma agendaba en la columna Q y se le escapaba
cualquier reserva puesta por fuera. Las dos herramientas de agendar escriben
en los dos lados: crean el evento en el calendario Y guardan el resultado en
el Sheet, en ese orden -- si el calendario falla, no se marca nada en el Sheet.

Visita y Meet tienen TOPES DIARIOS SEPARADOS (config.MAX_VISITAS_POR_DIA /
config.MAX_MEET_POR_DIA) -- por eso consultar_agenda recibe un parámetro
`tipo`. Ver calendario.py::hay_cupo para cómo se cuenta cada uno sin perder
la detección de reservas externas sin marcar.
"""
from dataclasses import dataclass, field
from typing import Optional

import calendario
import config
import horario
import sheets
from sheets import Lead


@dataclass
class ContextoLlamada:
    """Todo lo que una herramienta necesita saber de ESTA llamada en curso."""
    lead: Lead
    # Efectos que bridge.py / analisis.py necesitan conocer después de que
    # la llamada cuelgue. fecha_cita/hora_cita/nombre_dado sirven para
    # CUALQUIER tipo de cita agendada (visita o Meet) -- cita_agendada y
    # meet_agendado son mutuamente excluyentes en la práctica (una llamada
    # termina en una cosa o la otra) y son los que le dicen a analisis.py
    # qué estado final escribir sin tener que adivinarlo de la transcripción.
    cita_agendada: bool = False
    meet_agendado: bool = False
    link_meet: str = ""
    seguimiento_programado: bool = False
    fecha_cita: str = ""
    hora_cita: str = ""
    nombre_dado: str = ""
    debe_colgar: bool = False


TOOLS_SCHEMA = [
    {
        "type": "function",
        "name": "consultar_agenda",
        "description": (
            "Consulta si hay cupo en la fecha propuesta. Llámala SIEMPRE antes de "
            "confirmarle un día al propietario, nunca inventes disponibilidad de memoria. "
            "Usa tipo='visita' para la visita presencial al inmueble, o tipo='meet' para "
            "la presentación virtual por Meet con el director de ventas -- son cupos "
            "separados, uno no afecta al otro."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "fecha": {
                    "type": "string",
                    "description": "Fecha propuesta en formato DD-mmm-YYYY, ej: '28-jul-2026'.",
                },
                "tipo": {
                    "type": "string",
                    "enum": ["visita", "meet"],
                    "description": "'visita' (visita presencial, por defecto) o 'meet' (presentación virtual).",
                },
            },
            "required": ["fecha"],
        },
    },
    {
        "type": "function",
        "name": "agendar_visita",
        "description": (
            "Confirma y guarda la cita de visita presencial al inmueble (45 min). Úsala "
            "solo después de que el propietario acepte un día y una hora y te haya dado "
            "su nombre completo."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "fecha": {"type": "string", "description": "Fecha acordada, formato DD-mmm-YYYY."},
                "hora": {"type": "string", "description": "Hora acordada en palabras, ej: 'tres de la tarde'."},
                "nombre_completo": {"type": "string", "description": "Nombre y apellido del propietario."},
            },
            "required": ["fecha", "hora", "nombre_completo"],
        },
    },
    {
        "type": "function",
        "name": "agendar_presentacion_meet",
        "description": (
            "Confirma y guarda una reunión virtual por Google Meet con el director de "
            "ventas (Leonardo), para cuando el propietario quiere más detalle del que tú "
            "puedes dar. Úsala solo después de que acepte un día y una hora y te haya "
            "dado su nombre completo. Genera el enlace de la reunión automáticamente -- "
            "no necesitas (ni puedes) leerlo en voz alta; dile al propietario que le "
            "llega la información de la reunión."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "fecha": {"type": "string", "description": "Fecha acordada, formato DD-mmm-YYYY."},
                "hora": {"type": "string", "description": "Hora acordada en palabras, ej: 'diez de la mañana'."},
                "nombre_completo": {"type": "string", "description": "Nombre y apellido del propietario."},
            },
            "required": ["fecha", "hora", "nombre_completo"],
        },
    },
    {
        "type": "function",
        "name": "programar_recontacto",
        "description": (
            "Registra la hora EXACTA en la que el propietario aceptó que lo vuelvas a "
            "llamar (llamada de seguimiento). Úsala siempre que acuerden un día y una hora "
            "concretos para el recontacto -- nunca lo dejes solo dicho de palabra sin "
            "registrarlo con esta herramienta."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "fecha": {"type": "string", "description": "Fecha acordada, formato DD-mmm-YYYY."},
                "hora": {"type": "string", "description": "Hora acordada en palabras, ej: 'once de la mañana'."},
                "nombre_completo": {"type": "string", "description": "Nombre y apellido del propietario, para confirmar o corregir el dato que ya tenemos."},
            },
            "required": ["fecha", "hora", "nombre_completo"],
        },
    },
    {
        "type": "function",
        "name": "calcular_canon",
        "description": (
            "Calcula el canon real de arrendamiento restando la administración del "
            "valor total publicado. Úsala SIEMPRE que el propietario confirme que el "
            "valor incluye administración y te diga su monto -- nunca hagas esa resta "
            "de memoria, un error aquí significa cotizar mal la comisión."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "valor_total": {
                    "type": "number",
                    "description": "Valor total publicado del arriendo en pesos colombianos (incluye administración).",
                },
                "administracion": {
                    "type": "number",
                    "description": "Valor mensual de la administración del edificio, en pesos colombianos.",
                },
            },
            "required": ["valor_total", "administracion"],
        },
    },
    {
        "type": "function",
        "name": "finalizar_llamada",
        "description": "Marca que la conversación terminó y ya puedes colgar. Úsala siempre al final, después de tu última frase.",
        "parameters": {"type": "object", "properties": {}},
    },
]


# --- Números a palabras (español, pesos colombianos) --------------------

_UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"]
_ESPECIALES_10_19 = [
    "diez", "once", "doce", "trece", "catorce", "quince",
    "dieciséis", "diecisiete", "dieciocho", "diecinueve",
]
_DECENAS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
_CENTENAS = [
    "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
    "seiscientos", "setecientos", "ochocientos", "novecientos",
]


def _num_a_letras_0_999(n: int) -> str:
    if n == 0:
        return ""
    if n == 100:
        return "cien"
    partes = []
    centenas, resto = divmod(n, 100)
    if centenas:
        partes.append(_CENTENAS[centenas])
    if resto:
        if resto < 10:
            partes.append(_UNIDADES[resto])
        elif resto < 20:
            partes.append(_ESPECIALES_10_19[resto - 10])
        else:
            decenas, unidades = divmod(resto, 10)
            partes.append(f"{_DECENAS[decenas]} y {_UNIDADES[unidades]}" if unidades else _DECENAS[decenas])
    return " ".join(partes)


def numero_a_palabras(n: int) -> str:
    """1250000 -> 'un millón doscientos cincuenta mil'. Cubre el rango de
    precios de finca raíz colombiana con margen de sobra."""
    if n == 0:
        return "cero"
    if n < 0:
        return "menos " + numero_a_palabras(-n)

    partes = []
    miles_millones, resto = divmod(n, 1_000_000_000)
    if miles_millones:
        partes.append("mil millones" if miles_millones == 1 else f"{_num_a_letras_0_999(miles_millones)} mil millones")

    millones, resto = divmod(resto, 1_000_000)
    if millones:
        partes.append("un millón" if millones == 1 else f"{_num_a_letras_0_999(millones)} millones")

    miles, resto = divmod(resto, 1_000)
    if miles:
        partes.append("mil" if miles == 1 else f"{_num_a_letras_0_999(miles)} mil")

    if resto:
        partes.append(_num_a_letras_0_999(resto))

    return " ".join(partes)


# --- Implementaciones -----------------------------------------------------

def _consultar_agenda(args: dict, ctx: ContextoLlamada) -> dict:
    fecha = str(args.get("fecha", "")).strip()
    if not fecha:
        return {"error": "Falta la fecha a consultar."}

    tipo = str(args.get("tipo", "visita")).strip().lower()
    if tipo not in ("visita", "meet"):
        tipo = "visita"

    fecha_dt = calendario.parsear_fecha(fecha)
    if fecha_dt is None:
        return {"error": f"No pude interpretar la fecha '{fecha}'. Usa el formato DD-mmm-YYYY, ej: 28-jul-2026."}

    momento_referencia = horario.ahora_colombia().replace(
        year=fecha_dt.year, month=fecha_dt.month, day=fecha_dt.day, hour=12, minute=0
    )
    if not horario.es_dia_habil(momento_referencia):
        return {"fecha": fecha, "tipo": tipo, "disponible": False, "motivo": "No es día hábil (fin de semana o festivo)."}

    try:
        estado = calendario.hay_cupo(fecha_dt, tipo=tipo)
    except Exception as e:
        return {"error": f"No se pudo consultar el calendario: {e}"}

    return {
        "fecha": fecha,
        "tipo": tipo,
        "disponible": estado["disponible"],
        "cupos_usados": estado["usados"],
        "cupos_totales": estado["tope"],
    }


def _resolver_momento(fecha: str, hora: str) -> tuple:
    """
    Parsea fecha+hora y valida que caiga en horario de atención. Devuelve
    (momento, None) si todo bien, o (None, dict_de_error) si no -- comparte
    esta validación entre agendar_visita y agendar_presentacion_meet para
    que ambas fallen igual ante los mismos problemas.
    """
    fecha_dt = calendario.parsear_fecha(fecha)
    if fecha_dt is None:
        return None, {"exito": False, "error": f"No pude interpretar la fecha '{fecha}'. Usa el formato DD-mmm-YYYY, ej: 28-jul-2026."}

    hora_parseada = calendario.parsear_hora(hora)
    if hora_parseada is None:
        return None, {"exito": False, "error": f"No entendí la hora '{hora}'. Pídale al propietario que la repita, ej: 'tres de la tarde'."}

    hora_24, minuto = hora_parseada
    momento = horario.ahora_colombia().replace(
        year=fecha_dt.year, month=fecha_dt.month, day=fecha_dt.day, hour=hora_24, minute=minuto, second=0, microsecond=0
    )
    if not horario.es_hora_permitida(momento):
        return None, {
            "exito": False,
            "error": "Esa hora queda fuera del horario de atención (lunes a viernes, 8 a 1 de la tarde y 2:01 a 4:30 de la tarde). Proponle otra.",
        }
    return momento, None


def _agendar_visita(args: dict, ctx: ContextoLlamada) -> dict:
    fecha = str(args.get("fecha", "")).strip()
    hora = str(args.get("hora", "")).strip()
    nombre = str(args.get("nombre_completo", "")).strip()
    if not (fecha and hora and nombre):
        return {"exito": False, "error": "Falta fecha, hora o nombre completo."}

    momento, error = _resolver_momento(fecha, hora)
    if error:
        return error

    try:
        calendario.crear_evento_visita(momento, ctx.lead, nombre)
    except Exception as e:
        return {"exito": False, "error": f"No se pudo crear el evento en el calendario: {e}"}

    sheets.escribir_resultado(
        tab=ctx.lead.tab,
        fila=ctx.lead.fila,
        estado=config.ESTADO_PRE_R_CAPTACION,
        fecha_cita=fecha,
        hora_cita=hora,
    )
    ctx.cita_agendada = True
    ctx.fecha_cita = fecha
    ctx.hora_cita = hora
    ctx.nombre_dado = nombre
    return {"exito": True, "fecha": fecha, "hora": hora}


def _agendar_presentacion_meet(args: dict, ctx: ContextoLlamada) -> dict:
    fecha = str(args.get("fecha", "")).strip()
    hora = str(args.get("hora", "")).strip()
    nombre = str(args.get("nombre_completo", "")).strip()
    if not (fecha and hora and nombre):
        return {"exito": False, "error": "Falta fecha, hora o nombre completo."}

    momento, error = _resolver_momento(fecha, hora)
    if error:
        return error

    try:
        evento = calendario.crear_evento_meet(momento, ctx.lead, nombre)
    except Exception as e:
        return {"exito": False, "error": f"No se pudo crear la reunión de Meet: {e}"}

    sheets.escribir_resultado(
        tab=ctx.lead.tab,
        fila=ctx.lead.fila,
        estado=config.ESTADO_MEET_PRESENT,
        fecha_cita=fecha,
        hora_cita=hora,
    )
    ctx.meet_agendado = True
    ctx.link_meet = evento.get("hangoutLink", "")
    ctx.fecha_cita = fecha
    ctx.hora_cita = hora
    ctx.nombre_dado = nombre
    return {"exito": True, "fecha": fecha, "hora": hora}


def _programar_recontacto(args: dict, ctx: ContextoLlamada) -> dict:
    """
    A diferencia de agendar_visita/agendar_presentacion_meet, esto NO toca
    el calendario -- es una llamada de vuelta, no un compromiso en la
    agenda de Leonardo. Solo deja la promesa registrada en el Sheet
    (estado SEGUIMIENTO + columnas Q/R) para que cola.py pueda priorizarla
    cuando se acerque la hora.
    """
    fecha = str(args.get("fecha", "")).strip()
    hora = str(args.get("hora", "")).strip()
    nombre = str(args.get("nombre_completo", "")).strip()
    if not (fecha and hora and nombre):
        return {"exito": False, "error": "Falta fecha, hora o nombre completo."}

    momento, error = _resolver_momento(fecha, hora)
    if error:
        return error

    sheets.escribir_resultado(
        tab=ctx.lead.tab,
        fila=ctx.lead.fila,
        estado=config.ESTADO_SEGUIMIENTO,
        fecha_cita=fecha,
        hora_cita=hora,
    )
    ctx.seguimiento_programado = True
    ctx.fecha_cita = fecha
    ctx.hora_cita = hora
    ctx.nombre_dado = nombre
    return {"exito": True, "fecha": fecha, "hora": hora}


def _calcular_canon(args: dict, ctx: ContextoLlamada) -> dict:
    try:
        valor_total = float(args.get("valor_total", 0))
        administracion = float(args.get("administracion", 0))
    except (TypeError, ValueError):
        return {"error": "valor_total y administracion deben ser números."}

    canon = round(valor_total - administracion)
    if canon < 0:
        return {"error": "La administración no puede ser mayor que el valor total. Verifica los montos con el propietario."}

    return {
        "canon": canon,
        "canon_en_palabras": f"{numero_a_palabras(canon)} pesos",
    }


def _finalizar_llamada(args: dict, ctx: ContextoLlamada) -> dict:
    ctx.debe_colgar = True
    return {"ok": True}


_DISPATCH = {
    "consultar_agenda": _consultar_agenda,
    "agendar_visita": _agendar_visita,
    "agendar_presentacion_meet": _agendar_presentacion_meet,
    "programar_recontacto": _programar_recontacto,
    "calcular_canon": _calcular_canon,
    "finalizar_llamada": _finalizar_llamada,
}


def ejecutar_herramienta(nombre: str, argumentos: dict, ctx: ContextoLlamada) -> dict:
    fn = _DISPATCH.get(nombre)
    if fn is None:
        return {"error": f"Herramienta desconocida: {nombre}"}
    try:
        return fn(argumentos, ctx)
    except Exception as e:
        return {"error": f"Fallo interno ejecutando {nombre}: {e}"}
