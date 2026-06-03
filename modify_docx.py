import docx
import os

file_name = "BORRADOR Contrato de Vivienda de {{NOMBRE-PROPIETARIO}} - {{AÑO VIGENTE}}.docx"

doc = docx.Document(file_name)

for para in doc.paragraphs:
    if "{{NOMBRE-CODEUDOR}}" in para.text:
        para.text = "{{PARRAFO-CODEUDOR-1}}"
    elif "{{NOMBRE-CODEUDOR 2}}" in para.text:
        para.text = "{{PARRAFO-CODEUDOR-2}}"
    elif "{{NOMBRE-CODEUDOR 3}}" in para.text:
        para.text = "{{PARRAFO-CODEUDOR-3}}"

doc.save(file_name)
print("Docx modified successfully.")
