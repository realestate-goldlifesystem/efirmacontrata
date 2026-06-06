const fs = require('fs');
const acorn = require('acorn');
try {
  const content = fs.readFileSync('backend/GESTOR DE DOCUMENTOS.js', 'utf8');
  acorn.parse(content, { ecmaVersion: 2020 });
  console.log("Syntax is OK");
} catch(e) {
  console.error("Syntax error:", e);
}
