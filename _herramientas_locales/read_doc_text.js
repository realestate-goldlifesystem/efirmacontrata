const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'real-estate-ocr-468904-38d35bfd32d6.json');

async function getAuth() {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/documents.readonly'],
    });
    return auth;
}

async function getDocText(documentId) {
    const auth = await getAuth();
    const docs = google.docs({ version: 'v1', auth });

    try {
        const res = await docs.documents.get({ documentId });
        const doc = res.data;
        let text = '';
        
        // Extract text from body
        if (doc.body && doc.body.content) {
            doc.body.content.forEach(element => {
                if (element.paragraph) {
                    element.paragraph.elements.forEach(el => {
                        if (el.textRun) {
                            text += el.textRun.content;
                        }
                    });
                }
            });
        }
        
        console.log(`Document Title: ${doc.title}`);
        
        // Check for specific keywords
        const keywords = ['venta', 'corretaje', 'Venta', 'Corretaje', 'VENTA', 'CORRETAJE'];
        const found = [];
        
        keywords.forEach(kw => {
            if (text.includes(kw)) {
                found.push(kw);
            }
        });
        
        if (found.length > 0) {
            console.log(`\nFound keywords in the document: ${[...new Set(found)].join(', ')}`);
            // Print a snippet around the first occurrence
            const kw = found[0];
            const index = text.indexOf(kw);
            const start = Math.max(0, index - 50);
            const end = Math.min(text.length, index + 50);
            console.log(`\nSnippet: ...${text.substring(start, end).replace(/\n/g, ' ')}...`);
        } else {
            console.log('\nNo target keywords found in the document text.');
        }

    } catch (e) {
        console.error('Error fetching document:', e.message);
    }
}

const docId = process.argv[2];
if (!docId) {
    console.error('Please provide a document ID.');
    process.exit(1);
}

getDocText(docId);
