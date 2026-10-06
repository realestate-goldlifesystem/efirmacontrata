/**
 * LECTURA DEL CERTIFICADO DE LIBERTAD Y TRADICIÓN POR ANOTACIONES — oct-2026
 *
 * Antes el panel decía "embargo" si la palabra HIPOTECA, LIMITACION o DEMANDA
 * aparecía en cualquier parte del texto (y "LIMITACION AL DOMINIO" es como la
 * oficina de registro titula el reglamento de propiedad horizontal: lo tiene
 * todo apartamento), buscaba al dueño tras la palabra "PROPIETARIO" (que el
 * certificado no usa) y solo leía la página 1, donde no están los dueños.
 *
 * Aquí se lee como lo lee una persona:
 *   - el certificado se parte en ANOTACIONES;
 *   - cada una dice qué acto es (ESPECIFICACION: GRUPO: código ACTO);
 *   - una anotación deja de contar si otra posterior la CANCELA
 *     ("Se cancela anotación No: 1");
 *   - los dueños actuales son los "A:" de la última adquisición vigente.
 *
 * Todo esto son funciones puras (probadas en _herramientas_locales/test_folio.js).
 * No reemplaza la revisión del agente: el OCR desordena renglones y puede fallar.
 */

/** Mayúsculas, sin tildes (la Ñ queda como N en los dos lados de toda comparación). */
function folioNorm(s) {
  return String(s === null || s === undefined ? '' : s).toUpperCase().normalize('NFD').replace(/\p{M}/gu, '');
}

const FOLIO_MESES = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 };

/** "Impreso el 6 de Octubre de 2026" → "2026-10-06". Es LA fecha de expedición. */
function folioFechaImpresion(texto) {
  const t = folioNorm(texto);
  const m = t.match(/IMPRESO EL\s+(\d{1,2})\s+DE\s+([A-Z]+)\s+DE\s+(\d{4})/);
  if (m && FOLIO_MESES[m[2]]) return m[3] + '-' + ('0' + FOLIO_MESES[m[2]]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  const f = t.match(/EXPEDIDO EN[\s\S]{0,200}?FECHA\s*:\s*(\d{2})-(\d{2})-(\d{4})/);
  return f ? f[3] + '-' + f[2] + '-' + f[1] : null;
}

/** Días de calendario (hora de Bogotá) entre la fecha del certificado y hoy. Nunca negativo. */
function folioDiasDesde(fechaISO, ahoraMs) {
  if (!fechaISO) return null;
  const hoy = new Date((ahoraMs || Date.now()) - 5 * 3600000).toISOString().slice(0, 10);
  const dias = Math.round((Date.parse(hoy) - Date.parse(fechaISO)) / 86400000);
  return isNaN(dias) ? null : Math.max(0, dias);
}

/** Clasifica el acto de una anotación. El orden importa: una cancelación nombra lo que cancela. */
function folioTipoDeActo(grupo, acto) {
  // Algunos certificados viejos no traen el grupo, o el OCR lo pega al acto: se mira todo junto
  const g = folioNorm(grupo), a = (g + ' ' + folioNorm(acto)).trim();
  if (/CANCELACION/.test(g) || /^\s*CANCELA/.test(a)) return 'cancelacion';
  if (/MEDIDA CAUTELAR/.test(g) || /EMBARGO|DEMANDA|CAUTELAR|PROHIBICION|EXTINCION DE(L)? DOMINIO|SUSPENSION DEL PODER DISPOSITIVO|TOMA DE POSESION/.test(a)) return 'cautelar';
  if (/GRAVAMEN/.test(g) || /HIPOTECA|VALORIZACION/.test(a)) return 'gravamen';
  if (/MODO DE ADQUISICION/.test(g) || /COMPRAVENTA|ADJUDICACION|SUCESION|DONACION|PERMUTA|DACION EN PAGO|TRANSFERENCIA DE DOMINIO|REMATE|PERTENENCIA|PRESCRIPCION|RESTITUCION EN FIDUCIA|APORTE/.test(a)) return 'adquisicion';
  if (/LIMITACION/.test(g) || /USUFRUCTO|AFECTACION A VIVIENDA|PATRIMONIO DE FAMILIA|SERVIDUMBRE|CONDICION RESOLUTORIA|PROPIEDAD HORIZONTAL/.test(a)) {
    return /PROPIEDAD HORIZONTAL|REGLAMENTO/.test(a) ? 'propiedad_horizontal' : 'limitacion';
  }
  return 'otro';
}

/** Nombre limpio de un renglón "A: PEREZ JUAN CC# 123 X". */
function folioLimpiarNombre(s) {
  return String(s || '')
    .replace(/\s+(CC|C\.C\.|NIT|TI|CE|PA)\s*[#.:]?\s*[\d.\-\s]*X?\s*$/i, '')
    .replace(/\s+X\s*$/, '')
    .replace(/\s+/g, ' ').trim();
}

/** Parte el texto en anotaciones. */
function folioSepararAnotaciones(texto) {
  let t = String(texto || '');
  const corte = t.search(/NRO TOTAL DE ANOTACIONES|SALVEDADES\s*:/i);
  if (corte > 0) t = t.slice(0, corte);

  const re = /ANOTACI[OÓ]N\s*:\s*N(?:RO|O)?\.?\s*0*(\d+)/gi;
  const marcas = [];
  let m;
  while ((m = re.exec(t)) !== null) marcas.push({ nro: Number(m[1]), desde: m.index });

  return marcas.map((mk, i) => {
    const bloque = t.slice(mk.desde, i + 1 < marcas.length ? marcas[i + 1].desde : t.length);
    const plano = folioNorm(bloque);

    const esp = plano.match(/ESPECIFICACION\s*:\s*(?:([A-Z ]*?)\s*:)?\s*(\d{3,4})?\s*([^\n]*)/);
    const grupo = esp ? (esp[1] || '').trim() : '';
    const codigo = esp ? (esp[2] || '') : '';
    const acto = esp ? (esp[3] || '').replace(/\s+/g, ' ').trim() : '';

    const cancela = [];
    const c = plano.match(/SE CANCELAN?\s+(?:LAS?\s+)?ANOTACI(?:ON|ONES)\s*(?:N(?:RO|O)?S?\.?)?\s*:?\s*([\d\s,Y]+)/);
    if (c) (c[1].match(/\d+/g) || []).forEach(n => cancela.push(Number(n)));

    const de = [], a = [];
    bloque.split('\n').forEach(linea => {
      const p = linea.match(/^\s*(DE|A)\s*:\s*(.+)$/);
      if (!p) return;
      const nombre = folioLimpiarNombre(p[2]);
      if (nombre.length < 3) return;
      (p[1].toUpperCase() === 'DE' ? de : a).push(nombre);
    });

    const cedulas = [];
    const rc = /\bC\.?\s?C\.?\s*[#:.]?\s*([\d.]{5,15})/g;
    while ((m = rc.exec(plano)) !== null) {
      const n = m[1].replace(/\D/g, '');
      if (n.length >= 5 && n.length <= 11 && cedulas.indexOf(n) === -1) cedulas.push(n);
    }

    const f = plano.match(/FECHA\s*:\s*(\d{2})-(\d{2})-(\d{4})/);
    return {
      nro: mk.nro,
      fecha: f ? f[3] + '-' + f[2] + '-' + f[1] : '',
      grupo: grupo, codigo: codigo, acto: acto,
      tipo: folioTipoDeActo(grupo, acto),
      cancela: cancela, de: de, a: a, cedulas: cedulas
    };
  });
}

/** Texto corto de una anotación para mostrar: "0219 HIPOTECA ABIERTA… (anot. 10)". */
function folioResumen(an) {
  const acto = (an.codigo ? an.codigo + ' ' : '') + (an.acto || an.grupo || 'ACTO SIN LEER');
  return (acto.length > 70 ? acto.slice(0, 67) + '…' : acto) + ' (anot. ' + an.nro + ')';
}

/**
 * Lectura completa del certificado.
 * @return {{leido:boolean, fechaImpresion:?string, anotaciones:Object[], canceladas:number[],
 *           titulares:{nombres:string[], cedulas:string[], anotacion:?number, parcial:boolean},
 *           cautelares:Object[], gravamenes:Object[], limitaciones:Object[]}}
 */
function folioAnalizar(texto) {
  const anotaciones = folioSepararAnotaciones(texto);
  const canceladas = [];
  anotaciones.forEach(an => an.cancela.forEach(n => { if (canceladas.indexOf(n) === -1) canceladas.push(n); }));
  const vigentes = anotaciones.filter(an => canceladas.indexOf(an.nro) === -1);

  const adquisiciones = vigentes.filter(an => an.tipo === 'adquisicion' && an.a.length);
  const ultima = adquisiciones.length ? adquisiciones[adquisiciones.length - 1] : null;

  return {
    leido: anotaciones.length > 0,
    fechaImpresion: folioFechaImpresion(texto),
    anotaciones: anotaciones,
    canceladas: canceladas,
    titulares: {
      nombres: ultima ? ultima.a.slice() : [],
      cedulas: ultima ? ultima.cedulas.slice() : [],
      anotacion: ultima ? ultima.nro : null,
      // "COMPRAVENTA DERECHOS DE CUOTA": solo se vendió una parte; puede haber más dueños atrás
      parcial: ultima ? /CUOTA|DERECHOS|NUDA PROPIEDAD|\d\s*%/.test(folioNorm(ultima.acto)) : false
    },
    cautelares: vigentes.filter(an => an.tipo === 'cautelar'),
    gravamenes: vigentes.filter(an => an.tipo === 'gravamen'),
    limitaciones: vigentes.filter(an => an.tipo === 'limitacion')
  };
}

/**
 * Compara lo leído con quien llenó el formulario.
 * @param {Object} folio  resultado de folioAnalizar
 * @param {{documento:string, nombre:string}} persona
 */
function folioCotejar(folio, persona) {
  const cedula = String((persona && persona.documento) || '').replace(/\D/g, '');
  const palabras = folioNorm(persona && persona.nombre).split(/[^A-Z0-9]+/).filter(p => p.length > 2);
  const titulares = (folio && folio.titulares) || { nombres: [], cedulas: [] };

  const cedulaCoincide = !!cedula && titulares.cedulas.indexOf(cedula) !== -1;

  let cedulaEnAnotacion = null;      // está en el certificado, pero no como dueño actual
  if (cedula && !cedulaCoincide) {
    ((folio && folio.anotaciones) || []).forEach(an => { if (an.cedulas.indexOf(cedula) !== -1) cedulaEnAnotacion = an.nro; });
  }

  let titularCoincidente = '';
  let mejor = 0;
  titulares.nombres.forEach(nombre => {
    const del = folioNorm(nombre).split(/[^A-Z0-9]+/);
    const aciertos = palabras.filter(p => del.indexOf(p) !== -1).length;
    if (aciertos > mejor) { mejor = aciertos; titularCoincidente = nombre; }
  });
  const nombreCoincide = palabras.length > 0 && mejor >= Math.min(2, palabras.length);
  if (!nombreCoincide) {
    // Sin nombre, pero con cédula: el certificado lista cédulas y nombres en el mismo orden
    const i = titulares.cedulas.indexOf(cedula);
    titularCoincidente = (cedulaCoincide && titulares.cedulas.length === titulares.nombres.length) ? titulares.nombres[i] : '';
  }

  return {
    cedulaCoincide: cedulaCoincide,
    cedulaEnAnotacion: cedulaEnAnotacion,
    nombreCoincide: nombreCoincide,
    titularCoincidente: titularCoincidente,
    otrosTitulares: titulares.nombres.filter(n => n !== titularCoincidente)
  };
}
