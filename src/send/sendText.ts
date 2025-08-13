import { httpClient } from '../http/httpClient';
import { TextMessage } from '../types/WhatsApp';

export async function sendText(to: string, message: string): Promise<void> {
  const payload: TextMessage = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message }
  };
  await httpClient.post('', payload);
}
