import { httpClient } from '../http/httpClient';

export async function sendLocationRequest(to: string, bodyText: string) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'location_request_message',
      body: { text: bodyText },
      action: { name: 'send_location' }
    }
  };

  await httpClient.post('', payload); // httpClient ya tiene baseURL
}