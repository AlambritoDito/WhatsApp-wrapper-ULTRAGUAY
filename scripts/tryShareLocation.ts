import dotenv from 'dotenv';

dotenv.config();
import { startWebhookServer } from '../src/receive/webhookServer';
import { sendInteractive } from '../src/send/sendInteractive';
import { sendLocationRequest } from '../src/send/sendLocationRequest';
import { sendText } from '../src/send/sendText';

startWebhookServer(3000, async ({ from, type, payload }) => {
  console.log('onMessage:', { from, type, payload });

  if (type === 'button') {
    if (payload === 'request_location') {
      // Lanza el diálogo nativo para que el usuario comparta su ubicación
      await sendLocationRequest(from, 'Please share your location 📍');
    }
  }

  if (type === 'location') {
    const { latitude, longitude, name, address } = payload;
    await sendText(
      from,
      `✅ Location received:\nlat: ${latitude}\nlng: ${longitude}\n${name ?? ''}\n${address ?? ''}`
    );
    // aquí puedes: guardar en DB, calcular distancias, etc.
  }
});
console.log('Webhook server started on port 3000');

(async () => {
  const to = process.env.TEST_PHONE;
  if (!to) {
    console.error('❌ TEST_PHONE is not defined in .env');
    process.exit(1);
  }

  try {
    await sendInteractive(to, 'What would you like to do?', [
      { id: 'request_location', title: 'Share my location' },
    ]);
    console.log('✅ Location request menu sent');
  } catch (err: any) {
    console.error('❌ Error sending interactive:', err?.response?.data ?? err?.message ?? err);
    process.exit(1);
  }
})();