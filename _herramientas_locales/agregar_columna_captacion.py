"""
Crea la columna FECHA DE CAPTACIÓN al final de las dos pestañas de captaciones
y la rellena con la FECHA DE CONTACTO que cada lead tiene hoy (solo filas con
celular). Va al final a propósito: revisarBuzonAndrea usa la columna H por
número, y correr columnas le haría reescribir la columna equivocada.

  python _herramientas_locales/agregar_columna_captacion.py            (solo revisa)
  python _herramientas_locales/agregar_columna_captacion.py --aplicar

Si la columna ya existe no hace nada. No imprime datos de los leads.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "robot_captador"))
import config  # noqa: E402
from sheets_handler import get_sheets_service  # noqa: E402

PESTANAS = ["1 - CAPTACIONES A", "1 - CAPTACIONES V"]
NUEVA = "FECHA DE CAPTACIÓN"
ORIGEN = "FECHA DE CONTACTO"


def main():
    aplicar = "--aplicar" in sys.argv
    svc = get_sheets_service()
    sid = config.SPREADSHEET_ID
    info = svc.get(
        spreadsheetId=sid, ranges=[f"'{p}'" for p in PESTANAS],
        fields="sheets(properties(sheetId,title,gridProperties),basicFilter,"
               "data(columnMetadata.pixelSize,rowData.values(userEnteredValue,userEnteredFormat)))",
    ).execute()

    peticiones = []
    for h in info["sheets"]:
        nombre = h["properties"]["title"]
        hoja_id = h["properties"]["sheetId"]
        grid = h["properties"]["gridProperties"]
        filas = h["data"][0].get("rowData", [])
        cab = [c.get("userEnteredValue", {}).get("stringValue", "").strip().upper()
               for c in filas[0].get("values", [])]
        if NUEVA in cab:
            print(f"{nombre}: la columna ya existe, nada que hacer")
            continue
        origen, celular = cab.index(ORIGEN), cab.index("CELULAR")
        destino = max(i for i, c in enumerate(cab) if c) + 1

        if destino >= grid["columnCount"]:
            peticiones.append({"appendDimension": {"sheetId": hoja_id, "dimension": "COLUMNS",
                                                   "length": destino + 1 - grid["columnCount"]}})
        nuevas, copiadas = [], 0
        for i in range(grid["rowCount"]):
            celdas = filas[i].get("values", []) if i < len(filas) else []
            base = celdas[origen] if origen < len(celdas) else {}
            celda = {"userEnteredFormat": base.get("userEnteredFormat", {})}
            if i == 0:
                celda["userEnteredValue"] = {"stringValue": NUEVA}
            elif i >= 2 and "userEnteredValue" in base and celular < len(celdas) \
                    and celdas[celular].get("userEnteredValue"):
                celda["userEnteredValue"] = base["userEnteredValue"]
                copiadas += 1
            nuevas.append({"values": [celda]})
        peticiones.append({"updateCells": {
            "range": {"sheetId": hoja_id, "startRowIndex": 0, "endRowIndex": grid["rowCount"],
                      "startColumnIndex": destino, "endColumnIndex": destino + 1},
            "rows": nuevas, "fields": "userEnteredValue,userEnteredFormat"}})
        ancho = h["data"][0].get("columnMetadata", [])[origen].get("pixelSize", 100)
        peticiones.append({"updateDimensionProperties": {
            "range": {"sheetId": hoja_id, "dimension": "COLUMNS", "startIndex": destino, "endIndex": destino + 1},
            "properties": {"pixelSize": ancho}, "fields": "pixelSize"}})
        filtro = h.get("basicFilter")
        if filtro and filtro["range"].get("endColumnIndex", 0) <= destino:
            # El filtro debe cubrir la columna nueva: si queda fuera, al ordenar
            # desde el filtro sus fechas no se moverían con la fila.
            filtro["range"]["endColumnIndex"] = destino + 1
            if filtro.get("filterSpecs"):
                filtro.pop("criteria", None)  # la API no acepta las dos formas a la vez
            peticiones.append({"setBasicFilter": {"filter": filtro}})
        print(f"{nombre}: columna nueva en la posición {destino + 1} "
              f"(hoy hay {grid['columnCount']} columnas), {copiadas} fechas a copiar, "
              f"filtro {'se amplía' if filtro else 'no hay'}")

    if not peticiones:
        return
    if aplicar:
        svc.batchUpdate(spreadsheetId=sid, body={"requests": peticiones}).execute()
        print("Aplicado.")
    else:
        print("Revisión: repite con --aplicar.")


if __name__ == "__main__":
    main()
