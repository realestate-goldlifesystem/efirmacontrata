import os
import sys
import re
import unicodedata
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
import config

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

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

def get_spanish_date_str():
    """Genera la fecha actual en formato DD-mmm-YYYY (ej. 24-jul-2026)."""
    now = datetime.now()
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
        self.load_existing_data()

    def normalize_header(self, h):
        if not h:
            return ""
        text = unicodedata.normalize('NFD', str(h)).encode('ascii', 'ignore').decode("utf-8")
        return text.lower().strip()

    def load_existing_data(self):
        """Lee la pestaña correspondiente, mapea columnas por nombre, desduplica y halla la ÚLTIMA fila al final."""
        range_name = f"'{self.sheet_title}'!A1:Z3000"
        result = self.service.values().get(
            spreadsheetId=self.spreadsheet_id, range=range_name
        ).execute()

        rows = result.get("values", [])
        print(f"[INFO] Cargas de Google Sheets ('{self.sheet_title}'): {len(rows)} filas leídas.")

        # 1. Mapear nombres de columnas a sus índices (base 0)
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

        last_row_with_data = 1 # Empezar en la fila de encabezados
        last_row_data_n = 0

        for idx, row in enumerate(rows, start=1):
            if idx <= 1: # Omitir encabezado (fila 1)
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

        # Escribir SIEMPRE al final de la tabla
        self.target_row_index = last_row_with_data + 1
        self.max_n = last_row_data_n

        print(f"[INFO] Registros existentes en '{self.sheet_title}': {len(self.existing_phones)} teléfonos, {len(self.existing_links)} links.")
        print(f"[INFO] Última fila con datos: {last_row_with_data} (Último n: {self.max_n}). Próxima fila a escribir: Fila {self.target_row_index}")

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
        Inserta un nuevo registro siempre al final de la tabla respetando el consecutivo n.
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
            "ubicacion": captacion_data.get("location", "")
        }

        for norm_key, val in field_values.items():
            if norm_key in self.col_map:
                row_data[self.col_map[norm_key]] = val

        last_col_letter = col_to_letter(max_idx)
        range_to_update = f"'{self.sheet_title}'!A{self.target_row_index}:{last_col_letter}{self.target_row_index}"

        body = {
            "values": [row_data]
        }

        self.service.values().update(
            spreadsheetId=self.spreadsheet_id,
            range=range_to_update,
            valueInputOption="USER_ENTERED",
            body=body
        ).execute()

        print(f"[OK] REGISTRO GUARDADO EN GOOGLE SHEETS ('{self.sheet_title}') [Fila {self.target_row_index} | n: {new_n}] -> {captacion_data.get('owner_name')} | {phone} | {captacion_data.get('location')}")

        # Actualizar memoria interna
        if phone:
            self.existing_phones.add(clean_phone(phone))
        if link:
            self.existing_links.add(link.lower().strip())
        self.target_row_index += 1

        return True

if __name__ == "__main__":
    print("[TEST] Probando SheetsHandler append al final...")
    handler = SheetsHandler(mode="arriendo")
    print("[TEST] Lectura y cálculo de fila final exitoso.")
