/**
 * LECTURA DE RECIBOS DE SERVICIOS, PÁGINA POR PÁGINA — oct-2026
 *
 * Pasa seguido: el propietario junta agua, luz y gas en UN solo PDF y sube ese
 * mismo archivo en las tres casillas. El lector viejo solo miraba la página 1,
 * así que en dos de las tres casillas traía la referencia del recibo equivocado
 * (y la guardaba como si fuera la de esa casilla).
 *
 * Ahora se lee cada página, se reconoce de qué servicio es y, según la casilla
 * (AGUA / LUZ / GAS…), se toma la referencia de la página que corresponde.
 * Si ninguna página es del servicio de la casilla, se dice; no se inventa.
 *
 * Funciones puras, probadas en _herramientas_locales/test_recibos.js.
 */

const REC_SERVICIOS = {
  GAS: { empresa: 'Gas', pistas: [['VANTI', 3], ['FACTURA DE GAS', 3], ['GAS NATURAL', 3], ['CONSUMO GAS', 2], ['GASES DE', 2], ['ALCANOS', 2], ['SURTIGAS', 2]] },
  LUZ: { empresa: 'Energía', pistas: [['ENEL', 3], ['CODENSA', 3], ['KWH', 2], ['ENERGIA', 1], ['EPM', 1], ['AIR-E', 2], ['AFINIA', 2], ['CELSIA', 2]] },
  AGUA: { empresa: 'Acueducto', pistas: [['ACUEDUCTO', 3], ['ALCANTARILLADO', 3], ['EAAB', 3], ['EAB-ESP', 3], ['TRIPLE A', 2], ['EMCALI', 1], ['AGUAS DE', 2]] },
  INTERNET: { empresa: 'Internet', pistas: [['INTERNET', 2], ['FIBRA', 2], ['BANDA ANCHA', 2], ['MEGAS', 1], ['CLARO', 1], ['MOVISTAR', 1], ['TIGO', 1], ['ETB', 1]] },
  TELEFONO: { empresa: 'Teléfono', pistas: [['TELEFONIA', 3], ['LINEA TELEFONICA', 3], ['MINUTOS', 1]] }
};

const REC_EMPRESAS = [['VANTI', 'Gas (Vanti)'], ['ENEL', 'Energía (Enel)'], ['CODENSA', 'Energía (Enel)'], ['EAAB', 'Acueducto (EAAB)'], ['EAB-ESP', 'Acueducto (EAAB)'], ['EPM', 'EPM'], ['AIR-E', 'Energía (Air-e)'], ['AFINIA', 'Energía (Afinia)'], ['CELSIA', 'Energía (Celsia)'], ['TRIPLE A', 'Acueducto (Triple A)'], ['EMCALI', 'Emcali']];

function recNorm(s) {
  return String(s === null || s === undefined ? '' : s).toUpperCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** La palabra entera: "ENEL" no debe encontrarse dentro de "PANEL". */
function recTienePalabra(textoNorm, palabra) {
  let desde = 0;
  while (true) {
    const i = textoNorm.indexOf(palabra, desde);
    if (i === -1) return false;
    const antes = i === 0 ? ' ' : textoNorm.charAt(i - 1);
    const despues = i + palabra.length >= textoNorm.length ? ' ' : textoNorm.charAt(i + palabra.length);
    if (!/[A-Z]/.test(antes) && !/[A-Z]/.test(despues)) return true;
    desde = i + 1;
  }
}

/** "FACTURA_AGUA_[REG…].pdf" → "AGUA". La casilla donde el propietario lo subió. */
function recTipoDeNombre(nombre) {
  const m = recNorm(nombre).match(/FACTURA[\s_]*(AGUA|LUZ|GAS|TELEFONO|INTERNET)/);
  return m ? m[1] : '';
}

/** ¿De qué servicio es esta página? '' si no se reconoce. */
function recClasificarPagina(texto) {
  const t = recNorm(texto);
  let mejor = '', puntos = 0;
  Object.keys(REC_SERVICIOS).forEach(tipo => {
    let p = 0;
    REC_SERVICIOS[tipo].pistas.forEach(par => { if (recTienePalabra(t, par[0])) p += par[1]; });
    if (p > puntos) { puntos = p; mejor = tipo; }
  });
  return puntos >= 2 ? mejor : '';
}

function recEmpresa(texto, tipo) {
  const t = recNorm(texto);
  for (let i = 0; i < REC_EMPRESAS.length; i++) if (recTienePalabra(t, REC_EMPRESAS[i][0])) return REC_EMPRESAS[i][1];
  return tipo && REC_SERVICIOS[tipo] ? REC_SERVICIOS[tipo].empresa : 'Desconocida';
}

/**
 * Número con el que se paga el recibo.
 * @return {{referencia:string, origen:string}} origen: 'etiqueta' (lo dice el recibo),
 *         'codigo_barras' (sacado del código de pago) o '' si no se halló.
 */
function recReferencia(texto, tipo) {
  const t = recNorm(texto);
  const porTipo = {
    GAS: [/CUENTA O REFERENCIA DE PAGO[\s\S]{0,60}?\b(\d{6,12})\b/, /REFERENCIA DE PAGO[\s\S]{0,40}?\b(\d{6,12})\b/],
    LUZ: [/NUMERO DE CLIENTE(?:\s+ES)?\s*:?\s*(\d{5,10}(?:-\d)?)/, /N[O°.]*\s*(?:DE\s+)?CLIENTE[\s\S]{0,30}?\b(\d{5,10}(?:-\d)?)/, /N[O°.]*\s*(?:DE\s+)?CUENTA[\s\S]{0,30}?\b(\d{5,12}(?:-\d)?)/],
    AGUA: [/CUENTA\s*CONTRATO[\s\S]{0,40}?\b(\d{6,12})\b/, /N[O°.]*\s*(?:DE\s+)?CUENTA[\s\S]{0,30}?\b(\d{6,12})\b/]
  };
  const generales = [
    /CUENTA\s*CONTRATO[\s\S]{0,40}?\b(\d{5,12})\b/,
    /REFERENCIA(?:\s+DE\s+PAGO)?[\s\S]{0,30}?\b(\d{5,20})\b/,
    /N[O°.]*\s*(?:DE\s+)?(?:CUENTA|CLIENTE|CONTRATO)[\s\S]{0,30}?\b(\d{5,15}(?:-\d)?)\b/
  ];
  const patrones = (porTipo[tipo] || []).concat(generales);
  for (let i = 0; i < patrones.length; i++) {
    const m = t.match(patrones[i]);
    if (m && m[1]) return { referencia: m[1], origen: 'etiqueta' };
  }
  // Código de barras de recaudo: (415)convenio(8020)REFERENCIA(3900)valor
  const b = t.match(/\(8020\)\s*(\d{6,24})/);
  if (b) return { referencia: b[1].replace(/^0+/, ''), origen: 'codigo_barras' };
  return { referencia: '', origen: '' };
}

/**
 * @param {string[]} paginas       texto de cada página del archivo
 * @param {string} tipoEsperado    casilla donde se subió ('AGUA', 'LUZ', 'GAS'…) o ''
 * @return {{empresa, referenciaPago, origenReferencia, tipo, pagina, totalPaginas,
 *           combinado, noCorresponde, tipoEsperado, otros}}
 */
function recAnalizar(paginas, tipoEsperado) {
  const esperado = recNorm(tipoEsperado);
  const lista = (paginas || []).map((texto, i) => {
    const tipo = recClasificarPagina(texto);
    const ref = recReferencia(texto, tipo);
    return { pagina: i + 1, tipo: tipo, empresa: recEmpresa(texto, tipo), referencia: ref.referencia, origen: ref.origen };
  });
  const tipos = [];
  lista.forEach(p => { if (p.tipo && tipos.indexOf(p.tipo) === -1) tipos.push(p.tipo); });

  // La página de la casilla; si un recibo ocupa varias, la que traiga el número
  const delTipo = esperado ? lista.filter(p => p.tipo === esperado) : [];
  let elegida = delTipo.filter(p => p.referencia)[0] || delTipo[0] || null;
  const noCorresponde = !!esperado && !elegida && tipos.length > 0;
  const VACIA = { pagina: 0, tipo: '', empresa: 'Desconocida', referencia: '', origen: '' };
  // Si la casilla dice INTERNET y el archivo trae gas, NO se devuelve el número del gas:
  // el panel lo guardaría como si fuera el de internet.
  if (!elegida) elegida = noCorresponde ? VACIA : (lista.filter(p => p.referencia)[0] || lista[0] || VACIA);

  return {
    empresa: elegida.empresa,
    referenciaPago: elegida.referencia || 'No detectada',
    origenReferencia: elegida.origen,
    tipo: elegida.tipo,
    pagina: elegida.pagina,
    totalPaginas: lista.length,
    combinado: tipos.length > 1,          // un solo archivo con recibos de varios servicios
    noCorresponde: noCorresponde,         // la casilla dice AGUA y el archivo no trae agua
    tipoEsperado: esperado,
    otros: lista.filter(p => p !== elegida && p.tipo).map(p => ({ pagina: p.pagina, tipo: p.tipo, empresa: p.empresa, referencia: p.referencia }))
  };
}
