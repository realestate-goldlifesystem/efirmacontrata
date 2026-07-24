import os
import sys
import re
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

class SheetsHandler:
    def __init__(self):
        self.service = get_sheets_service()
        self.spreadsheet_id = config.SPREADSHEET_ID
        self.sheet_title = config.SHEET_TITLE
        self.existing_phones = set()
        self.existing_links = set()
        self.max_n = 0
        self.target_row_index = None # 1-indexed row position in Sheet
        self.load_existing_data()

    def load_existing_data(self):
        """Lee la pestaña 1 - CAPTACIONES A para desduplicar y hallar la primera fila disponible."""
        range_name = f"'{self.sheet_title}'!A1:P2000"
        result = self.service.values().get(
            spreadsheetId=self.spreadsheet_id, range=range_name
        ).execute()

        rows = result.get("values", [])
        print(f"[INFO] Cargas de Google Sheets: {len(rows)} filas leídas.")

        first_empty_slot = None

        for idx, row in enumerate(rows, start=1):
            if idx <= 2: # Omitir encabezados (filas 1 y 2)
                continue

            # Extracción del número N (Col A)
            val_a = row[0].strip() if len(row) > 0 and row[0] else ""
            if val_a.isdigit():
                num_a = int(val_a)
                if num_a > self.max_n:
                    self.max_n = num_a

            # Extracción de CELULAR (Col C, índice 2)
            val_c = row[2].strip() if len(row) > 2 and row[2] else ""
            cleaned_c = clean_phone(val_c)
            if cleaned_c:
                self.existing_phones.add(cleaned_c)

            # Extracción de LINK (Col F, índice 5)
            val_f = row[5].strip() if len(row) > 5 and row[5] else ""
            if val_f:
                self.existing_links.add(val_f.lower())

            # Detectar la primera fila donde CELULAR (Col C) o LINK (Col F) estén vacíos
            if not val_c and not val_f and first_empty_slot is None:
                first_empty_slot = idx

        if first_empty_slot:
            self.target_row_index = first_empty_slot
        else:
            self.target_row_index = len(rows) + 1

        print(f"[INFO] Registros existentes: {len(self.existing_phones)} teléfonos, {len(self.existing_links)} links.")
        print(f"[INFO] Último n registrado: {self.max_n}. Próxima fila a escribir: Fila {self.target_row_index}")

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
        Inserta un nuevo registro en la fila correspondiente de la pestaña 1 - CAPTACIONES A.
        captacion_data es un dict con los campos extraídos:
        - phone, link, owner_name, property_type, bedrooms, price, location
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

        # Construcción de la fila de 16 columnas (A a P)
        row_data = [
            new_n,                                      # A: n
            date_str,                                   # B: FECHA DE CONTACTO
            clean_phone(phone),                        # C: CELULAR
            "TRUE",                                     # D: ARRIENDO
            "FALSE",                                    # E: VENTA
            link,                                       # F: LINK DEL INMUEBLE PUBLICADO
            "NUEVO",                                    # G: ESTADO DE LLAMADA
            captacion_data.get("property_type", ""),   # H: TIPO DE INMUEBLE
            captacion_data.get("owner_name", ""),      # I: NOMBRE DEL PROPIETARIO
            "", "", "", "",                             # J, K, L, M: Detalles seguimiento, Wha, % Oferta A, % Oferta V
            str(captacion_data.get("bedrooms", "")),   # N: habitaciones
            captacion_data.get("price", ""),           # O: VALOR DE PROMOCIÓN
            captacion_data.get("location", "")          # P: UBICACIÓN
        ]

        range_to_update = f"'{self.sheet_title}'!A{self.target_row_index}:P{self.target_row_index}"

        body = {
            "values": [row_data]
        }

        self.service.values().update(
            spreadsheetId=self.spreadsheet_id,
            range=range_to_update,
            valueInputOption="USER_ENTERED",
            body=body
        ).execute()

        print(f"[OK] REGISTRO GUARDADO EN GOOGLE SHEETS [Fila {self.target_row_index} | n: {new_n}] -> {captacion_data.get('owner_name')} | {phone} | {captacion_data.get('location')}")

        # Actualizar memoria interna
        if phone:
            self.existing_phones.add(clean_phone(phone))
        if link:
            self.existing_links.add(link.lower().strip())
        self.target_row_index += 1

        return True

if __name__ == "__main__":
    print("[TEST] Probando SheetsHandler...")
    handler = SheetsHandler()
    print("[TEST] Conexión y lectura exitosa de Google Sheets.")
