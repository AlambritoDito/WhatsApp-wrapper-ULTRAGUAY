import { httpClient } from '../http/httpClient';
import { InteractiveMessage, ButtonOption } from '../types/WhatsApp';

export async function sendInteractive(
  to: string,
  body: string,
  buttons: ButtonOption[]
): Promise<void> {
  const payload: InteractiveMessage = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: { buttons: buttons.map(btn => ({ type: 'reply', reply: btn })) }
    }
  };
  await httpClient.post('', payload);
}