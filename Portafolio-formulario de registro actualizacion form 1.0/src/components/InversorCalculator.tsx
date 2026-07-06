import React, { useState, useMemo } from 'react';
import { Calculator, Wallet, TrendingUp, ShieldCheck, Info, PlusCircle, Building, Percent, BarChart3, Settings, ShieldAlert, ArrowLeft, CheckCircle, DollarSign, Home, Briefcase, FileText, ChevronRight, X, Building2 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface InversorCalculatorProps {
  onBack: () => void;
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('es-CO').format(num);
};

const parseNumber = (str: string) => {
  return Number(str.replace(/\D/g, ''));
};

const CurrencyInput = ({ value, onChange, label, className = '' }: { value: number, onChange: (val: number) => void, label?: string, className?: string }) => {
  const displayValue = value === 0 ? '' : new Intl.NumberFormat('es-CO').format(value);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    onChange(Number(rawValue));
  };

  return (
    <div className={className}>
      {label && <label className="block text-xs text-stone-400 mb-1">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
        <input 
          type="text" 
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder="0"
          className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 pl-8 text-white focus:border-brand-gold outline-none transition-colors"
        />
      </div>
    </div>
  );
};

const Tooltip = ({ text, children, position = 'top' }: { text: React.ReactNode, children: React.ReactNode, position?: 'top' | 'bottom' | 'right' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' }) => {
  const [isOpen, setIsOpen] = useState(false);

  let positionClasses = "bottom-full left-1/2 -translate-x-1/2 mb-2";
  let arrowClasses = "top-full left-1/2 -translate-x-1/2 border-t-stone-800";
  
  if (position === 'bottom') {
    positionClasses = "top-full left-1/2 -translate-x-1/2 mt-2";
    arrowClasses = "bottom-full left-1/2 -translate-x-1/2 border-b-stone-800";
  } else if (position === 'bottom-right') {
    positionClasses = "top-full left-0 mt-2";
    arrowClasses = "bottom-full left-3 border-b-stone-800";
  } else if (position === 'bottom-left') {
    positionClasses = "top-full right-0 mt-2";
    arrowClasses = "bottom-full right-3 border-b-stone-800";
  } else if (position === 'top-right') {
    positionClasses = "bottom-full left-0 mb-2";
    arrowClasses = "top-full left-3 border-t-stone-800";
  } else if (position === 'top-left') {
    positionClasses = "bottom-full right-0 mb-2";
    arrowClasses = "top-full right-3 border-t-stone-800";
  } else if (position === 'right') {
    positionClasses = "left-full top-1/2 -translate-y-1/2 ml-2";
    arrowClasses = "right-full top-1/2 -translate-y-1/2 border-r-stone-800";
  }

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <div className={`absolute ${positionClasses} ${isOpen ? 'block' : 'hidden'} w-[240px] sm:w-[280px] p-3 bg-stone-800 text-stone-200 text-[11px] leading-relaxed rounded-xl shadow-2xl z-50 border border-stone-700 pointer-events-none`}>
        {text}
        <div className={`absolute border-4 border-transparent ${arrowClasses}`}></div>
      </div>
    </div>
  );
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const cuota = payload.find((p: any) => p.dataKey === 'CuotaMensual')?.value || 0;
    const ingresoNeto = payload.find((p: any) => p.dataKey === 'IngresoNeto')?.value || 0;
    const flujoCaja = payload.find((p: any) => p.dataKey === 'FlujoCaja')?.value || 0;
    
    const fmt = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    return (
      <div className="bg-stone-900/95 backdrop-blur-md border border-stone-700 p-2 md:p-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] text-[10px] md:text-xs min-w-[160px] md:min-w-[220px] transform md:translate-y-0 -translate-y-full mt-[-15px] md:mt-0 md:translate-x-0 -translate-x-1/2 ml-[50%] md:ml-0">
        <p className="font-bold text-white border-b border-stone-800 pb-1 md:pb-2 mb-1 md:mb-2 text-xs md:text-sm">{label}</p>
        
        <div className="space-y-1">
          <p className="text-[8px] md:text-[9px] text-stone-500 uppercase tracking-widest mb-1 md:mb-1.5">Métricas Mensuales</p>
          <p className="flex justify-between items-center"><span className="text-red-400">Cuota:</span> <span className="font-medium text-white">{fmt(cuota)}</span></p>
          <p className="flex justify-between items-center"><span className="text-emerald-400">Neto:</span> <span className="font-medium text-white">{fmt(ingresoNeto)}</span></p>
          <p className="flex justify-between items-center font-bold mt-1 md:mt-1.5"><span className="text-brand-gold">Flujo (Excedente):</span> <span className={flujoCaja >= 0 ? 'text-brand-gold' : 'text-red-400'}>{fmt(flujoCaja)}</span></p>
        </div>

        <div className="border-t border-stone-800 pt-2 md:pt-3 mt-2 md:mt-3 space-y-1">
          <p className="text-[8px] md:text-[9px] text-stone-500 uppercase tracking-widest mb-1 md:mb-1.5">Proyección Anualizada</p>
          <p className="flex justify-between items-center"><span className="text-emerald-400">Ingreso Neto Anual:</span> <span className="font-medium text-white">{fmt(ingresoNeto * 12)}</span></p>
          <p className="flex justify-between items-center font-bold mt-1 md:mt-1.5"><span className="text-brand-gold">Flujo Anual:</span> <span className={flujoCaja >= 0 ? 'text-brand-gold' : 'text-red-400'}>{fmt(flujoCaja * 12)}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export default function InversorCalculator({ onBack }: InversorCalculatorProps) {
  const [activeTab, setActiveTab] = useState<'comprador' | 'inversionista' | 'vendedor'>('comprador');

  // Estados Vendedor
  const [sellerPurchaseValue, setSellerPurchaseValue] = useState<number>(200000000);
  const [sellerYearsOwned, setSellerYearsOwned] = useState<number>(5);
  const [sellerRetencionRate, setSellerRetencionRate] = useState<number>(1.0);
  const [sellerNotariaRate, setSellerNotariaRate] = useState<number>(0.27);
  const [commissionRate, setCommissionRate] = useState<number>(3.0);
  const [showMitigationModal, setShowMitigationModal] = useState(false);

  // --- ESTADOS COMPRADOR / INVERSIONISTA ---
  const [propertyValue, setPropertyValue] = useState<number>(360000000);
  const [hasRemodel, setHasRemodel] = useState<boolean>(false);
  const [remodelValue, setRemodelValue] = useState<number>(50000000);
  const [savings, setSavings] = useState<number>(80000000);
  const [cesantias, setCesantias] = useState(0);
  const [arrasPercent, setArrasPercent] = useState<number>(10);
  const [modality, setModality] = useState<'contado' | 'credito' | 'leasing'>('credito');
  const [termYears, setTermYears] = useState(20);
  const [leasingOptionPercent, setLeasingOptionPercent] = useState<number>(5);
  const [interestRateEA, setInterestRateEA] = useState(13.35); 
  const [selectedBank, setSelectedBank] = useState('Bancolombia');
  const [bankRates, setBankRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [housingType, setHousingType] = useState<'VIS' | 'NO_VIS'>('NO_VIS');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Estados para Abonos Acelerados
  const [enableExtraPayments, setEnableExtraPayments] = useState(false);
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState(0);
  const [extraAnnualPayment, setExtraAnnualPayment] = useState(0);
  const [reinvestCashFlow, setReinvestCashFlow] = useState<boolean>(true);

  // Estado para el gráfico
  const [selectedYearIndex, setSelectedYearIndex] = useState<number | null>(0);

  React.useEffect(() => {
    const fetchRates = async () => {
      setLoadingRates(true);
      try {
        const res = await fetch('https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec?accion=obtenerTasasSFC');
        const data = await res.json();
        if (data && data.length > 0) {
           const sorted = data.sort((a: any, b: any) => {
             const rateA = parseFloat(a.tasaEA.toString().replace(',','.'));
             const rateB = parseFloat(b.tasaEA.toString().replace(',','.'));
             return rateA - rateB;
           });
           setBankRates(sorted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRates(false);
      }
    };
    fetchRates();
  }, []);

  // Estados Inversionista
  const [rentValue, setRentValue] = useState<number>(2500000);
  const [adminValue, setAdminValue] = useState<number>(300000);
  const [vacationMonths, setVacationMonths] = useState<number>(1);
  const [ipcRate, setIpcRate] = useState<number>(5.0);
  const [plusvaliaRate, setPlusvaliaRate] = useState<number>(4.0);
  const [predialRate, setPredialRate] = useState<number>(0.8);
  const [gestionType, setGestionType] = useState<'administracion' | 'corretaje' | 'ninguna'>('administracion');
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateFinance = useMemo(() => {
    const totalProperty = propertyValue + (hasRemodel ? remodelValue : 0);
    const totalAportes = savings + cesantias;
    const loanAmount = Math.max(0, totalProperty - totalAportes);

    // Validar % máximo de financiación
    let maxFinancePercent = 0;
    if (modality === 'credito') maxFinancePercent = 0.7;
    if (modality === 'leasing') maxFinancePercent = 0.8;
    if (modality === 'contado') maxFinancePercent = 0;

    const isOverFinanced = Math.round(loanAmount) > Math.round(totalProperty * maxFinancePercent);
    const minimumDownpayment = totalProperty * (1 - maxFinancePercent);
    const requiredPercent = (1 - maxFinancePercent) * 100;

    // Gastos Cierre Comprador (Basado en la normativa colombiana actual)
    const gastosNotariales = propertyValue * 0.0027; // 0.27% (La mitad del 0.54%)
    const beneficencia = propertyValue * 0.01; // 1%
    const registro = propertyValue * 0.0067; // 0.67%
    let gastosHipoteca = 0;
    let avaluo = 0;
    let estudioTitulos = 0;

    if (modality === 'credito') {
      gastosHipoteca = loanAmount * 0.005; // 0.5% del valor del préstamo
      avaluo = 300000;
      estudioTitulos = 200000;
    } else if (modality === 'leasing') {
      avaluo = 300000;
      estudioTitulos = 200000;
    }

    const totalGastosCierre = gastosNotariales + beneficencia + registro + gastosHipoteca;
    const totalOtrosGastos = avaluo + estudioTitulos;
    
    const totalGastosIniciales = totalGastosCierre + totalOtrosGastos;

    // Amortización (Cuota mensual)
    let cuotaMensual = 0;
    let seguroVidaIncendio = 0;
    let opcionCompraValue = 0;

    if (modality !== 'contado' && loanAmount > 0) {
      // Conversión de Tasa Efectiva Anual (E.A) a Mes Vencido (M.V)
      const tasaMV = Math.pow(1 + (interestRateEA / 100), 1 / 12) - 1;
      const totalMeses = termYears * 12;
      
      if (modality === 'leasing') {
        opcionCompraValue = totalProperty * (leasingOptionPercent / 100);
      }
      
      // Fórmula de anualidad con Valor Futuro (Opción de Compra)
      cuotaMensual = (loanAmount - (opcionCompraValue / Math.pow(1 + tasaMV, totalMeses))) * (tasaMV / (1 - Math.pow(1 + tasaMV, -totalMeses)));
      
      seguroVidaIncendio = loanAmount * 0.0005; // Estimado 0.05%
    }
    
    return {
      totalProperty,
      totalAportes,
      loanAmount,
      isOverFinanced,
      maxAllowedLoan: totalProperty * maxFinancePercent,
      gastosNotariales,
      beneficencia,
      registro,
      gastosHipoteca,
      totalGastosCierre,
      avaluo,
      estudioTitulos,
      totalOtrosGastos,
      totalGastosIniciales,
      cuotaMensual,
      seguroVidaIncendio,
      totalCuotaMensual: cuotaMensual + seguroVidaIncendio,
      minimumDownpayment,
      requiredPercent,
      opcionCompraValue
    };
  }, [propertyValue, hasRemodel, remodelValue, savings, cesantias, modality, termYears, interestRateEA, leasingOptionPercent]);

  const calculateInvestment = useMemo(() => {
    // Ingresos
    const rentValueAnual = rentValue * (12 - vacationMonths);
    
    // Gastos
    const predialAnual = propertyValue * (predialRate / 100);
    const adminAnual = adminValue * 12;
    
    // Comisión según tipo de gestión
    let comisionAnual = 0;
    if (gestionType === 'administracion') {
      comisionAnual = rentValue * 0.085 * (12 - vacationMonths);
    } else if (gestionType === 'corretaje') {
      comisionAnual = rentValue; // 1 canon completo al año
    }

    const segurosAnuales = modality !== 'contado' ? (calculateFinance.loanAmount * 0.0005 * 12) : 0; 
    
    const gastosOperativosAnuales = predialAnual + adminAnual + comisionAnual + segurosAnuales;
    
    // NOI y Cap Rate
    const NOI = rentValueAnual - gastosOperativosAnuales;
    const capRate = (NOI / propertyValue) * 100;
    
    // Flujo de Caja
    const cuotaAnual = modality === 'contado' ? 0 : calculateFinance.totalCuotaMensual * 12;
    const cashFlowAnual = NOI - cuotaAnual;
    const cashFlowMensual = cashFlowAnual / 12;
    
    // Valorización a futuro
    const futureValue = propertyValue * Math.pow(1 + (plusvaliaRate / 100), termYears);
    const futureRent = rentValue * Math.pow(1 + (ipcRate / 100), termYears);
    const totalEquity = futureValue;

    return {
      rentValueAnual,
      predialAnual,
      adminAnual,
      comisionAnual,
      segurosAnuales,
      gastosOperativosAnuales,
      NOI,
      capRate,
      cashFlowAnual,
      cashFlowMensual,
      futureValue,
      futureRent,
      totalEquity
    };
  }, [rentValue, vacationMonths, propertyValue, predialRate, adminValue, modality, calculateFinance.loanAmount, calculateFinance.totalCuotaMensual, plusvaliaRate, termYears, gestionType, ipcRate]);

  const advancedStats = useMemo(() => {
    let currentBalance = calculateFinance.loanAmount;
    const baseCuota = modality === 'contado' ? 0 : calculateFinance.totalCuotaMensual;
    const baseCuotaSinSeguro = modality === 'contado' ? 0 : calculateFinance.cuotaMensual;
    const seguroMensual = calculateFinance.seguroVidaIncendio;
    const tasaMV = Math.pow(1 + (interestRateEA / 100), 1 / 12) - 1;
    
    let totalInterestPaidNormal = 0;
    let totalInterestPaidAccelerated = 0;
    
    // Normal interest calculation without extra payments
    if (modality !== 'contado' && baseCuotaSinSeguro > 0) {
       let balNormal = calculateFinance.loanAmount;
       const limit = termYears * 12;
       for (let m = 1; m <= limit; m++) {
          const int = balNormal * tasaMV;
          totalInterestPaidNormal += int;
          balNormal -= (baseCuotaSinSeguro - int);
          if (balNormal <= 0) break;
       }
    }

    const data = [];
    const monthlyDataByYear: Record<number, Array<{month: number, flujo: number, capital: number, interes: number}>> = {};
    const annualDataByYear: Record<number, {flujo: number, ingreso: number, cuota: number, abonos: number}> = {};
    let payoffMonth = termYears * 12;
    
    const noiAnualBase = calculateInvestment.NOI;

    for (let i = 0; i < termYears; i++) {
      const year = i + 1;
      monthlyDataByYear[i] = [];
      const noiAnualYear = noiAnualBase * Math.pow(1 + (ipcRate / 100), i);
      const noiMensualYear = noiAnualYear / 12;
      
      let cuotaMensualPromedio = 0;
      let flujoMensualPromedio = 0;
      let abonosAnualesYear = 0;
      let cuotaBancoAnualYear = 0;

      for (let m = 1; m <= 12; m++) {
         const monthIndex = (i * 12) + m;
         let cuotaMes = 0;
         let flujoMes = noiMensualYear;
         let totalPrincipalPaymentForMonth = 0;
         let interestForMonth = 0;
         let extraPaymentForMonth = 0;

         if (currentBalance > 0 && modality !== 'contado') {
            const interest = currentBalance * tasaMV;
            interestForMonth = interest;
            totalInterestPaidAccelerated += interest;
            
            let principalPayment = baseCuotaSinSeguro - interest;
            let extraPayment = 0;
            
            if (enableExtraPayments) {
               extraPayment += extraMonthlyPayment;
               if (m === 12) extraPayment += extraAnnualPayment;
               
               if (reinvestCashFlow) {
                 const baseFCF = noiMensualYear - baseCuota;
                 if (baseFCF > 0) extraPayment += baseFCF;
               }
            }
            extraPaymentForMonth = extraPayment;

            let totalPrincipalPayment = principalPayment + extraPayment;
            if (currentBalance < totalPrincipalPayment) {
               totalPrincipalPayment = currentBalance;
            }
            totalPrincipalPaymentForMonth = totalPrincipalPayment;

            currentBalance -= totalPrincipalPayment;
            cuotaMes = interest + totalPrincipalPayment + seguroMensual;
            
            if (currentBalance <= 0 && payoffMonth === termYears * 12) {
               payoffMonth = monthIndex;
            }
         }

         flujoMes -= cuotaMes;
         monthlyDataByYear[i].push({ 
           month: m, 
           flujo: flujoMes,
           capital: totalPrincipalPaymentForMonth,
           interes: interestForMonth
         });
         cuotaMensualPromedio += cuotaMes;
         flujoMensualPromedio += flujoMes;
         abonosAnualesYear += extraPaymentForMonth;
         cuotaBancoAnualYear += (cuotaMes - extraPaymentForMonth);
      }

      annualDataByYear[i] = {
        flujo: flujoMensualPromedio,
        ingreso: noiAnualYear,
        cuota: cuotaBancoAnualYear,
        abonos: abonosAnualesYear
      };

      data.push({
        year: `Año ${year}`,
        IngresoNeto: Math.round(noiMensualYear),
        CuotaMensual: Math.round(cuotaMensualPromedio / 12),
        FlujoCaja: Math.round(flujoMensualPromedio / 12)
      });
    }

    const breakEvenIndex = data.findIndex(d => d.FlujoCaja >= 0);
    const breakEvenYear = modality === 'contado' ? 0 : (breakEvenIndex >= 0 ? breakEvenIndex + 1 : -1);
    
    return { 
      data, 
      monthlyDataByYear,
      annualDataByYear,
      breakEvenYear,
      payoffMonth,
      payoffYears: (payoffMonth / 12).toFixed(1),
      interestSaved: Math.max(0, totalInterestPaidNormal - totalInterestPaidAccelerated)
    };
  }, [termYears, modality, calculateFinance, ipcRate, calculateInvestment.NOI, interestRateEA, enableExtraPayments, extraMonthlyPayment, extraAnnualPayment, reinvestCashFlow]);

  return (
    <div className="w-full max-w-7xl mx-auto bg-stone-900 rounded-3xl shadow-2xl border border-stone-800 overflow-clip md:overflow-hidden animate-fade-in relative">
      
      {showMitigationModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 w-full max-w-2xl rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowMitigationModal(false)} className="absolute top-4 right-4 text-stone-500 hover:text-white"><X /></button>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-sky-400" /> Plan de Mitigación Tributaria
            </h2>
            <p className="text-stone-400 text-sm mb-6">4 estrategias legales (Estatuto Tributario) para reducir el impuesto de Ganancia Ocasional al vender tu inmueble:</p>
            
            <ul className="space-y-4 text-sm text-stone-300">
              <li className="bg-sky-900/20 border border-sky-800/50 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-sky-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">ESTRATEGIA 1</div>
                <strong className="text-sky-400 block mb-1">1. Factor Multiplicador (Reajuste Fiscal - Art. 73 E.T.):</strong> 
                Permite tomar el valor original de compra y multiplicarlo por el índice anual fijado por el gobierno. Esto actualiza el costo del inmueble a valor presente, reduciendo drásticamente la utilidad gravable sobre la que pagas el 15%.
              </li>

              <li className="bg-emerald-900/10 border border-emerald-800/30 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-700/50 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">ESTRATEGIA 2</div>
                <strong className="text-emerald-400 block mb-1">2. Avalúo Catastral como Costo Fiscal (Art. 72 E.T.):</strong> 
                Puedes usar el avalúo catastral (o autoavalúo) del año anterior a la venta como tu "costo de compra" si este es mayor al costo real reajustado. (Debe haber sido declarado en renta).
              </li>

              <li className="bg-brand-gold/5 border border-brand-gold/20 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-brand-gold/30 text-brand-gold text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">ESTRATEGIA 3</div>
                <strong className="text-brand-gold block mb-1">3. Capitalizar Remodelaciones y Gastos Notariales (Art. 69 E.T.):</strong> 
                Suma al costo fiscal todas las mejoras, remodelaciones, ampliaciones y los gastos de notaría y registro de cuando compraste. <strong>Requisito vital:</strong> Solo valen las facturas electrónicas bancarizadas a nombre del propietario.
              </li>
              
              <li className="bg-purple-900/10 border border-purple-800/30 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-purple-700/50 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">ESTRATEGIA 4</div>
                <strong className="text-purple-400 block mb-1">4. Cuentas AFC (Art. 311-1 E.T.):</strong> 
                Si vendes tu casa de habitación (poseída por más de 2 años) y depositas el dinero en una cuenta AFC o lo usas para pagar crédito hipotecario, puedes eximir hasta <strong>5.000 UVT (aprox. $235 millones)</strong> de la Ganancia Ocasional restante.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="p-6 md:p-8 border-b border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-stone-400 hover:text-brand-gold flex items-center gap-2 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al Panel
          </button>
          <h1 className="text-3xl font-light text-white">
            Calculadora Inmobiliaria <span className="font-bold text-brand-gold">Gold Life</span>
          </h1>
        </div>
        
        <div className="hidden md:flex bg-stone-950 rounded-xl p-1 border border-stone-800 self-end">
          <button onClick={() => setActiveTab('comprador')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'comprador' ? 'bg-brand-gold text-stone-900' : 'text-stone-400 hover:text-white'}`}>Comprador</button>
          <button onClick={() => setActiveTab('inversionista')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'inversionista' ? 'bg-brand-gold text-stone-900' : 'text-stone-400 hover:text-white'}`}>Inversionista</button>
          <button onClick={() => setActiveTab('vendedor')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'vendedor' ? 'bg-brand-gold text-stone-900' : 'text-stone-400 hover:text-white'}`}>Vendedor</button>
        </div>
      </div>

      {/* STICKY TABS MOBILE */}
      <div className="sticky top-[104px] z-[40] p-4 md:hidden bg-stone-900/95 backdrop-blur-md border-b border-stone-800 shadow-xl rounded-t-3xl">
        <div className="flex bg-stone-950 rounded-xl p-1 border border-stone-800 shadow-inner">
          <button onClick={() => setActiveTab('comprador')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'comprador' ? 'bg-brand-gold text-stone-900 shadow-md' : 'text-stone-400 hover:text-white'}`}>Comprador</button>
          <button onClick={() => setActiveTab('inversionista')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'inversionista' ? 'bg-brand-gold text-stone-900 shadow-md' : 'text-stone-400 hover:text-white'}`}>Inversionista</button>
          <button onClick={() => setActiveTab('vendedor')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'vendedor' ? 'bg-brand-gold text-stone-900 shadow-md' : 'text-stone-400 hover:text-white'}`}>Vendedor</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-5/12 p-5 md:p-6 bg-stone-900/50 border-r border-stone-800">
          
          {activeTab === 'comprador' && (
            <div className="space-y-4 animate-fade-in">
              {/* Sección Inmueble */}
              <div>
                <h3 className="text-brand-gold font-semibold mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4" /> 1. Datos del Inmueble
                </h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CurrencyInput 
                      label="Valor del Inmueble"
                      value={propertyValue}
                      onChange={setPropertyValue}
                    />

                    <div className="flex flex-col justify-end">
                      <div className="flex items-center justify-between p-2.5 bg-stone-950 border border-stone-800 rounded-xl h-[46px]">
                        <span className="text-xs text-stone-300">¿Remodelación?</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={hasRemodel} onChange={() => setHasRemodel(!hasRemodel)} />
                          <div className="w-9 h-5 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-gold"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {hasRemodel && (
                    <div className="animate-fade-in bg-stone-950 p-3 rounded-xl border border-stone-800">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs text-stone-400">Ppto. Remodelación</label>
                        <div className="text-xs font-semibold text-brand-gold">{formatCurrency(remodelValue)}</div>
                      </div>
                      <input 
                        type="range" 
                        min="10000000" max="150000000" step="1000000"
                        value={remodelValue}
                        onChange={(e) => setRemodelValue(Number(e.target.value))}
                        className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sección Aportes */}
              <div>
                <h3 className="text-brand-gold font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> 2. Aportes Propios
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <CurrencyInput 
                    label="Ahorros Líquidos"
                    value={savings}
                    onChange={setSavings}
                  />
                  <CurrencyInput 
                    label="Cesantías"
                    value={cesantias}
                    onChange={setCesantias}
                  />
                </div>
                
                {/* Selector de Arras */}
                <div className="bg-stone-900 border border-stone-800 p-2.5 rounded-xl mb-1.5">
                  <label className="flex justify-between items-center text-xs text-stone-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      Separación / Arras
                      <Tooltip text="Porcentaje del valor del inmueble que entregarás al firmar la promesa de compraventa.">
                        <Info className="w-3.5 h-3.5 text-stone-500 cursor-help hover:text-white" />
                      </Tooltip>
                    </span>
                    <span className="text-white font-medium">{arrasPercent}% ({formatCurrency(propertyValue * (arrasPercent / 100))})</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="30" step="1"
                    value={arrasPercent}
                    onChange={(e) => setArrasPercent(Number(e.target.value))}
                    className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="text-right">
                  <span className="text-sm text-stone-400">Total Aportes: </span>
                  <span className="text-white font-semibold">{formatCurrency(calculateFinance.totalAportes)}</span>
                </div>
              </div>

              {/* Sección Modalidad */}
              <div>
                <h3 className="text-brand-gold font-semibold mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> 3. Modalidad de Compra
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setModality('contado')}
                    className={`p-2.5 rounded-xl border text-sm flex flex-col items-center gap-1.5 transition-all ${modality === 'contado' ? 'bg-brand-gold/10 border-brand-gold text-brand-gold' : 'border-stone-800 text-stone-400 hover:border-stone-600'}`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Contado</span>
                  </button>
                  <button 
                    onClick={() => setModality('credito')}
                    className={`p-2.5 rounded-xl border text-sm flex flex-col items-center gap-1.5 transition-all ${modality === 'credito' ? 'bg-brand-gold/10 border-brand-gold text-brand-gold' : 'border-stone-800 text-stone-400 hover:border-stone-600'}`}
                  >
                    <Home className="w-4 h-4" />
                    <span className="text-xs">Hipotecario</span>
                  </button>
                  <button 
                    onClick={() => setModality('leasing')}
                    className={`p-2.5 rounded-xl border text-sm flex flex-col items-center gap-1.5 transition-all ${modality === 'leasing' ? 'bg-brand-gold/10 border-brand-gold text-brand-gold' : 'border-stone-800 text-stone-400 hover:border-stone-600'}`}
                  >
                    <Building className="w-4 h-4" />
                    <span className="text-xs">Leasing</span>
                  </button>
                </div>
                
                {modality !== 'contado' && (
                  <div className="mt-4 animate-fade-in space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Plazo del Crédito */}
                      <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex flex-col justify-center">
                        <label className="flex justify-between items-center text-xs font-semibold text-stone-300 mb-2">
                          <span className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-brand-gold" /> Plazo ({termYears} a)
                          </span>
                        </label>
                        <input 
                          type="range" 
                          min="5" max="30" step="1"
                          value={termYears}
                          onChange={(e) => setTermYears(Number(e.target.value))}
                          className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer mb-1"
                        />
                        <div className="flex justify-between text-[9px] text-stone-500 font-medium">
                          <span>5 a</span>
                          <span>30 a</span>
                        </div>
                      </div>

                      {/* Botón de Bancos */}
                      <button 
                        onClick={() => setIsConfigModalOpen(true)}
                        className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between text-stone-300 hover:text-brand-gold hover:border-brand-gold/50 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-7 h-7 shrink-0 rounded-full bg-stone-900 flex items-center justify-center group-hover:bg-brand-gold/10 transition-colors">
                            <Settings className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="font-semibold text-[11px] truncate w-full text-white group-hover:text-brand-gold">Tasas y Bancos</p>
                            <p className="text-[9px] text-stone-500 truncate w-full">{selectedBank} | {interestRateEA}%</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 shrink-0 text-stone-600 group-hover:text-brand-gold transition-colors" />
                      </button>
                    </div>

                    {/* Slider Opción de Compra (Solo Leasing) */}
                    {modality === 'leasing' && (
                      <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex flex-col justify-center animate-fade-in">
                        <label className="flex justify-between items-center text-xs font-semibold text-stone-300 mb-2">
                          <span className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-brand-gold" /> Opción de Compra Final ({leasingOptionPercent}%)
                          </span>
                          <span className="text-white font-bold">{formatCurrency(calculateFinance.totalProperty * (leasingOptionPercent / 100))}</span>
                        </label>
                        <input 
                          type="range" 
                          min="0" max="30" step="1"
                          value={leasingOptionPercent}
                          onChange={(e) => setLeasingOptionPercent(Number(e.target.value))}
                          className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer mb-1"
                        />
                        <div className="flex justify-between text-[9px] text-stone-500 font-medium mt-1">
                          <span>0% (Pagas todo en las cuotas)</span>
                          <span>30% (Cuota más baja)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'inversionista' && (
            <div className="space-y-3 animate-fade-in">
              <div className="bg-stone-900/50 border border-brand-gold/30 rounded-lg px-4 py-2.5 flex items-center gap-2.5 text-[13px] text-stone-300 animate-fade-in shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                <Tooltip position="bottom-right" text={
                  <div className="space-y-3 p-1 w-72 whitespace-normal leading-relaxed text-left">
                    <p className="text-[10px] text-stone-400 italic">Métricas de rentabilidad incluidas en esta proyección:</p>
                    <div className="border-l-2 border-emerald-500 pl-3">
                      <strong className="text-emerald-400 font-bold block mb-1">Cap Rate (Tasa de Capitalización)</strong>
                      <p className="text-[10px] text-stone-300">Rendimiento porcentual de la propiedad en un año, asumiendo compra de contado. Excelente para comparar rápidamente qué tan buen negocio es el inmueble.</p>
                    </div>
                    <div className="border-l-2 border-brand-gold pl-3">
                      <strong className="text-brand-gold font-bold block mb-1">NOI (Net Operating Income)</strong>
                      <p className="text-[10px] text-stone-300">Tu ingreso anual real en efectivo después de descontar predial, administración, seguros y todos los gastos operativos.</p>
                    </div>
                  </div>
                }>
                  <Info className="w-4 h-4 text-brand-gold shrink-0 cursor-help hover:text-amber-300 transition-colors" />
                </Tooltip>
                <p>Modo Inversionista activado. Este panel calcula el retorno real (NOI, Cap Rate y Plusvalía).</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CurrencyInput 
                    label="Canon de Arriendo"
                    value={rentValue}
                    onChange={setRentValue}
                  />
                  <CurrencyInput 
                    label="Administración (si aplica)"
                    value={adminValue}
                    onChange={setAdminValue}
                  />
                </div>

                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-3">
                  <h4 className="text-sm font-semibold text-brand-gold flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4" /> Gastos Operativos y Vacancia
                  </h4>

                  {/* Selector de Gestión Inmobiliaria */}
                  <div className="space-y-1 mb-2">
                    <label className="text-xs text-stone-400">Servicio de Gestión (Gold Life)</label>
                    <div className="flex bg-stone-900 rounded-lg p-1 border border-stone-800">
                      <button 
                        onClick={() => setGestionType('administracion')}
                        className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-medium transition-all ${gestionType === 'administracion' ? 'bg-brand-gold text-stone-900 shadow-sm' : 'text-stone-400 hover:text-white'}`}
                      >
                        Admon (8.5%)
                      </button>
                      <button 
                        onClick={() => setGestionType('corretaje')}
                        className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-medium transition-all ${gestionType === 'corretaje' ? 'bg-brand-gold text-stone-900 shadow-sm' : 'text-stone-400 hover:text-white'}`}
                      >
                        Solo Corretaje
                      </button>
                      <button 
                        onClick={() => setGestionType('ninguna')}
                        className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-medium transition-all ${gestionType === 'ninguna' ? 'bg-brand-gold text-stone-900 shadow-sm' : 'text-stone-400 hover:text-white'}`}
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>
                  
                  {/* Predial Slider */}
                  <div>
                    <label className="flex justify-between text-xs text-stone-400 mb-2">
                      <span>Impuesto Predial Anual</span>
                      <span className="text-white font-medium">{predialRate}% ({formatCurrency(propertyValue * (predialRate/100))})</span>
                    </label>
                    <input 
                      type="range" min="0" max="2" step="0.1" value={predialRate}
                      onChange={(e) => setPredialRate(Number(e.target.value))}
                      className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Vacancia Slider */}
                  <div>
                    <label className="flex justify-between text-xs text-stone-400 mb-2 mt-4">
                      <span>Vacancia (Meses vacío al año)</span>
                      <span className="text-white font-medium">{vacationMonths} mes{vacationMonths !== 1 ? 'es' : ''} ({((vacationMonths/12)*100).toFixed(1)}%)</span>
                    </label>
                    <input 
                      type="range" min="0" max="12" step="1" value={vacationMonths}
                      onChange={(e) => setVacationMonths(Number(e.target.value))}
                      className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-3 relative">
                  <Tooltip text={
                    <div className="space-y-2">
                      <div>
                        <span className="font-bold text-brand-gold">IPC (Inflación):</span> El % que sube el costo de vida cada año. <span className="text-stone-400">Cifra oficial del DANE. Por la Ley 820, tu arriendo sube anualmente basado en este índice.</span>
                      </div>
                      <div className="border-t border-stone-700 pt-2">
                        <span className="font-bold text-brand-gold">Plusvalía Nominal:</span> La valorización anual (%) directa sobre el inmueble. <span className="text-stone-400">Medido oficialmente por el DANE a través del IVPP (Índice de Valoración Predial).</span>
                      </div>
                    </div>
                  } position="bottom">
                    <Info className="w-4 h-4 text-stone-500 absolute top-3 right-3 hover:text-brand-gold cursor-help transition-colors" />
                  </Tooltip>
                  <h4 className="text-sm font-semibold text-brand-gold flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4" /> Proyecciones Macro (Anuales)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* IPC */}
                    <div>
                      <label className="flex justify-between text-xs text-stone-400 mb-2">
                        <span>IPC (Inflación Arriendo)</span>
                        <span className="text-white font-medium">{ipcRate}%</span>
                      </label>
                      <input 
                        type="range" min="1" max="16" step="0.1" value={ipcRate}
                        onChange={(e) => setIpcRate(Number(e.target.value))}
                        className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    {/* Plusvalia */}
                    <div>
                      <label className="flex justify-between text-xs text-stone-400 mb-2">
                        <span>Plusvalía Nominal (Val. Inmueble)</span>
                        <span className="text-white font-medium">{plusvaliaRate}%</span>
                      </label>
                      <input 
                        type="range" min="1" max="25" step="0.1" value={plusvaliaRate}
                        onChange={(e) => setPlusvaliaRate(Number(e.target.value))}
                        className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Años de Proyección (Conectado con Comprador) */}
                  <div className="pt-1">
                    <label className="flex justify-between text-xs text-stone-400 mb-2">
                      <span>Plazo / Años de Proyección</span>
                      <span className="text-white font-medium">{termYears} años</span>
                    </label>
                    <input 
                      type="range" min="5" max="30" step="1" value={termYears}
                      onChange={(e) => setTermYears(Number(e.target.value))}
                      className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendedor' && (
            <div className="space-y-4 animate-fade-in">
              <CurrencyInput 
                label="Valor de Venta del Inmueble"
                value={propertyValue}
                onChange={setPropertyValue}
              />
              
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-3">
                <h4 className="text-sm font-semibold text-brand-gold flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4" /> Datos Fiscales
                </h4>
                <CurrencyInput 
                  label="Valor de Compra Original (Escritura)"
                  value={sellerPurchaseValue}
                  onChange={setSellerPurchaseValue}
                />
                
                <div>
                  <label className="flex justify-between text-xs text-stone-400 mb-2">
                    <span>Años de Propiedad (Ganancia Ocasional)</span>
                    <span className="text-white font-medium">{sellerYearsOwned} años</span>
                  </label>
                  <input 
                    type="range" min="1" max="20" step="1" value={sellerYearsOwned}
                    onChange={(e) => setSellerYearsOwned(Number(e.target.value))}
                    className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">Si es mayor a 2 años, paga 15% de Ganancia Ocasional. Si es menor, se suma a renta líquida.</p>
                </div>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-3">
                <h4 className="text-sm font-semibold text-brand-gold flex items-center gap-2 mb-1">
                  <Percent className="w-4 h-4" /> Tasas de Descuento
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[10px] text-stone-400 mb-1">
                      Retención (%)
                      <Tooltip text="Impuesto anticipado (1% por defecto). Puedes estar exento (0%) si cumples ciertas condiciones de ley, como vender tu única casa de habitación para comprar otra." position="bottom-right">
                        <Info className="w-3 h-3 cursor-pointer text-stone-500 hover:text-white" />
                      </Tooltip>
                    </label>
                    <select
                      value={sellerRetencionRate}
                      onChange={(e) => setSellerRetencionRate(Number(e.target.value))}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-white text-xs focus:border-brand-gold outline-none"
                    >
                      <option value={1.0}>1.0% (Normal)</option>
                      <option value={0}>0% (Exento)</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10px] text-stone-400 mb-1">
                      Notaría (%)
                      <Tooltip text="Gastos de notaría totales son 0.54%, usualmente se pagan por mitades (0.27% c/u). En algunos casos, se acuerdan o redondean al 0.30% u otros montos." position="bottom-left">
                        <Info className="w-3 h-3 cursor-pointer text-stone-500 hover:text-white" />
                      </Tooltip>
                    </label>
                    <select
                      value={sellerNotariaRate}
                      onChange={(e) => setSellerNotariaRate(Number(e.target.value))}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-white text-xs focus:border-brand-gold outline-none"
                    >
                      <option value={0.27}>0.27% (Normal)</option>
                      <option value={0.30}>0.30% (Aprox)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="flex justify-between text-[10px] text-stone-400 mb-2 mt-2">
                    <span>Comisión Inmobiliaria</span>
                    <span className="text-white font-medium">{commissionRate}%</span>
                  </label>
                  <input 
                    type="range" min="0" max="5" step="0.1" value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-stone-600 px-1 mt-0.5">
                    <span>0%</span>
                    <span>3%</span>
                    <span>5%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="w-full lg:w-7/12 bg-stone-950 relative">
          
          {activeTab === 'comprador' && (
            <div className="flex flex-col h-[750px] lg:h-full lg:absolute lg:inset-0 animate-fade-in">
              
              {/* FIXED TOP CARD */}
              <div className="p-4 md:p-6 pb-2 md:pb-4 border-b border-stone-800 shadow-xl shrink-0">
                {/* Alertas de Gamificación / Status de Fondos */}
                {(() => {
                  const targetFull = calculateFinance.minimumDownpayment + calculateFinance.totalGastosIniciales;
                  const hasMin = !calculateFinance.isOverFinanced;
                  const hasFull = calculateFinance.totalAportes >= targetFull;
                  const missingForFull = targetFull - calculateFinance.totalAportes;

                  if (modality === 'contado') {
                    if (calculateFinance.totalAportes < calculateFinance.totalProperty) {
                      const faltantePropiedad = calculateFinance.totalProperty - calculateFinance.totalAportes;
                      const faltanteGastos = calculateFinance.totalGastosIniciales;
                      return (
                        <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-xl text-red-400 text-xs flex gap-2 mb-4 animate-fade-in">
                          <Info className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="w-full">
                            <span className="font-bold block mb-1">Aportes insuficientes para Contado</span>
                            <p className="mb-2">No alcanzas a cubrir el valor de la propiedad. Detalle del faltante:</p>
                            <ul className="space-y-1 mb-2 ml-1 border-l-2 border-red-800/30 pl-2">
                              <li className="flex justify-between">
                                <span>Para el inmueble:</span>
                                <span className="font-bold text-white">{formatCurrency(faltantePropiedad)}</span>
                              </li>
                              <li className="flex justify-between">
                                <span>Para costos de cierre:</span>
                                <span className="font-bold text-white">{formatCurrency(faltanteGastos)}</span>
                              </li>
                            </ul>
                            <div className="flex justify-between pt-1.5 border-t border-red-800/30 font-bold">
                              <span>Total faltante:</span>
                              <span className="text-white">{formatCurrency(missingForFull)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (!hasFull) {
                      return (
                        <div className="bg-amber-900/20 border border-amber-900/50 p-3 rounded-xl text-amber-400 text-xs flex gap-2 mb-4 animate-fade-in">
                          <Info className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block mb-0.5">¡Valor del inmueble cubierto! Faltan gastos de escrituración</span>
                            Alcanzas a pagar el inmueble, pero te faltan <span className="font-bold text-white">{formatCurrency(missingForFull)}</span> para cubrir el notariado, beneficencia y registro.
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-emerald-900/20 border border-emerald-900/50 p-3 rounded-xl text-emerald-400 text-xs flex gap-2 mb-4 animate-fade-in">
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block mb-0.5">¡Fondos completos! 🎉</span>
                            Como cuentas con <span className="font-bold text-white">{formatCurrency(calculateFinance.totalAportes)}</span>, has cubierto el valor total del inmueble (<span className="font-semibold text-white">{formatCurrency(calculateFinance.totalProperty)}</span>) y también los gastos de formalización (<span className="font-semibold text-white">{formatCurrency(calculateFinance.totalGastosIniciales)}</span>). ¡Estás listo para iniciar la compra!
                          </div>
                        </div>
                      );
                    }
                  }

                  // Para Crédito y Leasing
                  if (!hasMin) {
                    const faltanteInicial = calculateFinance.minimumDownpayment - calculateFinance.totalAportes;
                    const faltanteGastos = calculateFinance.totalGastosIniciales;
                    
                    // RED: No alcanza para el banco
                    return (
                      <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-xl text-red-400 text-xs flex gap-2 mb-4 animate-fade-in">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="w-full">
                          <span className="font-bold block mb-1">Aportes insuficientes para {modality === 'credito' ? 'Crédito' : 'Leasing'}</span>
                          <p className="mb-2">No alcanzas a cubrir la cuota inicial mínima del {Math.round(calculateFinance.requiredPercent)}%. Detalle del faltante:</p>
                          <ul className="space-y-1 mb-2 ml-1 border-l-2 border-red-800/30 pl-2">
                            <li className="flex justify-between">
                              <span>Para cuota inicial:</span>
                              <span className="font-bold text-white">{formatCurrency(faltanteInicial)}</span>
                            </li>
                            <li className="flex justify-between">
                              <span>Para costos de cierre:</span>
                              <span className="font-bold text-white">{formatCurrency(faltanteGastos)}</span>
                            </li>
                          </ul>
                          <div className="flex justify-between pt-1.5 border-t border-red-800/30 font-bold">
                            <span>Total faltante:</span>
                            <span className="text-white">{formatCurrency(missingForFull)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (hasMin && !hasFull) {
                    // YELLOW/ORANGE: Alcanza para el banco, pero no para gastos
                    return (
                      <div className="bg-amber-900/20 border border-amber-900/50 p-3 rounded-xl text-amber-400 text-xs flex gap-2 mb-4 animate-fade-in">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">¡Cuota inicial cubierta! Faltan gastos de escrituración</span>
                          Cumples con la inicial del banco, pero te faltan <span className="font-bold text-white">{formatCurrency(missingForFull)}</span> para cubrir el {modality === 'leasing' ? 'avalúo y estudio de títulos' : 'notariado, beneficencia y registro'}.
                        </div>
                      </div>
                    );
                  }

                  if (hasFull) {
                    // GREEN: Todo cubierto
                    return (
                      <div className="bg-emerald-900/20 border border-emerald-900/50 p-3 rounded-xl text-emerald-400 text-xs flex gap-2 mb-4 animate-fade-in">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">¡Felicidades! Tienes los fondos completos 🎉</span>
                          Como cuentas con <span className="font-bold text-white">{formatCurrency(calculateFinance.totalAportes)}</span>, superaste la inicial mínima exigida por el banco (<span className="font-semibold text-white">{formatCurrency(calculateFinance.minimumDownpayment)}</span>) y también cubriste los gastos de formalización (<span className="font-semibold text-white">{formatCurrency(calculateFinance.totalGastosIniciales)}</span>). ¡Estás listo para iniciar la compra!
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Tarjeta Principal de Cuota */}
                {modality !== 'contado' ? (
                  <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-full blur-2xl" />
                    
                    {/* Izquierda: Cuota */}
                    <div className="text-left w-full md:w-5/12 md:border-r border-stone-800 md:pr-4">
                      <p className="text-stone-400 text-[10px] uppercase tracking-widest mb-1">Cuota Mensual Estimada</p>
                      <h2 className="text-3xl font-light text-white mb-1">
                        {formatCurrency(calculateFinance.totalCuotaMensual)}
                      </h2>
                      <p className="text-[10px] text-stone-500">
                        *No incluye seguros. Plazo: {termYears} años.
                      </p>
                    </div>
                    
                    {/* Centro: Resumen */}
                    <div className="text-left w-full md:w-3/12 md:px-4 md:border-r border-stone-800 mt-3 md:mt-0 flex flex-col gap-2">
                      <div>
                        <p className="text-stone-500 text-[10px]">Monto a Financiar</p>
                        <p className="text-white font-semibold text-sm">{formatCurrency(calculateFinance.loanAmount)}</p>
                      </div>
                      <div>
                        <p className="text-stone-500 text-[10px]">Tasa EA Estimada</p>
                        <p className="text-white font-semibold text-sm">{interestRateEA}%</p>
                      </div>
                    </div>

                    {/* Derecha: Banco Seleccionado (Estilo Gaming) */}
                    <div className="text-left w-full md:w-4/12 md:pl-4 mt-3 md:mt-0 flex flex-col justify-center">
                      <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(16,185,129,0.1)] relative overflow-hidden group transition-all hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                        <span className="text-[9px] text-emerald-500/80 font-bold tracking-widest uppercase mb-0.5 relative z-10">Entidad Elegida</span>
                        <span className="text-sm font-bold text-emerald-400 truncate w-full relative z-10">{selectedBank}</span>
                        <div className="mt-1.5 flex items-center justify-center relative z-10">
                          <span className="text-[9px] text-emerald-200 font-medium px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-800/50 rounded-full shadow-inner tracking-wider">
                            VIVIENDA {housingType.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
                    <div className="text-left w-full md:w-1/2 md:border-r border-stone-800 md:pr-6">
                      <p className="text-stone-400 text-[10px] uppercase tracking-widest mb-1">Total a Pagar de Contado</p>
                      <h2 className="text-3xl font-light text-white mb-1">
                        {formatCurrency(calculateFinance.totalProperty + calculateFinance.totalGastosIniciales)}
                      </h2>
                    </div>
                    <div className="text-left w-full md:w-1/2 md:pl-6 mt-3 md:mt-0 flex items-center">
                      <p className="text-[10px] text-stone-500 leading-relaxed">
                        Monto total requerido hoy, incluyendo el valor del inmueble, las remodelaciones (si aplican) y los gastos totales de escrituración y formalización.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* SCROLLABLE CONTENT (Breakdown & Timeline) */}
              {(!calculateFinance.isOverFinanced && modality !== 'contado') || (modality === 'contado' && calculateFinance.totalAportes >= calculateFinance.totalProperty) ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-4 md:pt-4">
                  <div className="space-y-6">
                  
                  {/* Desglose de Costos de Cierre */}
                  <div>
                    <h3 className="text-lg font-medium text-stone-300 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-gold" /> Desglose de Costos de Cierre y Formalización
                    </h3>
                  
                  {modality === 'leasing' && (
                    <div className="bg-brand-gold/10 p-2.5 mb-3 rounded-lg border border-brand-gold/20 flex gap-2.5 items-center">
                      <Tooltip text="En Colombia, para fomentar el acceso a la vivienda, es posible acordar con el banco que los gastos de escrituración y registro (necesarios para traspasar el inmueble al banco) se incluyan dentro del monto total a financiar del Leasing. Esto significa que el banco desembolsa ese dinero a la notaría, y tú lo pagas poco a poco dentro del canon mensual, protegiendo tu liquidez inicial." position="bottom-right">
                        <Info className="w-4 h-4 text-brand-gold shrink-0 cursor-help hover:text-white transition-colors" />
                      </Tooltip>
                      <div className="text-[11px] leading-snug text-stone-300">
                        <strong className="text-brand-gold font-semibold">Dato Leasing (Gastos):</strong> Puedes solicitar financiar los gastos de cierre dentro del mismo crédito para no afectar tu liquidez inicial.
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gastos de Cierre */}
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
                      <h4 className="text-brand-gold font-semibold mb-4 text-sm border-b border-stone-800 pb-2">Asumidos por Comprador</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center text-stone-400">
                          <span className="flex items-center gap-1">
                            Derechos Notariales (50%)
                            <Tooltip text="Equivale aprox. al 0.54% del inmueble. Por costumbre se divide 50/50 entre comprador y vendedor.">
                              <Info className="w-3.5 h-3.5 text-stone-500 cursor-pointer hover:text-white" />
                            </Tooltip>
                          </span>
                          <span className="text-white">{formatCurrency(calculateFinance.gastosNotariales)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-stone-400">
                          <span className="flex items-center gap-1">
                            Impuesto de Beneficencia
                            <Tooltip text="Impuesto departamental/gobernación, equivale al 1% del valor del inmueble.">
                              <Info className="w-3.5 h-3.5 text-stone-500 cursor-pointer hover:text-white" />
                            </Tooltip>
                          </span>
                          <span className="text-white">{formatCurrency(calculateFinance.beneficencia)}</span>
                        </div>

                        <div className="flex justify-between items-center text-stone-400">
                          <span className="flex items-center gap-1">
                            Derechos de Registro
                            <Tooltip text="Cobrado por la Oficina de Instrumentos Públicos, equivale aprox. al 0.67%.">
                              <Info className="w-3.5 h-3.5 text-stone-500 cursor-pointer hover:text-white" />
                            </Tooltip>
                          </span>
                          <span className="text-white">{formatCurrency(calculateFinance.registro)}</span>
                        </div>

                        {modality === 'credito' && (
                          <div className="flex justify-between items-center text-stone-400">
                            <span className="flex items-center gap-1">
                              Gastos de Hipoteca
                              <Tooltip text="Costo de constituir la hipoteca ante notaría e instrumentos públicos. Aprox. 0.5% del crédito.">
                                <Info className="w-3.5 h-3.5 text-stone-500 cursor-pointer hover:text-white" />
                              </Tooltip>
                            </span>
                            <span className="text-white">{formatCurrency(calculateFinance.gastosHipoteca)}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-stone-800 flex justify-between font-bold text-white">
                        <span>Total Cierre Aprox.</span>
                        <span className="text-brand-gold">{formatCurrency(calculateFinance.totalGastosCierre)}</span>
                      </div>
                    </div>

                    {/* Otros Gastos */}
                    {modality !== 'contado' && (
                      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg h-fit">
                        <h4 className="text-brand-gold font-semibold mb-4 text-sm border-b border-stone-800 pb-2">Otros Gastos del Crédito</h4>
                        <div className="space-y-3 text-sm">
                          {modality === 'leasing' && (
                            <div className="flex justify-between items-center text-stone-400">
                              <span>Opción de Compra ({leasingOptionPercent}%)</span>
                              <span className="text-white">{formatCurrency(calculateFinance.opcionCompraValue)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-stone-400">
                            <span>Avalúo (Estimado)</span>
                            <span className="text-white">{formatCurrency(calculateFinance.avaluo)}</span>
                          </div>
                          <div className="flex justify-between items-center text-stone-400">
                            <span>Estudio de Títulos (Estimado)</span>
                            <span className="text-white">{formatCurrency(calculateFinance.estudioTitulos)}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-stone-800 flex justify-between font-bold text-white">
                          <span>Total Otros Gastos</span>
                          <span className="text-brand-gold">{formatCurrency(calculateFinance.totalOtrosGastos + (modality === 'leasing' ? calculateFinance.opcionCompraValue : 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline de Pagos */}
                <div>
                  <h3 className="text-xl font-light text-white mb-6">Línea de Tiempo del Desembolso</h3>
                
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand-gold before:to-stone-800">
                  {(() => {
                    const saldoInicial = calculateFinance.totalAportes;
                    const arrasValue = propertyValue * (arrasPercent / 100);
                    const pagoFase1 = Math.min(saldoInicial, arrasValue); // Protege contra aportes menores a las arras
                    const saldoPostFase1 = saldoInicial - pagoFase1;
                    
                    const pagoFase2 = modality !== 'contado' ? (calculateFinance.avaluo + calculateFinance.estudioTitulos) : 0;
                    const saldoPostFase2 = saldoPostFase1 - pagoFase2;
                    
                    const pagoFase3 = calculateFinance.totalGastosCierre;
                    const saldoPostFase3 = saldoPostFase2 - pagoFase3;

                    return (
                      <>
                        {/* Step 1: Ahora */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-stone-950 bg-brand-gold text-stone-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">
                            1
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-stone-900 p-4 rounded-xl border border-stone-800 shadow-xl">
                            <h4 className="font-bold text-white mb-1">Fase 1: Promesa de Compraventa</h4>
                            <p className="text-xs text-stone-400 mb-3">Se firma la promesa. Separación y acuerdo inicial con el vendedor.</p>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs text-stone-400">
                                <span>Fondos Iniciales:</span>
                                <span>{formatCurrency(saldoInicial)}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-stone-400">
                                <span>Pago de Arras ({arrasPercent}%):</span>
                                <span className="text-red-400">-{formatCurrency(pagoFase1)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm border-t border-stone-800 pt-1">
                                <span className="text-stone-300 font-bold">Fondo Restante:</span>
                                <span className="text-brand-gold font-bold">{formatCurrency(saldoPostFase1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Aprobación */}
                        {modality !== 'contado' && (
                          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-stone-950 bg-stone-800 text-stone-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">
                              2
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-stone-900 p-4 rounded-xl border border-stone-800 shadow-xl">
                              <h4 className="font-bold text-white mb-1">Fase 2: Aprobación Bancaria</h4>
                              <p className="text-xs text-stone-400 mb-3">Pago directo a los peritos y abogados del banco.</p>
                              
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs text-stone-400">
                                  <span>Avalúo + Estudio:</span>
                                  <span className="text-red-400">-{formatCurrency(pagoFase2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-stone-800 pt-1">
                                  <span className="text-stone-300">Fondo Restante:</span>
                                  <span className="text-white font-medium">{formatCurrency(saldoPostFase2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Notaría */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-stone-950 bg-stone-800 text-stone-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">
                            {modality !== 'contado' ? 3 : 2}
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-stone-900 p-4 rounded-xl border border-stone-800 shadow-xl">
                            <h4 className="font-bold text-white mb-1 flex items-center gap-1">
                              Fase 3: Firma de Escrituras
                              <Tooltip text={modality === 'contado' ? "Al ser de contado, todo el dinero se entrega directamente al vendedor en esta fase." : "En esta fase, después del registro, el banco desembolsa el valor total del crédito DIRECTAMENTE AL VENDEDOR, no a tus cuentas."}>
                                <Info className="w-3.5 h-3.5 text-stone-500 cursor-help hover:text-white" />
                              </Tooltip>
                            </h4>
                            <p className="text-xs text-stone-400 mb-3 leading-relaxed">
                              Pagas tu mitad de gastos notariales e impuestos de beneficencia/registro. ¡El dinero que te sobra completa la cuota inicial para el vendedor!
                            </p>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs text-stone-400">
                                <span>Costos de Cierre:</span>
                                <span className="text-red-400">-{formatCurrency(pagoFase3)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm border-t border-stone-800 pt-1">
                                <span className="text-emerald-400 font-bold">Saldo final al Vendedor:</span>
                                <span className="text-emerald-400 font-bold">{formatCurrency(saldoPostFase3)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Step 4: Pagos Mensuales */}
                  {modality !== 'contado' && (
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-stone-950 bg-stone-800 text-stone-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">
                        4
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-stone-900 p-4 rounded-xl border border-stone-800 shadow-xl">
                        <h4 className="font-bold text-white mb-1">Fase 4: Mensualmente por {termYears} años</h4>
                        <p className="text-xs text-stone-400 mb-2">Pago de la cuota mensual del {modality === 'leasing' ? 'canon de leasing' : 'crédito'}.</p>
                        <div className="text-white font-semibold">{formatCurrency(calculateFinance.totalCuotaMensual)}</div>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Finalización */}
                  {modality !== 'contado' && (
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-stone-950 bg-stone-800 text-stone-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">
                        5
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-stone-900 p-4 rounded-xl border border-stone-800 shadow-xl">
                        <h4 className="font-bold text-white mb-1">Fase 5: Al finalizar el plazo</h4>
                        {modality === 'leasing' ? (
                          <p className="text-xs text-stone-400 leading-relaxed">
                            Pago de la <strong className="inline-flex items-center gap-1">Opción de Compra ({formatCurrency(calculateFinance.opcionCompraValue)}) 
                            <Tooltip text="Si no cuentas con este dinero al final puedes: 1) Ceder el contrato a otra persona (vender tus derechos), 2) Refinanciar este saldo final, o 3) Devolver el inmueble al banco (menos recomendada por penalidades)." position="top-left">
                              <Info className="w-3.5 h-3.5 text-stone-500 cursor-help hover:text-white" />
                            </Tooltip>
                            </strong> y <strong>Segundos Gastos de Escrituración</strong> para que el inmueble pase del banco a ser de tu propiedad.
                          </p>
                        ) : (
                          <p className="text-xs text-stone-400">Trámite de <strong>Levantamiento de Hipoteca</strong> ante notaría e instrumentos públicos.</p>
                        )}
                      </div>
                    </div>
                  )}
                    </div>
                  </div>
                </div>
              </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mb-4 opacity-50">
                    <Info className="w-8 h-8 text-stone-600" />
                  </div>
                  <p className="text-stone-400 max-w-sm">
                    Ajusta tus aportes propios o el presupuesto de compra para ver el desglose exacto de costos y la línea de tiempo del proyecto.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inversionista' && (
            <div className="animate-fade-in p-4 space-y-3">
              
              {/* Main KPIs Row */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 flex flex-col justify-center">
                  <p className="text-stone-400 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                    Net Operating Income (NOI)
                    <Tooltip text={
                      <div className="space-y-2">
                        <p className="font-bold text-white border-b border-stone-700 pb-1 mb-1">NOI (Ingreso Operativo Neto)</p>
                        <p className="text-stone-300">Dinero limpio que recibes al año tras pagar:</p>
                        <ul className="list-disc pl-4 space-y-1 text-stone-400">
                          <li><span className="text-stone-300">Predial:</span> Impuesto municipal.</li>
                          <li><span className="text-stone-300">Administración:</span> Mantenimiento del edificio.</li>
                          <li><span className="text-stone-300">Gestión:</span> Honorarios de Gold Life.</li>
                          <li><span className="text-stone-300">Seguros:</span> De vida e incendio, exigidos por ley al tener crédito hipotecario.</li>
                        </ul>
                      </div>
                    } position="bottom">
                      <Info className="w-3 h-3 cursor-help hover:text-white transition-colors" />
                    </Tooltip>
                  </p>
                  <h2 className="text-2xl font-light text-white mb-2">
                    {formatCurrency(calculateInvestment.NOI)} <span className="text-xs text-brand-gold font-medium tracking-wide">/ año</span>
                  </h2>
                  <div className="space-y-1 pt-2 border-t border-stone-800 text-[9px] text-stone-400">
                    <div className="flex justify-between"><span>Imp. Predial:</span> <span>-{formatCurrency(calculateInvestment.predialAnual)}</span></div>
                    <div className="flex justify-between"><span>Admon. Edificio:</span> <span>-{formatCurrency(calculateInvestment.adminAnual)}</span></div>
                    <div className="flex justify-between text-brand-gold/80">
                      <span className="truncate mr-1">{gestionType === 'administracion' ? 'Gestión (8.5%):' : gestionType === 'corretaje' ? 'Corretaje (1 Canon):' : 'Gestión Inmobiliaria:'}</span> 
                      <span>-{formatCurrency(calculateInvestment.comisionAnual)}</span>
                    </div>
                    {modality !== 'contado' && (
                      <div className="flex justify-between"><span>Seguros Obligatorios:</span> <span>-{formatCurrency(calculateInvestment.segurosAnuales)}</span></div>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-2xl p-3 md:p-4 flex flex-col justify-center">
                  <p className="text-emerald-500/70 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                    Cap Rate (Tasa de Cap.)
                    <Tooltip text={
                      <div className="space-y-1.5">
                        <p className="font-bold text-emerald-400 border-b border-stone-700 pb-1 mb-1">Tasa de Capitalización</p>
                        <p className="text-stone-300">Es el % de ganancia anual que produce tu inmueble por sí solo.</p>
                        <p className="text-stone-400 italic">Mide qué tan buen negocio es el apartamento, sin importar si lo compraste de contado o con crédito del banco.</p>
                      </div>
                    } position="bottom">
                      <Info className="w-3 h-3 cursor-help hover:text-emerald-300 transition-colors" />
                    </Tooltip>
                  </p>
                  <h2 className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-1 flex items-baseline gap-1">
                    {calculateInvestment.capRate.toFixed(2)}% <span className="text-xs text-emerald-500/50 font-normal">/ año</span>
                  </h2>
                </div>

                <div className="bg-amber-900/10 border border-amber-900/30 rounded-2xl p-3 md:p-4 flex flex-col justify-center relative">
                  <p className="text-amber-500/70 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                    Plusvalía Real
                    <Tooltip text={
                      <div className="space-y-1.5">
                        <p className="font-bold text-amber-400 border-b border-stone-700 pb-1 mb-1">Plusvalía Real</p>
                        <p className="text-stone-300">Es la ganancia verdadera del inmueble restando la inflación <span className="text-stone-400">(Nominal - IPC)</span>.</p>
                        <p className="text-amber-500/80 italic">Indica cuánto poder adquisitivo extra estás ganando realmente frente al costo de vida.</p>
                      </div>
                    } position="bottom">
                      <Info className="w-3 h-3 cursor-help hover:text-amber-300 transition-colors" />
                    </Tooltip>
                  </p>
                  <h2 className={`text-3xl lg:text-4xl font-bold mb-1 flex items-baseline gap-1 ${(plusvaliaRate - ipcRate) >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {(plusvaliaRate - ipcRate) > 0 ? '+' : ''}{(plusvaliaRate - ipcRate).toFixed(1)}% <span className="text-xs text-amber-500/50 font-normal">/ año</span>
                  </h2>
                  <div className="text-[9px] text-amber-500/50 flex justify-between w-full mt-2 border-t border-amber-900/30 pt-2 font-medium">
                    <span>Nominal: {plusvaliaRate.toFixed(1)}%</span>
                    <span>IPC: {ipcRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Cashflow Card */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-4 relative overflow-hidden shadow-xl">
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${calculateInvestment.cashFlowMensual >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`} />
                <h3 className="text-brand-gold font-semibold mb-3 text-sm border-b border-stone-800 pb-2">Análisis de Flujo de Caja (Cash Flow)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-400 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Ingresos Arriendo</span>
                      <span className="text-white font-medium">+{formatCurrency(calculateInvestment.rentValueAnual)}/año</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-400 flex items-center gap-2"><DollarSign className="w-4 h-4 text-red-500" /> Gastos Operativos</span>
                      <span className="text-red-400 font-medium">-{formatCurrency(calculateInvestment.gastosOperativosAnuales)}/año</span>
                    </div>
                    {modality !== 'contado' && (
                      <div className="flex justify-between items-center text-sm border-t border-stone-800/50 pt-2">
                        <span className="text-stone-400 flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" /> Cuota Banco</span>
                        <span className="text-amber-400 font-medium">-{formatCurrency(calculateFinance.totalCuotaMensual * 12)}/año</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-stone-800 pt-4 md:pt-0 md:pl-6">
                    <p className="text-stone-400 text-[10px] uppercase tracking-widest mb-1">Flujo de Caja Mensual Libre</p>
                    <h2 className={`text-3xl font-light mb-1 ${calculateInvestment.cashFlowMensual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {calculateInvestment.cashFlowMensual >= 0 ? '+' : ''}{formatCurrency(calculateInvestment.cashFlowMensual)}
                    </h2>
                    <p className="text-[10px] text-stone-500 text-center mt-1">
                      {calculateInvestment.cashFlowMensual >= 0 
                        ? 'El inmueble se paga solo y te deja excedente.'
                        : 'Debes aportar este valor mensual para cubrir el crédito.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plusvalia Card */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg">
                <h3 className="text-brand-gold font-semibold mb-4 text-sm border-b border-stone-800 pb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Patrimonio y Rentas Futuras (A {termYears} años)
                </h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col justify-center">
                    <span className="text-[9px] text-stone-500 uppercase tracking-wider mb-1">Valor Comercial Futuro</span>
                    <span className="text-lg font-bold text-white truncate">{formatCurrency(calculateInvestment.futureValue)}</span>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col justify-center">
                    <span className="text-[9px] text-stone-500 uppercase tracking-wider mb-1">Arriendo Futuro /Mes</span>
                    <span className="text-lg font-bold text-emerald-400 truncate">+{formatCurrency(calculateInvestment.futureRent)}</span>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col justify-center">
                    <span className="text-[9px] text-stone-500 uppercase tracking-wider mb-1">Punto Equilibrio</span>
                    <span className="text-lg font-bold text-brand-gold">{advancedStats.breakEvenYear === 0 ? 'Inmediato' : advancedStats.breakEvenYear === -1 ? `> ${termYears} a` : `Año ${advancedStats.breakEvenYear}`}</span>
                  </div>
                  <button onClick={() => setShowAdvancedStats(true)} className="relative overflow-hidden bg-brand-gold/10 hover:bg-brand-gold/20 transition-all p-2 rounded-xl border border-brand-gold/50 flex flex-col items-center justify-center text-center group cursor-pointer h-full min-h-[80px]">
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute inset-[-150%] animate-[spin_3s_linear_infinite]" style={{ background: 'conic-gradient(transparent, transparent, transparent, #fbbf24)' }}></div>
                    </div>
                    <div className="absolute inset-[1px] bg-stone-900 rounded-xl z-0 group-hover:bg-stone-800 transition-colors"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <BarChart3 className="w-5 h-5 text-brand-gold mb-1 group-hover:scale-110 transition-transform animate-pulse" />
                      <span className="text-[9px] text-brand-gold uppercase tracking-wider font-bold">Estadísticas<br/>Avanzadas</span>
                    </div>
                  </button>
                </div>

                <p className="text-stone-400 text-xs leading-relaxed">
                  Asumiendo una valorización anual del <span className="text-white font-bold">{plusvaliaRate}%</span> y una inflación del <span className="text-white font-bold">{ipcRate}%</span> constante, al finalizar el crédito serás dueño del 100% de la propiedad con los valores proyectados arriba.
                </p>
              </div>

            </div>
          )}

          {activeTab === 'vendedor' && (() => {
            const profit = Math.max(0, propertyValue - sellerPurchaseValue);
            const isGananciaOcasional = sellerYearsOwned >= 2;
            const impuestoPorcentaje = isGananciaOcasional ? 15 : 35; // 35% como estimado conservador en renta ordinaria
            const valorImpuesto = profit * (impuestoPorcentaje / 100);
            
            const retencionValor = propertyValue * (sellerRetencionRate / 100);
            const notariaValor = propertyValue * (sellerNotariaRate / 100);
            const comisionValor = propertyValue * (commissionRate / 100);
            
            const valorNeto = propertyValue - retencionValor - notariaValor - comisionValor - valorImpuesto;

            return (
              <div className="animate-fade-in space-y-6">
                <h3 className="text-xl font-light text-white mb-4">Liquidación del Vendedor</h3>
                
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center text-stone-300">
                    <span>Valor de Venta</span>
                    <span className="font-semibold text-white">{formatCurrency(propertyValue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-red-400">
                    <span>Retención en la Fuente ({sellerRetencionRate}%)</span>
                    <span>- {formatCurrency(retencionValor)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-400">
                    <span>Gastos Notariales ({sellerNotariaRate}%)</span>
                    <span>- {formatCurrency(notariaValor)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-400">
                    <span>Comisión Inmobiliaria ({commissionRate}%)</span>
                    <span>- {formatCurrency(comisionValor)}</span>
                  </div>
                  
                  <div className="border-t border-stone-700/50 pt-3 mt-3">
                    <div className="flex justify-between items-center text-amber-500">
                      <span>
                        Impuesto a las Ganancias ({impuestoPorcentaje}%)
                        <Tooltip text={isGananciaOcasional ? "Aplica 15% de Ganancia Ocasional por tener el inmueble 2 o más años." : "Al tener el inmueble menos de 2 años, la ganancia tributa como Renta Líquida Ordinaria. El 35% es un estimado conservador."} position="bottom">
                          <Info className="w-3.5 h-3.5 inline-block ml-1 cursor-pointer hover:text-white" />
                        </Tooltip>
                      </span>
                      <span>- {formatCurrency(valorImpuesto)}</span>
                    </div>
                  </div>

                  <div className="border-t border-stone-700 pt-4 mt-4 flex justify-between items-center">
                    <span className="font-bold text-white">Valor Neto a Recibir (Libre)</span>
                    <span className="font-bold text-2xl text-brand-gold">
                      {formatCurrency(valorNeto)}
                    </span>
                  </div>
                </div>

                <div className="bg-brand-gold/10 border border-brand-gold/20 p-4 rounded-xl flex gap-3 mt-6">
                <CheckCircle className="w-5 h-5 text-brand-gold shrink-0" />
                <p className="text-xs text-stone-300">
                  Usa esta herramienta para mostrarle al propietario exactamente cuánto dinero libre le quedará después de impuestos y comisiones. Transparencia total.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-800">
                <button 
                  onClick={() => setShowMitigationModal(true)}
                  className="w-full bg-stone-900 border border-stone-700 hover:border-brand-gold hover:text-brand-gold transition-all text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Ver Plan de Mitigación Tributaria
                </button>
              </div>

            </div>
          );})()}

        </div>
      </div>

      {/* MODAL CONFIGURACIÓN CRÉDITO */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-950">
              <h3 className="text-xl font-light text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-gold" /> Parámetros del Crédito
              </h3>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="text-stone-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Entidad Bancaria */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-gold" /> Entidad Financiera
                  {loadingRates && <span className="text-xs text-stone-400 font-normal ml-auto animate-pulse">Sincronizando con SFC...</span>}
                </label>
                
                {/* Switch VIS / NO VIS */}
                <div className="flex bg-stone-950 p-1 rounded-xl mb-4 border border-stone-800">
                  <button
                    onClick={() => setHousingType('VIS')}
                    className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${housingType === 'VIS' ? 'bg-stone-800 text-white font-semibold' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    Vivienda VIS
                  </button>
                  <button
                    onClick={() => setHousingType('NO_VIS')}
                    className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${housingType === 'NO_VIS' ? 'bg-stone-800 text-white font-semibold' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    Vivienda NO VIS
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {bankRates.length > 0 ? (
                    bankRates
                      .filter(bankObj => {
                        const isNoVis = bankObj.tipoCredito.toLowerCase().includes('no vis');
                        return housingType === 'NO_VIS' ? isNoVis : !isNoVis && bankObj.tipoCredito.toLowerCase().includes('vis');
                      })
                      .map((bankObj, idx) => {
                      const rate = parseFloat(bankObj.tasaEA.toString().replace(',','.'));
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedBank(bankObj.entidad);
                            setInterestRateEA(rate);
                          }}
                          className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-center ${selectedBank === bankObj.entidad ? 'bg-brand-gold/10 border-brand-gold' : 'bg-stone-950 border-stone-800 hover:border-stone-600'}`}
                        >
                          <div className="flex justify-between items-center w-full mb-0.5">
                            <span className={`text-[11px] truncate pr-2 font-medium ${selectedBank === bankObj.entidad ? 'text-brand-gold' : 'text-stone-300'}`}>{bankObj.entidad}</span>
                            <span className={`text-xs font-bold shrink-0 ${selectedBank === bankObj.entidad ? 'text-brand-gold' : 'text-white'}`}>{rate}% EA</span>
                          </div>
                          <span className="text-[9px] text-stone-500 truncate w-full" title={bankObj.tipoCredito}>
                            {bankObj.tipoCredito.replace('Adquisición de vivienda ', '').replace('Adquisición leasing habitacional ', 'Leasing ')}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    ['Bancolombia', 'Davivienda', 'Fondo Nacional', 'BBVA'].map(bank => (
                      <button
                        key={bank}
                        onClick={() => {
                          setSelectedBank(bank);
                          if (bank === 'Bancolombia') setInterestRateEA(13.35);
                          if (bank === 'Davivienda') setInterestRateEA(13.90);
                          if (bank === 'Fondo Nacional') setInterestRateEA(11.50);
                          if (bank === 'BBVA') setInterestRateEA(14.20);
                        }}
                        className={`p-2 rounded-lg border text-sm text-center transition-all ${selectedBank === bank ? 'bg-brand-gold/10 border-brand-gold text-brand-gold font-semibold' : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-600'}`}
                      >
                        {bank}
                      </button>
                    ))
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-3 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Datos oficiales en tiempo real vía SuperFinanciera.
                </p>
              </div>

            </div>

            <div className="p-6 border-t border-stone-800 bg-stone-950">
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="w-full py-4 bg-brand-gold text-stone-900 rounded-xl font-bold hover:bg-yellow-500 transition-colors"
              >
                Aplicar y Recalcular
              </button>
            </div>
          </div>
        </div>
      )}
      {showAdvancedStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-gold" /> Proyección Avanzada del Inversionista
                </h3>
                <p className="text-xs text-stone-400 mt-1">Comparativa: Ingresos netos vs. Cuota hipotecaria en el tiempo.</p>
              </div>
              <button onClick={() => setShowAdvancedStats(false)} className="text-stone-400 hover:text-white transition-colors bg-stone-900 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
              {/* SIDEBAR DE CONTROLES */}
              <div className="w-full lg:w-72 bg-stone-950/50 border-b lg:border-b-0 lg:border-r border-stone-800 p-4 flex flex-col gap-2.5 shrink-0 lg:overflow-y-auto">
                <h4 className="text-brand-gold font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Simulador en Vivo
                </h4>
                
                {/* Controles de Ingresos (Arriendo y Admin) conectados al panel principal */}
                <div className="space-y-2 pb-2 border-b border-stone-800">
                  <CurrencyInput 
                    label="Canon de Arriendo Mensual"
                    value={rentValue}
                    onChange={setRentValue}
                  />
                  <CurrencyInput 
                    label="Administración Mensual"
                    value={adminValue}
                    onChange={setAdminValue}
                  />
                </div>

                <div className="pt-1">
                  <label className="flex justify-between text-xs text-stone-400 mb-1">
                    <span>Plazo de Proyección</span>
                    <span className="text-white font-medium">{termYears} años</span>
                  </label>
                  <input 
                    type="range" min="5" max="30" step="1" value={termYears}
                    onChange={(e) => setTermYears(Number(e.target.value))}
                    className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-xs text-stone-400 mb-1">
                    <span>IPC (Crecimiento Arriendo)</span>
                    <span className="text-white font-medium">{ipcRate}%</span>
                  </label>
                  <input 
                    type="range" min="1" max="16" step="0.1" value={ipcRate}
                    onChange={(e) => setIpcRate(Number(e.target.value))}
                    className="w-full accent-brand-gold h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* ESTRATEGIA DE ABONOS ACELERADOS */}
                <div className={`mt-1 rounded-xl border ${modality === 'contado' ? 'bg-stone-950/50 border-stone-800/50 opacity-50' : 'bg-stone-900 border-stone-800'}`}>
                  <div 
                    className={`px-3 py-2 flex items-center justify-between transition-colors ${modality === 'contado' ? 'cursor-not-allowed' : 'cursor-pointer'} ${enableExtraPayments ? 'bg-stone-800/80 border-b border-stone-700' : 'hover:bg-stone-800/50'}`}
                    onClick={() => {
                      if (modality !== 'contado') {
                        setEnableExtraPayments(!enableExtraPayments);
                      }
                    }}
                  >
                    <h5 className="text-[11px] font-bold text-brand-gold uppercase tracking-wider flex items-center gap-2">
                      <span>⚡ Abonos Acelerados</span>
                    </h5>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${enableExtraPayments ? 'bg-brand-gold' : 'bg-stone-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${enableExtraPayments ? 'left-4.5 right-0.5' : 'left-0.5'}`}></div>
                    </div>
                  </div>
                  
                  {enableExtraPayments && modality !== 'contado' && (
                    <div className="p-3 space-y-2.5 animate-fade-in">
                      <CurrencyInput 
                        label="Abono Extra Mensual"
                        value={extraMonthlyPayment}
                        onChange={setExtraMonthlyPayment}
                      />
                      <CurrencyInput 
                        label="Abono Extra Anual (Primas)"
                        value={extraAnnualPayment}
                        onChange={setExtraAnnualPayment}
                      />
                      
                      <label className="flex items-start gap-2 cursor-pointer mt-2 group">
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={reinvestCashFlow} 
                            onChange={(e) => setReinvestCashFlow(e.target.checked)}
                            className="w-4 h-4 appearance-none border border-stone-600 rounded bg-stone-900 checked:bg-brand-gold checked:border-brand-gold transition-all"
                          />
                          {reinvestCashFlow && <svg className="w-3 h-3 absolute text-stone-900 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-[10px] text-stone-400 leading-tight group-hover:text-stone-300">
                          Reinvertir el 100% de la ganancia mensual (arriendo sobrante) al banco.
                        </span>
                      </label>
                    </div>
                  )}
                  {modality === 'contado' && (
                    <div className="p-3 text-[10px] text-stone-500">
                      Estrategia no disponible para compras de contado.
                    </div>
                  )}
                </div>




              </div>

              {/* ÁREA DEL GRÁFICO */}
              <div className="flex-1 p-4 lg:p-6 flex flex-col min-w-0 lg:overflow-y-auto">
                {/* 3 CAJAS RESUMEN TOP */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4 shrink-0">
                  <div className="bg-stone-900/80 p-3 lg:p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
                    {(() => {
                      const annualData = advancedStats.annualDataByYear[selectedYearIndex];
                      if (!annualData) return null;
                      
                      const finalCashFlow = annualData.flujo;

                      return (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] text-stone-500 uppercase tracking-widest leading-tight max-w-[60%]">Flujo Caja Anual</p>
                            <span className="bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded text-[9px] border border-brand-gold/20 font-medium whitespace-nowrap">AÑO {selectedYearIndex + 1}</span>
                          </div>
                          <p className={`text-2xl lg:text-3xl font-bold leading-none mb-3 ${finalCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {finalCashFlow >= 0 && finalCashFlow !== 0 ? '+' : ''}{formatCurrency(finalCashFlow)}
                          </p>
                          <div className="text-[9px] text-stone-400 grid grid-cols-1 gap-y-1 pt-2 border-t border-stone-800/50 mt-auto">
                             <div className="flex justify-between items-center">
                               <span className="flex items-center gap-1 cursor-help" title="Ingresos Anuales por Arriendo (Neto)">Arr: <Info className="w-[10px] h-[10px] text-stone-500" /></span> 
                               <span className="text-emerald-400">+{formatCurrency(annualData.ingreso)}</span>
                             </div>
                             {modality !== 'contado' && (
                               <div className="flex justify-between items-center">
                                 <span className="flex items-center gap-1 cursor-help" title="Cuota Fija Anual pagada al Banco">Cta: <Info className="w-[10px] h-[10px] text-stone-500" /></span> 
                                 <span className="text-red-400">-{formatCurrency(annualData.cuota)}</span>
                               </div>
                             )}
                             {annualData.abonos > 0 && (
                               <div className="flex justify-between items-center">
                                 <span className="flex items-center gap-1 cursor-help" title="Abonos a Capital Extra (Estrategia)">Abo: <Info className="w-[10px] h-[10px] text-stone-500" /></span> 
                                 <span className="text-amber-400">-{formatCurrency(annualData.abonos)}</span>
                               </div>
                             )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="bg-stone-900/80 p-3 lg:p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest leading-tight mb-2">Punto de Equilibrio</p>
                    <p className="text-2xl lg:text-3xl font-bold text-emerald-400 leading-none mb-3">
                      {advancedStats.breakEvenYear > 0 ? `Año ${advancedStats.breakEvenYear}` : advancedStats.breakEvenYear === -1 ? `> ${termYears} años` : 'Día 1'}
                    </p>
                    <div className="text-[9px] text-stone-500 pt-2 border-t border-stone-800/50 mt-auto">
                      {advancedStats.breakEvenYear === -1 ? `Ingreso no supera la cuota` : 'A partir de este año, ingreso supera cuota'}
                    </div>
                  </div>

                  {enableExtraPayments && modality !== 'contado' ? (
                    <div className="bg-emerald-900/20 p-3 lg:p-4 rounded-xl border border-emerald-900/50 flex flex-col justify-between animate-fade-in">
                      <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest leading-tight mb-2">Crédito Saldado En</p>
                      <p className="text-2xl lg:text-3xl font-bold text-emerald-400 leading-none mb-3">
                        {advancedStats.payoffYears} Años
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t border-emerald-900/30 mt-auto">
                        <span className="text-[9px] text-emerald-500/70 uppercase tracking-widest">Ahorro Int.</span>
                        <span className="text-[11px] lg:text-sm font-bold text-emerald-400 leading-none">
                          {formatCurrency(advancedStats.interestSaved)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-950/50 p-3 lg:p-4 rounded-xl border border-stone-800/50 flex flex-col justify-center items-center opacity-70">
                      <p className="text-[10px] text-stone-500 text-center leading-relaxed">Activa <span className="text-brand-gold">Abonos Acelerados</span> en el panel lateral para ver ahorro de intereses</p>
                    </div>
                  )}
                </div>

                <div className="h-[350px] lg:h-[400px] w-full min-w-[300px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={advancedStats.data} 
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      onClick={(e) => {
                        if (e && e.activeTooltipIndex !== undefined) {
                          setSelectedYearIndex(Number(e.activeTooltipIndex));
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                      <XAxis dataKey="year" stroke="#78716c" tick={{fontSize: 10}} />
                      <YAxis 
                        yAxisId="left" 
                        stroke="#78716c" 
                        tick={{fontSize: 10}} 
                        tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} 
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#fbbf24" 
                        tick={{fontSize: 10}} 
                        tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} 
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} cursor={{fill: '#292524', opacity: 0.4}} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                      <Bar yAxisId="left" dataKey="CuotaMensual" name="Cuota Mensual (Fija)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar yAxisId="left" dataKey="IngresoNeto" name="Ingreso Neto Mensual" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Line yAxisId="right" type="monotone" dataKey="FlujoCaja" name="Flujo de Caja Mensual (Excedente)" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4, fill: '#1c1917', stroke: '#fbbf24', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {selectedYearIndex !== null && advancedStats.monthlyDataByYear[selectedYearIndex] && (
                  <div className="mt-4 bg-stone-900/50 p-4 rounded-xl border border-stone-800 animate-fade-in">
                    <h4 className="text-brand-gold font-semibold mb-3 text-sm flex items-center justify-between">
                      <div className="flex flex-col">
                        <span>Detalle Mensual: Año {selectedYearIndex + 1}</span>
                        <span className="text-[10px] font-normal text-stone-500 hidden sm:block">Haz clic en los círculos de la gráfica para cambiar de año</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedYearIndex(Math.max(0, selectedYearIndex - 1))}
                          disabled={selectedYearIndex === 0}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          &lt;
                        </button>
                        <span className="text-[10px] text-stone-500 min-w-[60px] text-center">AÑO {selectedYearIndex + 1}</span>
                        <button 
                          onClick={() => setSelectedYearIndex(Math.min(termYears - 1, selectedYearIndex + 1))}
                          disabled={selectedYearIndex === termYears - 1}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          &gt;
                        </button>
                      </div>
                    </h4>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {advancedStats.monthlyDataByYear[selectedYearIndex].map((monthData, idx) => (
                        <div key={idx} className={`p-2 rounded-lg border flex flex-col justify-center items-center text-center ${monthData.flujo >= 0 ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-stone-950 border-stone-800'}`}>
                          <span className="text-[9px] text-stone-500 uppercase tracking-widest mb-1 border-b border-stone-800/50 pb-1 w-full">Mes {monthData.month}</span>
                          <span className={`text-xs font-bold ${monthData.flujo >= 0 ? 'text-emerald-400' : 'text-red-400'} mb-1`}>
                            {monthData.flujo >= 0 && monthData.flujo !== 0 ? '+' : ''}{formatCurrency(monthData.flujo)}
                          </span>
                          {modality !== 'contado' && (
                            <div className="w-full flex flex-col gap-0.5 text-[8px] text-stone-500 pt-1 border-t border-stone-800/50">
                              <div className="flex justify-between w-full"><span>Cap:</span> <span className="text-stone-300">{formatCurrency(monthData.capital)}</span></div>
                              <div className="flex justify-between w-full"><span>Int:</span> <span className="text-stone-300">{formatCurrency(monthData.interes)}</span></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                


                <div className="mt-4 bg-stone-950 p-4 rounded-xl border border-stone-800 text-sm text-stone-300 leading-relaxed">
                  <strong className="text-brand-gold">Conclusión:</strong> El gráfico demuestra que aunque inicialmente la cuota del banco (barra roja) pueda superar los ingresos (barra verde), gracias a la inflación (IPC), el arriendo crece año tras año. La línea amarilla (Flujo de Caja) marca exactamente en qué punto se cruzan. {advancedStats.breakEvenYear > 0 ? `Para esta inversión, el punto de equilibrio donde el inmueble se paga 100% solo y te empieza a dejar ganancias netas mensuales es en el ${advancedStats.breakEvenYear === 1 ? 'Año 1' : 'Año ' + advancedStats.breakEvenYear}.` : advancedStats.breakEvenYear === -1 ? `Para esta inversión, el punto de equilibrio no se alcanza en los primeros ${termYears} años proyectados. Puedes aumentar el plazo de proyección o el IPC para ver en qué año sucede.` : 'Al comprar de contado, tu flujo de caja es positivo desde el día 1.'}
                </div>

                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-stone-950/50 p-4 rounded-xl border border-stone-800/50 text-[10px]">
                  <div>
                    <strong className="text-emerald-400 block mb-1">Barra Verde (Ingreso)</strong>
                    <span className="text-stone-400 leading-snug block">Arriendo cobrado <span className="underline decoration-stone-600 underline-offset-2">menos</span> gastos.</span>
                  </div>
                  <div>
                    <strong className="text-red-400 block mb-1">Barra Roja (Cuota)</strong>
                    <span className="text-stone-400 leading-snug block">Pago mensual al banco. Fijo en el tiempo.</span>
                  </div>
                  <div>
                    <strong className="text-brand-gold block mb-1">Línea Amarilla (Flujo)</strong>
                    <span className="text-stone-400 leading-snug block">Diferencia entre ingreso y cuota al mes.</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-stone-400"><strong className="text-stone-300">Eje Izq. (Gris):</strong> Escala para barras.</p>
                    <p className="text-stone-400"><strong className="text-brand-gold">Eje Der. (Oro):</strong> Escala flujo de caja.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
