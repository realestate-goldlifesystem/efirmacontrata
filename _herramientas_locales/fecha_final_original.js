// Busca en el historial de la hoja la FECHA FINAL / INICIO del inmueble de prueba antes de hoy (28-oct-2026)
const { google } = require('googleapis');
const credentials = require('../real-estate-ocr-468904-38d35bfd32d6.json');
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
const drive = google.drive({ version: 'v2', auth });
(async () => {
  const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
  const revs = (await drive.revisions.list({ fileId: ID, maxResults: 1000 })).data.items || [];
  const antes = revs.filter(r => r.modifiedDate < '2026-10-28T05:00:00Z');
  console.log('revisiones:', revs.length, '· última antes de hoy:', antes.length ? antes[antes.length - 1].modifiedDate : 'ninguna');
  const r = antes[antes.length - 1]; if (!r) return;
  console.log(Object.keys(r.exportLinks || {}).join(' | '));
})().catch(e => console.error('❌', e.message));
// (segunda parte) descarga esa revisión en xlsx a la carpeta temporal indicada
if (process.argv[2]) (async () => {
  const ID = '1jdPeOqQ2rRQNhlClAnFQFaNMxOl7HCI7oI1yG3_QRZc';
  const revs = (await drive.revisions.list({ fileId: ID, maxResults: 1000 })).data.items.filter(r => r.modifiedDate < '2026-10-28T05:00:00Z');
  const url = revs[revs.length - 1].exportLinks['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const tok = (await auth.getAccessToken());
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + (tok.token || tok) } });
  require('fs').writeFileSync(process.argv[2], Buffer.from(await res.arrayBuffer()));
  console.log('guardado', res.status);
})();
