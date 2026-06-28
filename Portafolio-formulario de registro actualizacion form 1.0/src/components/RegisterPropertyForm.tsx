/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { 
  CheckCircle2, Send, Mail, User, ShieldCheck, 
  ArrowLeft, ArrowRight, Calculator, MapPin, 
  Building2, Check, Info, DollarSign, Briefcase, Percent, Maximize,
  Key, Dog, Ruler, Home, BedDouble, Car, Layers, Lock, Camera, ChevronDown, ChevronUp,
  ScrollText, Star, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { numberToWordsSpanish } from '../lib/numberToWords';
import CountryMap from './CountryMap';
import FeaturesGridSelector from './FeaturesGridSelector';
import PhoneCountrySelector, { ALL_COUNTRIES } from './PhoneCountrySelector';
import { PortfolioLocationStep } from './PortfolioLocationStep';

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
  selectedServiceType: 'corretaje' | 'administracion' | 'venta' | 'vendi-renta' | 'admi-venta' | null;
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
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const savedStep = localStorage.getItem('registerPropertyCurrentStep');
      return savedStep ? parseInt(savedStep, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cedulaInput, setCedulaInput] = useState('');
  const [cedulaStatus, setCedulaStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [validatedCedula, setValidatedCedula] = useState('');
  const [revalidatingCedula, setRevalidatingCedula] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [shakeErrors, setShakeErrors] = useState(false);
  const [showBeds, setShowBeds] = useState(false);
  const [ownerProperties, setOwnerProperties] = useState<any[]>([]);
  const [activeFlow, setActiveFlow] = useState<'normal' | 'renovacion' | 'cambio_negocio'>('normal');
  const [selectedPropertyIndex, setSelectedPropertyIndex] = useState<number | null>(null);
  const [reutilizarMultimedia, setReutilizarMultimedia] = useState<'SI' | 'NO'>('SI');

  // Form State containing exact variables requested by the JSON Form
  const [formData, setFormData] = useState(() => {
    const defaultData = {
    gridAnswers: {} as Record<string, string>,
    // Step 1: Destino y Ubicación
    registrationDate: new Date().toISOString().split('T')[0],
    destination: 'Vivienda', // Vivienda, Comercio, Mixto
    localidad: 'Usaquén',
    upz: 'LOS CEDROS',
    barrio: 'CEDRITOS',
    barrioComercial: '',
    customBarrio: '',
    address: '',
    city: 'Bogotá',
    country: 'Colombia',

    // Step 2: Detalles Físicos y Dimensiones
    propertyType: 'Apartamento', // Apartamento, Apartaestudio, Casa, Local etc.
    area: '',
    rooms: 0,
    bathrooms: 0,
    roomsCount: '1',
    bedPrincipal: '',
    bedSecondary: '',
    bedTertiary: '',
    bedQuaternary: '',
    bedQuinary: '',
    bathroomsCount: '1',
    estrato: '4',
    stratum: '4',
    age: '1 a 5 años',
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
    hasDeposit: 'ㅤ', // 'Depositoㅤ', 'ㅤ'
    depositNumber: '',
    internalFeatures: [] as string[],
    externalFeatures: [] as string[],
    otherInternal: '',
    otherExternal: '',
    viewType: '',
    heaterType: '',
    kitchenType: '',
    kitchenStyle: '',
    stoveType: '',
    vigilanceType: '',
    sectorZoneType: '',
    sectorWayType: '',
    propertyDesign: '',
    additionalDescription: '',
    allowsPets: 'NO',
    petTypes: 'Todas las mascotas',
    customPetType: '',

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
    porteriaAuthAgentAdmin: 'Siendo el nuevo ADMINISTRADOR, el cual recoge las llaves en portería y después de la visita las deja nuevamente allí'
    };

    try {
      const savedData = localStorage.getItem('registerPropertyFormData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return { ...defaultData, ...parsed };
      }
    } catch (e) {
      console.error("Error cargando el formulario guardado", e);
    }
    return defaultData;
  });

  // Guardar automáticamente el progreso
  useEffect(() => {
    try {
      localStorage.setItem('registerPropertyFormData', JSON.stringify(formData));
      localStorage.setItem('registerPropertyCurrentStep', currentStep.toString());
    } catch (e) {
      console.error("No se pudo guardar el progreso localmente", e);
    }
  }, [formData, currentStep]);

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

  // Scroll to top when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // UI/UX: Visual feedback interactivo para campos llenos
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!target || typeof target.matches !== 'function' || !target.matches('#registro-form input, #registro-form select, #registro-form textarea')) return;
      if (target.type === 'checkbox' || target.type === 'radio' || target.type === 'file') return;
      if (target.value && target.value.trim() !== '') {
        target.setAttribute('data-filled', 'true');
      } else {
        target.removeAttribute('data-filled');
      }
    };
    
    document.addEventListener('input', handleInput);
    document.addEventListener('change', handleInput);
    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('change', handleInput);
    };
  }, []);

  useEffect(() => {
    // Forzar re-evaluación al cambiar de paso (por nuevos componentes)
    const timeout = setTimeout(() => {
      document.querySelectorAll('#registro-form input, #registro-form select, #registro-form textarea').forEach(el => {
        const target = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (target.type === 'checkbox' || target.type === 'radio' || target.type === 'file') return;
        if (target.value && target.value.trim() !== '') {
          target.setAttribute('data-filled', 'true');
        } else {
          target.removeAttribute('data-filled');
        }
      });
    }, 100);
    return () => clearTimeout(timeout);
  }, [currentStep, formData.serviceType, ownerProperties]);



  const selectProperty = (index: number) => {
    setSelectedPropertyIndex(index);
    const prop = ownerProperties[index];
    if (prop) {
      setFormData(prev => {
        const next = { ...prev };
        
        // Copiar todas las propiedades del objeto retornado si coinciden con el estado
        Object.keys(prop).forEach(key => {
          if (next.hasOwnProperty(key)) {
            (next as any)[key] = prop[key];
          }
        });
        
        // Mapear campos normalizados para asegurar consistencia
        next.address = prop["Ingrese la Dirección del inmueble"] || prop.direccion || '';
        next.propertyNumber = prop["N° de inmueble"] || prop.apto || '';
        next.towerLetter = prop["N° o Letra de la Torre"] || prop.torre || '';
        next.destination = prop["Define el propósito de tu inmueble"] || prop.destination || 'Vivienda';
        next.propertyType = prop["Selecciona el tipo de inmueble"] || prop.propertyType || 'Apartamento';
        next.area = prop["Area  M²"] || prop.area || '';
        next.roomsCount = prop["N° de Habitaciones"] || prop.roomsCount || '1';
        next.bathroomsCount = prop["N° de Baños"] || prop.bathroomsCount || '1';
        next.estrato = prop["¿Cual es el estrato?"] || prop.estrato || '4';
        next.propertyAge = prop["Antiguedad del Inmueble"] || prop.propertyAge || '';
        next.floorNumber = prop["N° de piso"] || prop.floorNumber || '';
        next.priceGeneral = prop["PRECIO DE PROMOCION GENERAL"] || prop.priceGeneral || '1800000';
        next.priceHoaPlena = prop["PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)"] || prop.priceHoaPlena || '350000';
        next.priceVenta = prop["PRECIO DE PROMOCION EN VENTA"] || prop.priceVenta || '450000000';
        next.hasPorteriaAndAdmin = prop["¿El inmueble dispone de portería y administración para realizar un acta de notificación de promoción inmobiliaria he ingreso?"] || prop.hasPorteriaAndAdmin || 'SI';
        next.porteriaBuildingName = prop["NOMBRE DEL INMUEBLE/ADMINISTRACION"] || prop.porteriaBuildingName || '';
        next.porteriaAutoSendEmail = prop["¿Desea enviar el acta notificación de gestión inmobiliaria a la administración desde este formulario también?"] || prop.porteriaAutoSendEmail || 'SI';
        next.porteriaAdminEmail = prop["Correo electrónico de la administración"] || prop.porteriaAdminEmail || '';
        
        // Si es flujo de renovación, mantener el tipo de negocio del inmueble
        if (activeFlow === 'renovacion') {
          const rawType = prop["TIPO DE NEGOCIO"] || prop.tipoNegocio || 'Administración';
          let mappedType: any = 'administracion';
          if (rawType.includes('Corretaje')) mappedType = 'corretaje';
          else if (rawType.includes('Venta')) mappedType = 'venta';
          else if (rawType.includes('Admi-Venta')) mappedType = 'admi-venta';
          else if (rawType.includes('Vendi-Renta')) mappedType = 'vendi-renta';
          next.serviceType = mappedType;
        }
        
        return next;
      });
    }
  };

  const resetPropertyFields = () => {
    setFormData(prev => ({
      ...prev,
      address: '',
      country: 'Colombia',
      propertyNumber: '',
      towerLetter: '',
      destination: 'Vivienda',
      propertyType: 'Apartamento',
      area: '',
      roomsCount: '1',
      bathroomsCount: '1',
      estrato: '4',
      propertyAge: '',
      floorNumber: '',
      priceGeneral: '1800000',
      priceHoaPlena: '350000',
      priceVenta: '450000000',
      hasPorteriaAndAdmin: 'SI',
      porteriaBuildingName: '',
      porteriaAdminEmail: '',
      allowsPets: 'NO',
      petTypes: 'Todas las mascotas',
      customPetType: ''
    }));
  };

  const parseNum = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const clean = String(val).replace(/[^0-9]/g, '');
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
    const config = ALL_COUNTRIES.find(c => c.code === code);
    return config ? digits.length >= 8 && digits.length <= config.maxLength : false;
  };

  // Interactive computed variables for the Dynamic Live Calculator panel
  const priceGeneralVal = parseNum(formData.priceGeneral);
  const priceHoaVal = parseNum(formData.priceHoaPlena);
  
  // Real Rent is General Rent minus HOA if HOA is paid separately
  const baseCanon = Math.max(0, priceGeneralVal - priceHoaVal);
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
    if (currentStep === 0) {
      return cedulaInput.length > 5;
    }
    if (currentStep === 1) {
      return String(formData.address || '').trim() !== '' && String(formData.city || '').trim() !== '';
    }
    if (currentStep === 2) {
      if (String(formData.area || '').trim() === '' || String(formData.propertyAge || '').trim() === '') return false;
      return true;
    }
    if (currentStep === 3) {
      if (String(formData.propertyNumber || '').trim() === '') return false;
      
      const count = parseInt(String(formData.roomsCount)) || 1;
      if (count >= 1 && !formData.bedPrincipal) return false;
      if (count >= 2 && !formData.bedSecondary) return false;
      if (count >= 3 && !formData.bedTertiary) return false;
      if (count >= 4 && !formData.bedQuaternary) return false;
      if (count >= 5 && !formData.bedQuinary) return false;
      
      return true;
    }
    if (currentStep === 4) {
      return true; // Any required fields on step 4? No
    }
    if (currentStep === 5) {
      return String(formData.name || '').trim() !== '' && 
             formData.documentNumber === formData.confirmDocumentNumber &&
             formData.documentNumber === validatedCedula &&
             isPhoneValid(String(formData.phone || ''), formData.countryCode) && 
             formData.phone === formData.confirmPhone &&
             String(formData.email || '').toLowerCase() === String(formData.confirmEmail || '').toLowerCase();
    }
    if (currentStep === 6) {
      return formData.clausesAccepted;
    }
    return true;
  };

  const handleNextStep = () => {
    if (canGoToNext()) {
      setShakeErrors(false);
      if (currentStep === 4 && cedulaStatus === 'found' && activeFlow === 'normal') {
        setCurrentStep(6);
      } else {
        setCurrentStep(p => Math.min(7, p + 1));
      }
    } else {
      setShakeErrors(true);
      setTimeout(() => setShakeErrors(false), 800);
      setTimeout(() => {
        const errorElements = document.querySelectorAll('.animate-shake');
        if (errorElements.length > 0) {
          errorElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };
  const handlePrevStep = () => {
    if (currentStep === 6 && cedulaStatus === 'found' && activeFlow === 'normal') {
      setCurrentStep(4);
    } else {
      setCurrentStep(p => Math.max(1, p - 1));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Prevent Enter key from submitting form inside input/select
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        const form = e.currentTarget;
        const focusableElements = Array.from(
          form.querySelectorAll('input, select, textarea, button')
        ) as HTMLElement[];
        
        const index = focusableElements.indexOf(target);
        if (index > -1 && index < focusableElements.length - 1) {
          e.preventDefault();
          let nextElement = focusableElements[index + 1];
          let offset = 1;
          // Skip disabled elements or non-submit buttons to find the next input
          while (
            nextElement && 
            (nextElement.hasAttribute('disabled') || 
             nextElement.getAttribute('type') === 'hidden' ||
             (nextElement.tagName === 'BUTTON' && nextElement.getAttribute('type') !== 'submit'))
          ) {
            offset++;
            nextElement = focusableElements[index + offset];
          }
          if (nextElement) {
            nextElement.focus();
          }
        }
      }
    }
  };

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
        reutilizarMultimedia: reutilizarMultimedia,
        "Fecha de registro del inmueble.": formData.registrationDate,
        "Define el propósito de tu inmueble": formData.destination,
        "Selecciona la localidad del inmueble": formData.localidad,
        "Selecciona la UPZ  de tu inmueble": formData.upz,
        "Escriba el barrio del inmueble": formData.barrio === 'Otro' ? formData.customBarrio : formData.barrio,
        "BARRIO COMERCIAL": formData.barrioComercial || '',
        "Ingrese la Dirección del inmueble": formData.address,
        "Ingrese la Ciudad del inmueble": formData.city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
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
        "Antiguedad del Inmueble": formData.propertyAge,
        "N° de piso": formData.floorNumber,
        "MEDIDAS DEL ESPACIO DE LA NEVERA": `${formData.fridgeAncho}x${formData.fridgeLargo}x${formData.fridgeAlto}`,
        "PUNTO DE AGUA": formData.fridgeWaterPoint,
        "MEDIDAS DEL ESPACIO DE LA LAVADORA": `${formData.washingAncho}x${formData.washingLargo}x${formData.washingAlto}`,
        "PUNTO DE GAS": formData.washingGasPoint,
        "¿El inmueble solo lo describe el Número? o ¿Número y torre?": formData.idTypeDescription,
        "N° o Letra de la Torre": formData.towerLetter,
        "N° de inmueble": formData.propertyNumber,
        "N° de Garajes": formData.garagesCount,
        "¿Es Independiente o en Servidumbre?": formData.garageServitude,
        "¿Es Cubierto o descubierto?": formData.garageCovered,
        "N° Asignado del garaje": formData.garageAssignedNumber,
        "¿Dispone de deposito?": formData.hasDeposit,
        "# De Deposito": formData.depositNumber,
        "¿Que tipo vista tiene?": formData.viewType,
        "¿Que tipo de calentador tiene?": formData.heaterType,
        "¿Que tipo de cocina es?": formData.kitchenType,
        "¿Que tipo de estilo de cocina es?": formData.kitchenStyle,
        "¿Que tipo de estufa dispone la cocina?": formData.stoveType,
        "Otro Interno": formData.otherInternal,
        "¿Qué tipo de vigilancia dispone?": formData.vigilanceType,
        "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #1 Zona Residencial]": formData.sectorZoneType === 'Residencial' ? 'Zona Residencialㅤ' : '',
        "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #2 Zona Comercial]": formData.sectorZoneType === 'Comercial' ? 'Zona Comercialㅤ' : '',
        "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #3 Zona Industrial]": formData.sectorZoneType === 'Industrial' ? 'Zona Industrialㅤ' : '',
        "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #4 Zona Campestre]": formData.sectorZoneType === 'Campestre' ? 'Zona Campestreㅤ' : '',
        "¿En que tipo de via se encuentra el inmueble?": formData.sectorWayType,
        "¿Cual es el tipo de diseño que tiene el inmueble?": formData.propertyDesign,
        "Otro Externo": formData.otherExternal,
        "¿Se permite mascota?": formData.allowsPets,
        "Que tipo de mascotas": formData.allowsPets === 'SI' ? (formData.petTypes === 'Editar' ? formData.customPetType : formData.petTypes) : '',
        "INGRESE A CONTINUACIÓN UNA DESCRIPCIÓN ADICIONAL DEL INMUEBLE": formData.additionalDescription,
        "¿El inmueble dispone de portería y administración para realizar un acta de notificación de promoción inmobiliaria he ingreso?": formData.hasPorteriaAndAdmin,
        "NOMBRE DEL INMUEBLE/ADMINISTRACION": formData.hasPorteriaAndAdmin === 'SI' ? formData.porteriaBuildingName.toUpperCase() : '',
        "¿Desea enviar el acta notificación de gestión inmobiliaria a la administración desde este formulario también?": formData.hasPorteriaAndAdmin === 'SI' ? formData.porteriaAutoSendEmail : '',
        "Correo electrónico de la administración": (formData.hasPorteriaAndAdmin === 'SI' && formData.porteriaAutoSendEmail === 'SI') ? formData.porteriaAdminEmail : '',
        "¿Qué tipo de autorización desea realizar?": (formData.serviceType === 'administracion' || formData.serviceType === 'admi-venta') ? 'ADMINISTRACION' : 'GENERAL',
        "¿Qué tipo de autorización desea con el agente para administración?": (formData.hasPorteriaAndAdmin === 'SI' && (formData.serviceType === 'administracion' || formData.serviceType === 'admi-venta')) ? formData.porteriaAuthAgentAdmin : '',
        "¿Qué tipo de autorización desea con el agente?": (formData.hasPorteriaAndAdmin === 'SI' && formData.serviceType !== 'administracion' && formData.serviceType !== 'admi-venta') ? formData.porteriaAuthAgentGeneral : '',
        "NOMBRES Y APELLIDOS DEL PROPIETARIO": formData.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
        "TIPO DOCUMENTO PROPIETARIO": formData.documentType,
        "Número de documento": formData.documentNumber,
        "Ciudad de Expedicion": formData.documentCityOfExpedition.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
        "Pais de Expedicion": formData.documentCountryOfExpedition.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
        "Pais del celular": ALL_COUNTRIES.find(c => c.code === formData.countryCode)?.prefix || '+57',
        "Celular": formData.phone,
        "Correo electrónico": formData.email,
        "TIPO DE NEGOCIO": formData.serviceType === 'administracion' ? 'Administración' : formData.serviceType === 'corretaje' ? 'Corretaje' : formData.serviceType === 'venta' ? 'Venta' : formData.serviceType === 'admi-venta' ? 'Admi-Venta' : 'Vendi-Renta',
        "PRECIO DE PROMOCION EN VENTA": formData.serviceType === 'venta' || formData.serviceType === 'admi-venta' || formData.serviceType === 'vendi-renta' ? sellPriceVal : '',
        "PRECIO DE PROMOCION EN VENTA EN LETRA": formData.serviceType === 'venta' || formData.serviceType === 'admi-venta' || formData.serviceType === 'vendi-renta' ? numberToWordsSpanish(sellPriceVal).toUpperCase() : '',
        "PRECIO DE PROMOCION GENERAL": formData.serviceType !== 'venta' ? priceGeneralVal : '',
        "PRECIO DE PROMOCION GENERAL EN LETRA": formData.serviceType !== 'venta' ? numberToWordsSpanish(priceGeneralVal).toUpperCase() : '',
        "PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)": priceHoaVal || '',
        "PRECIO DE ADMINISTRACION PLENA EN LETRA": priceHoaVal ? numberToWordsSpanish(priceHoaVal).toUpperCase() : '',
        
        // --- PORCENTAJES DE NEGOCIO ---
        "PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO": formData.serviceType === 'corretaje' ? `${formData.corretajePercent}%` : '',
        "PORCENTAJE DEL COSTO MENSUAL POR LOS SERVICIOS DE ADMINISTRACIÓN DEL INMUEBLE ": formData.serviceType === 'administracion' ? formData.adminPercentSelector : '',
        "(Porcentaje en números)": formData.serviceType === 'venta' ? formData.salesCommissionSelector : '',
        "(1.5%)  (Porcentaje en letras)": formData.serviceType === 'venta' && formData.salesCommissionSelector === '1.5%' ? 'UNO PUNTO CINCO' : '',
        "(2%)  (Porcentaje en letras)": formData.serviceType === 'venta' && formData.salesCommissionSelector === '2%' ? 'DOS' : '',
        "(2.5%)  (Porcentaje en letras)": formData.serviceType === 'venta' && formData.salesCommissionSelector === '2.5%' ? 'DOS PUNTO CINCO' : '',
        "(3%)  (Porcentaje en letras)": formData.serviceType === 'venta' && formData.salesCommissionSelector === '3%' ? 'TRES' : '',
        
        "PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO (Vendi-Renta)": formData.serviceType === 'vendi-renta' ? `${formData.vendiRentaArriendoPercent}%` : '',
        
        "PORCENTAJE DEL COSTO MENSUAL POR LOS SERVICIOS DE ADMINISTRACIÓN DEL INMUEBLE (Admi-Venta)": formData.serviceType === 'admi-venta' ? formData.admiVentaAdminPercentSelector : '',
        "(Porcentaje en números) (A-V)": formData.serviceType === 'admi-venta' ? formData.admiVentaSalesCommissionSelector : formData.serviceType === 'vendi-renta' ? formData.salesCommissionSelector : '',
        "(1.5%)  (Porcentaje en letras)  (A-V)": (formData.serviceType === 'admi-venta' && formData.admiVentaSalesCommissionSelector === '1.5%') || (formData.serviceType === 'vendi-renta' && formData.salesCommissionSelector === '1.5%') ? 'UNO PUNTO CINCO' : '',
        "(2%)  (Porcentaje en letras)  (A-V)": (formData.serviceType === 'admi-venta' && formData.admiVentaSalesCommissionSelector === '2%') || (formData.serviceType === 'vendi-renta' && formData.salesCommissionSelector === '2%') ? 'DOS' : '',
        "(2.5%)  (Porcentaje en letras) (A-V)": (formData.serviceType === 'admi-venta' && formData.admiVentaSalesCommissionSelector === '2.5%') || (formData.serviceType === 'vendi-renta' && formData.salesCommissionSelector === '2.5%') ? 'DOS PUNTO CINCO' : '',
        "(3%)  (Porcentaje en letras) (A-V)": (formData.serviceType === 'admi-venta' && formData.admiVentaSalesCommissionSelector === '3%') || (formData.serviceType === 'vendi-renta' && formData.salesCommissionSelector === '3%') ? 'TRES' : '',
        
        ...formData.gridAnswers
      };

      const response = await fetch('https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
        // Limpiar el localStorage al terminar con éxito
        try {
          localStorage.removeItem('registerPropertyFormData');
          localStorage.removeItem('registerPropertyCurrentStep');
        } catch (e) {}
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
    return `https://wa.me/573177623878?text=${encodeURIComponent(textMsg)}`;
  };

  return (
    <section id="registro" className="min-h-screen py-12 bg-brand-dark-deep text-stone-800 relative font-sans">
      {/* Luxury Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#8A631F]/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Superior Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-10 pb-6 border-b border-stone-200 gap-4">
          <div className="text-left flex items-center gap-4">
            <div className="size-14 bg-gradient-to-br from-brand-gold to-[#8A631F] rounded-2xl flex items-center justify-center shadow-lg shadow-brand-gold/20 p-3">
               <Building2 className="w-full h-full text-[#11100c]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-brand-gold-dark font-bold block mb-1">Gold Life Real Estate</span>
              <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                Registro de Inmuebles
              </h2>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center space-x-2 bg-white border-stone-200 hover:bg-stone-50 backdrop-blur-md text-stone-600 hover:text-brand-gold-dark border border-stone-200 px-6 py-3 rounded-full shadow-lg transition-all font-semibold text-sm cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-brand-gold-dark group-hover:-translate-x-1 transition-transform" />
              <span>Volver al Portal</span>
            </button>
          )}
        </div>

        {/* Progress gamification bar */}
        {!submitted && currentStep > 0 && (
          <div className="mb-10 max-w-4xl mx-auto">
            <div className="flex justify-between text-[10px] sm:text-xs font-mono mb-4 px-2">
              {['Ubicación', 'Físico', 'Extras', 'Propietario', 'Negocio', 'Precios'].map((label, idx) => {
                const isActive = currentStep === idx + 1;
                const isPast = currentStep > idx + 1;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 relative z-10 w-16">
                    <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-500 ${
                      isActive ? 'bg-brand-gold border-brand-gold text-[#11100c] shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-110' : 
                      isPast ? 'bg-stone-100 border-brand-gold text-brand-gold-dark' : 
                      'bg-white border-stone-200 text-stone-600'
                    }`}>
                      {isPast ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`font-bold transition-all whitespace-nowrap ${isActive ? 'text-brand-gold-dark' : 'text-stone-500'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="relative w-full bg-stone-100 h-1.5 rounded-full overflow-hidden shadow-inner -mt-[42px] z-0 mx-auto max-w-[calc(100%-4rem)]">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-gold to-[#f9e596] transition-all duration-700 ease-out shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
              />
            </div>
            <div className="h-10" /> {/* Spacer for the negative margin */}
          </div>
        )}

        {/* Master Row Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT COLUMN: Dynamic Interactive Cost and Yield Calculator Sheet */}
          {currentStep === 7 && (
            <div className="lg:col-span-4 bg-white/95 backdrop-blur-xl rounded-[2rem] p-8 flex flex-col justify-between border border-stone-200 shadow-2xl shadow-brand-gold/5 relative overflow-hidden text-left group transition-all">
            {/* Glossy top highlight */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-50" />
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-gold/10 to-transparent opacity-30" />

            
            {/* Real-time simulations adapt instantly to active variables and inputs */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-stone-200">
                <Calculator className="w-5 h-5 text-brand-gold-dark" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-stone-900 font-sans">
                  Simulación de Rendimientos
                </h3>
              </div>

              {/* Dynamic calculations display depending on serviceType */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-brand-gold-dark-dark">MODELO DE NEGOCIO ACTIVO</span>
                  <p className="text-xs font-bold text-stone-900 capitalize flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-brand-gold-dark" />
                    <span>Gold {formData.serviceType.toUpperCase()}</span>
                  </p>
                </div>

                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-2 text-xs">
                  {formData.serviceType !== 'venta' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Arriendo Mensual:</span>
                        <strong className="text-stone-800 font-mono">{FORMAT_COP(priceGeneralVal)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Cuota Administración (HOA):</span>
                        <strong className="text-stone-800 font-mono">-{FORMAT_COP(priceHoaVal)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-stone-200 pt-1 text-brand-gold-dark-dark">
                        <span>Canon Neto:</span>
                        <strong className="font-mono">{FORMAT_COP(baseCanon)}</strong>
                      </div>
                    </>
                  )}

                  {formData.serviceType === 'venta' && (
                    <div className="flex justify-between text-brand-gold-dark-dark">
                      <span>Estimado de Venta:</span>
                      <strong className="font-mono">{FORMAT_COP(sellPriceVal)}</strong>
                    </div>
                  )}
                </div>

                {/* Specific returns projections */}
                <div className="p-3 bg-stone-850 border border-stone-200 rounded-lg space-y-2">
                  <span className="text-[11px] uppercase font-mono text-stone-500 tracking-wider">RETORNO LÍQUIDO SIMULADO</span>
                  
                  {formData.serviceType === 'administracion' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Comisión ({finalAdminPercent}%):</span>
                        <span className="text-rose-400 font-mono">-{FORMAT_COP(adminMonthlyFee)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-stone-200 pt-2">
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
                      <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-stone-200 pt-2">
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
                      <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-stone-200 pt-2">
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
                        <div className="flex justify-between text-brand-gold-dark">
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
                        <div className="flex justify-between text-brand-gold-dark">
                          <span>Firma de Venta ({sellCommissionPercent}%):</span>
                          <strong>-{FORMAT_COP(sellCommissionFee)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Country Map integration */}
                <div className="pt-2 border-t border-stone-805/70 flex flex-col items-center">
                  <span className="text-[9px] text-stone-500 font-mono tracking-widest block mb-1">FOCO GEOGRÁFICO DE REGISTRO</span>
                  <div className="w-full max-h-[140px] flex items-center justify-center">
                    <CountryMap countryCode={formData.countryCode as any} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-200 mt-6 flex items-center justify-between text-[10px] text-stone-500 font-mono">
              <span>🛡️ GOLD LIFE COBERTURA 100%</span>
              <span>BOGOTÁ</span>
            </div>
          </div>
          )}

          {/* RIGHT COLUMN: The 6-Step Registration Wizard Form */}
          <div className={`${currentStep === 7 ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white/95 backdrop-blur-2xl p-8 sm:p-10 rounded-[2rem] border border-white/20 shadow-2xl shadow-black/20 flex flex-col justify-between text-left transition-all duration-500 ease-in-out`}>
            {!submitted ? (
              <form id="registro-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-5 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="w-full"
                    >
                  
                  {/* STEP 0: Identificación Inicial */}
                  {currentStep === 0 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
                        <div className="size-12 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
                          <User className="w-6 h-6 text-brand-gold-dark-dark" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-stone-900 tracking-tight">Validación del Propietario</h4>
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mt-0.5">Identificación del Cliente</p>
                        </div>
                      </div>

                      <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                        <div>
                          <label className="text-xs text-stone-600 font-bold block mb-2">INGRESE LA CÉDULA DEL PROPIETARIO</label>
                          <div className="flex gap-3">
                            <input 
                              type="text" 
                              value={new Intl.NumberFormat('es-CO').format(Number(cedulaInput || 0)).replace(/^0$/, '')}
                              onChange={(e) => {
                                setCedulaInput(e.target.value.replace(/\D/g, ''));
                                setCedulaStatus('idle');
                              }}
                              placeholder="Ej. 1020304050"
                              className="flex-1 bg-white border border-stone-200 rounded-xl p-3 text-sm font-mono font-bold shadow-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all outline-none"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                setCedulaStatus('searching');
                                try {
                                  const response = await fetch('https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec', {
                                    method: 'POST',
                                    body: JSON.stringify({ accion: 'consultarPropietario', cedula: cedulaInput }),
                                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                                  });
                                  const data = await response.json();
                                  if (data.success && data.propietario) {
                                    setCedulaStatus('found');
                                    setOwnerProperties(data.inmuebles || []);
                                    setFormData(p => ({ 
                                      ...p, 
                                      name: data.propietario.nombre, 
                                      documentNumber: data.propietario.numeroDocumento, 
                                      confirmDocumentNumber: data.propietario.numeroDocumento,
                                      email: data.propietario.email || '',
                                      confirmEmail: data.propietario.email || '',
                                      phone: data.propietario.celular || '',
                                      confirmPhone: data.propietario.celular || ''
                                    }));
                                  } else {
                                    setCedulaStatus('not_found');
                                  }
                                } catch (error) {
                                  console.error("Error validando cédula:", error);
                                  setCedulaStatus('not_found');
                                }
                              }}
                              disabled={cedulaInput.length < 5 || cedulaStatus === 'searching'}
                              className="bg-stone-900 text-brand-gold-dark px-6 py-3 rounded-xl font-bold shadow-md hover:bg-black transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                            >
                              {cedulaStatus === 'searching' ? 'Buscando...' : 'Buscar'}
                            </button>
                          </div>
                        </div>

                        {cedulaStatus === 'not_found' && (
                          <div className="animate-in slide-in-from-top-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                            <strong>Propietario no encontrado.</strong> Parece ser un cliente nuevo en la base de datos de Gold Life. Continuemos con el registro completo.
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => { 
                                  resetPropertyFields(); 
                                  setValidatedCedula(cedulaInput);
                                  setFormData(p => ({ ...p, documentNumber: cedulaInput, confirmDocumentNumber: cedulaInput }));
                                  setCurrentStep(1); 
                                }}
                                className="w-full bg-brand-gold text-stone-900 font-bold py-3 rounded-xl shadow-md hover:bg-brand-gold transition-all"
                              >
                                Continuar como Nuevo Registro
                              </button>
                            </div>
                          </div>
                        )}

                        {cedulaStatus === 'found' && (
                          <div className="animate-in slide-in-from-top-2 space-y-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-sm text-emerald-800">
                              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                              <div>
                                <strong>¡Cliente Identificado!</strong>
                                <p className="mt-1 font-mono text-xs">{formData.name} ya existe en el sistema.</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                              <button type="button" onClick={() => { setActiveFlow('normal'); setSelectedPropertyIndex(null); setValidatedCedula(cedulaInput); setCurrentStep(1); }} className="flex items-center justify-between p-4 bg-white border border-stone-200 hover:border-brand-gold rounded-xl transition-all group text-left shadow-sm">
                                <div>
                                  <h5 className="font-bold text-stone-900 group-hover:text-brand-gold-dark transition-colors">Nuevo Inmueble</h5>
                                  <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">Añadir una nueva propiedad al portafolio de este cliente.</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-stone-600 group-hover:text-brand-gold-dark" />
                              </button>
                              <button type="button" onClick={() => { setActiveFlow('renovacion'); resetPropertyFields(); setSelectedPropertyIndex(null); setValidatedCedula(cedulaInput); setCurrentStep(1); }} className="flex items-center justify-between p-4 bg-white border border-stone-200 hover:border-blue-500 rounded-xl transition-all group text-left shadow-sm">
                                <div>
                                  <h5 className="font-bold text-stone-900 group-hover:text-blue-600 transition-colors">Renovación de Contrato</h5>
                                  <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">Renovar contrato existente sin volver a pedir datos.</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-stone-600 group-hover:text-blue-500" />
                              </button>
                              <button type="button" onClick={() => { setActiveFlow('cambio_negocio'); resetPropertyFields(); setSelectedPropertyIndex(null); setValidatedCedula(cedulaInput); setCurrentStep(1); }} className="flex items-center justify-between p-4 bg-white border border-stone-200 hover:border-emerald-500 rounded-xl transition-all group text-left shadow-sm">
                                <div>
                                  <h5 className="font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">Cambio de Modelo de Negocio</h5>
                                  <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">Ej: Pasar de Corretaje a Administración.</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-stone-600 group-hover:text-emerald-500" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 1: Selección o Ubicación */}
                  {currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      
                      {/* SUB-FLOW: Property Selector for Existing Owners */}
                      {activeFlow !== 'normal' && selectedPropertyIndex === null && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
                            <div className="size-12 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
                              <Building2 className="w-6 h-6 text-brand-gold-dark-dark" />
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-stone-900 tracking-tight">Seleccionar Inmueble</h4>
                              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mt-0.5">
                                {activeFlow === 'renovacion' ? 'Renovación de Contrato' : 'Cambio de Modelo de Negocio'}
                              </p>
                            </div>
                          </div>
                          
                  {ownerProperties.length === 0 ? (
                            <div className="p-6 text-center text-stone-500 text-sm bg-stone-50 rounded-2xl border border-stone-200">
                              No hay inmuebles registrados para este propietario en la base de datos.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {ownerProperties.map((prop, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setValidatedCedula(cedulaInput);
                                    setFormData(p => ({ ...p, documentNumber: cedulaInput, confirmDocumentNumber: cedulaInput }));
                                    selectProperty(idx);
                                  }}
                                  className="p-5 bg-stone-50 border border-stone-200 rounded-2xl hover:border-brand-gold text-left transition-all hover:shadow-md group flex flex-col justify-between"
                                >
                                  <div>
                                    <strong className="text-stone-900 block text-sm group-hover:text-brand-gold-dark transition-colors">
                                      {prop["Ingrese la Dirección del inmueble"] || prop.direccion || 'Dirección no especificada'}
                                    </strong>
                                    <span className="text-xs text-stone-500 mt-1 block">
                                      {prop["N° o Letra de la Torre"] ? `Torre ${prop["N° o Letra de la Torre"]} - ` : ''}Apto/Inmueble: {prop["N° de inmueble"] || prop.apto || ''}
                                    </span>
                                    <span className="inline-block mt-3 text-[10px] font-bold px-2 py-0.5 bg-stone-200 rounded text-stone-700 uppercase tracking-wider">
                                      {prop["TIPO DE NEGOCIO"] || prop.tipoNegocio || 'Sin Tipo'}
                                    </span>
                                  </div>
                                  <div className="border-t border-stone-200 mt-4 pt-3 flex justify-between items-center text-xs w-full">
                                    <span className="text-stone-500">Valor actual:</span>
                                    <strong className="font-mono text-stone-850">
                                      {prop["TIPO DE NEGOCIO"] === 'Venta' 
                                        ? FORMAT_COP(parseNum(prop["PRECIO DE PROMOCION EN VENTA"] || '0'))
                                        : FORMAT_COP(parseNum(prop["PRECIO DE PROMOCION GENERAL"] || '0'))}
                                    </strong>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-FLOW: Simplified Renovation Form */}
                      {activeFlow === 'renovacion' && selectedPropertyIndex !== null && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
                            <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                              <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-stone-900 tracking-tight">Detalles de Renovación</h4>
                              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mt-0.5">Paso Único de Renovación</p>
                            </div>
                          </div>

                          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs">
                            <strong className="text-stone-800 uppercase font-mono text-[10px] tracking-wider block">Inmueble Seleccionado</strong>
                            <p className="font-bold text-sm text-stone-900">{formData.address}</p>
                            <p className="text-stone-600">
                              {formData.towerLetter ? `Torre ${formData.towerLetter} - ` : ''}Inmueble: {formData.propertyNumber} ({formData.propertyType})
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-stone-600 font-bold block mb-1">NUEVO CANON DE ARRENDAMIENTO (Renta + Administración)</label>
                              <input 
                                type="text" 
                                value={new Intl.NumberFormat('es-CO').format(priceGeneralVal)} 
                                onChange={e => setFormData({ ...formData, priceGeneral: e.target.value.replace(/\D/g, '') })}
                                placeholder="Ej. 1.900.000" 
                                className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold font-mono"
                              />
                              <p className="text-[10px] text-[#8A631F] italic mt-1 font-mono">
                                En letras: <strong>{numberToWordsSpanish(priceGeneralVal).toUpperCase()}</strong>
                              </p>
                            </div>
                            <div>
                              <label className="text-xs text-stone-600 font-bold block mb-1">NUEVA ADMINISTRACIÓN (HOA)</label>
                              <input 
                                type="text" 
                                value={new Intl.NumberFormat('es-CO').format(priceHoaVal)} 
                                onChange={e => setFormData({ ...formData, priceHoaPlena: e.target.value.replace(/\D/g, '') })}
                                placeholder="Ej. 380.000" 
                                className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold font-mono"
                              />
                              <p className="text-[10px] text-[#8A631F] italic mt-1 font-mono">
                                En letras: <strong>{numberToWordsSpanish(priceHoaVal).toUpperCase()}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                            <label className="text-xs text-stone-700 font-bold block mb-1">¿REUTILIZAR CONTENIDO MULTIMEDIA ANTERIOR?</label>
                            <div className="flex gap-4">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="reutilizarMultimedia" 
                                  value="SI" 
                                  checked={reutilizarMultimedia === 'SI'} 
                                  onChange={() => setReutilizarMultimedia('SI')}
                                  className="w-4 h-4 text-brand-gold-dark cursor-pointer"
                                />
                                <span className="text-xs text-stone-900 font-semibold">SÍ (Reutilizar fotos y video de YouTube)</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="reutilizarMultimedia" 
                                  value="NO" 
                                  checked={reutilizarMultimedia === 'NO'} 
                                  onChange={() => setReutilizarMultimedia('NO')}
                                  className="w-4 h-4 text-brand-gold-dark cursor-pointer"
                                />
                                <span className="text-xs text-stone-900 font-semibold">NO (Subir nuevo material)</span>
                              </label>
                            </div>
                            <p className="text-[10px] text-stone-500 leading-relaxed">
                              Si selecciona SÍ, el enlace de YouTube anterior se mantendrá bloqueado y asociado a la propiedad. Si selecciona NO, el campo de video se abrirá temporalmente en el panel para subir nuevo material.
                            </p>
                          </div>

                          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                            <label className="flex items-start space-x-3.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" required checked={formData.hasNoEmbargo}
                                onChange={e => setFormData({ ...formData, hasNoEmbargo: e.target.checked })}
                                className="w-5 h-5 text-brand-gold-dark border-stone-300 bg-white rounded mt-0.5 cursor-pointer"
                              />
                              <span className="text-xs text-stone-750 leading-relaxed font-semibold">
                                Yo, <strong>{formData.name || 'Propietario'}</strong>, garantizo bajo juramento que el inmueble propuesto se halla <strong>100% libre de embargos vigentes, litigios judiciales</strong> o impedimentos.
                              </span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* SUB-FLOW: Simplified Change of Business Model Form */}
                      {activeFlow === 'cambio_negocio' && selectedPropertyIndex !== null && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
                            <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                              <ShieldCheck className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-stone-900 tracking-tight">Cambio de Modelo de Negocio</h4>
                              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mt-0.5">Paso Único de Reconfiguración</p>
                            </div>
                          </div>

                          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs">
                            <strong className="text-stone-805 uppercase font-mono text-[10px] tracking-wider block">Inmueble Seleccionado</strong>
                            <p className="font-bold text-sm text-stone-900">{formData.address}</p>
                            <p className="text-stone-600">
                              {formData.towerLetter ? `Torre ${formData.towerLetter} - ` : ''}Inmueble: {formData.propertyNumber} ({formData.propertyType})
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="text-xs text-stone-600 font-bold block mb-1">NUEVO MODELO DE NEGOCIO DESTINO</label>
                              <select 
                                value={formData.serviceType} 
                                onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs cursor-pointer font-bold"
                              >
                                <option value="administracion">Servicio de Administración (Recaudo + Seguro)</option>
                                <option value="corretaje">Servicio de Corretaje (Colocación Simple)</option>
                                <option value="venta">Servicio de Venta Integral</option>
                                <option value="vendi-renta">Vendi-Renta (Doble promoción)</option>
                                <option value="admi-venta">Admi-Venta (Administración con opción de venta)</option>
                              </select>
                            </div>
                          </div>

                          {/* Dynamic commissions and pricing configurations */}
                          <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                            <strong className="text-stone-900 block text-xs font-bold font-mono tracking-wider uppercase border-b pb-2">PARÁMETROS ECONÓMICOS</strong>

                            {/* VENTA component parameters */}
                            {(formData.serviceType === 'venta' || formData.serviceType === 'admi-venta' || formData.serviceType === 'vendi-renta') && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in border-b border-stone-200 pb-4">
                                <div>
                                  <label className="text-xs text-stone-600 font-bold block mb-1">PRECIO DE VENTA PROYECTADO</label>
                                  <input 
                                    type="text" 
                                    value={new Intl.NumberFormat('es-CO').format(sellPriceVal)} 
                                    onChange={e => setFormData({ ...formData, priceVenta: e.target.value.replace(/\D/g, '') })}
                                    placeholder="Ej. 450.000.000" 
                                    className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold font-mono"
                                  />
                                  <p className="text-[10px] text-[#8A631F] italic mt-1 font-mono">
                                    En letras: <strong>{numberToWordsSpanish(sellPriceVal).toUpperCase()}</strong>
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-stone-600 font-bold block mb-1">COMISIÓN DE CORRETAJE VENTA</label>
                                  <select 
                                    value={formData.serviceType === 'admi-venta' ? formData.admiVentaSalesCommissionSelector : formData.salesCommissionSelector} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (formData.serviceType === 'admi-venta') {
                                        setFormData({ ...formData, admiVentaSalesCommissionSelector: val });
                                      } else {
                                        setFormData({ ...formData, salesCommissionSelector: val });
                                      }
                                    }}
                                    className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold"
                                  >
                                    <option value="3%">3% (TRES POR CIENTO)</option>
                                    <option value="2.5%">2.5% (DOS PUNTO CINCO POR CIENTO)</option>
                                    <option value="2%">2% (DOS POR CIENTO)</option>
                                    <option value="1.5%">1.5% (UNO PUNTO CINCO POR CIENTO)</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {/* ARRIENDO component parameters */}
                            {(formData.serviceType === 'administracion' || formData.serviceType === 'corretaje' || formData.serviceType === 'admi-venta' || formData.serviceType === 'vendi-renta') && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in border-b border-stone-200 pb-4">
                                <div>
                                  <label className="text-xs text-stone-600 font-bold block mb-1">CANON DE ARRENDAMIENTO (Renta + Admin)</label>
                                  <input 
                                    type="text" 
                                    value={new Intl.NumberFormat('es-CO').format(priceGeneralVal)} 
                                    onChange={e => setFormData({ ...formData, priceGeneral: e.target.value.replace(/\D/g, '') })}
                                    placeholder="Ej. 1.800.000" 
                                    className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold font-mono"
                                  />
                                  <p className="text-[10px] text-[#8A631F] italic mt-1 font-mono">
                                    En letras: <strong>{numberToWordsSpanish(priceGeneralVal).toUpperCase()}</strong>
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-stone-600 font-bold block mb-1">CUOTA DE ADMINISTRACIÓN (HOA)</label>
                                  <input 
                                    type="text" 
                                    value={new Intl.NumberFormat('es-CO').format(priceHoaVal)} 
                                    onChange={e => setFormData({ ...formData, priceHoaPlena: e.target.value.replace(/\D/g, '') })}
                                    placeholder="Ej. 350.000" 
                                    className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold font-mono"
                                  />
                                  <p className="text-[10px] text-[#8A631F] italic mt-1 font-mono">
                                    En letras: <strong>{numberToWordsSpanish(priceHoaVal).toUpperCase()}</strong>
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Administration Commission selection */}
                            {(formData.serviceType === 'administracion' || formData.serviceType === 'admi-venta') && (
                              <div className="animate-fade-in pb-2">
                                <label className="text-xs text-stone-600 font-bold block mb-1">COMISIÓN GESTIÓN MENSUAL (ADMINISTRACIÓN)</label>
                                <select 
                                  value={formData.serviceType === 'admi-venta' ? formData.admiVentaAdminPercentSelector : formData.adminPercentSelector} 
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (formData.serviceType === 'admi-venta') {
                                      setFormData({ ...formData, admiVentaAdminPercentSelector: val });
                                    } else {
                                      setFormData({ ...formData, adminPercentSelector: val });
                                    }
                                  }}
                                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold"
                                >
                                  <option value="8.5% desde el primer mes">8.5% desde el primer mes (Preferencial)</option>
                                  <option value="9.1% desde el segundo mes">9.1% desde el segundo mes</option>
                                </select>
                              </div>
                            )}

                            {/* Corretaje Commission */}
                            {(formData.serviceType === 'corretaje' || formData.serviceType === 'vendi-renta') && (
                              <div className="animate-fade-in pb-2">
                                <label className="text-xs text-stone-600 font-bold block mb-1">PORCENTAJE COMISIÓN CORRETAJE SIMPLE</label>
                                <input 
                                  type="text" 
                                  value={formData.serviceType === 'vendi-renta' ? formData.vendiRentaArriendoPercent : formData.corretajePercent} 
                                  onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (formData.serviceType === 'vendi-renta') {
                                      setFormData({ ...formData, vendiRentaArriendoPercent: val });
                                    } else {
                                      setFormData({ ...formData, corretajePercent: val });
                                    }
                                  }}
                                  placeholder="100" 
                                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold font-mono"
                                />
                              </div>
                            )}
                          </div>

                          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                            <label className="text-xs text-stone-700 font-bold block mb-1">¿REUTILIZAR CONTENIDO MULTIMEDIA ANTERIOR?</label>
                            <div className="flex gap-4">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="reutilizarMultimediaCD" 
                                  value="SI" 
                                  checked={reutilizarMultimedia === 'SI'} 
                                  onChange={() => setReutilizarMultimedia('SI')}
                                  className="w-4 h-4 text-brand-gold-dark cursor-pointer"
                                />
                                <span className="text-xs text-stone-900 font-semibold">SÍ (Reutilizar fotos y video de YouTube)</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="reutilizarMultimediaCD" 
                                  value="NO" 
                                  checked={reutilizarMultimedia === 'NO'} 
                                  onChange={() => setReutilizarMultimedia('NO')}
                                  className="w-4 h-4 text-brand-gold-dark cursor-pointer"
                                />
                                <span className="text-xs text-stone-900 font-semibold">NO (Subir nuevo material)</span>
                              </label>
                            </div>
                          </div>

                          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                            <label className="flex items-start space-x-3.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" required checked={formData.hasNoEmbargo}
                                onChange={e => setFormData({ ...formData, hasNoEmbargo: e.target.checked })}
                                className="w-5 h-5 text-brand-gold-dark border-stone-300 bg-white rounded mt-0.5 cursor-pointer"
                              />
                              <span className="text-xs text-stone-750 leading-relaxed font-semibold">
                                Yo, <strong>{formData.name || 'Propietario'}</strong>, garantizo bajo juramento que el inmueble propuesto se halla <strong>100% libre de embargos vigentes, litigios judiciales</strong> o impedimentos.
                              </span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* STANDARD FLOW: Step 1 Location Form */}
                      {activeFlow === 'normal' && (
                        <>
                          <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
                            <div className="size-12 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
                              <MapPin className="w-6 h-6 text-brand-gold-dark-dark" />
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-stone-900 tracking-tight">Ubicación del Inmueble</h4>
                              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mt-0.5">Paso 1 de 7</p>
                            </div>
                          </div>
                          
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

                          <PortfolioLocationStep formData={formData} setFormData={setFormData} />

                          {/* Act of notification choices MOVED HERE FROM STEP 7 */}
                          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 mt-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                              <Key className="w-16 h-16" />
                            </div>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                              <Key className="w-4 h-4 text-brand-gold-dark" />
                              <h5 className="font-bold text-sm text-stone-900">Control de Acceso y Llaves</h5>
                            </div>
                            
                            <div className="relative z-10">
                              <label className="text-[10px] text-stone-600 font-bold block mb-1">¿EL CONJUNTO/EDIFICIO DISPONE DE PORTERÍA?</label>
                              <select 
                                value={formData.hasPorteriaAndAdmin} 
                                onChange={e => setFormData({ ...formData, hasPorteriaAndAdmin: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer w-full transition-colors outline-none"
                              >
                                <option value="SI">SÍ, dispone de portería para autorizaciones</option>
                                <option value="NO">NO, ingreso independiente/libre</option>
                              </select>
                            </div>

                            <AnimatePresence>
                              {formData.hasPorteriaAndAdmin === 'SI' && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }} 
                                  animate={{ height: 'auto', opacity: 1 }} 
                                  exit={{ height: 0, opacity: 0 }}
                                  className="space-y-4 pt-3 mt-3 border-t border-stone-200 relative z-10 overflow-hidden"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-[10px] text-stone-600 font-bold block mb-1">NOMBRE DE COPROPIEDAD / CONJUNTO</label>
                                      <input 
                                        type="text" required value={formData.porteriaBuildingName}
                                        onChange={e => setFormData({ ...formData, porteriaBuildingName: e.target.value })}
                                        placeholder="Ej: CONJUNTO ALTOS DEL MORAL" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-stone-600 font-bold block mb-1">¿ENVIAR ACTA A LA ADMINISTRACIÓN?</label>
                                      <select 
                                        value={formData.porteriaAutoSendEmail} 
                                        onChange={e => setFormData({ ...formData, porteriaAutoSendEmail: e.target.value })}
                                        className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer outline-none transition-colors"
                                      >
                                        <option value="SI">SÍ, enviar acta también a la admón</option>
                                        <option value="NO">NO, solo enviar a mi correo</option>
                                      </select>
                                    </div>
                                  </div>

                                  {formData.porteriaAutoSendEmail === 'SI' && (
                                    <div className="animate-fade-in">
                                      <label className="text-[10px] text-stone-600 font-bold block mb-1">CORREO DE LA ADMINISTRACIÓN</label>
                                      <input 
                                        type="email" required value={formData.porteriaAdminEmail}
                                        onChange={e => setFormData({ ...formData, porteriaAdminEmail: e.target.value })}
                                        placeholder="admin@edificio.com" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                                      />
                                    </div>
                                  )}

                                  <div>
                                    {(formData.serviceType === 'administracion' || formData.serviceType === 'admi-venta') ? (
                                      <div className="animate-fade-in">
                                        <label className="text-[10px] text-stone-500 font-bold block mb-1">AUTORIZACIÓN SIENDO EL NUEVO ADMINISTRADOR</label>
                                        <select 
                                          value={formData.porteriaAuthAgentAdmin} 
                                          onChange={e => setFormData({ ...formData, porteriaAuthAgentAdmin: e.target.value })}
                                          className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer outline-none transition-colors"
                                        >
                                          <option value="Siendo el nuevo ADMINISTRADOR, el cual recoge las llaves en portería y después de la visita las deja nuevamente allí">Administrador recoge y entrega</option>
                                          <option value="Siendo el nuevo ADMINISTRADOR, disponiendo de copia de las llaves">Administrador con copias</option>
                                          <option value="Siendo el nuevo ADMINISTRADOR, Con acompañamiento de mi parte en las visitas de interesados">Administrador con acompañamiento</option>
                                        </select>
                                      </div>
                                    ) : (
                                      <div className="animate-fade-in">
                                        <label className="text-[10px] text-stone-500 font-bold block mb-1">AUTORIZACIÓN DE LLAVES CON AGENTE (GENERAL)</label>
                                        <select 
                                          value={formData.porteriaAuthAgentGeneral} 
                                          onChange={e => setFormData({ ...formData, porteriaAuthAgentGeneral: e.target.value })}
                                          className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer outline-none transition-colors"
                                        >
                                          <option value="El cual recoge las llaves en portería y después de la visita las deja nuevamente allí">Recoge llaves en portería y devuelve</option>
                                          <option value="Disponiendo de copia de las llaves">Dispone de copia de llaves</option>
                                          <option value="Con acompañamiento de mi parte en las visitas de interesados">Acompañamiento personal visitas</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* STEP 2: Detalles Físicos y Dimensiones */}
                  {currentStep === 2 && (
                    <div className="space-y-6 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">2</span>
                        Características Físicas
                      </h4>

                      {/* Card 1: Medidas y Naturaleza */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                          <Ruler className="w-16 h-16" />
                        </div>
                        <div className="flex items-center gap-2 mb-1 relative z-10">
                          <Ruler className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Medidas y Naturaleza</h5>
                        </div>
                        <div className="grid grid-cols-12 gap-4 relative z-10">
                          <div className="col-span-12 md:col-span-6">
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">TIPO DE INMUEBLE</label>
                            <select 
                              value={formData.propertyType} 
                              onChange={e => setFormData({ ...formData, propertyType: e.target.value })}
                              className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                            >
                              {["Apartamento", "Apartaestudio", "Casa", "Local", "Oficina", "Bodega", "Lote", "Edificio", "Casa Lote", "Casa Campestre"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          <div className="col-span-6 md:col-span-6">
                            <label className="text-[10px] text-stone-600 font-bold block mb-1 flex justify-between">
                              ÁREA (m²)
                              <AnimatePresence>
                                {formData.area && parseInt(String(formData.area)) > 0 && (
                                   <motion.span 
                                     initial={{ scale: 0, opacity: 0 }}
                                     animate={{ scale: 1, opacity: 1 }}
                                     exit={{ scale: 0, opacity: 0 }}
                                     className="text-brand-gold-dark-dark text-[8px] font-mono tracking-wider uppercase"
                                   >
                                      {parseInt(String(formData.area)) > 100 ? 'Amplio ✨' : 'Compacto'}
                                   </motion.span>
                                )}
                              </AnimatePresence>
                            </label>
                            <div className="relative">
                              <input 
                                type="number" required value={formData.area} min="1"
                                onChange={e => setFormData({ ...formData, area: e.target.value })}
                                placeholder="Ej. 65" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors font-bold pr-8"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <span className={`font-mono font-bold text-xs ${formData.area ? 'text-brand-gold-dark-dark' : 'text-stone-400'}`}>m²</span>
                              </div>
                            </div>
                            <div className="h-1 w-full bg-stone-100 rounded-full mt-1.5 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((parseInt(String(formData.area || '0')) / 200) * 100, 100)}%` }}
                                className="h-full bg-gradient-to-r from-[#B5945B] to-[#D4AF37]"
                              />
                            </div>
                          </div>
                          
                          <div className="col-span-6 md:col-span-4">
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">ANTIGÜEDAD (AÑOS)</label>
                            <input 
                              type="text" required value={formData.propertyAge} 
                              onChange={e => setFormData({ ...formData, propertyAge: e.target.value })}
                              placeholder="Ej. 5" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                            />
                          </div>
                          <div className="col-span-6 md:col-span-4">
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">ESTRATO (1-7)</label>
                            <select 
                              value={formData.estrato} 
                              onChange={e => setFormData({ ...formData, estrato: e.target.value })}
                              className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                            >
                              {["1", "2", "3", "4", "5", "6", "7", "Campestre", "Comercial"].map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                          </div>
                          <div className="col-span-12 md:col-span-4">
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">N° DE PISO (UBICACIÓN)</label>
                            <input 
                              type="text" required value={formData.floorNumber} 
                              onChange={e => setFormData({ ...formData, floorNumber: e.target.value })}
                              placeholder="Ej. 3 o 10" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Capacidad */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Home className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Capacidad Métrica</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">CANTIDAD DE HABITACIONES</label>
                            <div className="flex rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                              <button type="button" onClick={() => setFormData({ ...formData, roomsCount: Math.max(0, parseInt(String(formData.roomsCount)) - 1).toString() })} className="px-5 py-2.5 bg-white hover:bg-stone-100 transition-colors font-bold text-stone-600 border-r border-stone-200">-</button>
                              <input 
                                type="number" required min="0" value={formData.roomsCount} 
                                onChange={e => setFormData({ ...formData, roomsCount: e.target.value })}
                                className="w-full bg-white text-center text-sm font-bold p-2 outline-none"
                              />
                              <button type="button" onClick={() => setFormData({ ...formData, roomsCount: (parseInt(String(formData.roomsCount)) + 1).toString() })} className="px-5 py-2.5 bg-white hover:bg-stone-100 transition-colors font-bold text-stone-600 border-l border-stone-200">+</button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">CANTIDAD DE BAÑOS</label>
                            <div className="flex rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                              <button type="button" onClick={() => setFormData({ ...formData, bathroomsCount: Math.max(0, parseInt(String(formData.bathroomsCount)) - 1).toString() })} className="px-5 py-2.5 bg-white hover:bg-stone-100 transition-colors font-bold text-stone-600 border-r border-stone-200">-</button>
                              <input 
                                type="number" required min="0" value={formData.bathroomsCount} 
                                onChange={e => setFormData({ ...formData, bathroomsCount: e.target.value })}
                                className="w-full bg-white text-center text-sm font-bold p-2 outline-none"
                              />
                              <button type="button" onClick={() => setFormData({ ...formData, bathroomsCount: (parseInt(String(formData.bathroomsCount)) + 1).toString() })} className="px-5 py-2.5 bg-white hover:bg-stone-100 transition-colors font-bold text-stone-600 border-l border-stone-200">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Distribución, Equipamiento y Adicionales */}
                  {currentStep === 3 && (
                    <div className="space-y-6 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">3</span>
                        Distribución Interna y Equipamiento
                      </h4>

                      {/* Card 1: Identificación e Internos (Cocina, Vista) */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Layers className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Identificación y Acabados</h5>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">IDENTIFICACIÓN DEL INMUEBLE</label>
                            <select 
                              value={formData.idTypeDescription} 
                              onChange={e => setFormData({ ...formData, idTypeDescription: e.target.value })}
                              className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                            >
                              <option value="Número">Solo el Número</option>
                              <option value="Torre y número">Torre y número</option>
                            </select>
                          </div>
                          {formData.idTypeDescription === 'Torre y número' && (
                            <div className="animate-fade-in">
                              <label className="text-[10px] text-stone-600 font-bold block mb-1">LETRA / NÚMERO DE TORRE</label>
                              <input 
                                type="text" value={formData.towerLetter} 
                                onChange={e => setFormData({ ...formData, towerLetter: e.target.value })}
                                placeholder="Ej. Torre B" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                              />
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">NÚMERO DE INMUEBLE</label>
                            <input 
                              type="text" required value={formData.propertyNumber} 
                              onChange={e => setFormData({ ...formData, propertyNumber: e.target.value })}
                              placeholder="Ej. Apto 502" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs font-mono font-bold outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-stone-200">
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">¿TIPO DE VISTA?</label>
                            <select value={formData.viewType} onChange={e => setFormData({ ...formData, viewType: e.target.value })} className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors">
                              <option value="">Seleccione...</option>
                              <option value="Interior">Interior</option>
                              <option value="Exterior">Exterior</option>
                              <option value="Interior y Exterior">Interior y Exterior</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">TIPO DE COCINA</label>
                            <select value={formData.kitchenType} onChange={e => setFormData({ ...formData, kitchenType: e.target.value })} className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors">
                              <option value="">Seleccione...</option>
                              <option value="Integral">Integral</option>
                              <option value="Semi-Integral">Semi-Integral</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">ESTILO DE COCINA</label>
                            <select value={formData.kitchenStyle} onChange={e => setFormData({ ...formData, kitchenStyle: e.target.value })} className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors">
                              <option value="">Seleccione...</option>
                              <option value="Abierta(CO)">Abierta (CO)</option>
                              <option value="cerrada">Cerrada</option>
                              <option value="Americana">Americana</option>
                              <option value="Isla">Isla</option>
                              <option value="U">U</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">CALENTADOR</label>
                            <select value={formData.heaterType} onChange={e => setFormData({ ...formData, heaterType: e.target.value })} className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors">
                              <option value="">Seleccione...</option>
                              <option value="Gas">Gas</option>
                              <option value="Eléctrico">Eléctrico</option>
                              <option value="Caldera">Caldera</option>
                              <option value="N/A">N/A</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Garajes y Depósitos */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                          <Car className="w-16 h-16" />
                        </div>
                        <div className="flex items-center gap-2 mb-1 relative z-10">
                          <Car className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Garajes y Depósitos</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">GARAJES DISPONIBLES</label>
                            <select 
                              value={formData.garagesCount} 
                              onChange={e => setFormData({ ...formData, garagesCount: e.target.value })}
                              className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors cursor-pointer"
                            >
                              {["Ningun", "Comunal", "1", "2", "3", "4", "5"].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>
                          {formData.garagesCount !== 'Ningun' && formData.garagesCount !== 'Comunal' && (
                            <>
                              <div className="animate-fade-in">
                                <label className="text-[10px] text-stone-600 font-bold block mb-1">DISTRIBUCIÓN</label>
                                <select 
                                  value={formData.garageServitude} 
                                  onChange={e => setFormData({ ...formData, garageServitude: e.target.value })}
                                  className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                                >
                                  <option value="Independiente">Independiente</option>
                                  <option value="Servidumbre">Servidumbre</option>
                                </select>
                              </div>
                              <div className="animate-fade-in">
                                <label className="text-[10px] text-stone-600 font-bold block mb-1">TIPO DE GARAJE</label>
                                <select 
                                  value={formData.garageCovered} 
                                  onChange={e => setFormData({ ...formData, garageCovered: e.target.value })}
                                  className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                                >
                                  <option value="Cubierto">Cubierto</option>
                                  <option value="Descubierto">Descubierto</option>
                                </select>
                              </div>
                              <div className="md:col-span-3 animate-fade-in">
                                <label className="text-[10px] text-stone-600 font-bold block mb-1">N° ASIGNADO DEL GARAJE</label>
                                <input 
                                  type="text" value={formData.garageAssignedNumber} 
                                  onChange={e => setFormData({ ...formData, garageAssignedNumber: e.target.value })}
                                  placeholder="Ej. 12A, Sótano 2..." className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-200 relative z-10">
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">¿TIENE DEPÓSITO?</label>
                            <select 
                              value={formData.hasDeposit} 
                              onChange={e => setFormData({ ...formData, hasDeposit: e.target.value })}
                              className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors cursor-pointer"
                            >
                              <option value="ㅤ">Ninguno</option>
                              <option value="Depositoㅤ">Sí, asume depósito</option>
                            </select>
                          </div>
                          {formData.hasDeposit === 'Depositoㅤ' && (
                            <div className="animate-fade-in">
                              <label className="text-[10px] text-stone-600 font-bold block mb-1">NÚMERO DE DEPÓSITO</label>
                              <input 
                                type="text" required value={formData.depositNumber} 
                                onChange={e => setFormData({ ...formData, depositNumber: e.target.value })}
                                placeholder="N° de depósito" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card 3: Electrodomésticos */}
                      <div className="p-4 bg-amber-500/5 border border-brand-gold/30 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Medidas de Electrodomésticos</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-stone-700">
                          <div className="space-y-2">
                            <span className="font-bold text-stone-800">Espacio de Nevera:</span>
                            <div className="grid grid-cols-3 gap-2">
                              <input 
                                type="number" step="0.01" value={formData.fridgeAncho} 
                                onChange={e => setFormData({ ...formData, fridgeAncho: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-lg p-2 text-center outline-none transition-colors" placeholder="Ancho (m)"
                              />
                              <input 
                                type="number" step="0.01" value={formData.fridgeLargo} 
                                onChange={e => setFormData({ ...formData, fridgeLargo: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-lg p-2 text-center outline-none transition-colors" placeholder="Largo (m)"
                              />
                              <input 
                                type="number" step="0.01" value={formData.fridgeAlto} 
                                onChange={e => setFormData({ ...formData, fridgeAlto: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-lg p-2 text-center outline-none transition-colors" placeholder="Alto (m)"
                              />
                            </div>
                            <div className="text-[10px] font-mono text-stone-500 p-2 bg-stone-100/50 rounded-lg border border-stone-200">
                              Formato final: A: {Number(formData.fridgeAncho).toFixed(2)}m x L: {Number(formData.fridgeLargo).toFixed(2)}m x AL: {Number(formData.fridgeAlto).toFixed(2)}m
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[11px] font-semibold">¿Punto de agua?</span>
                              {["SI", "NO"].map(opt => (
                                <button 
                                  key={opt} type="button" 
                                  onClick={() => setFormData({ ...formData, fridgeWaterPoint: opt })}
                                  className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${formData.fridgeWaterPoint === opt ? 'bg-stone-900 text-brand-gold-dark' : 'bg-white border border-stone-200 hover:bg-stone-50 text-stone-600'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="font-bold text-stone-800">Espacio de Lavadora:</span>
                            <div className="grid grid-cols-3 gap-2">
                              <input 
                                type="number" step="0.01" value={formData.washingAncho} 
                                onChange={e => setFormData({ ...formData, washingAncho: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-lg p-2 text-center outline-none transition-colors" placeholder="Ancho (m)"
                              />
                              <input 
                                type="number" step="0.01" value={formData.washingLargo} 
                                onChange={e => setFormData({ ...formData, washingLargo: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-lg p-2 text-center outline-none transition-colors" placeholder="Largo (m)"
                              />
                              <input 
                                type="number" step="0.01" value={formData.washingAlto} 
                                onChange={e => setFormData({ ...formData, washingAlto: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-lg p-2 text-center outline-none transition-colors" placeholder="Alto (m)"
                              />
                            </div>
                            <div className="text-[10px] font-mono text-stone-500 p-2 bg-stone-100/50 rounded-lg border border-stone-200">
                              Formato final: A: {Number(formData.washingAncho).toFixed(2)}m x L: {Number(formData.washingLargo).toFixed(2)}m x AL: {Number(formData.washingAlto).toFixed(2)}m
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[11px] font-semibold">¿Punto de gas?</span>
                              {["SI", "NO"].map(opt => (
                                <button 
                                  key={opt} type="button" 
                                  onClick={() => setFormData({ ...formData, washingGasPoint: opt })}
                                  className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${formData.washingGasPoint === opt ? 'bg-stone-900 text-brand-gold-dark' : 'bg-white border border-stone-200 hover:bg-stone-50 text-stone-600'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Camas (Accordion) */}
                      {parseInt(String(formData.roomsCount)) > 0 && (
                        <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <button 
                            type="button"
                            onClick={() => setShowBeds(!showBeds)}
                            className="w-full p-4 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <BedDouble className="w-5 h-5 text-brand-gold-dark" />
                              <h5 className="font-bold text-sm text-stone-900">Distribución de Camas Sugeridas</h5>
                              {formData.bedPrincipal && (
                                <span className="ml-2 bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Configurado</span>
                              )}
                            </div>
                            {showBeds ? <ChevronUp className="w-5 h-5 text-stone-500" /> : <ChevronDown className="w-5 h-5 text-stone-500" />}
                          </button>
                          
                          <AnimatePresence>
                            {showBeds && (
                              <motion.div 
                                initial={{ height: 0 }} 
                                animate={{ height: 'auto' }} 
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 bg-white border-t border-stone-200 space-y-4">
                                  <p className="text-xs text-stone-500 italic">Configure qué cama cabe en cada habitación con sus mesas de noche para sugerir al cliente potencial.</p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <span className="text-[10px] font-bold text-stone-600 block mb-1">HABITACIÓN PRINCIPAL</span>
                                      <select 
                                        value={formData.bedPrincipal} 
                                        onChange={e => setFormData({ ...formData, bedPrincipal: e.target.value })}
                                        className="w-full bg-stone-50 border border-stone-200 focus:border-brand-gold rounded-xl p-2.5 text-[11px] outline-none transition-colors"
                                      >
                                        <option value="">No configurar...</option>
                                        <option value="Dormitorio principal: Cama individual (sencilla) + Mesas de noche (0.90 m + 0.60 m x 2) en total: 2.10 m">Cama sencilla (2.10 m)</option>
                                        <option value="Dormitorio principal: Cama semidoble + Mesas de noche (1.20 m + 0.60 m x 2) en total: 2.40 m">Cama semidoble (2.40 m)</option>
                                        <option value="Dormitorio principal: Cama doble (matrimonial) + Mesas de noche (1.35 m + 0.60 m x 2) en total: 2.55 m">Cama doble (2.55 m)</option>
                                        <option value="Dormitorio principal: Cama queen + Mesas de noche (1.50 m + 0.60 m x 2) en total: 2.70 m">Cama queen (2.70 m)</option>
                                        <option value="Dormitorio principal: Cama king + Mesas de noche (2.00 m + 0.60 m x 2) en total: 3.20 m">Cama king (3.20 m)</option>
                                        <option value="Dormitorio principal: Cama súper king + Mesas de noche (2.20 m + 0.60 m x 2) en total: 3.40 m">Cama súper king (3.40 m)</option>
                                      </select>
                                    </div>

                                    {parseInt(String(formData.roomsCount)) >= 2 && (
                                      <div>
                                        <span className="text-[10px] font-bold text-stone-600 block mb-1">HABITACIÓN SECUNDARIA</span>
                                        <select 
                                          value={formData.bedSecondary} 
                                          onChange={e => setFormData({ ...formData, bedSecondary: e.target.value })}
                                          className="w-full bg-stone-50 border border-stone-200 focus:border-brand-gold rounded-xl p-2.5 text-[11px] outline-none transition-colors"
                                        >
                                          <option value="">No configurar...</option>
                                          <option value="Dormitorio secundario: Cama individual (sencilla) + Mesas de noche (0.90 m + 0.60 m x 2) en total: 2.10 m">Cama sencilla (2.10 m)</option>
                                          <option value="Dormitorio secundario: Cama semidoble + Mesas de noche (1.20 m + 0.60 m x 2) en total: 2.40 m">Cama semidoble (2.40 m)</option>
                                          <option value="Dormitorio secundario: Cama doble (matrimonial) + Mesas de noche (1.35 m + 0.60 m x 2) en total: 2.55 m">Cama doble (2.55 m)</option>
                                          <option value="Dormitorio secundario: Cama queen + Mesas de noche (1.50 m + 0.60 m x 2) en total: 2.70 m">Cama queen (2.70 m)</option>
                                          <option value="Dormitorio secundario: Cama king + Mesas de noche (2.00 m + 0.60 m x 2) en total: 3.20 m">Cama king (3.20 m)</option>
                                          <option value="Dormitorio secundario: Cama súper king + Mesas de noche (2.20 m + 0.60 m x 2) en total: 3.40 m">Cama súper king (3.40 m)</option>
                                        </select>
                                      </div>
                                    )}

                                    {parseInt(String(formData.roomsCount)) >= 3 && (
                                      <div>
                                        <span className="text-[10px] font-bold text-stone-600 block mb-1">HABITACIÓN TERCIARIA</span>
                                        <select 
                                          value={formData.bedTertiary} 
                                          onChange={e => setFormData({ ...formData, bedTertiary: e.target.value })}
                                          className="w-full bg-stone-50 border border-stone-200 focus:border-brand-gold rounded-xl p-2.5 text-[11px] outline-none transition-colors"
                                        >
                                          <option value="">No configurar...</option>
                                          <option value="Dormitorio terciario: Cama individual (sencilla) + Mesas de noche (0.90 m + 0.60 m x 2) en total: 2.10 m">Cama sencilla (2.10 m)</option>
                                          <option value="Dormitorio terciario: Cama semidoble + Mesas de noche (1.20 m + 0.60 m x 2) en total: 2.40 m">Cama semidoble (2.40 m)</option>
                                          <option value="Dormitorio terciario: Cama doble (matrimonial) + Mesas de noche (1.35 m + 0.60 m x 2) en total: 2.55 m">Cama doble (2.55 m)</option>
                                          <option value="Dormitorio terciario: Cama queen + Mesas de noche (1.50 m + 0.60 m x 2) en total: 2.70 m">Cama queen (2.70 m)</option>
                                          <option value="Dormitorio terciario: Cama king + Mesas de noche (2.00 m + 0.60 m x 2) en total: 3.20 m">Cama king (3.20 m)</option>
                                          <option value="Dormitorio terciario: Cama súper king + Mesas de noche (2.20 m + 0.60 m x 2) en total: 3.40 m">Cama súper king (3.40 m)</option>
                                        </select>
                                      </div>
                                    )}

                                    {parseInt(String(formData.roomsCount)) >= 4 && (
                                      <div>
                                        <span className="text-[10px] font-bold text-stone-600 block mb-1">HABITACIÓN CUATERNARIA</span>
                                        <select 
                                          value={formData.bedQuaternary} 
                                          onChange={e => setFormData({ ...formData, bedQuaternary: e.target.value })}
                                          className="w-full bg-stone-50 border border-stone-200 focus:border-brand-gold rounded-xl p-2.5 text-[11px] outline-none transition-colors"
                                        >
                                          <option value="">No configurar...</option>
                                          <option value="Dormitorio Cuaternario: Cama individual (sencilla) + Mesas de noche (0.90 m + 0.60 m x 2) en total: 2.10 m">Cama sencilla (2.10 m)</option>
                                          <option value="Dormitorio Cuaternario: Cama semidoble + Mesas de noche (1.20 m + 0.60 m x 2) en total: 2.40 m">Cama semidoble (2.40 m)</option>
                                          <option value="Dormitorio Cuaternario: Cama doble (matrimonial) + Mesas de noche (1.35 m + 0.60 m x 2) en total: 2.55 m">Cama doble (2.55 m)</option>
                                          <option value="Dormitorio Cuaternario: Cama queen + Mesas de noche (1.50 m + 0.60 m x 2) en total: 2.70 m">Cama queen (2.70 m)</option>
                                          <option value="Dormitorio Cuaternario: Cama king + Mesas de noche (2.00 m + 0.60 m x 2) en total: 3.20 m">Cama king (3.20 m)</option>
                                          <option value="Dormitorio Cuaternario: Cama súper king + Mesas de noche (2.20 m + 0.60 m x 2) en total: 3.40 m">Cama súper king (3.40 m)</option>
                                        </select>
                                      </div>
                                    )}

                                    {parseInt(String(formData.roomsCount)) >= 5 && (
                                      <div>
                                        <span className="text-[10px] font-bold text-stone-600 block mb-1">HABITACIÓN QUINARIA</span>
                                        <select 
                                          value={formData.bedQuinary} 
                                          onChange={e => setFormData({ ...formData, bedQuinary: e.target.value })}
                                          className="w-full bg-stone-50 border border-stone-200 focus:border-brand-gold rounded-xl p-2.5 text-[11px] outline-none transition-colors"
                                        >
                                          <option value="">No configurar...</option>
                                          <option value="Dormitorio Quinario: Cama individual (sencilla) + Mesas de noche (0.90 m + 0.60 m x 2) en total: 2.10 m">Cama sencilla (2.10 m)</option>
                                          <option value="Dormitorio Quinario: Cama semidoble + Mesas de noche (1.20 m + 0.60 m x 2) en total: 2.40 m">Cama semidoble (2.40 m)</option>
                                          <option value="Dormitorio Quinario: Cama doble (matrimonial) + Mesas de noche (1.35 m + 0.60 m x 2) en total: 2.55 m">Cama doble (2.55 m)</option>
                                          <option value="Dormitorio Quinario: Cama queen + Mesas de noche (1.50 m + 0.60 m x 2) en total: 2.70 m">Cama queen (2.70 m)</option>
                                          <option value="Dormitorio Quinario: Cama king + Mesas de noche (2.00 m + 0.60 m x 2) en total: 3.20 m">Cama king (3.20 m)</option>
                                          <option value="Dormitorio Quinario: Cama súper king + Mesas de noche (2.20 m + 0.60 m x 2) en total: 3.40 m">Cama súper king (3.40 m)</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Zonas y Características Internas List */}
                      <div className="pt-4 border-t border-stone-100 mt-4 bg-white p-4 rounded-2xl border border-stone-200">
                        <label className="text-sm text-stone-900 font-bold block mb-4 text-center uppercase tracking-widest font-mono text-[#8A631F]">ZONAS Y CARACTERÍSTICAS INTERNAS</label>
                        <FeaturesGridSelector currentAnswers={formData.gridAnswers} category="internas" onAnswersChange={(ans) => setFormData(prev => ({ ...prev, gridAnswers: ans }))} />
                        <div className="mt-6 border-t border-stone-100 pt-4">
                          <label className="text-xs text-stone-600 font-bold block mb-1">OTRAS ZONAS INTERNAS (Texto libre)</label>
                          <textarea 
                            className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors" 
                            placeholder="Ej. Cuarto de hobbies, cava de vinos, cuarto de herramientas..."
                            rows={2} value={formData.otherInternal}
                            onChange={e => setFormData({ ...formData, otherInternal: e.target.value })}
                          />
                        </div>
                      </div>

                    </div>
                  )}

                  {/* STEP 4: Zonas Externas */}
                  {currentStep === 4 && (
                    <div className="space-y-6 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">4</span>
                        Zonas Externas y Entorno
                      </h4>

                      {/* Card 1: Características Generales */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                          <MapPin className="w-16 h-16" />
                        </div>
                        <div className="flex items-center gap-2 mb-1 relative z-10">
                          <MapPin className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Características del Entorno</h5>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">TIPO DE VIGILANCIA</label>
                            <select value={formData.vigilanceType} onChange={e => setFormData({ ...formData, vigilanceType: e.target.value })} className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors">
                              <option value="">Seleccione...</option>
                              <option value="vigilancia de celaduría">De celaduría</option>
                              <option value="vigilancia electrónica">Electrónica</option>
                              <option value="puerta de seguridad">Puerta de seguridad</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">TIPO DE ZONA</label>
                            <select value={formData.sectorZoneType} onChange={e => setFormData({ ...formData, sectorZoneType: e.target.value })} className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors">
                              <option value="">Seleccione...</option>
                              <option value="Residencial">Residencial</option>
                              <option value="Comercial">Comercial</option>
                              <option value="Industrial">Industrial</option>
                              <option value="Campestre">Campestre</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">TIPO DE VÍA</label>
                            <select value={formData.sectorWayType} onChange={e => setFormData({ ...formData, sectorWayType: e.target.value })} className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors">
                              <option value="">Seleccione...</option>
                              <option value="Principal">Principal</option>
                              <option value="Secundaria">Secundaria</option>
                              <option value="Privada">Privada</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">DISEÑO DEL INMUEBLE</label>
                            <select value={formData.propertyDesign} onChange={e => setFormData({ ...formData, propertyDesign: e.target.value })} className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors">
                              <option value="">Seleccione...</option>
                              <option value="Convencional">Convencional</option>
                              <option value="Pent House">Pent House</option>
                              <option value="Loft">Loft</option>
                              <option value="Duplex">Duplex</option>
                              <option value="Triplex">Triplex</option>
                              <option value="Cuadruplex">Cuadruplex</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Mascotas */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Política de Mascotas</h5>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">¿SE PERMITEN MASCOTAS?</label>
                            <div className="flex gap-2">
                              {["SI", "NO"].map(opt => (
                                <button
                                  key={opt} type="button"
                                  onClick={() => setFormData({ ...formData, allowsPets: opt })}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                    formData.allowsPets === opt 
                                      ? 'bg-stone-900 text-brand-gold-dark border-stone-900' 
                                      : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {formData.allowsPets === 'SI' && (
                            <div className="animate-fade-in">
                              <label className="text-[10px] text-stone-600 font-bold block mb-1">¿QUÉ TIPO DE MASCOTAS?</label>
                              <select 
                                value={formData.petTypes} 
                                onChange={e => setFormData({ ...formData, petTypes: e.target.value })} 
                                className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-2.5 text-xs mb-2 outline-none transition-colors"
                              >
                                <option value="Todas las mascotas">Todas las mascotas</option>
                                <option value="Solo perros">Solo perros</option>
                                <option value="Solo gatos">Solo gatos</option>
                                <option value="Solo perros y gatos">Solo perros y gatos</option>
                                <option value="Editar">Editar (Especificar otra)</option>
                              </select>
                              
                              {formData.petTypes === 'Editar' && (
                                <input 
                                  type="text" 
                                  value={formData.customPetType}
                                  onChange={e => setFormData({ ...formData, customPetType: e.target.value })}
                                  placeholder="Ej. Perros pequeños, aves..."
                                  className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-2.5 text-xs animate-fade-in outline-none transition-colors"
                                  autoFocus
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Zonas Comunales List */}
                      <div className="pt-4 border-t border-stone-100 mt-4 bg-white p-4 rounded-2xl border border-stone-200">
                        <label className="text-sm text-stone-900 font-bold block mb-4 text-center uppercase tracking-widest font-mono text-[#8A631F]">ZONAS COMUNALES Y EXTERNAS</label>
                        <FeaturesGridSelector currentAnswers={formData.gridAnswers} category="externas" onAnswersChange={(ans) => setFormData(prev => ({ ...prev, gridAnswers: ans }))} />
                        
                        <div className="mt-6 border-t border-stone-100 pt-4">
                          <label className="text-xs text-stone-600 font-bold block mb-1">OTRAS ZONAS EXTERNAS (Texto libre)</label>
                          <textarea 
                            className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors" 
                            placeholder="Ej. Huerta comunitaria, zona pet-friendly, cuarto de escoltas..."
                            rows={2} value={formData.otherExternal}
                            onChange={e => setFormData({ ...formData, otherExternal: e.target.value })}
                          />
                        </div>
                        <div className="mt-4">
                          <label className="text-xs text-stone-600 font-bold block mb-1">OTROS COMENTARIOS O DESCRIPCIÓN ADICIONAL</label>
                          <textarea 
                            rows={3} value={formData.additionalDescription}
                            onChange={e => setFormData({ ...formData, additionalDescription: e.target.value })}
                            placeholder="Escribe detalles adicionales..."
                            className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                          />
                        </div>
                      </div>

                    </div>
                  )}

                  {/* STEP 5: Datos del Propietario */}
                  {currentStep === 5 && (
                    <div className="space-y-6 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">5</span>
                        Datos Personales del Propietario
                      </h4>

                      {/* Card 1: Identificación */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Identificación Básica</h5>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-stone-600 font-bold block mb-1">NOMBRES Y APELLIDOS</label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 w-4 h-4" />
                              <input 
                                type="text" required value={formData.name} 
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Juan Pérez" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl py-3 pl-10 pr-3 text-xs outline-none transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-stone-600 font-bold block mb-1">DOCUMENTO DE IDENTIDAD</label>
                            <div className="flex gap-2">
                              <select 
                                value={formData.documentType} 
                                onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-2.5 text-xs w-24 outline-none transition-colors"
                              >
                                <option value="CC">C.C.</option>
                                <option value="CE">C.E.</option>
                                <option value="Pasaporte">PAS</option>
                                <option value="NIT">N.I.T</option>
                              </select>
                              <div className="relative w-full">
                                <input 
                                  type="text" required value={new Intl.NumberFormat('es-CO').format(Number(formData.documentNumber || 0)).replace(/^0$/, '')}
                                  onChange={e => setFormData({ ...formData, documentNumber: e.target.value.replace(/\D/g, '') })}
                                  placeholder="Número documento" className={`w-full bg-white border rounded-xl py-3 px-3 text-xs font-mono pr-10 outline-none transition-colors ${
                                    formData.documentNumber.length > 5 ? 'border-emerald-500 bg-emerald-50/30' :
                                    (shakeErrors && !formData.documentNumber) ? 'border-red-500 bg-red-50 animate-shake' : 'border-stone-200 focus:border-stone-400'
                                  }`}
                                />
                                {formData.documentNumber.length > 5 && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in duration-300">
                                    <Check className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {formData.documentNumber.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in pt-2">
                            <div>
                              <label className="text-xs text-stone-600 font-bold block mb-1 flex justify-between">
                                <span>REPETIR DOCUMENTO</span>
                              </label>
                              <div className="relative">
                                <input 
                                  type="text" required value={new Intl.NumberFormat('es-CO').format(Number(formData.confirmDocumentNumber || 0)).replace(/^0$/, '')}
                                  onChange={e => setFormData({ ...formData, confirmDocumentNumber: e.target.value.replace(/\D/g, '') })}
                                  placeholder="Confirma documento" className={`w-full bg-white border rounded-xl py-3 px-4 text-xs font-mono outline-none pr-10 transition-colors ${
                                    formData.confirmDocumentNumber ? (formData.documentNumber === formData.confirmDocumentNumber ? 'border-emerald-500 bg-emerald-50/30' : 'border-rose-400 bg-rose-50/30') : 
                                    (shakeErrors && !formData.confirmDocumentNumber) ? 'border-red-500 bg-red-50 animate-shake' : 'border-stone-200 focus:border-stone-400'
                                  }`}
                                />
                                {formData.confirmDocumentNumber && formData.documentNumber === formData.confirmDocumentNumber && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in duration-300">
                                    <Check className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-stone-500 font-bold block mb-1">CIUDAD EXPEDICIÓN</label>
                                <input 
                                  type="text" required value={formData.documentCityOfExpedition}
                                  onChange={e => setFormData({ ...formData, documentCityOfExpedition: e.target.value })}
                                  placeholder="Ej. Bogotá" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-stone-500 font-bold block mb-1">PAÍS EXPEDICIÓN</label>
                                <input 
                                  type="text" required value={formData.documentCountryOfExpedition}
                                  onChange={e => setFormData({ ...formData, documentCountryOfExpedition: e.target.value })}
                                  className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs outline-none transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {formData.documentNumber === formData.confirmDocumentNumber && formData.documentNumber !== validatedCedula && formData.documentNumber.length > 5 && (
                          <div className="animate-in slide-in-from-top-2 p-4 bg-amber-50 border border-amber-200 rounded-xl mt-4">
                            <p className="text-xs text-amber-800 font-bold mb-3">Has modificado el documento de identidad. Debes validarlo nuevamente para continuar.</p>
                            <button
                              type="button"
                              disabled={revalidatingCedula}
                              onClick={async () => {
                                setRevalidatingCedula(true);
                                try {
                                  const response = await fetch('https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec', {
                                    method: 'POST',
                                    body: JSON.stringify({ accion: 'consultarPropietario', cedula: formData.documentNumber }),
                                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                                  });
                                  const data = await response.json();
                                  setValidatedCedula(formData.documentNumber);
                                  
                                  if (data.success && data.propietario) {
                                    setCedulaInput(formData.documentNumber);
                                    setCedulaStatus('found');
                                    setOwnerProperties(data.inmuebles || []);
                                    setFormData(p => ({ 
                                      ...p, 
                                      name: data.propietario.nombre, 
                                      email: data.propietario.email || '',
                                      confirmEmail: data.propietario.email || '',
                                      phone: data.propietario.celular || '',
                                      confirmPhone: data.propietario.celular || ''
                                    }));
                                    setCurrentStep(0);
                                  }
                                } catch (error) {
                                  console.error("Error validando cédula:", error);
                                } finally {
                                  setRevalidatingCedula(false);
                                }
                              }}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider"
                            >
                              {revalidatingCedula ? 'Validando...' : 'Re-Validar Documento'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card 2: Contacto */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Datos de Contacto</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-stone-600 font-bold block mb-1">CELULAR (WHATSAPP)</label>
                            <div className={`flex border rounded-xl transition-colors relative ${
                              formData.phone && isPhoneValid(String(formData.phone || ''), formData.countryCode) ? 'border-emerald-500 bg-emerald-50/30' : 
                              (shakeErrors && !formData.phone) ? 'border-red-500 bg-red-50 animate-shake' : 
                              'bg-white border-stone-200 focus-within:border-brand-gold'
                            }`}>
                              <PhoneCountrySelector 
                                value={formData.countryCode} 
                                onChange={code => setFormData({ ...formData, countryCode: code })} 
                              />
                              <input 
                                type="tel" required value={formData.phone} maxLength={ALL_COUNTRIES.find(c => c.code === formData.countryCode)?.maxLength || 10}
                                onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                placeholder="Celular" className="w-full bg-transparent py-3 px-3 text-xs font-mono font-bold outline-none pr-10"
                              />
                              {formData.phone && isPhoneValid(String(formData.phone || ''), formData.countryCode) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in duration-300">
                                  <Check className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {formData.phone.length > 0 && (
                            <div className="animate-fade-in relative">
                              <label className="text-xs text-stone-600 font-bold flex justify-between mb-1">
                                <span>CONFIRMAR CELULAR</span>
                              </label>
                              <div className="relative">
                                <input 
                                  type="tel" required value={formData.confirmPhone} maxLength={ALL_COUNTRIES.find(c => c.code === formData.countryCode)?.maxLength || 10}
                                  onChange={e => setFormData({ ...formData, confirmPhone: e.target.value.replace(/\D/g, '') })}
                                  placeholder="Confirma celular" className={`w-full bg-white border rounded-xl py-3 px-4 text-xs font-mono outline-none pr-10 transition-colors ${
                                    formData.confirmPhone ? (formData.phone === formData.confirmPhone ? 'border-emerald-500 bg-emerald-50/30' : 'border-rose-400 bg-rose-50/30') : 
                                    (shakeErrors && !formData.confirmPhone) ? 'border-red-500 bg-red-50 animate-shake' : 'border-stone-200 focus:border-stone-400'
                                  }`}
                                />
                                {formData.confirmPhone && formData.phone === formData.confirmPhone && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in duration-300">
                                    <Check className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="text-xs text-stone-600 font-bold block mb-1">CORREO ELECTRÓNICO</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 w-4 h-4" />
                              <input 
                                type="email" required value={formData.email} 
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="juan@correo.com" className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl py-3 pl-10 pr-3 text-xs outline-none transition-colors"
                              />
                            </div>
                          </div>
                          {formData.email.length > 0 && (
                            <div className="animate-fade-in">
                              <label className="text-xs text-stone-600 font-bold flex justify-between mb-1">
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
                                placeholder="Confirma correo" className={`w-full bg-white border rounded-xl py-3 px-4 text-xs outline-none transition-colors ${
                                  formData.confirmEmail ? (String(formData.email || '').toLowerCase() === String(formData.confirmEmail || '').toLowerCase() ? 'border-emerald-500 bg-emerald-50/30' : 'border-rose-400 bg-rose-50/30') : 'border-stone-200 focus:border-stone-400'
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
                      </div>

                      {/* VIP Card preview rendering dynamically */}
                      {String(formData.name || '').trim() !== '' && (
                        <div className="p-5 bg-[#1c1917] border border-[#d4af37] rounded-xl shadow-lg relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Star className="w-16 h-16 text-[#d4af37]" />
                          </div>
                          <div className="relative z-10 flex flex-col space-y-3">
                            <div>
                              <span className="text-[#1c1917] font-black tracking-widest text-[10px] bg-[#d4af37] px-2.5 py-1 rounded-sm inline-block mb-2 uppercase">Pre-Registro Cliente VIP</span>
                              <div className="text-[10px] text-[#bda043] font-bold mb-0.5 tracking-wider">CLIENTE TITULAR:</div>
                              <div className="text-white font-bold text-lg uppercase tracking-wide">{String(formData.name).trim()}</div>
                            </div>
                            <div className="flex items-center justify-between border-t border-stone-800 pt-3 mt-1 text-xs">
                              <div className="text-stone-300">
                                <span className="text-stone-500 mr-1 text-[10px]">DOC:</span>
                                <span className="font-mono font-medium">{formData.documentType} {formData.documentNumber}</span>
                              </div>
                              <div className="text-emerald-400 flex items-center gap-1.5 font-bold text-[10px] tracking-widest">
                                <CheckCircle2 className="w-4 h-4" /> <span>VERIFICADO</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 6: Cláusulas y Porcentajes de Negocio */}
                  {currentStep === 6 && (
                    <div className="space-y-6 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">6</span>
                        Cláusulas Legales y Comisión de Acuerdos
                      </h4>

                      {/* Card 1: Tipo de Negocio */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Tipo de Servicio</h5>
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-600 font-bold block mb-1">SELECCIONE EL MODELO DE NEGOCIO</label>
                          <select 
                            value={formData.serviceType} 
                            onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                            className="w-full bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer outline-none transition-colors"
                          >
                            <option value="administracion">Servicio de Administración (Recaudo + Seguro)</option>
                            <option value="corretaje">Servicio de Corretaje (Colocación Simple)</option>
                            <option value="venta">Servicio de Venta Integral</option>
                            <option value="vendi-renta">Vendi-Renta (Doble promoción)</option>
                            <option value="admi-venta">Admi-Venta (Administración con opción de venta)</option>
                          </select>
                        </div>
                      </div>

                      {/* Card 2: Resumen de Cláusulas */}
                      <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                          <ScrollText className="w-16 h-16" />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <ScrollText className="w-4 h-4 text-brand-gold-dark" />
                          <h5 className="font-bold text-sm text-stone-900">Resumen de Cláusulas Contractuales</h5>
                        </div>
                        <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-2 text-xs text-stone-700 relative z-10">
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
                      </div>

                      {/* Card 3: Porcentajes de Gestión */}
                      <div className="p-4 bg-brand-gold/5 border border-brand-gold/30 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Percent className="w-4 h-4 text-[#8A631F]" />
                          <h5 className="font-bold text-sm text-[#8A631F]">Acuerdos de Comisión</h5>
                        </div>

                        {formData.serviceType === 'administracion' && (
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">PORCENTAJE DE COMISIÓN DE GESTIÓN RECURRENTE</label>
                            <select 
                              value={formData.adminPercentSelector} 
                              onChange={e => setFormData({ ...formData, adminPercentSelector: e.target.value })}
                              className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer w-full font-mono font-bold outline-none transition-colors"
                            >
                              <option value="8.5% desde el primer mes">8.5% desde el primer mes (Preferencial)</option>
                              <option value="9.1% desde el segundo mes">9.1% desde el segundo mes</option>
                            </select>
                          </div>
                        )}

                        {formData.serviceType === 'corretaje' && (
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">PORCENTAJE DE COMISIÓN DE CORRETAJE SIMPLE</label>
                            <input 
                              type="text" value={formData.corretajePercent} 
                              onChange={e => setFormData({ ...formData, corretajePercent: e.target.value.replace(/\D/g, '') })}
                              placeholder="100" className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs w-full font-mono font-bold outline-none transition-colors"
                            />
                          </div>
                        )}

                        {formData.serviceType === 'vendi-renta' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div>
                              <label className="text-[10px] text-stone-600 font-bold block mb-1">ARRIENDO PACTADO (%)</label>
                              <input 
                                type="text" value={formData.vendiRentaArriendoPercent} 
                                onChange={e => setFormData({ ...formData, vendiRentaArriendoPercent: e.target.value.replace(/\D/g, '') })}
                                placeholder="100" className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs w-full font-mono font-bold outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-stone-600 font-bold block mb-1">VENTA PACTADO (LETRAS)</label>
                              <select 
                                value={formData.salesCommissionSelector} 
                                onChange={e => setFormData({ ...formData, salesCommissionSelector: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer w-full font-mono font-bold outline-none transition-colors"
                              >
                                <option value="3%">3% (TRES POR CIENTO)</option>
                                <option value="2.5%">2.5% (DOS PUNTO CINCO POR CIENTO)</option>
                                <option value="2%">2% (DOS POR CIENTO)</option>
                                <option value="1.5%">1.5% (UNO PUNTO CINCO POR CIENTO)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {formData.serviceType === 'admi-venta' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div>
                              <label className="text-[10px] text-stone-600 font-bold block mb-1">GESTIÓN RECURRENTE (%)</label>
                              <select 
                                value={formData.admiVentaAdminPercentSelector} 
                                onChange={e => setFormData({ ...formData, admiVentaAdminPercentSelector: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer w-full font-mono font-bold outline-none transition-colors"
                              >
                                <option value="8.5% desde el primer mes">8.5% desde el primer mes (Preferencial)</option>
                                <option value="9.1% desde el segundo mes">9.1% desde el segundo mes</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-stone-600 font-bold block mb-1">VENTA PACTADO (LETRAS)</label>
                              <select 
                                value={formData.admiVentaSalesCommissionSelector} 
                                onChange={e => setFormData({ ...formData, admiVentaSalesCommissionSelector: e.target.value })}
                                className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer w-full font-mono font-bold outline-none transition-colors"
                              >
                                <option value="3%">3% (TRES POR CIENTO)</option>
                                <option value="2.5%">2.5% (DOS PUNTO CINCO POR CIENTO)</option>
                                <option value="2%">2% (DOS POR CIENTO)</option>
                                <option value="1.5%">1.5% (UNO PUNTO CINCO POR CIENTO)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {formData.serviceType === 'venta' && (
                          <div>
                            <label className="text-[10px] text-stone-600 font-bold block mb-1">PORCENTAJE DE CORRETAJE POR VENTA PACTADO</label>
                            <select 
                              value={formData.salesCommissionSelector} 
                              onChange={e => setFormData({ ...formData, salesCommissionSelector: e.target.value })}
                              className="bg-white border border-stone-200 focus:border-brand-gold rounded-xl p-3 text-xs cursor-pointer w-full font-mono font-bold outline-none transition-colors"
                            >
                              <option value="3%">3% (TRES POR CIENTO)</option>
                              <option value="2.5%">2.5% (DOS PUNTO CINCO POR CIENTO)</option>
                              <option value="2%">2% (DOS POR CIENTO)</option>
                              <option value="1.5%">1.5% (UNO PUNTO CINCO POR CIENTO)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Checkbox Aceptación */}
                      <div className="p-4 bg-stone-900 rounded-2xl border border-stone-800 hover:border-brand-gold/50 transition-colors">
                        <label className="flex items-center space-x-3 cursor-pointer select-none">
                          <input 
                            type="checkbox" checked={formData.clausesAccepted}
                            onChange={e => setFormData({ ...formData, clausesAccepted: e.target.checked })}
                            className="w-5 h-5 text-brand-gold border-stone-700 bg-stone-800 rounded focus:ring-brand-gold focus:ring-offset-stone-900 cursor-pointer"
                          />
                          <span className="text-xs text-white font-bold leading-normal">
                            He leído detenidamente y <span className="text-brand-gold">ACEPTO</span> las cláusulas estipuladas del modelo de promoción solicitado.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* STEP 7: Precios y Finalización */}
                  {currentStep === 7 && (
                    <div className="space-y-6 animate-fade-in">
                      <h4 className="text-base font-bold text-stone-900 font-sans flex items-center gap-2 border-b border-stone-100 pb-2">
                        <span className="bg-brand-gold text-stone-950 font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold">7</span>
                        Precios de Comercialización y Declaraciones
                      </h4>

                      {/* Card 1: Avalúo Económico */}
                      <div className="p-4 bg-brand-gold/10 border border-brand-gold rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-[#8A631F]" />
                          <h5 className="font-bold text-sm text-[#8A631F] uppercase tracking-wide">AVALÚO ECONÓMICO FINAL</h5>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.serviceType !== 'venta' && (
                            <div>
                              <label className="text-[10px] text-stone-700 font-bold block mb-1">PRECIO PROMOCIÓN GENERAL (Renta + Administración)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                                <input 
                                  type="text" value={new Intl.NumberFormat('es-CO').format(priceGeneralVal)} 
                                  onChange={e => setFormData({ ...formData, priceGeneral: e.target.value.replace(/\D/g, '') })}
                                  placeholder="Ej. 1.800.000" className="w-full bg-white border border-brand-gold/30 focus:border-brand-gold rounded-xl py-3 pl-8 pr-3 font-bold font-mono text-stone-900 outline-none transition-colors"
                                />
                              </div>
                              <p className="text-[9px] text-[#8A631F] italic leading-snug mt-1.5 flex items-start gap-1">
                                <Info className="w-3 h-3 flex-shrink-0" />
                                <span>En letras: <strong className="text-stone-900 font-sans font-bold">{numberToWordsSpanish(priceGeneralVal)}</strong></span>
                              </p>
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] text-stone-700 font-bold block mb-1">CUOTA DE ADMINISTRACIÓN PLENA</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                              <input 
                                type="text" value={new Intl.NumberFormat('es-CO').format(priceHoaVal)}
                                onChange={e => setFormData({ ...formData, priceHoaPlena: e.target.value.replace(/\D/g, '') })}
                                placeholder="Ej. 350.000" className="w-full bg-white border border-brand-gold/30 focus:border-brand-gold rounded-xl py-3 pl-8 pr-3 font-bold font-mono text-stone-900 outline-none transition-colors"
                              />
                            </div>
                            <p className="text-[9px] text-[#8A631F] italic leading-snug mt-1.5 flex items-start gap-1">
                              <Info className="w-3 h-3 flex-shrink-0" />
                              <span>En letras: <strong className="text-stone-900 font-sans font-bold">{numberToWordsSpanish(priceHoaVal)}</strong></span>
                            </p>
                          </div>
                        </div>

                        {(formData.serviceType === 'venta' || formData.serviceType === 'vendi-renta' || formData.serviceType === 'admi-venta') && (
                          <div className="border-t border-brand-gold/20 pt-4 mt-4">
                            <label className="text-[10px] text-stone-700 font-bold block mb-1">PRECIO DE VENTA PROYECTADO</label>
                            <div className="relative max-w-md">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                              <input 
                                type="text" value={new Intl.NumberFormat('es-CO').format(sellPriceVal)} 
                                onChange={e => setFormData({ ...formData, priceVenta: e.target.value.replace(/\D/g, '') })}
                                placeholder="Ej. 450.000.000" className="w-full bg-white border border-brand-gold/30 focus:border-brand-gold rounded-xl py-3 pl-8 pr-3 font-bold font-mono text-stone-900 outline-none transition-colors text-base"
                              />
                            </div>
                            <p className="text-[9px] text-[#8A631F] italic leading-snug mt-1.5 flex items-start gap-1">
                              <Info className="w-3 h-3 flex-shrink-0" />
                              <span>En letras: <strong className="text-stone-900 font-sans font-bold">{numberToWordsSpanish(sellPriceVal)}</strong></span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card 2: Declaración Juramentada */}
                      <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl hover:border-brand-gold/50 transition-colors">
                        <label className="flex items-start space-x-4 cursor-pointer select-none">
                          <input 
                            type="checkbox" required checked={formData.hasNoEmbargo}
                            onChange={e => setFormData({ ...formData, hasNoEmbargo: e.target.checked })}
                            className="w-5 h-5 text-[#8A631F] border-stone-300 bg-white rounded mt-0.5 focus:ring-[#8A631F]"
                          />
                          <span className="text-sm text-stone-700 leading-relaxed">
                            Yo, <strong className="text-stone-900 underline decoration-brand-gold decoration-2 underline-offset-2">{formData.name || 'Propietario'}</strong>, garantizo bajo juramento que el inmueble propuesto se halla <strong className="text-stone-900">100% libre de embargos vigentes, litigios judiciales</strong>, sucesiones pendientes, u deudas que impidan la comercialización inmediata.
                          </span>
                        </label>
                      </div>

                    </div>
                  )}

                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer buttons of form */}
                {currentStep > 0 && (
                  <div className="pt-6 border-t border-stone-100 flex items-center justify-between mt-8 gap-4">
                    {activeFlow !== 'normal' ? (
                      <>
                        <button
                          type="button" 
                          onClick={() => {
                            setActiveFlow('normal');
                            setSelectedPropertyIndex(null);
                            setCurrentStep(0);
                          }}
                          className="inline-flex items-center space-x-1.5 bg-white hover:bg-stone-50 text-stone-700 font-bold py-3 px-5 rounded-xl text-xs transition-colors border border-stone-300 cursor-pointer shadow-xs active:scale-95 animate-fade-in"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Volver</span>
                        </button>
                        {selectedPropertyIndex !== null && (
                          <button
                            type="submit" 
                            disabled={loading || !formData.hasNoEmbargo}
                            className="inline-flex items-center space-x-1.5 bg-brand-gold hover:bg-brand-gold disabled:bg-stone-250 disabled:text-stone-500 text-stone-950 font-bold py-3.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95 animate-fade-in"
                          >
                            {loading ? <span>Procesando...</span> : (
                              <>
                                <Send className="w-4 h-4 text-stone-950" />
                                <span>Confirmar Transacción</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {currentStep > 1 ? (
                          <button
                            type="button" onClick={handlePrevStep}
                            className="inline-flex items-center space-x-1.5 bg-white hover:bg-stone-50 text-stone-700 font-bold py-3 px-5 rounded-xl text-xs transition-colors border border-stone-300 cursor-pointer shadow-xs active:scale-95"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Volver</span>
                          </button>
                        ) : (
                          <button
                            type="button" onClick={() => setCurrentStep(0)}
                            className="inline-flex items-center space-x-1.5 bg-white hover:bg-stone-50 text-stone-700 font-bold py-3 px-5 rounded-xl text-xs transition-colors border border-stone-300 cursor-pointer shadow-xs active:scale-95"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Cambiar Cédula</span>
                          </button>
                        )}

                        {currentStep < 7 ? (
                          <button
                            type="button" onClick={handleNextStep}
                            disabled={!canGoToNext()}
                            className="inline-flex items-center space-x-1.5 bg-stone-900 hover:bg-stone-850 disabled:bg-stone-250 disabled:text-stone-500 text-brand-gold-dark font-bold py-3 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95"
                          >
                            <span>{currentStep === 6 ? 'Ir a Precios' : 'Siguiente'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="submit" disabled={loading || !formData.hasNoEmbargo}
                            className="inline-flex items-center space-x-1.5 bg-brand-gold hover:bg-brand-gold disabled:bg-stone-250 disabled:text-stone-500 text-stone-950 font-bold py-3.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95"
                          >
                            {loading ? <span>Validando...</span> : (
                              <>
                                <Send className="w-4 h-4 text-stone-950" />
                                <span>Finalizar</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

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
                    className="inline-flex w-full bg-brand-gold hover:bg-brand-gold text-stone-950 font-bold py-3.5 px-6 rounded-xl shadow-md cursor-pointer items-center justify-center space-x-1.5 text-xs transition-all active:scale-95 font-sans"
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
