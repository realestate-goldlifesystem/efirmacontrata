/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AlertCircle, ShieldCheck, TrendingDown, TrendingUp, Sparkles, AlertOctagon } from 'lucide-react';

export default function ColombiaStats() {
  const [activeTab, setActiveTab] = useState<'riesgos' | 'beneficios'>('riesgos');

  const risks = [
    {
      title: 'Morosidad Generalizada',
      percentage: 24,
      stat: '24% de Arrendatarios',
      description: 'En Colombia, casi una cuarta parte de los arrendatarios independientes incumplen o se retrasan con los pagos periódicos.',
      impact: 'Afecta directamente el flujo de caja e hipotecas del propietario.',
      color: 'from-red-500 to-amber-600',
      icon: AlertCircle,
    },
    {
      title: 'Costos Jurídicos Sorpresa',
      percentage: 18,
      stat: 'Hasta 18% de Ingresos',
      description: 'Los honorarios de abogados y tramitología para restitución judicial absorben un alto porcentaje del retorno anual del inmueble.',
      impact: 'Resta liquidez al patrimonio familiar.',
      color: 'from-orange-500 to-amber-600',
      icon: TrendingDown,
    },
    {
      title: 'Pérdida Crítica de Renta',
      percentage: 30,
      stat: '30% Pérdida Semanal',
      description: 'Un mes de impago equivale a perder casi un tercio del valor estimado de la renta semanal del año completo.',
      impact: 'Recuperar esta pérdida toma hasta un semestre completo.',
      color: 'from-amber-600 to-red-600',
      icon: AlertOctagon,
    },
    {
      title: 'Vacancia Inmobiliaria',
      percentage: 16,
      stat: '16% del Año Vacío',
      description: 'Sin promoción inteligente o agentes especializados, los inmuebles pasan vacíos cerca de 2 meses al año.',
      impact: 'Sigue generando costos de administración y servicios sin aportar ingresos.',
      color: 'from-stone-600 to-stone-500',
      icon: AlertCircle,
    }
  ];

  const benefits = [
    {
      title: 'Garantía del Canon Asegurado',
      percentage: 90,
      stat: '90% Garantía de Póliza',
      description: 'Alrededor del 90% de los casos tramitados con pólizas confiables garantizan la total recuperación del canon de arrendamiento.',
      advantage: 'Ingreso mensual seguro sin importar si el inquilino paga o no.',
      color: 'from-emerald-500 to-amber-400',
      icon: ShieldCheck,
    },
    {
      title: 'Súper Velocidad de Arrendamiento',
      percentage: 85,
      stat: '80% - 90% Más Rápido',
      description: 'La intermediación especializada impulsa de manera crítica la visibilidad, permitiendo arrendar en tiempo récord.',
      advantage: 'Reduce al mínimo el tiempo de vacancia improductivo.',
      color: 'from-amber-400 to-teal-500',
      icon: TrendingUp,
    },
    {
      title: 'Efectividad en Restitución',
      percentage: 80,
      stat: '80% de Casos Resueltos',
      description: 'Las aseguradoras asociadas resuelven la restitución de propiedades de manera ágil, eficiente y respaldada por ley.',
      advantage: 'Nosotros nos encargamos del proceso jurídico sin costo extra.',
      color: 'from-teal-500 to-emerald-500',
      icon: Sparkles,
    },
    {
      title: 'Incremento de Conversión',
      percentage: 70,
      stat: '70% Más Probabilidades',
      description: 'Inquilinos de alto perfil prefieren contratar mediante pólizas colectivas porque perciben mayor formalidad y respaldo.',
      advantage: 'Filtra automáticamente inquilinos confiables y de bajo riesgo.',
      color: 'from-teal-400 to-amber-500',
      icon: ShieldCheck,
    }
  ];

  return (
    <section id="estadisticas" className="py-20 bg-brand-dark border-t border-b border-stone-200 relative">
      {/* Visual background details */}
      <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-brand-gold/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase font-mono tracking-widest text-brand-gold font-bold">PANORAMA DEL MERCADO EN COLOMBIA</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-2 font-sans">
            ¿Por qué contar con nuestros servicios inmobiliarios?
          </h2>
          <p className="text-stone-600 mt-4 text-base font-light">
            Arrendar de forma directa en el mercado colombiano conlleva retos financieros y legales considerables. 
            Compara los riesgos de la informalidad frente a la seguridad del modelo Gold Life.
          </p>

          {/* Core Toggle Buttons */}
          <div className="inline-flex p-1 bg-brand-dark-deep rounded-xl mt-12 border border-stone-200 shadow-sm">
            <button
              id="btn-toggle-risks"
              onClick={() => setActiveTab('riesgos')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'riesgos'
                  ? 'bg-brand-gold text-stone-950 shadow-md'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Riesgos Sin Administración (Directo)</span>
            </button>
            <button
              id="btn-toggle-benefits"
              onClick={() => setActiveTab('beneficios')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'beneficios'
                  ? 'bg-teal-500 text-stone-950 shadow-md'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Beneficios Con Gold Life</span>
            </button>
          </div>
        </div>

        {/* Dynamic Card Dashboard Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {activeTab === 'riesgos'
            ? risks.map((r, i) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.title}
                    id={`risk-card-${i}`}
                    className="bg-brand-dark-deep border border-stone-200 hover:border-red-500/30 p-6 rounded-xl shadow-sm transition-all duration-300 flex flex-col justify-between group h-full"
                  >
                    <div>
                      {/* Metric & Icon */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-red-950/10 rounded-lg border border-red-900/10 text-red-600">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold font-mono text-red-600">{r.stat}</span>
                      </div>

                      <h3 className="text-lg font-bold text-stone-900 mb-2">{r.title}</h3>
                      <p className="text-stone-605 text-sm font-light leading-relaxed mb-4">{r.description}</p>
                    </div>

                    <div className="pt-4 border-t border-stone-200 mt-4">
                      <p className="text-xs text-stone-500 uppercase tracking-wider font-mono">Impacto Estimado</p>
                      <p className="text-xs text-red-600 font-medium mt-1">{r.impact}</p>
                      
                      {/* Horizontal progress visualization */}
                      <div className="w-full bg-brand-dark h-2 rounded-full mt-4 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${r.color}`}
                          style={{ width: `${r.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            : benefits.map((b, i) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.title}
                    id={`benefit-card-${i}`}
                    className="bg-brand-dark-deep border border-stone-200 hover:border-teal-500/30 p-6 rounded-xl shadow-sm transition-all duration-300 flex flex-col justify-between group h-full"
                  >
                    <div>
                      {/* Metric & Icon */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-teal-950/10 rounded-lg border border-teal-900/15 text-teal-600">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold font-mono text-teal-600">{b.stat}</span>
                      </div>

                      <h3 className="text-lg font-bold text-stone-900 mb-2">{b.title}</h3>
                      <p className="text-stone-605 text-sm font-light leading-relaxed mb-4">{b.description}</p>
                    </div>

                    <div className="pt-4 border-t border-stone-200 mt-4">
                      <p className="text-xs text-stone-500 uppercase tracking-wider font-mono">Ventaja Gold Life</p>
                      <p className="text-xs text-teal-600 font-medium mt-1">{b.advantage}</p>
                      
                      {/* Horizontal progress visualization */}
                      <div className="w-full bg-brand-dark h-2 rounded-full mt-4 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${b.color}`}
                          style={{ width: `${b.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Context Summary Callbox */}
        <div className="mt-12 bg-white border border-stone-200 p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-brand-gold/10 rounded-full text-brand-gold-dark shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-stone-900 font-bold text-base">¿La conclusión? La prevención es más económica</h4>
              <p className="text-stone-605 text-sm font-light">
                Contar con pólizas respaldadas por aseguradoras líderes como El Libertador o Zurich reduce tus costos legales hasta en un 50% y blinda tu renta.
              </p>
            </div>
          </div>
          <p className="text-stone-600 text-xs font-mono tracking-wider uppercase">respaldo colombiano certificado</p>
        </div>
      </div>
    </section>
  );
}
