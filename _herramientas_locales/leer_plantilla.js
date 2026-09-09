const { google } = require('googleapis');
const path = require('path');
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), 'real-estate-ocr-468904-38d35bfd32d6.json'),
  scopes: ['https://www.googleapis.com/auth/documents.readonly'],
});
const ID = process.argv[2];
const leer = (els) => els.map(e => {
  if (e.paragraph) return (e.paragraph.elements||[]).map(x=>x.textRun?.content||'').join('');
  if (e.table) {
    return '\n[TABLA]\n' + e.table.tableRows.map(r =>
      '  | ' + r.tableCells.map(c => leer(c.content).trim().replace(/\n/g,' ')).join(' | ')
    ).join('\n') + '\n[/TABLA]\n';
  }
  return '';
}).join('');
(async () => {
  const docs = google.docs({ version: 'v1', auth });
  const d = await docs.documents.get({ documentId: ID });
  console.log('TITULO:', d.data.title);
  console.log(leer(d.data.body.content));
})().catch(e => console.error('ERROR', e.message));
