/**
 * PORTERO DE LOS FORMULARIOS (inquilino y propietario) — oct-2026
 *
 * Antes solo validador.html preguntaba en qué va el trámite. Quien abría el
 * formulario directo (desde el historial, o porque guardó la dirección) lo veía
 * en blanco y podía volver a llenarlo aunque ya estuviera enviado o aprobado.
 *
 * Este script va en los dos formularios. Al abrir:
 *   - tapa la página mientras le pregunta al servidor (verificarLink);
 *   - si le toca llenar (pendiente o en corrección) → destapa y deja seguir;
 *   - si no le toca → deja la pantalla de estado y cierra sola a los 10 s;
 *   - si no se pudo averiguar → lo dice y ofrece reintentar. No destapa: un
 *     formulario que no sabe si le toca no se debe llenar.
 *
 * Uso:  <script src="js/estado-tramite.js?v=1" data-tipo="inquilino"></script>
 *       (después de config.js)
 *
 * validador.html ya hizo esta misma pregunta justo antes de redirigir, así que
 * deja un pase de 10 minutos en sessionStorage para no hacerle esperar dos veces.
 */
(function () {
  var SEGUNDOS_PARA_CERRAR = 10;
  var PASE_MINUTOS = 10;

  var yo = document.currentScript;
  var tipo = yo ? yo.getAttribute('data-tipo') : '';
  var params = new URLSearchParams(window.location.search);
  var cdr = params.get('cdr') || '';
  if (!tipo || !cdr) return;                       // sin datos: el formulario ya muestra su propio error
  if (typeof CONFIG === 'undefined' || !CONFIG.API_URL) return;

  var CLAVE_PASE = 'efc_pase_' + tipo + '_' + cdr;

  // ¿Viene recién verificado por validador.html?
  // El pase es de UN solo uso: sirve para la entrada que viene del verificador y
  // se gasta ahí. Si después recargan o vuelven a abrir la dirección, se pregunta
  // de nuevo (para entonces el formulario puede estar ya enviado).
  try {
    var pase = Number(sessionStorage.getItem(CLAVE_PASE)) || 0;
    sessionStorage.removeItem(CLAVE_PASE);
    if (pase && Date.now() - pase < PASE_MINUTOS * 60000) return;
  } catch (e) { /* sin sessionStorage: se verifica normal */ }

  // ---------- Pantalla que tapa el formulario ----------
  var tapa = document.createElement('div');
  tapa.id = 'efc-estado-tramite';
  tapa.setAttribute('role', 'status');
  tapa.style.cssText = 'position:fixed; inset:0; z-index:2147483000; background:#0F0F12; display:flex; align-items:center; justify-content:center; padding:20px; font-family:Inter, "Helvetica Neue", Arial, sans-serif;';
  tapa.innerHTML =
    '<div style="max-width:480px; width:100%; text-align:center; padding:38px 30px; border-radius:16px; border:1px solid rgba(212,175,55,0.25); background:linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.98)); box-shadow:0 25px 50px -12px rgba(0,0,0,0.8);">' +
      '<div style="color:#D4AF37; font-size:22px; font-weight:700; letter-spacing:1px; margin-bottom:22px;">E-FirmaContrata</div>' +
      '<div id="efc-icono" style="font-size:44px; line-height:1; margin-bottom:14px;"></div>' +
      '<div id="efc-titulo" style="color:#F4F4F5; font-size:19px; font-weight:600; margin-bottom:12px;"></div>' +
      '<div id="efc-mensaje" style="color:#A1A1AA; font-size:15px; line-height:1.6;"></div>' +
      '<div id="efc-pie" style="color:#71717A; font-size:13px; margin-top:22px;"></div>' +
    '</div>';

  function poner(icono, titulo, mensaje, pie) {
    tapa.querySelector('#efc-icono').textContent = icono;
    tapa.querySelector('#efc-titulo').textContent = titulo;
    tapa.querySelector('#efc-mensaje').textContent = mensaje;
    var p = tapa.querySelector('#efc-pie');
    p.textContent = '';
    if (pie) p.appendChild(pie);
  }

  function montar() {
    if (!tapa.parentNode) (document.body || document.documentElement).appendChild(tapa);
  }

  function destapar() {
    if (tapa.parentNode) tapa.parentNode.removeChild(tapa);
  }

  // No hay nada más que hacer en esta página: cuenta regresiva e intenta cerrar.
  // Un navegador solo deja cerrar las pestañas que abrió un script; si no puede,
  // se le dice a la persona que ya la puede cerrar.
  function cerrarEn(segundos) {
    var texto = document.createElement('span');
    var quedan = segundos;
    var pintar = function () { texto.textContent = 'Esta ventana se cerrará en ' + quedan + ' s…'; };
    pintar();
    tapa.querySelector('#efc-pie').textContent = '';
    tapa.querySelector('#efc-pie').appendChild(texto);
    var reloj = setInterval(function () {
      quedan--;
      if (quedan > 0) { pintar(); return; }
      clearInterval(reloj);
      try { window.close(); } catch (e) { /* no se pudo: se avisa abajo */ }
      setTimeout(function () { texto.textContent = 'Ya puedes cerrar esta ventana.'; }, 400);
    }, 1000);
  }

  function preguntar() {
    poner('⏳', 'Un momento', 'Estamos verificando en qué va tu trámite…', null);

    var nombre = 'efcEstado_' + Math.round(1e6 * Math.random());
    var terminado = false;
    var fin = function (fn) { return function (x) { if (terminado) return; terminado = true; clearTimeout(reloj); try { delete window[nombre]; } catch (e) {} fn(x); }; };

    var fallo = fin(function () {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = 'Reintentar';
      boton.style.cssText = 'background:#D4AF37; color:#171018; border:0; border-radius:8px; padding:11px 26px; font-size:15px; font-weight:700; cursor:pointer;';
      boton.onclick = preguntar;
      poner('📡', 'No pudimos verificar tu trámite', 'Revisa tu conexión a internet y vuelve a intentar.', boton);
    });

    var reloj = setTimeout(fallo, 60000);          // el servidor a veces tarda más de 20 s

    window[nombre] = fin(function (r) {
      if (!r || !r.success) {
        poner('🚫', 'Enlace no válido', (r && r.mensaje) || 'No se pudo verificar la información de este enlace.', null);
        return;
      }
      if (r.activo) {
        // En corrección, el formulario debe abrir en ese modo aunque la dirección no lo diga
        if (r.status === 'correccion' && params.get('modo') !== 'correccion' && r.redirectUrl) {
          try { sessionStorage.setItem(CLAVE_PASE, String(Date.now())); } catch (e) {}
          window.location.replace(r.redirectUrl);
          return;
        }
        destapar();
        return;
      }
      poner(r.status === 'diligenciado' ? '🕓' : '✅', 'Estado de tu trámite', r.mensaje || 'Tu formulario ya fue procesado.', null);
      cerrarEn(SEGUNDOS_PARA_CERRAR);
    });

    var s = document.createElement('script');
    s.onerror = fallo;
    s.src = CONFIG.API_URL + '?accion=verificarLink&cdr=' + encodeURIComponent(cdr) + '&tipo=' + encodeURIComponent(tipo) +
            (params.get('docs') ? '&docs=' + encodeURIComponent(params.get('docs')) : '') + '&callback=' + nombre;
    (document.body || document.documentElement).appendChild(s);
  }

  montar();
  preguntar();
})();
