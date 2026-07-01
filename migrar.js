const https = require('https');
const datos = require('./ibo_datos_importacion.json');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi8W3HzL0aAXY06bVpKGLCAFwmgUwp-sAeJKzzw8hQSJqQqyBjL49xbdvFhLLDyd1Dzw/exec';

const { _meta, ...appData } = datos;
const payload = JSON.stringify({ action: 'save', data: appData });

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        post(res.headers.location, body).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

console.log('Enviando datos a Google Sheets...');
console.log(`Alumnos: ${appData.alumnos?.length || 0}, Cursos: ${appData.cursos?.length || 0}, Pagos: ${appData.pagos?.length || 0}`);

post(GAS_URL, payload)
  .then(response => {
    try {
      const json = JSON.parse(response);
      if (json.ok) {
        console.log('✓ Datos guardados correctamente en Google Sheets.');
      } else {
        console.error('Error del servidor:', json.error);
      }
    } catch {
      console.log('Respuesta:', response);
    }
  })
  .catch(err => console.error('Error de red:', err.message));
