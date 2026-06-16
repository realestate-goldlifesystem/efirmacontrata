const fs = require('fs');
const formContent = fs.readFileSync('../Portafolio-formulario de registro actualizacion form 1.0/src/components/RegisterPropertyForm.tsx', 'utf8');
const headers = JSON.parse(fs.readFileSync('db_headers.json', 'utf8'));

const payloadMatch = formContent.match(/const payload = \{([\s\S]*?)\};\s*const response/);
if (payloadMatch) {
    const lines = payloadMatch[1].split('\n');
    lines.forEach(line => {
        let key = null;
        const keyMatch = line.match(/^\s*\"(.*?)\"\s*:/);
        if (keyMatch) {
            key = keyMatch[1];
        } else {
            const noQuoteMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
            if(noQuoteMatch && noQuoteMatch[1] !== 'accion') {
                key = noQuoteMatch[1];
            }
        }
        if (key && !headers.includes(key)) {
            console.log("NOT IN SHEET: '" + key + "'");
        }
    });
} else {
    console.log('Payload not found');
}
