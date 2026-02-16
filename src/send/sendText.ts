/**
 * Send a text message via WhatsApp Cloud API.
 */

import { FetchClient } from '../http/fetchClient.js';
import type { SendResult } from '../types/messages.js';
import type { MessageResponse } from '../types/responses.js';

/**
 * Send a plain text message.
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number.
 * @param text - Message body text.
 * @param options - Optional settings.
 * @returns The wamid of the sent message.
 */
export async function sendText(
  fetchClient: FetchClient,
  to: string,
  text: string,
  options?: { previewUrl?: boolean; replyTo?: string },
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: text,
      preview_url: options?.previewUrl ?? false,
    },
  };

  if (options?.replyTo) {
    payload.context = { message_id: options.replyTo };
  }

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}
