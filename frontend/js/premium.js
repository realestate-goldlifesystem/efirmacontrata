/**
 * CAPA PREMIUM (nov-2026) — formulario-propietario y formulario-inquilino.
 * Va con css/premium.css. No toca la lógica del formulario; solo:
 *   1. pone el fondo terciopelo (auroras) y activa html.premium;
 *   2. ajusta los colores escritos a mano en el HTML (pensados para fondo negro) a la tarjeta marfil;
 *   3. confirmaciones (cédula, correo, celular): no se puede pegar, hay que escribirlas;
 *   4. buzones: miniatura del archivo (foto o 1a página del PDF) y "Toca para cambiarlo";
 *   5. "Paso X de N · nombre del paso" sobre los círculos de progreso;
 *   6. chispas doradas al enviar.
 */
(function () {
  var html = document.documentElement;
  html.classList.add('premium');

  function listo(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  listo(function () {
    // 1. Fondo
    var f = document.createElement('div');
    f.className = 'prem-fondo'; f.setAttribute('aria-hidden', 'true');
    f.innerHTML = '<i></i><i></i><i></i><b></b>';
    document.body.prepend(f);

    // 2. Colores escritos a mano → tarjeta clara
    var rgb = function (s) { var m = String(s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; var p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    var lum = function (c) { return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; };
    function ajustar(el) {
      if (!el || el.nodeType !== 1 || !el.closest('.form-container')) return;
      var st = el.style;
      var c = rgb(st.color);
      if (c) {
        var dorado = c.r > 150 && c.r - c.b > 80 && c.g > 100;
        if (dorado) st.color = 'var(--oroOsc)';
        else if (lum(c) > 0.62) st.color = 'var(--tinta)';
        else if (lum(c) > 0.3) st.color = 'var(--tinta2)';
      }
      var b = rgb(st.backgroundColor) || rgb((st.background || '').match(/rgba?\([^)]+\)/) && (st.background.match(/rgba?\([^)]+\)/)[0]));
      if (b && lum(b) < 0.25 && b.a > 0.15) st.background = 'rgba(220,181,60,.07)';
    }
    function ajustarTodo(raiz) { (raiz.querySelectorAll ? raiz.querySelectorAll('[style]') : []).forEach(ajustar); ajustar(raiz); }
    document.querySelectorAll('.form-container').forEach(ajustarTodo);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) ajustarTodo(n); }); });
    }).observe(document.body, { childList: true, subtree: true });

    // 3. Confirmaciones: escribir, no pegar
    document.querySelectorAll('input[id^="confirmar"], input[id^="coConfirmar"]').forEach(function (inp) {
      var avisar = function (e) {
        e.preventDefault();
        var msg = inp.parentElement.querySelector('.prem-nopega');
        if (!msg) { msg = document.createElement('small'); msg.className = 'prem-nopega'; msg.style.cssText = 'display:block;margin-top:6px;color:var(--mal);font-weight:600'; inp.after(msg); }
        msg.textContent = 'Escríbelo de nuevo: aquí no se puede pegar.';
        setTimeout(function () { if (msg) msg.textContent = ''; }, 3500);
      };
      inp.addEventListener('paste', avisar); inp.addEventListener('drop', avisar);
      inp.setAttribute('autocomplete', 'off');
    });

    // 3b. ✓ verde animado cuando el dato está bien (y en la confirmación, cuando coincide)
    var REGLAS = {
      numeroDocumento: function (v) { return /^[0-9A-Za-z]{5,12}$/.test(v); },
      coNumero: function (v) { return /^[0-9A-Za-z]{5,12}$/.test(v); },
      nombres: function (v) { return v.trim().length > 1; }, apellidos: function (v) { return v.trim().length > 1; },
      coNombres: function (v) { return v.trim().length > 1; }, coApellidos: function (v) { return v.trim().length > 1; },
      email: function (v) { return /^\S+@\S+\.\S+$/.test(v); }, coEmail: function (v) { return /^\S+@\S+\.\S+$/.test(v); },
      celular: function (v) { return /^3\d{9}$/.test(v.replace(/\D/g, '')); }, coCelular: function (v) { return /^3\d{9}$/.test(v.replace(/\D/g, '')); },
      numeroCuenta: function (v) { return v.replace(/\D/g, '').length >= 5; }
    };
    var PAREJAS = { confirmarDocumento: 'numeroDocumento', confirmarEmail: 'email', confirmarCelular: 'celular',
      coConfirmarDocumento: 'coNumero', coConfirmarEmail: 'coEmail', coConfirmarCelular: 'coCelular' };
    // El ✓ va centrado en el campo. Si el campo estaba oculto al medirlo (paso aún no visible), se mide de nuevo
    function ubicarChk(chk, inp) { if (inp.offsetHeight) chk.style.top = (inp.offsetTop + inp.offsetHeight / 2) + 'px'; }
    function reubicarTodos() { document.querySelectorAll('.prem-chk').forEach(function (c) { var i = document.getElementById(c.getAttribute('data-para')); if (i) ubicarChk(c, i); }); }
    window.addEventListener('resize', reubicarTodos);
    function marcarOk(inp) {
      var v = inp.value || '', ok;
      if (PAREJAS[inp.id]) { var o = document.getElementById(PAREJAS[inp.id]); ok = !!v && !!o && v.trim().toLowerCase() === o.value.trim().toLowerCase() && (!REGLAS[o.id] || REGLAS[o.id](o.value)); }
      else if (REGLAS[inp.id]) ok = !!v && REGLAS[inp.id](v);
      else return;
      var caja = inp.parentElement; if (getComputedStyle(caja).position === 'static') caja.style.position = 'relative';
      var chk = caja.querySelector(':scope > .prem-chk[data-para="' + inp.id + '"]');
      if (!chk) { chk = document.createElement('i'); chk.className = 'prem-chk'; chk.setAttribute('data-para', inp.id); chk.setAttribute('aria-hidden', 'true'); caja.appendChild(chk); }
      ubicarChk(chk, inp);
      chk.classList.toggle('si', ok); inp.classList.toggle('prem-ok', ok);
      // (1) Bloque completo: si todos los campos con ✓ del grupo están bien, el grupo late y queda en verde
      var grupo = inp.closest('.grid-2col') || inp.closest('.form-group');
      if (grupo) {
        var chks = grupo.querySelectorAll('.prem-chk'), todo = chks.length > 0;
        chks.forEach(function (c) { if (!c.classList.contains('si')) todo = false; });
        var antes = grupo.classList.contains('prem-listo');
        grupo.classList.toggle('prem-listo', todo);
        if (todo && !antes) { grupo.classList.remove('prem-pulso'); void grupo.offsetWidth; grupo.classList.add('prem-pulso'); }
      }
      revisarSiguiente();
    }

    // (7) Vibración corta (Android; en iPhone el navegador la ignora)
    function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 25); } catch (e) {} }
    function aviso(txt) {
      var t = document.createElement('div'); t.className = 'prem-toast'; t.textContent = txt; document.body.appendChild(t);
      setTimeout(function () { t.classList.add('fuera'); }, 1800); setTimeout(function () { t.remove(); }, 2400);
    }

    // (4) Botón Siguiente: apagado mientras falta algo del paso, se enciende y late cuando todo está bien.
    //     Es solo visual: el botón sigue funcionando y la validación real es la del formulario.
    var btnSig = document.getElementById('btnNext');
    function revisarSiguiente() {
      if (!btnSig) return;
      var pane = document.querySelector('#mainWizard .step-pane.show'); if (!pane) return;
      reubicarTodos();
      var visibles = function (el) { return el.offsetParent !== null; };
      var faltan = Array.prototype.some.call(pane.querySelectorAll('input[required], select[required]'), function (el) { return visibles(el) && el.type !== 'file' && !String(el.value || '').trim(); });
      var malos = Array.prototype.some.call(pane.querySelectorAll('.prem-chk'), function (c) { var i = document.getElementById(c.getAttribute('data-para')); return i && visibles(i) && !c.classList.contains('si'); });
      var listo = !faltan && !malos;
      var antes = btnSig.classList.contains('prem-encendido');
      btnSig.classList.toggle('prem-encendido', listo); btnSig.classList.toggle('prem-dormido', !listo);
      if (listo && !antes) { btnSig.classList.remove('prem-latido'); void btnSig.offsetWidth; btnSig.classList.add('prem-latido'); }
    }
    // También al entrar al formulario desde la bienvenida y al cambiar de paso con los botones
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#btnGoToPayment, #btnNext, #btnPrev')) { setTimeout(revisarSiguiente, 120); setTimeout(revisarSiguiente, 700); } }, true);
    document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#mainWizard')) setTimeout(revisarSiguiente, 0); }, true);
    document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('#mainWizard')) setTimeout(revisarSiguiente, 0); }, true);

    // (2) Barra "Completado de la sección": brilla al subir y celebra al llegar al 100 %
    var xp = document.getElementById('xpBar'), xpCaja = xp && xp.closest('.xp-bar-container'), xpPrev = 0;
    if (xp) new MutationObserver(function () {
      var w = parseFloat(xp.style.width) || 0;
      if (w > xpPrev) { xpCaja.classList.remove('prem-sube'); void xpCaja.offsetWidth; xpCaja.classList.add('prem-sube'); }
      if (w >= 100 && xpPrev < 100) { xpCaja.classList.add('prem-full'); aviso('✨ ¡Sección completa!'); vibrar(40); }
      if (w < 100) xpCaja.classList.remove('prem-full');
      xpPrev = w;
    }).observe(xp, { attributes: true, attributeFilter: ['style'] });

    // (3) Círculo del paso que celebra al completarse  ·  (5) buzón que celebra al recibir el archivo
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        var el = m.target; if (!el.classList) return;
        var era = String(m.oldValue || '');
        if (el.matches('.progress .step') && el.classList.contains('completed') && era.indexOf('completed') === -1) {
          el.classList.remove('prem-celebra'); void el.offsetWidth; el.classList.add('prem-celebra'); vibrar(30);
        }
        if (el.matches('.file-upload') && el.classList.contains('has-file') && era.indexOf('has-file') === -1) {
          el.classList.remove('prem-recibe'); void el.offsetWidth; el.classList.add('prem-recibe'); vibrar(20);
        }
        if (el.matches('#mainWizard .step-pane') && el.classList.contains('show')) setTimeout(revisarSiguiente, 50);
      });
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'], attributeOldValue: true });
    var ids = Object.keys(REGLAS).concat(Object.keys(PAREJAS));
    ids.forEach(function (id) {
      var inp = document.getElementById(id); if (!inp) return;
      inp.addEventListener('input', function () { marcarOk(inp); var c = Object.keys(PAREJAS).filter(function (k) { return PAREJAS[k] === id; })[0]; if (c && document.getElementById(c)) marcarOk(document.getElementById(c)); });
      inp.addEventListener('change', function () { marcarOk(inp); });
      setTimeout(function () { if (inp.value) marcarOk(inp); }, 1500);   // lo que se restaura del progreso guardado
    });

    // 4. Buzones con miniatura
    var pdfjs = null;
    function cargarPdfJs() {
      if (pdfjs) return pdfjs;
      pdfjs = new Promise(function (ok, mal) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; ok(window.pdfjsLib); };
        s.onerror = mal; document.head.appendChild(s);
      });
      return pdfjs;
    }
    function miniatura(inp) {
      var file = inp.files && inp.files[0]; if (!file) return;
      var caja = inp.closest('.file-upload') || inp.parentElement; if (!caja) return;
      var mi = caja.querySelector('.prem-mini');
      if (!mi) { mi = document.createElement('span'); mi.className = 'prem-mini'; var lab = caja.querySelector('.file-label') || caja; lab.appendChild(mi);
        var cm = document.createElement('span'); cm.className = 'prem-cambiar'; cm.textContent = 'Toca para cambiarlo'; lab.appendChild(cm); }
      if (/^image\//.test(file.type)) { mi.innerHTML = '<img alt="">'; mi.firstChild.src = URL.createObjectURL(file); return; }
      if (file.type === 'application/pdf') {
        mi.textContent = '📄';
        cargarPdfJs().then(function (lib) { return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf }).promise; }); })
          .then(function (pdf) { return pdf.getPage(1); })
          .then(function (pg) { var vp = pg.getViewport({ scale: .4 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
            return pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.then(function () { mi.innerHTML = ''; mi.appendChild(c); }); })
          .catch(function () {});
      }
    }
    document.addEventListener('change', function (e) { var t = e.target; if (t && t.type === 'file' && t.closest('.form-container')) miniatura(t); }, true);

    // 5. "Paso X de N · nombre"
    var prog = document.querySelector('#mainWizard .progress');
    if (prog) {
      var cab = document.createElement('div'); cab.className = 'prem-paso'; cab.innerHTML = '<b></b><span></span>';
      prog.parentElement.insertBefore(cab, prog);
      var pinta = function () {
        var panes = Array.prototype.slice.call(document.querySelectorAll('#mainWizard .step-pane'));
        var act = document.querySelector('#mainWizard .step-pane.show'); if (!act) return;
        var h = act.querySelector('h3'); var nombre = h ? h.textContent.replace(/[^\p{L}\p{N}\s()]/gu, '').replace(/\s+/g, ' ').trim() : '';
        cab.querySelector('b').textContent = nombre;
        cab.querySelector('span').textContent = 'Paso ' + (panes.indexOf(act) + 1) + ' de ' + panes.length;
      };
      pinta();
      new MutationObserver(pinta).observe(document.getElementById('mainWizard'), { attributes: true, subtree: true, attributeFilter: ['class'] });
    }

    // 6. Chispas + lluvia de confeti al enviar
    var env = document.getElementById('btnEnviar');
    if (env) env.addEventListener('click', function () {
      vibrar(60);
      var colsC = ['#dcb53c', '#e3cc6c', '#b26001', '#c2a448', '#fff6d0', '#6c4a94'];
      for (var k = 0; k < 70; k++) {
        var cf = document.createElement('i'); cf.className = 'prem-confeti';
        cf.style.cssText = 'left:' + (Math.random() * 100) + 'vw;background:' + colsC[k % colsC.length] + ';animation-delay:' + (Math.random() * .6) + 's;animation-duration:' + (1.8 + Math.random() * 1.4) + 's;--gx:' + ((Math.random() - .5) * 160) + 'px;--gr:' + (Math.random() * 720 - 360) + 'deg';
        document.body.appendChild(cf); setTimeout(function (n) { n.remove(); }.bind(null, cf), 3800);
      }
      var b = env.getBoundingClientRect(), cols = ['#dcb53c', '#e3cc6c', '#b26001', '#c2a448', '#fff'];
      for (var i = 0; i < 36; i++) {
        var s = document.createElement('i'), a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 160;
        s.className = 'prem-chispa';
        s.style.cssText = 'left:' + (b.left + b.width / 2) + 'px;top:' + b.top + 'px;background:' + cols[i % 5] + ';--dx:' + Math.cos(a) * r + 'px;--dy:' + (Math.sin(a) * r - 80) + 'px;box-shadow:0 0 10px ' + cols[i % 5];
        document.body.appendChild(s); setTimeout(function (n) { n.remove(); }.bind(null, s), 1300);
      }
    });
  });
})();
