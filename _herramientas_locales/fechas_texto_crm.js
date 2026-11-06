// Busca fechas guardadas como TEXTO en las columnas de fecha del CRM y (con --aplicar) las vuelve fecha real.
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const HOJAS = ['1 - CAPTACIONES A', '1 - CAPTACIONES V'];
const COLS = ['FECHA DE SEGUIMIENTO', 'FECHA DE CONTACTO', 'PRÓXIMA LLAMADA'];
const APLICAR = process.argv.includes('--aplicar');
const letra = (n) => { let s = ''; for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
(async () => {
  const datos = [];
  for (const h of HOJAS) {
    const enc = (await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${h}'!1:1` })).data.values[0].map(x => String(x).trim().toUpperCase());
    for (const c of COLS) {
      const i = enc.indexOf(c); if (i < 0) continue;
      const L = letra(i);
      const v = (await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: `'${h}'!${L}3:${L}`, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [];
      v.forEach((r, k) => {
        const fila = k + 3; const x = r[0]; if (typeof x !== 'string' || !x.trim()) return;
        const m = x.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
                const MES={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12};
        const mm = !m && x.trim().toLowerCase().match(/^(\d{1,2})[\s\/.-]*(?:de\s+)?([a-zé]{3})[a-zé.]*[\s\/.-]*(?:de\s+)?(\d{4})$/);
        if (mm && MES[mm[2]]) { const n2=`${mm[3]}-${String(MES[mm[2]]).padStart(2,"0")}-${mm[1].padStart(2,"0")}`; datos.push({ range: `'${h}'!${L}${fila}`, values: [[n2]] }); return; }
        if (!m) { console.log('NO RECONOCIDA', h, c, fila, JSON.stringify(x)); return; }
        const y = m[3].length === 2 ? '20' + m[3] : m[3];
        const nuevo = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` + (m[4] ? ` ${m[4]}:${m[5]}` : '');
        console.log(h, c, 'fila', fila, JSON.stringify(x), '->', nuevo);
        datos.push({ range: `'${h}'!${L}${fila}`, values: [[nuevo]] });
      });
    }
  }
  console.log('Total texto:', datos.length);
  if (APLICAR && datos.length) {
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: ID, requestBody: { valueInputOption: 'USER_ENTERED', data: datos } });
    console.log('Aplicado.');
  }
})().catch(e => console.error(e.message));
