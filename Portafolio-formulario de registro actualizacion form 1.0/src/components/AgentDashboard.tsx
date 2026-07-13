import React, { useState } from 'react';
import { Calculator, ClipboardList, LogOut, Landmark, X, Building2, ArrowLeft } from 'lucide-react';
import VIPPropertiesPanel from './VIPPropertiesPanel';

interface AgentDashboardProps {
  onOpenForm: () => void;
  onOpenCalculator: () => void;
  onLogout: () => void;
}

export default function AgentDashboard({ onOpenForm, onOpenCalculator, onLogout }: AgentDashboardProps) {
  const [showSasModal, setShowSasModal] = useState(false);
  const [activeView, setActiveView] = useState<'menu' | 'portafolio'>('menu');

  if (activeView === 'portafolio') {
    return (
      <div className="min-h-screen bg-brand-dark animate-fade-in pb-20 relative">
        <button 
          onClick={() => setActiveView('menu')}
          className="fixed top-24 left-4 md:left-8 z-50 flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 rounded-full text-stone-400 hover:text-brand-gold hover:border-brand-gold transition-all shadow-md"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium hidden md:inline">Volver al Panel</span>
        </button>
        <VIPPropertiesPanel />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-brand-dark animate-fade-in relative">
      
      {showSasModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 w-full max-w-4xl rounded-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto animate-fade-in text-left">
            <button onClick={() => setShowSasModal(false)} className="absolute top-4 right-4 text-stone-500 hover:text-white bg-stone-800 p-2 rounded-full"><X className="w-5 h-5"/></button>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Landmark className="w-8 h-8 text-brand-gold" /> Ingeniería Financiera SAS
            </h2>
            <p className="text-stone-400 text-base mb-8 border-b border-stone-800 pb-4">
              Cómo los grandes capitales utilizan las Sociedades por Acciones Simplificadas (SAS) para aportar inmuebles, mitigar impuestos y obtener liquidez en Colombia.
            </p>
            
            <div className="space-y-8">
              {/* Concepto Clave */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3 text-brand-gold">1. El Aporte en Especie (No es Donar, ni Vender)</h3>
                <p className="text-stone-300 text-sm leading-relaxed mb-3">
                  En el mundo empresarial, <strong>"Aportar a una sociedad"</strong> significa que el propietario entrega el inmueble a una empresa (ej. su propia SAS) y a cambio recibe <strong>Acciones</strong> de igual valor. 
                  Según el <strong>Artículo 319 del Estatuto Tributario</strong>, esta transacción es "neutral". Al no haber intercambio por dinero, la DIAN no lo considera una venta y la ganancia ocasional es <strong>$0</strong>.
                </p>
                <div className="bg-stone-950/50 p-4 rounded-xl border border-stone-800">
                  <span className="text-brand-gold font-bold text-sm block mb-1">Ejemplo Numérico:</span>
                  <p className="text-stone-400 text-xs">Tienes un edificio que te costó $1.000 Millones y hoy vale $5.000 Millones. Si se lo <em>donas</em> a tu hijo, él paga 15% sobre lo que recibe. Si lo <em>vendes</em> como persona natural, pagas 15% sobre $4.000 Millones de utilidad. Pero si lo <em>aportas</em> a tu SAS, recibes $5.000 Millones en acciones de tu SAS y pagas $0 de impuestos en esa transacción inicial.</p>
                </div>
              </section>

              {/* Como volverlo liquido */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3 text-sky-400">2. ¿Cómo se obtiene Liquidez (Efectivo)?</h3>
                <p className="text-stone-300 text-sm leading-relaxed mb-4">
                  Una vez que el inmueble está "envuelto" dentro de la SAS, existen 3 rutas principales para convertir esas acciones en dinero en efectivo real para el bolsillo del propietario:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-sky-900/10 border border-sky-800/30 p-4 rounded-xl">
                    <h4 className="text-sky-300 font-bold mb-2">A. Vender la Empresa (El Atajo Ninja)</h4>
                    <p className="text-stone-400 text-xs mb-2">En lugar de vender el edificio, le vendes el 100% de las acciones de tu SAS al inversionista. Él te paga en efectivo y pasa a ser dueño de la SAS (que es dueña del edificio).</p>
                    <div className="bg-stone-950 p-2 rounded text-[11px] text-stone-500 border border-stone-800">
                      <strong className="text-sky-400">Beneficio:</strong> Te ahorras el 100% de los gastos de notaría y beneficencia (que en $5.000M serían casi $80 Millones tirados a la basura). Vender acciones es un contrato privado.
                    </div>
                  </div>

                  <div className="bg-emerald-900/10 border border-emerald-800/30 p-4 rounded-xl">
                    <h4 className="text-emerald-400 font-bold mb-2">B. Créditos Corporativos</h4>
                    <p className="text-stone-400 text-xs mb-2">La SAS pide un crédito comercial multimillonario poniendo el edificio como garantía hipotecaria. El banco suelta el efectivo a la empresa, y la empresa te lo entrega a ti (como préstamo o pago de dividendos).</p>
                    <div className="bg-stone-950 p-2 rounded text-[11px] text-stone-500 border border-stone-800">
                      <strong className="text-emerald-400">Beneficio:</strong> Tienes efectivo en mano, no pagas impuestos de venta, y los intereses de ese crédito los deduce la SAS de su propia declaración de renta.
                    </div>
                  </div>

                  <div className="bg-purple-900/10 border border-purple-800/30 p-4 rounded-xl md:col-span-2">
                    <h4 className="text-purple-400 font-bold mb-2">C. Flujo de Caja y Deducciones Mágicas</h4>
                    <p className="text-stone-400 text-xs mb-2">Si el edificio produce arriendos, la plata le entra a la SAS. La gran ventaja corporativa es que las empresas deducen <em>todo</em> (computadores, gasolina, contador, salarios, remodelaciones, depreciación, etc.).</p>
                    <div className="bg-stone-950 p-2 rounded text-[11px] text-stone-500 border border-stone-800">
                      <strong className="text-purple-400">Beneficio:</strong> La utilidad neta corporativa se exprime al máximo y tributa muchísimo menos que si recibieras esos arriendos como Persona Natural. El saldo limpio te lo sacas al final como dividendos.
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* Botón de Logout en la esquina superior */}
      <button 
        onClick={onLogout}
        className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 rounded-full text-stone-400 hover:text-brand-gold hover:border-brand-gold transition-all z-50 shadow-md hover:shadow-brand-gold/10"
      >
        <LogOut className="w-4 h-4 md:w-5 md:h-5" />
        <span className="text-sm md:text-base font-medium">Cerrar Sesión</span>
      </button>

      <div className="text-center mb-12 max-w-2xl mt-20 md:mt-0">
        <h1 className="text-4xl md:text-5xl font-light text-brand-gold mb-4">
          Panel de Agente VIP
        </h1>
        <p className="text-stone-400 text-lg">
          Selecciona la herramienta que necesitas usar con tu cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        
        {/* Tarjeta de la Calculadora */}
        <button 
          onClick={onOpenCalculator}
          className="group flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 md:p-8 bg-stone-900 border border-stone-800 rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden gap-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-20 h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <Calculator className="w-10 h-10 text-brand-gold" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">Calculadora Inmobiliaria</h2>
            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              Simulador avanzado de crédito, retorno de inversión, flujo de caja y rentabilidad.
            </p>
          </div>
        </button>

        {/* Tarjeta del Formulario */}
        <button 
          onClick={onOpenForm}
          className="group flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 md:p-8 bg-stone-900 border border-stone-800 rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden gap-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-20 h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <ClipboardList className="w-10 h-10 text-brand-gold" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">Registro de Inmuebles</h2>
            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              Captación de propiedades, generación de contratos y checklist de exclusividad.
            </p>
          </div>
        </button>

        {/* Tarjeta de Estrategias SAS */}
        <button 
          onClick={() => setShowSasModal(true)}
          className="group flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 md:p-8 bg-stone-900 border border-stone-800 rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden gap-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-20 h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <Landmark className="w-10 h-10 text-brand-gold" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">Estrategias SAS</h2>
            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              Módulo educativo de ingeniería financiera, aportes en especie y liquidez corporativa.
            </p>
          </div>
        </button>

        {/* Tarjeta de Portafolio VIP */}
        <button 
          onClick={() => setActiveView('portafolio')}
          className="group flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 md:p-8 bg-stone-900 border border-brand-gold/30 rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.1)] hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:-translate-y-2 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl group-hover:bg-brand-gold/20 transition-colors" />
          <div className="w-20 h-20 shrink-0 mb-4 sm:mb-0 sm:mr-6 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors relative z-10 border border-brand-gold/20">
            <Building2 className="w-10 h-10 text-brand-gold" />
          </div>
          <div className="flex-1 relative z-10">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">Portafolio VIP</h2>
            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              Accede al catálogo de inmuebles publicados. Genera y comparte PDFs interactivos con tus clientes.
            </p>
          </div>
        </button>

      </div>
    </div>
  );
}
