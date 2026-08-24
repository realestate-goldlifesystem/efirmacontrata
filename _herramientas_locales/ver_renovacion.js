const {google}=require('googleapis');const c=require('../real-estate-ocr-468904-38d35bfd32d6.json');
const a=new google.auth.GoogleAuth({credentials:c,scopes:['https://www.googleapis.com/auth/spreadsheets']});
(async()=>{const s=google.sheets({version:'v4',auth:a});
const r=await s.spreadsheets.values.get({spreadsheetId:'1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc',range:"'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ"});
const rows=r.data.values;const h=rows[0].map(x=>(x||'').toString().trim());const g=n=>h.indexOf(n);
const iDir=g('Ingrese la Dirección del inmueble'),iCDR=g('CODIGO DE REGISTRO'),iID=g('ID DE REGISTRO'),iNeg=g('TIPO DE NEGOCIO'),iPG=g('PRECIO DE PROMOCION GENERAL'),iEst=g('ESTADO DEL INMUEBLE'),iApto=g('N° de inmueble');
console.log('filas totales: '+rows.length);
for(let i=1;i<rows.length;i++){const d=(rows[i][iDir]||'').toString();
if(d.includes('PRUEBA-ID')){
 const cdr=(rows[i][iCDR]||'').toString();
 console.log(`  f${i+1} | ${(rows[i][iID]||'········')} | ${(rows[i][iNeg]||'').padEnd(11)} | apto ${rows[i][iApto]} | ${String(rows[i][iPG]||'-').padEnd(12)} | ${(rows[i][iEst]||'(vacio)').padEnd(18)} | ${cdr.slice(0,40)}`);}}
})();
