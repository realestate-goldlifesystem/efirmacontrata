const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/DLeo Gutierrez/Documents/Documentos personales/1- Gold Life System/1. REAL ESTATE-GOLDLIFE/Real Estate (Apps Script)/backend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

console.log('=== ANALIZANDO GETRANGE EN BACKEND ===');
files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('getRange(')) {
      // Find matches where the second parameter might be null or undefined
      // e.g. getRange(row, getColumnByName(...)) or getRange(..., colVar)
      console.log(`${file}:${idx + 1}: ${line.trim()}`);
    }
  });
});
