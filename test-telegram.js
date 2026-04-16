
const https = require('https');

const botToken = '8649536607:AAHcV05D06Zlr2atP3BCh9--a_ox27KKcPM';
const chatId = '8303057631';

const payload = JSON.stringify({
  chat_id: chatId,
  text: "Bot configurado. Avisos activos.",
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${botToken}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => console.log('Respuesta:', body));
});

req.on('error', (e) => console.error('Error:', e));
req.write(payload);
req.end();
