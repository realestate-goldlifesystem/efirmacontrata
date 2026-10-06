/**
 * LISTA DE BANCOS SIEMPRE AL DÍA (formulario del propietario) — oct-2026
 *
 * El <select id="banco"> trae una lista fija, que solo es el RESPALDO: la que se
 * ve si el servidor no responde. Cuando llega la lista del servidor
 * (accion=obtenerBancos: las entidades de PSE que reporta Mercado Pago), el
 * desplegable se deja IGUAL a ella: se quitan las fijas que ya no están
 * vigentes y se agregan las que falten.
 *
 * Las que coinciden conservan su nombre y su orden de siempre (las más usadas
 * arriba); las nuevas van al final, en orden alfabético. Solo se quita si la
 * lista del servidor es creíble (10 o más); con una respuesta rara no se toca nada.
 *
 * La versión anterior ("actualización mixta") REEMPLAZABA la lista fija por una
 * simulada de 12 bancos con uno inventado. Nunca llegó a funcionar; ver la nota
 * en formulario-propietario.html.
 *
 * Uso:  <script src="js/bancos.js?v=1"></script>   (después de config.js y del <select>)
 *       Va en los DOS formularios; en el del inquilino solo despierta al servidor.
 */
(function (g) {
  /** "Banco Itaú" → "ITAU"; "BBVA Colombia" → "BBVACOLOMBIA"; "DAVIbank S.A." → "DAVIBANK" */
  function clave(nombre) {
    return String(nombre || '')
      .normalize('NFD').replace(/\p{M}/gu, '')   // sin tildes
      .toUpperCase()
      .replace(/\bS\.\s*A\.?/g, ' ')            // "S.A."
      .replace(/\b(BANCO|SA)\b/g, ' ')           // la PALABRA banco: "Bancolombia" no se toca
      .replace(/[^A-Z0-9]/g, '');
  }

  /** ¿Son la misma entidad escrita distinto? ("BBVA" y "BBVA Colombia", "AV Villas" y "Banco AV Villas") */
  function mismaEntidad(a, b) {
    var ka = clave(a), kb = clave(b);
    if (!ka || !kb) return false;
    if (ka === kb) return true;
    var corta = ka.length < kb.length ? ka : kb;
    var larga = ka.length < kb.length ? kb : ka;
    return corta.length >= 4 && larga.indexOf(corta) !== -1;
  }

  /**
   * De la lista del servidor, las entidades que NO están ya en la base.
   * @param {string[]} base    nombres que ya ofrece el formulario
   * @param {string[]} nuevos  nombres que publica el servidor
   * @return {string[]} las que hay que agregar, sin repetidas y en orden alfabético
   */
  function bancosPorAgregar(base, nuevos) {
    var conocidos = (base || []).slice();
    var agregar = [];
    (nuevos || []).forEach(function (n) {
      var nombre = String(n || '').replace(/\s+/g, ' ').trim();
      if (!nombre || nombre.length > 80) return;
      for (var i = 0; i < conocidos.length; i++) if (mismaEntidad(conocidos[i], nombre)) return;
      conocidos.push(nombre);
      agregar.push(nombre);
    });
    return agregar.sort(function (a, b) { return a.localeCompare(b, 'es', { sensitivity: 'base' }); });
  }

  /**
   * De las opciones que ya ofrece el formulario, las que SOBRAN: las que el
   * servidor ya no publica (un banco que cerró o cambió de nombre).
   * Solo se atreve a quitar si la lista del servidor es creíble (10 o más).
   * @param {{value:string, text:string}[]} opciones
   * @param {string[]} nuevos
   * @return {string[]} los value de las opciones que hay que quitar
   */
  function bancosPorQuitar(opciones, nuevos) {
    var vigentes = (nuevos || []).filter(function (n) { return typeof n === 'string' && n.trim(); });
    if (vigentes.length < 10) return [];
    return (opciones || []).filter(function (o) {
      for (var i = 0; i < vigentes.length; i++) {
        if (mismaEntidad(o.text, vigentes[i]) || mismaEntidad(o.value, vigentes[i])) return false;
      }
      return true;
    }).map(function (o) { return o.value; });
  }

  g.efcBancosPorAgregar = bancosPorAgregar;      // expuesto para las pruebas
  g.efcBancosPorQuitar = bancosPorQuitar;
  g.efcMismaEntidadBancaria = mismaEntidad;

  // ---------- En la página ----------
  if (typeof document === 'undefined') return;
  // En el formulario del inquilino no hay <select>: la llamada se hace igual, solo
  // para que el servidor refresque su copia si ya está vieja. Así, cuando después
  // entra el propietario, la encuentra al día.
  var select = document.getElementById('banco');
  if (typeof CONFIG === 'undefined' || !CONFIG.API_URL) return;

  var CLAVE_COPIA = 'efc_bancos';

  function sumarAlSelect(lista) {
    if (!select || !Array.isArray(lista)) return;

    // Primero se quitan las que el servidor ya no publica, para que la lista
    // quede IGUAL a la vigente; después se agregan las que falten.
    var opciones = [];
    for (var j = 0; j < select.options.length; j++) {
      if (select.options[j].value) opciones.push({ value: select.options[j].value, text: select.options[j].textContent });
    }
    var quitar = bancosPorQuitar(opciones, lista);
    for (var k = select.options.length - 1; k >= 0; k--) {
      if (select.options[k].value && quitar.indexOf(select.options[k].value) !== -1) select.remove(k);
    }

    var base = [];
    for (var i = 0; i < select.options.length; i++) {
      if (!select.options[i].value) continue;
      base.push(select.options[i].textContent, select.options[i].value);
    }
    var elegido = select.value;                  // no se le pierde lo que ya eligió
    bancosPorAgregar(base, lista).forEach(function (n) {
      var o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      select.appendChild(o);
    });
    select.value = elegido;
  }

  // Lo que este navegador ya recibió la vez pasada se pone de una, ANTES de que
  // el formulario restaure el borrador. Si no, a quien eligió un banco de los
  // nuevos y recarga la página, el banco se le queda en blanco: el borrador se
  // restaura cuando esa opción todavía no existe.
  try { sumarAlSelect(JSON.parse(localStorage.getItem(CLAVE_COPIA) || '[]')); } catch (e) {}

  var nombre = 'efcBancos_' + Math.round(1e6 * Math.random());
  var listo = false;
  var fin = function () { listo = true; clearTimeout(reloj); try { delete g[nombre]; } catch (e) {} };
  var reloj = setTimeout(fin, 60000);            // si el servidor no contesta, se queda la lista fija

  g[nombre] = function (r) {
    if (listo) return;
    fin();
    if (!r || !r.success || !Array.isArray(r.bancos)) return;
    try { localStorage.setItem(CLAVE_COPIA, JSON.stringify(r.bancos)); } catch (e) {}
    if (!select) return;
    sumarAlSelect(r.bancos);

    // Primera visita con borrador: si el banco guardado es de los que acaban de
    // llegar y el campo sigue vacío, se le devuelve.
    if (select.value) return;
    try {
      var cdr = new URLSearchParams(g.location.search).get('cdr');
      var guardado = (JSON.parse(localStorage.getItem('efirma_prop_' + cdr) || '{}') || {}).banco;
      if (!guardado) return;
      select.value = guardado;
      if (select.value) select.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {}
  };

  var s = document.createElement('script');
  s.onerror = fin;
  s.src = CONFIG.API_URL + '?accion=obtenerBancos&callback=' + nombre;
  document.body.appendChild(s);
})(typeof window !== 'undefined' ? window : globalThis);
