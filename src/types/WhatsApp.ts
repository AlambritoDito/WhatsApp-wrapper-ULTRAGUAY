/**
 * Basic types for WhatsApp messages
 */
export interface ButtonOption {
  id: string;
  title: string;
}

export interface InteractiveMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button';
    body: { text: string };
    action: { buttons: Array<{ type: 'reply'; reply: ButtonOption }> };
  };
}

export interface TextMessage {
  messaging_product: 'whatsapp';
  to: string;
  text: { body: string };
}

export interface WebhookEntry {
  entry: Array<{ changes: Array<{ value: { messages?: any[] } }> }>;
}