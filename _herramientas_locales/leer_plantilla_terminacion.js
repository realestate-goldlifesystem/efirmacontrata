// Lee el texto de la plantilla maestra "NOTIFICACIÓN DE TERMINACIÓN DE CONTRATO DE ARRENDAMIENTO"
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/documents.readonly', 'https://www.googleapis.com/auth/drive.readonly'] });
(async () => {
  const docs = google.docs({ version: 'v1', auth });
  const d = (await docs.documents.get({ documentId: process.argv[2] })).data;
  const txt = d.body.content.map(e => e.paragraph ? e.paragraph.elements.map(x => x.textRun ? x.textRun.content : '').join('') :
    e.table ? e.table.tableRows.map(r => r.tableCells.map(c => c.content.map(p => p.paragraph ? p.paragraph.elements.map(x => x.textRun ? x.textRun.content : '').join('') : '').join('').trim()).join(' | ')).join('\n') + '\n' : '').join('');
  console.log(d.title + '\n' + txt);
})().catch(e => console.error('❌', e.message));
