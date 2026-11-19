import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import { GOOGLE_CLIENT_ID, recibirRegresoDeGoogle } from './googleAuth';
import './index.css';
import { instalarAjusteTeclado } from './lib/tecladoMovil';

recibirRegresoDeGoogle();
instalarAjusteTeclado();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
