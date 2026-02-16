/**
 * Send reaction messages (add/remove emoji reactions) via WhatsApp Cloud API.
 */

import { FetchClient } from '../http/fetchClient.js';
import type { MessageResponse } from '../types/responses.js';

/**
 * React to a message with an emoji.
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number (must be the conversation participant).
 * @param messageId - The wamid of the message to react to.
 * @param emoji - The emoji to react with (e.g., '👍').
 */
export async function sendReaction(
  fetchClient: FetchClient,
  to: string,
  messageId: string,
  emoji: string,
): Promise<void> {
  await fetchClient.postJson<MessageResponse>('/messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'reaction',
    reaction: {
      message_id: messageId,
      emoji,
    },
  });
}

/**
 * Remove a reaction from a message.
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number.
 * @param messageId - The wamid of the message to remove the reaction from.
 */
export async function removeReaction(
  fetchClient: FetchClient,
  to: string,
  messageId: string,
): Promise<void> {
  await fetchClient.postJson<MessageResponse>('/messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'reaction',
    reaction: {
      message_id: messageId,
      emoji: '',
    },
  });
}
