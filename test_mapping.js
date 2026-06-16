const db_headers = require('./_herramientas_locales/db_headers.json');
const frontend_payload = {
  "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #1 Zona Residencial]": "Tipo de zona #1 Zona Residencial",
  "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #2 Zona Comercial]": "",
  "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #3 Zona Industrial]": "",
  "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #4 Zona Campestre]": ""
};

const newRow = [];
for (let i = 0; i < db_headers.length; i++) {
  const rawHeader = db_headers[i].toString();
  const trimmedHeader = rawHeader.trim();
  if (rawHeader && frontend_payload.hasOwnProperty(rawHeader)) {
    newRow[i] = frontend_payload[rawHeader];
  } else if (trimmedHeader && frontend_payload.hasOwnProperty(trimmedHeader)) {
    newRow[i] = frontend_payload[trimmedHeader];
  }
}

console.log("Mapped results:");
db_headers.forEach((header, i) => {
  if (header.includes("Tipo de zona")) {
    console.log(`[${i}] ${header} => '${newRow[i]}'`);
  }
});
