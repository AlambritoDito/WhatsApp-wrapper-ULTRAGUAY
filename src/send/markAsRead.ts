/**
 * Mark a message as read via WhatsApp Cloud API.
 */

import { FetchClient } from '../http/fetchClient.js';

/**
 * Mark a specific message as read (sends blue checkmarks).
 *
 * @param fetchClient - The HTTP client instance.
 * @param messageId - The wamid of the message to mark as read.
 */
export async function markAsRead(
  fetchClient: FetchClient,
  messageId: string,
): Promise<void> {
  await fetchClient.postJson('/messages', {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}
