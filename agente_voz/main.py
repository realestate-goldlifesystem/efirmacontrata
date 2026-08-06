"""
FastAPI: el punto de entrada del servicio.

- GET  /health               -> confirma que el servicio está vivo
- POST /campana/iniciar      -> dispara una tanda de llamadas
- POST /webhooks/telnyx      -> eventos de control de llamada de Telnyx
- WS   /media-stream/{id}    -> el audio en vivo de UNA llamada (bridge.py)

El "registro" en memoria (dict) es intencionalmente simple: vive mientras
el contenedor de Cloud Run esté corriendo. Con concurrencia baja (1-3
llamadas, ver config.MAX_LLAMADAS_CONCURRENTES) no hace falta una base de
datos externa para esto -- cada llamada dura minutos, no hace falta que
sobreviva un reinicio del contenedor.
"""
import asyncio
import uuid

from fastapi import FastAPI, HTTPException, Request, WebSocket
from pydantic import BaseModel

import bridge
import cola
import config
import horario
import sheets
import telnyx_client

app = FastAPI(title="Agente de Voz Andrea")

# call_id (nuestro) -> {"lead": Lead, "call_control_id": str|None, "resuelto":
# bool, "evento_resuelto": asyncio.Event}. evento_resuelto es lo que hace que
# iniciar_campana espere a que UNA llamada termine antes de marcar la
# siguiente -- necesario para que cola.py pueda decidir bien el orden (ver
# _marcar_resuelto). config.MAX_LLAMADAS_CONCURRENTES sigue siendo 1 hoy: si
# más adelante hiciera falta marcar de a varias a la vez, esto tendría que
# rediseñarse con varios workers leyendo del mismo pool -- no está construido,
# a propósito, porque nadie lo ha pedido todavía.
REGISTRO: dict[str, dict] = {}


def _marcar_resuelto(info: dict) -> None:
    """Único lugar que cierra una llamada: pone resuelto=True Y despierta a
    quien esté esperando en iniciar_campana."""
    info["resuelto"] = True
    evento = info.get("evento_resuelto")
    if evento is not None:
        evento.set()


@app.get("/health")
async def health():
    return {"status": "ok"}


class IniciarCampanaBody(BaseModel):
    tab: str  # "venta" o "arriendo"
    limite: int = 10
    forzar_horario: bool = False  # solo para pruebas manuales


@app.post("/campana/iniciar")
async def iniciar_campana(body: IniciarCampanaBody):
    if body.tab not in ("venta", "arriendo"):
        raise HTTPException(400, "tab debe ser 'venta' o 'arriendo'")

    if not body.forzar_horario and not horario.es_hora_permitida():
        proxima = horario.proxima_ventana_habil()
        raise HTTPException(
            409,
            f"Fuera de horario permitido. Próxima ventana: {proxima.strftime('%Y-%m-%d %H:%M')} (hora Colombia).",
        )

    limite = min(body.limite, config.MAX_LLAMADAS_POR_TANDA)
    tab_nombre = config.SHEET_VENTA if body.tab == "venta" else config.SHEET_ARRIENDO

    # Pool completo (no solo `limite`), para que cola.elegir_siguiente pueda
    # ver TODAS las promesas de recontacto de hoy, no solo las primeras N
    # filas del Sheet -- limite sigue siendo el tope de cuántas llamadas se
    # hacen en esta tanda, ver más abajo.
    pool = sheets.obtener_leads_llamables(tab_nombre, config.POOL_LEADS_MAXIMO)
    if not pool:
        return {"disparadas": 0, "detalle": "No hay leads llamables (NUEVO, reintento, o seguimiento con hora prometida)."}

    call_ids = []
    while pool and len(call_ids) < limite:
        ahora = horario.ahora_colombia()
        lead = cola.elegir_siguiente(pool, ahora)
        if lead is None:
            break
        pool = [l for l in pool if not (l.fila == lead.fila and l.tab == lead.tab)]

        call_id = str(uuid.uuid4())
        evento_resuelto = asyncio.Event()
        REGISTRO[call_id] = {
            "lead": lead, "call_control_id": None,
            "resuelto": False, "evento_resuelto": evento_resuelto,
        }

        numero_e164 = f"+57{lead.celular}"

        # LLAMANDO es solo informativo -- si falla, no debe bloquear la
        # llamada real. Confirmado con Leonardo (27-jul-2026): así se ve
        # en el Sheet, en vivo, cuál fila se está marcando en este momento.
        try:
            sheets.escribir_resultado(tab=lead.tab, fila=lead.fila, estado=config.ESTADO_LLAMANDO)
        except Exception as e:
            print(f"[main] No se pudo marcar LLAMANDO para {numero_e164}: {e}")

        try:
            respuesta = await telnyx_client.iniciar_llamada(numero_e164, call_id)
            REGISTRO[call_id]["call_control_id"] = respuesta.get("data", {}).get("call_control_id")
            call_ids.append(call_id)
        except Exception as e:
            print(f"[main] No se pudo iniciar la llamada a {numero_e164}: {e}")
            _marcar_resuelto(REGISTRO[call_id])
            try:
                sheets.escribir_resultado(
                    tab=lead.tab, fila=lead.fila,
                    estado=config.ESTADO_ERROR_TECNICO,
                    resumen=f"No se pudo iniciar la llamada: {e}",
                )
            except Exception:
                pass
            continue

        # Espera a que ESTA llamada termine antes de decidir la siguiente --
        # es lo que hace que cola.py sirva de algo: si se dispararan todas
        # de una, no habría forma de "esperar" a que se acerque la hora
        # prometida de un seguimiento. El timeout es solo una red de
        # seguridad por si un webhook nunca llega.
        try:
            await asyncio.wait_for(evento_resuelto.wait(), timeout=config.TIMEOUT_LLAMADA_SEGUNDOS)
        except asyncio.TimeoutError:
            print(f"[main] Llamada {call_id} no resolvió en {config.TIMEOUT_LLAMADA_SEGUNDOS}s, se sigue de todas formas.")

    return {"disparadas": len(call_ids), "call_ids": call_ids}


_CAUSAS_NUMERO_INVALIDO = {"unallocated_number", "invalid_number", "no_route_destination"}
_CAUSAS_VOLVER_A_LLAMAR = {
    "user_busy", "no_answer", "originator_cancel", "normal_temporary_failure",
    "call_rejected", "normal_clearing",
}


def _siguiente_estado_no_contesto(estado_previo: str) -> str:
    """
    1ra vez que no contesta -> VOLVER A LLAMAR
    2da vez (ya venía de VOLVER A LLAMAR) -> VOLVER A LLAMAR 2
    3ra vez (ya venía de VOLVER A LLAMAR 2) -> NO
    (Regla exacta de Leonardo, 27-jul-2026.)

    `estado_previo` es el que traía la fila ANTES de esta llamada -- ya lo
    tenemos guardado en Lead.estado_actual desde que se armó la tanda, así
    que no hace falta releer el Sheet para saber en qué intento vamos.
    """
    if estado_previo == config.ESTADO_VOLVER_A_LLAMAR:
        return config.ESTADO_VOLVER_A_LLAMAR_2
    if estado_previo == config.ESTADO_VOLVER_A_LLAMAR_2:
        return config.ESTADO_NO
    return config.ESTADO_VOLVER_A_LLAMAR


@app.post("/webhooks/telnyx")
async def webhook_telnyx(request: Request):
    body = await request.json()
    data = body.get("data", {})
    tipo_evento = data.get("event_type", "")
    payload = data.get("payload", {})

    client_state = payload.get("client_state", "")
    call_id = telnyx_client.decodificar_client_state(client_state) if client_state else ""
    info = REGISTRO.get(call_id)

    if info is None:
        # Puede ser un webhook de un evento que no nos interesa, o de una
        # llamada de la que ya perdimos el registro (reinicio del servicio).
        return {"ok": True}

    if info.get("call_control_id") is None:
        info["call_control_id"] = payload.get("call_control_id")

    if tipo_evento == "call.machine.detection.ended":
        resultado = payload.get("result", "")
        if resultado == "machine" and not info.get("resuelto"):
            _marcar_resuelto(info)
            lead = info["lead"]
            try:
                await telnyx_client.colgar_llamada(payload.get("call_control_id", ""))
            except Exception as e:
                print(f"[main] No se pudo colgar tras detectar buzón: {e}")
            try:
                # BUZÓN, no VOLVER A LLAMAR directo: es un estado momentáneo
                # a propósito (decisión de Leonardo, 27-jul-2026). El cron de
                # Apps Script (UTIL_Triggers.js / revisarBuzonAndrea, cada 5
                # min) lo pasa solo a VOLVER A LLAMAR.
                sheets.escribir_resultado(
                    tab=lead.tab, fila=lead.fila,
                    estado=config.ESTADO_BUZON,
                    resumen="Entró a buzón de voz. No se dejó mensaje.",
                )
            except Exception as e:
                print(f"[main] No se pudo escribir resultado de buzón: {e}")

    elif tipo_evento == "call.hangup":
        if not info.get("resuelto"):
            # La llamada nunca llegó a tener audio en vivo (no contestó,
            # ocupado, número inválido, etc.) -- bridge.py nunca corrió.
            _marcar_resuelto(info)
            lead = info["lead"]
            causa = payload.get("hangup_cause", "")
            if causa in _CAUSAS_NUMERO_INVALIDO:
                estado = config.ESTADO_NUMERO_INVALIDO
            elif causa in _CAUSAS_VOLVER_A_LLAMAR:
                estado = _siguiente_estado_no_contesto(lead.estado_actual)
            else:
                estado = config.ESTADO_ERROR_TECNICO
            try:
                sheets.escribir_resultado(
                    tab=lead.tab, fila=lead.fila,
                    estado=estado,
                    resumen=f"Llamada terminada sin conversación (causa: {causa}).",
                )
            except Exception as e:
                print(f"[main] No se pudo escribir resultado de hangup: {e}")

    return {"ok": True}


@app.websocket("/media-stream/{call_id}")
async def media_stream(websocket: WebSocket, call_id: str):
    await websocket.accept()
    await bridge.manejar_stream(websocket, call_id, REGISTRO)
