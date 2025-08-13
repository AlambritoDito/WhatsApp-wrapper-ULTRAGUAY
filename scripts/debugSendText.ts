import dotenv from 'dotenv';
dotenv.config();

import { GRAPH_API_URL } from '../src/config/metaConfig';
import { sendText } from '../src/send/sendText';

import axios from 'axios';

(async () => {
  // Read the test number from .env
  const to = process.env.TEST_PHONE;
  if (!to) {
    console.error('❌ ERROR: TEST_PHONE variable not defined in .env');
    process.exit(1);
  }

  const message = '🛠️ sendText debug';

  // Show key variables in the console
  console.log('––– ENVIRONMENT VARIABLES –––');
  console.log('META_TOKEN       :', process.env.META_TOKEN ? 'OK' : '⚠️ MISSING');
  console.log('PHONE_NUMBER_ID  :', process.env.PHONE_NUMBER_ID || '⚠️ MISSING');
  console.log('WEBHOOK_SECRET   :', process.env.WEBHOOK_SECRET ? 'OK' : '⚠️ MISSING');
  console.log('TEST_PHONE (to)  :', to);
  console.log('GRAPH_API_URL    :', GRAPH_API_URL);
  console.log('Message          :', message);
  console.log('–––––––––––––––––––––––––––––––\n');

  // First call: using your wrapper
  try {
    await sendText(to, message);
    console.log('✅ sendText executed successfully');
  } catch (err: any) {
    if (err.response) {
      console.error('❌ API error (wrapper): HTTP', err.response.status);
      console.error('❌ Response data       :', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('❌ Unknown error (wrapper):', err.message ?? err);
    }
    process.exit(1);
  }

  // Second call: direct Axios request to isolate the wrapper
  console.log('\nTesting direct call with Axios:');
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
      console.error('❌ Unknown Axios error:', err.message ?? err);
    }
    process.exit(1);
  }
})();