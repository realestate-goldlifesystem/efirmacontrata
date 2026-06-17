/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, UserCheck, Calendar, Zap, FilePenLine, Wrench, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ServicesProps {
  onScrollTo: (sectionId: string) => void;
  onSelectServiceType: (service: 'corretaje' | 'administracion' | 'venta' | 'vendi-renta' | 'admi-venta') => void;
}

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

const featuresVendiRenta = [
  { title: 'Doble Promoción Simultánea', desc: 'Tu inmueble se publica en los mercados de arriendo y venta al mismo tiempo, multiplicando exponencialmente las posibilidades de cierre.', icon: Zap },
  { title: 'Asesoría Cruzada', desc: 'Filtramos tanto prospectos de inquilinos como posibles compradores, presentándote siempre la opción más rentable en el menor tiempo.', icon: UserCheck },
  { title: 'Flexibilidad Estratégica', desc: 'Si logramos un excelente inquilino primero, aseguras ingresos mientras decides si continuar o pausar la venta.', icon: Calendar },
  { title: 'Honorarios Inteligentes', desc: 'Solo pagas por el negocio que se concrete primero: 100% del canon si es arriendo, o 3% si es venta. Nunca ambos.', icon: FilePenLine },
  { title: 'Acompañamiento Legal Especializado', desc: 'Desde el contrato de arrendamiento blindado hasta la promesa de compraventa, todo bajo un marco jurídico robusto.', icon: ShieldCheck },
];

const featuresAdmiVenta = [
  { title: 'Ingreso Constante mientras Vendes', desc: 'Asegura tu flujo de caja con un inquilino calificado y nuestra administración que te paga cumplido, mientras paralelamente buscamos el comprador ideal.', icon: CheckCircle2 },
  { title: 'Gestión Completa del Inquilino', desc: 'Nos encargamos de cobrar, administrar e incluso coordinar las visitas de venta con el inquilino sin que tú te desgastes.', icon: UserCheck },
  { title: 'Protección Jurídica Total', desc: 'Disfruta de hasta 36 meses de cobertura legal y protección de canon mientras el inmueble sigue en el mercado de ventas.', icon: ShieldCheck },
  { title: 'Estrategia de Venta a Inversionistas', desc: 'Un inmueble arrendado y bien administrado es altamente atractivo para otros inversionistas, facilitando una venta rápida y a mejor precio.', icon: Zap },
  { title: 'Honorarios Transparentes', desc: '8.5% mensual por la administración pacífica, y 3% únicamente cuando se logre firmar la escritura pública de venta.', icon: FilePenLine },
];

export default function ServicesDetailed({ onScrollTo, onSelectServiceType }: ServicesProps) {
  const [activeTab, setActiveTab] = useState<'administracion' | 'corretaje' | 'venta' | 'vendi-renta' | 'admi-venta'>('administracion');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getActiveFeatures = () => {
    switch (activeTab) {
      case 'corretaje': return featuresCorretaje;
      case 'venta': return featuresVenta;
      case 'vendi-renta': return featuresVendiRenta;
      case 'admi-venta': return featuresAdmiVenta;
      case 'administracion':
      default:
        return featuresAdministracion;
    }
  };

  const features = getActiveFeatures();
  const N = features.length;
  const tripledFeatures = [...features, ...features, ...features];

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Center scroll on Copy 2 initially
    const initScrollPosition = () => {
      const children = container.children;
      if (children.length >= 2 * N) {
        const targetOffset = (children[N] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft;
        container.scrollTo({ left: targetOffset, behavior: 'instant' });
      }
    };

    requestAnimationFrame(initScrollPosition);

    let isUserInteracting = false;
    let autoScrollInterval: number;
    let scrollTimeout: number;

    // Wrap around smoothly after scroll finishes (debounced wrap check)
    const handleScrollWrap = () => {
      const children = container.children;
      if (children.length < 3 * N) return;

      const offsetDiff = (children[N] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft;
      const startBoundary = (children[N] as HTMLElement).offsetLeft;
      const endBoundary = (children[2 * N] as HTMLElement).offsetLeft;

      // Wrap left/right
      if (container.scrollLeft >= endBoundary - 10) {
        container.scrollTo({ left: container.scrollLeft - offsetDiff, behavior: 'instant' });
      } else if (container.scrollLeft <= startBoundary - 10) {
        container.scrollTo({ left: container.scrollLeft + offsetDiff, behavior: 'instant' });
      }
    };

    const onScroll = () => {
      window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(handleScrollWrap, 150);
    };

    const startAutoScroll = () => {
      autoScrollInterval = window.setInterval(() => {
        if (!container || isUserInteracting) return;
        const firstCard = container.querySelector('div') as HTMLElement;
        const scrollAmount = firstCard ? firstCard.offsetWidth + 24 : 300; // 24 is gap-6
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }, 3000); // 3 seconds
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    startAutoScroll();

    // Pause autoScroll on interaction
    const handleInteractStart = () => { isUserInteracting = true; };
    const handleInteractEnd = () => { 
      isUserInteracting = false; 
      clearInterval(autoScrollInterval);
      startAutoScroll();
    };

    container.addEventListener('touchstart', handleInteractStart, { passive: true });
    container.addEventListener('touchend', handleInteractEnd);
    container.addEventListener('mouseenter', handleInteractStart);
    container.addEventListener('mouseleave', handleInteractEnd);

    return () => {
      clearInterval(autoScrollInterval);
      window.clearTimeout(scrollTimeout);
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('touchstart', handleInteractStart);
      container.removeEventListener('touchend', handleInteractEnd);
      container.removeEventListener('mouseenter', handleInteractStart);
      container.removeEventListener('mouseleave', handleInteractEnd);
    };
  }, [activeTab, N]);

  const handleServiceSelect = (service: 'corretaje' | 'administracion' | 'venta' | 'vendi-renta' | 'admi-venta') => {
    onSelectServiceType(service);
    onScrollTo('registro');
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const firstCard = container.querySelector('div') as HTMLElement;
    const scrollAmount = firstCard ? firstCard.offsetWidth + 24 : 300; // 24 is gap-6
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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
            <div className="bg-brand-dark-deep p-1.5 rounded-xl border border-stone-200 flex flex-wrap gap-1 justify-center max-w-4xl">
              <button
                id="tab-administracion"
                onClick={() => setActiveTab('administracion')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'administracion'
                    ? 'bg-brand-gold text-stone-950 font-bold shadow-md'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                ADMINISTRACIÓN
              </button>
              <button
                id="tab-corretaje"
                onClick={() => setActiveTab('corretaje')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'corretaje'
                    ? 'bg-white text-brand-gold border border-stone-200 font-bold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                CORRETAJE
              </button>
              <button
                id="tab-venta"
                onClick={() => setActiveTab('venta')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'venta'
                    ? 'bg-brand-gold/15 text-brand-gold-dark border border-brand-gold/30 font-bold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                VENTA EXCLUSIVA
              </button>
              <button
                id="tab-vendirenta"
                onClick={() => setActiveTab('vendi-renta')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'vendi-renta'
                    ? 'bg-gradient-to-r from-brand-gold to-brand-gold-dark text-stone-950 font-bold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                VENDI-RENTA
              </button>
              <button
                id="tab-admiventa"
                onClick={() => setActiveTab('admi-venta')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'admi-venta'
                    ? 'bg-stone-900 text-brand-gold border border-brand-gold font-bold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                ADMI-VENTA
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
                {activeTab === 'administracion' ? 'Gestión Integral Sin Estrés' : 
                 activeTab === 'corretaje' ? 'Cierra el Inquilino Ideal' : 
                 activeTab === 'venta' ? 'Promoción Exclusiva y Cierre Ágil' :
                 activeTab === 'vendi-renta' ? 'Maximiza tus Opciones' :
                 'Ingresos Constantes y Venta Estratégica'}
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 animate-fade-in">
                {activeTab === 'administracion' 
                  ? 'Administración Integral: Tu renta 100% blindada' 
                  : activeTab === 'corretaje'
                  ? 'Corretaje Profesional: Seguridad y resultados rápidos'
                  : activeTab === 'venta'
                  ? 'Venta de Propiedades: Comercialización prémium y sin riesgos'
                  : activeTab === 'vendi-renta'
                  ? 'Vendi-Renta: Doble exposición, resultados más rápidos'
                  : 'Admi-Venta: El combo perfecto para inversionistas'}
              </h3>
              <p className="text-stone-700 mt-4 font-light leading-relaxed">
                {activeTab === 'administracion'
                  ? 'El modelo definitivo de tranquilidad para propietarios e inversionistas. Nos encargamos de absolutamente todo: desde la búsqueda inicial del inquilino ideal, la firma electrónica certificada del contrato, hasta el recaudo mensual de la renta, mantenimiento preventivo y el pago puntual garantizado en tu cuenta bancaria.'
                  : activeTab === 'corretaje'
                  ? 'Si prefieres delegar únicamente la comercialización y el filtro estricto de inquilinos con centrales de riesgo, nuestro corretaje estrella te garantiza un contrato de arriendo de altísima calidad con actas de inventario detalladas y un acompañamiento legal impecable.'
                  : activeTab === 'venta'
                  ? 'Nuestra división de ventas ofrece un servicio de broker y asesoría experta para tu propiedad. Diseñamos toda la experiencia de exhibición con promoción destacada de alto nivel, perfilamos financiera y legalmente a los prospectos de compra, y nos encargamos de todo el estudio legal y escrituración.'
                  : activeTab === 'vendi-renta'
                  ? '¿No te decides entre vender o arrendar? Ofrecemos tu inmueble simultáneamente en ambos mercados. Con nuestra estrategia Vendi-Renta, cerramos el primer negocio sólido que llegue. Solo pagas comisión por la opción que se concrete primero, nunca por ambas.'
                  : 'Para el propietario astuto: Asegura un flujo de caja mensual alquilando tu propiedad de forma blindada, mientras simultáneamente la promovemos para la venta. Te garantizamos la administración impecable del inquilino, facilitando las visitas de venta sin que tú te preocupes por la logística.'}
              </p>
            </div>

            {/* Custom Interactive Badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-brand-dark-deep rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-600 block tracking-widest uppercase font-mono">COSTOS / HONORARIOS</span>
                <span className="text-lg font-bold text-brand-gold-dark block mt-1">
                  {activeTab === 'administracion' ? '8.5% mensual' : 
                   activeTab === 'corretaje' ? '100% del Canon' : 
                   activeTab === 'venta' ? '3% del Valor' :
                   activeTab === 'vendi-renta' ? '100% o 3%' :
                   '8.5% (Admin) + 3% (Venta)'}
                </span>
                <span className="text-xs text-stone-550 block mt-1 leading-tight">
                  {activeTab === 'administracion' 
                    ? '¡O baja al 8.0% mensual si administras 2 o más propiedades!' 
                    : activeTab === 'corretaje'
                    ? '(Única comisión retenida del primer mes de arriendo)'
                    : activeTab === 'venta'
                    ? '(Cobrado solo tras la firma exitosa de la escritura pública)'
                    : activeTab === 'vendi-renta'
                    ? 'Dependiendo de cuál negocio se cierre primero'
                    : 'Honorarios cobrados de manera independiente por cada éxito'}
                </span>
              </div>

              <div className="p-4 bg-brand-dark-deep rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-600 block tracking-widest uppercase font-mono">COBERTURA / SEGURIDAD</span>
                <span className="text-lg font-bold text-stone-900 block mt-1 flex items-center space-x-1">
                  <span>
                    {activeTab === 'administracion' ? 'Hasta 36 Meses' : 
                     activeTab === 'corretaje' ? 'Estudio Especializado' : 
                     activeTab === 'venta' ? 'Estudio Prémium' :
                     activeTab === 'vendi-renta' ? 'Flexibilidad Total' :
                     '36 Meses + Gestión Ágil'}
                  </span>
                </span>
                <span className="text-xs text-stone-550 block mt-1 leading-tight">
                  {activeTab === 'administracion' 
                    ? 'Protección jurídica de restitución y amparo de cánones' 
                    : activeTab === 'corretaje'
                    ? 'Verificación estricta en centrales para tu tranquilidad'
                    : activeTab === 'venta'
                    ? 'Garantía legal completa de tradición y libertad'
                    : activeTab === 'vendi-renta'
                    ? 'Nos adaptamos al primer negocio calificado'
                    : 'Protección de arrendamiento mientras se concreta la venta'}
                </span>
              </div>
            </div>

            {/* Selection CTA */}
            <div className="pt-2 hidden lg:block">
              <button
                id={`cta-select-${activeTab}-desktop`}
                onClick={() => handleServiceSelect(activeTab)}
                className="w-full sm:w-auto bg-brand-gold hover:bg-brand-gold-dark active:scale-98 text-stone-950 font-bold px-8 py-4 rounded-lg shadow-lg shadow-brand-gold/10 cursor-pointer text-center text-sm transition-all"
              >
                Elegir {activeTab === 'administracion' ? 'Administración' : 
                        activeTab === 'corretaje' ? 'Corretaje' : 
                        activeTab === 'venta' ? 'Ventas' :
                        activeTab === 'vendi-renta' ? 'Vendi-Renta' :
                        'Admi-Venta'} y Registrar
              </button>
            </div>
          </div>

          {/* Service Column Benefits List */}
          <div className="lg:col-span-6 relative">
            {/* Glassmorphism Container */}
            <div className="bg-white/40 backdrop-blur-xl border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-8 sm:p-10 rounded-3xl space-y-8 relative overflow-hidden h-full flex flex-col">
              
              {/* Subtle inner decorative glow */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-stone-200/50 rounded-full blur-[80px] pointer-events-none" />

              <div className="border-b border-stone-200/50 pb-4 relative z-10 flex justify-between items-center text-xs uppercase font-mono tracking-widest text-stone-700">
                {/* Left Scroll Button */}
                <button
                  onClick={() => handleScroll('left')}
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white/80 hover:bg-brand-gold hover:text-stone-950 hover:border-brand-gold flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-90 select-none shrink-0"
                  title="Anterior"
                  type="button"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>

                {/* Centered Title */}
                <h4 className="text-center font-bold px-2 normal-case text-sm sm:text-base text-stone-900 font-sans tracking-normal grow">
                  Beneficios Incluidos en el Servicio
                </h4>

                {/* Right Scroll Button */}
                <button
                  onClick={() => handleScroll('right')}
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white/80 hover:bg-brand-gold hover:text-stone-950 hover:border-brand-gold flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-90 select-none shrink-0"
                  title="Siguiente"
                  type="button"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>

              <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
              {/* Horizontal Swiper with fade-out mask and negative margins for seamless sliding */}
              <div 
                ref={scrollContainerRef}
                className="no-scrollbar flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 pt-2 relative z-10 flex-grow items-stretch -mx-8 px-8 sm:-mx-10 sm:px-10"
                style={{ 
                  scrollbarWidth: 'none', msOverflowStyle: 'none', 
                  maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 85%, transparent 100%)'
                }}
              >
                {tripledFeatures.map((feat, idx) => {
                  const Icon = feat.icon;
                  let cardClass = "w-[85%] sm:w-[45%] lg:w-[42%] xl:w-[45%] min-w-[85%] sm:min-w-[45%] lg:min-w-[42%] xl:min-w-[45%] snap-start shrink-0 flex flex-col space-y-3 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all ";
                  let iconClass = "p-3 w-max ";

                  if (activeTab === 'administracion') {
                    cardClass += "bg-white/30 border border-white/50";
                    iconClass += "bg-brand-gold/10 rounded-xl text-brand-gold-dark";
                  } else if (activeTab === 'corretaje') {
                    cardClass += "bg-white/40 border border-white/60";
                    iconClass += "bg-white rounded-xl text-brand-gold-dark shadow-sm border border-stone-200";
                  } else if (activeTab === 'venta') {
                    cardClass += "bg-white/30 border border-white/50";
                    iconClass += "bg-brand-gold/10 rounded-xl text-brand-gold-dark border border-brand-gold/25";
                  } else if (activeTab === 'vendi-renta') {
                    cardClass += "bg-white/30 border border-white/50";
                    iconClass += "bg-brand-gold/10 rounded-xl text-brand-gold-dark border border-brand-gold/25";
                  } else { // admi-venta
                    cardClass += "bg-stone-900/5 border border-stone-900/10";
                    iconClass += "bg-stone-900 rounded-xl text-brand-gold shadow-sm";
                  }

                  let featureId = "";
                  if (activeTab === 'administracion') featureId = `admin-feature-${idx}`;
                  else if (activeTab === 'corretaje') featureId = `corretaje-feature-${idx}`;
                  else if (activeTab === 'venta') featureId = `venta-feature-${idx}`;
                  else if (activeTab === 'vendi-renta') featureId = `vendirenta-feature-${idx}`;
                  else featureId = `admiventa-feature-${idx}`;

                  return (
                    <div key={`${activeTab}-${idx}`} id={featureId} className={cardClass}>
                      <div className={iconClass}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="font-bold text-stone-900 text-base">{feat.title}</h5>
                        <p className="text-stone-600 text-sm font-light mt-2 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Button that sits under the benefits */}
              <div className="lg:hidden mt-2 relative z-10">
                <button
                  id={`cta-select-${activeTab}-mobile`}
                  onClick={() => handleServiceSelect(activeTab)}
                  className="w-full bg-brand-gold hover:bg-brand-gold-dark active:scale-98 text-stone-950 font-bold px-8 py-4 rounded-xl shadow-lg shadow-brand-gold/20 cursor-pointer text-center text-sm transition-all"
                >
                  Elegir {activeTab === 'administracion' ? 'Administración' : 
                          activeTab === 'corretaje' ? 'Corretaje' : 
                          activeTab === 'venta' ? 'Ventas' :
                          activeTab === 'vendi-renta' ? 'Vendi-Renta' :
                          'Admi-Venta'} y Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
