import React, { useEffect, useRef, useState } from 'react';
import { useLocationResolver } from '../lib/useLocationResolver';
import { MapPin, Navigation, Compass, Target, Plus, Minus } from 'lucide-react';

interface LocationStepProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

declare global {
  interface Window {
    google: any;
  }
}

export const PortfolioLocationStep: React.FC<LocationStepProps> = ({ formData, setFormData }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const { resolveLocation, resolving, error } = useLocationResolver();
  const [loadingGeo, setLoadingGeo] = useState(false);

  // 1. Cargar Google Maps
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        setMapLoaded(true);
        return;
      }

      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          initMap();
          setMapLoaded(true);
        });
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      // NOTA: Reemplazar con clave API real si esta no funciona
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initMap();
        setMapLoaded(true);
      };
      document.body.appendChild(script);
    };

    const timer = setTimeout(loadGoogleMaps, 100);
    return () => clearTimeout(timer);
  }, []);

  // 2. Inicializar Mapa y Autocomplete
  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    // Default: Bogotá
    const initialPos = { lat: 4.7220, lng: -74.0427 };

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: initialPos,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    markerRef.current = new window.google.maps.Marker({
      position: initialPos,
      map: googleMapRef.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    markerRef.current.addListener("dragend", () => {
      const newPos = markerRef.current?.getPosition();
      if (newPos) geocodePosition(newPos);
    });

    initAutocomplete();
  };

  const initAutocomplete = () => {
    if (!searchInputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
      componentRestrictions: { country: "co" },
      fields: ["address_components", "geometry", "formatted_address"],
    });

    autocomplete.addListener("place_changed", async () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;

      if (googleMapRef.current) {
        googleMapRef.current.setCenter(place.geometry.location);
        googleMapRef.current.setZoom(17);
      }
      if (markerRef.current) {
        markerRef.current.setPosition(place.geometry.location);
      }

      await processLocation(place.geometry.location.lat(), place.geometry.location.lng(), place.address_components, place.formatted_address);
    });
  };

  const geocodePosition = (pos: google.maps.LatLng) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: pos }, (results: any, status: any) => {
      if (status === "OK" && results && results[0]) {
        if (searchInputRef.current) {
          searchInputRef.current.value = results[0].formatted_address.split(',')[0];
        }
        processLocation(pos.lat(), pos.lng(), results[0].address_components, results[0].formatted_address);
      }
    });
  };

  // 3. Procesamiento y Extracción Inteligente
  const processLocation = async (lat: number, lng: number, components: any[], formattedAddress: string) => {
    let googleStreet = "", googleNumber = "", googleNeighborhood = "", googleLocality = "", googleCity = "", googleDepartment = "";

    components.forEach((comp) => {
      const types = comp.types;
      if (types.includes("route")) googleStreet = comp.long_name;
      if (types.includes("street_number")) googleNumber = comp.long_name;
      if (types.includes("neighborhood") || types.includes("sublocality_level_2")) googleNeighborhood = comp.long_name;
      if (types.includes("sublocality_level_1") || types.includes("sublocality")) googleLocality = comp.long_name;
      if (types.includes("locality")) googleCity = comp.long_name;
      if (types.includes("administrative_area_level_1")) googleDepartment = comp.long_name;
    });

    // Normalización básica de la dirección corta
    let shortAddress = "";
    if (googleStreet && googleNumber) {
      shortAddress = `${googleStreet} #${googleNumber}`;
    } else if (googleStreet) {
      shortAddress = googleStreet;
    } else {
      shortAddress = formattedAddress.split(',')[0].trim();
    }

    // Normalizar abreviaturas comunes (Estándar Catastral para Servicios Públicos)
    shortAddress = shortAddress
      .replace(/Avenida Carrera/gi, 'AK')
      .replace(/Avenida Calle/gi, 'AC')
      .replace(/Avenida/gi, 'Av')
      .replace(/Carrera/gi, 'Cra')
      .replace(/Calle/gi, 'Cl')
      .replace(/Transversal/gi, 'Tv')
      .replace(/Diagonal/gi, 'Dg')
      .replace(/Autopista/gi, 'Aut');

    // Limpieza estricta de numerales y espacios (Ej. "AK 9 ## 185-61" -> "AK 9 #185-61")
    shortAddress = shortAddress
      .replace(/\./g, '')      // Eliminar puntos (Cl. -> Cl)
      .replace(/#\s*#/g, '#')  // Eliminar dobles numerales
      .replace(/#\s+/g, '#')   // Eliminar espacio DESPUÉS del numeral
      .replace(/\s+#/g, ' #')  // Asegurar un solo espacio ANTES del numeral
      .replace(/No\s/gi, '#')  // Reemplazar No por numeral
      .replace(/Nro/gi, '#')   // Reemplazar Nro por numeral
      .trim();

    // Obligar a MAYÚSCULAS las letras anexas a números y palabras clave
    shortAddress = shortAddress
      .replace(/\b([a-z])\b/g, (match) => match.toUpperCase()) // Letras sueltas a mayúscula (a -> A)
      .replace(/(\d)\s+([a-zA-Z])\b/g, '$1$2') // Pegar letra al número (10 A -> 10A)
      .replace(/bis/gi, 'BIS')
      .replace(/sur/gi, 'SUR')
      .replace(/este/gi, 'ESTE')
      .replace(/(\d)([a-z])/g, (m, p1, p2) => `${p1}${p2.toUpperCase()}`); // (10a -> 10A)

    // Heurística de Placa Colombiana (Distancia en metros):
    // Si Google Maps arroja la placa todo junto (Ej. #1712), en Colombia los últimos 
    // 2 dígitos suelen ser la distancia (17-12). Se inyecta el guion automáticamente.
    if (shortAddress.includes('#')) {
      const parts = shortAddress.split('#');
      let placa = parts[1].trim();
      // Solo actuar si NO tiene guion y tiene longitud para dividirse
      if (!placa.includes('-') && placa.length >= 3) {
        const lastTwo = placa.slice(-2);
        const rest = placa.slice(0, -2).replace(/\s/g, ''); // Limpiar espacios internos
        if (/^\d{2}$/.test(lastTwo)) {
          shortAddress = `${parts[0].trim()} #${rest}-${lastTwo}`;
        }
      }
    }

    // Asegurar que no haya espacios alrededor del guion (Ej. "134B - 18" -> "134B-18")
    shortAddress = shortAddress.replace(/\s*-\s*/g, '-');

    // Llamar al Hook Extractor (IDECA/Nominatim)
    const resolucion = await resolveLocation(lat, lng, googleCity, googleDepartment, googleNeighborhood, googleLocality);

    setFormData((prev: any) => ({
      ...prev,
      address: shortAddress,
      city: resolucion.municipio || 'Bogotá',
      localidad: resolucion.localidad || 'Desconocida',
      upz: resolucion.upz || 'N/A',
      barrio: resolucion.barrio || resolucion.comuna || 'Desconocido',
      barrioComercial: googleNeighborhood || resolucion.barrio || resolucion.comuna || 'Desconocido',
      country: resolucion.pais || 'Colombia',
      customBarrio: '' // Reset custom
    }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const pos = { lat: latitude, lng: longitude };
        if (googleMapRef.current && markerRef.current) {
          googleMapRef.current.panTo(pos);
          googleMapRef.current.setZoom(17);
          markerRef.current.setPosition(pos);
        }
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: pos }, (results: any, status: any) => {
            if (status === "OK" && results && results[0]) {
              if (searchInputRef.current) {
                searchInputRef.current.value = results[0].formatted_address.split(',')[0];
              }
              processLocation(latitude, longitude, results[0].address_components, results[0].formatted_address);
            }
          });
        }
        setLoadingGeo(false);
      },
      (err) => {
        console.error('Error de geolocalización:', err);
        alert('No pudimos obtener tu ubicación. Asegúrate de dar permiso.');
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <label className="text-xs text-stone-600 font-bold block mb-1">BUSCAR DIRECCIÓN</label>
        <div className="flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Escribe para autocompletar la dirección..."
            className="flex-1 bg-white border border-stone-200 rounded-xl p-3 text-sm font-semibold shadow-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={loadingGeo}
            className="px-4 py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 border border-stone-200"
          >
            <Navigation className={`w-4 h-4 ${loadingGeo ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Mi Ubicación</span>
          </button>
        </div>
        <p className="text-[10px] text-stone-500 mt-1">Busca tu dirección o mueve el pin rojo en el mapa para mayor precisión.</p>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[300px] rounded-xl overflow-hidden border border-stone-200 shadow-inner bg-stone-100 group">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-stone-500 font-semibold animate-pulse">Cargando mapa...</span>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Floating Map Controls */}
        {mapLoaded && (
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            {/* Zoom Controls */}
            <div className="flex flex-col bg-white/90 backdrop-blur shadow-md rounded-xl overflow-hidden border border-stone-200/50">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (googleMapRef.current) googleMapRef.current.setZoom((googleMapRef.current.getZoom() || 15) + 1);
                }}
                className="w-8 h-8 text-stone-700 flex items-center justify-center hover:bg-stone-50 hover:text-brand-gold transition-colors border-b border-stone-100"
                title="Acercar"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (googleMapRef.current) googleMapRef.current.setZoom((googleMapRef.current.getZoom() || 15) - 1);
                }}
                className="w-8 h-8 text-stone-700 flex items-center justify-center hover:bg-stone-50 hover:text-brand-gold transition-colors"
                title="Alejar"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* View & Orientation Controls */}
            <div className="flex flex-col bg-white/90 backdrop-blur shadow-md rounded-xl overflow-hidden border border-stone-200/50">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (googleMapRef.current) {
                    const currentType = googleMapRef.current.getMapTypeId();
                    googleMapRef.current.setMapTypeId(currentType === 'hybrid' ? 'roadmap' : 'hybrid');
                  }
                }}
                className="w-8 h-8 text-stone-700 flex items-center justify-center hover:bg-stone-50 hover:text-brand-gold transition-colors border-b border-stone-100"
                title="Alternar Vista Satélite / Mapa"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (googleMapRef.current) {
                    googleMapRef.current.setHeading(0);
                    googleMapRef.current.setTilt(0);
                    if (markerRef.current) {
                      googleMapRef.current.panTo(markerRef.current.getPosition() as google.maps.LatLng);
                    }
                  }
                }}
                className="w-8 h-8 text-stone-700 flex items-center justify-center hover:bg-stone-50 hover:text-brand-gold transition-colors"
                title="Orientar Norte / Reiniciar"
              >
                <Compass className="w-4 h-4" />
              </button>
            </div>

            {/* Pin Controls */}
            <div className="flex flex-col bg-white/90 backdrop-blur shadow-md rounded-xl overflow-hidden border border-stone-200/50">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (googleMapRef.current && markerRef.current) {
                    const center = googleMapRef.current.getCenter();
                    if (center) {
                      markerRef.current.setPosition(center);
                      if (window.google) {
                        const geocoder = new window.google.maps.Geocoder();
                        geocoder.geocode({ location: center }, (results: any, status: any) => {
                          if (status === "OK" && results && results[0]) {
                            if (searchInputRef.current) searchInputRef.current.value = results[0].formatted_address.split(',')[0];
                            processLocation(center.lat(), center.lng(), results[0].address_components, results[0].formatted_address);
                          }
                        });
                      }
                    }
                  }
                }}
                className="w-8 h-8 text-stone-700 flex items-center justify-center hover:bg-stone-50 hover:text-brand-gold transition-colors border-b border-stone-100"
                title="Poner marcador aquí (Donde estoy viendo)"
              >
                <Target className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (googleMapRef.current && markerRef.current) {
                    const pos = markerRef.current.getPosition();
                    if (pos) {
                      googleMapRef.current.panTo(pos);
                      googleMapRef.current.setZoom(17);
                    }
                  }
                }}
                className="w-8 h-8 text-stone-700 flex items-center justify-center hover:bg-stone-50 hover:text-brand-gold transition-colors"
                title="Traer mi punto (Centrar en el pin)"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>

            {/* GPS Control */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                useMyLocation();
              }}
              disabled={loadingGeo}
              className={`w-8 h-8 mt-1 bg-brand-gold text-stone-900 rounded-full shadow-md flex items-center justify-center hover:bg-brand-gold-light transition-transform hover:scale-105 ${loadingGeo ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Usar mi ubicación GPS"
            >
              <Navigation className={`w-4 h-4 ${loadingGeo ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        )}

        {resolving && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Extrayendo datos territoriales...
          </div>
        )}
      </div>

      {/* Extracted Data Visualization */}
      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
        <h5 className="text-xs font-black text-stone-800 uppercase tracking-widest flex items-center gap-2 border-b border-stone-200 pb-2">
          <MapPin className="w-4 h-4 text-brand-gold-dark" /> Datos Extraídos
        </h5>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="block text-[10px] font-bold text-stone-500">PAÍS</span>
            <input 
              type="text" 
              readOnly 
              value={formData.country || 'Colombia'} 
              className="w-full bg-stone-100 border border-stone-200 rounded p-2 text-xs font-bold text-stone-700" 
            />
          </div>
          <div className="col-span-2 md:col-span-3">
            <span className="block text-[10px] font-bold text-stone-500">DIRECCIÓN NORMALIZADA</span>
            <input 
              type="text" 
              readOnly
              value={formData.address}
              className="w-full bg-stone-100 border border-stone-200 rounded p-2 text-xs font-mono font-bold text-stone-700"
            />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-stone-500">CIUDAD / MUNICIPIO</span>
            <input 
              type="text" 
              readOnly 
              value={formData.city} 
              className="w-full bg-stone-100 border border-stone-200 rounded p-2 text-xs font-bold text-stone-700" 
            />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-stone-500">LOCALIDAD</span>
            <input 
              type="text" 
              readOnly 
              value={formData.localidad} 
              className="w-full bg-stone-100 border border-stone-200 rounded p-2 text-xs font-bold text-stone-700" 
            />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-stone-500">UPZ</span>
            <input 
              type="text" 
              readOnly 
              value={formData.upz} 
              className="w-full bg-stone-100 border border-stone-200 rounded p-2 text-xs font-bold text-stone-700" 
            />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-stone-500">BARRIO (CATASTRAL)</span>
            <input 
              type="text" 
              readOnly 
              value={formData.barrio} 
              className="w-full bg-stone-100 border border-stone-200 rounded p-2 text-xs font-bold text-stone-700" 
            />
          </div>
          <div className="col-span-2 md:col-span-4 border-t border-stone-200 pt-3 mt-1">
            <span className="block text-[10px] font-bold text-brand-gold-dark">BARRIO COMERCIAL (Para Marketing)</span>
            <input 
              type="text" 
              readOnly 
              value={formData.barrioComercial || ''} 
              className="w-full bg-brand-gold/10 border border-brand-gold/30 rounded p-2 text-xs font-bold text-brand-gold-dark" 
            />
          </div>
        </div>

        {/* Input for custom barrio if they clicked Edit */}
        {formData.barrio === 'Otro' && (
          <div className="animate-fade-in mt-3 pt-3 border-t border-stone-200">
             <label className="text-[10px] font-bold text-brand-gold-dark block mb-1">ESCRIBA EL BARRIO CORRECTO</label>
             <input 
                type="text" 
                required 
                value={formData.customBarrio}
                onChange={e => setFormData({ ...formData, customBarrio: e.target.value })}
                placeholder="Escribe el nombre del barrio"
                className="w-full bg-white border border-brand-gold/50 rounded-xl p-2 text-xs font-bold focus:ring-1 focus:ring-brand-gold outline-none"
             />
          </div>
        )}
      </div>
    </div>
  );
};
