# Módulo Contrato – Documentación (Versión inicial corta)

## 1. Objetivo
Centralizar flujo: consolidar datos (formularios + hoja), generar borrador, gestionar aprobaciones, subir contrato final autenticado.

## 2. Placeholders (exactos en plantilla)
Identificación/Inmueble:
{{DIRECCION-DEL-INMUEBLE-DEL-FOLIO-DE-MATRICULA}}, {{DEPARTAMENTO-INMUEBLE}}, {{MUNICIPIO-INMUEBLE}}, {{VEREDA-INMUEBLE}}, {{OFICINA-DE-REGISTRO-PUBLICO}}

Partes:
{{NOMBRE-PROPIETARIO}}, {{NUMERO-DOCUMENTO-PROPIETARIO}}, {{EMAIL-PROPIETARIO}}, {{CELULAR-PROPIETARIO}}
{{NOMBRE-INQUILINO}}, {{NUMERO-DOCUMENTO-INQUILINO}}, {{EMAIL-INQUILINO}}, {{CELULAR-INQUILINO}}

Codeudores:
{{NOMBRE-CODEUDOR}}, {{NOMBRE-CODEUDOR-2}}, {{NOMBRE-CODEUDOR-3}}
{{NUMERO-DE-DOCUMENTO-CODEUDOR}}, {{NUMERO-DE-DOCUMENTO-CODEUDOR-2}}, {{NUMERO-DE-DOCUMENTO-CODEUDOR-3}}
{{EMAIL-CODEUDOR}}, {{EMAIL-CODEUDOR-2}}, {{EMAIL-CODEUDOR-3}}
{{CELULAR-CODEUDOR}}, {{CELULAR-CODEUDOR-2}}, {{CELULAR-CODEUDOR-3}}
{{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR}}, {{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-2}}, {{PAIS-DE-EXPEDICION-DOCUMENTO-CODEUDOR-3}}

Fechas vigencia:
{{AÑO-VIGENTE}}, {{MES-VIGENTE}}, {{DIA-VIGENTE}}, {{últimos dos digitos del año vigente}}

Duración:
{{numero-de-meses-del-contrato-en-numero}}, {{numero-de-meses-del-contrato-en-letra}}

Económicos:
{{PRECIO-DEL-CANON-EN-NUMERO}}, {{PRECIO-DE-ADMIN-EN-NUMERO}}, {{numero-de-solicitud-del-aprobado}}

Bancarios:
{{TIPO-DE-CUENTA-BANCARIA}}, {{NUMERO-DE-CUENTA-BANCARIA}}, {{NOMBRE-DEL-BANCO}}, {{NOMBRE-DEL-DUEÑO-DE-LA-CUENTA-BANCARIA}}, {{NUMERO-DE-DOCUMENTO-DEL-DUEÑO-DE LA CUENTA}}

Servicios (solo si seleccionados / todos “a cargo del inquilino”):
{{Acueducto}}, {{gas}}, {{luz}}, {{telefono}}, {{caldera}}

Regex extracción (JS):
/\{\{([A-Z0-9Ñ]+(?:-[A-Z0-9Ñ]+)*)\}\}/g

Reglas:
- Solo MAYÚSCULAS, dígitos, Ñ y guiones medios internos.
- No espacios salvo el caso histórico “DEL DUEÑO ...” (mantener exactamente).

## 3. Estados del contrato
DATOS_INCOMPLETOS → LISTO_PARA_BORRADOR → BORRADOR-GENERADO → (CORRECCION_SOLICITADA ↺) → APROBADO_TOTAL → FINALIZADO

## 4. Deadlines
Formulario Inquilino: 24h  
Formulario Propietario: 72h  
Generar borrador tras validación completa: 24h (interno)  
Aprobación / correcciones: 48h por parte  
Subir original autenticado: manual después de APROBADO_TOTAL  

Campos tiempo (meta):
fechaEnvioLinkInq, fechaEnvioLinkProp, fechaValidacionCompleta, fechaEnvioBorrador, fechaAprobacionTotal

## 5. Endpoints (plan)

Existentes (mantener nombres reales):
- GET verificarLink?cdr=&tipo=... → {success, activo, mensaje}
- POST procesarFormularioInquilino → {success, message, codigo?}
- POST procesarFormularioPropietario → idem
- GET test → diagnóstico

Nuevos:
1. GET obtenerDatosContrato?cdr=  
   Respuesta: {success, data:{placeholders:..., faltantes:[]}, estado}
2. POST generarContrato  
   Body: {cdr, plantillaDocId, forzar?}  
   Respuesta: {success, version, docId, pdfUrl, faltantes:[]}
3. POST registrarAprobacionContrato  
   Body: {cdr, parte, accion, comentarios?}  
   Respuesta: {success, estadoParte, estadoGlobal}
4. GET obtenerEstadoAprobaciones?cdr=  
   Respuesta: {success, partes:[{parte, estado, fecha, comentarios?}], estadoGlobal}
5. POST regenerarContrato  
   Body: {cdr, motivo}  
   Respuesta: {success, versionNueva, diffCampos?}
6. POST subirContratoFirmado  
   Body: {cdr, archivoBase64}  
   Respuesta: {success, finalUrl}
7. GET version  
   Respuesta: {apiVersion, contratoModuloVersion}

Opcionales futuros:
- POST reenviarLinkAprobacion
- GET obtenerHistorialContrato
- GET prevalidarPlaceholders

## 6. Lógica clave (resumen pseudocódigo)
consolidarDatosContrato(cdr):
- Cargar fila + JSON formularios + codeudores + servicios.
- Construir mapa valores.
- Calcular fecha hoy → placeholders de fecha.
- Return {placeholders, faltantes}.

generarContratoDesdePlantilla(cdr):
- Llama consolidar.
- Reemplaza todos {{TOKEN}}.
- Guarda documento (BORRADOR).
- Registra versión y estado.

registrarAprobacionContrato(cdr, parte, accion):
- Actualiza estado parte (APROBADO o CORRECCION_SOLICITADA).
- Si todos aprobados → APROBADO_TOTAL.

## 7. Servicios
Solo insertar placeholders de servicios marcados en formulario propietario. Valor fijo textual dentro de plantilla (“A CARGO DEL INQUILINO”).

## 8. Validaciones mínimas antes de generar
- Formularios requeridos completados.
- Al menos un codeudor (si la operación exige).
- Campos económicos (canon, administración) numéricos > 0.

## 9. Faltantes
Lista faltantes = placeholders detectados en plantilla - keys asignadas. Registrar en log; permitir generar (warning) o bloquear según política futura.

## 10. Próximos pasos (implementación)
1. Crear función Apps Script consolidate (nombre sugerido: consolidarDatosContrato_)
2. Crear función generarContrato_ (usa DocApp / DocumentApp)
3. Crear función registrarAprobacionContrato_
4. Exponer vía doGet/doPost router (switch action)
(Esperar confirmación antes de cada uno.)

Fin versión corta.
