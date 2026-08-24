const {google}=require('googleapis');const c=require('../real-estate-ocr-468904-38d35bfd32d6.json');
const a=new google.auth.GoogleAuth({credentials:c,scopes:['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive']});
(async()=>{
const s=google.sheets({version:'v4',auth:a}), d=google.drive({version:'v3',auth:a});
const r=await s.spreadsheets.values.get({spreadsheetId:'1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc',range:"'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ"});
const rows=r.data.values;const h=rows[0].map(x=>(x||'').toString().trim());const g=n=>h.indexOf(n);
const iDir=g('Ingrese la Dirección del inmueble'),iCDR=g('CODIGO DE REGISTRO'),iID=g('ID DE REGISTRO'),iNeg=g('TIPO DE NEGOCIO'),iPV=g('PRECIO DE PROMOCION EN VENTA'),iEst=g('ESTADO DEL INMUEBLE'),iApto=g('N° de inmueble');
console.log('filas: '+rows.length);
for(let i=1;i<rows.length;i++){const dd=(rows[i][iDir]||'').toString();
if(dd.includes('#99-4 PRUEBA-ID2')||dd.includes('PRUEBA-ID')&&(rows[i][iPV]||'').toString().includes('777')){
console.log(`  f${i+1} | ${rows[i][iID]||'········'} | ${(rows[i][iNeg]||'').padEnd(11)} | apto ${rows[i][iApto]} | venta:${String(rows[i][iPV]||'-').padEnd(14)} | ${(rows[i][iEst]||'(vacio)').padEnd(18)} | ${(rows[i][iCDR]||'').toString().slice(0,38)}`);}}
const dr=await d.files.list({q:"name contains '#99-4 PRUEBA-ID2' and mimeType='application/vnd.google-apps.folder' and trashed=false",fields:'files(id,name,parents)',pageSize:10});
for(const f of (dr.data.files||[]).filter(x=>x.name.startsWith('REG_'))){
const p=await d.files.get({fileId:f.parents[0],fields:'name'});
console.log(`  DRIVE: ${p.data.name.padEnd(12)} <- ${f.name}`);}
})();
