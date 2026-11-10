// HuellaCaptura: cámara en vivo con guía ovalada para tomar la huella y convertirla en "huella estampada".
// Uso: const png = await HuellaCaptura.abrir();  // dataURL PNG (fondo transparente) o null si cancela
// Ajustes probados (nov-2026): Moto G -> zoom a la mitad + linterna; iPhone -> lente fijo (no la cámara dual).
(function () {
  const css = `
  .hc-visor{position:fixed;inset:0;background:#000;z-index:9999;display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif}
  .hc-vw{position:relative;flex:1;overflow:hidden}.hc-vw video,.hc-vw canvas{position:absolute;inset:0;width:100%;height:100%}
  .hc-vw video{object-fit:cover}
  .hc-msg{position:absolute;left:0;right:0;top:calc(14px + env(safe-area-inset-top));text-align:center;color:#fff;font-weight:600;text-shadow:0 1px 4px #000;padding:0 16px}
  .hc-meter{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;width:60%;height:8px;border-radius:99px;background:rgba(255,255,255,.25);overflow:hidden}
  .hc-meter i{display:block;height:100%;width:0;background:#c9a24a;transition:width .2s}
  .hc-ctrl{padding:12px 16px calc(14px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px}
  .hc-row{display:flex;gap:8px}.hc-row button{flex:1;font:600 .9rem Inter,system-ui;padding:10px;border-radius:10px;border:1px solid #444;background:transparent;color:#fff}
  .hc-row button:disabled{opacity:.4}.hc-ctrl label{color:#ccc;font-size:.8rem}.hc-ctrl input{width:100%;accent-color:#c9a24a}
  .hc-shot{width:68px;height:68px;border-radius:50%;border:4px solid #fff;background:#c9a24a;align-self:center}`;
  let st;

  function blur(src, w, h, r) {
    const out = new Float32Array(w * h), tmp = new Float32Array(w * h), k = 2 * r + 1;
    for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { tmp[y * w + x] = s / k; s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = s / k; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    return out;
  }

  // Convierte la foto recortada en huella: crestas en tinta, fondo transparente, borde ovalado
  function procesar(src, grosor = 6, contraste = 0, invertir = false) {
    const W = 360, H = 480, c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx2 = c.getContext('2d'); cx2.drawImage(src, 0, 0, W, H);
    const d = cx2.getImageData(0, 0, W, H).data, g = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    const lo = blur(g, W, H, 1), bg = blur(g, W, H, grosor * 2), hp = new Float32Array(W * H), sq = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) { hp[i] = lo[i] - bg[i]; sq[i] = hp[i] * hp[i]; }
    const sd = blur(sq, W, H, grosor * 2), od = cx2.createImageData(W, H), um = contraste / 30;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = hp[i] / (Math.sqrt(sd[i]) + 3); if (invertir) v = -v;
      let negro = v < um; const e = ((x - W / 2) / (W * .47)) ** 2 + ((y - H / 2) / (H * .48)) ** 2;
      if (e > 1 || (e > .8 && Math.random() < (e - .8) / .2)) negro = false;
      const p = i * 4; od.data[p] = 25; od.data[p + 1] = 22; od.data[p + 2] = 40; od.data[p + 3] = negro ? 255 : 0;
    }
    cx2.clearRect(0, 0, W, H); cx2.putImageData(od, 0, 0);
    return c.toDataURL('image/png');
  }

  function ui() {
    if (!document.getElementById('hc-css')) { const s = document.createElement('style'); s.id = 'hc-css'; s.textContent = css; document.head.appendChild(s); }
    const v = document.createElement('div'); v.className = 'hc-visor';
    v.innerHTML = `<div class="hc-vw"><video playsinline muted autoplay></video><canvas></canvas>
      <div class="hc-msg">Pon la yema del índice derecho dentro del óvalo</div><div class="hc-meter"><i></i></div></div>
      <div class="hc-ctrl"><div class="hc-row"><button data-a="lente">Cambiar lente</button><button data-a="luz">Linterna</button><button data-a="x">Cancelar</button></div>
      <div data-w="zoom" hidden><label>Zoom</label><input type="range" data-i="zoom"></div>
      <button class="hc-shot" data-a="shot" aria-label="Tomar foto"></button></div>`;
    document.body.appendChild(v); return v;
  }
  const q = s => st.el.querySelector(s);

  function ovalo() { const m = q('canvas'), W = m.clientWidth, H = m.clientHeight, rx = Math.min(W * .32, 150); return { W, H, cx: W / 2, cy: H * .46, rx, ry: rx * 1.35 }; }
  function mascara(color) {
    const m = q('canvas'), o = ovalo(); m.width = o.W * devicePixelRatio; m.height = o.H * devicePixelRatio;
    const c = m.getContext('2d'); c.scale(devicePixelRatio, devicePixelRatio);
    c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(0, 0, o.W, o.H); c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.ellipse(o.cx, o.cy, o.rx, o.ry, 0, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
    c.lineWidth = 3; c.strokeStyle = color || '#fff'; c.beginPath(); c.ellipse(o.cx, o.cy, o.rx, o.ry, 0, 0, 7); c.stroke();
  }
  function recorte() {
    const v = q('video'), o = ovalo(), e = Math.max(o.W / v.videoWidth, o.H / v.videoHeight);
    const ox = (o.W - v.videoWidth * e) / 2, oy = (o.H - v.videoHeight * e) / 2;
    return { x: (o.cx - o.rx - ox) / e, y: (o.cy - o.ry - oy) / e, w: 2 * o.rx / e, h: 2 * o.ry / e };
  }
  const mini = document.createElement('canvas'); mini.width = 120; mini.height = 160;
  function medir() {
    const v = q('video'); if (!v.videoWidth) return; const r = recorte(), c = mini.getContext('2d', { willReadFrequently: true });
    c.drawImage(v, r.x, r.y, r.w, r.h, 0, 0, 120, 160); const d = c.getImageData(0, 0, 120, 160).data, g = new Float32Array(19200);
    let b = 0; for (let i = 0; i < g.length; i++) { g[i] = .3 * d[i * 4] + .59 * d[i * 4 + 1] + .11 * d[i * 4 + 2]; b += g[i]; } b /= g.length;
    let s = 0, s2 = 0, n = 0; for (let y = 1; y < 159; y++) for (let x = 1; x < 119; x++) { const i = y * 120 + x, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - 120] - g[i + 120]; s += l; s2 += l * l; n++; }
    const nit = s2 / n - (s / n) ** 2; st.max = Math.max(st.max, nit); const rel = nit / st.max;
    q('.hc-meter i').style.width = Math.min(100, rel * 100) + '%';
    const ok = performance.now() - st.t0 > 1800 && nit > 25 && rel > .85;
    q('.hc-msg').textContent = b < 50 ? 'Falta luz: enciende la linterna' : b > 230 ? 'Demasiada luz' : !ok ? (nit < 25 ? 'Aleja el dedo (10–15 cm) hasta que enfoque' : 'Quieto… enfocando') : '¡Perfecto, no te muevas!';
    st.buenos = ok ? st.buenos + 1 : 0; mascara(ok ? '#2f9e5b' : '#fff'); if (st.buenos >= 4) disparar();
  }
  async function abrirCam(id) {
    parar();
    const v = { width: { ideal: 4096 }, height: { ideal: 3072 } }; if (id) v.deviceId = { exact: id }; else v.facingMode = { ideal: 'environment' };
    st.stream = await navigator.mediaDevices.getUserMedia({ video: v, audio: false }); st.track = st.stream.getVideoTracks()[0];
    q('video').srcObject = st.stream; await q('video').play();
    const caps = st.track.getCapabilities ? st.track.getCapabilities() : {}, adv = {};
    if (caps.focusMode && caps.focusMode.includes('continuous')) adv.focusMode = 'continuous';
    if (caps.zoom) adv.zoom = Math.round(((caps.zoom.min + Math.min(caps.zoom.max, 4)) / 2) * 10) / 10;
    if (caps.torch) adv.torch = st.luz;
    try { await st.track.applyConstraints({ advanced: [adv] }); } catch (e) {}
    q('[data-a=luz]').disabled = !caps.torch; q('[data-w=zoom]').hidden = !caps.zoom;
    if (caps.zoom) { const z = q('[data-i=zoom]'); z.min = caps.zoom.min; z.max = Math.min(caps.zoom.max, 4); z.step = caps.zoom.step || .1; z.value = adv.zoom; }
    st.max = 0; st.buenos = 0; st.t0 = performance.now(); st.loop = setInterval(medir, 250);
  }
  async function camaras() {
    const ds = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    const tr = ds.filter(d => /back|rear|trasera|environment/i.test(d.label)); st.cams = tr.length ? tr : ds;
    const fija = d => !/dual|triple/i.test(d.label);
    let i = st.cams.findIndex(d => fija(d) && /ultra/i.test(d.label));
    if (i < 0) i = st.cams.findIndex(d => fija(d) && !/tele/i.test(d.label));
    st.idx = Math.max(0, i); q('[data-a=lente]').disabled = st.cams.length < 2;
  }
  function parar() { clearInterval(st.loop); if (st.stream) st.stream.getTracks().forEach(t => t.stop()); st.stream = null; }
  function cerrar(res) { parar(); st.el.remove(); removeEventListener('resize', st.rz); st.resolve(res); }
  function disparar() {
    const v = q('video'); if (!v.videoWidth) return; const r = recorte(), c = document.createElement('canvas');
    c.width = Math.round(r.w); c.height = Math.round(r.h); c.getContext('2d').drawImage(v, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
    cerrar({ foto: c, png: procesar(c) });
  }

  window.HuellaCaptura = {
    procesar,
    abrir() {
      return new Promise(async resolve => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return resolve(null);
        st = { resolve, luz: true, max: 0, buenos: 0, t0: 0 }; st.el = ui(); mascara();
        st.rz = () => mascara(); addEventListener('resize', st.rz);
        st.el.onclick = async e => {
          const a = e.target.dataset.a; if (!a) return;
          if (a === 'x') cerrar(null);
          if (a === 'shot') disparar();
          if (a === 'luz') { st.luz = !st.luz; try { await st.track.applyConstraints({ advanced: [{ torch: st.luz }] }); } catch (er) {} }
          if (a === 'lente') { st.idx = (st.idx + 1) % st.cams.length; try { await abrirCam(st.cams[st.idx].deviceId); } catch (er) {} }
        };
        q('[data-i=zoom]').oninput = async e => { try { await st.track.applyConstraints({ advanced: [{ zoom: +e.target.value }] }); } catch (er) {} st.max = 0; st.t0 = performance.now(); };
        try {
          await abrirCam(); await camaras();
          const cur = st.track.getSettings().deviceId; if (st.cams[st.idx] && st.cams[st.idx].deviceId !== cur) await abrirCam(st.cams[st.idx].deviceId);
        } catch (e) { cerrar(null); }
      });
    }
  };
})();
