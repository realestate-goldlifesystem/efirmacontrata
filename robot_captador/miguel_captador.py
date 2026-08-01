"""
Respaldo de Metrocuadrado para Miguel-Fincaraiz.

Se dispara UNICAMENTE cuando Fincaraiz queda AGOTADA en una combinacion
localidad+habitacion (se recorrieron todas las paginas disponibles sin
llenar la cuota) -- busca en Metrocuadrado, solo en esa misma localidad y
habitacion, hasta llenar lo que falto. Reutiliza el motor ya validado en
prueba_metrocuadrado.py (lugares dinamicos, paginacion, validaciones
cruzadas, revelado de telefono por WhatsApp) en vez de duplicarlo.
"""
from playwright.sync_api import sync_playwright

from prueba_metrocuadrado import (
    BASE_URL,
    obtener_lugares_dinamicos,
    recolectar_links,
    procesar_anuncio,
    crear_escucha_whatsapp,
)


def buscar_metrocuadrado(sheets, localidad, habitacion, operacion, cuota_faltante):
    """
    Busca en Metrocuadrado hasta cuota_faltante particulares NUEVOS para
    localidad+habitacion+operacion. Usa el mismo SheetsHandler que ya trae
    Fincaraiz (misma pestana real, mismo existing_links/existing_phones ya
    cargado y ya actualizado con lo que Fincaraiz mismo capturo en esta
    corrida) para que la deduplicacion cruzada sea automatica. Devuelve
    cuantos particulares capturo.

    No atrapa sus propias excepciones a proposito: quien llama (scraper.py)
    ya envuelve esta llamada en su propio try/except para que una falla
    aqui no tumbe el resto de combinaciones de Fincaraiz.
    """
    if cuota_faltante <= 0:
        return 0

    capturados = 0
    vistos_en_esta_busqueda = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="es-CO",
        )

        estado_telefono = {"valor": None}
        context.on("request", crear_escucha_whatsapp(estado_telefono))

        page = context.new_page()

        lugares = obtener_lugares_dinamicos(context, localidad)
        print(f"[METROCUADRADO] {len(lugares)} lugares encontrados dinámicamente para '{localidad}' "
              f"({habitacion} hab, {operacion}). Cuota a llenar: {cuota_faltante}")

        for idx, lugar in enumerate(lugares, start=1):
            if capturados >= cuota_faltante:
                break

            url_busqueda = BASE_URL.format(operacion=operacion, lugar=lugar, hab=habitacion)
            links = recolectar_links(page, url_busqueda)
            print(f"[METROCUADRADO] Lugar {idx}/{len(lugares)} ({lugar}): {len(links)} anuncios")

            for link in links:
                if capturados >= cuota_faltante:
                    break
                link_norm = link.lower().strip()
                if link_norm in vistos_en_esta_busqueda:
                    continue
                vistos_en_esta_busqueda.add(link_norm)
                if link_norm in sheets.existing_links:
                    continue

                datos = procesar_anuncio(page, context, link, estado_telefono, localidad, lugar,
                                          habitacion, operacion)
                if datos is None:
                    continue

                datos["localidad"] = localidad
                if sheets.append_captacion(datos):
                    capturados += 1
                    print(f"[METROCUADRADO] ✨ {capturados}/{cuota_faltante} capturados (lugar: {lugar})")

        browser.close()

    print(f"[METROCUADRADO] Resultado para {localidad} / {habitacion} hab ({operacion}): "
          f"{capturados}/{cuota_faltante} particulares capturados.")
    return capturados
