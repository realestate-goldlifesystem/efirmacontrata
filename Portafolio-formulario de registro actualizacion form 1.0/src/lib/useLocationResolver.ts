import { useState, useCallback } from 'react';

export interface LocationResolution {
  barrio: string | null;
  upz: string | null;
  localidad: string | null;
  comuna: string | null;
  municipio: string | null;
  departamento: string | null;
  pais: string | null;
  fuente: string;
}

export function useLocationResolver() {
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildIdecaQuery = (endpoint: string, lat: number, lng: number) => {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'false',
      f: 'json'
    });
    return `${endpoint}?${params.toString()}`;
  };

  const consultarIDECA = async (lat: number, lng: number) => {
    const endpoints = {
      sector: 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/catastro/sectorcatastral/MapServer/0/query',
      upz: 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/ordenamientoterritorial/unidadplaneamientozonal/MapServer/0/query',
      localidad: 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/ordenamientoterritorial/localidad/MapServer/0/query'
    };

    try {
      const [sectorRes, upzRes, localidadRes] = await Promise.all([
        fetch(buildIdecaQuery(endpoints.sector, lat, lng)),
        fetch(buildIdecaQuery(endpoints.upz, lat, lng)),
        fetch(buildIdecaQuery(endpoints.localidad, lat, lng))
      ]);

      const [sectorData, upzData, localidadData] = await Promise.all([
        sectorRes.json(),
        upzRes.json(),
        localidadRes.json()
      ]);

      const barrio = sectorData.features?.[0]?.attributes?.SCANOMBRE || null;
      const upz = upzData.features?.[0]?.attributes?.NOMBRE || null;
      const localidad = localidadData.features?.[0]?.attributes?.LOCNOMBRE || null;

      if (barrio || upz || localidad) {
        return { barrio, upz, localidad, fuente: 'IDECA (Catastro Bogotá)' };
      }
      return null;
    } catch (err) {
      console.warn("Fallo consultando IDECA:", err);
      return null;
    }
  };

  const consultarNominatim = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      const data = await response.json();

      const barrio = data.address?.suburb || 
                     data.address?.neighbourhood || 
                     data.address?.quarter || 
                     data.address?.hamlet || 
                     data.address?.village || null;
      
      const comuna = data.address?.city_district || data.address?.borough || null;
      const localidad = data.address?.city_district || null;
      const municipio = data.address?.city || data.address?.town || data.address?.municipality || null;
      const departamento = data.address?.state || null;

      return {
        barrio,
        comuna,
        localidad,
        municipio,
        departamento,
        fuente: 'OpenStreetMap'
      };
    } catch (err) {
      console.warn("Fallo consultando Nominatim:", err);
      return null;
    }
  };

  /**
   * Resuelve la ubicación en base a coordenadas. 
   * Flujo: IDECA (si es Bogotá) -> Nominatim -> Google Maps Fallback.
   */
  const resolveLocation = useCallback(async (
    lat: number, 
    lng: number, 
    googleCity: string, 
    googleDepartment: string,
    googleNeighborhood: string,
    googleLocality: string
  ): Promise<LocationResolution> => {
    setResolving(true);
    setError(null);
    
    try {
      const esBogota = googleCity.toLowerCase().includes('bogot') || googleDepartment.toLowerCase().includes('bogot');
      
      let resultado = {
        barrio: googleNeighborhood,
        upz: null as string | null,
        localidad: googleLocality,
        comuna: null as string | null,
        municipio: googleCity,
        departamento: googleDepartment,
        fuente: 'Google Maps'
      };

      if (esBogota) {
        // Nivel 1: Prioridad IDECA
        const idecaData = await consultarIDECA(lat, lng);
        if (idecaData) {
          resultado.barrio = idecaData.barrio || resultado.barrio;
          resultado.upz = idecaData.upz;
          resultado.localidad = idecaData.localidad || resultado.localidad;
          resultado.fuente = idecaData.fuente;
        } else {
          // Fallback a Nominatim si IDECA falla
          const osmData = await consultarNominatim(lat, lng);
          if (osmData) {
            resultado.barrio = osmData.barrio || resultado.barrio;
            resultado.localidad = osmData.localidad || resultado.localidad;
            resultado.fuente = osmData.fuente;
          }
        }
      } else {
        // Nivel 2: Regiones y ciudades principales usan Nominatim
        const osmData = await consultarNominatim(lat, lng);
        if (osmData) {
          resultado.barrio = osmData.barrio || resultado.barrio;
          resultado.comuna = osmData.comuna;
          resultado.localidad = osmData.localidad || resultado.localidad;
          resultado.municipio = osmData.municipio || resultado.municipio;
          resultado.departamento = osmData.departamento || resultado.departamento;
          resultado.fuente = osmData.fuente;
        }
      }

      setResolving(false);
      return resultado;
      
    } catch (err: any) {
      setError(err.message);
      setResolving(false);
      
      // Nivel 3: Fallback a lo extraído de Google Maps
      return {
        barrio: googleNeighborhood,
        upz: null,
        localidad: googleLocality,
        comuna: null,
        municipio: googleCity,
        departamento: googleDepartment,
        fuente: 'Google Maps (Fallback)'
      };
    }
  }, []);

  return { resolveLocation, resolving, error };
}
