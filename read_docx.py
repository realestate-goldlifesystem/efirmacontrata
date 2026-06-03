import docx
import sys

file_name = "BORRADOR Contrato de Vivienda de {{NOMBRE-PROPIETARIO}} - {{AÑO VIGENTE}}.docx"

try:
    doc = docx.Document(file_name)
    for i, para in enumerate(doc.paragraphs):
        if "CODEUDOR" in para.text:
            print(f"[{i}]: {para.text}")
except Exception as e:
    print("Error:", e)
