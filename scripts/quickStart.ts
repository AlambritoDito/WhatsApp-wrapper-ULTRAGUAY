// scripts/quickStart.ts
import dotenv from 'dotenv';
dotenv.config();

import { startWebhookServer } from '../src/receive/webhookServer';
import { sendInteractive } from '../src/send/sendInteractive';
import { sendText } from '../src/send/sendText';

const PORT = Number(process.env.PORT || 3000);

startWebhookServer(
  PORT,
  async ({ from, type, payload }) => {
    console.log('onMessage handler:', { from, type, payload });
    if (type === 'button') {
      if (payload === 'view_catalog' || payload === 'ver_catalogo') {
        await sendText(from, '📋 Here is your catalog!');
      } else {
        await sendText(from, `You clicked: ${payload}`);
      }
    } else if (type === 'text' && payload) {
      await sendText(from, `You said: ${payload}`);
    }
  },
  { allowUnsignedTests: process.env.ALLOW_UNSIGNED_TESTS === 'true' }
);

(async () => {
  const to = process.env.TEST_PHONE!;
  console.log('Sending text message to:', to);
  await sendText(to, 'Hello world from Quick Start!');
  console.log('Sending interactive message to:', to);
  await sendInteractive(to, 'What would you like to do?', [
    { id: 'view_catalog', title: 'View catalog' },
    { id: 'contact',      title: 'Contact' },
  ]);
  console.log('✅ Messages sent — waiting for webhooks…');
})();