// Aviso propio de Gold Life en lugar del pop-up del navegador (27-oct-2026).
// Reemplaza window.alert en las páginas que lo cargan: mismo uso, alert('texto'),
// pero se ve con la marca y no bloquea la página. Se cierra con "Entendido",
// tocando afuera o con Escape.
(function () {
  const css = `
    .gl-aviso { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
      background: rgba(0,0,0,.72); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: glAparecer .2s ease; }
    .gl-aviso .gl-caja { width: 100%; max-width: 380px; background: #1c1917; border: 1px solid rgba(212,175,55,.45); border-radius: 22px;
      padding: 24px 22px 18px; text-align: center; color: #f5f5f4; box-shadow: 0 30px 80px rgba(0,0,0,.6); animation: glSubir .28s ease;
      font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .gl-aviso .gl-icono { width: 52px; height: 52px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; font-size: 24px;
      background: rgba(212,175,55,.12); box-shadow: 0 0 0 1px rgba(212,175,55,.35); }
    .gl-aviso p { margin: 0 0 18px; font-size: 15px; line-height: 1.55; color: #e7e5e4; white-space: pre-line; }
    .gl-aviso button { width: 100%; border: 0; border-radius: 14px; padding: 14px; font-size: 15.5px; font-weight: 700; cursor: pointer;
      color: #0c0a09; background: linear-gradient(135deg, #e8c766, #d4af37); }
    @keyframes glAparecer { from { opacity: 0; } to { opacity: 1; } }
    @keyframes glSubir { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }`;
  function estilos() {
    if (document.getElementById('gl-aviso-css')) return;
    const s = document.createElement('style'); s.id = 'gl-aviso-css'; s.textContent = css;
    document.head.appendChild(s);
  }
  window.alert = function (texto) {
    estilos();
    const capa = document.createElement('div');
    capa.className = 'gl-aviso';
    capa.setAttribute('role', 'alertdialog'); capa.setAttribute('aria-modal', 'true');
    const caja = document.createElement('div'); caja.className = 'gl-caja';
    const icono = document.createElement('div'); icono.className = 'gl-icono'; icono.textContent = '💡';
    const p = document.createElement('p'); p.textContent = String(texto == null ? '' : texto);
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Entendido';
    caja.append(icono, p, b); capa.appendChild(caja);
    const cerrar = () => { capa.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (e) => { if (e.key === 'Escape' || e.key === 'Enter') cerrar(); };
    b.onclick = cerrar;
    capa.onclick = (e) => { if (e.target === capa) cerrar(); };
    document.addEventListener('keydown', tecla);
    (document.body || document.documentElement).appendChild(capa);
    b.focus();
  };
})();
