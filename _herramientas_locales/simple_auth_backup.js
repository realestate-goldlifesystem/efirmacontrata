const { google } = require('googleapis');
const http = require('http');
const fs = require('fs');
const url = require('url');
const opn = require('child_process');

const CREDENTIALS_PATH = './creds.json';
const TOKEN_PATH = './sheet_token.json';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Cargar credenciales
let keys;
try {
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const json = JSON.parse(content);
    keys = json.installed || json.web;
} catch (err) {
    console.error('Error cargando creds.json:', err);
    process.exit(1);
}

// Configurar cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    'http://localhost' // Redirección exacta
);

async function getNewToken() {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('✅ Autoriza la app visitando este URL:\n\n', authUrl, '\n');

    // Intentar abrir navegador automáticamente (Windows)
    try {
        opn.exec(`start "" "${authUrl.replace(/&/g, '^&')}"`);
    } catch (e) {
        console.log('(Copia y pega el link si no abre solo)');
    }

    const server = http.createServer(async (req, res) => {
        try {
            if (req.url.indexOf('/?code=') > -1) {
                const qs = new url.URL(req.url, 'http://localhost').searchParams;
                const code = qs.get('code');

                console.log('Código recibido. Obteniendo token...');

                const { tokens } = await oauth2Client.getToken(code);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

                console.log('✅ Token guardado en:', TOKEN_PATH);

                res.end('<h1>Autenticacion Exitosa!</h1><p>Puedes cerrar esta ventana y volver a la terminal.</p>');
                server.close();
                process.exit(0);
            }
        } catch (e) {
            console.error('Error obteniendo token:', e);
            res.end('Error: ' + e.message);
            server.close();
            process.exit(1);
        }
    }).listen(80, () => {
        console.log('Escuchando en http://localhost para la redirección... (Puerto 80)');
    });
}

getNewToken();
