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
    if (email.toLowerCase().trim() === 'realestate.goldlifesystem@gmail.com') {
      onSelectAgent();
    } else {
      alert("Acceso denegado. Este correo no cuenta con permisos de administrador.");
    }
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
                GOLD<span className="text-stone-900 font-light text-lg">Life</span>
              </span>
              <span className="text-[8px] tracking-[0.3em] text-brand-gold-dark uppercase font-mono font-medium">
                Real Estate
              </span>
            </div>
            <div className="space-y-4">
              <h3 className="text-stone-900 font-serif italic text-2xl">Portal de Acceso</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
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
                  <div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Correo electrónico de administrador"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-brand-gold text-stone-950 font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 hover:bg-brand-gold-dark"
                  >
                    Ingresar al Sistema
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
