// Diagnóstico: estado del inmueble y pagos de un registro (uso: node ver_pago_registro.js <ID>)
const {google}=require('googleapis');
const ID=process.argv[2];
(async()=>{const auth=new google.auth.GoogleAuth({keyFile:'../real-estate-ocr-468904-38d35bfd32d6.json',scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
const s=google.sheets({version:'v4',auth});const SS='1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
const meta=await s.spreadsheets.get({spreadsheetId:SS});const tabs=meta.data.sheets.map(x=>x.properties.title);
const inm=(await s.spreadsheets.values.get({spreadsheetId:SS,range:"'1.1 - INMUEBLES REGISTRADOS'!A1:ZZ"})).data.values;
const h=inm[0];inm.slice(1).filter(f=>f.join('|').includes(ID)).forEach(f=>{
 ['CODIGO DE REGISTRO','ID DE REGISTRO','ESTADO DEL INMUEBLE','DETALLES DEL ESTADO DEL INMUEBLE','ESTADO DOCUMENTAL'].forEach(n=>{const i=h.indexOf(n);console.log(n+':',i>-1?f[i]:'(no col)')})});
for(const t of tabs.filter(t=>/PAGO/i.test(t))){const v=(await s.spreadsheets.values.get({spreadsheetId:SS,range:`'${t}'!A1:Z`})).data.values||[];
 console.log('\n['+t+']',JSON.stringify(v[0]));v.slice(1).forEach((f,i)=>{if(f.join('|').includes(ID))console.log('fila',i+2,JSON.stringify(f))});}
})();
