import os
import sys
import re
import time
import unicodedata
from datetime import datetime, timezone, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build
import config

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def con_reintentos(operacion, descripcion="operación de Sheets"):
    """
    Ejecuta una llamada a la API de Sheets reintentando ante fallos pasajeros.

    Sin esto, un 429 (demasiadas peticiones) o un 500 de Google tumbaba la
    excepción hasta arriba y se perdía el resto de la búsqueda en curso.
    Espera 2s, 4s y 8s entre intentos.
    """
    ultimo_error = None
    for intento in range(1, 4):
        try:
            return operacion()
        except Exception as e:
            texto = str(e)
            recuperable = any(c in texto for c in ("429", "500", "502", "503", "504",
                                                   "rateLimitExceeded", "backendError",
                                                   "internalError", "timed out"))
            if not recuperable or intento == 3:
                raise
            ultimo_error = e
            espera = 2 ** intento
            print(f"[RETRY] {descripcion} falló (intento {intento}/3): {texto[:90]}")
            print(f"        Reintentando en {espera}s...")
            time.sleep(espera)
    if ultimo_error:
        raise ultimo_error

MONTHS_ES = {
    1: "ene", 2: "feb", 3: "mar", 4: "abr", 5: "may", 6: "jun",
    7: "jul", 8: "ago", 9: "sep", 10: "oct", 11: "nov", 12: "dic"
}

def get_sheets_service():
    """Inicializa el cliente de Google Sheets API usando Service Account."""
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = service_account.Credentials.from_service_account_file(
        config.SERVICE_ACCOUNT_PATH, scopes=scopes
    )
    service = build("sheets", "v4", credentials=creds)
    return service.spreadsheets()

def clean_phone(phone_str):
    """Extrae únicamente los dígitos de un número telefónico (ej: +57 314 235 8758 -> 3142358758)."""
    if not phone_str:
        return ""
    digits = re.sub(r"\D", "", str(phone_str))
    if digits.startswith("57") and len(digits) > 10:
        digits = digits[2:]
    return digits

# Colombia es UTC-5 todo el año: no tiene horario de verano, así que un
# desfase fijo es exacto y no depende de que el sistema tenga la base de
# datos de zonas horarias instalada.
TZ_COLOMBIA = timezone(timedelta(hours=-5))

def ahora_colombia():
    """
    Hora actual en Colombia.

    Importante para GitHub Actions: sus servidores corren en UTC, así que
    datetime.now() adelantaba la fecha 5 horas. En la práctica el "día nuevo"
    empezaba a las 7:00 PM hora Colombia, y los barridos de la noche quedaban
    fechados al día siguiente, partidos entre dos tarjetas del modal.
    """
    return datetime.now(TZ_COLOMBIA)

def get_spanish_date_str():
    """Genera la fecha actual en formato DD-mmm-YYYY (ej. 24-jul-2026)."""
    now = ahora_colombia()
    day = f"{now.day:02d}"
    month = MONTHS_ES[now.month]
    year = now.year
    return f"{day}-{month}-{year}"

def col_to_letter(col_idx):
    """Convierte un índice de columna base-0 a letra de Excel (ej: 0 -> A, 15 -> P, 18 -> S)."""
    result = ""
    col_idx += 1
    while col_idx > 0:
        col_idx, remainder = divmod(col_idx - 1, 26)
        result = chr(65 + remainder) + result
    return result

class SheetsHandler:
    def __init__(self, mode="arriendo"):
        self.mode = str(mode).lower()
        self.service = get_sheets_service()
        self.spreadsheet_id = config.SPREADSHEET_ID
        self.sheet_title = config.get_sheet_title(self.mode)
        self.is_arriendo = "FALSE" if self.mode == "venta" else "TRUE"
        self.is_venta = "TRUE" if self.mode == "venta" else "FALSE"
        self.existing_phones = set()
        self.existing_links = set()
        self.col_map = {}
        self.max_n = 0
        self.target_row_index = None # 1-indexed row position in Sheet
        self.sheet_id = None         # sheetId numérico, necesario para batchUpdate
        self.load_existing_data()

    def normalize_header(self, h):
        if not h:
            return ""
        text = unicodedata.normalize('NFD', str(h)).encode('ascii', 'ignore').decode("utf-8")
        return text.lower().strip()

    def load_existing_data(self):
        """
        Lee la pestaña correspondiente:
        - Fila 1: Nombres de columnas (Mapeo)
        - Fila 2: Filtro (Reservado y omitido)
        - Fila 3+: Datos reales (Escribir siempre al final)
        """
        range_name = f"'{self.sheet_title}'!A1:Z3000"
        result = con_reintentos(
            lambda: self.service.values().get(
                spreadsheetId=self.spreadsheet_id, range=range_name
            ).execute(),
            f"lectura de '{self.sheet_title}'"
        )

        rows = result.get("values", [])
        print(f"[INFO] Cargas de Google Sheets ('{self.sheet_title}'): {len(rows)} filas leídas.")

        # 1. Mapear nombres de columnas a sus índices (base 0) desde la Fila 1
        self.col_map = {}
        if rows:
            header_row = rows[0]
            for col_idx, col_name in enumerate(header_row):
                norm_name = self.normalize_header(col_name)
                if norm_name:
                    self.col_map[norm_name] = col_idx

        print(f"[INFO] Columnas mapeadas dinámicamente: {list(self.col_map.keys())}")

        def get_col(name):
            return self.col_map.get(self.normalize_header(name), None)

        col_n = get_col("n") if get_col("n") is not None else 0
        col_celular = get_col("celular") if get_col("celular") is not None else 2
        col_link = get_col("link del inmueble publicado") if get_col("link del inmueble publicado") is not None else 5

        last_row_with_data = 2 # Fila 2 reservada para Filtro
        last_row_data_n = 0

        for idx, row in enumerate(rows, start=1):
            if idx <= 2: # Omitir Fila 1 (Nombres) y Fila 2 (Filtro)
                continue

            val_a = row[col_n].strip() if len(row) > col_n and row[col_n] else ""
            val_c = row[col_celular].strip() if len(row) > col_celular and row[col_celular] else ""
            cleaned_c = clean_phone(val_c)
            if cleaned_c:
                self.existing_phones.add(cleaned_c)

            val_f = row[col_link].strip() if len(row) > col_link and row[col_link] else ""
            if val_f:
                self.existing_links.add(val_f.lower())

            has_data = bool(cleaned_c or val_f)

            if has_data:
                last_row_with_data = idx
                if val_a.isdigit():
                    num_a = int(val_a)
                    if num_a > last_row_data_n:
                        last_row_data_n = num_a

        # Escribir SIEMPRE a partir de la Fila 3 al final de la tabla
        self.target_row_index = max(3, last_row_with_data + 1)
        self.max_n = last_row_data_n

        print(f"[INFO] Registros existentes en '{self.sheet_title}': {len(self.existing_phones)} teléfonos, {len(self.existing_links)} links.")
        print(f"[INFO] Última fila ocupada con datos: {last_row_with_data} (Último n: {self.max_n}). Próxima fila a escribir: Fila {self.target_row_index}")

    def build_whatsapp_formula(self, row_index):
        """
        Fórmula para la columna 'WHA': enlace clickeable al WhatsApp del propietario.

        Apunta a la celda del celular de la misma fila (no al número quemado), así
        el enlace se mantiene correcto si el número se corrige a mano después.
        Si la celda del celular está vacía, la fórmula no muestra nada.
        """
        col_cel = self.col_map.get("celular")
        if col_cel is None:
            return ""
        ref = f"{col_to_letter(col_cel)}{row_index}"
        sep = config.FORMULA_ARG_SEPARATOR
        return (
            f'=IF({ref}=""{sep}""{sep}'
            f'HYPERLINK("https://wa.me/{config.WHATSAPP_COUNTRY_CODE}"&{ref}{sep}"{config.WHATSAPP_EMOJI}"))'
        )

    def get_sheet_id(self):
        """Obtiene (y cachea) el sheetId numérico de la pestaña destino."""
        if self.sheet_id is None:
            info = self.service.get(spreadsheetId=self.spreadsheet_id).execute()
            self.sheet_id = next(
                (s["properties"]["sheetId"] for s in info["sheets"]
                 if s["properties"]["title"] == self.sheet_title),
                None
            )
        return self.sheet_id

    BITACORA_HEADERS = [
        "FECHA", "HORA", "MODO", "SECTOR", "HABITACIONES", "ESTADO",
        "CAPTADOS", "CUOTA", "PAGINAS", "ANUNCIOS VISTOS",
        "INMOBILIARIAS", "DUPLICADOS", "DURACION (min)", "DETALLE"
    ]

    def registrar_bitacora(self, fila):
        """
        Anota el resultado de UNA combinación (sector x habitaciones) en la
        pestaña de bitácora, creándola con sus encabezados si no existe.

        Se escribe apenas termina cada combinación, no al final de todo, para
        que una corrida cortada a medias deje igual su rastro.
        """
        titulo = config.SHEET_TITLE_BITACORA
        try:
            info = con_reintentos(
                lambda: self.service.get(spreadsheetId=self.spreadsheet_id).execute(),
                "lectura de pestañas"
            )
            existe = any(s["properties"]["title"] == titulo for s in info["sheets"])

            if not existe:
                con_reintentos(
                    lambda: self.service.batchUpdate(
                        spreadsheetId=self.spreadsheet_id,
                        body={"requests": [{"addSheet": {"properties": {
                            "title": titulo,
                            "gridProperties": {"rowCount": 2000, "columnCount": len(self.BITACORA_HEADERS)}
                        }}}]}
                    ).execute(),
                    "creación de la bitácora"
                )
                con_reintentos(
                    lambda: self.service.values().update(
                        spreadsheetId=self.spreadsheet_id,
                        range=f"'{titulo}'!A1",
                        valueInputOption="RAW",
                        body={"values": [self.BITACORA_HEADERS]}
                    ).execute(),
                    "encabezados de la bitácora"
                )
                print(f"[INFO] Pestaña '{titulo}' creada.")

            # RAW y no USER_ENTERED: con USER_ENTERED, Sheets interpretaba
            # "25-jul-2026" como fecha y "22:28" como hora, y los guardaba como
            # números de serie (46228 / 0,9361...). Eso rompía el modal de
            # resumen, que agrupa por la fecha leída como texto.
            con_reintentos(
                lambda: self.service.values().append(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"'{titulo}'!A1",
                    valueInputOption="RAW",
                    insertDataOption="INSERT_ROWS",
                    body={"values": [fila]}
                ).execute(),
                "escritura en la bitácora"
            )
        except Exception as e:
            # La bitácora es informativa: si falla, la captación ya quedó guardada.
            print(f"[WARN] No se pudo escribir en la bitácora: {e}")

    def get_sheet_row_count(self, sheet_id):
        """Cantidad actual de filas físicas de la pestaña (para insertar al final)."""
        info = self.service.get(spreadsheetId=self.spreadsheet_id).execute()
        for s in info["sheets"]:
            if s["properties"]["sheetId"] == sheet_id:
                return s["properties"]["gridProperties"]["rowCount"]
        return 0

    def apply_row_format(self, target_row):
        """
        Copia el formato (bordes, colores, validaciones, formato de número) desde
        una fila de referencia hacia la fila recién escrita.

        Por qué hace falta: al escribir solo valores, las filas que nunca tuvieron
        formato quedan peladas. Es lo que pasó desde la fila 592 en adelante,
        cuando el Sheet se expandió con `appendDimension` (que agrega filas en
        blanco sin heredar nada). Se usa una fila de referencia FIJA y conocida
        como buena, no la anterior, para no propagar una fila ya rota.
        """
        sheet_id = self.get_sheet_id()
        if sheet_id is None:
            return

        ref = config.FORMAT_REFERENCE_ROW
        if target_row == ref:
            return

        try:
            self.service.batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body={"requests": [{
                    "copyPaste": {
                        # 0-indexed y con fin exclusivo
                        "source": {"sheetId": sheet_id, "startRowIndex": ref - 1, "endRowIndex": ref},
                        "destination": {"sheetId": sheet_id, "startRowIndex": target_row - 1, "endRowIndex": target_row},
                        "pasteType": "PASTE_FORMAT"
                    }
                }]}
            ).execute()
        except Exception as e:
            # El formato es cosmético: si falla, el dato ya quedó guardado.
            print(f"[WARN] No se pudo aplicar el formato a la fila {target_row}: {e}")

    def is_duplicate(self, phone, link):
        """Verifica si el teléfono o el link ya fueron procesados previamente."""
        cleaned = clean_phone(phone)
        if cleaned and cleaned in self.existing_phones:
            return True, f"Celular {cleaned} ya existe en el Sheet"
        if link and link.lower().strip() in self.existing_links:
            return True, f"Link {link} ya existe en el Sheet"
        return False, ""

    def append_captacion(self, captacion_data):
        """
        Inserta un nuevo registro a partir de la Fila 3 en adelante.
        """
        phone = captacion_data.get("phone", "")
        link = captacion_data.get("link", "")

        is_dup, reason = self.is_duplicate(phone, link)
        if is_dup:
            print(f"[WARN] OMITIDO por duplicado: {reason}")
            return False

        self.max_n += 1
        new_n = str(self.max_n)
        date_str = get_spanish_date_str()

        # Construcción dinámica basada en los nombres de columnas
        max_idx = max(self.col_map.values()) if self.col_map else 18
        row_data = [""] * (max_idx + 1)

        field_values = {
            "n": new_n,
            "fecha de contacto": date_str,
            "celular": clean_phone(phone),
            "arriendo": self.is_arriendo,
            "venta": self.is_venta,
            "link del inmueble publicado": link,
            "estado de llamada": "NUEVO",
            "tipo de inmueble": captacion_data.get("property_type", ""),
            "nombre del propietario": captacion_data.get("owner_name", ""),
            "habitaciones": str(captacion_data.get("bedrooms", "")),
            "valor de promocion": captacion_data.get("price", ""),
            "ubicacion": captacion_data.get("location", ""),
            "wha": self.build_whatsapp_formula(self.target_row_index)
        }

        for norm_key, val in field_values.items():
            if norm_key in self.col_map:
                row_data[self.col_map[norm_key]] = val

        last_col_letter = col_to_letter(max_idx)
        range_to_update = f"'{self.sheet_title}'!A{self.target_row_index}:{last_col_letter}{self.target_row_index}"

        body = {
            "values": [row_data]
        }

        try:
            con_reintentos(
                lambda: self.service.values().update(
                    spreadsheetId=self.spreadsheet_id,
                    range=range_to_update,
                    valueInputOption="USER_ENTERED",
                    body=body
                ).execute(),
                f"escritura de la fila {self.target_row_index}"
            )
        except Exception as e:
            if "exceeds grid limits" in str(e):
                print(f"[WARN] Límite de filas alcanzado en la fila {self.target_row_index}. Expandiendo el Sheet automáticamente...")

                sheet_id = self.get_sheet_id()

                if sheet_id is not None:
                    # Se usa insertDimension con inheritFromBefore en vez de
                    # appendDimension: appendDimension agrega filas EN BLANCO sin
                    # formato (eso dejó las filas 592+ sin bordes), mientras que
                    # insertDimension hereda el formato de la fila anterior.
                    last_row = self.get_sheet_row_count(sheet_id)
                    self.service.batchUpdate(
                        spreadsheetId=self.spreadsheet_id,
                        body={"requests": [{
                            "insertDimension": {
                                "range": {
                                    "sheetId": sheet_id,
                                    "dimension": "ROWS",
                                    "startIndex": last_row,
                                    "endIndex": last_row + 10
                                },
                                "inheritFromBefore": True
                            }
                        }]}
                    ).execute()

                    # Re-intentar el update exacto
                    self.service.values().update(
                        spreadsheetId=self.spreadsheet_id,
                        range=range_to_update,
                        valueInputOption="USER_ENTERED",
                        body=body
                    ).execute()
                else:
                    raise Exception(f"No se pudo encontrar el sheetId para {self.sheet_title}")
            else:
                raise e

        # Heredar el formato de la tabla (bordes, colores, validaciones)
        self.apply_row_format(self.target_row_index)

        print(f"[OK] REGISTRO GUARDADO EN GOOGLE SHEETS ('{self.sheet_title}') [Fila {self.target_row_index} | n: {new_n}] -> {captacion_data.get('owner_name')} | {phone} | {captacion_data.get('location')}")

        # Actualizar memoria interna
        if phone:
            self.existing_phones.add(clean_phone(phone))
        if link:
            self.existing_links.add(link.lower().strip())
        self.target_row_index += 1

        return True

if __name__ == "__main__":
    print("[TEST] Probando SheetsHandler omitiendo Fila 1 (Nombres) y Fila 2 (Filtro)...")
    handler = SheetsHandler(mode="arriendo")
    print("[TEST] Lectura y cálculo de fila final exitoso.")
