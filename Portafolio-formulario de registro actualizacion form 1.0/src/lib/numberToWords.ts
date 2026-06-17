/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Translates Colombian cash amounts into high-fidelity Spanish written text.
 * Helps prevent clerical errors with excess zeros (e.g., typing 200,000 instead of 2,000,000).
 */
export function numberToWordsSpanish(num: number): string {
  if (num === 0) return 'Cero pesos COP';
  if (num < 0) return 'Valor negativo';

  const units = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const hundreds = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  const convertGroup = (n: number): string => {
    let output = '';
    const h = Math.floor(n / 100);
    const t_and_u = n % 100;
    const t = Math.floor(t_and_u / 10);
    const u = t_and_u % 10;

    if (h > 0) {
      if (h === 1 && t_and_u === 0) {
        output += 'cien';
      } else if (h === 1) {
        output += 'ciento ';
      } else {
        output += hundreds[h] + ' ';
      }
    }

    if (t_and_u > 0) {
      if (t_and_u < 10) {
        output += units[t_and_u];
      } else if (t_and_u < 20) {
        output += teens[t_and_u - 10];
      } else if (t === 2) {
        // Special polish for twenties "veinti..."
        if (u === 0) output += 'veinte';
        else if (u === 1) output += 'veintiún';
        else output += 'veinti' + units[u];
      } else {
        output += tens[t];
        if (u > 0) {
          if (u === 1 && t_and_u !== 21) {
            output += ' y un';
          } else {
            output += ' y ' + units[u];
          }
        }
      }
    }
    return output.trim();
  };

  let result = '';
  let temp = num;

  // Handle BILLIONS / MILLARDOS if needed (Unidades de mil de millones)
  const thousandsOfMillions = Math.floor(temp / 1000000000);
  if (thousandsOfMillions > 0) {
    if (thousandsOfMillions === 1) {
      result += 'mil ';
    } else {
      result += convertGroup(thousandsOfMillions) + ' mil ';
    }
    temp %= 1000000000;
  }

  const millions = Math.floor(temp / 1000000);
  temp %= 1000000;

  const thousands = Math.floor(temp / 1000);
  const unitsGroup = temp % 1000;

  if (millions > 0) {
    if (millions === 1) {
      // If there are thousands of millions, we say "mil millones", otherwise "un millón"
      if (thousandsOfMillions > 0) {
        result += 'millones ';
      } else {
        result += 'un millón ';
      }
    } else {
      result += convertGroup(millions) + ' millones ';
    }
  } else if (thousandsOfMillions > 0) {
    result += 'millones ';
  }

  if (thousands > 0) {
    if (thousands === 1) {
      result += 'mil ';
    } else {
      result += convertGroup(thousands) + ' mil ';
    }
  }

  if (unitsGroup > 0) {
    result += convertGroup(unitsGroup) + ' ';
  }

  // Final polishing
  let cleanResult = result.trim();
  cleanResult = cleanResult.replace(/\s+/g, ' ');
  
  if (!cleanResult) return 'Cero pesos COP';

  if (cleanResult.endsWith('millón') || cleanResult.endsWith('millones')) {
    cleanResult += ' de';
  }

  // Capitalize first letter
  const formatted = cleanResult.charAt(0).toUpperCase() + cleanResult.slice(1);
  return `${formatted} pesos COP`;
}
