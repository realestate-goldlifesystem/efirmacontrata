// ==========================================
// TECLADO DEL CELULAR (19-nov-2026)
// ==========================================
// En el iPhone (Safari) abrir el teclado NO encoge la pantalla: el teclado se
// monta encima y tapa lo que está abajo, así que una ventana con un campo de
// texto queda escondida detrás. visualViewport sí dice el alto que de verdad se
// ve. Aquí se publica ese alto como variables CSS en <html>:
//   --vv-alto  alto visible (px)        --vv-top  desplazamiento de lo visible (px)
// y la clase "teclado-abierto" mientras el teclado está arriba.
// Las ventanas usan la clase .ajusta-teclado (index.css) para seguir ese alto.

export function instalarAjusteTeclado() {
  const vv = window.visualViewport;
  if (!vv) return;
  const raiz = document.documentElement;
  let abierto = false;
  const ajustar = () => {
    raiz.style.setProperty('--vv-alto', vv.height + 'px');
    raiz.style.setProperty('--vv-top', vv.offsetTop + 'px');
    const ahora = vv.height < window.innerHeight * 0.8;
    raiz.classList.toggle('teclado-abierto', ahora);
    // Al abrirse el teclado, el campo que se está escribiendo queda a la vista
    if (ahora && !abierto) {
      const el = document.activeElement as HTMLElement | null;
      if (el && el.closest('.ajusta-teclado') && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
        setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 50);
      }
    }
    abierto = ahora;
  };
  ajustar();
  vv.addEventListener('resize', ajustar);
  vv.addEventListener('scroll', ajustar);
}
