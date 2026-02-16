/**
 * Send template messages via WhatsApp Cloud API.
 */

import { FetchClient } from '../http/fetchClient.js';
import type { SendResult, TemplateComponent } from '../types/messages.js';
import type { MessageResponse } from '../types/responses.js';

/**
 * Send a pre-approved template message.
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number.
 * @param templateName - Name of the approved template.
 * @param languageCode - Language code (e.g., 'en', 'es').
 * @param components - Optional template components (header, body, buttons).
 * @param replyTo - Optional message ID to reply to.
 */
export async function sendTemplate(
  fetchClient: FetchClient,
  to: string,
  templateName: string,
  languageCode: string,
  components?: TemplateComponent[],
  replyTo?: string,
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components && components.length > 0 ? { components } : {}),
    },
  };

  if (replyTo) {
    payload.context = { message_id: replyTo };
  }

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}
