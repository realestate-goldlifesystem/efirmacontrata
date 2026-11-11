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

    // 6. Chispas al enviar
    var env = document.getElementById('btnEnviar');
    if (env) env.addEventListener('click', function () {
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
