import { X, UserCheck, Home, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { useState } from 'react';

interface LoginRolesModalProps {
  onClose: () => void;
  onSelectAgent: () => void;
  onSelectOwner: () => void;
}

export default function LoginRolesModal({ onClose, onSelectAgent, onSelectOwner }: LoginRolesModalProps) {
  const [showAgentLogin, setShowAgentLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleMockGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate successful Google Login MVP
    onSelectAgent();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col md:flex-row h-full">
          {/* Left panel - Decorative */}
          <div className="hidden md:flex w-2/5 bg-brand-dark-deep p-8 flex-col justify-between text-stone-300">
            <div>
              <span className="text-xl font-bold tracking-wider text-brand-gold font-sans block mb-1">
                GOLD<span className="text-white font-light text-lg">Life</span>
              </span>
              <span className="text-[8px] tracking-[0.3em] text-brand-gold-dark uppercase font-mono font-medium">
                Real Estate
              </span>
            </div>
            <div className="space-y-4">
              <h3 className="text-white font-serif italic text-2xl">Portal de Acceso</h3>
              <p className="text-xs leading-relaxed font-light">
                Bienvenido al ecosistema integral de Gold Life. Selecciona tu perfil para continuar con el agendamiento o registro.
              </p>
            </div>
          </div>

          {/* Right panel - Content */}
          <div className="w-full md:w-3/5 p-8 flex flex-col justify-center">
            {!showAgentLogin ? (
              <>
                <h3 className="text-2xl font-bold text-stone-900 mb-2">¿Cómo deseas ingresar?</h3>
                <p className="text-sm text-stone-500 mb-8">Selecciona tu perfil para continuar.</p>

                <div className="space-y-4">
                  <button
                    onClick={() => setShowAgentLogin(true)}
                    className="w-full group relative flex items-center p-4 border border-stone-200 rounded-xl hover:border-brand-gold hover:shadow-md transition-all text-left bg-white"
                  >
                    <div className="bg-stone-50 p-3 rounded-lg group-hover:bg-brand-gold/10 transition-colors mr-4">
                      <ShieldCheck className="w-6 h-6 text-stone-700 group-hover:text-brand-gold" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-stone-900">Agente Inmobiliario</h4>
                      <p className="text-xs text-stone-500">Acceso exclusivo para registrar inmuebles</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-brand-gold transition-colors" />
                  </button>

                  <button
                    onClick={onSelectOwner}
                    className="w-full group relative flex items-center p-4 border border-stone-200 rounded-xl hover:border-brand-gold hover:shadow-md transition-all text-left bg-white"
                  >
                    <div className="bg-stone-50 p-3 rounded-lg group-hover:bg-brand-gold/10 transition-colors mr-4">
                      <Home className="w-6 h-6 text-stone-700 group-hover:text-brand-gold" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-stone-900">Propietario</h4>
                      <p className="text-xs text-stone-500">Agendar visita y recibir asesoría</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-brand-gold transition-colors" />
                  </button>
                </div>
              </>
            ) : (
              <div className="animate-fade-in">
                <button
                  onClick={() => setShowAgentLogin(false)}
                  className="text-xs text-stone-500 hover:text-stone-900 mb-6 flex items-center"
                >
                  <ArrowRight className="w-3 h-3 mr-1 rotate-180" />
                  Volver a selección
                </button>

                <div className="text-center mb-6">
                  <div className="inline-flex justify-center items-center w-12 h-12 bg-brand-gold/10 rounded-full mb-3">
                    <UserCheck className="w-6 h-6 text-brand-gold-dark" />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900">Acceso de Agente</h3>
                  <p className="text-xs text-stone-500 mt-1">Ingresa con tus credenciales corporativas</p>
                </div>

                <form onSubmit={handleMockGoogleLogin} className="space-y-4">
                  <button
                    type="submit"
                    className="w-full bg-white border border-stone-300 text-stone-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-stone-50 transition-colors"
                  >
                    {/* Simple Google G SVG */}
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                      </g>
                    </svg>
                    <span>Iniciar sesión con Google</span>
                  </button>
                  <p className="text-[10px] text-center text-stone-400">
                    Solo los agentes autorizados por Gold Life pueden acceder al sistema de registro.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
