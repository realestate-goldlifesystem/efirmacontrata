/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Calculator, ShieldAlert, Sparkles, HelpCircle, ArrowRight, Percent, Check } from 'lucide-react';
import { FORMAT_COP } from '../data';
import { numberToWordsSpanish } from '../lib/numberToWords';

const formatInputValue = (val: number): string => {
  if (val === 0) return '';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
};

const parseInputValue = (formattedStr: string): number => {
  const cleanStr = formattedStr.replace(/\D/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
};

interface CalculatorProps {
  onScrollTo: (sectionId: string) => void;
  onSelectServiceType: (
    service: 'corretaje' | 'administracion' | 'venta' | 'vendi-renta' | 'admi-venta',
    details?: {
      rentPrice: number;
      isMultiProperty: boolean;
      includesHoa: boolean;
      hoaPrice: number;
      isUpsellActive: boolean;
    }
  ) => void;
}

export default function LandlordCalculator({ onScrollTo, onSelectServiceType }: CalculatorProps) {
  const [calcMode, setCalcMode] = useState<'arriendo' | 'venta' | 'mixto'>('arriendo');
  const [rentPrice, setRentPrice] = useState<number>(2500000); // Default 2.5 million COP
  const [salePrice, setSalePrice] = useState<number>(450000000); // Default 450 million COP
  const [mixtoScenario, setMixtoScenario] = useState<'arriendo' | 'venta'>('arriendo');
  const [isMultiProperty, setIsMultiProperty] = useState<boolean>(false);
  const [includesHoa, setIncludesHoa] = useState<boolean>(false);
  const [hoaPrice, setHoaPrice] = useState<number>(350000); // Default administration COP

  // Brokerage policy upsell
  const [isUpsellActive, setIsUpsellActive] = useState<boolean>(false);
  const [showUpsellModal, setShowUpsellModal] = useState<boolean>(false);

  // Safely clamp administration price so it never exceeds rent value
  const safeHoaPrice = includesHoa ? Math.min(hoaPrice, Math.max(0, rentPrice - 500000)) : 0;
  const canonValue = rentPrice - safeHoaPrice;

  // Administration calculations
  const adminMonthlyFeePercent = isMultiProperty ? 8.0 : 8.5;
  const adminFee = (canonValue * adminMonthlyFeePercent) / 100;
  const adminNetProceeds = canonValue - adminFee;
  const adminTotalPolicy = rentPrice * 0.50; // Policy includes VAT (50% of full rent price)
  const adminFirstMonthNet = adminNetProceeds - adminTotalPolicy;

  // Corretaje calculations (Applies a 32% or 40% discount if upsell is checked, depending on isMultiProperty)
  const corretajeDiscountPercent = isMultiProperty ? 40 : 32;
  const corretajeDiscountMultiplier = corretajeDiscountPercent / 100;
  const baseCorretajeOneTimeFee = canonValue; // 100% of canon
  const discountedCorretajeOneTimeFee = canonValue * (1 - corretajeDiscountMultiplier); // 32% or 40% discount
  const corretajeOneTimeFee = isUpsellActive ? discountedCorretajeOneTimeFee : baseCorretajeOneTimeFee;
  const corretajePolicy12Month = rentPrice * 0.50; // 50% of full rent price
  const corretajeTotalInitial = corretajeOneTimeFee + (isUpsellActive ? corretajePolicy12Month : 0);

  // Venta calculations
  const ventaFee = salePrice * 0.03; // 3% commission
  const ventaNetProceeds = salePrice - ventaFee;

  // --- Resumen flotante en móvil -----------------------------------------
  //
  // El resultado vive ~540px debajo del campo de valor. En un celular, con el
  // teclado abierto quedan unos 500px visibles: el propietario escribe su canon
  // y NO ve cambiar nada. Se pierde justo lo que hace útil a una calculadora.
  //
  // Esta barra muestra el neto mensual mientras los controles están en pantalla
  // y el resultado real todavía no. Desaparece sola al llegar a las tarjetas,
  // para no taparlas.
  // --- Flujo de dos pantallas en móvil -----------------------------------
  //
  // En celular la calculadora se comporta como una app: primero se configura,
  // luego se ven los resultados. Antes había que recorrer casi 3 pantallas de
  // scroll para llegar del canon a las cifras, y en el camino se perdía el hilo.
  //
  // En pantallas grandes NO aplica: allí los controles y las dos tarjetas caben
  // a la vez y compararlas de un vistazo es mejor que cualquier paso a paso.
  const [vistaMovil, setVistaMovil] = useState<'configurar' | 'resultados'>('configurar');

  // Cuál de los dos modelos se muestra en detalle. El otro nunca desaparece:
  // queda como una línea de referencia para que comparar no cueste ni un toque.
  const [modeloEnfocado, setModeloEnfocado] = useState<0 | 1>(0);

  // Al cambiar de tipo de negocio se vuelve a configurar: los resultados que
  // había en pantalla ya no corresponden a lo que el propietario está mirando.
  // La cifra del OTRO modelo, para que comparar no cueste ni un toque.
  // Sin esto el switch obliga a recordar el número anterior, y comparar de
  // memoria es justo lo que hace perder fuerza al argumento.
  const otroModelo =
    calcMode === 'arriendo'
      ? (modeloEnfocado === 0
          ? { nombre: 'Corretaje', valor: corretajeOneTimeFee, nota: 'pago único' }
          : { nombre: 'Administración', valor: adminNetProceeds, nota: 'cada mes' })
      : (modeloEnfocado === 0
          // Se enseña la cifra que TITULA cada panel, no una equivalente: si el número
          // de la línea no aparece igual al abrirla, comparar deja de dar confianza.
          ? { nombre: 'Admi-Venta', valor: adminFirstMonthNet, nota: 'el primer mes' }
          : { nombre: 'Vendi-Renta', valor: canonValue, nota: 'de canon al arrendar' });

  // ── Transición entre las dos pantallas ────────────────────────────────────
  // El cambio se hace en dos tiempos: primero la pantalla actual se retira, y
  // solo cuando termina entra la siguiente. Cruzarlas a la vez obligaría a
  // superponerlas en absolute, y con tarjetas de altura muy distinta eso hace
  // saltar el alto de la página a mitad del gesto.
  const MS_SALIDA = 340; // debe coincidir con .cal-sale en index.css
  const [saliendo, setSaliendo] = useState(false);
  const temporizador = useRef<number | null>(null);

  // Si el componente se desmonta a mitad de la animación, el temporizador
  // pendiente intentaría escribir estado sobre algo que ya no existe.
  useEffect(() => () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
  }, []);

  const irAVista = (destino: 'configurar' | 'resultados', antes?: () => void) => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    setSaliendo(true);
    temporizador.current = window.setTimeout(() => {
      antes?.();
      setVistaMovil(destino);
      setSaliendo(false);
      temporizador.current = null;
    }, MS_SALIDA);
  };

  const irAConfigurar = () => irAVista('configurar');
  const verResultados = () => irAVista('resultados', () => setModeloEnfocado(0));

  // Dirección del switch, para que el panel entre por el lado del botón pulsado.
  const [direccion, setDireccion] = useState<1 | -1>(1);
  const enfocarModelo = (i: 0 | 1) => {
    if (i === modeloEnfocado) return;
    setDireccion(i > modeloEnfocado ? 1 : -1);
    setModeloEnfocado(i);
  };
  const claseEntradaPanel = direccion === 1 ? 'cal-entra-der' : 'cal-entra-izq';

  const cambiarModo = (modo: 'arriendo' | 'venta' | 'mixto') => {
    setCalcMode(modo);
    setModeloEnfocado(0);
    irAVista('configurar');
  };

  const panelControlesRef = useRef<HTMLDivElement | null>(null);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  // Se usa un listener de scroll y no IntersectionObserver a propósito: el cálculo
  // con getBoundingClientRect es predecible en cualquier navegador y verificable en
  // pruebas, mientras que el observer depende de que el navegador esté componiendo
  // cuadros y falla en entornos embebidos.
  useEffect(() => {
    const evaluar = () => {
      const el = panelControlesRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Visible mientras una parte real del panel de controles esté en pantalla.
      setMostrarResumen(r.top < window.innerHeight - 80 && r.bottom > 120);
    };
    evaluar();
    window.addEventListener('scroll', evaluar, { passive: true });
    window.addEventListener('resize', evaluar);
    return () => {
      window.removeEventListener('scroll', evaluar);
      window.removeEventListener('resize', evaluar);
    };
  }, []);

  // Qué cifra resume mejor cada modo, en las palabras del propietario.
  const resumenMovil =
    calcMode === 'venta'
      ? { etiqueta: 'Recibes por la venta', valor: ventaNetProceeds }
      : { etiqueta: 'Recibes cada mes', valor: adminNetProceeds };

  const handleApply = (service: 'corretaje' | 'administracion' | 'venta' | 'vendi-renta' | 'admi-venta') => {
    onSelectServiceType(service, {
      rentPrice: calcMode === 'venta' ? salePrice : rentPrice,
      isMultiProperty,
      includesHoa,
      hoaPrice: safeHoaPrice,
      isUpsellActive: service === 'corretaje' ? isUpsellActive : false
    });
    onScrollTo('registro');
  };

  const handleToggleUpsell = (checked: boolean) => {
    if (checked) {
      setShowUpsellModal(true);
    } else {
      setIsUpsellActive(false);
    }
  };

  const handleAcceptUpsell = () => {
    setIsUpsellActive(true);
    setShowUpsellModal(false);
  };

  const handleDeclineUpsell = () => {
    setIsUpsellActive(false);
    setShowUpsellModal(false);
  };

  return (
    <section id="calculadora" className="py-20 bg-brand-dark border-b border-stone-200 relative">
      <div className="absolute top-10 right-10 w-64 h-64 bg-brand-gold/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-mono tracking-widest text-brand-gold font-bold flex items-center justify-center gap-1.5">
            <Calculator className="w-4 h-4" /> SIMULADOR FINANCIERO DINÁMICO
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-2 font-sans">
            Simula el rendimiento de tus propiedades
          </h2>
          <p className="text-stone-600 mt-4 text-base font-light font-sans leading-relaxed">
            Selecciona el tipo de negocio, ingresa el valor de tu inmueble y compara de forma inmediata los ingresos netos, comisiones y blindajes de nuestros servicios.
          </p>
        </div>

        {/* Input & Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Slider Controls Column */}
          <div ref={panelControlesRef} className={`lg:col-span-4 bg-brand-dark-deep p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-6 ${vistaMovil === 'resultados' ? 'hidden lg:block' : 'cal-entra'} ${saliendo && vistaMovil === 'configurar' ? 'cal-sale' : ''}`}>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider font-mono pb-4 border-b border-stone-200">
              Configura tu Inmueble
            </h3>

            {/* Mode Switcher */}
            <div className="space-y-2">
              <label className="text-[10px] text-stone-550 uppercase tracking-widest font-mono block">Tipo de Servicio</label>
              <div className="bg-stone-100/80 p-1 rounded-xl border border-stone-200 flex gap-1 shadow-inner">
                {(['arriendo', 'venta', 'mixto'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => cambiarModo(mode)}
                    className={`flex-1 min-h-[44px] py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      calcMode === mode
                        ? mode === 'arriendo'
                          ? 'bg-brand-gold text-stone-950 shadow-md'
                          : mode === 'venta'
                          ? 'bg-stone-900 text-brand-gold shadow-md'
                          : 'bg-teal-600 text-white shadow-md'
                        : 'text-stone-555 hover:text-stone-850'
                    }`}
                  >
                    {mode === 'arriendo' ? 'Arriendo' : mode === 'venta' ? 'Venta' : 'Mixto'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Inputs Section */}
            <div className="space-y-4">
              
              {/* Rent Inputs (Shown in Arriendo and Mixto) */}
              {(calcMode === 'arriendo' || calcMode === 'mixto') && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label htmlFor="rent-input-price" className="text-xs text-stone-600 uppercase tracking-widest font-mono">
                      {includesHoa ? 'Arriendo Completo (Canon + Admin)' : 'Valor mensual de arriendo (COP)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-bold">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        id="rent-input-price"
                        value={formatInputValue(rentPrice)}
                        onChange={(e) => setRentPrice(Math.max(0, parseInputValue(e.target.value)))}
                        className="w-full bg-white border border-stone-200 rounded-lg py-3.5 pl-8 pr-4 text-xl font-bold text-stone-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold shadow-sm"
                        placeholder="Ej. 2.500.000"
                      />
                    </div>
                    {rentPrice > 0 && (
                      <div className="text-[10px] text-[#8A631F] font-bold font-mono pl-2 leading-normal bg-amber-500/5 p-2 rounded border border-amber-500/10 mt-1.5 animate-fade-in text-left">
                        ✍️ En letras: <span className="text-stone-900 font-sans italic font-normal font-medium">{numberToWordsSpanish(rentPrice)}</span>
                      </div>
                    )}
                  </div>

                  {/* Atajos de canon.
                      Van JUNTO al campo, antes del slider: quien no tiene el número
                      exacto resuelve de un toque en vez de tener que deslizar. */}
                  <div className="grid grid-cols-2 gap-2">
                    {[1500000, 2500000, 4200000, 6000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setRentPrice(val);
                          if (includesHoa && val <= hoaPrice) setHoaPrice(Math.floor(val * 0.15));
                        }}
                        className={`min-h-[44px] py-2.5 px-3 border rounded-lg text-sm font-bold tracking-wide transition-all cursor-pointer ${
                          rentPrice === val
                            ? 'bg-brand-gold/10 text-brand-gold-dark border-brand-gold/40 shadow-sm'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-sm'
                        }`}
                      >
                        {FORMAT_COP(val)}
                      </button>
                    ))}
                  </div>

                  {/* Slider de ajuste fino.
                      El contenedor lleva padding vertical a propósito: el riel mide 6px,
                      que es imposible de agarrar con el pulgar. Así la zona que responde
                      al toque llega a ~44px sin engordar la línea visualmente. */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-stone-500">
                      <span>$ 1.000.000</span>
                      <span>Ajusta deslizando</span>
                      <span>$ 10.000.000</span>
                    </div>
                    <div className="py-3">
                      <input
                        type="range"
                        min="1000000"
                        max="10000000"
                        step="50000"
                        id="rent-slider-price"
                        value={rentPrice}
                        onChange={(e) => setRentPrice(parseInt(e.target.value))}
                        className="w-full accent-brand-gold h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sale Inputs (Shown in Venta and Mixto) */}
              {(calcMode === 'venta' || calcMode === 'mixto') && (
                <div className="space-y-4 animate-fade-in pt-4 border-t border-stone-200">
                  <div className="space-y-2">
                    <label htmlFor="sale-input-price" className="text-xs text-stone-600 uppercase tracking-widest font-mono">
                      Valor de venta proyectado (COP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-bold">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        id="sale-input-price"
                        value={formatInputValue(salePrice)}
                        onChange={(e) => setSalePrice(Math.max(0, parseInputValue(e.target.value)))}
                        className="w-full bg-white border border-stone-200 rounded-lg py-3.5 pl-8 pr-4 text-xl font-bold text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 shadow-sm"
                        placeholder="Ej. 450.000.000"
                      />
                    </div>
                    {salePrice > 0 && (
                      <div className="text-[10px] text-stone-700 font-bold font-mono pl-2 leading-normal bg-stone-100 p-2 rounded border border-stone-200 mt-1.5 animate-fade-in text-left">
                        ✍️ En letras: <span className="text-stone-900 font-sans italic font-normal font-medium">{numberToWordsSpanish(salePrice)}</span>
                      </div>
                    )}
                  </div>

                  {/* Slider for Sale */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-mono text-stone-500">
                      <span>$ 100M</span>
                      <span>$ 1.500M</span>
                    </div>
                    <input
                      type="range"
                      min="100000000"
                      max="1500000000"
                      step="10000000"
                      id="sale-slider-price"
                      value={salePrice}
                      onChange={(e) => setSalePrice(parseInt(e.target.value))}
                      className="w-full accent-stone-900 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* HOA & Multi-Property Checklist (Arriendo / Mixto) */}
              {(calcMode === 'arriendo' || calcMode === 'mixto') && (
                <div className="space-y-4 pt-4 border-t border-stone-200">
                  
                  {/* HOA Checklist */}
                  <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-3.5 shadow-sm">
                    <label htmlFor="calc-includes-hoa" className="flex items-center space-x-2.5 min-h-[44px] -my-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="calc-includes-hoa"
                        checked={includesHoa}
                        onChange={(e) => setIncludesHoa(e.target.checked)}
                        className="w-5 h-5 shrink-0 text-brand-gold border-stone-300 bg-white rounded focus:ring-brand-gold focus:ring-1 cursor-pointer"
                      />
                      <span className="text-sm text-stone-800 font-bold">
                        El valor total incluye administración
                      </span>
                    </label>

                    {includesHoa && (
                      <div className="space-y-2.5 pt-2 border-t border-stone-100 animate-fade-in">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] text-stone-550 uppercase tracking-widest font-mono">Cuota de Administración</span>
                          <span className="font-bold text-brand-gold-dark font-mono">{FORMAT_COP(safeHoaPrice)}</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            id="hoa-input-price"
                            value={formatInputValue(hoaPrice)}
                            onChange={(e) => setHoaPrice(Math.max(0, parseInputValue(e.target.value)))}
                            className="w-full bg-white border border-stone-200 rounded-lg py-2 pl-7 pr-3 text-xs font-semibold text-stone-800 focus:outline-none focus:border-brand-gold"
                            placeholder="Ej. 350.000"
                          />
                        </div>
                        {hoaPrice > 0 && (
                          <div className="text-[9px] text-[#8A631F] font-bold font-mono pl-2 bg-amber-500/5 p-1.5 rounded border border-amber-500/10 mt-1 animate-fade-in text-left">
                            ✍️ En letras: <span className="text-stone-800 font-sans italic font-normal font-medium">{numberToWordsSpanish(hoaPrice)}</span>
                          </div>
                        )}
                        <input
                          type="range"
                          min="100000"
                          max="2000000"
                          step="20000"
                          id="hoa-slider-price"
                          value={hoaPrice}
                          onChange={(e) => setHoaPrice(parseInt(e.target.value))}
                          className="w-full accent-brand-gold h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Los atajos de canon se movieron arriba, junto al campo de valor:
                      allí son el camino rápido, aquí abajo quedaban después del
                      recorrido largo que venían a evitar. */}

                  {/* Multi-Property Toggle */}
                  <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1 shadow-sm">
                    <label htmlFor="calc-multi-prop" className="flex items-center space-x-2.5 min-h-[44px] -my-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="calc-multi-prop"
                        checked={isMultiProperty}
                        onChange={(e) => setIsMultiProperty(e.target.checked)}
                        className="w-5 h-5 shrink-0 text-brand-gold border-stone-300 bg-white rounded focus:ring-brand-gold focus:ring-1 cursor-pointer"
                      />
                      <span className="text-sm text-stone-800 font-bold">
                        Registraré más de 2 inmuebles
                      </span>
                    </label>
                    {isMultiProperty && (
                      <p className="text-[10px] text-brand-gold-dark font-mono pl-6 leading-tight animate-fade-in font-bold">
                        🎉 Tarifa preferencial del 8.0% y descuento de corretaje del 40%.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Venta Mode Reference Values */}
              {calcMode === 'venta' && (
                <div className="space-y-2 pt-2 animate-fade-in">
                  <span className="text-[10px] text-stone-550 uppercase tracking-widest font-mono font-semibold block">Referencias de Venta</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[180000000, 350000000, 650000000, 1000000000].map((val) => (
                      <button
                        key={val}
                        onClick={() => setSalePrice(val)}
                        className={`py-2 px-3 border rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                          salePrice === val
                            ? 'bg-stone-900 text-brand-gold border-stone-900 shadow-sm font-bold'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 shadow-sm'
                        }`}
                      >
                        {FORMAT_COP(val)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scenario Switcher (Only shown in Mixto Mode) */}
              {calcMode === 'mixto' && (
                <div className="space-y-2 pt-4 border-t border-stone-200 animate-fade-in">
                  <label className="text-[10px] text-stone-550 uppercase tracking-widest font-mono block">¿Qué ocurre primero?</label>
                  <div className="bg-stone-100 p-1 rounded-xl border border-stone-200 flex gap-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setMixtoScenario('arriendo')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                        mixtoScenario === 'arriendo'
                          ? 'bg-teal-600 text-white shadow-sm font-bold'
                          : 'text-stone-500 hover:text-stone-850'
                      }`}
                    >
                      Se Arrienda Primero
                    </button>
                    <button
                      type="button"
                      onClick={() => setMixtoScenario('venta')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                        mixtoScenario === 'venta'
                          ? 'bg-stone-900 text-brand-gold shadow-sm font-bold'
                          : 'text-stone-500 hover:text-stone-855'
                      }`}
                    >
                      Se Vende Primero
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Paso a resultados — SOLO móvil.
                En pantallas grandes las tarjetas ya están al lado, así que este
                botón sobraría y hasta confundiría. */}
            <button
              type="button"
              onClick={verResultados}
              className="lg:hidden w-full min-h-[52px] bg-brand-gold hover:bg-[#8A631F] text-stone-950 font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
            >
              Ver mi comparación
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic Side-by-side Panel (Adapts to Active Tab Mode) */}
          <div id="resultado-calculadora" className={`lg:col-span-8 gap-8 scroll-mt-20 ${vistaMovil === 'configurar' ? 'hidden lg:grid' : 'grid cal-entra'} ${saliendo && vistaMovil === 'resultados' ? 'cal-sale' : ''} grid-cols-1 md:grid-cols-2`}>

            {/* Cabecera de resultados — SOLO móvil.
                Da el contexto que se pierde al cambiar de pantalla (qué canon se
                calculó) y el camino de vuelta. Sin esto el propietario aterriza
                en unas cifras sin recordar de dónde salieron. */}
            <div className="lg:hidden md:col-span-2 flex items-center justify-between gap-3 -mb-2">
              <button
                type="button"
                onClick={irAConfigurar}
                className="min-h-[44px] px-3 -ml-3 flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Volver a calcular
              </button>
              <span className="text-xs font-mono font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-lg tabular-nums">
                {calcMode === 'venta' ? FORMAT_COP(salePrice) : FORMAT_COP(rentPrice)}
              </span>
            </div>

            {/* Selector de modelo — SOLO móvil, y solo donde hay dos que comparar. */}
            {calcMode !== 'venta' && (
              <div className="lg:hidden md:col-span-2 bg-stone-100/80 p-1 rounded-xl border border-stone-200 flex gap-1 shadow-inner">
                {(calcMode === 'arriendo'
                  ? ['Administración', 'Corretaje']
                  : ['Vendi-Renta', 'Admi-Venta']
                ).map((nombre, i) => (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => enfocarModelo(i as 0 | 1)}
                    className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      modeloEnfocado === i
                        ? 'bg-brand-gold text-stone-950 shadow-md'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {nombre}
                  </button>
                ))}
              </div>
            )}
            
            {calcMode === 'arriendo' && (
              <>
                {/* Panel 1: Administración (RECOMENDADO) */}
                <div className={`bg-brand-dark-deep border-2 border-brand-gold p-5 sm:p-8 rounded-2xl flex-col justify-between shadow-xl shadow-brand-gold/5 relative overflow-hidden ${modeloEnfocado === 0 ? `flex ${claseEntradaPanel}` : 'hidden lg:flex'}`}>
                  <div className="absolute top-0 right-0 bg-brand-gold text-stone-950 text-[9px] font-extrabold px-3 py-1 uppercase tracking-widest font-mono rounded-bl-lg">
                    Recomendado
                  </div>
                  
                  <div>
                    <span className="text-[10px] bg-brand-gold/10 text-brand-gold-dark font-mono tracking-widest uppercase py-1 px-2.5 rounded border border-brand-gold/20 font-bold">
                      ADMINISTRACIÓN PREMIUM
                    </span>
                    <h4 className="text-xl font-bold text-stone-900 mt-3 sm:mt-4 leading-none font-sans">Renta garantizada fija</h4>
                    <p className="text-stone-600 text-xs font-light mt-1.5 sm:mt-2 leading-snug sm:leading-relaxed font-sans">
                      El modelo que te blinda financieramente de forma continua. Recibe tu dinero cada mes en tu cuenta, sin importar si el inquilino se demora o no.
                    </p>

                    {/* Main Value Display */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 mt-3.5 sm:mt-5 shadow-sm space-y-2 sm:space-y-3">
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase tracking-widest block font-mono">Primer Mes (Descontada Póliza)</span>
                        <span className="text-xl font-extrabold text-emerald-650 block mt-0.5">
                          {FORMAT_COP(adminFirstMonthNet)}
                        </span>
                      </div>
                      <div className="border-t border-stone-100 pt-1.5 sm:pt-2">
                        <span className="text-[10px] text-stone-500 uppercase tracking-widest block font-mono">Mes 2 al 12 (Ingreso Mensual)</span>
                        <span className="text-2xl font-extrabold text-emerald-600 block mt-0.5">
                          {FORMAT_COP(adminNetProceeds)}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-550 block mt-1.5 font-sans leading-tight">
                        {includesHoa 
                          ? `(La cuota de administración de copropiedad de ${FORMAT_COP(safeHoaPrice)} se paga directamente al edificio y se descuenta del ingreso total, cobrando comisión del ${adminMonthlyFeePercent.toFixed(1)}% solo sobre el canon neto)`
                          : `(Equivale al ${(100 - adminMonthlyFeePercent).toFixed(1)}% neto del canon de arrendamiento)`}
                      </span>
                    </div>

                    {/* Subdetails Breakdown */}
                    <div className="space-y-2.5 sm:space-y-3 mt-3.5 sm:mt-5 text-xs">
                      {includesHoa ? (
                        <>
                          <div className="flex justify-between border-b border-stone-200 pb-1.5 sm:pb-2">
                            <span className="text-stone-600 font-light">Arriendo completo (Canon + Admin):</span>
                            <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(rentPrice)}</span>
                          </div>
                          <div className="flex justify-between border-b border-stone-200 pb-1.5 sm:pb-2">
                            <span className="text-stone-600 font-light">Administración Edificio (Deducida para pago directo):</span>
                            <span className="text-rose-600 font-mono font-semibold">-{FORMAT_COP(safeHoaPrice)}</span>
                          </div>
                          <div className="flex justify-between border-b border-stone-200 pb-1.5 sm:pb-2">
                            <span className="text-stone-800 font-bold">Canon Neto (Base de comisión):</span>
                            <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(canonValue)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between border-b border-stone-200 pb-1.5 sm:pb-2">
                          <span className="text-stone-600 font-light">Canon de arrendamiento:</span>
                          <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(canonValue)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-stone-200 pb-1.5 sm:pb-2">
                        <span className="text-stone-600 font-light">Comisión Gold Life ({adminMonthlyFeePercent.toFixed(1)}% sobre Canon):</span>
                        <span className="text-rose-600 font-mono font-semibold">-{FORMAT_COP(adminFee)}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-stone-700 font-medium font-sans">Inversión única de póliza (50% arriendo completo - 1er mes):</span>
                        <span className="text-rose-600 font-mono font-bold">-{FORMAT_COP(adminTotalPolicy)}</span>
                      </div>
                    </div>

                    {/* Extra peace of mind */}
                    <div className="mt-4 sm:mt-8 flex items-start space-x-2.5 bg-emerald-50 border border-emerald-100 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-emerald-800">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="leading-normal font-sans">
                        <strong>Garantizado por 36 meses:</strong> Respaldo legal integral y acompañamiento en restitución sin sobrecostos de asesores adicionales, cubriendo además servicios públicos atrasados.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-8 pt-3 sm:pt-4 border-t border-stone-200">
                    <button
                      id="calc-btn-admin"
                      onClick={() => handleApply('administracion')}
                      className="w-full bg-brand-gold hover:bg-brand-gold-dark active:scale-98 text-stone-950 font-bold py-3 sm:py-3.5 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-brand-gold/10"
                    >
                      <span className="font-sans">Quiero este modelo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Panel 2: Corretaje */}
                <div className={`bg-brand-dark-deep border border-stone-200 p-5 sm:p-8 rounded-2xl flex-col justify-between shadow-sm ${modeloEnfocado === 1 ? `flex ${claseEntradaPanel}` : 'hidden lg:flex'}`}>
                  <div>
                    <span className="text-[10px] bg-stone-100 text-stone-600 font-mono tracking-widest uppercase py-1 px-2.5 rounded border border-stone-200">
                      CORRETAJE INMOBILIARIO
                    </span>
                    <h4 className="text-xl font-bold text-stone-900 mt-3 sm:mt-4 leading-none font-sans">Colocación con filtro estrella</h4>
                    <p className="text-stone-600 text-xs font-light mt-1.5 sm:mt-2 leading-snug sm:leading-relaxed font-sans">
                      Excelente modelo si administras directamente el recaudo mensual pero buscas delegar el mercadeo y el filtrado estricto de inquilinos.
                    </p>

                    {/* Main Value Display */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 mt-3.5 sm:mt-5 shadow-sm">
                      <span className="text-xs text-stone-500 uppercase tracking-widest block font-mono">DEPÓSITO MENSUAL ESTIMADO</span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#9A7B40] block mt-1">
                        {FORMAT_COP(rentPrice)}
                      </span>
                      <span className="text-[10px] text-stone-550 block mt-1.5 font-sans leading-tight">
                        {includesHoa 
                          ? '(Recibes el 100% de Canon + Administración, pero asumes la cobranza tú mismo)'
                          : '(Recibes el 100% del arriendo, bajo tu directa gestión de cobranza dirécta)'}
                      </span>
                    </div>

                    {/* Subdetails Breakdown */}
                    <div className="space-y-3.5 mt-3.5 sm:mt-5 text-sm">
                      {includesHoa && (
                        <div className="flex justify-between border-b border-stone-200 pb-1.5 sm:pb-2 text-xs">
                          <span className="text-stone-600 font-light">Canon neto de arrendamiento:</span>
                          <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(canonValue)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-stone-200 pb-1.5 sm:pb-2 text-xs items-center">
                        <span className="text-stone-600 font-light">
                          Comisión de corretaje:
                        </span>
                        <span className="text-stone-900 font-mono font-semibold">
                          {isUpsellActive ? (
                            <div className="text-right">
                              <span className="line-through text-stone-400 mr-1.5 text-xs">{FORMAT_COP(baseCorretajeOneTimeFee)}</span>
                              <span className="text-emerald-600 font-bold">{FORMAT_COP(discountedCorretajeOneTimeFee)}</span>
                            </div>
                          ) : (
                            FORMAT_COP(baseCorretajeOneTimeFee)
                          )}
                        </span>
                      </div>
                      
                      {isUpsellActive && (
                        <div className="flex justify-between border-b border-stone-200 pb-1.5 sm:pb-2 text-xs text-emerald-700 font-medium">
                          <span>Póliza 12 meses (50% arriendo completo):</span>
                          <span className="font-mono">{FORMAT_COP(corretajePolicy12Month)}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-1 text-xs">
                        <span className="text-stone-700 font-medium">Gasto de inversión inicial total:</span>
                        <span className="text-brand-gold-dark font-mono font-bold text-base">{FORMAT_COP(corretajeTotalInitial)}</span>
                      </div>
                    </div>

                    {/* Dynamic Upsell Toggle Section inside Corretaje Context Totals */}
                    <div className="mt-3.5 sm:mt-5 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col pr-2">
                          <span className="text-xs font-bold text-[#8A631F] flex items-center gap-1">
                            <Percent className="w-3.5 h-3.5" /> ¿Adquirir póliza de arriendo?
                          </span>
                          <span className="text-[10px] text-stone-600 leading-tight">Recibe un <strong>{corretajeDiscountPercent}% de descuento</strong> en el corretaje</span>
                        </div>
                        <label htmlFor="upsell-toggle" className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            id="upsell-toggle"
                            checked={isUpsellActive}
                            onChange={(e) => handleToggleUpsell(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                        </label>
                      </div>
                      {isUpsellActive && (
                        <div className="bg-emerald-50 text-[10px] text-emerald-800 p-1.5 rounded border border-emerald-200 font-sans leading-tight">
                          🎉 <strong>¡Super Descuento Aplicado!</strong> Ahorraste <strong>{FORMAT_COP(canonValue * corretajeDiscountMultiplier)}</strong> en la tarifa de corretaje por asegurar tu inmueble.
                        </div>
                      )}
                    </div>

                    {/* Caution note */}
                    <div className="mt-3.5 sm:mt-5 flex items-start space-x-2.5 bg-stone-100 border border-stone-200 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-stone-550">
                      <ShieldAlert className="w-4 h-4 text-brand-gold-dark shrink-0 mt-0.5" />
                      <p className="leading-normal font-sans">
                        <strong>Gestión autónoma:</strong> Tras la búsqueda y firma del inquilino, delegas la gestión de cobro diaria. No incluye el blindaje contra impagos de administración (HOA) o servicios recurrentes.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-8 pt-3 sm:pt-4 border-t border-stone-200">
                    <button
                      id="calc-btn-corretaje"
                      onClick={() => handleApply('corretaje')}
                      className="w-full bg-white hover:bg-stone-50 border border-stone-300 hover:border-brand-gold text-stone-800 font-semibold py-3 sm:py-3.5 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                    >
                      <span className="font-sans">Quiero corretaje</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* La otra opción, siempre a la vista — SOLO móvil.
                Un toque la trae al detalle; verla no cuesta ninguno. */}
            {calcMode !== 'venta' && (
              <button
                type="button"
                onClick={() => enfocarModelo(modeloEnfocado === 0 ? 1 : 0)}
                className="lg:hidden md:col-span-2 w-full min-h-[56px] flex items-center justify-between gap-3 px-4 bg-stone-100 border border-stone-200 rounded-xl text-left hover:bg-stone-150 active:scale-[0.99] transition-all"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-widest font-mono text-stone-500">
                    Con {otroModelo.nombre} recibirías
                  </span>
                  <span className="block text-base font-extrabold text-stone-800 font-mono tabular-nums truncate">
                    {FORMAT_COP(Math.max(0, Math.round(otroModelo.valor)))}
                    <span className="text-[11px] font-sans font-medium text-stone-500 ml-1.5">{otroModelo.nota}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-brand-gold-dark flex items-center gap-1">
                  Ver <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            )}

            {calcMode === 'venta' && (
              /* Center and Span over both columns */
              <div className="md:col-span-2 max-w-2xl mx-auto w-full bg-brand-dark-deep border-2 border-stone-900 p-5 sm:p-8 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 right-0 bg-stone-900 text-brand-gold text-[9px] font-extrabold px-3 py-1 uppercase tracking-widest font-mono rounded-bl-lg">
                  COMISIÓN 3% ÉXITO
                </div>
                <div>
                  <span className="text-[10px] bg-stone-900/10 text-stone-800 font-mono tracking-widest uppercase py-1 px-2.5 rounded border border-stone-900/20 font-bold">
                    VENTA EXCLUSIVA PREMIUM
                  </span>
                  <h4 className="text-xl font-bold text-stone-900 mt-3 sm:mt-4 leading-none font-sans">Comercialización y Cierre de Élite</h4>
                  <p className="text-stone-605 text-xs font-light mt-1.5 sm:mt-2 leading-snug sm:leading-relaxed font-sans">
                    Promovemos tu propiedad con producción audiovisual cinematográfica y publicidad de alto impacto en los portales más importantes de Colombia. Filtramos y pre-calificamos financieramente a los compradores potenciales.
                  </p>

                  {/* Main Value Display */}
                  <div className="bg-white p-5 rounded-xl border border-stone-200 mt-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase tracking-widest block font-mono">COMISIÓN DE VENTA (3% ÉXITO)</span>
                      <span className="text-3xl font-extrabold text-[#9A7B40] block mt-1">
                        {FORMAT_COP(ventaFee)}
                      </span>
                    </div>
                    <div className="sm:border-l sm:border-stone-200 sm:pl-6">
                      <span className="text-[10px] text-stone-500 uppercase tracking-widest block font-mono">RETORNO ESTIMADO PARA TI</span>
                      <span className="text-3xl font-extrabold text-emerald-600 block mt-1">
                        {FORMAT_COP(ventaNetProceeds)}
                      </span>
                    </div>
                  </div>

                  {/* Bullet details */}
                  <div className="space-y-3.5 mt-6 text-sm">
                    <div className="flex items-start space-x-2.5 bg-emerald-50 border border-emerald-100 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-emerald-800">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="leading-normal font-sans">
                        <strong>Acompañamiento legal incluido:</strong> Elaboramos la promesa de compraventa, realizamos el estudio preventivo de títulos y gestionamos la escritura pública sin cobros adicionales.
                      </p>
                    </div>
                    <div className="flex items-start space-x-2.5 bg-stone-50 border border-stone-150 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-stone-600">
                      <Check className="w-4 h-4 text-brand-gold-dark shrink-0 mt-0.5" />
                      <p className="leading-normal font-sans">
                        <strong>Filtro de seguridad:</strong> Pre-calificamos la capacidad económica y crédito pre-aprobado de cada interesado antes de programar cualquier visita al inmueble.
                      </p>
                    </div>
                    <div className="flex items-start space-x-2.5 bg-sky-50 border border-sky-100 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-sky-800">
                      <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <p className="leading-normal font-sans">
                        <strong>Plan de Mitigación Tributaria (Cuentas AFC):</strong> Te orientamos legalmente para que, al vender tu casa de habitación (poseída por +2 años), puedas eximir hasta <strong>5.000 UVT (Aprox. $235 millones)</strong> del impuesto de Ganancia Ocasional (15%) depositando el dinero en una cuenta AFC.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-8 pt-3 sm:pt-4 border-t border-stone-200">
                  <button
                    onClick={() => handleApply('venta')}
                    className="w-full bg-stone-900 hover:bg-stone-850 active:scale-98 text-brand-gold font-bold py-4 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                  >
                    <span className="font-sans">Quiero vender mi inmueble</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {calcMode === 'mixto' && (
              <>
                {/* Panel 1: Vendi-Renta (Doble Oportunidad) */}
                <div className={`bg-brand-dark-deep border border-stone-200 p-5 sm:p-8 rounded-2xl flex-col justify-between shadow-sm relative overflow-hidden ${modeloEnfocado === 0 ? `flex ${claseEntradaPanel}` : 'hidden lg:flex'}`}>
                  <div className="absolute top-0 right-0 bg-teal-600 text-white text-[9px] font-extrabold px-3 py-1 uppercase tracking-widest font-mono rounded-bl-lg">
                    {mixtoScenario === 'arriendo' ? 'Éxito: Arriendo' : 'Éxito: Venta'}
                  </div>
                  <div>
                    <span className="text-[10px] bg-teal-50 text-teal-700 font-mono tracking-widest uppercase py-1 px-2.5 rounded border border-teal-100 font-bold">
                      VENDI-RENTA
                    </span>
                    
                    {mixtoScenario === 'arriendo' ? (
                      <div className="animate-fade-in mt-4">
                        <h4 className="text-xl font-bold text-stone-900 leading-none font-sans">¡Arriendo Concretado Primero!</h4>
                        <p className="text-stone-605 text-xs font-light mt-1.5 sm:mt-2 leading-snug sm:leading-relaxed font-sans">
                          Se consiguió el inquilino ideal. Tu propiedad empieza a generar ingresos y la promoción de ventas se pausa sin costos extra ni penalizaciones.
                        </p>

                        {/* Value Display */}
                        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 mt-3.5 sm:mt-5 shadow-sm space-y-2.5 animate-fade-in">
                          <div>
                            <span className="text-[9px] text-stone-500 uppercase tracking-widest block font-mono">CANON DE RENTA MENSUAL</span>
                            <span className="text-2xl font-extrabold text-emerald-600 block">
                              {FORMAT_COP(canonValue)}
                            </span>
                          </div>
                          
                          <div className="border-t border-stone-100 pt-1.5 sm:pt-2 flex justify-between text-xs text-stone-600 font-light items-center">
                            <span>Comisión de Corretaje:</span>
                            <span className="text-stone-900 font-mono font-semibold">
                              {isUpsellActive ? (
                                <div className="text-right">
                                  <span className="line-through text-stone-400 mr-1.5 text-xs">{FORMAT_COP(baseCorretajeOneTimeFee)}</span>
                                  <span className="text-emerald-600 font-bold">{FORMAT_COP(discountedCorretajeOneTimeFee)}</span>
                                </div>
                              ) : (
                                FORMAT_COP(baseCorretajeOneTimeFee)
                              )}
                            </span>
                          </div>

                          {isUpsellActive && (
                            <div className="flex justify-between text-xs text-emerald-700 font-medium">
                              <span>Póliza 12 meses (50% completo):</span>
                              <span className="font-mono">{FORMAT_COP(corretajePolicy12Month)}</span>
                            </div>
                          )}

                          <div className="flex justify-between border-t border-stone-100 pt-1.5 text-xs text-stone-700 font-semibold">
                            <span>Inversión inicial total:</span>
                            <span className="text-brand-gold-dark font-mono font-bold">{FORMAT_COP(isUpsellActive ? corretajeTotalInitial : baseCorretajeOneTimeFee)}</span>
                          </div>
                        </div>

                        {/* Upsell toggle in Vendi-Renta */}
                        <div className="mt-4 p-3 sm:p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col pr-2">
                              <span className="text-xs font-bold text-[#8A631F] flex items-center gap-1">
                                <Percent className="w-3.5 h-3.5" /> ¿Adquirir póliza de arriendo?
                              </span>
                              <span className="text-[10px] text-stone-600 leading-tight">Recibe un <strong>{corretajeDiscountPercent}% de descuento</strong> en el corretaje</span>
                            </div>
                            <label htmlFor="upsell-toggle-mixto" className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                id="upsell-toggle-mixto"
                                checked={isUpsellActive}
                                onChange={(e) => handleToggleUpsell(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-fade-in mt-4">
                        <h4 className="text-xl font-bold text-stone-900 leading-none font-sans">¡Venta Concretada Primero!</h4>
                        <p className="text-stone-605 text-xs font-light mt-1.5 sm:mt-2 leading-snug sm:leading-relaxed font-sans">
                          Se cerró la venta del inmueble con el comprador ideal. La oferta de arriendo se cancela automáticamente y recibes tus ganancias netas directas.
                        </p>

                        {/* Value Display */}
                        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 mt-3.5 sm:mt-5 shadow-sm space-y-2.5">
                          <div>
                            <span className="text-[9px] text-stone-500 uppercase tracking-widest block font-mono">NETO ESTIMADO DE VENTA TRANSFERIDO</span>
                            <span className="text-2xl font-extrabold text-emerald-600 block">
                              {FORMAT_COP(ventaNetProceeds)}
                            </span>
                          </div>
                          <div className="border-t border-stone-100 pt-1.5 sm:pt-2 flex justify-between text-xs text-stone-600 font-light">
                            <span>Comisión de Venta (3% éxito):</span>
                            <span className="text-rose-600 font-mono font-semibold">-{FORMAT_COP(ventaFee)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-stone-600 font-light">
                            <span>Comisión de Arriendo Cobrada:</span>
                            <span className="text-emerald-700 font-bold font-mono">$0 (Ahorrada)</span>
                          </div>
                        </div>

                        {/* AFC Benefit */}
                        <div className="mt-3 flex items-start space-x-2.5 bg-sky-50 border border-sky-100 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-sky-800">
                          <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                          <p className="leading-normal font-sans">
                            <strong>Plan de Mitigación Tributaria:</strong> Puedes eximir hasta 5.000 UVT del 15% de Ganancia Ocasional invirtiendo en cuenta AFC.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Extra notes */}
                    <div className="mt-3.5 sm:mt-5 flex items-start space-x-2.5 bg-teal-50 border border-teal-100 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-teal-800">
                      <Check className="w-4 h-4 text-teal-650 shrink-0 mt-0.5" />
                      <p className="leading-normal font-sans">
                        <strong>Garantía de Cero Doble Comisión:</strong> Solo pagas por el negocio que se ejecute primero. Promoción paralela 100% gratuita hasta el momento del cierre.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-8 pt-3 sm:pt-4 border-t border-stone-200">
                    <button
                      onClick={() => handleApply('vendi-renta')}
                      className="w-full bg-white hover:bg-stone-50 border border-stone-300 hover:border-teal-500 text-stone-800 font-semibold py-3 sm:py-3.5 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm animate-fade-in"
                    >
                      <span className="font-sans">Quiero Vendi-Renta</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Panel 2: Admi-Venta (Combo Inversionista) */}
                <div className={`bg-brand-dark-deep border-2 border-brand-gold p-5 sm:p-8 rounded-2xl flex-col justify-between shadow-xl shadow-brand-gold/5 relative overflow-hidden ${modeloEnfocado === 1 ? `flex ${claseEntradaPanel}` : 'hidden lg:flex'}`}>
                  <div className="absolute top-0 right-0 bg-brand-gold text-stone-950 text-[9px] font-extrabold px-3 py-1 uppercase tracking-widest font-mono rounded-bl-lg">
                    {mixtoScenario === 'arriendo' ? 'Fase: Arriendo' : 'Éxito: Venta'}
                  </div>
                  <div>
                    <span className="text-[10px] bg-brand-gold/10 text-brand-gold-dark font-mono tracking-widest uppercase py-1 px-2.5 rounded border border-brand-gold/20 font-bold">
                      ADMI-VENTA
                    </span>
                    
                    {mixtoScenario === 'arriendo' ? (
                      <div className="animate-fade-in mt-4">
                        <h4 className="text-xl font-bold text-stone-900 leading-none font-sans">Renta activa mientras se vende</h4>
                        <p className="text-stone-605 text-xs font-light mt-1.5 sm:mt-2 leading-snug sm:leading-relaxed font-sans">
                          Arrendamos tu propiedad bajo nuestro esquema blindado. Recibes ingresos estables mes a mes mientras el inmueble sigue disponible para la venta.
                        </p>

                        {/* Value Display */}
                        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 mt-3.5 sm:mt-5 shadow-sm space-y-2 sm:space-y-3">
                          <div>
                            <span className="text-[10px] text-stone-550 uppercase tracking-widest block font-mono">Primer Mes (Descontada Póliza)</span>
                            <span className="text-xl font-extrabold text-emerald-650 block mt-0.5">
                              {FORMAT_COP(adminFirstMonthNet)}
                            </span>
                          </div>
                          <div className="border-t border-stone-100 pt-1.5 sm:pt-2">
                            <span className="text-[10px] text-stone-555 uppercase tracking-widest block font-mono">Mes 2 al 12 (Ingreso Mensual)</span>
                            <span className="text-2xl font-extrabold text-emerald-600 block mt-0.5">
                              {FORMAT_COP(adminNetProceeds)}
                            </span>
                          </div>
                          
                          <div className="border-t border-stone-100 pt-1.5 sm:pt-2 space-y-2 text-xs">
                            {includesHoa ? (
                              <>
                                <div className="flex justify-between text-stone-600 font-light">
                                  <span>Arriendo completo (Canon + Admin):</span>
                                  <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(rentPrice)}</span>
                                </div>
                                <div className="flex justify-between text-stone-600 font-light">
                                  <span>Administración Edificio (Pago directo):</span>
                                  <span className="text-rose-600 font-mono font-semibold">-{FORMAT_COP(safeHoaPrice)}</span>
                                </div>
                                <div className="flex justify-between text-stone-750 font-bold border-b border-stone-100 pb-1">
                                  <span>Canon Neto (Base de comisión):</span>
                                  <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(canonValue)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between text-stone-600 font-light border-b border-stone-100 pb-1">
                                <span>Canon de arrendamiento:</span>
                                <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(canonValue)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-stone-600 font-light">
                              <span>Admin. Gold Life ({adminMonthlyFeePercent.toFixed(1)}%):</span>
                              <span className="text-rose-600 font-mono font-semibold">-{FORMAT_COP(adminFee)}</span>
                            </div>
                            <div className="flex justify-between text-stone-600 font-light">
                              <span>Inversión Póliza (50% completo - 1er mes):</span>
                              <span className="text-rose-600 font-mono font-semibold">-{FORMAT_COP(adminTotalPolicy)}</span>
                            </div>
                            <div className="flex justify-between text-stone-600 font-light border-t border-stone-100 pt-1.5">
                              <span>Comisión de Venta (3% éxito):</span>
                              <span className="text-stone-500 font-mono italic">Pendiente al concretar venta</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-fade-in mt-4">
                        <h4 className="text-xl font-bold text-stone-900 leading-none font-sans">¡Venta Con Inquilino Exitoso!</h4>
                        <p className="text-stone-605 text-xs font-light mt-1.5 sm:mt-2 leading-snug sm:leading-relaxed font-sans">
                          Se logra vender la propiedad. Un inmueble bien administrado y generando renta es un imán para inversionistas, acelerando la venta final.
                        </p>

                        {/* Value Display */}
                        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 mt-3.5 sm:mt-5 shadow-sm space-y-2.5">
                          <div>
                            <span className="text-[9px] text-stone-500 uppercase tracking-widest block font-mono">NETO ESTIMADO DE VENTA TRANSFERIDO</span>
                            <span className="text-2xl font-extrabold text-emerald-600 block">
                              {FORMAT_COP(ventaNetProceeds)}
                            </span>
                          </div>
                          <div className="border-t border-stone-100 pt-1.5 sm:pt-2 flex justify-between text-xs text-stone-600 font-light">
                            <span>Comisión de Venta (3% éxito):</span>
                            <span className="text-rose-600 font-mono font-semibold">-{FORMAT_COP(ventaFee)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-stone-600 font-light">
                            <span>Fase de arrendamiento:</span>
                            <span className="text-emerald-700 font-semibold">Transferida a nuevo dueño</span>
                          </div>
                        </div>

                        {/* AFC Benefit */}
                        <div className="mt-3 flex items-start space-x-2.5 bg-sky-50 border border-sky-100 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-sky-800">
                          <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                          <p className="leading-normal font-sans">
                            <strong>Plan de Mitigación Tributaria:</strong> Puedes eximir hasta 5.000 UVT del 15% de Ganancia Ocasional invirtiendo en cuenta AFC.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Extra notes */}
                    <div className="space-y-2.5 mt-3.5 sm:mt-5">
                      <div className="flex items-start space-x-2.5 bg-emerald-50 border border-emerald-100 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-emerald-800">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="leading-normal font-sans">
                          <strong>Garantizado por 36 meses:</strong> Respaldo legal integral y acompañamiento en restitución sin sobrecostos de asesores adicionales, cubriendo además servicios públicos atrasados.
                        </p>
                      </div>
                      <div className="flex items-start space-x-2.5 bg-emerald-50/50 border border-emerald-100/40 p-2.5 sm:p-3 rounded-lg text-xs leading-snug sm:leading-normal text-emerald-800/95">
                        <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="leading-normal font-sans">
                          <strong>Gestión de Visitas Blindada:</strong> Administramos al inquilino y coordinamos las visitas con compradores potenciales de forma pacífica, protegiendo tu canon de arriendo.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-8 pt-3 sm:pt-4 border-t border-stone-200">
                    <button
                      onClick={() => handleApply('admi-venta')}
                      className="w-full bg-brand-gold hover:bg-brand-gold-dark active:scale-98 text-stone-950 font-bold py-3 sm:py-3.5 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-brand-gold/10"
                    >
                      <span className="font-sans">Quiero Admi-Venta</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>

        </div>
      </div>

      {/* Floating Upsell Promotion Modal */}
      {showUpsellModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-brand-gold/40 shadow-2xl p-6 relative">
            <span className="absolute top-4 right-4 text-xs font-mono font-bold bg-brand-gold/15 text-brand-gold-dark px-2.5 py-0.5 rounded-full">
              PROMO EXCLUSIVA
            </span>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-amber-100 text-brand-gold-dark rounded-xl">
                <Percent className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 leading-tight">¿Deseas asegurar tu propiedad?</h3>
                <p className="text-xs text-stone-500">Unidos te damos la mejor oferta</p>
              </div>
            </div>

            <div className="space-y-4 my-5 text-sm text-stone-700 leading-relaxed bg-brand-dark-deep p-3.5 sm:p-4 rounded-xl border border-brand-gold/10">
              <p>
                Al adquirir la <strong>Póliza de Arriendo Integral</strong> (equivalente al 50% de un mes de arriendo completo) no solo blindas tu renta ante cualquier impago por todo un año, sino que:
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex items-start space-x-2.5 text-xs">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Obtienes un <strong>{corretajeDiscountPercent}% de DESCUENTO inmediato</strong> en nuestro servicio de corretaje profesional.</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>La comisión se reduce de <strong>100%</strong> al <strong>{100 - corretajeDiscountPercent}% del canon</strong>.</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>¡Ahorras un total de <strong className="text-emerald-700 font-mono">{FORMAT_COP(canonValue * corretajeDiscountMultiplier)}</strong> en el primer mes!</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleAcceptUpsell}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all shadow-md shadow-emerald-600/10 active:scale-98"
              >
                ¡Sí, asegurar arriendo y aplicar {corretajeDiscountPercent}% dcto!
              </button>
              <button
                onClick={handleDeclineUpsell}
                className="w-full bg-white hover:bg-stone-50 border border-stone-300 text-stone-600 font-semibold py-2 px-4 rounded-lg text-xs transition-all active:scale-98 text-center"
              >
                Mantenerme sin descuento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumen flotante — SOLO móvil (lg:hidden).
          En pantallas grandes los controles y el resultado se ven a la vez, así que
          esta barra sobraría. En móvil es lo que permite ver el efecto de cada dígito
          sin tener que scrollear hasta las tarjetas. */}
      {mostrarResumen && (
        <div
          aria-live="polite"
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-stone-900/95 backdrop-blur-sm border-t border-brand-gold/30 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.25)] animate-fade-in"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-mono text-stone-400">
                {resumenMovil.etiqueta}
              </p>
              <p className="text-xl font-extrabold text-brand-gold font-mono tabular-nums truncate">
                {FORMAT_COP(Math.max(0, Math.round(resumenMovil.valor)))}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                document.getElementById('resultado-calculadora')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="shrink-0 min-h-[44px] px-4 bg-brand-gold text-stone-950 rounded-xl font-bold text-sm active:scale-95 transition-transform"
            >
              Ver detalle
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
