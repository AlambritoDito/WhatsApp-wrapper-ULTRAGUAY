import dotenv from 'dotenv';
dotenv.config();

import { sendText } from '../src/send/sendText';
import axios from 'axios';
import { GRAPH_API_URL } from '../src/config/metaConfig';

(async () => {
  // Lee el número de prueba desde .env
  const to = process.env.TEST_PHONE;
  if (!to) {
    console.error('❌ ERROR: variable TEST_PHONE no definida en .env');
    process.exit(1);
  }

  const message = '🛠️ Debug de sendText';

  // Mostrar en consola las variables clave
  console.log('––– VARIABLES DE ENTORNO –––');
  console.log('META_TOKEN       :', process.env.META_TOKEN ? 'OK' : '⚠️ MISSING');
  console.log('PHONE_NUMBER_ID  :', process.env.PHONE_NUMBER_ID || '⚠️ MISSING');
  console.log('WEBHOOK_SECRET   :', process.env.WEBHOOK_SECRET ? 'OK' : '⚠️ MISSING');
  console.log('TEST_PHONE (to)  :', to);
  console.log('GRAPH_API_URL    :', GRAPH_API_URL);
  console.log('Mensaje          :', message);
  console.log('–––––––––––––––––––––––––––––––\n');

  // Primera llamada: usando tu wrapper
  try {
    await sendText(to, message);
    console.log('✅ sendText ejecutado con éxito');
  } catch (err: any) {
    if (err.response) {
      console.error('❌ Error del API (wrapper): HTTP', err.response.status);
      console.error('❌ Response data           :', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('❌ Error desconocido (wrapper):', err.message ?? err);
    }
    process.exit(1);
  }

  // Segunda llamada: directa con Axios para aislar el wrapper
  console.log('\nProbando llamada directa con Axios:');
  try {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      text: { body: message + ' (Axios)' }
    };
    const headers = {
      Authorization: `Bearer ${process.env.META_TOKEN}`,
      'Content-Type': 'application/json'
    };
    const resp = await axios.post(GRAPH_API_URL, payload, { headers });
    console.log('✅ Axios status:', resp.status);
    console.log('✅ Axios data  :', JSON.stringify(resp.data, null, 2));
  } catch (err: any) {
    if (err.response) {
      console.error('❌ Axios error: HTTP', err.response.status);
      console.error('❌ Response data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('❌ Axios error desconocido:', err.message ?? err);
    }
    process.exit(1);
  }
})();