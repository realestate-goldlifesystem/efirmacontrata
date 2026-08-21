"""
revisar_formato_captaciones.py
------------------------------
Revisa (y opcionalmente repara) las filas CON DATOS de las pestañas de
captaciones que perdieron el formato de la tabla: bordes, fondos y los
desplegables de las columnas con validación.

Uso:
    python _herramientas_locales/revisar_formato_captaciones.py            # solo revisa
    python _herramientas_locales/revisar_formato_captaciones.py --reparar  # repara

Por qué existe (ago-2026): las filas nuevas del Robot Captador quedaban sin
formato de la 720 en adelante. La causa NO era que faltara copiar el formato
-- el código ya lo hacía -- sino que la pestaña tiene un FILTRO ACTIVO y
Google rechaza `copyPaste` cuando el rango toca filas ocultas por el filtro:

    "This operation is not supported on a range with a filtered out row"

El error se tragaba en un WARN y la fila quedaba pelada. La solución (ya
aplicada en `robot_captador/sheets_handler.py::apply_row_format`) es usar
`updateCells`, que no es una copia y por tanto el filtro no lo bloquea.
Esta herramienta usa el mismo camino para reparar filas viejas.

⚠️ Detalle de la detección: cuando una fila no tiene NINGÚN formato, el API
la omite del `rowData`. Por eso no basta con recorrer lo que llega: hay que
comparar contra el total de filas con datos, o esas filas pasan invisibles
(fue justo lo que enmascaró el problema al principio).
"""
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "robot_captador"))

import config                      # noqa: E402
from sheets_handler import SheetsHandler  # noqa: E402

COL_FIN = "S"
PESTANAS = [("1 - CAPTACIONES A", "arriendo"), ("1 - CAPTACIONES V", "venta")]


def rangos_contiguos(nums):
    """[1,2,3,7,8] -> [(1,3),(7,8)] para reparar por bloques y no fila por fila."""
    if not nums:
        return []
    out, ini, prev = [], nums[0], nums[0]
    for n in nums[1:]:
        if n == prev + 1:
            prev = n
        else:
            out.append((ini, prev))
            ini = prev = n
    out.append((ini, prev))
    return out


def revisar(pestana, mode, reparar=False):
    h = SheetsHandler(mode=mode)
    h.sheet_title = pestana
    h.sheet_id = None
    h.load_existing_data()

    ultima = h.target_row_index - 1
    ref = config.FORMAT_REFERENCE_ROW
    print(f"\n=== {pestana} | filas con datos: {ref}..{ultima} ===")
    if ultima < ref:
        print("  (sin datos)")
        return 0

    resp = h.service.get(
        spreadsheetId=h.spreadsheet_id,
        ranges=[f"'{pestana}'!A{ref}:{COL_FIN}{ultima}"],
        includeGridData=True,
        fields="sheets/data/rowData/values/userEnteredFormat/borders",
    ).execute()
    filas = resp["sheets"][0]["data"][0].get("rowData", [])

    def cols_con_borde(i):
        if i >= len(filas):
            return set()   # el API ni devolvió la fila: no tiene formato alguno
        return {
            c for c, v in enumerate(filas[i].get("values", []))
            if v.get("userEnteredFormat", {}).get("borders")
        }

    patron = cols_con_borde(0)
    print(f"  referencia (fila {ref}): bordes en {len(patron)} columnas")

    rotas = [ref + i for i in range(1, ultima - ref + 1)
             if patron - cols_con_borde(i)]

    if not rotas:
        print("  todas las filas con datos conservan el formato")
        return 0

    rangos = rangos_contiguos(rotas)
    print(f"  {len(rotas)} fila(s) sin formato completo:")
    for a, b in rangos:
        print(f"    filas {a}-{b}" if a != b else f"    fila {a}")

    if reparar:
        # Se reusa apply_row_format del robot para no duplicar la lógica
        # (y para que cualquier arreglo futuro valga en los dos lados).
        for a, b in rangos:
            for n in range(a, b + 1):
                h.apply_row_format(n)
        print(f"  -> REPARADAS {len(rotas)} fila(s)")

    return len(rotas)


if __name__ == "__main__":
    reparar = "--reparar" in sys.argv
    print("MODO:", "REPARAR" if reparar else "solo revisar (usa --reparar para arreglar)")
    total = 0
    for pestana, mode in PESTANAS:
        try:
            total += revisar(pestana, mode, reparar)
        except Exception as e:
            print(f"  [ERROR] {pestana}: {e}")
    print(f"\n=== TOTAL: {total} fila(s) {'reparadas' if reparar else 'por reparar'} ===")
