/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Property, Testimonial, InsurancePartner } from './types';

export const PROPERTIES_DATA: Property[] = [
  {
    id: 'prop-1',
    title: 'Penthouse de Lujo de Tres Niveles',
    description: 'Increíble penthouse en el exclusivo sector de El Poblado con terraza privada de 80m2, piscina climatizada propia, cocina de diseño italiano y acabados en mármol travertine de importación.',
    price: 1850000000, // 1,850 Million COP
    rentOrSale: 'sale',
    type: 'penthouse',
    location: 'El Poblado, Medellín',
    city: 'Medellín',
    beds: 3,
    baths: 4,
    area: 320,
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    isFeatured: true,
    featuredHighlight: 'Exclusividad Premium',
    amenities: ['Piscina privada', 'Terraza panorámica', 'Ascensor privado', 'Automatización integral', '4 Parqueaderos']
  },
  {
    id: 'prop-2',
    title: 'Apartamento de Diseño Nórdico - Chicó',
    description: 'Espacio lleno de luz natural con vista al parque. Ventanales de piso a techo, chimenea tradicional a gas, pisos de madera maciza y carpintería de diseño premium.',
    price: 4800000, // 4.8 Million Rent COP/month
    rentOrSale: 'rent',
    type: 'apartment',
    location: 'Chicó Reservado, Bogotá',
    city: 'Bogotá',
    beds: 2,
    baths: 3,
    area: 115,
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    isFeatured: true,
    featuredHighlight: 'Arriendo Destacado',
    amenities: ['Gimnasio', 'Seguridad 24/7', 'Chimenea', 'Calefacción', 'Depósito']
  },
  {
    id: 'prop-3',
    title: 'Casa Campestre Moderna con Piscina Infinito',
    description: 'Ubicada en parcelación de alta seguridad. Maravilloso diseño bioclimático, amplias zonas verdes, deck conectado a la zona social y espectaculares senderos privados.',
    price: 2400000000, // 2,400 M COP
    rentOrSale: 'sale',
    type: 'house',
    location: 'Llanogrande, Rionegro (Antioquia)',
    city: 'Medellín',
    beds: 4,
    baths: 5,
    area: 450,
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    isFeatured: true,
    featuredHighlight: 'Oportunidad de Inversión',
    amenities: ['Piscina sin fin', 'Jacuzzi', 'Zona de fogata', 'Lote de 2000m2', 'Planta eléctrica']
  },
  {
    id: 'prop-4',
    title: 'Apartamento Ejecutivo Loft en Rosales',
    description: 'Perfecto para diplomáticos o ejecutivos corporativos. Distribución tipo loft de doble altura, acabados en concreto a la vista e iluminación automatizada de última generación.',
    price: 3600000, // 3.6 Million Rent COP
    rentOrSale: 'rent',
    type: 'apartment',
    location: 'Rosales, Bogotá',
    city: 'Bogotá',
    beds: 1,
    baths: 2,
    area: 78,
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    isFeatured: false,
    amenities: ['Voz y datos de alta velocidad', 'Cerradura biométrica', 'Zona de coworking', 'Terraza BBQ']
  },
  {
    id: 'prop-5',
    title: 'Oficina Comercial Corporativa - Santa Ana',
    description: 'Ubicación premium en zona financiera. Cuenta con divisiones modulares elegantes, sala de juntas vip, aire acondicionado central y sistemas contra incendio integrados.',
    price: 12500000, // 12.5 Million Rent COP/month
    rentOrSale: 'rent',
    type: 'commercial',
    location: 'Santa Ana, Bogotá',
    city: 'Bogotá',
    beds: 0,
    baths: 4,
    area: 210,
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    isFeatured: false,
    amenities: ['Auditorio común', 'Planta eléctrica de suplencia total', 'Control de acceso', 'Parqueaderos de visitantes']
  },
  {
    id: 'prop-6',
    title: 'Casa de Diseño Colonial Renovado',
    description: 'Joyero arquitectónico en pleno corazón amurallado. Piscina interior, arcos de ladrillo originales integrados con elementos modernos, y mirador privado con vista al mar.',
    price: 3950000000, // 3,950 Million COP
    rentOrSale: 'sale',
    type: 'house',
    location: 'Centro Histórico, Cartagena',
    city: 'Cartagena',
    beds: 5,
    baths: 6,
    area: 380,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    isFeatured: true,
    featuredHighlight: 'Joyas Históricas',
    amenities: ['Piscina interior', 'Mirador 360', 'Restauración certificada', 'Patio colonial', 'Cocina profesional']
  },
  {
    id: 'prop-7',
    title: 'Apartamento Familiar con Vista al Río',
    description: 'Ubicación estratégica en el sector de Buena Vista. Excelente ventilación natural, balcón extendido, doble sombra de parqueo y espectaculares áreas de recreación infantil.',
    price: 680000000, // 680 Millones COP
    rentOrSale: 'sale',
    type: 'apartment',
    location: 'Buena Vista, Barranquilla',
    city: 'Barranquilla',
    beds: 3,
    baths: 3,
    area: 145,
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    isFeatured: false,
    amenities: ['Cancha de squash', 'Piscina comunitaria', 'Planta de agua de emergencia', 'Salón de eventos']
  },
  {
    id: 'prop-8',
    title: 'Local Comercial en Zona Gastronómica',
    description: 'Ubicado en pasaje comercial de alta afluencia peatonal y vehicular en el barrio Granada. Adecuado con trampa de grasas, ducto de extracción y acometida de gas industrial.',
    price: 8500000, // 8.5 M COP Rent
    rentOrSale: 'rent',
    type: 'commercial',
    location: 'Barrio Granada, Cali',
    city: 'Cali',
    beds: 0,
    baths: 2,
    area: 120,
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    isFeatured: false,
    amenities: ['Extractor de aire industrial', 'Gas natural', 'Terrazas para mesas', 'Fachada en vidrio']
  }
];

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 't-1',
    name: 'Andrés Felipe Restrepo',
    role: 'Propietario de 3 apartamentos en Bogotá',
    location: 'Bogotá',
    text: 'Pasar mis propiedades al modelo de Administración con Gold Life fue la mejor decisión financiera del año. Antes sufría cobrando el canon y lidiando con deudas de servicios públicos. Ahora, el 10 de cada mes tengo mi dinero en la cuenta, sin retrasos y sin llamadas molestas.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    rating: 5
  },
  {
    id: 't-2',
    name: 'Carolina Gómez Villa',
    role: 'Casas Campestres en Rionegro',
    location: 'Medellín',
    text: 'Vivía asustada con la morosidad comercial del 24% en Colombia. El servicio de corretaje de Gold Life me filtró excelentes inquilinos y con la póliza de arrendamiento de El Libertador me siento blindada por duplicado. Un trato genuinamente humano y profesional.',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    rating: 5
  },
  {
    id: 't-3',
    name: 'Roberto Carlos Marulanda',
    role: 'Inversionista de locales comerciales',
    location: 'Cali',
    text: 'Un portafolio impecable. Se nota que no es una franquicia que automatiza respuestas con robots. El trato personalizado y el conocimiento legal de procesos de arrendamiento y de mantenimiento es de otro nivel. Súper recomendados.',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    rating: 5
  }
];

export const INSURANCE_PARTNERS: InsurancePartner[] = [
  { name: 'Central de Arrendamientos / Zurich', logoType: 'zurich', badgeColor: 'bg-blue-900/10 text-blue-800 border-blue-200' },
  { name: 'Seguros Bolívar / El Libertador', logoType: 'libertador', badgeColor: 'bg-red-900/10 text-red-700 border-red-200' },
  { name: 'Sura / Prosear', logoType: 'sura', badgeColor: 'bg-cyan-900/10 text-cyan-700 border-cyan-200' },
  { name: 'Seguros Mundial', logoType: 'mundial', badgeColor: 'bg-indigo-900/10 text-indigo-700 border-indigo-200' },
  { name: 'Aptuno Tech', logoType: 'aptuno', badgeColor: 'bg-amber-900/10 text-amber-700 border-amber-200' }
];

export const FORMAT_COP = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
