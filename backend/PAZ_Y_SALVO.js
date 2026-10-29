/**
 * ===== Paz y salvo del inquilino (etapa 3, parte 3 · 28-oct-2026) =====
 *
 * Plantilla: copia del "PAZ Y SALVO Inmueble administrador" de Leonardo en la carpeta maestra (la de la
 * plantilla de terminación). Su texto queda intacto: solo los datos pasan a [espacios]. Trae la firma de
 * Leonardo como imagen flotante; si firma el propietario, esa imagen se quita y va la firma que él trazó
 * en el acta de promoción (columna FIRMA PROPIETARIO, la misma de la cuenta de cobro externa).
 * El id de la plantilla y el nombre/cédula de Leonardo quedan en Script Properties (no en el código).
 */

const CARPETA_MAESTRA_ID = '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH';
const ORIGEN_PAZ_Y_SALVO_ID ='1MBM-0HGxbxi1SgS6p-w6dqOMJtkAps2cbiFCh0xJfi4';
const CALIDAD_PAZ_Y_SALVO = { AGENTE: 'administrador y arrendador', PROPIETARIO: 'propietario y arrendador' };

function _plantillaPazYSalvoId_() { return PropertiesService.getScriptProperties().getProperty('PLANTILLA_PAZ_Y_SALVO_ID'); }

/** Una sola vez: crea la plantilla en la carpeta maestra a partir del documento de Leonardo. */
function crearPlantillaPazYSalvo_() {
  const props = PropertiesService.getScriptProperties();
  if (_plantillaPazYSalvoId_()) { try { DriveApp.getFileById(_plantillaPazYSalvoId_()); return { ok: true, id: _plantillaPazYSalvoId_(), yaExistia: true }; } catch (e) {} }
  const maestra = DriveApp.getFolderById(CARPETA_MAESTRA_ID);
  // Restos de un intento que falló a medias
  const viejas = maestra.getFilesByName('PAZ Y SALVO INQUILINO');
  while (viejas.hasNext()) viejas.next().setTrashed(true);
  const copia = DriveApp.getFileById(ORIGEN_PAZ_Y_SALVO_ID).makeCopy('PAZ Y SALVO INQUILINO', maestra);
  try { return _armarPlantillaPazYSalvo_(copia, maestra); }
  catch (e) { copia.setTrashed(true); throw e; }
}

function _armarPlantillaPazYSalvo_(copia, maestra) {
  const props = PropertiesService.getScriptProperties();
  const doc = DocumentApp.openById(copia.getId()), body = doc.getBody();
  const texto = body.getText();
  // Nombre y cédula de quien firma hoy el original (Leonardo): se guardan para cuando firma él
  const yo = texto.match(/yo ([^,]+), identificad[oa] con cédula de ciudadanía No\. ([0-9.]+)/);
  if (!yo) throw new Error('El documento original cambió: no se encontró "yo …, identificado con cédula…"');
  props.setProperty('AGENTE_PAZ_Y_SALVO', JSON.stringify({ nombre: yo[1].trim(), cedula: yo[2].replace(/\./g, '') }));

  const pars = body.getParagraphs();
  // La raya va en el mismo párrafo de "Atentamente," (con saltos de línea suaves)
  const linea = pars.findIndex(p => /_{5,}/.test(p.getText()));
  if (linea < 0) throw new Error('El documento original cambió: no se encontró la raya de la firma.');
  pars.forEach((p, i) => {
    const t = p.getText();
    if (i < 3 && /^\s*[A-ZÁÉÍÓÚa-záéíóúñ ]+,\s*\d{1,2} de \S+ de \d{4}\s*$/.test(t)) p.setText('[CIUDAD], [FECHA]');
  });
  const poner = (re, por) => body.replaceText(re, por);
  poner('yo [^,]+, identificad[oa] con cédula de ciudadanía No\\. [0-9.]+, en calidad de .+ del inmueble en .+$',
    'yo [NOMBRE QUIEN FIRMA], identificado con cédula de ciudadanía No. [CÉDULA QUIEN FIRMA], en calidad de [CALIDAD] del inmueble en [DIRECCIÓN DEL INMUEBLE]');
  poner('firmado el [0-9]{1,2} de [A-Za-zÁÉÍÓÚáéíóú]+ de [0-9]{4}', 'firmado el [FECHA DEL CONTRATO]');
  poner('que la? señora?(\\(a\\))? [^,]+, Inquilino', 'que el (la) señor(a) [NOMBRE INQUILINO], Inquilino');
  poner('a los [^(]*\\([0-9]+\\) días del mes de [A-Za-záéíóú]+ del año [0-9]{4}', 'a los ([DÍA]) días del mes de [MES] del año [AÑO]');
  // Bloque de firma: los renglones debajo de la raya (algunos comparten párrafo con salto suave).
  // Se reemplaza cada renglón en su sitio para no perder el formato.
  const nuevos = ['[NOMBRE QUIEN FIRMA]', 'C.C. No. [CÉDULA QUIEN FIRMA]', '[CARGO QUIEN FIRMA]', '[INMUEBLE QUIEN FIRMA]'];
  const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  let k = 0;
  body.getParagraphs().slice(linea + 1).forEach(p => {
    p.getText().split(/[\r\n\u000b]/).map(x => x.trim()).filter(Boolean).forEach(renglon => {
      p.editAsText().replaceText(escapar(renglon), k < nuevos.length ? nuevos[k] : '');
      k++;
    });
  });
  if (k < 3) throw new Error('El documento original cambió: el bloque de firma no tiene los renglones esperados.');
  doc.saveAndClose();
  props.setProperty('PLANTILLA_PAZ_Y_SALVO_ID', copia.getId());
  return { ok: true, id: copia.getId(), url: copia.getUrl(), carpeta: maestra.getName() };
}

/**
 * Genera el paz y salvo de un contrato. firmante: 'AGENTE' (Leonardo) o 'PROPIETARIO'.
 * Devuelve { url, pdf } o lanza error si falta algo (p. ej. la firma del propietario).
 */
function generarPazYSalvo_(idInm, c, partes, firmante, carpeta) {
  const plantilla = _plantillaPazYSalvoId_();
  if (!plantilla) throw new Error('Falta la plantilla del paz y salvo (crearPlantillaPazYSalvo_).');
  const propio = firmante === 'PROPIETARIO';
  let firma = null;
  if (propio) {
    const idFirma = String(c.v('FIRMA PROPIETARIO') || '').trim();
    if (!idFirma) throw new Error('El propietario no tiene firma guardada del acta de promoción.');
    firma = DriveApp.getFileById(idFirma).getBlob();
  }
  const agente = JSON.parse(PropertiesService.getScriptProperties().getProperty('AGENTE_PAZ_Y_SALVO') || '{}');
  const quien = propio ? { nombre: partes.PROPIETARIO.nombre, cedula: partes.PROPIETARIO.documento || String(c.v('Número de documento') || '').trim() } : agente;
  if (!quien.nombre || !quien.cedula) throw new Error('Faltan el nombre o la cédula de quien firma.');
  const hoy = new Date(), inicio = c.v('FECHA INICIO DEL CONTRATO');
  const mes = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const calidad = CALIDAD_PAZ_Y_SALVO[propio ? 'PROPIETARIO' : 'AGENTE'];
  const valores = {
    '[CIUDAD]': (partes.ciudad || 'Bogotá').replace(/^BOGOT[AÁ].*$/i, 'Bogotá'),
    '[FECHA]': _fechaLarga_(hoy),
    '[NOMBRE QUIEN FIRMA]': String(quien.nombre).toUpperCase(),
    '[CÉDULA QUIEN FIRMA]': ccFormatoCedula(quien.cedula),
    '[CALIDAD]': calidad,
    '[DIRECCIÓN DEL INMUEBLE]': String(partes.direccion).toUpperCase(),
    '[FECHA DEL CONTRATO]': inicio instanceof Date ? _fechaLarga_(inicio) : String(inicio || ''),
    '[NOMBRE INQUILINO]': String(partes.INQUILINO.nombre).toUpperCase(),
    '[DÍA]': String(hoy.getDate()), '[MES]': mes[hoy.getMonth()], '[AÑO]': String(hoy.getFullYear()),
    '[CARGO QUIEN FIRMA]': calidad.toUpperCase() + ' DEL INMUEBLE',
    '[INMUEBLE QUIEN FIRMA]': String(partes.direccion).toUpperCase()
  };
  const nombre = 'Paz y salvo - ' + partes.direccion + ' - ' + idInm;
  const copia = DriveApp.getFileById(plantilla).makeCopy(nombre, carpeta || DriveApp.getFileById(plantilla).getParents().next());
  const doc = DocumentApp.openById(copia.getId()), body = doc.getBody();
  Object.keys(valores).forEach(k => body.replaceText(k.replace(/[\[\]()]/g, '\\$&'), valores[k]));
  if (propio) {
    // Fuera la firma de Leonardo; la del propietario va encima de la raya
    body.getParagraphs().forEach(p => p.getPositionedImages().forEach(im => p.removePositionedImage(im.getId())));
    // "Atentamente," + renglones vacíos (el hueco de la firma flotante) + raya, en un solo párrafo:
    // queda "Atentamente,", la imagen de la firma y la raya debajo
    const p = body.getParagraphs().find(x => /_{5,}/.test(x.getText()));
    const i = body.getChildIndex(p);
    const raya = (p.getText().match(/_{5,}/) || ['_________________________________'])[0];
    p.editAsText().replaceText('[\\r\\n\\x0b]+.*$|[\\r\\x0b]+', '');
    p.editAsText().replaceText('_{5,}\\s*$', '');
    body.insertParagraph(i + 1, raya);
    const img = body.insertImage(i + 1, firma);
    const ancho = 170, k = ancho / img.getWidth();
    if (k < 1) img.setWidth(ancho).setHeight(Math.round(img.getHeight() * k));
  }
  doc.saveAndClose();
  const pdf = copia.getAs(MimeType.PDF).setName(nombre + '.pdf');
  return { url: copia.getUrl(), id: copia.getId(), pdf: pdf };
}
