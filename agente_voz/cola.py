"""
Decide cuál es el SIGUIENTE lead a llamar dentro de una tanda -- no es solo
recorrer la lista del Sheet en orden, porque un SEGUIMIENTO con hora de
recontacto prometida (columnas Q/R, escritas por la herramienta
programar_recontacto en herramientas.py) tiene que "ganarle el puesto" a
los leads en frío justo cuando su hora prometida está por llegar.

Decisión de Leonardo (27-jul-2026): un lead en frío se sigue llamando
mientras haya tiempo de sobra antes de la próxima hora prometida. En
cuanto falta poco (config.MINUTOS_ANTICIPACION_SEGUIMIENTO, calibrado
sobre que una llamada dura entre 2 y 10 minutos), ese seguimiento pasa a
ser el siguiente en la fila -- así Andrea "cierra la hora" de verdad: ni
llama antes de lo prometido, ni deja al propietario esperando de más.

main.py debe llamar a elegir_siguiente() de nuevo ANTES DE CADA marcación,
no una sola vez al principio de la tanda -- el reloj avanza mientras las
llamadas anteriores están en curso, así que la urgencia relativa cambia.
"""
from datetime import datetime
from typing import Optional

import calendario
import config
import horario
from sheets import Lead


def _momento_prometido(lead: Lead, ahora: datetime) -> Optional[datetime]:
    """None si este lead no tiene una hora de recontacto prometida (leads
    en frío / reintentos ciegos por no contestar) -- esos se tratan todos
    igual, sin urgencia de horario."""
    if not (lead.fecha_seguimiento and lead.hora_seguimiento):
        return None
    fecha_dt = calendario.parsear_fecha(lead.fecha_seguimiento)
    hora_parseada = calendario.parsear_hora(lead.hora_seguimiento)
    if fecha_dt is None or hora_parseada is None:
        return None
    hora_24, minuto = hora_parseada
    return ahora.replace(
        year=fecha_dt.year, month=fecha_dt.month, day=fecha_dt.day,
        hour=hora_24, minute=minuto, second=0, microsecond=0,
    )


def elegir_siguiente(leads: list[Lead], ahora: Optional[datetime] = None) -> Optional[Lead]:
    """
    Recibe el pool completo de leads llamables (sheets.obtener_leads_llamables)
    y devuelve cuál llamar ahora mismo, o None si el pool está vacío.
    """
    if not leads:
        return None
    if ahora is None:
        ahora = horario.ahora_colombia()

    candidatos = [(lead, _momento_prometido(lead, ahora)) for lead in leads]

    urgentes = [
        (lead, momento) for lead, momento in candidatos
        if momento is not None
        and (momento - ahora).total_seconds() / 60 <= config.MINUTOS_ANTICIPACION_SEGUIMIENTO
    ]
    if urgentes:
        # El más próximo a su hora (o el más atrasado, si ya se pasó) primero.
        return min(urgentes, key=lambda par: par[1])[0]

    en_frio = [lead for lead, momento in candidatos if momento is None]
    if en_frio:
        return en_frio[0]

    # Solo quedan seguimientos cuya hora prometida todavía no se acerca --
    # se llama al más próximo en vez de dejar la tanda sin hacer nada.
    return min(candidatos, key=lambda par: par[1])[0]
