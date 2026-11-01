import { jwtDecode } from 'jwt-decode';

export const GOOGLE_CLIENT_ID = "825455387668-asnkq57s4voon63c38b41e4q8qvc0b2e.apps.googleusercontent.com";
export const CORREO_AGENTE = 'realestate.goldlifesystem@gmail.com';

// Debe estar en "URIs de redireccionamiento autorizados" del cliente en Google Cloud.
const URL_REGRESO = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/portafolio/';

// En celular el botón de Google abre otra pestaña que no vuelve sola al portafolio:
// se va a Google en esta misma pestaña y Google regresa con el token en la URL.
export function iniciarGoogleEnMismaPestana() {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem('googleNonce', nonce);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: URL_REGRESO,
    response_type: 'id_token',
    scope: 'openid email',
    prompt: 'select_account',
    nonce,
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

// Al volver de Google deja la sesión guardada, igual que el botón normal. Corre antes
// de pintar la app para que entre directo al panel.
export function recibirRegresoDeGoogle() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const token = hash.get('id_token');
  if (!token && !hash.get('error')) return;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  if (!token) return; // canceló en Google: queda en la página normal
  try {
    const datos = jwtDecode<{ email?: string; nonce?: string }>(token);
    const nonce = sessionStorage.getItem('googleNonce');
    sessionStorage.removeItem('googleNonce');
    if (!nonce || datos.nonce !== nonce) {
      alert('No se pudo confirmar el inicio de sesión. Intenta de nuevo.');
    } else if (datos.email?.toLowerCase().trim() !== CORREO_AGENTE) {
      alert('Acceso denegado. Este correo no cuenta con permisos de administrador.');
    } else {
      localStorage.setItem('agentLoggedIn', 'true');
      sessionStorage.setItem('agentCredential', token);
    }
  } catch {
    alert('Error procesando las credenciales de Google.');
  }
}
