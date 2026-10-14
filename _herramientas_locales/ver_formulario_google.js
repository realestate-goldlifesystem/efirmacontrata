// Lee las preguntas y opciones de un formulario de Google (solo lectura).
// Necesita la API de formularios encendida y el formulario compartido con la
// cuenta de servicio. Uso: node ver_formulario_google.js <ID del formulario>
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/forms.body.readonly'] });
const forms = google.forms({ version: 'v1', auth });
const id = process.argv[2] || '1-ACzcknFrkSwurPz1sNv1BThtS9fJ5okplxllmJTD3U';
(async () => {
  const f = (await forms.forms.get({ formId: id })).data;
  const porId = {};
  (f.items || []).forEach((it, i) => { if (it.pageBreakItem) porId[it.itemId] = 'SECCIÓN ' + (it.title || '(sin título)'); });
  console.log('FORMULARIO:', f.info.title, '| preguntas y secciones:', (f.items || []).length, '| respuestas van a hoja:', f.linkedSheetId ? 'sí' : 'no');
  (f.items || []).forEach((it, i) => {
    if (it.pageBreakItem) return console.log('\n══ ' + (it.title || '(sección sin título)') + (it.pageBreakItem.goToAction ? ' → ' + it.pageBreakItem.goToAction : '') + (it.pageBreakItem.goToSectionId ? ' → ' + (porId[it.pageBreakItem.goToSectionId] || it.pageBreakItem.goToSectionId) : ''));
    if (it.textItem) return console.log('   [texto] ' + (it.title || '') + (it.description ? ' — ' + it.description.slice(0, 120) : ''));
    const q = it.questionItem && it.questionItem.question; if (!q) return console.log('   [' + Object.keys(it).filter(k => !['itemId', 'title', 'description'].includes(k)).join(',') + '] ' + (it.title || ''));
    const tipo = q.choiceQuestion ? (q.choiceQuestion.type === 'DROP_DOWN' ? 'lista' : q.choiceQuestion.type === 'RADIO' ? 'opción' : 'casillas') : q.textQuestion ? (q.textQuestion.paragraph ? 'párrafo' : 'texto') : q.dateQuestion ? 'fecha' : Object.keys(q).filter(k => k !== 'questionId' && k !== 'required').join(',');
    console.log('   ' + String(i + 1).padStart(3) + '. ' + (it.title || '').slice(0, 100) + '  [' + tipo + (q.required ? ', obligatoria' : '') + ']');
    if (q.choiceQuestion) q.choiceQuestion.options.forEach(o => console.log('          · ' + (o.value || (o.isOther ? 'Otra' : '')) + (o.goToSectionId ? '  → ' + (porId[o.goToSectionId] || o.goToSectionId) : o.goToAction ? '  → ' + o.goToAction : '')));
  });
})().catch(e => { console.error(e.message); process.exit(1); });
