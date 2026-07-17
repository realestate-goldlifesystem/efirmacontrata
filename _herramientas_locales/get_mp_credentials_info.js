const https = require('https');

const MP_ACCESS_TOKEN = 'APP_USR-8777396757564882-052314-43723717a419b60b7e28e4b9a4638c6d-365464952';

function fetchUserInfo() {
    return new Promise((resolve, reject) => {
        const url = 'https://api.mercadopago.com/users/me';
        const options = {
            headers: {
                'Authorization': 'Bearer ' + MP_ACCESS_TOKEN
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

fetchUserInfo().then(console.log).catch(console.error);
