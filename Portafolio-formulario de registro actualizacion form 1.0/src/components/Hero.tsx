/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShieldCheck, ArrowDown, ChevronRight, Calculator, Home } from 'lucide-react';

interface HeroProps {
  onScrollTo: (sectionId: string) => void;
  onOpenRegisterForm: () => void;
}

export default function Hero({ onScrollTo, onOpenRegisterForm }: HeroProps) {
  return (
    <section id="inicio" className="relative min-h-screen bg-brand-dark text-stone-800 pt-24 flex items-center overflow-hidden">
      {/* Editorial Decorative Background Details */}
      <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-brand-gold/10 via-transparent to-transparent opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-brand-purple/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000002_1px,transparent_1px),linear-gradient(to_bottom,#00000002_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full py-12 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side Content Column */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-8 text-left z-10">
          <div className="inline-flex items-center space-x-2 bg-brand-gold/10 border border-brand-gold/25 px-3.5 py-1.5 rounded-full text-xs text-brand-gold-dark font-mono tracking-wider w-fit">
            <ShieldCheck className="w-4 h-4 text-brand-gold" />
            <span>RESPALDO INTEGRAL EN ARRENDAMIENTOS Y VENTAS | TU PROPIEDAD EN LAS MEJORES MANOS</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 font-sans leading-none">
              Tu propiedad en<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark font-serif italic font-normal">
                Manos Expertas
              </span>
            </h1>
            <p className="text-stone-700 text-lg md:text-xl max-w-xl font-light font-sans leading-relaxed">
              Alcanzar el objetivo de arrendar o vender tu propiedad con absoluta tranquilidad es una realidad. En Gold Life te acompañamos de inicio a fin para que logres tu meta sin contratiempos. Te garantizamos flujo de caja mensual con protección total de hasta 36 meses y un valioso respaldo jurídico especializado en restituciones, protegiendo tu patrimonio en cada paso del camino.
            </p>
          </div>

          {/* Core Interactive Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <button
              id="hero-cta-calculator"
              onClick={() => onScrollTo('calculadora')}
              className="bg-brand-gold hover:bg-brand-gold-dark active:scale-98 text-stone-950 font-bold px-8 py-4 rounded-lg shadow-xl shadow-brand-gold/10 transition-all flex items-center justify-center space-x-2 text-base cursor-pointer"
            >
              <Calculator className="w-5 h-5" />
              <span>Simular Rentabilidad</span>
            </button>
            <button
              id="hero-cta-properties"
              onClick={() => onScrollTo('catalogo')}
              className="bg-stone-100 hover:bg-stone-200 border border-stone-300 hover:border-brand-gold text-stone-800 font-semibold px-8 py-4 rounded-lg transition-all flex items-center justify-center space-x-2 text-base cursor-pointer"
            >
              <Home className="w-5 h-5 text-brand-gold" />
              <span>Ver Portafolio de Venta</span>
            </button>
          </div>

          {/* High-End Real Estate Social Proof Badges */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-stone-200 max-w-md">
            <div>
              <p className="text-3xl font-extrabold text-brand-gold">0%</p>
              <p className="text-xs text-stone-600 mt-1 uppercase tracking-wider font-mono">Estrés de Cobro</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-stone-900">36 <span className="text-lg text-brand-gold font-medium">Meses</span></p>
              <p className="text-xs text-stone-600 mt-1 uppercase tracking-wider font-mono">Apoyo Jurídico</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-stone-900">8.0%</p>
              <p className="text-xs text-stone-600 mt-1 uppercase tracking-wider font-mono">Tarifa Multi-propiedad</p>
            </div>
          </div>
        </div>

        {/* Right Side Visual Column (Modern real estate luxury house showcase) */}
        <div className="lg:col-span-5 relative z-10 w-full flex items-center justify-center lg:justify-end mt-8 lg:mt-0">
          <div className="relative w-full max-w-sm sm:max-w-md aspect-[4/5] rounded-2xl overflow-hidden shadow-xl border border-stone-200 bg-stone-100 group">
            <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-stone-900/5 transition-all duration-300 z-10" />
            <img 
              referrerPolicy="no-referrer"
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=80" 
              alt="Propiedad de Lujo Gold Life" 
              className="absolute inset-0 w-full h-full object-cover transform scale-102 group-hover:scale-105 transition-transform duration-700"
            />
            {/* Visual Callout Overlay */}
            <div className="absolute bottom-6 left-6 right-6 z-20 bg-white/95 backdrop-blur-md border border-stone-205 p-5 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-brand-gold font-bold">ÚLTIMO REGISTRO</span>
                  <h4 className="text-sm font-semibold text-stone-900 mt-0.5">Apartamento Superior</h4>
                  <p className="text-xs text-stone-600">Arrendado en tiempo récord | Garantía de Renta</p>
                </div>
                <button 
                  id="hero-floating-badge-register"
                  onClick={onOpenRegisterForm}
                  className="bg-stone-100 hover:bg-brand-gold text-stone-800 hover:text-stone-950 p-2.5 rounded-lg border border-stone-200 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bounce scroll down indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center cursor-pointer opacity-80 hover:opacity-100 transition-opacity" onClick={() => onScrollTo('servicios')}>
        <span className="text-[10px] tracking-widest text-stone-600 uppercase font-mono mb-1">Explorar</span>
        <ArrowDown className="w-4 h-4 text-brand-gold animate-bounce" />
      </div>
    </section>
  );
}
