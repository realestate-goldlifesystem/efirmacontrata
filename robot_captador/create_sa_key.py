"""
Materializa la credencial de la Service Account a partir del secreto GCP_SA_KEY.

La llave se lee UNICAMENTE del entorno. Antes existia una copia codificada en
base64 dentro de este mismo archivo como plan B, y eso tenia dos problemas:

  1. El repositorio es publico, asi que la llave privada quedo expuesta.
  2. Como el secreto GCP_SA_KEY nunca se habia creado, el robot llevaba todo el
     tiempo autenticandose con esa copia sin que nadie lo supiera. El plan B
     ocultaba el hecho de que el secreto faltaba.

Ahora, si el secreto falta o viene corrupto, el script falla de inmediato y con
un mensaje claro. Es preferible una corrida que se cae explicando el motivo a
una que "funciona" con una credencial que no es la que se cree.
"""

import os
import sys
import base64
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# El nombre del archivo se conserva porque config.py y las ~30 herramientas de
# _herramientas_locales/ lo buscan por este nombre exacto. Es solo una etiqueta:
# el contenido se reemplaza al rotar la llave.
KEY_FILENAME = "real-estate-ocr-468904-38d35bfd32d6.json"


def _validar(texto):
    """
    Confirma que el texto sea una credencial de Service Account utilizable.
    Devuelve los bytes a escribir, o None si no sirve.
    """
    try:
        from google.oauth2 import service_account
        datos = json.loads(texto)
        service_account.Credentials.from_service_account_info(datos)
        return texto.encode("utf-8"), datos
    except Exception:
        return None, None


def main():
    valor = os.environ.get("GCP_SA_KEY", "").strip()

    if not valor:
        print("[ERROR] Falta el secreto GCP_SA_KEY.")
        print("        Configuralo en: GitHub > Settings > Secrets and variables >")
        print("        Actions > Repository secrets, con el contenido completo del")
        print("        archivo .json de la Service Account.")
        sys.exit(1)

    # El secreto puede venir como JSON tal cual, o codificado en base64.
    datos_bytes, datos = _validar(valor)

    if datos_bytes is None:
        try:
            decodificado = base64.b64decode(valor).decode("utf-8")
            datos_bytes, datos = _validar(decodificado)
        except Exception:
            datos_bytes = None

    if datos_bytes is None:
        print("[ERROR] GCP_SA_KEY existe pero no es una credencial valida.")
        print("        Revisa que hayas pegado el archivo .json COMPLETO,")
        print("        desde la llave de apertura hasta la de cierre.")
        sys.exit(1)

    # Se informa con que identidad quedo, sin exponer la parte secreta.
    print(f"[OK] Credencial leida del secreto GCP_SA_KEY")
    print(f"     cuenta  : {datos.get('client_email', '(desconocida)')}")
    print(f"     proyecto: {datos.get('project_id', '(desconocido)')}")
    print(f"     key_id  : {str(datos.get('private_key_id', ''))[:8]}...")

    # Dos destinos: la raiz la usan las herramientas locales; robot_captador/ es
    # la que apunta config.SERVICE_ACCOUNT_PATH.
    destinos = [
        KEY_FILENAME,
        os.path.join("robot_captador", KEY_FILENAME),
    ]

    for ruta in destinos:
        carpeta = os.path.dirname(ruta)
        if carpeta:
            os.makedirs(carpeta, exist_ok=True)
        with open(ruta, "wb") as f:
            f.write(datos_bytes)
        print(f"[OK] Credencial escrita en: {ruta}")


if __name__ == "__main__":
    main()
