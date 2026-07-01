const https = require('https');
const datos = require('./ibo_datos_importacion.json');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi8W3HzL0aAXY06bVpKGLCAFwmgUwp-sAeJKzzw8hQSJqQqyBjL49xbdvFhLLDyd1Dzw/exec';

const { _meta, ...appData } = datos;
const payload = JSON.stringify({ action: 'save', data: appData });

function request(url, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method,
      headers: body ? {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(body),
      } : {},
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log('Enviando datos a Google Sheets...');
  console.log(`Alumnos: ${appData.alumnos?.length || 0}, Cursos: ${appData.cursos?.length || 0}, Pagos: ${appData.pagos?.length || 0}`);

  // Primer intento: POST directo
  const res1 = await request(GAS_URL, 'POST', payload);
  console.log('Status:', res1.status);

  if (res1.status >= 200 && res1.status < 300) {
    try {
      const json = JSON.parse(res1.body);
      if (json.ok) {
        console.log('✓ Datos guardados correctamente en Google Sheets.');
      } else {
        console.error('Error del servidor:', json.error);
      }
    } catch {
      console.error('Respuesta inesperada:', res1.body.slice(0, 200));
    }
    return;
  }

  if (res1.status === 302 || res1.status === 301) {
    const location = res1.headers.location;

    // GET a la URL redirigida para leer la respuesta
    const res2 = await request(location, 'GET', null);
    console.log('Status 2:', res2.status);

    try {
      const json = JSON.parse(res2.body);
      if (json.ok) {
        console.log('✓ Datos guardados correctamente en Google Sheets.');
      } else {
        console.error('Error del servidor:', json.error);
      }
    } catch {
      console.error('Respuesta inesperada (2):', res2.body.slice(0, 200));
    }
    return;
  }

  console.error('Respuesta inesperada, status:', res1.status);
  console.error('Body:', res1.body.slice(0, 300));
}

run().catch(err => console.error('Error:', err.message));
