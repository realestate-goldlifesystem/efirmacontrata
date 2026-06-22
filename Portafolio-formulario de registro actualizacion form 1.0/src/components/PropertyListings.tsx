/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MapPin, BedDouble, Bath, Square, Share2, Compass, MessageSquare, PhoneCall, X, Search } from 'lucide-react';
import { Property } from '../types';
import { PROPERTIES_DATA, FORMAT_COP } from '../data';

export default function PropertyListings() {
  const [activeType, setActiveType] = useState<string>('all');
  const [activeMode, setActiveMode] = useState<'all' | 'sale' | 'rent'>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Filter listings
  const filteredProperties = PROPERTIES_DATA.filter((p) => {
    const typeMatch = activeType === 'all' || p.type === activeType;
    const modeMatch = activeMode === 'all' || p.rentOrSale === activeMode;
    const cityMatch = selectedCity === 'all' || p.city === selectedCity;
    return typeMatch && modeMatch && cityMatch;
  });

  const cities = ['all', 'Bogotá', 'Medellín', 'Cali', 'Cartagena', 'Barranquilla'];
  const types = [
    { value: 'all', label: 'Todos' },
    { value: 'apartment', label: 'Apartamentos' },
    { value: 'house', label: 'Casas' },
    { value: 'penthouse', label: 'Penthouses' },
    { value: 'commercial', label: 'Locales / Oficinas' }
  ];

  const handleOpenDetails = (prop: Property) => {
    setSelectedProperty(prop);
  };

  const handleCloseDetails = () => {
    setSelectedProperty(null);
  };

  const getWhatsAppLink = (prop: Property) => {
    const textMsg = `Hola Gold Life Real Estate, me interesa recibir más información y fotos de la propiedad: "${prop.title}" ubicada en "${prop.location}" con un valor de ${FORMAT_COP(prop.price)} (${prop.rentOrSale === 'sale' ? 'Venta' : 'Arriendo'}). Me gustaría agendar una cita o llamada.`;
    return `https://wa.me/573177623878?text=${encodeURIComponent(textMsg)}`;
  };

  return (
    <section id="catalogo" className="py-20 bg-brand-dark text-stone-800 relative">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="text-left">
            <span className="text-xs uppercase font-mono tracking-widest text-brand-gold-dark font-bold block">PORTAFOLIO EXCLUSIVO</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-2 font-sans leading-none">
              Inmuebles Disponibles
            </h2>
            <p className="text-stone-600 mt-3 text-base font-light max-w-xl">
              Explora nuestra cuidada selección de propiedades prémium en venta y arriendo en las ubicaciones más cotizadas de Colombia.
            </p>
          </div>

          {/* Sale or Rent Filters */}
          <div className="inline-flex p-1 bg-brand-dark-deep rounded-lg border border-stone-200 shadow-sm">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'sale', label: 'Venta' },
              { value: 'rent', label: 'Arriendo' }
            ].map((mode) => (
              <button
                key={mode.value}
                id={`filter-mode-${mode.value}`}
                onClick={() => setActiveMode(mode.value as any)}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeMode === mode.value
                    ? 'bg-brand-gold text-stone-950 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Bar & City Filters */}
        <div className="bg-brand-dark-deep p-4 rounded-xl border border-stone-200 flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          
          {/* Property Types */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {types.map((t) => (
              <button
                key={t.value}
                id={`filter-type-${t.value}`}
                onClick={() => setActiveType(t.value)}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  activeType === t.value
                    ? 'bg-brand-gold/15 text-brand-gold-dark border-brand-gold/40'
                    : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* City Selection */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <span className="text-xs text-stone-600 font-mono uppercase tracking-widest shrink-0">Ciudad:</span>
            <select
              id="city-select-filter"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-white border border-stone-200 text-stone-800 text-xs rounded-lg py-2 px-3.5 focus:outline-none focus:border-brand-gold pr-8 cursor-pointer shadow-xs"
            >
              <option value="all">Ver todas</option>
              {cities.filter(c => c !== 'all').map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.length > 0 ? (
            filteredProperties.map((prop) => (
              <div
                key={prop.id}
                id={`property-card-${prop.id}`}
                className="bg-white rounded-xl overflow-hidden border border-stone-200 hover:border-brand-gold transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                {/* Visual Image container with badges */}
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                  <img
                    referrerPolicy="no-referrer"
                    src={prop.imageUrl}
                    alt={prop.title}
                    className="w-full h-full object-cover transform scale-102 group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Absolute badgeline */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className={`text-[10px] uppercase font-mono font-extrabold tracking-widest px-2.5 py-1 rounded shadow-md ${
                      prop.rentOrSale === 'sale' ? 'bg-brand-gold text-stone-950' : 'bg-teal-500 text-stone-950'
                    }`}>
                      {prop.rentOrSale === 'sale' ? 'En Venta' : 'En Arriendo'}
                    </span>
                    {prop.isFeatured && prop.featuredHighlight && (
                      <span className="bg-brand-purple text-white border border-brand-purple-light/20 text-[9px] uppercase font-mono font-extrabold tracking-widest px-2.5 py-1 rounded shadow-md">
                        {prop.featuredHighlight}
                      </span>
                    )}
                  </div>
                  {/* Quick dimension watermarking */}
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-xs text-[10px] font-mono font-bold px-2.5 py-1 rounded text-stone-800 border border-stone-200">
                    {prop.area} m²
                  </div>
                </div>

                {/* Body details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-stone-600 text-xs font-mono tracking-wide">
                      <MapPin className="w-3.5 h-3.5 text-brand-gold-dark flex-shrink-0" />
                      <span>{prop.location}</span>
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 group-hover:text-brand-gold-dark transition-colors line-clamp-1">
                      {prop.title}
                    </h3>
                    <p className="text-stone-600 text-xs font-light line-clamp-2 leading-relaxed">
                      {prop.description}
                    </p>
                  </div>

                  {/* Highlights Bar */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-stone-150 text-xs font-mono text-stone-500 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <BedDouble className="w-4 h-4 mb-1 text-brand-gold-dark/80" />
                      <span>{prop.beds > 0 ? `${prop.beds} Alc.` : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center border-l border-stone-150">
                      <Bath className="w-4 h-4 mb-1 text-brand-gold-dark/80" />
                      <span>{prop.baths > 0 ? `${prop.baths} Baños` : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center border-l border-stone-150">
                      <Square className="w-4 h-4 mb-1 text-brand-gold-dark/80" />
                      <span>{prop.area} m²</span>
                    </div>
                  </div>

                  {/* Price and Action row */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">PRECIO ESTIMADO</span>
                      <span className="text-base font-extrabold text-stone-900 font-mono">
                        {FORMAT_COP(prop.price)}
                        {prop.rentOrSale === 'rent' && <span className="text-xs text-stone-550 font-light font-sans">/mes</span>}
                      </span>
                    </div>

                    <button
                      id={`btn-view-prop-${prop.id}`}
                      onClick={() => handleOpenDetails(prop)}
                      className="bg-white hover:bg-stone-50 border border-stone-200 hover:border-brand-gold text-brand-gold-dark text-xs font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-16 text-center border border-stone-200 rounded-xl bg-white shadow-sm">
              <Compass className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <p className="text-stone-600 font-medium">No se encontraron propiedades con estos filtros</p>
              <button
                id="reset-filters"
                onClick={() => {
                  setActiveType('all');
                  setActiveMode('all');
                  setSelectedCity('all');
                }}
                className="mt-4 text-xs text-brand-gold-dark font-bold hover:underline cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            </div>
          )}
        </div>

        {/* Quick action info banner */}
        <div className="mt-16 bg-white border border-stone-200 p-8 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="space-y-2 text-left max-w-xl">
            <span className="text-xs uppercase font-mono tracking-widest text-brand-gold-dark font-bold block">VENDER O ARRENDAR TU PROPIEDAD</span>
            <h3 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">¿Tienes un inmueble similar en Colombia?</h3>
            <p className="text-stone-600 text-sm font-light leading-relaxed">
              Trabajamos con un esquema de comisiones justas, promoción digital inteligente de alto nivel y pólizas de arrendamiento con protección total de hasta 36 meses.
            </p>
          </div>
          <a
            id="listings-cta-whatsapp"
            href="https://wa.me/573177623878?text=Hola%20Gold%20Life,%20quiero%20colocar%20mi%20inmueble%20en%20su%20portafolio%20de%2520servicios."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full lg:w-auto bg-brand-gold hover:bg-brand-gold-dark text-stone-950 font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-brand-gold/5 text-center cursor-pointer"
          >
            Quiero Colocar Mi Inmueble
          </a>
        </div>

      </div>

      {/* High-Fidelity Details Modal/Lightbox */}
      {selectedProperty && (
        <div id="property-modal-lightbox" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-6 sm:p-8 text-left shadow-2xl custom-scrollbar text-stone-800 animate-fade-in">
            
            {/* Close button */}
            <button
              id="close-property-modal"
              onClick={handleCloseDetails}
              className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 p-2 rounded-full transition-all cursor-pointer z-10 shadow-xs"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Pictures frame */}
              <div className="lg:col-span-6 space-y-4">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                  <img
                    referrerPolicy="no-referrer"
                    src={selectedProperty.imageUrl}
                    alt={selectedProperty.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`text-[10px] uppercase font-mono font-extrabold tracking-widest px-2.5 py-1 rounded shadow-md ${
                      selectedProperty.rentOrSale === 'sale' ? 'bg-brand-gold text-stone-950' : 'bg-teal-500 text-stone-950'
                    }`}>
                      {selectedProperty.rentOrSale === 'sale' ? 'En Venta' : 'En Arriendo'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 bg-stone-50 opacity-80 hover:opacity-100 transition-opacity">
                    <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=300&q=80" alt="Detail 1" className="w-full h-full object-cover" />
                  </div>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 bg-stone-50 opacity-80 hover:opacity-100 transition-opacity">
                    <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=300&q=80" alt="Detail 2" className="w-full h-full object-cover" />
                  </div>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 bg-stone-50 opacity-80 hover:opacity-100 transition-opacity">
                    <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=300&q=80" alt="Detail 3" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Text Specs & Contact Block */}
              <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-1.5 text-stone-605 text-xs font-mono tracking-wide">
                    <MapPin className="w-4 h-4 text-brand-gold-dark" />
                    <span>{selectedProperty.location}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 mt-1">{selectedProperty.title}</h3>
                  <p className="text-xs font-mono text-stone-500 uppercase mt-2">CÓDIGO REFERENCIA: GL-{selectedProperty.id.toUpperCase()}</p>
                </div>

                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest block font-mono">Valor Inmueble</span>
                    <span className="text-2xl font-extrabold text-stone-900 font-mono">
                      {FORMAT_COP(selectedProperty.price)}
                      {selectedProperty.rentOrSale === 'rent' && <span className="text-sm text-stone-600 font-light font-sans">/mes</span>}
                    </span>
                  </div>
                  <span className="text-xs text-stone-500 font-medium font-sans">Impuestos excluidos</span>
                </div>

                <p className="text-stone-700 text-sm font-light leading-relaxed">
                  {selectedProperty.description}
                </p>

                {/* Characteristics detailed list */}
                <div className="space-y-4">
                  <h4 className="text-stone-500 font-mono tracking-widest text-[10px] uppercase border-b border-stone-200 pb-2 font-bold">Especificaciones básicas</h4>
                  <div className="grid grid-cols-3 gap-4 text-xs text-stone-800">
                    <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-lg flex flex-col items-center shadow-xs">
                      <span className="text-stone-500 text-[10px] uppercase font-mono tracking-widest">Habitaciones</span>
                      <strong className="text-lg text-stone-900 mt-1">{selectedProperty.beds > 0 ? selectedProperty.beds : 'N/A'}</strong>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-lg flex flex-col items-center shadow-xs">
                      <span className="text-stone-500 text-[10px] uppercase font-mono tracking-widest">Baños</span>
                      <strong className="text-lg text-stone-900 mt-1">{selectedProperty.baths > 0 ? selectedProperty.baths : 'N/A'}</strong>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-lg flex flex-col items-center shadow-xs">
                      <span className="text-stone-500 text-[10px] uppercase font-mono tracking-widest">Construido</span>
                      <strong className="text-lg text-stone-900 mt-1">{selectedProperty.area} m²</strong>
                    </div>
                  </div>
                </div>

                {/* Amenities checklist */}
                {selectedProperty.amenities && (
                  <div className="space-y-2">
                    <h4 className="text-stone-500 font-mono tracking-widest text-[10px] uppercase border-b border-stone-200 pb-2 font-bold">Comodidades y extras</h4>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedProperty.amenities.map((amenity, idx) => (
                        <span key={idx} className="bg-stone-50 border border-stone-200 text-stone-700 text-[11px] px-2.5 py-1.5 rounded-md shadow-xs">
                          ✓ {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Action links */}
                <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row gap-3">
                  <a
                    id="modal-cta-whatsapp"
                    href={getWhatsAppLink(selectedProperty)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-brand-gold hover:bg-brand-gold-dark active:scale-98 text-stone-950 font-bold py-3.5 px-4 rounded-xl text-center text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-brand-gold/10"
                  >
                    <MessageSquare className="w-5 h-5 flex-shrink-0" />
                    <span>Preguntar por esta Propiedad</span>
                  </a>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </section>
  );
}
