/**
 * Send an interactive list message via WhatsApp Cloud API.
 * Lists support multiple sections with rows (up to 10 rows total).
 */

import { FetchClient } from '../http/fetchClient.js';
import type { ListMessageOptions, SendResult } from '../types/messages.js';
import type { MessageResponse } from '../types/responses.js';

/**
 * Send an interactive list message with sections.
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number.
 * @param options - List message configuration.
 * @param extra - Optional reply context.
 * @returns The wamid of the sent message.
 */
export async function sendList(
  fetchClient: FetchClient,
  to: string,
  options: ListMessageOptions,
  extra?: { replyTo?: string },
): Promise<SendResult> {
  const interactive: Record<string, unknown> = {
    type: 'list',
    body: { text: options.body },
    action: {
      button: options.buttonText,
      sections: options.sections.map((section) => ({
        title: section.title,
        rows: section.rows.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
        })),
      })),
    },
  };

  if (options.header) {
    interactive.header = { type: 'text', text: options.header };
  }
  if (options.footer) {
    interactive.footer = { text: options.footer };
  }

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive,
  };

  if (extra?.replyTo) {
    payload.context = { message_id: extra.replyTo };
  }

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}
