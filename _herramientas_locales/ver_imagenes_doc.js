// Lista las imágenes de un Google Doc y el texto que las rodea (Docs API, Service Account). Uso: node ver_imagenes_doc.js <docId>
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const docs = google.docs({ version: 'v1', auth: new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/documents.readonly'] }) });
const texto = (el) => el && el.paragraph ? el.paragraph.elements.map(e => (e.textRun && e.textRun.content) || '').join('').trim() : '';
(async () => {
  const d = (await docs.documents.get({ documentId: process.argv[2] })).data;
  const io = d.inlineObjects || {}, cont = d.body.content;
  let previo = '';
  cont.forEach((el, i) => {
    ((el.paragraph && el.paragraph.elements) || []).forEach(e => {
      if (!e.inlineObjectElement) return;
      const o = io[e.inlineObjectElement.inlineObjectId].inlineObjectProperties.embeddedObject;
      let sig = ''; for (let k = i + 1; k < cont.length && !sig; k++) sig = texto(cont[k]);
      console.log('IMAGEN en párrafo ' + i, Math.round(o.size.width.magnitude) + 'x' + Math.round(o.size.height.magnitude) + 'pt',
        '| antes:', JSON.stringify(previo.slice(-50)), '| después:', JSON.stringify(sig.slice(0, 50)));
    });
    if (texto(el)) previo = texto(el);
  });
  console.log('imágenes en total:', Object.keys(io).length, '| posicionadas (flotantes):', Object.keys(d.positionedObjects || {}).length);
})();
