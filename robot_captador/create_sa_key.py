import os
import sys
import base64
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# This base64 string is exactly 3176 characters long (multiple of 4) and decodes successfully to the fallback JSON
B64_FALLBACK = "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAicmVhbC1lc3RhdGUtb2NyLTQ2ODkwNCIsCiAgInByaXZhdGVfa2V5X2lkIjogIjM4ZDM1YmZkMzJkNjdkY2ExMzgzZjA1N2FkN2NjYjY3ZWE4NTczMGUiLAogICJwcml2YXRlX2tleSI6ICItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRQ3pVUjBTeUJjR1lnSkRcbjhNL1Y5S09SWXppcy94Y3VqekZDZnpiYnIzaEhiYkdEOXpPVjF6M1BKak1uQW8wWmt1MmR5UytWb3k2d1pBY3ZcblBXTDZMZmRZTFErdWJaMEY2eFFNKzFWRkNlTWdsUFU5alQ0T21sWXBsQ2lhajFtUXNPRmE0cnZXK0E5bXpCY3RcbkM1VEtNbEpzcW1sQWZJZjZuNytjSEZ1eGJXVmF5WjR2WjJmb2RQNE1zdmRrMzQrWVRXSmxucG55Skk1VUpjKzFcbiswb0NqTDFveW4vNURjN3ZVTHRJenZPZkNaUWRuRGozTS9OVVk4UXBLM3JkMTIzSHQvT2FxcVh3Q2h0Wld5SFBcblBveDYwVGVIaHJhai8vVEtwOXdPVXowVHNqSEpmd2x4TENvS05YSVYxYzVqOFpyWlk3Q1FYWEwzUnVQcVMzYXhcbjUxVElIbFBOQWdNQkFBRUNnZ0VBUnZ3RHRkVW1wRHkxSjk4UzcyQTJSZzRRdUE4TlJyMmhvdkRJTHlRaHlham5cblhsWEVBbnVmK0xwbkFualVrWHlqK3RQVE5mblF1RHdJeWc4VGVQVXNWcWdUN3BsdTBSSnpzQVhvaGZsNWc0TGtcbktEY2JDMTNXWVFSSkpKSTl3dlQ2YU9lYnMyZ2tkSzJ6T1A0K0t1TEwxVCtLaGVBbVZqVFovYnNPSTBrcWw4clJcbjJtenMvL0gvbjk4RGxQMEY3Y3V3RUxCNHUvVW4zNjUzK2VtRStRUzBjNlliNCtRQ2pCaUl6S0w5Y2kyVnh1SUVcblVRdm00REpmcEZqVVhzMjk1Q0JKcGY4ZU5paTlSR1dqNUUwOGU0UGg4RHg1UXp2M21YSW9hdm5lV2lrZlR2SXdcbm05dFNzQ0k1NC9FMy9RditDWHlmTVVkNmlycGNFNDdvNi9RTUxhOWpRd0tCZ1FEYkp5TDk0LzQvczJqYVBGdnFcblJUMEtHeUR4OEFMWkc5QTZBK2lsd09RcXA2NnhHM0FQQytST2VzdkdGUHMzZmpZcTE1ZDZ4MnlaL21sMnZCOTFcbkdwK0RNM20vUERTRURhNHZUMXVYU0U0ajhxaFR3Y3BJcWR0OS9OaFc2cHh1TklwSFFoeGVZYzZyWHc1anpZWmVcbnZVcWkvRkFYV0h2Q3ZIMFIwOWdPQUpjRUp3S0JnUURSZDFiTzNaU2h2bkRkU2t0Ly8wUmVSRnVXMHhsT3F2QXBcbi9mQ2NBd0NmUTFEZTVVWkNWa01HeS9qT1pPM1FZVGNRVHZ1L2pVMnZkaFpmUUxKazcxTXo3VDFjcGFvNmc2RjFcbllrbVZPNEgyUDdqWmxYWlB6RUZRaXgxNEs4aTMxWFNsb0dXTFpVRFprYjFvQjN5bnZHQXNCcGsyampqSkEwUmtcbkZGRWtNalRjNndLQmdFWmdmUlkzZjFDSmx1UnVlYjN6MmpSQ25nUFQ1YlkrL2xHREs5VCs2c2JmN25PbHNnakNcbjh1QlpBdE5yclhrV3FPSjlOWUlTUk1mM01Yc1YwcXhTam1NZHhyMG80bHg5NERBRk5nNlJBN2I3bUI2OW51NVNcbnpjL1p3TWU0czkrWU04ZktiVDNKL3dwOWppdHl0dkg1cTl4SFZwa0lxMFhRTGdIcG0vcHpLZ3dGQW9HQWJHcXBcbmVyOERqRWdtNE5Md2l4cVR4M3I0TVBPb2VLaFBVRnpJcWVkLzdlOElyNlhhSE1ITFJYeFRsbmgxQXRNZWpnbGpcbmtqelFCYzVJUEJzZmV0RElydXJQUk9IV1h4ejhkK1pja2FwUVZTV2NScnB1bDFUd1JZRUx5c1JXeXBmb0hVWU1cbjZQNktkMUpReDhTQVI4MWZ0Y25naVhWSmZQbDg3NVA0ZjVTZytlc0NnWUVBMGpOYlVIbkNPSVYwdXpHbmtVMEFcbnozYms4am9mL1NjMVNVMHRKOW5xRzY2bWJ1MWlsdW9ZTlhaTFJyczhqazVnd2lRdnNTWEg1VEU0QUlYNUY4Um5cbmloc0licWVCa0VPbkx4OGIzN09vdWUxRlByMFlSYjFJeHluQmVuWlBOeTN1K201REhQakFnYW41MjFwdVpteFNcbkprRHFKT0hHYnQrdmJpV3hKclJTcjQ4PVxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwKICAiY2xpZW50X2VtYWlsIjogIm9jci12aXNpb25AcmVhbC1lc3RhdGUtb2NyLTQ2ODkwNC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgImNsaWVudF9pZCI6ICIxMDI1MDM5NzU4MDM1NjQwNDM2ODQiLAogICJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsCiAgInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsCiAgImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLAogICJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L29jci12aXNpb24lNDByZWFsLWVzdGF0ZS1vY3ItNDY4OTA0LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAidW5pdmVyc2VfZG9tYWluIjogImdvb2dsZWFwaXMuY29tIgp9"

def main():
    key_env = os.environ.get("GCP_SA_KEY", "").strip()
    data_bytes = None

    if key_env:
        try:
            from google.oauth2 import service_account
            data = json.loads(key_env)
            service_account.Credentials.from_service_account_info(data)
            data_bytes = key_env.encode("utf-8")
        except Exception:
            try:
                from google.oauth2 import service_account
                decoded = base64.b64decode(key_env).decode("utf-8")
                data = json.loads(decoded)
                service_account.Credentials.from_service_account_info(data)
                data_bytes = decoded.encode("utf-8")
            except Exception:
                print("[WARN] GCP_SA_KEY env provided but invalid or corrupted PEM key, falling back to built-in JSON.")

    if not data_bytes:
        data_bytes = base64.b64decode(B64_FALLBACK)

    target_paths = [
        "real-estate-ocr-468904-38d35bfd32d6.json",
        os.path.join("robot_captador", "real-estate-ocr-468904-38d35bfd32d6.json")
    ]

    for path in target_paths:
        dir_name = os.path.dirname(path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data_bytes)
        print(f"[OK] Created Service Account key at: {path}")

if __name__ == "__main__":
    main()
