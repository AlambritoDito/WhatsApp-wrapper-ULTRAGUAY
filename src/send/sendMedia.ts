/**
 * Send media messages (image, video, audio, document, sticker) via WhatsApp Cloud API.
 */

import { FetchClient } from '../http/fetchClient.js';
import type { DocumentOptions, MediaReference, SendResult } from '../types/messages.js';
import type { MessageResponse } from '../types/responses.js';

/** Resolve a MediaReference to the API payload shape. */
function resolveMedia(ref: MediaReference): Record<string, string> {
  if (ref.id) return { id: ref.id };
  if (ref.url) return { link: ref.url };
  throw new Error('MediaReference must have either `url` or `id`');
}

/**
 * Send an image message.
 *
 * @param fetchClient - The HTTP client instance.
 * @param to - Recipient phone number.
 * @param media - Media reference (URL or ID).
 * @param caption - Optional image caption.
 * @param replyTo - Optional message ID to reply to.
 */
export async function sendImage(
  fetchClient: FetchClient,
  to: string,
  media: MediaReference,
  caption?: string,
  replyTo?: string,
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { ...resolveMedia(media), ...(caption ? { caption } : {}) },
  };
  if (replyTo) payload.context = { message_id: replyTo };

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}

/**
 * Send a video message.
 */
export async function sendVideo(
  fetchClient: FetchClient,
  to: string,
  media: MediaReference,
  caption?: string,
  replyTo?: string,
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'video',
    video: { ...resolveMedia(media), ...(caption ? { caption } : {}) },
  };
  if (replyTo) payload.context = { message_id: replyTo };

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}

/**
 * Send an audio message.
 */
export async function sendAudio(
  fetchClient: FetchClient,
  to: string,
  media: MediaReference,
  replyTo?: string,
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'audio',
    audio: resolveMedia(media),
  };
  if (replyTo) payload.context = { message_id: replyTo };

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}

/**
 * Send a document message.
 */
export async function sendDocument(
  fetchClient: FetchClient,
  to: string,
  media: MediaReference,
  options?: DocumentOptions,
  replyTo?: string,
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'document',
    document: {
      ...resolveMedia(media),
      ...(options?.filename ? { filename: options.filename } : {}),
      ...(options?.caption ? { caption: options.caption } : {}),
    },
  };
  if (replyTo) payload.context = { message_id: replyTo };

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}

/**
 * Send a sticker message.
 */
export async function sendSticker(
  fetchClient: FetchClient,
  to: string,
  media: MediaReference,
  replyTo?: string,
): Promise<SendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'sticker',
    sticker: resolveMedia(media),
  };
  if (replyTo) payload.context = { message_id: replyTo };

  const response = await fetchClient.postJson<MessageResponse>('/messages', payload);
  return { messageId: response.messages[0].id };
}
