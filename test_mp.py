import urllib.request
import json

url = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec'
data = json.dumps({"accion": "crearPreferenciaPago", "cdr": "TEST-123"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'text/plain;charset=utf-8'}, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.URLError as e:
    print(f"Error: {e.reason}")
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
