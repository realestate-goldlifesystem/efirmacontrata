// Pase del agente en el portafolio (backend/SESION_AGENTE.js).
// Google solo sirve para entrar: el token de Google se canjea una vez por un
// pase propio de 12 horas que se renueva mientras se usa el panel. Vive en
// localStorage para que sobreviva a cerrar la ventana y sirva en otras pestañas.

const URL_BACKEND = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';
export const CLAVE_SESION = 'agentSesion';

type Datos = { e?: string; iat?: number; exp?: number };

function datosDe(pase: string): Datos | null {
  try {
    const p = pase.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(p + '==='.slice((p.length + 3) % 4)));
  } catch {
    return null;
  }
}

/** Pase guardado, si existe y le quedan al menos 30 segundos. */
export function sesionGuardada(): string | null {
  try {
    const pase = localStorage.getItem(CLAVE_SESION);
    return pase && vigente(pase) ? pase : null;
  } catch {
    return null;
  }
}

export function vigente(pase: string | null): boolean {
  if (!pase) return false;
  const d = datosDe(pase);
  return !!d && typeof d.exp === 'number' && d.exp > Date.now() + 30000;
}

/** Milisegundos desde que se emitió el pase (para no renovarlo a cada clic). */
export function edadDelPase(pase: string): number {
  const d = datosDe(pase);
  return d && typeof d.iat === 'number' ? Date.now() - d.iat : Infinity;
}

export function guardarSesion(pase: string | null) {
  try {
    if (pase) localStorage.setItem(CLAVE_SESION, pase);
    else localStorage.removeItem(CLAVE_SESION);
    // Restos del inicio de sesión anterior (solo Google, por pestaña)
    localStorage.removeItem('agentLoggedIn');
    sessionStorage.removeItem('agentCredential');
  } catch {}
}

async function llamar(op: string, credential: string): Promise<{ success: boolean; sesion?: string; message?: string; vencida?: boolean }> {
  const r = await fetch(URL_BACKEND, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion: 'sesionAgente', op, credential }),
  });
  return r.json();
}

/** Canjea el token de Google por el pase de 12 horas. Lanza error con el motivo. */
export async function entrarConGoogle(tokenGoogle: string): Promise<string> {
  let r;
  try {
    r = await llamar('entrar', tokenGoogle);
  } catch {
    throw new Error('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
  }
  if (!r.success || !r.sesion) throw new Error(r.message || 'No se pudo iniciar sesión.');
  return r.sesion;
}

/** Pase con 12 horas nuevas. null si el servidor dijo que ya no sirve; lanza si fue un error pasajero. */
export async function renovarSesion(pase: string): Promise<string | null> {
  const r = await llamar('renovar', pase);
  if (r.success && r.sesion) return r.sesion;
  if (r.vencida) return null;
  throw new Error(r.message || 'No se pudo renovar la sesión.');
}

export async function cerrarSesionEnTodos(pase: string): Promise<void> {
  const r = await llamar('cerrarTodas', pase);
  if (!r.success) throw new Error(r.message || 'No se pudo cerrar la sesión en todos los dispositivos.');
}
