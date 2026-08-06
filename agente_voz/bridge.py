"""
El corazón del servicio: puentea el audio entre Telnyx y OpenAI Realtime.

No transforma el audio -- ambos lados hablan PCMU (G.711 mu-law) a 8kHz, así
que solo se reenvían los mismos bytes en base64 de un socket al otro. Eso es
lo que mantiene la latencia en 250-350ms (ver agente_voz_implementacion.md,
"¿Por qué no dejar que Telnyx hable directo con OpenAI?").

Este módulo es dueño del ciclo de vida completo de UNA llamada: desde que
Telnyx conecta el WebSocket de audio, hasta que cuelga, corre el análisis
post-llamada y escribe el resultado en el Sheet.
"""
import asyncio
import base64
import json
import time

import websockets
from fastapi import WebSocket, WebSocketDisconnect

import analisis
import config
import horario
import prompt
import sheets
import telnyx_client
from herramientas import ContextoLlamada, TOOLS_SCHEMA, ejecutar_herramienta

# Bytes por milisegundo de audio PCMU a 8kHz (1 byte/muestra, mu-law).
BYTES_POR_MS = config.AUDIO_SAMPLE_RATE // 1000  # 8


class _EstadoLlamada:
    """Todo lo mutable de una llamada en curso, compartido entre el lado
    Telnyx y el lado OpenAI del puente."""

    def __init__(self, ctx: ContextoLlamada):
        self.ctx = ctx
        self.openai_listo = False
        self.saludo_enviado = False
        self.item_id_actual = None
        self.bytes_enviados_item_actual = 0
        self.hablando = False  # True mientras Andrea está emitiendo audio
        self.transcript_lineas: list[str] = []
        self.buffer_asistente_actual = ""
        self.telnyx_stream_id = None
        self.cerrado = False


async def manejar_stream(ws_telnyx: WebSocket, call_id: str, registro: dict):
    """
    Punto de entrada desde main.py. `registro` es el diccionario compartido
    call_id -> info de la llamada (lead, call_control_id, resuelto).
    """
    info_llamada = registro.get(call_id)
    if info_llamada is None:
        print(f"[bridge] call_id desconocido: {call_id}")
        await ws_telnyx.close(code=1008)
        return

    lead = info_llamada["lead"]
    ctx = ContextoLlamada(lead=lead)
    estado = _EstadoLlamada(ctx)

    instructions = prompt.construir_instructions(lead, horario.ahora_colombia())

    ws_openai = None
    try:
        ws_openai = await websockets.connect(
            config.REALTIME_WS_URL,
            additional_headers={
                "Authorization": f"Bearer {config.OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1",
            },
            max_size=None,
        )

        await ws_openai.send(json.dumps({
            "type": "session.update",
            "session": {
                "type": "realtime",
                "instructions": instructions,
                "output_modalities": ["audio"],
                "audio": {
                    "input": {
                        "format": {"type": config.AUDIO_FORMAT},
                        "turn_detection": {"type": "server_vad"},
                        "transcription": {"model": "gpt-realtime-whisper", "language": "es"},
                    },
                    "output": {
                        "format": {"type": config.AUDIO_FORMAT},
                        "voice": config.REALTIME_VOICE,
                    },
                },
                "tools": TOOLS_SCHEMA,
                "tool_choice": "auto",
            },
        }))

        tarea_telnyx = asyncio.create_task(_desde_telnyx(ws_telnyx, ws_openai, estado))
        tarea_openai = asyncio.create_task(_desde_openai(ws_openai, ws_telnyx, estado, registro, call_id))

        done, pending = await asyncio.wait(
            {tarea_telnyx, tarea_openai}, return_when=asyncio.FIRST_COMPLETED
        )
        for t in pending:
            t.cancel()

    except Exception as e:
        print(f"[bridge] Error en la llamada {call_id}: {e}")
    finally:
        if ws_openai is not None:
            try:
                await ws_openai.close()
            except Exception:
                pass
        await _cerrar_y_analizar(estado, registro, call_id)


async def _desde_telnyx(ws_telnyx: WebSocket, ws_openai, estado: _EstadoLlamada):
    """Lee eventos de Telnyx: audio del propietario -> OpenAI, y las
    señales de inicio/fin de la llamada."""
    try:
        while True:
            mensaje = await ws_telnyx.receive_text()
            data = json.loads(mensaje)
            evento = data.get("event")

            if evento == "start":
                estado.telnyx_stream_id = data.get("start", {}).get("streamId")

            elif evento == "media":
                payload = data.get("media", {}).get("payload")
                if payload and estado.openai_listo:
                    await ws_openai.send(json.dumps({
                        "type": "input_audio_buffer.append",
                        "audio": payload,
                    }))

            elif evento == "stop":
                print("[bridge] Telnyx envió 'stop', terminando la llamada.")
                return

            elif evento == "error":
                print(f"[bridge] Error de Telnyx: {data}")

    except WebSocketDisconnect:
        print("[bridge] Telnyx cerró el WebSocket.")
    except Exception as e:
        print(f"[bridge] _desde_telnyx terminó por: {e}")


async def _desde_openai(ws_openai, ws_telnyx: WebSocket, estado: _EstadoLlamada, registro: dict, call_id: str):
    """Lee eventos de OpenAI Realtime: audio y transcripción de Andrea hacia
    Telnyx, transcripción del propietario hacia el registro, llamadas a
    herramientas, e interrupciones (barge-in)."""
    try:
        async for mensaje in ws_openai:
            data = json.loads(mensaje)
            tipo = data.get("type")

            if tipo == "session.updated":
                estado.openai_listo = True
                if not estado.saludo_enviado:
                    estado.saludo_enviado = True
                    await ws_openai.send(json.dumps({"type": "response.create"}))

            elif tipo == "response.output_audio.delta":
                item_id = data.get("item_id")
                if item_id != estado.item_id_actual:
                    estado.item_id_actual = item_id
                    estado.bytes_enviados_item_actual = 0
                delta = data.get("delta", "")
                crudo = base64.b64decode(delta) if delta else b""
                estado.bytes_enviados_item_actual += len(crudo)
                estado.hablando = True
                await ws_telnyx.send_json({"event": "media", "media": {"payload": delta}})

            elif tipo == "response.output_audio_transcript.delta":
                estado.buffer_asistente_actual += data.get("delta", "")

            elif tipo == "response.output_item.done":
                if estado.buffer_asistente_actual.strip():
                    estado.transcript_lineas.append(f"Andrea: {estado.buffer_asistente_actual.strip()}")
                estado.buffer_asistente_actual = ""
                estado.hablando = False

            elif tipo == "conversation.item.input_audio_transcription.completed":
                texto = data.get("transcript", "").strip()
                if texto:
                    estado.transcript_lineas.append(f"Propietario: {texto}")

            elif tipo == "input_audio_buffer.speech_started":
                # Barge-in: el propietario empezó a hablar. Si Andrea seguía
                # sonando, hay que cortarla ya -- sin esto, sigue hablando
                # encima de la persona y el modelo queda "pensando" que dijo
                # algo que la persona nunca oyó.
                if estado.hablando and estado.item_id_actual:
                    audio_end_ms = estado.bytes_enviados_item_actual // BYTES_POR_MS
                    try:
                        await ws_openai.send(json.dumps({"type": "response.cancel"}))
                        await ws_openai.send(json.dumps({
                            "type": "conversation.item.truncate",
                            "item_id": estado.item_id_actual,
                            "content_index": 0,
                            "audio_end_ms": audio_end_ms,
                        }))
                    except Exception as e:
                        print(f"[bridge] No se pudo truncar por interrupción: {e}")
                    estado.hablando = False
                # Telnyx no necesita que le digamos que pare de reproducir:
                # send_silence_when_idle + el hecho de que dejamos de
                # mandarle nuevos 'media' hace que dependa de su propio buffer,
                # que ya venía sonando; el corte real ocurre porque OpenAI
                # deja de emitir más deltas para ese item una vez truncado.

            elif tipo == "response.done":
                respuesta = data.get("response", {})
                for item in respuesta.get("output", []):
                    if item.get("type") != "function_call":
                        continue
                    nombre = item.get("name", "")
                    call_tool_id = item.get("call_id", "")
                    try:
                        argumentos = json.loads(item.get("arguments", "{}"))
                    except json.JSONDecodeError:
                        argumentos = {}

                    resultado = ejecutar_herramienta(nombre, argumentos, estado.ctx)
                    print(f"[bridge] Herramienta {nombre}({argumentos}) -> {resultado}")

                    await ws_openai.send(json.dumps({
                        "type": "conversation.item.create",
                        "item": {
                            "type": "function_call_output",
                            "call_id": call_tool_id,
                            "output": json.dumps(resultado, ensure_ascii=False),
                        },
                    }))
                    await ws_openai.send(json.dumps({"type": "response.create"}))

                if estado.ctx.debe_colgar:
                    # Le damos un respiro para que termine de decir la
                    # despedida antes de colgar la llamada de verdad.
                    await asyncio.sleep(2)
                    call_control_id = registro.get(call_id, {}).get("call_control_id")
                    if call_control_id:
                        try:
                            await telnyx_client.colgar_llamada(call_control_id)
                        except Exception as e:
                            print(f"[bridge] No se pudo colgar via Call Control: {e}")
                    return

            elif tipo == "error":
                print(f"[bridge] Error de OpenAI Realtime: {data}")

    except Exception as e:
        print(f"[bridge] _desde_openai terminó por: {e}")


async def _cerrar_y_analizar(estado: _EstadoLlamada, registro: dict, call_id: str):
    """Se ejecuta siempre al terminar la llamada (cuelgue normal, error, o
    finalizar_llamada). Corre el análisis post-llamada y escribe el
    resultado en el Sheet -- una sola vez por llamada."""
    info = registro.get(call_id)
    if info is None or info.get("resuelto"):
        return
    info["resuelto"] = True
    # Despierta a iniciar_campana (main.py) si está esperando a que ESTA
    # llamada termine para decidir la siguiente -- no se importa la función
    # equivalente de main.py para evitar un import circular (main ya
    # importa bridge).
    evento = info.get("evento_resuelto")
    if evento is not None:
        evento.set()

    if estado.buffer_asistente_actual.strip():
        estado.transcript_lineas.append(f"Andrea: {estado.buffer_asistente_actual.strip()}")

    transcripcion = "\n".join(estado.transcript_lineas)
    ctx = estado.ctx

    try:
        resultado = await analisis.analizar_llamada(transcripcion, ctx)
    except Exception as e:
        print(f"[bridge] Falló el análisis post-llamada: {e}")
        resultado = {"estado": config.ESTADO_ERROR_TECNICO, "resumen": f"Análisis falló: {e}"}

    try:
        # Si ya se agendó, agendar_visita ya escribió Q/R; aquí solo falta
        # confirmar H y N con lo que decidió el análisis.
        sheets.escribir_resultado(
            tab=ctx.lead.tab,
            fila=ctx.lead.fila,
            estado=resultado["estado"],
            resumen=resultado["resumen"],
        )
        print(f"[bridge] Llamada {call_id} resuelta: {resultado['estado']}")
    except Exception as e:
        print(f"[bridge] No se pudo escribir el resultado en el Sheet: {e}")
