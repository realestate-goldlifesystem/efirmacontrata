const { google } = require('googleapis');
const path = require('path');

const KEY_FILE = path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: SCOPES,
});

let foldersCount = 0;
let filesCount = 0;

async function countFiles(folderId) {
  const drive = google.drive({ version: 'v3', auth });
  
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, mimeType)',
      pageToken: pageToken
    });
    
    const files = res.data.files;
    if (!files) break;
    
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        foldersCount++;
        await countFiles(file.id);
      } else {
        filesCount++;
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
}

async function run() {
  const masterId = '1YIsZRuxPmX7Ks43N16gFP_9Gd7r9SPNH'; // PLANTILLA #1
  console.log('Contando archivos y carpetas en PLANTILLA #1...');
  await countFiles(masterId);
  console.log(`Total carpetas: ${foldersCount}`);
  console.log(`Total archivos: ${filesCount}`);
  console.log(`Estimado de tiempo de copia en Apps Script: ${((foldersCount + filesCount) * 0.7).toFixed(1)} segundos`);
}

run().catch(console.error);
