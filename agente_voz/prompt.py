"""
Arma las 'instructions' que se le mandan a OpenAI Realtime en cada llamada:
el bloque estable (el guion, agente_voz_guion.md sección 3) más el bloque
variable con los datos de ESTE lead (sección 4).

El bloque estable NUNCA vive escrito en este archivo -- llega por
ANDREA_PROMPT desde Secret Manager (ver config.py y sección 2.1 de
agente_voz_implementacion.md). Este .py sí va al repo público; el guion no.
"""
from datetime import datetime

import config
from sheets import Lead

DIAS_ES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES_ES = [
    "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def fecha_hora_en_espanol(momento: datetime) -> str:
    """'viernes 25 de julio de 2026, 10:15 de la mañana' -- igual al ejemplo
    del guion, sección 4."""
    dia = DIAS_ES[momento.weekday()]
    mes = MESES_ES[momento.month]
    periodo = "de la mañana" if momento.hour < 12 else "de la tarde"
    hora_12 = momento.hour if 1 <= momento.hour <= 12 else abs(momento.hour - 12) or 12
    return f"{dia} {momento.day} de {mes} de {momento.year}, {hora_12:02d}:{momento.minute:02d} {periodo}"


def obtener_prompt_estable() -> str:
    if not config.ANDREA_PROMPT:
        raise RuntimeError(
            "ANDREA_PROMPT vacío. En local, exporta la variable con el contenido de "
            "'Robot Captador Fincaraiz/prompt_andrea.txt'. En Cloud Run debe llegar "
            "vía --set-secrets desde el secreto 'andrea-prompt'."
        )
    return config.ANDREA_PROMPT


def construir_bloque_variable(lead: Lead, ahora) -> str:
    """
    Regla del guion (sección 4): si un campo está vacío, se OMITE la línea
    completa -- nunca se manda 'Nombre del propietario: ', porque el modelo
    puede terminar diciéndolo en voz alta.

    Es SEGUIMIENTO (no llamada en frío) solo si el estado ya es SEGUIMIENTO
    Y hay una hora prometida concreta (columnas Q/R, escritas por la
    herramienta programar_recontacto) -- un SEGUIMIENTO sin hora prometida
    ("necesita pensarlo") no entra en la cola automática, así que esta
    rama nunca debería activarse para ese caso, pero se valida igual por
    si acaso.
    """
    tipo_negocio = "VENTA" if lead.es_venta else "ARRIENDO"
    es_seguimiento = (
        lead.estado_actual == config.ESTADO_SEGUIMIENTO
        and bool(lead.fecha_seguimiento) and bool(lead.hora_seguimiento)
    )

    lineas = []
    if es_seguimiento:
        lineas.append(
            "- ESTA ES UNA LLAMADA DE SEGUIMIENTO: ya hablaste con este propietario antes y "
            "quedaron en que lo llamarías justo ahora. Sigue la REGLA DE LLAMADA DE SEGUIMIENTO."
        )
    lineas.append(f"- Tipo de negocio: {tipo_negocio}")
    if lead.tipo_inmueble:
        lineas.append(f"- Tipo de inmueble: {lead.tipo_inmueble}")
    if lead.ubicacion:
        lineas.append(f"- Ubicación: {lead.ubicacion}")
    if lead.habitaciones:
        lineas.append(f"- Habitaciones: {lead.habitaciones}")
    if lead.valor_promocion:
        lineas.append(f"- Valor publicado: {lead.valor_promocion}")
    if lead.nombre_propietario:
        lineas.append(f"- Nombre del propietario: {lead.nombre_propietario}")
    lineas.append(f"- Fecha y hora actual en Colombia: {fecha_hora_en_espanol(ahora)}")

    bloque = "DATOS DEL INMUEBLE Y DEL PROPIETARIO:\n" + "\n".join(lineas)
    if es_seguimiento:
        bloque += "\n\nLa llamada acaba de ser contestada. Saluda según la REGLA DE LLAMADA DE SEGUIMIENTO, NO la FASE 1."
    else:
        bloque += "\n\nLa llamada acaba de ser contestada. Saluda según la FASE 1."
    return bloque


def construir_instructions(lead: Lead, ahora) -> str:
    return obtener_prompt_estable() + "\n\n" + construir_bloque_variable(lead, ahora)
