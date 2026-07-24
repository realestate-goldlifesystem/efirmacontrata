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
B64_FALLBACK = "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAicmVhbC1lc3RhdGUtb2NyLTQ2ODkwNCIsCiAgInByaXZhdGVfa2V5X2lkIjogIjM4ZDM1YmZkMzJkNjdkY2ExMzgzZjA1N2FkN2NjYjY3ZWE4NTczMGUiLAogICJwcml2YXRlX2tleSI6ICItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRQ3pVUjBTeUJjR1lnSkRcbm44TS9WOUtPUll6aXMveGN1anpGQ2Z6YmJyM2hIYmJHRDl6T1YxejNQSmpNbkFvMFprdTJkeVMrVm95NndaQWN2XG5QV0w2TGZkWUxRK3ViWjBGNnhRTSsxVkZDZU1nbFBVOWpUNE9tbFlwbENpYWoxbVFzT0ZhNHJ2VytBOW16QmN0XG5DNVRLTWxKc3FtbEFmSWY2bjcrY0hGdXhiV1ZheVo0dloyZm9kUDRNc3ZkazM0K1lUV0psbnBueUpJNVVKYysxXG5uKzBvQ2pMMW95bi81RGM3dkx0SXp2T2ZDWlFkbkRqM00vTlVZOFFwSzNyZDEyM0h0L09hcXFYd0NodFpXeUhQXG5Qb3g2MFRlSGhyYWovL1RLcDl3T1V6MFRzakhKZndseExDb0tOWElWMWM1ajhaclpZN0NRWFhMM1J1UHFTM2F4XG41MVRJSGxQTkFnTUJBQUVDZ2dFQVJ2d0R0Vm1wRHkxSjk4UzcyQTJSZzRRdUE4TlJyMmhvdkRJTHlRaHlham5cblhsWEVBbnVmK0xwbkFualVrWHlqK3RQVE5mblF1RHdJeWc4VGVQVXNWcWdUN3BsdTBSSnpzQVhvaGZsNWc0TGtcbktEY2JDMTNXWVFSSkpKSTl3dlQ2YU9lYnMyZ2tkSzJ6T1A0K0t1TEwxVCtLaGVBbVZqVFovYnNPSTBrcWw4clJcbjJtenMvL0gvbjk4RGxQMEY3Y3V3RUxCNHUvVW4zNjUzK2VtRStRUzBjNlliNCtRQ2pCaUl6S0w5Y2kyVnh1SUVcblVRdm00REpmcEZqVVhzMjk1Q0JKcGY4ZU5paTlSR1dqNUUwOGU0UGg4RHg1UXp2M21YSW9hdm5lV2lrZlR2SXdcbm05dFNzQ0k1NC9FMy9RditDWHlmTVVkNmlycGNFNDdvNi9RTUxhOWpRd0tCZ1FEYkp5TDk0LzQvczJqYVBGdnFcblJUMEtHeUR4OEFMWkc5QTZBK2lsd09RcXA2NnhHM0FQQytST2VzdkdGUHMzZmpZcXExNWQ2eDJ5Wi9tbDJ2QjkxXG5HcCtETTNtL1BEU0VEYTR2VDF1WFNFNGo4cWhUd2NwSXFkdDkvTmhXNnB4dU5JcEhRaHhlWWM2clh3NWp6WVplXG52VXFpL0ZBWFdIdkN2SDBSMDlnT0FKY0VKd0tCZ1FEUmQxYk8zWlNodm5EZFNrdC8vMFJlUkZ1VzB4bE9xdkFwXG4vZkNjQXdDZlExRGU1VVpDVmtNR3kvak9aTzNRWVRjUVR2dS9qVTJ2ZGhaZlFMSms3MU16N1QxY3BhbzZnNkYxXG5Za21WTzRIMlA3alpsWFpQekVGUWl4MTRLOGkzMVhTbG9HV0xaVURaa2Ixb0IzeW52R0FzQnBrMmpqakpBMFJrXG5GRkVrTWpUYzZ3S0JnRVpnZlJZM2YxQ0psdVJ1ZWIzejJqUkNuZ1BUNWJZKy9sR0RLOVQrNnNiZjduT2xzZ2pDXG5uOHVCWkF0TnJyWGtXcU9KOU5ZSVNSTWYzTVhzVjBxeFNqbU1keHIwbzRseDk0REFGTmc2UkE3YjdtQjY5bnU1U1xuemMvWndNZTRzOStZTThmS2JUM0ovd3A5aml0eXR2SDVxOXhIVnBrSXEwWFFMZ0hwbS9wektnd0ZBb0dBYkdxcFxuZXI4RGpFZ200Tkx3aXhxVHgzcjRNUE9vZUtoUFVGeklxZWQvN2U4SXI2WGFITUhMUlh4VGxuaDFBdE1lamdsalxua2p6UUJjNUlQQnNmZXRESXJ1clBST0hXWHh6OGQrWmNrYXBRVlNXY1JycHVsMVR3UllFTHlzUld5cGZvSFVZTVxuNlA2S2QxSlF4OFNBUjgxZnRjbmdpWFZKZlBsODc1UDRmNVNnK2VzQ2dZRUEwak5iVUhuQ09JVjB1ekdua1UwQVxuejNiazhqb2YvU2MxU1UwdEo5bnFHNjZtYnUxaWx1b1lOWFpMUnJzOGprNWd3aVF2c1NYSDVURTRBSVg1RjhSblxuaihzSWJxZUJrRU9uTHg4YjM3T291ZTFGUHIwWVJiMUlzeW5CZW5aUE55M3UrbTVESFBqQWdhbjUyMXB1Wm14U1xuSmtEcUpPSEdidCt2YmlXeEpyUlNyNDg9XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLAogICJjbGllbnRfZW1haWwiOiAib2NyLXZpc2lvbkByZWFsLWVzdGF0ZS1vY3ItNDY4OTA0LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAiY2xpZW50X2lkIjogIjEwMjUwMzk3NTgwMzU2NDA0MzY4NCIsCiAgImF1dGhfdXJpIjogImh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwKICAidG9rZW5fdXJpIjogImh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwKICAiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92MS9jZXJ0cyIsCiAgImNsaWVudF94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92MS9tZXRhZGF0YS94NTA5L29jci12aXNpb24lNDByZWFsLWVzdGF0ZS1vY3ItNDY4OTA0LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAidW5pdmVyc2VfZG9tYWluIjogImdvb2dsZWFwaXMuY29tIgp9"

def main():
    key_env = os.environ.get("GCP_SA_KEY", "").strip()
    data_bytes = None

    if key_env:
        try:
            json.loads(key_env)
            data_bytes = key_env.encode("utf-8")
        except Exception:
            try:
                decoded = base64.b64decode(key_env).decode("utf-8")
                json.loads(decoded)
                data_bytes = decoded.encode("utf-8")
            except Exception:
                print("[WARN] GCP_SA_KEY env provided but invalid, falling back to built-in JSON.")

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
