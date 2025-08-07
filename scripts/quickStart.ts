import dotenv from 'dotenv';
dotenv.config();

import {
  sendText,
  sendInteractive,
  startWebhookServer,
  parseIncoming
} from '../src/index';

// 1. Start webhook server on port 3000
startWebhookServer(3000);
console.log('Webhook server started on port 3000');

// 2. Send a test text message
(async () => {
  try {
    const to = process.env.TEST_PHONE!;
    console.log('Sending text message to:', to);
    await sendText(to, 'Hello world from Quick Start!');

    // 3. Send test interactive buttons
    console.log('Sending interactive message to:', to);
    await sendInteractive(
      to,
      'What would you like to do?',
      [
        { id: 'view_catalog', title: 'View catalog' },
        { id: 'contact',    title: 'Contact' }
      ]
    );
    console.log('Messages sent successfully');
  } catch (err: any) {
    console.error('Error in Quick Start script:', err.response?.data ?? err.message);
  }
})();
