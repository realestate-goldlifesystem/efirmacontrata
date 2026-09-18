// Prueba la normalización de direcciones de PortfolioLocationStep.tsx
// extrayendo el bloque real del componente (no una copia).
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '../Portafolio-formulario de registro actualizacion form 1.0/src/components/PortfolioLocationStep.tsx'), 'utf8');
const a = s.indexOf('    // Normalizar abreviaturas comunes');
const b = s.indexOf('    // Llamar al Hook Extractor');
const normalizar = new Function('shortAddress', s.slice(a, b) + '\nreturn shortAddress;');

const casos = [
  ['Cl. 143 # No. 9-55', 'Cl 143 #9-55'],
  ['Calle 143 ##9-55', 'Cl 143 #9-55'],
  ['Cl 143 # # 9 - 55', 'Cl 143 #9-55'],
  ['AK 9 ## 185-61', 'AK 9 #185-61'],
  ['Calle 80 Nro 20-15', 'Cl 80 #20-15'],
  ['Cl 26 N° 13-19', 'Cl 26 #13-19'],
  ['Avenida Calle 26 #1712', 'AC 26 #17-12'],
  ['Carrera 7 bis No 45 a - 12 sur', 'Cra 7 BIS #45A-12 SUR'],
  ['Cl 10 este #5-20', 'Cl 10 ESTE #5-20'],
  ['Cra 9 Norte #10-20', 'Cra 9 Norte #10-20'],
  ['Cl 143 #9-55', 'Cl 143 #9-55'],
];
let fallas = 0;
for (const [entrada, esperado] of casos) {
  const r = normalizar(entrada);
  const ok = r === esperado;
  if (!ok) fallas++;
  console.log(`${ok ? '✅' : '❌'} ${JSON.stringify(entrada)} -> ${JSON.stringify(r)}${ok ? '' : '  (esperado ' + JSON.stringify(esperado) + ')'}`);
}
console.log(fallas ? `${fallas} FALLAS` : `Todo OK (${casos.length})`);
process.exit(fallas ? 1 : 0);
