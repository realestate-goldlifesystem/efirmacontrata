/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
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
    service: 'corretaje' | 'administracion' | 'venta',
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
  const [rentPrice, setRentPrice] = useState<number>(2500000); // Default 2.5 million COP
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
  const adminNetProceeds = (canonValue - adminFee) + safeHoaPrice;
  const adminTotalPolicy = rentPrice * 0.50; // Policy includes VAT (50% of full rent price as requested)

  // Corretaje calculations (Applies a 32% or 40% discount if upsell is checked, depending on isMultiProperty)
  const corretajeDiscountPercent = isMultiProperty ? 40 : 32;
  const corretajeDiscountMultiplier = corretajeDiscountPercent / 100;
  const baseCorretajeOneTimeFee = canonValue; // 100% of canon
  const discountedCorretajeOneTimeFee = canonValue * (1 - corretajeDiscountMultiplier); // 32% (0.68) or 40% (0.60) discount
  const corretajeOneTimeFee = isUpsellActive ? discountedCorretajeOneTimeFee : baseCorretajeOneTimeFee;
  const corretajePolicy12Month = rentPrice * 0.50; // 50% of full rent price
  const corretajeTotalInitial = corretajeOneTimeFee + (isUpsellActive ? corretajePolicy12Month : 0);

  const handleApply = (service: 'corretaje' | 'administracion') => {
    onSelectServiceType(service, {
      rentPrice,
      isMultiProperty,
      includesHoa,
      hoaPrice: safeHoaPrice,
      isUpsellActive
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
            Calcula tus ingresos libres de estrés
          </h2>
          <p className="text-stone-600 mt-4 text-base font-light font-sans leading-relaxed">
            Escribe o desliza el valor del arriendo completo para simular tus flujos netos. Si el arriendo ya incluye la administración del edificio, márcalo abajo para descontar ese valor y hacer las cuentas de comisión sobre el canon únicamente.
          </p>
        </div>

        {/* Input & Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Slider Controls Column */}
          <div className="lg:col-span-4 bg-brand-dark-deep p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-6">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider font-mono pb-4 border-b border-stone-200">
              Configura tu Inmueble
            </h3>
            
            {/* Direct Input */}
            <div className="space-y-2">
              <label htmlFor="rent-input-price" className="text-xs text-stone-600 uppercase tracking-widest font-mono">
                {includesHoa ? 'Arriendo Completo (Canon + Admin)' : 'Valor mensual proyectado (COP)'}
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

            {/* Slider Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono text-stone-500">
                <span>$ 1.000.000</span>
                <span>$ 10.000.000</span>
              </div>
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

            {/* HOA Checklist & Slider Input */}
            <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-3.5 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="calc-includes-hoa"
                  checked={includesHoa}
                  onChange={(e) => setIncludesHoa(e.target.checked)}
                  className="w-4 h-4 text-brand-gold border-stone-300 bg-white rounded focus:ring-brand-gold focus:ring-1 cursor-pointer"
                />
                <label htmlFor="calc-includes-hoa" className="text-xs text-stone-800 font-bold cursor-pointer select-none">
                  El valor total incluye administración
                </label>
              </div>

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
                  <div className="bg-stone-50 p-2 rounded text-[10px] text-stone-600 space-y-1 border border-stone-100">
                    <p className="font-sans">Rentabilidad neta del Canon: <strong className="text-emerald-600">{FORMAT_COP(canonValue)}</strong></p>
                    <p className="font-sans leading-tight">Valor de Administración: <strong className="text-stone-700">{FORMAT_COP(safeHoaPrice)}</strong> (excluido de nuestra tarifa de gestión)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Typical Examples Quick Selection Grid */}
            <div className="space-y-2 pt-1">
              <span className="text-xs text-stone-600 uppercase tracking-widest font-mono font-semibold">Valores de Referencia</span>
              <div className="grid grid-cols-2 gap-2">
                {[1500000, 2500000, 4200000, 6000000].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      setRentPrice(val);
                      if (includesHoa && val <= hoaPrice) {
                        setHoaPrice(Math.floor(val * 0.15));
                      }
                    }}
                    id={`quick-price-${val}`}
                    className={`py-2 px-3 border rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      rentPrice === val
                        ? 'bg-brand-gold/10 text-brand-gold-dark border-brand-gold/40 shadow-sm'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 shadow-sm'
                    }`}
                  >
                    {FORMAT_COP(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Property Toggle switches to 8.0% */}
            <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="calc-multi-prop"
                  checked={isMultiProperty}
                  onChange={(e) => setIsMultiProperty(e.target.checked)}
                  className="w-4 h-4 text-brand-gold border-stone-300 bg-white rounded focus:ring-brand-gold focus:ring-1 cursor-pointer"
                />
                <label htmlFor="calc-multi-prop" className="text-xs text-stone-800 font-bold cursor-pointer select-none">
                  Registraré más de 2 inmuebles
                </label>
              </div>
              {isMultiProperty ? (
                <p className="text-[10px] text-brand-gold-dark font-mono pl-6 leading-tight animate-fade-in font-bold">
                  🎉 Tarifa preferencial de administración del <strong>8.0%</strong> (antes 8.5%) y súper descuento de corretaje del <strong>40%</strong> al asegurar (antes 32%).
                </p>
              ) : (
                <p className="text-[10px] text-stone-500 font-mono pl-6 leading-tight">
                  Admin. base de 8.5% (baja a 8.0%) y descuento de corretaje de 32% (sube a 40% al asegurar) si registras +2 inmuebles.
                </p>
              )}
            </div>
          </div>

          {/* Side-by-side Comparative Visual Panel */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Panel 1: Administración (RECOMENDADO) */}
            <div className="bg-brand-dark-deep border-2 border-brand-gold p-6 sm:p-8 rounded-2xl flex flex-col justify-between shadow-xl shadow-brand-gold/5 relative overflow-hidden">
              {/* Premium featured badge */}
              <div className="absolute top-0 right-0 bg-brand-gold text-stone-950 text-[9px] font-extrabold px-3 py-1 uppercase tracking-widest font-mono rounded-bl-lg">
                Recomendado
              </div>
              
              <div>
                <span className="text-[10px] bg-brand-gold/10 text-brand-gold-dark font-mono tracking-widest uppercase py-1 px-2.5 rounded border border-brand-gold/20 font-bold">
                  ADMINISTRACIÓN PREMIUM
                </span>
                <h4 className="text-xl font-bold text-stone-900 mt-4 leading-none font-sans">Renta garantizada fija</h4>
                <p className="text-stone-600 text-xs font-light mt-2 leading-relaxed font-sans">
                  El modelo que te blinda financieramente de forma continua. Recibe tu dinero cada mes en tu cuenta, sin importar si el inquilino se demora o no.
                </p>

                {/* Main Value Display */}
                <div className="bg-white p-4 rounded-xl border border-stone-200 mt-5 shadow-sm">
                  <span className="text-xs text-stone-500 uppercase tracking-widest block font-mono">CONSOLIDADO TRANSFERIDO MENSUAL</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 block mt-1">
                    {FORMAT_COP(adminNetProceeds)}
                  </span>
                  <span className="text-[10px] text-stone-550 block mt-1.5 font-sans leading-tight">
                    {includesHoa 
                      ? `(Deducidos honorarios de Gold Life del ${adminMonthlyFeePercent.toFixed(1)}% sobre canon neto más reembolso administración de copropiedad)`
                      : `(Equivale al ${(100 - adminMonthlyFeePercent).toFixed(1)}% neto del canon de arrendamiento)`}
                  </span>
                </div>

                {/* Subdetails Breakdown */}
                <div className="space-y-3.5 mt-5 text-sm">
                  {includesHoa && (
                    <div className="flex justify-between border-b border-stone-200 pb-2 text-xs">
                      <span className="text-stone-600 font-light">Canon neto de arrendamiento:</span>
                      <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(canonValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-stone-200 pb-2 text-xs">
                    <span className="text-stone-600 font-light">Administración ({adminMonthlyFeePercent.toFixed(1)}% sobre Canon):</span>
                    <span className="text-rose-600 font-mono font-semibold">-{FORMAT_COP(adminFee)}</span>
                  </div>
                  {includesHoa && (
                    <div className="flex justify-between border-b border-stone-200 pb-2 text-xs">
                      <span className="text-stone-600 font-light">Cuota de Administración (Edificio):</span>
                      <span className="text-emerald-600 font-mono font-bold">+{FORMAT_COP(safeHoaPrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 text-xs">
                    <span className="text-stone-700 font-medium font-sans">Inversión única de póliza (50% arriendo completo):</span>
                    <span className="text-brand-gold-dark font-mono font-bold">{FORMAT_COP(adminTotalPolicy)}</span>
                  </div>
                </div>

                {/* Extra Bullet Points of peace of mind */}
                <div className="mt-8 flex items-start space-x-2.5 bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-xs text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-normal font-sans">
                    <strong>Garantizado por 36 meses:</strong> Respaldo legal integral y acompañamiento en restitución sin sobrecostos de asesores adicionales, cubriendo además servicios públicos atrasados.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-stone-200">
                <button
                  id="calc-btn-admin"
                  onClick={() => handleApply('administracion')}
                  className="w-full bg-brand-gold hover:bg-brand-gold-dark active:scale-98 text-stone-950 font-bold py-3.5 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-brand-gold/10"
                >
                  <span className="font-sans">Quiero este modelo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Panel 2: Corretaje */}
            <div className="bg-brand-dark-deep border border-stone-200 p-6 sm:p-8 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] bg-stone-100 text-stone-600 font-mono tracking-widest uppercase py-1 px-2.5 rounded border border-stone-200">
                  CORRETAJE INMOBILIARIO
                </span>
                <h4 className="text-xl font-bold text-stone-900 mt-4 leading-none font-sans">Colocación con filtro estrella</h4>
                <p className="text-stone-600 text-xs font-light mt-2 leading-relaxed font-sans">
                  Excelente modelo si administras directamente el recaudo mensual pero buscas delegar el mercadeo y el filtrado estricto de inquilinos.
                </p>

                {/* Main Value Display */}
                <div className="bg-white p-4 rounded-xl border border-stone-200 mt-5 shadow-sm">
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
                <div className="space-y-3.5 mt-5 text-sm">
                  {includesHoa && (
                    <div className="flex justify-between border-b border-stone-200 pb-2 text-xs">
                      <span className="text-stone-600 font-light">Canon neto de arrendamiento:</span>
                      <span className="text-stone-900 font-mono font-bold">{FORMAT_COP(canonValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-stone-200 pb-2 text-xs items-center">
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
                    <div className="flex justify-between border-b border-stone-200 pb-2 text-xs text-emerald-700 font-medium">
                      <span>Póliza 12 meses (50% arriendo completo):</span>
                      <span className="font-mono">{FORMAT_COP(corretajePolicy12Month)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 text-xs">
                    <span className="text-stone-700 font-medium">Gasto de inversión inicial total:</span>
                    <span className="text-brand-gold-dark font-mono font-bold text-base">{FORMAT_COP(corretajeTotalInitial)}</span>
                  </div>
                </div>

                {/* Dynamic Upsell Toggle Section inside Corretaje Context Totals as requested */}
                <div className="mt-5 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
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
                <div className="mt-5 flex items-start space-x-2.5 bg-stone-100 border border-stone-200 p-3 rounded-lg text-xs text-stone-550">
                  <ShieldAlert className="w-4 h-4 text-brand-gold-dark shrink-0 mt-0.5" />
                  <p className="leading-normal font-sans">
                    <strong>Gestión autónoma:</strong> Tras la búsqueda y firma del inquilino, delegas la gestión de cobro diaria. No incluye el blindaje contra impagos de administración (HOA) o servicios recurrentes.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-stone-200">
                <button
                  id="calc-btn-corretaje"
                  onClick={() => handleApply('corretaje')}
                  className="w-full bg-white hover:bg-stone-50 border border-stone-300 hover:border-brand-gold text-stone-800 font-semibold py-3.5 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                >
                  <span className="font-sans">Quiero corretaje</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

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

            <div className="space-y-4 my-5 text-sm text-stone-700 leading-relaxed bg-brand-dark-deep p-4 rounded-xl border border-brand-gold/10">
              <p>
                Al adquirir la <strong>Póliza de Arriendo Integral</strong> (equivalente al 50% de un mes de arriendo completo) no solo blindas tu renta ante cualquier impago por todo un año, sino que:
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex items-start space-x-2.5 text-xs text-stone-805">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Obtienes un <strong>{corretajeDiscountPercent}% de DESCUENTO inmediato</strong> en nuestro servicio de corretaje profesional.</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-stone-805">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>La comisión se reduce de <strong>100%</strong> al <strong>{100 - corretajeDiscountPercent}% del canon</strong>.</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-stone-805">
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
    </section>
  );
}
