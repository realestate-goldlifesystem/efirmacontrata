"""
El segundo modelo (agente_voz_guion.md sección 7): al colgar, lee la
transcripción completa y decide el estado (columna H) y el resumen
(columna N). No corre contra reloj -- nadie está esperando al teléfono --
así que puede tomarse su tiempo y pensar mejor que el modelo de la llamada.

Usa OpenAI (config.ANALISIS_MODEL, por defecto gpt-4o-mini) porque esa
llave ya está configurada en el proyecto. El guion original sugería
Sonnet 5 o Gemini Pro -- si más adelante se agrega esa llave, esta es la
ÚNICA función que habría que tocar para cambiar de proveedor.
"""
import json

import httpx

import config
from herramientas import ContextoLlamada

_DESCRIPCION_ESTADOS = """
- PRE-R CAPTACION: agendó una visita al inmueble.
- SEGUIMIENTO: le interesa pero necesita pensarlo o consultarlo con alguien.
- NO: no le interesó, ya no está disponible, pidió explícitamente no ser
  contactado de nuevo, o (en venta) el inmueble tiene un embargo judicial.
- INMOBILIARIA: quien contestó es una inmobiliaria o no es el dueño del inmueble.
- MEET PRESENT: aceptó agendar una presentación virtual por Meet con el director de ventas.
""".strip()


async def analizar_llamada(transcripcion: str, ctx: ContextoLlamada) -> dict:
    """
    Devuelve {"estado": ..., "resumen": ...}.

    Si ya se agendó una cita durante la llamada (ctx.cita_agendada o
    ctx.meet_agendado), el estado se fija directamente -- es un hecho, no
    algo que este modelo deba adivinar leyendo la transcripción.
    """
    if not transcripcion.strip():
        return {
            "estado": config.ESTADO_ERROR_TECNICO,
            "resumen": "La llamada no generó transcripción (posible falla técnica o corte inmediato).",
        }

    resumen = await _generar_resumen(transcripcion)

    if ctx.cita_agendada:
        return {"estado": config.ESTADO_PRE_R_CAPTACION, "resumen": resumen}

    if ctx.meet_agendado:
        if ctx.link_meet:
            resumen = f"{resumen} Enlace de Meet: {ctx.link_meet}"
        return {"estado": config.ESTADO_MEET_PRESENT, "resumen": resumen}

    if ctx.seguimiento_programado:
        return {"estado": config.ESTADO_SEGUIMIENTO, "resumen": resumen}

    estado = await _clasificar_estado(transcripcion)
    return {"estado": estado, "resumen": resumen}


async def _pedir_json(prompt_usuario: str, prompt_sistema: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": config.ANALISIS_MODEL,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": prompt_sistema},
                    {"role": "user", "content": prompt_usuario},
                ],
            },
        )
        resp.raise_for_status()
        data = resp.json()
        contenido = data["choices"][0]["message"]["content"]
        return json.loads(contenido)


async def _clasificar_estado(transcripcion: str) -> str:
    sistema = (
        "Clasificas llamadas de captación inmobiliaria en Colombia. Lee la "
        "transcripción y elige EXACTAMENTE uno de estos estados:\n\n"
        f"{_DESCRIPCION_ESTADOS}\n\n"
        'Responde solo JSON: {"estado": "<uno de los valores exactos de arriba>"}'
    )
    try:
        resultado = await _pedir_json(transcripcion, sistema)
        estado = str(resultado.get("estado", "")).strip()
        if estado in config.ESTADOS_VALIDOS_ANALISIS:
            return estado
    except Exception as e:
        print(f"[WARN] Falló la clasificación de estado: {e}")
    # Si el modelo devuelve algo raro o falla la llamada, mejor dejar la
    # fila para revisión manual que adivinar un estado de negocio.
    return config.ESTADO_SEGUIMIENTO


async def _generar_resumen(transcripcion: str) -> str:
    sistema = (
        "Resume en una o dos frases, en español, qué dijo el propietario en "
        "esta llamada de captación inmobiliaria. Sé concreto: qué le "
        'interesó, qué objeción puso, o por qué dijo que no. Responde solo '
        'JSON: {"resumen": "..."}'
    )
    try:
        resultado = await _pedir_json(transcripcion, sistema)
        resumen = str(resultado.get("resumen", "")).strip()
        if resumen:
            return resumen
    except Exception as e:
        print(f"[WARN] Falló la generación de resumen: {e}")
    return "No se pudo generar el resumen automático; revisar la grabación."
