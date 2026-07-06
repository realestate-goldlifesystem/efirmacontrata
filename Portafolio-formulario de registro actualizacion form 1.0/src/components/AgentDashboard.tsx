import React from 'react';
import { Calculator, ClipboardList, LogOut } from 'lucide-react';

interface AgentDashboardProps {
  onOpenForm: () => void;
  onOpenCalculator: () => void;
  onLogout: () => void;
}

export default function AgentDashboard({ onOpenForm, onOpenCalculator, onLogout }: AgentDashboardProps) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-brand-dark animate-fade-in relative">
      
      {/* Botón de Logout en la esquina superior */}
      <button 
        onClick={onLogout}
        className="absolute top-6 right-6 flex items-center gap-2 text-stone-400 hover:text-brand-gold transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>Cerrar Sesión</span>
      </button>

      <div className="text-center mb-12 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-light text-brand-gold mb-4">
          Panel de Agente VIP
        </h1>
        <p className="text-stone-400 text-lg">
          Selecciona la herramienta que necesitas usar con tu cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        
        {/* Tarjeta de la Calculadora */}
        <button 
          onClick={onOpenCalculator}
          className="group flex flex-col items-center justify-center p-12 bg-stone-900 border border-stone-800 rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-24 h-24 mb-6 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <Calculator className="w-12 h-12 text-brand-gold" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-3">Calculadora Inmobiliaria</h2>
          <p className="text-stone-400 text-center">
            Simulador avanzado de crédito, retorno de inversión, flujo de caja y rentabilidad.
          </p>
        </button>

        {/* Tarjeta del Formulario */}
        <button 
          onClick={onOpenForm}
          className="group flex flex-col items-center justify-center p-12 bg-stone-900 border border-stone-800 rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-24 h-24 mb-6 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <ClipboardList className="w-12 h-12 text-brand-gold" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-3">Registro de Inmuebles</h2>
          <p className="text-stone-400 text-center">
            Captación de propiedades, generación de contratos y checklist de exclusividad.
          </p>
        </button>

      </div>
    </div>
  );
}
