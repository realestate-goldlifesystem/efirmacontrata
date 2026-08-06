"""
Ventana de horario permitido para llamar.

Lunes a viernes, 8:00-13:00 y 14:01-16:30 hora Colombia. Sin sábados,
domingos ni festivos (agente_voz_guion.md sección 6).
"""
from datetime import datetime, timezone, timedelta
import holidays

import config

# Colombia es UTC-5 todo el año (no tiene horario de verano), igual que en
# sheets_handler.py: un desfase fijo es exacto y no depende de que el
# sistema tenga la base de datos de zonas horarias instalada.
TZ_COLOMBIA = timezone(timedelta(hours=-5))

_festivos_co = holidays.Colombia()


def ahora_colombia() -> datetime:
    """Hora actual en Colombia. Nunca uses datetime.now() a secas: Cloud Run
    corre en UTC, y sin esto el 'día nuevo' empezaría a las 7pm hora Colombia."""
    return datetime.now(TZ_COLOMBIA)


def es_dia_habil(momento: datetime) -> bool:
    """Lunes=0 ... domingo=6. Excluye sábado, domingo y festivos colombianos."""
    if momento.weekday() >= 5:  # sábado o domingo
        return False
    if momento.date() in _festivos_co:
        return False
    return True


def _en_ventana(hora: int, minuto: int, inicio: tuple, fin: tuple) -> bool:
    actual = (hora, minuto)
    return inicio <= actual <= fin


def es_hora_permitida(momento: datetime | None = None) -> bool:
    """
    True si en este momento se puede disparar una llamada saliente.

    Dos ventanas: 08:00-13:00 y 14:01-16:30. Nada entre las 13:00 y las
    14:01 (almuerzo). Solo días hábiles.
    """
    if momento is None:
        momento = ahora_colombia()

    if not es_dia_habil(momento):
        return False

    hora, minuto = momento.hour, momento.minute

    en_manana = _en_ventana(hora, minuto, config.HORARIO_MANANA_INICIO, config.HORARIO_MANANA_FIN)
    en_tarde = _en_ventana(hora, minuto, config.HORARIO_TARDE_INICIO, config.HORARIO_TARDE_FIN)

    return en_manana or en_tarde


def proxima_ventana_habil(momento: datetime | None = None) -> datetime:
    """Para mensajes de diagnóstico: cuándo vuelve a abrir la ventana de llamadas."""
    if momento is None:
        momento = ahora_colombia()

    candidato = momento
    for _ in range(14):  # tope de 2 semanas, por si acaso
        if es_dia_habil(candidato):
            hora, minuto = candidato.hour, candidato.minute
            ini_m = config.HORARIO_MANANA_INICIO
            ini_t = config.HORARIO_TARDE_INICIO
            fin_t = config.HORARIO_TARDE_FIN
            if (hora, minuto) < ini_m:
                return candidato.replace(hour=ini_m[0], minute=ini_m[1], second=0, microsecond=0)
            if config.HORARIO_MANANA_FIN < (hora, minuto) < ini_t:
                return candidato.replace(hour=ini_t[0], minute=ini_t[1], second=0, microsecond=0)
            if (hora, minuto) <= fin_t and (hora, minuto) >= ini_m:
                return candidato  # ya estamos en ventana
        # siguiente día a las 8:00
        candidato = (candidato + timedelta(days=1)).replace(
            hour=config.HORARIO_MANANA_INICIO[0], minute=config.HORARIO_MANANA_INICIO[1],
            second=0, microsecond=0,
        )
    return candidato
