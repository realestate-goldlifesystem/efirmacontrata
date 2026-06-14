/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ShieldCheck, UserCheck, Calendar, Zap, FilePenLine, Wrench, CheckCircle2 } from 'lucide-react';

interface ServicesProps {
  onScrollTo: (sectionId: string) => void;
  onSelectServiceType: (service: 'corretaje' | 'administracion' | 'venta') => void;
}

export default function ServicesDetailed({ onScrollTo, onSelectServiceType }: ServicesProps) {
  const [activeTab, setActiveTab] = useState<'administracion' | 'corretaje' | 'venta'>('administracion');

  const handleServiceSelect = (service: 'corretaje' | 'administracion' | 'venta') => {
    onSelectServiceType(service);
    onScrollTo('registro');
  };

  const featuresCorretaje = [
    { title: 'Búsqueda Efectiva de Clientes', desc: 'Filtramos e identificamos inquilinos confiables mediante centrales de riesgo en tiempo récord, cuidando tu propiedad como si fuera propia.', icon: UserCheck },
    { title: 'Acompañamiento Profesional', desc: 'Te asesoramos desde el primer contacto comercial hasta la firma legal y la entrega material del inmueble con acta de inventario rigurosa.', icon: ShieldCheck },
    { title: 'Póliza Opcional Flex', desc: 'Protección opcional de arriendo por 6 meses (25% del primer mes) o 12 meses (50% del primer mes) ante imprevistos de pago.', icon: Calendar },
    { title: 'Gestión de Servicios Públicos', desc: 'Supervisión del correcto empalme y garantía de que las facturas no acumulen deudas previas inesperadas durante la entrega.', icon: Zap },
    { title: 'Enfoque Estratégico', desc: 'Especialistas en la promoción y colocación ágil de inmuebles residenciales y comerciales con máximo potencial.', icon: CheckCircle2 },
  ];

  const featuresAdministracion = [
    { title: 'Ingreso Mensual Asegurado', desc: 'Olvídate de retrasos. Gold Life te garantiza los recursos directamente en tu cuenta cada mes, pague o no el inquilino.', icon: CheckCircle2 },
    { title: 'Cobro Centralizado y Humano', desc: 'Coordinamos la facturación y cobranza directa. Tú solo descansas y recibes tus ganancias sin llamadas ni negociaciones desgastantes.', icon: UserCheck },
    { title: 'Firma Electrónica Avanzada', desc: 'Agilizamos el cierre de contratos mediante firmas electrónicas certificadas y adaptadas a la legislación colombiana vigente.', icon: FilePenLine },
    { title: 'Blindaje Jurídico de 36 Meses', desc: 'Un amparo completo que cubre el canon de arrendamiento y deudas asociadas, con blindaje legal absoluto para tu tranquilidad.', icon: ShieldCheck },
    { title: 'Gestión de Mantenimiento 24/7', desc: 'Coordinamos técnicos calificados ante incidentes, reparaciones locativas o tuberías rotas. Tus propiedades siempre en perfecto estado.', icon: Wrench },
    { title: 'Restitución de Inmuebles sin Sobrecostos', desc: 'Acompañamiento y representación por defensores jurídicos especializados para lograr la restitución ágil de tu propiedad, libre de aranceles de defensa adicionales.', icon: ShieldCheck },
    { title: 'Optimización de Rentabilidad', desc: 'Maximizamos el rendimiento de tu inversión con un análisis constante del mercado para ajustar el canon ideal.', icon: ShieldCheck },
  ];

  const featuresVenta = [
    { title: 'Promoción Digital de Alto Impacto', desc: 'Diseñamos estrategias de mercadeo digital avanzado con fotografía profesional, tomas cinematográficas y publicación destacada en portales élite del país.', icon: CheckCircle2 },
    { title: 'Filtro y Perfilación de Compradores', desc: 'Pre-calificamos rigurosamente la capacidad económica y crédito aprobado de cada interesado para asegurar visitas seguras y ofertas de compra reales.', icon: UserCheck },
    { title: 'Asesoría y Estudio de Títulos', desc: 'Llevamos a cabo un análisis preventivo de tradición y libertad, estructurando la Promesa de Compraventa para un negocio jurídicamente impecable.', icon: ShieldCheck },
    { title: 'Valoración Comercial Científica', desc: 'Estudio comparativo para sugerir el precio de mercado más favorable para una venta ágil y con la mayor rentabilidad posible.', icon: Wrench },
    { title: 'Esquema de Comisión Justa (3%)', desc: 'Cobramos una tarifa competitiva de intermediación del 3% únicamente al momento del cierre exitoso y firma de la escritura pública del inmueble.', icon: FilePenLine },
  ];

  return (
    <section id="servicios" className="py-20 bg-brand-dark text-stone-800 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-brand-gold/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-60 h-60 bg-brand-purple/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase font-mono tracking-widest text-brand-gold font-bold">NUESTROS SERVICIOS</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-2 font-sans">
            Soluciones inmobiliarias con total respaldo
          </h2>
          <p className="text-stone-600 mt-4 text-base font-light">
            Tu compañero de confianza para encontrar el inquilino o comprador perfecto. Elige el nivel de administración, corretaje o venta que mejor se adapte a tu necesidad.
          </p>

          {/* Interactive tabs */}
          <div className="flex justify-center mt-10">
            <div className="bg-brand-dark-deep p-1.5 rounded-xl border border-stone-200 flex flex-wrap gap-1 justify-center max-w-2xl">
              <button
                id="tab-administracion"
                onClick={() => setActiveTab('administracion')}
                className={`px-5 py-3 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'administracion'
                    ? 'bg-brand-gold text-stone-950 font-bold shadow-md'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                ADMINISTRACIÓN DE ARRIENDOS
              </button>
              <button
                id="tab-corretaje"
                onClick={() => setActiveTab('corretaje')}
                className={`px-5 py-3 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'corretaje'
                    ? 'bg-white text-brand-gold border border-stone-200 font-bold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                CORRETAJE INMOBILIARIO
              </button>
              <button
                id="tab-venta"
                onClick={() => setActiveTab('venta')}
                className={`px-5 py-3 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'venta'
                    ? 'bg-brand-gold/15 text-brand-gold-dark border border-brand-gold/30 font-bold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                VENTA EXCLUSIVA
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Service Column Text Detail */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <div className="inline-block px-3 py-1 bg-brand-gold/10 text-brand-gold-dark rounded-md text-xs font-mono tracking-widest font-bold uppercase mb-3 border border-brand-gold/20">
                {activeTab === 'administracion' ? 'Gestión Integral Sin Estrés' : activeTab === 'corretaje' ? 'Cierra el Inquilino Ideal' : 'Promoción Exclusiva y Cierre Ágil'}
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 animate-fade-in">
                {activeTab === 'administracion' 
                  ? 'Administración Integral: Tu renta 100% blindada' 
                  : activeTab === 'corretaje'
                  ? 'Corretaje Profesional: Seguridad y resultados rápidos'
                  : 'Venta de Propiedades: Comercialización prémium y sin riesgos'}
              </h3>
              <p className="text-stone-700 mt-4 font-light leading-relaxed">
                {activeTab === 'administracion'
                  ? 'El modelo definitivo de tranquilidad para propietarios e inversionistas. Nos encargamos de absolutamente todo: desde la búsqueda inicial del inquilino ideal, la firma electrónica certificada del contrato, hasta el recaudo mensual de la renta, mantenimiento preventivo y el pago puntual garantizado en tu cuenta bancaria.'
                  : activeTab === 'corretaje'
                  ? 'Si prefieres delegar únicamente la comercialización y el filtro estricto de inquilinos con centrales de riesgo, nuestro corretaje estrella te garantiza un contrato de arriendo de altísima calidad con actas de inventario detalladas y un acompañamiento legal impecable.'
                  : 'Nuestra división de ventas ofrece un servicio de broker y asesoría experta para tu propiedad. Diseñamos toda la experiencia de exhibición con promoción destacada de alto nivel, perfilamos financiera y legalmente a los prospectos de compra, y nos encargamos de todo el estudio legal y escrituración.'}
              </p>
            </div>

            {/* Custom Interactive Badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-brand-dark-deep rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-600 block tracking-widest uppercase font-mono">COSTOS / HONORARIOS</span>
                <span className="text-lg font-bold text-brand-gold-dark block mt-1">
                  {activeTab === 'administracion' ? '8.5% mensual' : activeTab === 'corretaje' ? '100% del Canon' : '3% del Valor de Venta'}
                </span>
                <span className="text-xs text-stone-550 block mt-1 leading-tight">
                  {activeTab === 'administracion' 
                    ? '¡O baja al 8.0% mensual si administras 2 o más propiedades!' 
                    : activeTab === 'corretaje'
                    ? '(Única comisión retenida del primer mes de arriendo)'
                    : '(Cobrado solo tras la firma exitosa de la escritura pública)'}
                </span>
              </div>

              <div className="p-4 bg-brand-dark-deep rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-600 block tracking-widest uppercase font-mono">COBERTURA / SEGURIDAD</span>
                <span className="text-lg font-bold text-stone-900 block mt-1 flex items-center space-x-1">
                  <span>{activeTab === 'administracion' ? 'Hasta 36 Meses' : activeTab === 'corretaje' ? 'Estudio Especializado' : 'Estudio de Títulos Prémium'}</span>
                </span>
                <span className="text-xs text-stone-550 block mt-1 leading-tight">
                  {activeTab === 'administracion' 
                    ? 'Protección jurídica de restitución y amparo de cánones' 
                    : activeTab === 'corretaje'
                    ? 'Verificación estricta en centrales para tu tranquilidad'
                    : 'Garantía legal completa de tradición y libertad'}
                </span>
              </div>
            </div>

            {/* Selection CTA */}
            <div className="pt-2">
              <button
                id={`cta-select-${activeTab}`}
                onClick={() => handleServiceSelect(activeTab)}
                className="w-full sm:w-auto bg-brand-gold hover:bg-brand-gold-dark active:scale-98 text-stone-950 font-bold px-8 py-4 rounded-lg shadow-lg shadow-brand-gold/10 cursor-pointer text-center text-sm transition-all"
              >
                Elegir {activeTab === 'administracion' ? 'Administración' : activeTab === 'corretaje' ? 'Corretaje' : 'Ventas'} y Registrar
              </button>
            </div>
          </div>

          {/* Service Column Benefits List */}
          <div className="lg:col-span-6">
            <div className="bg-brand-dark-deep border border-stone-200 p-8 rounded-2xl space-y-6">
              <h4 className="text-stone-700 font-mono tracking-widest text-xs uppercase border-b border-stone-200 pb-4">
                Beneficios Incluidos en el Servicio
              </h4>

              <div className="grid grid-cols-1 gap-6 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'administracion'
                  ? featuresAdministracion.map((feat, idx) => {
                      const Icon = feat.icon;
                      return (
                        <div key={idx} id={`admin-feature-${idx}`} className="flex space-x-4 items-start">
                          <div className="p-2.5 bg-brand-gold/10 rounded-lg text-brand-gold-dark shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-stone-900 text-base">{feat.title}</h5>
                            <p className="text-stone-600 text-sm font-light mt-1 leading-relaxed">{feat.desc}</p>
                          </div>
                        </div>
                      );
                    })
                  : activeTab === 'corretaje'
                  ? featuresCorretaje.map((feat, idx) => {
                      const Icon = feat.icon;
                      return (
                        <div key={idx} id={`corretaje-feature-${idx}`} className="flex space-x-4 items-start">
                          <div className="p-2.5 bg-white rounded-lg text-brand-gold-dark shrink-0 border border-stone-200 shadow-sm">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-stone-900 text-base">{feat.title}</h5>
                            <p className="text-stone-600 text-sm font-light mt-1 leading-relaxed">{feat.desc}</p>
                          </div>
                        </div>
                      );
                    })
                  : featuresVenta.map((feat, idx) => {
                      const Icon = feat.icon;
                      return (
                        <div key={idx} id={`venta-feature-${idx}`} className="flex space-x-4 items-start">
                          <div className="p-2.5 bg-brand-gold/10 rounded-lg text-brand-gold-dark shrink-0 border border-brand-gold/25">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-stone-900 text-base">{feat.title}</h5>
                            <p className="text-stone-600 text-sm font-light mt-1 leading-relaxed">{feat.desc}</p>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
