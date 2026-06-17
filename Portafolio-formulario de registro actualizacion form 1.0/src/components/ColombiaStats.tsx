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
      title: 'Impago e Informalidad',
      percentage: 56,
      metric: '56%',
      label: 'Arriendos directos verbales',
      description: 'En Colombia, el 56% de los arriendos se pactan de manera informal o verbal. Esto dispara la morosidad y deja al propietario sin soportes legales para exigir el pago.',
      impact: 'Pérdidas directas de cánones y deudas acumuladas de servicios públicos.',
      color: 'from-red-500 to-amber-500',
      icon: AlertCircle,
    },
    {
      title: 'Desalojos y Pleitos Prolongados',
      percentage: 80,
      metric: '8-18',
      label: 'Meses de litigio civil',
      description: 'Un proceso judicial de restitución de inmueble por falta de pago tarda en promedio de 8 a 18 meses debido a la congestión de los juzgados municipales en Colombia.',
      impact: 'El propietario asume la vacancia y gastos sin recibir ingresos de renta.',
      color: 'from-red-600 to-orange-500',
      icon: AlertOctagon,
    },
    {
      title: 'Costas Judiciales Elevadas',
      percentage: 65,
      metric: 'Hasta 3',
      label: 'Cánones en honorarios',
      description: 'Llevar a cabo una restitución de inmueble de forma directa exige contratar representación legal obligatoria. Los honorarios del abogado diluyen la utilidad del año.',
      impact: 'Resta liquidez al patrimonio familiar y eleva el estrés financiero.',
      color: 'from-orange-500 to-amber-500',
      icon: TrendingDown,
    },
    {
      title: 'Vacancia Improductiva',
      percentage: 45,
      metric: '60-90',
      label: 'Días promedio vacío',
      description: 'Comercializar una propiedad sin promoción digital avanzada ni asesores dedicados retrasa el cierre de 2 a 3 meses, asumiendo gastos fijos de administración.',
      impact: 'Pérdida irrecuperable de renta mensual mientras corren los servicios públicos.',
      color: 'from-stone-500 to-stone-400',
      icon: AlertCircle,
    }
  ];

  const benefits = [
    {
      title: 'Canon de Renta Asegurado',
      percentage: 100,
      metric: '100%',
      label: 'Flujo de caja blindado',
      description: 'Gold Life te garantiza el pago mensual del canon de arrendamiento, cuotas de administración y servicios públicos pendientes, sin importar si el inquilino paga o no.',
      advantage: 'Ingresos mensuales puntuales y predecibles depositados en tu cuenta.',
      color: 'from-teal-500 to-emerald-400',
      icon: ShieldCheck,
    },
    {
      title: 'Trámites y Abogados Gratis',
      percentage: 100,
      metric: '$0',
      label: 'Costo legal de restitución',
      description: 'En caso de mora o incumplimiento contractual, Gold Life y sus aseguradoras aliadas asumen el 100% de los gastos judiciales y honorarios de abogados especializados.',
      advantage: 'Asistencia y blindaje jurídico absoluto sin desembolsar de tu bolsillo.',
      color: 'from-teal-500 to-emerald-500',
      icon: Sparkles,
    },
    {
      title: 'Colocación en Tiempo Récord',
      percentage: 85,
      metric: '< 20',
      label: 'Días promedio de vacancia',
      description: 'Promovemos tu propiedad con material audiovisual prémium en los portales inmobiliarios líderes y redes sociales, reduciendo el tiempo de espera drásticamente.',
      advantage: 'Arrendamos tu inmueble hasta un 80% más rápido que por trato directo.',
      color: 'from-teal-400 to-emerald-400',
      icon: TrendingUp,
    },
    {
      title: 'Filtro de Inquilinos Premium',
      percentage: 99,
      metric: '99.2%',
      label: 'Efectividad en perfilamiento',
      description: 'Realizamos un análisis exhaustivo en centrales de riesgo (Datacrédito/Cifin), solvencia financiera e historial laboral, filtrando inquilinos conflictivos.',
      advantage: 'Arrendatarios de alta calidad que cuidan y respetan tu propiedad.',
      color: 'from-teal-400 to-emerald-500',
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
          <span className="text-xs uppercase font-mono tracking-widest text-brand-gold font-bold">PANORAMA DEL MERCADO EN COLOMBIA 2025</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-2 font-sans">
            ¿Por qué contar con nuestros servicios inmobiliarios?
          </h2>
          <p className="text-stone-600 mt-4 text-base font-light">
            Arrendar directamente en Colombia expone tu patrimonio a riesgos financieros e informales significativos. 
            Compara los costos del modelo tradicional sin respaldo frente a la tranquilidad de Gold Life.
          </p>

          {/* Core Toggle Buttons */}
          <div className="inline-flex p-1 bg-brand-dark-deep rounded-xl mt-12 border border-stone-200 shadow-sm">
            <button
              id="btn-toggle-risks"
              onClick={() => setActiveTab('riesgos')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'riesgos'
                  ? 'bg-brand-gold text-stone-950 shadow-md font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Riesgos Sin Administración (Directo)</span>
            </button>
            <button
              id="btn-toggle-benefits"
              onClick={() => setActiveTab('beneficios')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'beneficios'
                  ? 'bg-teal-500 text-stone-950 shadow-md font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
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
                    className="bg-brand-dark-deep border border-stone-200 hover:border-red-500/40 p-7 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group h-full"
                  >
                    <div>
                      {/* Metric & Icon Row */}
                      <div className="flex justify-between items-center mb-6">
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-600 shadow-sm flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-right pl-3">
                          <span className="text-3xl font-extrabold font-sans tracking-tight text-red-600 block leading-none">{r.metric}</span>
                          <span className="text-[10px] text-stone-500 uppercase tracking-wider font-mono block mt-1 leading-tight">{r.label}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-stone-900 mb-2.5 group-hover:text-red-600 transition-colors">{r.title}</h3>
                      <p className="text-stone-600 text-sm font-normal leading-relaxed mb-6">{r.description}</p>
                    </div>

                    <div className="pt-4 border-t border-stone-200 mt-auto">
                      <span className="text-[9px] text-stone-400 uppercase tracking-widest font-mono block">Impacto Estimado</span>
                      <p className="text-xs text-red-650 font-semibold mt-1 leading-snug">{r.impact}</p>
                      
                      {/* Horizontal progress visualization */}
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] text-stone-500 font-mono mb-1">
                          <span>Nivel de Riesgo</span>
                          <span className="font-bold">{r.percentage}%</span>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden border border-stone-200/50">
                          <div 
                            className={`h-full bg-gradient-to-r ${r.color} rounded-full`}
                            style={{ width: `${r.percentage}%` }}
                          />
                        </div>
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
                    className="bg-brand-dark-deep border border-stone-200 hover:border-teal-500/40 p-7 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group h-full"
                  >
                    <div>
                      {/* Metric & Icon Row */}
                      <div className="flex justify-between items-center mb-6">
                        <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-teal-600 shadow-sm flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-right pl-3">
                          <span className="text-3xl font-extrabold font-sans tracking-tight text-teal-600 block leading-none">{b.metric}</span>
                          <span className="text-[10px] text-stone-500 uppercase tracking-wider font-mono block mt-1 leading-tight">{b.label}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-stone-900 mb-2.5 group-hover:text-teal-600 transition-colors">{b.title}</h3>
                      <p className="text-stone-600 text-sm font-normal leading-relaxed mb-6">{b.description}</p>
                    </div>

                    <div className="pt-4 border-t border-stone-200 mt-auto">
                      <span className="text-[9px] text-stone-400 uppercase tracking-widest font-mono block">Ventaja Gold Life</span>
                      <p className="text-xs text-teal-655 font-semibold mt-1 leading-snug">{b.advantage}</p>
                      
                      {/* Horizontal progress visualization */}
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] text-stone-500 font-mono mb-1">
                          <span>Nivel de Respaldo</span>
                          <span className="font-bold">{b.percentage}%</span>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden border border-stone-200/50">
                          <div 
                            className={`h-full bg-gradient-to-r ${b.color} rounded-full`}
                            style={{ width: `${b.percentage}%` }}
                          />
                        </div>
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
              <h4 className="text-stone-900 font-bold text-base">¿La conclusión? La prevención es más rentable</h4>
              <p className="text-stone-600 text-sm font-light">
                Contar con pólizas integrales respaldadas por aseguradoras líderes como El Libertador o Zurich reduce tus costos de litigio a $0 y blinda la liquidez de tu patrimonio.
              </p>
            </div>
          </div>
          <p className="text-stone-600 text-xs font-mono tracking-wider uppercase">respaldo colombiano certificado 2025</p>
        </div>
      </div>
    </section>
  );
}
