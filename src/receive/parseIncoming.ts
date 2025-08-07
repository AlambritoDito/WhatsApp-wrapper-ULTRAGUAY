import { WebhookEntry } from '../types/WhatsApp';

export function parseIncoming(body: any) {
  // Simplify for buttons
  const msg = body.entry[0].changes[0].value.messages?.[0];
  if (msg?.button) {
    return {
      from: msg.from,
      type: 'button',
      payload: msg.button.payload
    };
  }
  return { from: msg.from, type: 'text', payload: msg.text?.body };
}