"""
Dispara la llamada saliente por la Call Control API de Telnyx.

Parámetros verificados contra la guía oficial de Telnyx para streaming
bidireccional con OpenAI Realtime (agente_voz_implementacion.md, sección
"Parámetros exactos de la llamada saliente").
"""
import httpx

import config


def _stream_url(call_id: str) -> str:
    """wss://.../media-stream/{call_id} -- el call_id en la ruta es lo que le
    permite a bridge.py saber a qué lead pertenece esta conexión de audio."""
    base = config.PUBLIC_BASE_URL.rstrip("/")
    wss_base = base.replace("https://", "wss://").replace("http://", "ws://")
    return f"{wss_base}/media-stream/{call_id}"


async def iniciar_llamada(numero_destino: str, call_id: str) -> dict:
    """
    POST /v2/calls. numero_destino en formato E.164 (+57XXXXXXXXXX).

    - stream_bidirectional_*: permite mandar audio de vuelta a la llamada,
      no solo recibirlo (necesario para que Andrea hable).
    - PCMU/8000 en ambos lados: mismo códec que OpenAI Realtime acepta
      nativo, sin transcodificar (ver arquitectura en el plan).
    - answering_machine_detection: detecta buzón de voz -> bridge.py cuelga
      sin dejar mensaje y marca VOLVER A LLAMAR.
    - timeout_secs: si no contestan en 30s, Telnyx cuelga solo.
    """
    payload = {
        "connection_id": config.TELNYX_CONNECTION_ID,
        "to": numero_destino,
        "from": config.TELNYX_FROM_NUMBER,
        "stream_url": _stream_url(call_id),
        "stream_track": "inbound_track",
        "stream_codec": "PCMU",
        "stream_bidirectional_mode": "rtp",
        "stream_bidirectional_codec": "PCMU",
        "stream_bidirectional_sampling_rate": config.AUDIO_SAMPLE_RATE,
        "send_silence_when_idle": True,
        "answering_machine_detection": "premium",
        "timeout_secs": 30,
        "webhook_url": f"{config.PUBLIC_BASE_URL.rstrip('/')}/webhooks/telnyx",
        "client_state": _b64(call_id),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{config.TELNYX_API_BASE}/calls",
            headers={"Authorization": f"Bearer {config.TELNYX_API_KEY}", "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def colgar_llamada(call_control_id: str):
    """POST /v2/calls/{id}/actions/hangup -- usado cuando se detecta buzón
    de voz, para no dejar a Andrea hablándole a un contestador."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{config.TELNYX_API_BASE}/calls/{call_control_id}/actions/hangup",
            headers={"Authorization": f"Bearer {config.TELNYX_API_KEY}"},
        )
        resp.raise_for_status()


def _b64(texto: str) -> str:
    import base64
    return base64.b64encode(texto.encode("utf-8")).decode("ascii")


def decodificar_client_state(client_state: str) -> str:
    """Telnyx devuelve client_state tal cual en cada webhook -- es la forma
    de recuperar el call_id (nuestro, no el de Telnyx) sin depender de que
    el stream de audio ya haya arrancado."""
    import base64
    try:
        return base64.b64decode(client_state).decode("utf-8")
    except Exception:
        return ""
