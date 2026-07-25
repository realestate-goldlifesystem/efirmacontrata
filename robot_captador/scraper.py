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

    excluded_kw = getattr(config, "KEYWORD_BLACKLIST", getattr(config, "EXCLUDED_KEYWORDS", []))
    for keyword in excluded_kw:
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

def _first_name(value):
    """
    Devuelve el 'name' de un nodo de ubicación de Fincaraiz.
    Los nodos vienen como lista de objetos ([{'id':.., 'name':..}]) o como objeto suelto.
    """
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict) and item.get("name"):
                return str(item["name"]).strip()
    elif isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    return ""

def extract_location(locations):
    """
    Arma la ubicación legible a partir del nodo 'locations' del inmueble.

    Estructura real de Fincaraiz:
        locations = {
            'location_main': {'name': 'El redil', 'location_type': 'neighbourhood'},
            'neighbourhood': [{'name': 'La granja norte'}, ...],
            'locality':      [{'name': 'Usaquen'}],
            'city':          [{'name': 'Bogotá'}],
            'zone':          [{'name': 'Zona norte'}], ...
        }

    Antes el código buscaba las claves 'location' y 'zone' como si fueran texto:
    'location' no existe y 'city' es una LISTA, así que terminaba escribiendo el
    volcado crudo del objeto en la hoja (`[{'id': '65d441f3-...`).
    Ahora se prioriza el BARRIO, que es el dato útil para prospectar.
    """
    if not isinstance(locations, dict):
        return _first_name(locations) or "Bogotá"

    barrio = _first_name(locations.get("location_main")) or _first_name(locations.get("neighbourhood"))
    localidad = _first_name(locations.get("locality")) or _first_name(locations.get("zone"))
    ciudad = _first_name(locations.get("city")) or "Bogotá"

    partes = [p for p in (barrio, localidad) if p]
    if not partes:
        return ciudad
    return ", ".join(partes)

class FincaraizScraper:
    def __init__(self, headless=True, max_items_per_run=30, mode="arriendo", bedrooms="all"):
        self.headless = headless
        self.max_items_per_run = max_items_per_run
        self.mode = str(mode).lower()
        self.bedrooms = str(bedrooms).lower()
        self.sheets = SheetsHandler(mode=self.mode)
        self.target_urls = config.get_target_urls(self.mode, self.bedrooms)
        self.processed_count = 0
        # Contadores de diagnóstico de la sesión
        self.pages_visited = 0
        self.listings_seen = 0
        self.skipped_agency = 0
        self.skipped_dup = 0

    def run(self):
        print(f"[START] Iniciando Robot Captador Fincaraiz | MODO: {self.mode.upper()} | Pestaña: {self.sheets.sheet_title} (Headless: {self.headless})...")

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
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                locale="es-CO",
                extra_http_headers={
                    "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
                }
            )

            page = context.new_page()

            for base_url in self.target_urls:
                if self.processed_count >= self.max_items_per_run:
                    print(f"[STOP] Límite máximo de {self.max_items_per_run} captaciones alcanzado.")
                    break
                self.scrape_search(page, base_url)

            browser.close()
            print(f"\n🎉 [FINALIZADO] Sesión terminada.")
            print(f"   Páginas de listado recorridas : {self.pages_visited}")
            print(f"   Anuncios vistos en listados   : {self.listings_seen}")
            print(f"   Descartados por inmobiliaria  : {self.skipped_agency}")
            print(f"   Descartados por duplicado     : {self.skipped_dup}")
            print(f"   ✅ Inmuebles captados          : {self.processed_count}")

    def build_page_url(self, base_url, page_num):
        """Construye la URL de la página N respetando el query string (formato Fincaraiz: /paginaN)."""
        if page_num == 1:
            return base_url
        if "?" in base_url:
            path_part, query_part = base_url.split("?", 1)
            return f"{path_part}/pagina{page_num}?{query_part}"
        return f"{base_url}/pagina{page_num}"

    def fetch_listing_page(self, page, base_url, page_num):
        """
        Carga una página del listado con un reintento.
        Devuelve (items, paginatorInfo), o (None, {}) si la página falló.
        Ojo: [] es una respuesta válida (página vacía), None es un fallo de red.
        """
        url = self.build_page_url(base_url, page_num)
        for attempt in (1, 2):
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=45000)
                time.sleep(1.5)
                return self.extract_listings(page)
            except Exception as e:
                if attempt == 2:
                    print(f"[ERROR] Pág {page_num} falló tras 2 intentos ({type(e).__name__}: {e})")
                    return None, {}
                time.sleep(2)
        return None, {}

    def harvest_page(self, page, items, page_num, last_page, page_url=""):
        """
        Procesa los particulares de una página ya cargada.
        Devuelve False si se alcanzó el límite de captaciones de la corrida.
        """
        candidates = self.filter_particulares(items)
        print(f"\n🌐 Pág {page_num}/{last_page} | {len(items)} anuncios → {len(candidates)} de particulares")

        # Dejar el link de la página en el log: permite abrirla a mano y ver
        # exactamente de dónde salieron estos propietarios.
        if candidates and page_url:
            print(f"   🔗 Página con particulares: {page_url}")

        for link in candidates:
            if self.processed_count >= self.max_items_per_run:
                return False

            if link.lower().strip() in self.sheets.existing_links:
                print(f"[SKIP] Link ya registrado en Google Sheets: {link}")
                self.skipped_dup += 1
                continue

            print(f"\n🔍 [EVALUANDO INMUEBLE] -> {link}")
            captacion_data = self.process_property(page, link)

            if captacion_data and self.sheets.append_captacion(captacion_data):
                self.processed_count += 1
                print(f"✨ Total captados en esta sesión: {self.processed_count}")

        return True

    def scrape_search(self, page, base_url):
        """
        Recorre una búsqueda DE ATRÁS HACIA ADELANTE (última página → página 1).

        Por qué al revés: Fincaraiz ordena por "Popularidad", que empuja los
        anuncios de inmobiliarias al principio y deja a los particulares al final.
        Medido en vivo: en venta/suba/3-habitaciones los 15 particulares están en
        las páginas 97 y 98 de 98; en arriendo/usaquen/2-habitaciones, 16 de los
        63 están en la página 25 de 25.

        No hace falta sondear para encontrar el final: paginatorInfo.lastPage
        viene en el JSON de cualquier página, así que la página 1 (que igual hay
        que procesar) nos dice cuántas hay y de ahí se salta directo al final.
        La barra de paginación de la web solo muestra hasta 50, pero es cosmética.
        """
        print(f"\n{'─'*70}\n🔎 [BÚSQUEDA] {base_url}")

        # --- Paso 1: la página 1 nos da lastPage y sus propios anuncios ---
        items, paginator = self.fetch_listing_page(page, base_url, 1)
        if items is None:
            print("[ABORT] No se pudo cargar la página 1. Se omite esta búsqueda.")
            return
        if not items:
            print("🏁 Sin resultados en esta búsqueda.")
            return

        self.pages_visited += 1
        self.listings_seen += len(items)

        last_page = paginator.get("lastPage") or 1
        print(f"📊 {paginator.get('total')} anuncios en {last_page} páginas reales "
              f"(la web solo muestra hasta 50). Se recorre de la {last_page} hacia la 1.")

        if not self.harvest_page(page, items, 1, last_page, self.build_page_url(base_url, 1)):
            print(f"[STOP] Límite de {self.max_items_per_run} captaciones alcanzado.")
            return

        # --- Paso 2: descender desde la última página hasta la 2 ---
        page_num = last_page
        consecutive_errors = 0
        guard = 0

        while page_num >= 2 and guard < config.MAX_PAGES_PER_SEARCH:
            guard += 1

            if self.processed_count >= self.max_items_per_run:
                print(f"[STOP] Límite de {self.max_items_per_run} captaciones alcanzado.")
                return

            items, paginator = self.fetch_listing_page(page, base_url, page_num)

            if items is None:
                consecutive_errors += 1
                if consecutive_errors >= config.PAGE_ERROR_TOLERANCE:
                    print(f"[ABORT] {consecutive_errors} páginas seguidas con error. Se abandona esta búsqueda.")
                    return
                page_num -= 1  # Se salta la página en vez de abortar la búsqueda
                continue

            consecutive_errors = 0

            # Página vacía yendo hacia atrás NO significa fin: el inventario se
            # movió entre requests. El propio sitio nos dice dónde está el nuevo
            # final, así que saltamos allá en vez de bajar de a una.
            if not items:
                real_last = paginator.get("lastPage")
                if real_last and real_last < page_num:
                    print(f"⤵️ Pág {page_num} vacía; el sitio ahora reporta {real_last} páginas. Saltando allá.")
                    page_num = real_last
                else:
                    page_num -= 1
                continue

            self.pages_visited += 1
            self.listings_seen += len(items)

            if not self.harvest_page(page, items, page_num, last_page, self.build_page_url(base_url, page_num)):
                print(f"[STOP] Límite de {self.max_items_per_run} captaciones alcanzado.")
                return

            page_num -= 1

        if guard >= config.MAX_PAGES_PER_SEARCH:
            print(f"[STOP] Tope de seguridad de {config.MAX_PAGES_PER_SEARCH} páginas alcanzado.")
        else:
            print(f"🏁 Búsqueda completa: se recorrió hasta la página 1.")

    def extract_listings(self, page):
        """
        Lee los anuncios del listado desde el JSON embebido (__NEXT_DATA__).

        Cada item ya trae owner.particular, owner.name, link, precio, habitaciones
        y ubicación, lo que permite descartar inmobiliarias SIN abrir el detalle.
        Devuelve (items, paginatorInfo).
        """
        try:
            node = page.query_selector("#__NEXT_DATA__")
            if node:
                data = json.loads(node.inner_text())
                search_fast = (
                    data.get("props", {})
                        .get("pageProps", {})
                        .get("fetchResult", {})
                        .get("searchFast", {})
                ) or {}
                return search_fast.get("data") or [], search_fast.get("paginatorInfo") or {}
        except Exception as e:
            print(f"⚠️ No se pudo leer el JSON del listado ({e}). Se usa el DOM como respaldo.")

        # Respaldo: raspar enlaces del DOM si el JSON cambió de forma
        return [{"link": l} for l in self.extract_listing_links(page)], {}

    def filter_particulares(self, items):
        """
        Deja solo los anuncios de particulares usando los datos del propio listado.
        Evita abrir el detalle de las inmobiliarias (que son ~80% del inventario).
        """
        links = []
        for item in items:
            link = item.get("link") or ""
            if not link:
                continue
            full_url = link if link.startswith("http") else f"https://www.fincaraiz.com.co{link}"

            owner = item.get("owner") or {}
            if config.STRICT_PARTICULAR_FILTER and owner:
                if owner.get("particular") is not True:
                    self.skipped_agency += 1
                    continue
                # Segunda capa: nombre con términos comerciales pese a venir como particular
                is_valid, reason = is_natural_person(owner)
                if not is_valid:
                    print(f"[FILTRO] {reason}")
                    self.skipped_agency += 1
                    continue

            if full_url not in links:
                links.append(full_url)
        return links

    def extract_listing_links(self, page):
        """Extrae todas las URLs de los inmuebles en el listado actual."""
        links = []
        try:
            all_hrefs = page.eval_on_selector_all("a[href]", "elements => elements.map(e => e.getAttribute('href'))")
            for h in set(all_hrefs):
                if h and ("/apartaestudio-en-" in h or "/apartamento-en-" in h):
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

        page.on("response", on_response)

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
            if not bedrooms or bedrooms == "0":
                if "1-habitacion" in property_url: bedrooms = "1"
                elif "2-habitaciones" in property_url: bedrooms = "2"
                elif "3-habitaciones" in property_url: bedrooms = "3"
                elif "4-habitaciones" in property_url: bedrooms = "4"
                elif "5-habitaciones" in property_url: bedrooms = "5"
                else: bedrooms = "1"

            # Ubicación (barrio, localidad)
            location_str = extract_location(listing_data.get("locations", {}))

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

            # Desduplicación por celular APENAS se conoce el número, antes de
            # seguir procesando. Un mismo propietario suele publicar varios
            # inmuebles con links distintos, así que el filtro por link no basta.
            is_dup, dup_reason = self.sheets.is_duplicate(phone_num, property_url)
            if is_dup:
                print(f"[SKIP] Propietario ya registrado -> {dup_reason}")
                self.skipped_dup += 1
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
            print(f"⚠️ [AVISO] Inmueble omitido (no disponible o tiempo de espera agotado): {property_url}")
            return None
        finally:
            try:
                page.remove_listener("response", on_response)
            except Exception:
                pass

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
    import argparse
    parser = argparse.ArgumentParser(description="Robot Captador Fincaraiz")
    parser.add_argument("--mode", choices=["arriendo", "venta"], default="arriendo", help="Modo de captación (arriendo o venta)")
    parser.add_argument("--bedrooms", default="all", help="Filtro de habitaciones (1, 2, 3, 4, 5, all)")
    parser.add_argument("--max-items", type=int, default=30, help="Límite máximo de inmuebles a captar POR tipo de habitación")
    parser.add_argument("--max-pages", type=int, default=None,
                        help=f"Salvaguarda de páginas por búsqueda (default: {config.MAX_PAGES_PER_SEARCH}). "
                             "Normalmente no se toca: el robot recorre desde la última página "
                             "real de cada búsqueda hacia la 1.")
    args = parser.parse_args()

    if args.max_pages:
        config.MAX_PAGES_PER_SEARCH = args.max_pages

    b_str = str(args.bedrooms).lower().strip()
    if b_str in ["all", "todas", "0", ""]:
        # Modo TODAS: Ejecutar 30 por cada tipo de habitación (1 a 5)
        grand_total = 0
        for bedroom_type in ["1", "2", "3", "4", "5"]:
            print(f"\n{'='*60}")
            print(f"🏠 INICIANDO BARRIDO DE {bedroom_type} HABITACIÓN(ES) | Máx: {args.max_items}")
            print(f"{'='*60}")
            scraper = FincaraizScraper(headless=True, max_items_per_run=args.max_items, mode=args.mode, bedrooms=bedroom_type)
            scraper.run()
            grand_total += scraper.processed_count
        print(f"\n{'='*60}")
        print(f"🎯 GRAN TOTAL CAPTADO EN TODAS LAS HABITACIONES: {grand_total}")
        print(f"{'='*60}")
    else:
        # Modo específico: Solo un tipo de habitación con max_items
        scraper = FincaraizScraper(headless=True, max_items_per_run=args.max_items, mode=args.mode, bedrooms=args.bedrooms)
        scraper.run()
