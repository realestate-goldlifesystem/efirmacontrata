/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { 
  CheckCircle2, Send, Mail, User, ShieldCheck, 
  ArrowLeft, ArrowRight, Calculator, MapPin, 
  Building2, Check, Info, DollarSign, Briefcase, Percent 
} from 'lucide-react';
import { numberToWordsSpanish } from '../lib/numberToWords';
import CountryMap from './CountryMap';

const COUNTRIES = [
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', prefix: '+57', maxLength: 10, placeholder: '300 123 4567', regex: /^3\d{9}$/ },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', prefix: '+58', maxLength: 10, placeholder: '412 123 4567', regex: /^4\d{9}$/ },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', prefix: '+593', maxLength: 9, placeholder: '912 345 678', regex: /^9\d{8}$/ }
];

const UPZ_BARRIOS: Record<string, string[]> = {
  'LOS CEDROS': ["CEDRITOS", "LOS CEDROS", "BELMIRA", "EL CONTADOR", "LISBOA", "ACACIAS", "ANTIGUA", "CEDRO GOLF"],
  'USAQUEN': ["USAQUEN", "BELLA SUIZA", "BELLAVISTA", "BOSQUE MEDINA", "SANTA BARBARA ALTA", "EL PEDREGAL"],
  'COUNTRY CLUB': ["COUNTRY CLUB", "LA CALLEJA", "LA CAROLINA", "PRADOS DEL COUNTRY", "TORRES DEL COUNTRY"],
  'SANTA BARBARA': ["SANTA BARBARA", "RINCON DEL CHICO", "SAN PATRICIO", "SANTA BIBIANA", "MULTICENTRO"],
  'SAN CRISTOBAL NORTE': ["SAN CRISTOBAL NORTE", "BARRANCAS", "ALTABLANCA", "PRADERA NORTE", "CERRO NORTE"],
  'TOBERIN': ["EL TOBERIN", "ESTRELLA DEL NORTE", "VILLA MAGDALA", "ORQUÍDEAS", "BABILONIA"],
  'VERBENAL': ["EL VERBENAL", "LIJACÁ", "SAN ANTONIO NORTE", "BUENAVISTA", "MATURIN"],
  'LA URIBE': ["LA URIBE", "EL REDIL", "SAN JUAN BOSCO", "LA CITA", "BOSQUE DE SAN ANTONIO"],
  'PASEO DE LOS LIBERTADORES': ["CANAIMA", "LA FLORESTA DE LA SABANA", "TORCA"]
};

interface RegisterPropertyFormProps {
  selectedServiceType: 'corretaje' | 'administracion' | 'venta' | null;
  initialCalculatorState?: {
    rentPrice: number;
    isMultiProperty: boolean;
    includesHoa: boolean;
    hoaPrice: number;
    isUpsellActive: boolean;
  } | null;
  onBack?: () => void;
}

export default function RegisterPropertyForm({ selectedServiceType, initialCalculatorState, onBack }: RegisterPropertyFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State containing exact variables requested by the JSON Form
  const [formData, setFormData] = useState({
    // Step 1: Destino y Ubicación
    registrationDate: new Date().toISOString().split('T')[0],
    destination: 'Vivienda', // Vivienda, Comercio, Mixto
    localidad: 'Usaquén',
    upz: 'LOS CEDROS',
    barrio: 'CEDRITOS',
    customBarrio: '',
    address: '',
    city: 'Bogotá',

    // Step 2: Detalles Físicos y Dimensiones
    propertyType: 'Apartamento', // Apartamento, Apartaestudio, Casa, Local etc.
    area: '',
    roomsCount: '1',
    bedPrincipal: '',
    bedSecondary: '',
    bedTertiary: '',
    bedQuaternary: '',
    bedQuinary: '',
    bathroomsCount: '1',
    estrato: '4',
    propertyAge: '',
    floorNumber: '',
    commonAreas: '',
    fridgeAncho: '0.60', fridgeLargo: '0.70', fridgeAlto: '1.80', 
    fridgeWaterPoint: 'NO',
    washingAncho: '0.69', washingLargo: '0.66', washingAlto: '1.13',
    washingGasPoint: 'NO',

    // Step 3: Identificación y Garajes
    idTypeDescription: 'Número', // Número, Torre y número
    towerLetter: '',
    propertyNumber: '',
    garagesCount: 'Ningun', // 1, 2, 3, 4, 5, Comunal, Ningun
    garageServitude: 'Independiente',
    garageCovered: 'Cubierto',
    garageAssignedNumber: '',
    hasDeposit: 'Ninguno', // Deposito, Ninguno
    depositNumber: '',
    internalFeatures: [] as string[],
    externalFeatures: [] as string[],
    otherInternal: '',
    otherExternal: '',
    sectorZoneType: 'Residencial',
    sectorWayType: 'Secundaria',
    propertyDesign: 'Convencional',
    additionalDescription: '',

    // Step 4: Datos Propietario (Confirmaciones avanzadas integradas)
    name: '',
    documentType: 'CC',
    documentNumber: '',
    confirmDocumentNumber: '',
    countryCode: 'CO',
    phone: '',
    confirmPhone: '',
    documentCityOfExpedition: '',
    documentCountryOfExpedition: 'Colombia',
    email: '',
    confirmEmail: '',

    // Step 5: Cláusulas y Porcentajes de Negocio
    serviceType: (selectedServiceType || 'administracion') as 'administracion' | 'corretaje' | 'venta' | 'vendi-renta' | 'admi-venta',
    clausesAccepted: false,
    
    // Percentages & Choices
    corretajePercent: '100', // % de corretaje arriendo
    corretajeCollectsFirstMonthOnly: 'Si',
    adminPercentSelector: '8.5% desde el primer mes', // or 9.1%
    salesCommissionSelector: '3%', // or 2.5%, 2%, 1.5%
    admiVentaAdminPercentSelector: '8.5% desde el primer mes',
    admiVentaSalesCommissionSelector: '3%',
    vendiRentaArriendoPercent: '100',
    vendiRentaCollectsFirstMonthOnly: 'Si',

    isMultiProperty: initialCalculatorState?.isMultiProperty || false,
    isUpsellActive: initialCalculatorState?.isUpsellActive || false,
    hasNoEmbargo: false,

    // Step 6: Precios y Autorizaciones Portería
    priceVenta: selectedServiceType === 'venta' && initialCalculatorState?.rentPrice ? initialCalculatorState.rentPrice.toString() : '450000000',
    priceGeneral: initialCalculatorState?.rentPrice ? initialCalculatorState.rentPrice.toString() : '1800000', // Rent + HOA or just rent
    priceHoaPlena: initialCalculatorState?.hoaPrice ? initialCalculatorState.hoaPrice.toString() : '350000',
    hasPorteriaAndAdmin: 'SI', // SI, NO
    porteriaBuildingName: '',
    porteriaAutoSendEmail: 'SI',
    porteriaAdminEmail: '',
    porteriaAuthType: 'GENERAL', // GENERAL, ADMINISTRACION
    porteriaAuthAgentGeneral: 'El cual recoge las llaves en portería y después de la visita las deja nuevamente allí',
    porteriaAuthAgentAdmin: 'Siendo el nuevo ADMINISTRADOR, el cual recoge las llaves en portería'
  });

  // Sync prop changes and initial values
  useEffect(() => {
    if (selectedServiceType) {
      setFormData(prev => ({ 
        ...prev, 
        serviceType: selectedServiceType as any,
        priceGeneral: initialCalculatorState?.rentPrice ? initialCalculatorState.rentPrice.toString() : prev.priceGeneral,
        priceHoaPlena: initialCalculatorState?.hoaPrice ? initialCalculatorState.hoaPrice.toString() : prev.priceHoaPlena,
        isMultiProperty: initialCalculatorState?.isMultiProperty || prev.isMultiProperty,
        isUpsellActive: initialCalculatorState?.isUpsellActive || prev.isUpsellActive
      }));
    }
  }, [selectedServiceType, initialCalculatorState]);

  const parseNum = (val: string): number => {
    const clean = val.replace(/[^0-9]/g, '');
    return clean ? parseInt(clean, 10) : 0;
  };

  const FORMAT_COP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getEmailDomainWarning = (emailStr: string): string | null => {
    if (!emailStr || !emailStr.includes('@')) return null;
    const domain = emailStr.split('@')[1]?.toLowerCase().trim();
    if (['gamil.com', 'gamil.co', 'gamail.com'].includes(domain)) return '¿Quisiste decir gmail.com?';
    if (['hotamil.com', 'hotmial.com'].includes(domain)) return '¿Quisiste decir hotmail.com?';
    if (['outlok.com', 'outllok.com'].includes(domain)) return '¿Quisiste decir outlook.com?';
    return null;
  };

  const isPhoneValid = (phoneStr: string, code: string): boolean => {
    const digits = phoneStr.replace(/\D/g, '');
    const config = COUNTRIES.find(c => c.code === code);
    return config ? config.regex.test(digits) : false;
  };

  // Interactive computed variables for the Dynamic Live Calculator panel
  const includesHoa = formData.serviceType !== 'venta';
  const priceGeneralVal = parseNum(formData.priceGeneral);
  const priceHoaVal = includesHoa ? parseNum(formData.priceHoaPlena) : 0;
  
  // Real Rent is General Rent minus HOA if HOA is paid separately
  const baseCanon = includesHoa ? Math.max(0, priceGeneralVal - priceHoaVal) : priceGeneralVal;
  const policyCost = priceGeneralVal * 0.50; // 50% of total arriendo (canon + administration)

  // Calcs by business type
  const isMulti = formData.isMultiProperty;
  const adminPercent = formData.serviceType === 'admi-venta' 
    ? (formData.admiVentaAdminPercentSelector.includes('8.5') ? 8.5 : 9.1)
    : (formData.adminPercentSelector.includes('8.5') ? 8.5 : 9.1);
  const finalAdminPercent = isMulti ? 8.0 : adminPercent;
  const adminMonthlyFee = (baseCanon * finalAdminPercent) / 100;
  const adminNetProceeds = (baseCanon - adminMonthlyFee) + priceHoaVal;

  const corretajeDiscountPercent = isMulti ? 40 : 32;
  const baseCorretajeFee = baseCanon * (parseNum(formData.corretajePercent || '100') / 100);
  const corretajeFee = formData.isUpsellActive 
    ? baseCorretajeFee * (1 - corretajeDiscountPercent / 100) 
    : baseCorretajeFee;

  const sellPriceVal = parseNum(formData.priceVenta);
  const sellPercentStr = formData.serviceType === 'admi-venta' 
    ? formData.admiVentaSalesCommissionSelector 
    : formData.salesCommissionSelector;
  const sellCommissionPercent = parseFloat(sellPercentStr.replace('%', ''));
  const sellCommissionFee = (sellPriceVal * sellCommissionPercent) / 100;

  // Step Navigations
  const canGoToNext = () => {
    if (currentStep === 1) {
      return formData.address.trim() !== '' && formData.city.trim() !== '';
    }
    if (currentStep === 2) {
      return formData.area.trim() !== '' && formData.propertyAge.trim() !== '';
    }
    if (currentStep === 3) {
      return formData.propertyNumber.trim() !== '';
    }
    if (currentStep === 4) {
      return formData.name.trim() !== '' && 
             formData.documentNumber === formData.confirmDocumentNumber &&
             isPhoneValid(formData.phone, formData.countryCode) && 
             formData.phone === formData.confirmPhone &&
             formData.email.toLowerCase() === formData.confirmEmail.toLowerCase();
    }
    if (currentStep === 5) {
      return formData.clausesAccepted;
    }
    return true;
  };

  const handleNextStep = () => {
    if (canGoToNext()) setCurrentStep(p => Math.min(6, p + 1));
  };
  const handlePrevStep = () => setCurrentStep(p => Math.max(1, p - 1));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.hasNoEmbargo) {
      alert("Debes confirmar por favor que la propiedad está libre de embargos.");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        accion: 'registrarInmueble',
        "Fecha de registro del inmueble.": formData.registrationDate,
        "Define el propósito de tu inmueble": formData.destination,
        "Selecciona la localidad del inmueble": formData.localidad,
        "Selecciona la UPZ  de tu inmueble": formData.upz,
        "BARRIO DEL INMUEBLE": formData.barrio === 'Otro' ? formData.customBarrio : formData.barrio,
        "Ingrese la Dirección del inmueble": formData.address,
        "Ingrese la Ciudad del inmueble": formData.city,
        "Selecciona el tipo de inmueble": formData.propertyType,
        "Area  M²": formData.area,
        "N° de Habitaciones": formData.roomsCount,
        "Habitación principal": formData.bedPrincipal,
        "Habitación secundaria": formData.bedSecondary,
        "Habitación terciaria": formData.bedTertiary,
        "Habitación cuaternaria": formData.bedQuaternary,
        "Habitación quinaria": formData.bedQuinary,
        "N° de Baños": formData.bathroomsCount,
        "¿Cual es el estrato?": formData.estrato,
        "Antiguedad en Años": formData.propertyAge,
        "N° de Parqueaderos": formData.garagesCount,
        "¿Tiene deposito?": formData.hasDeposit,
        "ZONAS COMUNES DEL INMUEBLE": formData.commonAreas,
        "IDENTIFICACIÓN DEL INMUEBLE": formData.idTypeDescription,
        "N° o Letra de la Torre": formData.towerLetter,
        "N° de inmueble": formData.propertyNumber,
        "Ingrese Nombres y Apellidos": formData.name,
        "Tipo de documento": formData.documentType,
        "Número de documento": formData.documentNumber,
        "Celular": formData.phone,
        "Correo electrónico": formData.email,
        "TIPO DE NEGOCIO": formData.serviceType === 'administracion' ? 'Administración' : formData.serviceType === 'corretaje' ? 'Corretaje' : formData.serviceType === 'venta' ? 'Venta' : formData.serviceType === 'admi-venta' ? 'Admi-Venta' : 'Vendi-Renta'
      };

      const response = await fetch('https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert("Error al registrar: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error de conexión con el sistema. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppSubmitLink = () => {
    const textMsg = `Hola Gold Life Real Estate, completé el registro inteligente de mi propiedad:

👤 Propietario: ${formData.name}
🪪 ID: ${formData.documentType} N° ${formData.documentNumber} (Expedida en ${formData.documentCityOfExpedition})
📞 Celular: ${formData.phone}
✉️ Correo: ${formData.email}
📍 Dirección: ${formData.address}, ${formData.city} (UPZ: ${formData.upz}, Barrio: ${formData.barrio})
🏡 Tipo: ${formData.propertyType} (${formData.area}m², ${formData.roomsCount} Hab, ${formData.bathroomsCount} Baños, Estrato ${formData.estrato})
💰 Avalúo: ${formData.serviceType === 'venta' ? FORMAT_COP(sellPriceVal) : FORMAT_COP(priceGeneralVal)}
⚙️ Modelo Negocio: ${formData.serviceType.toUpperCase()}
🔒 Garantía sin Embargos: Sí, Confirmado.

Por favor, revisemos este registro para la firma del acuerdo oficial.`;
    return `https://wa.me/573000000000?text=${encodeURIComponent(textMsg)}`;
  };

  return (
    <section id="registro" className="min-h-screen py-10 bg-stone-50 text-stone-800 relative">
      <div className="absolute top-10 left-10 w-80 h-80 bg-brand-gold/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#8A631F]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Superior Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 pb-4 border-b border-stone-200 gap-4">
          <div className="text-left">
            <span className="text-xs uppercase font-mono tracking-widest text-[#8A631F] font-bold block">Gold Life Real Estate</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1 font-sans">
              Registro de Inmuebles Digital
            </h2>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center space-x-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-brand-gold-dark" />
              <span>Volver</span>
            </button>
          )}
        </div>

        {/* Progress gamification bar */}
        {!submitted && (
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-6 gap-2 text-[10px] sm:text-xs font-mono text-stone-500 mb-2 text-center">
              {['1. Ubicación', '2. Físico', '3. Datos Extra', '4. Propietario', '5. Negocio', '6. Precios'].map((label, idx) => (
                <span key={idx} className={`font-semibold transition-all ${currentStep === idx + 1 ? 'text-[#8A631F]' : ''}`}>
                  {label}
                </span>
              ))}
            </div>
            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-brand-gold to-brand-gold-dark h-full transition-all duration-300" 
                style={{ width: `${(currentStep / 6) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Master Row Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT COLUMN: Dynamic Interactive Cost and Yield Calculator Sheet */}
          <div className="lg:col-span-4 bg-stone-900 text-stone-200 rounded-2xl p-6 flex flex-col justify-between border border-stone-800 shadow-xl relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-gold to-brand-gold-dark" />
            
            {/* Real-time simulations adapt instantly to active variables and inputs */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-stone-800">
                <Calculator className="w-5 h-5 text-brand-gold" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-white font-sans">
                  Simulación de Rendimientos
                </h3>
              </div>

              {/* Dynamic calculations display depending on serviceType */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#B5945B]">MODELO DE NEGOCIO ACTIVO</span>
                  <p className="text-xs font-bold text-white capitalize flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Gold {formData.serviceType.toUpperCase()}</span>
                  </p>
                </div>

                <div className="bg-stone-800/60 p-3 rounded-lg border border-stone-800 space-y-2 text-xs">
                  {formData.serviceType !== 'venta' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Arriendo Mensual:</span>
                        <strong className="text-stone-200 font-mono">{FORMAT_COP(priceGeneralVal)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Cuota Administración (HOA):</span>
                        <strong className="text-stone-200 font-mono">-{FORMAT_COP(priceHoaVal)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-stone-800 pt-1 text-[#B5945B]">
                        <span>Canon Neto:</span>
                        <strong className="font-mono">{FORMAT_COP(baseCanon)}</strong>
                      </div>
                    </>
                  )}

                  {formData.serviceType === 'venta' && (
                    <div className="flex justify-between text-[#B5945B]">
                      <span>Estimado de Venta:</span>
                      <strong className="font-mono">{FORMAT_COP(sellPriceVal)}</strong>
                    </div>
                  )}
                </div>

                {/* Specific returns projections */}
                <div className="p-3 bg-stone-850 border border-stone-800 rounded-lg space-y-2">
                  <span className="text-[11px] uppercase font-mono text-stone-400 tracking-wider">RETORNO LÍQUIDO SIMULADO</span>
                  
                  {formData.serviceType === 'administracion' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Comisión ({finalAdminPercent}%):</span>
                        <span className="text-rose-400 font-mono">-{FORMAT_COP(adminMonthlyFee)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-stone-800 pt-2">
                        <span>Mensual Neto:</span>
                        <span className="font-mono">{FORMAT_COP(adminNetProceeds)}</span>
                      </div>
                    </div>
                  )}

                  {formData.serviceType === 'corretaje' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Tarifa Corretaje ({formData.corretajePercent}%):</span>
                        <span className="text-rose-450 font-mono">-{FORMAT_COP(corretajeFee)}</span>
                      </div>
                      {formData.isUpsellActive && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Ahorro aplicado ({corretajeDiscountPercent}%):</span>
                          <span>✓ Activo</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-stone-800 pt-2">
                        <span>Ingreso Libre inicial:</span>
                        <span className="font-mono">{FORMAT_COP(baseCanon - corretajeFee)}</span>
                      </div>
                    </div>
                  )}

                  {formData.serviceType === 'venta' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between animate-fade-in">
                        <span>Comisión de Venta ({sellCommissionPercent}%):</span>
                        <span className="text-rose-400 font-mono">-{FORMAT_COP(sellCommissionFee)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-stone-800 pt-2">
                        <span>Procedencia Líquida:</span>
                        <span className="font-mono">{FORMAT_COP(sellPriceVal - sellCommissionFee)}</span>
                      </div>
                    </div>
                  )}

                  {formData.serviceType === 'admi-venta' && (
                    <div className="space-y-2 text-xs animate-fade-in">
                      <div className="p-2 bg-stone-800 rounded space-y-1">
                        <div className="flex justify-between text-emerald-400">
                          <span>Renta Mensual Neta:</span>
                          <strong>{FORMAT_COP(adminNetProceeds)}</strong>
                        </div>
                        <div className="flex justify-between text-brand-gold">
                          <span>Firma Venta ({sellCommissionPercent}%):</span>
                          <strong>-{FORMAT_COP(sellCommissionFee)}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.serviceType === 'vendi-renta' && (
                    <div className="space-y-2 text-xs animate-fade-in">
                      <div className="p-2 bg-stone-800 rounded space-y-1">
                        <div className="flex justify-between text-emerald-400">
                          <span>Arriendo neto:</span>
                          <strong>{FORMAT_COP(baseCanon - corretajeFee)}</strong>
                        </div>
                        <div className="flex justify-between text-brand-gold">
                          <span>Firma de Venta ({sellCommissionPercent}%):</span>
                          <strong>-{FORMAT_COP(sellCommissionFee)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Country Map integration */}
                <div className="pt-2 border-t border-stone-805/70 flex flex-col items-center">
                  <span className="text-[9px] text-stone-400 font-mono tracking-widest block mb-1">FOCO GEOGRÁFICO DE REGISTRO</span>
                  <div className="w-full max-h-[140px] flex items-center justify-center">
                    <CountryMap countryCode={formData.countryCode as any} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-800 mt-6 flex items-center justify-between text-[10px] text-stone-500 font-mono">
              <span>🛡️ GOLD LIFE COBERTURA 100%</span>
              <span>BOGOTÁ</span>
            </div>
          </div>

          {/* RIGHT COLUMN: The 6-Step Registration Wizard Form */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 flex flex-col justify-between shadow-sm text-left">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  
                  {/* STEP 1: Destinación y Ubicación */}
                  {currentStep === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">1</span>
                        Destinación y Ubicación del Inmueble
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">FECHA DE REGISTRO</label>
                          <input 
                            type="date" required value={formData.registrationDate}
                            onChange={e => setFormData({ ...formData, registrationDate: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">PROPÓSITO (DESTINACIÓN)</label>
                          <select 
                            value={formData.destination} 
                            onChange={e => setFormData({ ...formData, destination: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                          >
                            <option value="Vivienda">Vivienda</option>
                            <option value="Comercio">Comercio</option>
                            <option value="Mixto">Mixto</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">LOCALIDAD</label>
                          <select 
                            value={formData.localidad}
                            onChange={e => setFormData({ ...formData, localidad: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                          >
                            <option value="Usaquén">Usaquén</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">UPZ DE USAQUÉN</label>
                          <select 
                            value={formData.upz}
                            onChange={e => setFormData({ ...formData, upz: e.target.value, barrio: UPZ_BARRIOS[e.target.value][0] })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                          >
                            {Object.keys(UPZ_BARRIOS).map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">BARRIO</label>
                          <select 
                            value={formData.barrio}
                            onChange={e => setFormData({ ...formData, barrio: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                          >
                            {UPZ_BARRIOS[formData.upz]?.map(b => <option key={b} value={b}>{b}</option>)}
                            <option value="Otro">Otro (Escribir abajo)</option>
                          </select>
                        </div>
                      </div>

                      {formData.barrio === 'Otro' && (
                        <div className="animate-fade-in">
                          <label className="text-xs text-stone-600 font-bold block mb-1">ESCRIBA EL BARRIO DEL INMUEBLE</label>
                          <input 
                            type="text" required value={formData.customBarrio}
                            onChange={e => setFormData({ ...formData, customBarrio: e.target.value })}
                            placeholder="Escribe el nombre del barrio"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-mono"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">DIRECCIÓN DEL INMUEBLE</label>
                          <input 
                            type="text" required value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Calle 123 N° 45-67 Apto 101"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">CIUDAD DEL INMUEBLE</label>
                          <input 
                            type="text" required value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Detalles Físicos y Dimensiones */}
                  {currentStep === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">2</span>
                        Características Físicas e Internas
                      </h4>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] text-stone-500 font-bold block mb-0.5">TIPO DE INMUEBLE</label>
                          <select 
                            value={formData.propertyType} 
                            onChange={e => setFormData({ ...formData, propertyType: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs"
                          >
                            {["Apartamento", "Apartaestudio", "Casa", "Local", "Oficina", "Bodega", "Lote", "Edificio"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 font-bold block mb-0.5">ÁREA M²</label>
                          <input 
                            type="number" required value={formData.area} 
                            onChange={e => setFormData({ ...formData, area: e.target.value })}
                            placeholder="M² de área" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 font-bold block mb-0.5">N° HABITACIONES</label>
                          <select 
                            value={formData.roomsCount} 
                            onChange={e => setFormData({ ...formData, roomsCount: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs"
                          >
                            {["1", "2", "3", "4", "5"].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 font-bold block mb-0.5">N° BAÑOS</label>
                          <select 
                            value={formData.bathroomsCount} 
                            onChange={e => setFormData({ ...formData, bathroomsCount: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs"
                          >
                            {["1", "2", "3", "4", "5", "6", "7", "8"].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Room Bed selection based on rooms count */}
                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                        <span className="text-xs font-bold text-stone-700 block">DORMITORIOS Y CAMAS ASIGNADAS (DIMENSIONES)</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] font-mono text-[#8A631F] block">HABITACIÓN PRINCIPAL</span>
                            <select 
                              value={formData.bedPrincipal} 
                              onChange={e => setFormData({ ...formData, bedPrincipal: e.target.value })}
                              className="w-full bg-white border border-stone-250 rounded-lg p-2 text-[11px]"
                            >
                              <option value="">Selecciona cama...</option>
                              <option value="Doble">Cama doble + Mesas (2.55 m)</option>
                              <option value="Queen">Cama queen + Mesas (2.70 m)</option>
                              <option value="King">Cama king + Mesas (3.20 m)</option>
                              <option value="Super King">Cama súper king + Mesas (3.40 m)</option>
                            </select>
                          </div>
                          {parseInt(formData.roomsCount) >= 2 && (
                            <div className="animate-fade-in">
                              <span className="text-[10px] font-mono text-[#8A631F] block">HABITACIÓN SECUNDARIA</span>
                              <select 
                                value={formData.bedSecondary} 
                                onChange={e => setFormData({ ...formData, bedSecondary: e.target.value })}
                                className="w-full bg-white border border-stone-250 rounded-lg p-2 text-[11px]"
                              >
                                <option value="">Selecciona cama...</option>
                                <option value="Sencilla">Cama individual (2.10 m)</option>
                                <option value="Semidoble">Cama semidoble (2.40 m)</option>
                                <option value="Doble">Cama doble (2.55 m)</option>
                              </select>
                            </div>
                          )}
                          {parseInt(formData.roomsCount) >= 3 && (
                            <div className="animate-fade-in">
                              <span className="text-[10px] font-mono text-[#8A631F] block">HABITACIÓN TERCIARIA</span>
                              <select 
                                value={formData.bedTertiary} 
                                onChange={e => setFormData({ ...formData, bedTertiary: e.target.value })}
                                className="w-full bg-white border border-stone-250 rounded-lg p-2 text-[11px]"
                              >
                                <option value="">Selecciona cama...</option>
                                <option value="Sencilla">Cama individual (2.10 m)</option>
                                <option value="Semidoble">Cama semidoble (2.40 m)</option>
                                <option value="Doble">Cama doble (2.55 m)</option>
                              </select>
                            </div>
                          )}
                          {parseInt(formData.roomsCount) >= 4 && (
                            <div className="animate-fade-in">
                              <span className="text-[10px] font-mono text-[#8A631F] block">HABITACIÓN CUATERNARIA</span>
                              <select 
                                value={formData.bedQuaternary} 
                                onChange={e => setFormData({ ...formData, bedQuaternary: e.target.value })}
                                className="w-full bg-white border border-stone-250 rounded-lg p-2 text-[11px]"
                              >
                                <option value="">Selecciona cama...</option>
                                <option value="Sencilla">Cama individual (2.10 m)</option>
                                <option value="Semidoble">Cama semidoble (2.40 m)</option>
                                <option value="Doble">Cama doble (2.55 m)</option>
                              </select>
                            </div>
                          )}
                          {parseInt(formData.roomsCount) >= 5 && (
                            <div className="animate-fade-in">
                              <span className="text-[10px] font-mono text-[#8A631F] block">HABITACIÓN QUINARIA</span>
                              <select 
                                value={formData.bedQuinary} 
                                onChange={e => setFormData({ ...formData, bedQuinary: e.target.value })}
                                className="w-full bg-white border border-stone-250 rounded-lg p-2 text-[11px]"
                              >
                                <option value="">Selecciona cama...</option>
                                <option value="Sencilla">Cama individual (2.10 m)</option>
                                <option value="Semidoble">Cama semidoble (2.40 m)</option>
                                <option value="Doble">Cama doble (2.55 m)</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-stone-500 font-bold block mb-0.5">ESTRATO (1-7)</label>
                          <select 
                            value={formData.estrato} 
                            onChange={e => setFormData({ ...formData, estrato: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs"
                          >
                            {["1", "2", "3", "4", "5", "6", "7"].map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 font-bold block mb-0.5">ANTIGÜEDAD (AÑOS)</label>
                          <input 
                            type="text" required value={formData.propertyAge} 
                            onChange={e => setFormData({ ...formData, propertyAge: e.target.value })}
                            placeholder="Años" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 font-bold block mb-0.5">N° DE PISO</label>
                          <input 
                            type="text" required value={formData.floorNumber} 
                            onChange={e => setFormData({ ...formData, floorNumber: e.target.value })}
                            placeholder="Piso" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs"
                          />
                        </div>
                      </div>

                      {/* Space dimensions widget with error-prevention checks */}
                      <div className="bg-amber-500/5 p-3 rounded-xl border border-brand-gold/25 space-y-3">
                        <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-[#8A631F]" /> MEDIDAS EXACTAS DE ELECTRODOMÉSTICOS
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-700">
                          <div className="space-y-1">
                            <span className="font-bold">Espacio de Nevera:</span>
                            <div className="grid grid-cols-3 gap-1">
                              <input 
                                type="number" step="0.01" value={formData.fridgeAncho} 
                                onChange={e => setFormData({ ...formData, fridgeAncho: e.target.value })}
                                className="bg-white border rounded p-1 text-center" placeholder="A (m)"
                              />
                              <input 
                                type="number" step="0.01" value={formData.fridgeLargo} 
                                onChange={e => setFormData({ ...formData, fridgeLargo: e.target.value })}
                                className="bg-white border rounded p-1 text-center" placeholder="L (m)"
                              />
                              <input 
                                type="number" step="0.01" value={formData.fridgeAlto} 
                                onChange={e => setFormData({ ...formData, fridgeAlto: e.target.value })}
                                className="bg-white border rounded p-1 text-center" placeholder="AL (m)"
                              />
                            </div>
                            <div className="text-[10px] font-mono text-stone-500 p-1 bg-stone-100 rounded border mt-1">
                              Fto: A: {Number(formData.fridgeAncho).toFixed(2)}m x L: {Number(formData.fridgeLargo).toFixed(2)}m x AL: {Number(formData.fridgeAlto).toFixed(2)}m
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <span>¿Punto de agua?</span>
                              {["SI", "NO"].map(opt => (
                                <button 
                                  key={opt} type="button" 
                                  onClick={() => setFormData({ ...formData, fridgeWaterPoint: opt })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${formData.fridgeWaterPoint === opt ? 'bg-stone-900 text-brand-gold' : 'bg-stone-200'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="font-bold">Espacio de Lavadora:</span>
                            <div className="grid grid-cols-3 gap-1">
                              <input 
                                type="number" step="0.01" value={formData.washingAncho} 
                                onChange={e => setFormData({ ...formData, washingAncho: e.target.value })}
                                className="bg-white border rounded p-1 text-center" placeholder="A (m)"
                              />
                              <input 
                                type="number" step="0.01" value={formData.washingLargo} 
                                onChange={e => setFormData({ ...formData, washingLargo: e.target.value })}
                                className="bg-white border rounded p-1 text-center" placeholder="L (m)"
                              />
                              <input 
                                type="number" step="0.01" value={formData.washingAlto} 
                                onChange={e => setFormData({ ...formData, washingAlto: e.target.value })}
                                className="bg-white border rounded p-1 text-center" placeholder="AL (m)"
                              />
                            </div>
                            <div className="text-[10px] font-mono text-stone-500 p-1 bg-stone-100 rounded border mt-1">
                              Fto: A: {Number(formData.washingAncho).toFixed(2)}m x L: {Number(formData.washingLargo).toFixed(2)}m x AL: {Number(formData.washingAlto).toFixed(2)}m
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <span>¿Punto de gas?</span>
                              {["SI", "NO"].map(opt => (
                                <button 
                                  key={opt} type="button" 
                                  onClick={() => setFormData({ ...formData, washingGasPoint: opt })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${formData.washingGasPoint === opt ? 'bg-stone-900 text-brand-gold' : 'bg-stone-200'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* STEP 3: Identificación, Garajes e Características Extras */}
                  {currentStep === 3 && (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">3</span>
                        Distribución y Adicionales
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-stone-605 font-bold block mb-1">IDENTIFICACIÓN DEL INMUEBLE</label>
                          <select 
                            value={formData.idTypeDescription} 
                            onChange={e => setFormData({ ...formData, idTypeDescription: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs cursor-pointer"
                          >
                            <option value="Número">Solo el Número</option>
                            <option value="Torre y número">Torre y número</option>
                          </select>
                        </div>
                        {formData.idTypeDescription === 'Torre y número' && (
                          <div className="animate-fade-in">
                            <label className="text-xs text-stone-600 font-bold block mb-1">LETRA O NÚMERO DE TORRE</label>
                            <input 
                              type="text" value={formData.towerLetter} 
                              onChange={e => setFormData({ ...formData, towerLetter: e.target.value })}
                              placeholder="Ej. Torre B" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">NÚMERO DE INMUEBLE</label>
                          <input 
                            type="text" required value={formData.propertyNumber} 
                            onChange={e => setFormData({ ...formData, propertyNumber: e.target.value })}
                            placeholder="Ej. Apto 502" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] text-stone-500 font-bold block mb-0.5">GARAJES DISPONIBLES</label>
                          <select 
                            value={formData.garagesCount} 
                            onChange={e => setFormData({ ...formData, garagesCount: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs cursor-pointer"
                          >
                            {["Ningun", "Comunal", "1", "2", "3", "4", "5"].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        {formData.garagesCount !== 'Ningun' && formData.garagesCount !== 'Comunal' && (
                          <>
                            <div>
                              <label className="text-[11px] text-stone-500 font-bold block mb-0.5">DISTRIBUCIÓN</label>
                              <select 
                                value={formData.garageServitude} 
                                onChange={e => setFormData({ ...formData, garageServitude: e.target.value })}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs cursor-pointer"
                              >
                                <option value="Independiente">Independiente</option>
                                <option value="Servidumbre">Servidumbre</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] text-stone-500 font-bold block mb-0.5">TIPO DE GARAJE</label>
                              <select 
                                value={formData.garageCovered} 
                                onChange={e => setFormData({ ...formData, garageCovered: e.target.value })}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs cursor-pointer"
                              >
                                <option value="Cubierto">Cubierto</option>
                                <option value="Descubierto">Descubierto</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-stone-605 font-bold block mb-1">¿TIENE DEPÓSITO?</label>
                          <select 
                            value={formData.hasDeposit} 
                            onChange={e => setFormData({ ...formData, hasDeposit: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs cursor-pointer"
                          >
                            <option value="Ninguno">Ninguno</option>
                            <option value="Deposito">Sí, asume depósito</option>
                          </select>
                        </div>
                        {formData.hasDeposit === 'Deposito' && (
                          <div className="animate-fade-in">
                            <label className="text-xs text-stone-600 font-bold block mb-1">NÚMERO DE DEPÓSITO</label>
                            <input 
                              type="text" required value={formData.depositNumber} 
                              onChange={e => setFormData({ ...formData, depositNumber: e.target.value })}
                              placeholder="N° de depósito" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-stone-600 font-bold block mb-1">ZONAS COMUNES DEL INMUEBLE</label>
                        <input 
                          type="text" value={formData.commonAreas} 
                          onChange={e => setFormData({ ...formData, commonAreas: e.target.value })}
                          placeholder="Ej. Piscina, Gimnasio, BBQ, Parque infantil..." className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-stone-600 font-bold block mb-1">OTROS COMENTARIOS O DESCRIPCIÓN ADICIONAL</label>
                        <textarea 
                          rows={2} value={formData.additionalDescription}
                          onChange={e => setFormData({ ...formData, additionalDescription: e.target.value })}
                          placeholder="Escribe detalles adicionales..."
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Datos del Propietario (Confirmaciones integradas) */}
                  {currentStep === 4 && (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">4</span>
                        Datos Personales del Propietario
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">NOMBRES Y APELLIDOS</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                            <input 
                              type="text" required value={formData.name} 
                              onChange={e => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Juan Pérez" className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-10 pr-3 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-stone-604 font-bold block mb-1">DOCUMENTO DE IDENTIDAD</label>
                          <div className="flex gap-1.5Fixed">
                            <select 
                              value={formData.documentType} 
                              onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                              className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs w-20"
                            >
                              <option value="CC">C.C.</option>
                              <option value="CE">C.E.</option>
                              <option value="Pasaporte">PAS</option>
                              <option value="NIT">N.I.T</option>
                            </select>
                            <input 
                              type="text" required value={formData.documentNumber}
                              onChange={e => setFormData({ ...formData, documentNumber: e.target.value.replace(/\D/g, '') })}
                              placeholder="Número documento" className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-3 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {formData.documentNumber.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                          <div>
                            <label className="text-xs text-stone-600 font-bold block mb-1 flex justify-between">
                              <span>REPETIR DOCUMENTO</span>
                              {formData.confirmDocumentNumber && (
                                <span className={`text-[10px] font-bold ${formData.documentNumber === formData.confirmDocumentNumber ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formData.documentNumber === formData.confirmDocumentNumber ? '✓ Coincide' : '✗ Diferente'}
                                </span>
                              )}
                            </label>
                            <input 
                              type="text" required value={formData.confirmDocumentNumber}
                              onChange={e => setFormData({ ...formData, confirmDocumentNumber: e.target.value.replace(/\D/g, '') })}
                              placeholder="Confirma documento" className={`w-full border rounded-xl py-3 px-4 text-xs font-mono focus:outline-none ${
                                formData.confirmDocumentNumber ? (formData.documentNumber === formData.confirmDocumentNumber ? 'border-emerald-500' : 'border-rose-400') : 'bg-stone-50 border-[stone-200]'
                              }`}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-stone-500 font-bold block mb-0.5">CIUDAD EXPEDICIÓN</label>
                              <input 
                                type="text" required value={formData.documentCityOfExpedition}
                                onChange={e => setFormData({ ...formData, documentCityOfExpedition: e.target.value })}
                                placeholder="Ciudad" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-stone-500 font-bold block mb-0.5">PAÍS EXPEDICIÓN</label>
                              <input 
                                type="text" required value={formData.documentCountryOfExpedition}
                                onChange={e => setFormData({ ...formData, documentCountryOfExpedition: e.target.value })}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">CELULAR (WHATSAPP)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-500 font-bold select-none">
                              {COUNTRIES.find(c => c.code === formData.countryCode)?.prefix}
                            </span>
                            <input 
                              type="tel" required value={formData.phone}
                              onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                              placeholder="Celular" className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-14 pr-3 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                        {formData.phone.length > 0 && (
                          <div className="animate-fade-in">
                            <label className="text-xs text-stone-600 font-bold block mb-1 flex justify-between">
                              <span>CONFIRMAR CELULAR</span>
                              {formData.confirmPhone && (
                                <span className={`text-[10px] font-bold ${formData.phone === formData.confirmPhone ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formData.phone === formData.confirmPhone ? '✓ Coincide' : '✗ Diferente'}
                                </span>
                              )}
                            </label>
                            <input 
                              type="tel" required value={formData.confirmPhone}
                              onChange={e => setFormData({ ...formData, confirmPhone: e.target.value.replace(/\D/g, '') })}
                              placeholder="Confirma celular" className={`w-full border rounded-xl py-3 px-4 text-xs font-mono focus:outline-none ${
                                formData.confirmPhone ? (formData.phone === formData.confirmPhone ? 'border-emerald-500' : 'border-rose-400') : 'bg-stone-50 border-stone-200'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">CORREO ELECTRÓNICO</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                            <input 
                              type="email" required value={formData.email} 
                              onChange={e => setFormData({ ...formData, email: e.target.value })}
                              placeholder="juan@correo.com" className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-10 pr-3 text-xs"
                            />
                          </div>
                        </div>
                        {formData.email.length > 0 && (
                          <div className="animate-fade-in">
                            <label className="text-xs text-stone-600 font-bold block mb-1 flex justify-between">
                              <span>CONFIRMAR CORREO</span>
                              {formData.confirmEmail && (
                                <span className={`text-[10px] font-bold ${formData.email.toLowerCase() === formData.confirmEmail.toLowerCase() ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formData.email.toLowerCase() === formData.confirmEmail.toLowerCase() ? '✓ Coincide' : '✗ Diferente'}
                                </span>
                              )}
                            </label>
                            <input 
                              type="email" required value={formData.confirmEmail} 
                              onChange={e => setFormData({ ...formData, confirmEmail: e.target.value })}
                              placeholder="Confirma correo" className={`w-full border rounded-xl py-3 px-4 text-xs focus:outline-none ${
                                formData.confirmEmail ? (formData.email.toLowerCase() === formData.confirmEmail.toLowerCase() ? 'border-emerald-500' : 'border-rose-400') : 'bg-stone-50 border-stone-200'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      {formData.email && getEmailDomainWarning(formData.email) && (
                        <div className="bg-amber-100 p-2 rounded text-xs text-[#8A631F] font-bold animate-pulse">
                          <span>⚠️ {getEmailDomainWarning(formData.email)}</span>
                        </div>
                      )}

                      {/* VIP Card preview rendering dynamically */}
                      {formData.name.trim() !== '' && (
                        <div className="p-4 bg-stone-900 border border-brand-gold/20 rounded-xl text-brand-gold font-mono space-y-2 text-xs">
                          <strong className="text-white">PRE-REGISTRO CLIENTE VIP</strong>
                          <div>CLIENTE: <span className="text-white font-sans">{formData.name.toUpperCase()}</span></div>
                          <div className="flex justify-between border-t border-stone-850 pt-1 text-[10px] text-stone-400">
                            <span>DOCUMENTO: {formData.documentType} {formData.documentNumber}</span>
                            <span>ESTADO: VERIFICADO</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 5: Cláusulas y Porcentajes de Negocio */}
                  {currentStep === 5 && (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">5</span>
                        Cláusulas Legales y Comisión de Acuerdos
                      </h4>

                      <div>
                        <label className="text-xs text-stone-605 font-bold block mb-1">TIPO DE NEGOCIO AL REGISTRAR</label>
                        <select 
                          value={formData.serviceType} 
                          onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs cursor-pointer"
                        >
                          <option value="administracion">Servicio de Administración (Recaudo + Seguro)</option>
                          <option value="corretaje">Servicio de Corretaje (Colocación Simple)</option>
                          <option value="venta">Servicio de Venta Integral</option>
                          <option value="vendi-renta">Vendi-Renta (Doble promoción)</option>
                          <option value="admi-venta">Admi-Venta (Administración con opción de venta)</option>
                        </select>
                      </div>

                      {/* Summary explanation of clauses based on chosen model */}
                      <div className="bg-stone-50 p-4 border rounded-xl space-y-2 text-xs text-stone-650 max-h-[180px] overflow-y-auto">
                        <strong className="text-stone-900 block font-mono">CLÁUSULAS DEL CONTRATO ({formData.serviceType.toUpperCase()}):</strong>
                        
                        {formData.serviceType === 'administracion' && (
                          <p className="leading-relaxed font-sans">
                            <strong>Objeto:</strong> Propietario faculta a Gold Life para promocionar, buscar inquilinos y celebrar contratos. <br />
                            <strong>Garantía:</strong> Respaldo de póliza hasta por 36 meses contra fallos del arrendatario. <br />
                            <strong>Vigencia:</strong> Inicial de 12 meses renovables. Mérito ejecutivo directo para cobros ordinarios.
                          </p>
                        )}
                        {formData.serviceType === 'corretaje' && (
                          <p className="leading-relaxed font-sans">
                            <strong>Facultades:</strong> Promoción, toma de fotos y colocación libre de exclusividades rígidas. <br />
                            <strong>Comisión:</strong> Primer arriendo equivalente al porcentaje establecido. No implica dispersión recurrente.
                          </p>
                        )}
                        {formData.serviceType === 'venta' && (
                          <p className="leading-relaxed font-sans">
                            <strong>Facultades:</strong> Publicación en portales aliados y visitas guiadas con asesores especializados. <br />
                            <strong>Honorarios:</strong> Estándar de corretaje cobrado al momento de formalización jurídica de firmas.
                          </p>
                        )}
                        {(formData.serviceType === 'vendi-renta' || formData.serviceType === 'admi-venta') && (
                          <p className="leading-relaxed font-sans">
                            <strong>Disposición Mixta:</strong> Integración de póliza amparada para arriendo y comisión priorizada por venta formalizada en paralelo con exclusividad de promoción por 60 días en portales VIP.
                          </p>
                        )}
                      </div>

                      {/* Toggle choices on commission calculations as requested */}
                      <div className="bg-amber-500/5 p-3.5 border border-brand-gold/30 rounded-xl space-y-3.5">
                        <span className="text-xs font-bold text-stone-850 font-mono tracking-wide block">PORCENTAJES DE GESTIÓN AUTORIZADOS</span>

                        {formData.serviceType === 'administracion' && (
                          <div>
                            <span className="text-[10px] text-stone-500 block mb-1">PORCENTAJE DE COMISIÓN DE GESTIÓN RECURRENTE</span>
                            <select 
                              value={formData.adminPercentSelector} 
                              onChange={e => setFormData({ ...formData, adminPercentSelector: e.target.value })}
                              className="bg-white border rounded p-2 text-xs cursor-pointer w-full font-mono font-bold"
                            >
                              <option value="8.5% desde el primer mes">8.5% desde el primer mes (Preferencial)</option>
                              <option value="9.1% desde el segundo mes">9.1% desde el segundo mes</option>
                            </select>
                          </div>
                        )}

                        {formData.serviceType === 'corretaje' && (
                          <div>
                            <span className="text-[10px] text-stone-500 block mb-1">PORCENTAJE DE COMISIÓN DE CORRETAJE SIMPLE</span>
                            <input 
                              type="text" value={formData.corretajePercent} 
                              onChange={e => setFormData({ ...formData, corretajePercent: e.target.value.replace(/\D/g, '') })}
                              placeholder="100" className="bg-white border rounded p-2 text-xs w-full font-mono font-bold"
                            />
                          </div>
                        )}

                        {formData.serviceType === 'venta' && (
                          <div>
                            <span className="text-[10px] text-stone-500 block mb-1">PORCENTAJE DE CORRETAJE POR VENTA PACTADO (LETRAS AUTOMÁTICAS)</span>
                            <select 
                              value={formData.salesCommissionSelector} 
                              onChange={e => setFormData({ ...formData, salesCommissionSelector: e.target.value })}
                              className="bg-white border rounded p-2 text-xs cursor-pointer w-full font-mono font-boldColor border-stone-250"
                            >
                              <option value="3%">3% (TRES POR CIENTO)</option>
                              <option value="2.5%">2.5% (DOS PUNTO CINCO POR CIENTO)</option>
                              <option value="2%">2% (DOS POR CIENTO)</option>
                              <option value="1.5%">1.5% (UNO PUNTO CINCO POR CIENTO)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <label className="flex items-center space-x-3 cursor-pointer select-none">
                          <input 
                            type="checkbox" checked={formData.clausesAccepted}
                            onChange={e => setFormData({ ...formData, clausesAccepted: e.target.checked })}
                            className="w-5 h-5 text-[#8A631F] border-stone-300 bg-white rounded cursor-pointer"
                          />
                          <span className="text-xs text-stone-900 font-bold leading-normal">
                            He leído detenidamente y ACEPTO las cláusulas estipuladas del modelo de promoción solicitado.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Precios Generales, Autorización de Ingreso y Notificación */}
                  {currentStep === 6 && (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">6</span>
                        Precios de Comercialización y Acta a Portería
                      </h4>

                      <div className="p-3 bg-brand-gold/10 border border-brand-gold rounded-xl text-xs space-y-2 animate-fade-in">
                        <span className="font-extrabold text-[#8A631F] block uppercase tracking-wide">AVALÚO ECONÓMICO FINAL</span>
                        
                        {formData.serviceType !== 'venta' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">
                            <div>
                              <label className="text-[10px] text-stone-605 block mb-1">PRECIO PROMOCIÓN GENERAL (Renta + Administración)</label>
                              <input 
                                type="text" value={new Intl.NumberFormat('es-CO').format(priceGeneralVal)} 
                                onChange={e => setFormData({ ...formData, priceGeneral: e.target.value.replace(/\D/g, '') })}
                                placeholder="Ej. 1.800.000" className="w-full bg-white border rounded-lg p-2.5 font-bold font-mono"
                              />
                              <p className="text-[9px] text-[#8A631F] italic leading-snug mt-1">
                                En letras: <strong className="text-stone-800 font-sans font-medium">{numberToWordsSpanish(priceGeneralVal)}</strong>
                              </p>
                            </div>
                            <div>
                              <label className="text-[10px] text-stone-605 block mb-1">CUOTA DE ADMINISTRACIÓN PLENA</label>
                              <input 
                                type="text" value={new Intl.NumberFormat('es-CO').format(priceHoaVal)}
                                onChange={e => setFormData({ ...formData, priceHoaPlena: e.target.value.replace(/\D/g, '') })}
                                placeholder="Ej. 350.000" className="w-full bg-white border rounded-lg p-2.5 font-bold font-mono"
                              />
                              <p className="text-[9px] text-[#8A631F] italic leading-snug mt-1">
                                En letras: <strong className="text-stone-800 font-sans font-medium">{numberToWordsSpanish(priceHoaVal)}</strong>
                              </p>
                            </div>
                          </div>
                        )}

                        {(formData.serviceType === 'venta' || formData.serviceType === 'vendi-renta' || formData.serviceType === 'admi-venta') && (
                          <div className="border-t border-brand-gold/20 pt-2 animate-fade-in">
                            <label className="text-[10px] text-stone-605 block mb-1">PRECIO DE VENTA PROYECTADO</label>
                            <input 
                              type="text" value={new Intl.NumberFormat('es-CO').format(sellPriceVal)} 
                              onChange={e => setFormData({ ...formData, priceVenta: e.target.value.replace(/\D/g, '') })}
                              placeholder="Ej. 450.000.000" className="w-full bg-white border rounded-lg p-2.5 font-bold font-mono"
                            />
                            <p className="text-[9px] text-[#8A631F] italic leading-snug mt-1">
                              En letras: <strong className="text-stone-800 font-sans font-medium">{numberToWordsSpanish(sellPriceVal)}</strong>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Act of notification choices */}
                      <div className="p-3 bg-stone-50 border rounded-xl space-y-3">
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-1">¿DISPONE DE PORTERÍA Y ADMINISTRACIÓN?</label>
                          <select 
                            value={formData.hasPorteriaAndAdmin} 
                            onChange={e => setFormData({ ...formData, hasPorteriaAndAdmin: e.target.value })}
                            className="bg-white border rounded p-2 text-xs cursor-pointer w-full"
                          >
                            <option value="SI">SÍ, dispone de portería para autorizaciones</option>
                            <option value="NO">NO, ingreso independiente/libre</option>
                          </select>
                        </div>

                        {formData.hasPorteriaAndAdmin === 'SI' && (
                          <div className="space-y-3 pt-2 border-t border-stone-200 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-stone-600 font-bold block mb-1">NOMBRE DE COPROPIEDAD / CONJUNTO</label>
                                <input 
                                  type="text" required value={formData.porteriaBuildingName}
                                  onChange={e => setFormData({ ...formData, porteriaBuildingName: e.target.value })}
                                  placeholder="CONJUNTO ALTOS DEL MORAL" className="w-full bg-white border rounded-lg p-2.5 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-stone-600 font-bold block mb-1">CORREO ADMINISTRACIÓN (NOTIFICACIÓN ACTA)</label>
                                <input 
                                  type="email" required value={formData.porteriaAdminEmail}
                                  onChange={e => setFormData({ ...formData, porteriaAdminEmail: e.target.value })}
                                  placeholder="admin@edificio.com" className="w-full bg-white border rounded-lg p-2.5 text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="text-[10px] text-stone-500 font-bold block mb-0.5">AUTORIZACIÓN DE LLAVES CON AGENTE</label>
                                <select 
                                  value={formData.porteriaAuthAgentGeneral} 
                                  onChange={e => setFormData({ ...formData, porteriaAuthAgentGeneral: e.target.value })}
                                  className="w-full bg-white border rounded p-2 text-[10px] cursor-pointer"
                                >
                                  <option value="El cual recoge las llaves en portería y después de la visita las deja nuevamente allí">Recoge llaves en portería y devuelve</option>
                                  <option value="Disponiendo de copia de las llaves">Dispone de copia de llaves</option>
                                  <option value="Con acompañamiento de mi parte en las visitas de interesados">Acompañamiento personal visitas</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-stone-500 font-bold block mb-0.5">AUTORIZACIÓN SIENDO EL NUEVO ADMINISTRADOR</label>
                                <select 
                                  value={formData.porteriaAuthAgentAdmin} 
                                  onChange={e => setFormData({ ...formData, porteriaAuthAgentAdmin: e.target.value })}
                                  className="w-full bg-white border rounded p-2 text-[10px] cursor-pointer"
                                >
                                  <option value="Siendo el nuevo ADMINISTRADOR, el cual recoge las llaves en portería">Administrador recoge y entrega</option>
                                  <option value="Siendo el nuevo ADMINISTRADOR, disponiendo de copia de las llaves">Administrador con copias</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-stone-50 border rounded-xl">
                        <label className="flex items-start space-x-3.5 cursor-pointer select-none">
                          <input 
                            type="checkbox" required checked={formData.hasNoEmbargo}
                            onChange={e => setFormData({ ...formData, hasNoEmbargo: e.target.checked })}
                            className="w-5 h-5 text-brand-gold border-stone-300 bg-white rounded mt-0.5"
                          />
                          <span className="text-xs text-stone-700 leading-relaxed">
                            Yo, <strong>{formData.name || 'Propietario'}</strong>, garantizo bajo juramento que el inmueble propuesto se halla <strong>100% libre de embargos vigentes, litigios judiciales</strong>, sucesiones pendientes, u deudas que impidan la comercialización inmediata.
                          </span>
                        </label>
                      </div>

                    </div>
                  )}

                </div>

                {/* Footer buttons of form */}
                <div className="pt-6 border-t border-stone-100 flex items-center justify-between mt-8 gap-4">
                  {currentStep > 1 ? (
                    <button
                      type="button" onClick={handlePrevStep}
                      className="inline-flex items-center space-x-1.5 bg-white hover:bg-stone-50 text-stone-700 font-bold py-3 px-5 rounded-xl text-xs transition-colors border border-stone-300 cursor-pointer shadow-xs active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver</span>
                    </button>
                  ) : <div />}

                  {currentStep < 6 ? (
                    <button
                      type="button" onClick={handleNextStep}
                      disabled={!canGoToNext()}
                      className="inline-flex items-center space-x-1.5 bg-stone-900 hover:bg-stone-850 disabled:bg-stone-250 disabled:text-stone-400 text-brand-gold font-bold py-3 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      <span>Siguiente</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit" disabled={loading || !formData.hasNoEmbargo}
                      className="inline-flex items-center space-x-1.5 bg-brand-gold hover:bg-brand-gold-dark disabled:bg-stone-250 disabled:text-stone-400 text-stone-950 font-bold py-3.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      {loading ? <span>Validando...</span> : (
                        <>
                          <Send className="w-4 h-4 text-stone-950" />
                          <span>Enviar Registro</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </form>
            ) : (
              
              /* SUCCESS VIEW */
              <div id="registration-success-card" className="py-10 text-center space-y-6 flex-1 flex flex-col justify-center max-w-sm mx-auto animate-fade-in">
                <div className="w-14 h-14 bg-emerald-100 border border-emerald-250 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1.5 text-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#8A631F] font-bold block">Gold Life Real Estate</span>
                  <h4 className="text-xl font-black text-stone-900">¡Registro Completado!</h4>
                  <p className="text-stone-605 text-xs font-light leading-relaxed">
                    Excelente, <strong>{formData.name}</strong>. Hemos procesado e ingresado los datos específicos para <strong>{formData.address}, {formData.city}</strong> con éxito.
                  </p>
                  <p className="text-stone-605 text-xs font-light leading-relaxed">
                    Despacha el extracto resumen oficial por WhatsApp para agendar tu consultoría de inmediato.
                  </p>
                </div>

                <div className="pt-2 space-y-3">
                  <a
                    href={getWhatsAppSubmitLink()}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex w-full bg-brand-gold hover:bg-brand-gold-dark text-stone-950 font-bold py-3.5 px-6 rounded-xl shadow-md cursor-pointer items-center justify-center space-x-1.5 text-xs transition-all active:scale-95 font-sans"
                  >
                    <Send className="w-4 h-4 text-stone-950" />
                    <span>Despachar por WhatsApp</span>
                  </a>

                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setCurrentStep(1);
                    }}
                    className="block text-xs text-stone-500 hover:text-stone-900 underline mx-auto cursor-pointer"
                  >
                    Registrar otro inmueble
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}
