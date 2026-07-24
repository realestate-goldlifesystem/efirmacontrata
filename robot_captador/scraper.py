import sys
import re
import time
import json
import unicodedata
from playwright.sync_api import sync_playwright
import config
from sheets_handler import SheetsHandler

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def normalize_text(text):
    """Normaliza texto removiendo tildes y convirtiendo a minúsculas."""
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode("utf-8")
    return text.lower().strip()

def is_natural_person(owner_dict):
    """
    Determina si un anunciante corresponde a una Persona Natural (Propietario Directo).
    Evalúa la propiedad particular del API y la lista de exclusión.
    """
    if not owner_dict:
        return False, "Sin información de propietario"

    name = owner_dict.get("name", "").strip()
    is_part = owner_dict.get("particular", False)
    owner_type = str(owner_dict.get("type", "")).lower()

    norm_name = normalize_text(name)
    words = re.findall(r'\b\w+\b', norm_name)

    # 1. Verificar lista negra de palabras clave
    for keyword in config.EXCLUDED_KEYWORDS:
        norm_kw = normalize_text(keyword)
        if norm_kw in words or norm_kw in norm_name:
            return False, f"Inmobiliaria/Empresa detectada por palabra clave '{keyword}' en '{name}'"

    # 2. Verificar tipo 'inmobiliaria' en API
    if owner_type == "inmobiliaria":
        return False, f"Tipo registrado como 'inmobiliaria' en Fincaraiz: '{name}'"

    # 3. Si particular es True o el tipo es particular / directo
    if is_part or owner_type == "particular":
        return True, "Persona Natural / Propietario Directo"

    # Si no tiene nombre válido
    if not name or len(name) < 3:
        return False, "Nombre inválido o muy corto"

    return True, "Calificado como Persona Natural"

class FincaraizScraper:
    def __init__(self, headless=True, max_items_per_run=20):
        self.headless = headless
        self.max_items_per_run = max_items_per_run
        self.sheets = SheetsHandler()
        self.processed_count = 0

    def run(self):
        print(f"[START] Iniciando Robot Captador Fincaraiz (Headless: {self.headless})...")

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=self.headless,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                ]
            )

            context = browser.new_context(
                viewport={"width": 1366, "height": 768},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )

            page = context.new_page()

            for search_url in config.TARGET_URLS:
                if self.processed_count >= self.max_items_per_run:
                    print(f"[STOP] Límite máximo de {self.max_items_per_run} captaciones alcanzado.")
                    break

                print(f"\n🌐 [NAVEGANDO SEARCH] -> {search_url}")
                try:
                    page.goto(search_url, wait_until="networkidle", timeout=45000)
                    time.sleep(3)

                    # Obtener enlaces de inmuebles en el listado
                    listing_links = self.extract_listing_links(page)
                    print(f"📌 Encontrados {len(listing_links)} inmuebles en este listado.")

                    for link in listing_links:
                        if self.processed_count >= self.max_items_per_run:
                            break

                        # Verificación rápida de desduplicación por URL antes de navegar
                        if link.lower().strip() in self.sheets.existing_links:
                            print(f"[SKIP] Link ya registrado previamente en Google Sheets: {link}")
                            continue

                        print(f"\n🔍 [EVALUANDO INMUEBLE] -> {link}")
                        captacion_data = self.process_property(page, link)

                        if captacion_data:
                            saved = self.sheets.append_captacion(captacion_data)
                            if saved:
                                self.processed_count += 1
                                print(f"✨ Total captados exitosamente en esta sesión: {self.processed_count}")

                except Exception as e:
                    print(f"[ERROR] Fallo al procesar búsqueda {search_url}: {e}")

            browser.close()
            print(f"\n🎉 [FINALIZADO] Sesión terminada. Total inmuebles captados: {self.processed_count}")

    def extract_listing_links(self, page):
        """Extrae todas las URLs de los inmuebles en el listado actual."""
        links = []
        try:
            all_hrefs = page.eval_on_selector_all("a[href]", "elements => elements.map(e => e.getAttribute('href'))")
            for h in set(all_hrefs):
                if h and ("/apartaestudio-en-arriendo" in h or "/apartamento-en-arriendo" in h):
                    full_url = h if h.startswith("http") else f"https://www.fincaraiz.com.co{h}"
                    if full_url not in links:
                        links.append(full_url)
        except Exception as e:
            print(f"⚠️ Error extrayendo links: {e}")
        return links

    def process_property(self, page, property_url):
        """Navega al detalle, valida si es Persona Natural, extrae datos y obtiene teléfono."""
        captured_phone = []

        def on_response(response):
            try:
                if "graphql.fincaraiz.com.co" in response.url and response.status == 200:
                    body = response.json()
                    phones = body.get("data", {}).get("getPhones", {}).get("phones", [])
                    if phones:
                        captured_phone.append(phones[0])
            except Exception:
                pass

        handler_id = page.on("response", on_response)

        try:
            page.goto(property_url, wait_until="domcontentloaded", timeout=45000)
            time.sleep(2.5)

            # 1. Extraer datos de __NEXT_DATA__
            next_data = page.query_selector("#__NEXT_DATA__")
            if not next_data:
                print("⚠️ No se encontró __NEXT_DATA__ en el detalle.")
                return None

            props = json.loads(next_data.inner_text()).get("props", {}).get("pageProps", {})
            listing_data = props.get("data", {})
            owner_dict = listing_data.get("owner", {})

            owner_name = owner_dict.get("name", "Propietario Directo")

            # 2. Filtrar Persona Natural (Excluir Inmobiliarias)
            is_valid, reason = is_natural_person(owner_dict)
            if not is_valid:
                print(f"[RECHAZADO] {reason}")
                return None

            print(f"[ACEPTADO] '{owner_name}' -> {reason}")

            # 3. Extraer Datos del Inmueble
            title = listing_data.get("title", "")
            prop_type = "Apartaestudio" if "apartaestudio" in property_url.lower() else "Apartamento"

            # Precio
            price_val = listing_data.get("price", {})
            if isinstance(price_val, dict):
                amount = price_val.get("amount") or price_val.get("formatted") or price_val.get("price")
                price_str = f"$ {int(amount):,}".replace(",", ".") if isinstance(amount, (int, float)) else str(amount)
            else:
                price_str = str(price_val)

            # Habitaciones
            bedrooms = listing_data.get("bedrooms", "")
            if not bedrooms:
                if "1-habitacion" in property_url: bedrooms = "1"
                elif "2-habitaciones" in property_url: bedrooms = "2"
                elif "3-habitaciones" in property_url: bedrooms = "3"
                elif "4-habitaciones" in property_url: bedrooms = "4"
                else: bedrooms = "1"

            # Ubicación
            locations = listing_data.get("locations", {})
            zone = locations.get("zone", "")
            location_name = locations.get("location", "")
            city = locations.get("city", "Bogotá")

            if zone and location_name:
                location_str = f"{zone}, {location_name}, {city}"
            elif location_name:
                location_str = f"{location_name}, {city}"
            else:
                location_str = f"{city}"

            # 4. Diligenciar Formulario de Contacto
            self.fill_contact_form(page)

            # 5. Hacer clic en 'Ver teléfono' o 'Llamar' para desencadenar el API de teléfono
            btn = page.query_selector("button:has-text('Ver teléfono'), button:has-text('Llamar'), span:has-text('Ver teléfono'), a:has-text('Llamar')")
            if btn:
                btn.click(force=True)
                time.sleep(2.5)

            # 6. Extraer número capturado por GraphQL o del DOM
            phone_num = ""
            if captured_phone:
                phone_num = captured_phone[0]
            else:
                # Buscar en el DOM
                all_text = page.evaluate("() => document.body.innerText")
                match = re.search(r'(?:\+?57)?\s*(3\d{2}[\s.-]?\d{3}[\s.-]?\d{4})', all_text)
                if match:
                    phone_num = match.group(1)

            if not phone_num:
                print("⚠️ No se pudo obtener el número telefónico de contacto.")
                return None

            print(f"📞 Teléfono verificado: {phone_num}")

            return {
                "owner_name": owner_name,
                "phone": phone_num,
                "link": property_url,
                "property_type": prop_type,
                "bedrooms": bedrooms,
                "price": price_str,
                "location": location_str
            }

        except Exception as e:
            print(f"[ERROR] Excepción procesando {property_url}: {e}")
            return None

    def fill_contact_form(self, page):
        """Diligencia el formulario de contacto con los datos del lead."""
        try:
            name_in = page.query_selector("input[name*='name'], input[placeholder*='Nombre']")
            if name_in: name_in.fill(config.LEAD_NAME)

            phone_in = page.query_selector("input[name*='phone'], input[placeholder*='Teléfono'], input[placeholder*='Celular']")
            if phone_in: phone_in.fill(config.LEAD_PHONE)

            email_in = page.query_selector("input[name*='email'], input[placeholder*='Correo']")
            if email_in: email_in.fill(config.LEAD_EMAIL)

            msg_in = page.query_selector("textarea[name*='message'], textarea[placeholder*='Mensaje']")
            if msg_in: msg_in.fill(config.LEAD_MESSAGE)

            chk = page.query_selector("input[type='checkbox']")
            if chk and not chk.is_checked():
                chk.check(force=True)

        except Exception:
            pass

if __name__ == "__main__":
    scraper = FincaraizScraper(headless=True, max_items_per_run=5)
    scraper.run()
