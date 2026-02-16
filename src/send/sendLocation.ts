/**
 * Send location and location request messages via WhatsApp Cloud API.
 */

import { FetchClient } from '../http/fetchClient.js';
import type { LocationData, SendResult } from '../types/messages.js';
import type { MessageResponse } from '../types/responses.js';

/**
 * Send a location pin message.
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number.
 * @param location - Location data (latitude, longitude, name, address).
 * @param replyTo - Optional message ID to reply to.
 */
export async function sendLocation(
  fetchClient: FetchClient,
  to: string,
  location: LocationData,
  replyTo?: string,
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'location',
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      address: location.address,
    },
  };

  if (replyTo) {
    payload.context = { message_id: replyTo };
  }

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}

/**
 * Request the user's location via an interactive message.
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number.
 * @param body - Prompt text shown to the user.
 * @param replyTo - Optional message ID to reply to.
 */
export async function requestLocation(
  fetchClient: FetchClient,
  to: string,
  body: string,
  replyTo?: string,
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'location_request_message',
      body: { text: body },
      action: { name: 'send_location' },
    },
  };

  if (replyTo) {
    payload.context = { message_id: replyTo };
  }

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}
