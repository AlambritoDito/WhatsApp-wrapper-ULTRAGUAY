/**
 * Send an interactive button message via WhatsApp Cloud API.
 * Supports up to 3 reply buttons.
 */

import { FetchClient } from '../http/fetchClient.js';
import type { ButtonOption, SendResult } from '../types/messages.js';
import type { MessageResponse } from '../types/responses.js';

/**
 * Send an interactive message with reply buttons (max 3).
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number.
 * @param body - Message body text.
 * @param buttons - Array of button options (max 3).
 * @param options - Optional header, footer, and reply context.
 * @returns The wamid of the sent message.
 */
export async function sendButtons(
  fetchClient: FetchClient,
  to: string,
  body: string,
  buttons: ButtonOption[],
  options?: { header?: string; footer?: string; replyTo?: string },
): Promise<SendResult> {
  if (buttons.length === 0 || buttons.length > 3) {
    throw new Error('Button messages require 1-3 buttons');
  }

  const interactive: Record<string, unknown> = {
    type: 'button',
    body: { text: body },
    action: {
      buttons: buttons.map((btn) => ({
        type: 'reply',
        reply: { id: btn.id, title: btn.title },
      })),
    },
  };

  if (options?.header) {
    interactive.header = { type: 'text', text: options.header };
  }
  if (options?.footer) {
    interactive.footer = { text: options.footer };
  }

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive,
  };

  if (options?.replyTo) {
    payload.context = { message_id: options.replyTo };
  }

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}
