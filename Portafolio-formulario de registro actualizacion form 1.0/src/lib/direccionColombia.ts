// Dirección corta normalizada a partir de lo que devuelve Google Places.
// Extraído tal cual de PortfolioLocationStep.tsx (5-nov-2026) para usarlo también en la
// agenda del propietario. Las reglas de abajo NO se cambian sin revisar la directiva.
export function direccionCortaColombia(googleStreet: string, googleNumber: string, formattedAddress: string): string {
  // Normalización básica de la dirección corta
  let shortAddress = "";
  if (googleStreet && googleNumber) {
    shortAddress = `${googleStreet} #${googleNumber}`;
  } else if (googleStreet) {
    shortAddress = googleStreet;
  } else {
    shortAddress = formattedAddress.split(',')[0].trim();
  }

  // ============================================================================
  // 🚨 DIRECTIVA CRÍTICA DE NORMALIZACIÓN LEGAL COLOMBIANA 🚨
  // Toda modificación a este bloque debe respetar ESTRICTAMENTE las reglas de:
  // 1. IGAC (Instituto Geográfico Agustín Codazzi) y Catastros Locales.
  // 2. DANE (Departamento Administrativo Nacional de Estadística).
  // 3. SNR (Superintendencia de Notariado y Registro).
  // 4. Operadores postales oficiales (4-72) y DIAN.
  //
  // REGLAS ABSOLUTAS PARA CONTRATOS Y FOLIOS DE MATRÍCULA:
  // - Las abreviaturas deben ser las estandarizadas (ej. Cra, Cl, Av, AK, AC).
  // - Las letras asociadas a las vías/placas (A, B, C) DEBEN IR EN MAYÚSCULAS 
  //   para evitar ambigüedades jurídicas y notariales.
  // - Palabras clave como 'BIS', 'SUR', 'ESTE' DEBEN IR EN MAYÚSCULAS CERRADAS.
  // - El símbolo universal a usar es el numeral (#) y no "No.", "Nro.", etc.
  // - Las letras y sufijos van pegados a su respectivo número (Ej: 134B, no 134 B).
  // - No deben existir espacios rodeando el guion separador (Ej: #134B-18).
  // ============================================================================
  
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
  // ⚠️ EL ORDEN IMPORTA: primero se convierten "No", "Nro", "N°" en "#" y SOLO
  // DESPUÉS se colapsan los numerales dobles. Al revés, "Cl 143 # No 9-55"
  // quedaba "Cl 143 ##9-55" (pasó el 18-09-2026 y llegó así al contrato).
  shortAddress = shortAddress
    .replace(/\./g, '')              // Eliminar puntos (Cl. -> Cl)
    .replace(/\bN[°º]\s*/gi, '#')    // N° / Nº -> #
    .replace(/\bNro\b\s*/gi, '#')    // Nro -> #
    .replace(/\bNo\b\s*/gi, '#')     // No -> # (palabra suelta: no toca "Norte")
    .replace(/#(\s*#)+/g, '#')       // Colapsar numerales repetidos (##, # #)
    .replace(/#\s+/g, '#')           // Sin espacio DESPUÉS del numeral
    .replace(/\s*#/g, ' #')          // Un solo espacio ANTES del numeral
    .replace(/\s{2,}/g, ' ')         // Espacios dobles
    .trim();

  // Obligar a MAYÚSCULAS las letras anexas a números y palabras clave
  shortAddress = shortAddress
    .replace(/\b([a-z])\b/g, (match) => match.toUpperCase()) // Letras sueltas a mayúscula (a -> A)
    .replace(/(\d)\s+([a-zA-Z])\b/g, '$1$2') // Pegar letra al número (10 A -> 10A)
    .replace(/\bbis\b/gi, 'BIS')
    .replace(/\bsur\b/gi, 'SUR')
    .replace(/\beste\b/gi, 'ESTE')
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
  return shortAddress;
}

/** Componentes que se usan de un lugar de Google Places. */
export function componentesLugar(components: any[]) {
  let calle = '', numero = '', barrio = '', localidad = '', ciudad = '', departamento = '';
  (components || []).forEach((comp: any) => {
    const types = comp.types;
    if (types.includes('route')) calle = comp.long_name;
    if (types.includes('street_number')) numero = comp.long_name;
    if (types.includes('neighborhood') || types.includes('sublocality_level_2')) barrio = comp.long_name;
    if (types.includes('sublocality_level_1') || types.includes('sublocality')) localidad = comp.long_name;
    if (types.includes('locality')) ciudad = comp.long_name;
    if (types.includes('administrative_area_level_1')) departamento = comp.long_name;
  });
  return { calle, numero, barrio, localidad, ciudad, departamento };
}
