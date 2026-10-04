"""
Propaga un estado de ESTADO DE LLAMADA (por defecto CERRADO) a las dos pestañas
de captaciones: lo agrega al desplegable de todas las filas y crea las reglas
de color que falten (columna CELULAR y columna de estado), copiando los colores
de la regla que ya exista para ese estado.

  python _herramientas_locales/propagar_estado_captaciones.py            (solo revisa)
  python _herramientas_locales/propagar_estado_captaciones.py --aplicar
  python _herramientas_locales/propagar_estado_captaciones.py --estado "OTRO" --aplicar

Lee solo validaciones y formatos, nunca los datos de los leads.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "robot_captador"))
import config  # noqa: E402
from sheets_handler import get_sheets_service  # noqa: E402

PESTANAS = ["1 - CAPTACIONES A", "1 - CAPTACIONES V"]
COL_CELULAR, COL_ESTADO = 3, 7  # D y H, base 0
PRIMERA_FILA = 3


def _regla_de(reglas, estado, columna):
    """Regla de formato condicional de `estado` que pinta `columna`."""
    for r in reglas:
        cond = r.get("booleanRule", {}).get("condition", {})
        valores = " ".join(v.get("userEnteredValue", "") for v in cond.get("values", []))
        if estado not in valores.replace('"', " ").split() and f'"{estado}"' not in valores:
            continue
        if any(g.get("startColumnIndex") == columna for g in r.get("ranges", [])):
            return r
    return None


def main():
    aplicar = "--aplicar" in sys.argv
    estado = sys.argv[sys.argv.index("--estado") + 1] if "--estado" in sys.argv else "CERRADO"
    svc = get_sheets_service()
    sid = config.SPREADSHEET_ID

    info = svc.get(
        spreadsheetId=sid,
        ranges=[f"'{p}'!H:H" for p in PESTANAS],
        fields="sheets(properties(sheetId,title,gridProperties.rowCount),conditionalFormats,"
               "data.rowData.values.dataValidation)",
    ).execute()
    hojas = {h["properties"]["title"]: h for h in info["sheets"]}
    # Con `ranges` la API solo devuelve las reglas que tocan la columna H; las
    # de CELULAR hay que pedirlas aparte, sin rango.
    completas = svc.get(spreadsheetId=sid, fields="sheets(properties.title,conditionalFormats)").execute()
    for h in completas["sheets"]:
        if h["properties"]["title"] in hojas:
            hojas[h["properties"]["title"]]["conditionalFormats"] = h.get("conditionalFormats", [])

    # Colores: los de la regla que ya exista para el estado en cualquier pestaña.
    formato = None
    for h in hojas.values():
        r = _regla_de(h.get("conditionalFormats", []), estado, COL_CELULAR) or \
            _regla_de(h.get("conditionalFormats", []), estado, COL_ESTADO)
        if r:
            formato = r["booleanRule"]["format"]
            break

    peticiones = []
    for nombre in PESTANAS:
        h = hojas[nombre]
        hoja_id = h["properties"]["sheetId"]
        total = h["properties"]["gridProperties"]["rowCount"]
        filas = h["data"][0].get("rowData", [])

        nuevas, faltan = [], 0
        for i in range(PRIMERA_FILA - 1, total):
            dv = (filas[i].get("values", [{}])[0].get("dataValidation") if i < len(filas) and filas[i] else None)
            if dv and dv.get("condition", {}).get("type") == "ONE_OF_LIST":
                valores = dv["condition"].setdefault("values", [])
                if not any(v.get("userEnteredValue") == estado for v in valores):
                    valores.append({"userEnteredValue": estado})
                    faltan += 1
            nuevas.append({"values": [{"dataValidation": dv}] if dv else [{}]})
        print(f"{nombre}: {faltan} filas sin '{estado}' en el desplegable")
        if faltan:
            peticiones.append({"updateCells": {
                "range": {"sheetId": hoja_id, "startRowIndex": PRIMERA_FILA - 1, "endRowIndex": total,
                          "startColumnIndex": COL_ESTADO, "endColumnIndex": COL_ESTADO + 1},
                "rows": nuevas, "fields": "dataValidation"}})

        reglas = h.get("conditionalFormats", [])
        for columna, etiqueta in ((COL_CELULAR, "CELULAR"), (COL_ESTADO, "ESTADO")):
            if _regla_de(reglas, estado, columna):
                print(f"   regla de color en {etiqueta}: ya existe")
                continue
            if not formato:
                print(f"   regla de color en {etiqueta}: FALTA y no hay colores de dónde copiar")
                continue
            # El rango y la fórmula se calcan de la regla de otro estado en esa columna.
            modelo = next((r for r in reglas if "booleanRule" in r and
                           any(g.get("startColumnIndex") == columna for g in r["ranges"])), None)
            if not modelo:
                print(f"   regla de color en {etiqueta}: FALTA y no hay regla modelo")
                continue
            rango = [g for g in modelo["ranges"] if g.get("startColumnIndex") == columna]
            if columna == COL_CELULAR:
                fila = rango[0].get("startRowIndex", 0) + 1
                condicion = {"type": "CUSTOM_FORMULA",
                             "values": [{"userEnteredValue": f'=$H{fila}="{estado}"'}]}
            else:
                condicion = {"type": "TEXT_EQ", "values": [{"userEnteredValue": estado}]}
            print(f"   regla de color en {etiqueta}: FALTA -> se crea ({condicion['values'][0]['userEnteredValue']})")
            peticiones.append({"addConditionalFormatRule": {
                "rule": {"ranges": rango, "booleanRule": {"condition": condicion, "format": formato}},
                "index": 0}})

    if not peticiones:
        print("Nada que cambiar.")
    elif aplicar:
        svc.batchUpdate(spreadsheetId=sid, body={"requests": peticiones}).execute()
        print(f"Aplicado: {len(peticiones)} cambios.")
    else:
        print(f"Revisión: {len(peticiones)} cambios pendientes. Repite con --aplicar.")


if __name__ == "__main__":
    main()
