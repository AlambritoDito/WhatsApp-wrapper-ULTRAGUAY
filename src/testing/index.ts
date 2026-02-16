/**
 * Testing utilities subpath export.
 *
 * ```ts
 * import { MockWhatsAppClient, createMockWebhookPayload } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/testing';
 * ```
 *
 * @module testing
 */

import type {
  SendResponse,
  SendTextOptions,
  MediaRef,
  SendImageOptions,
  SendVideoOptions,
  SendAudioOptions,
  SendDocumentOptions,
  SendStickerOptions,
  Location,
  SendTemplateOptions,
  Contact,
  Interactive,
  SendInteractiveOptions,
  UploadMediaResult,
  MediaUrlResult,
  WebhookPayload,
  InboundMessageType,
} from '../types';

// ---------------------------------------------------------------------------
// Call recording
// ---------------------------------------------------------------------------

/** A single recorded call made against the mock client. */
export interface RecordedCall {
  method: string;
  args: unknown[];
  timestamp: number;
}

// ---------------------------------------------------------------------------
// MockWhatsAppClient
// ---------------------------------------------------------------------------

let nextWamid = 1;

function wamid(): string {
  return `wamid.mock.${nextWamid++}`;
}

/**
 * A mock implementation of `WhatsAppClient` that records all calls
 * without making real HTTP requests.
 *
 * @example
 * ```ts
 * const mock = new MockWhatsAppClient();
 * await mock.sendText('123', 'hello');
 * console.log(mock.calls); // [{ method: 'sendText', args: ['123', 'hello'], ... }]
 * ```
 */
export class MockWhatsAppClient {
  /** All recorded calls in order. */
  readonly calls: RecordedCall[] = [];

  /** Optional override for the wamid returned by send methods. */
  nextWamidOverride?: string;

  private record(method: string, args: unknown[]): SendResponse {
    const id = this.nextWamidOverride ?? wamid();
    this.nextWamidOverride = undefined;
    this.calls.push({ method, args, timestamp: Date.now() });
    return { wamid: id };
  }

  /** Reset recorded calls and counters. */
  reset(): void {
    this.calls.length = 0;
    nextWamid = 1;
  }

  /** Get all calls for a specific method name. */
  callsFor(method: string): RecordedCall[] {
    return this.calls.filter((c) => c.method === method);
  }

  // -- Send methods --------------------------------------------------------

  /** @see WhatsAppClient.sendText */
  async sendText(to: string, text: string, opts?: SendTextOptions): Promise<SendResponse> {
    return this.record('sendText', [to, text, opts]);
  }

  /** @see WhatsAppClient.sendImage */
  async sendImage(to: string, image: MediaRef, opts?: SendImageOptions): Promise<SendResponse> {
    return this.record('sendImage', [to, image, opts]);
  }

  /** @see WhatsAppClient.sendVideo */
  async sendVideo(to: string, video: MediaRef, opts?: SendVideoOptions): Promise<SendResponse> {
    return this.record('sendVideo', [to, video, opts]);
  }

  /** @see WhatsAppClient.sendAudio */
  async sendAudio(to: string, audio: MediaRef, opts?: SendAudioOptions): Promise<SendResponse> {
    return this.record('sendAudio', [to, audio, opts]);
  }

  /** @see WhatsAppClient.sendDocument */
  async sendDocument(to: string, document: MediaRef, opts?: SendDocumentOptions): Promise<SendResponse> {
    return this.record('sendDocument', [to, document, opts]);
  }

  /** @see WhatsAppClient.sendSticker */
  async sendSticker(to: string, sticker: MediaRef, opts?: SendStickerOptions): Promise<SendResponse> {
    return this.record('sendSticker', [to, sticker, opts]);
  }

  /** @see WhatsAppClient.sendLocation */
  async sendLocation(to: string, location: Location): Promise<SendResponse> {
    return this.record('sendLocation', [to, location]);
  }

  /** @see WhatsAppClient.sendLocationRequest */
  async sendLocationRequest(to: string, text: string): Promise<SendResponse> {
    return this.record('sendLocationRequest', [to, text]);
  }

  /** @see WhatsAppClient.sendTemplate */
  async sendTemplate(to: string, templateName: string, opts?: SendTemplateOptions): Promise<SendResponse> {
    return this.record('sendTemplate', [to, templateName, opts]);
  }

  /** @see WhatsAppClient.sendReaction */
  async sendReaction(to: string, messageId: string, emoji: string): Promise<SendResponse> {
    return this.record('sendReaction', [to, messageId, emoji]);
  }

  /** @see WhatsAppClient.sendContacts */
  async sendContacts(to: string, contacts: Contact[]): Promise<SendResponse> {
    return this.record('sendContacts', [to, contacts]);
  }

  /** @see WhatsAppClient.sendInteractive */
  async sendInteractive(to: string, interactive: Interactive, opts?: SendInteractiveOptions): Promise<SendResponse> {
    return this.record('sendInteractive', [to, interactive, opts]);
  }

  /** @see WhatsAppClient.markAsRead */
  async markAsRead(messageId: string): Promise<void> {
    this.calls.push({ method: 'markAsRead', args: [messageId], timestamp: Date.now() });
  }

  // -- Media methods -------------------------------------------------------

  /** @see WhatsAppClient.uploadMedia */
  async uploadMedia(file: Buffer | Uint8Array, mimeType: string, filename?: string): Promise<UploadMediaResult> {
    this.calls.push({ method: 'uploadMedia', args: [file, mimeType, filename], timestamp: Date.now() });
    return { id: `media.mock.${Date.now()}` };
  }

  /** @see WhatsAppClient.getMediaUrl */
  async getMediaUrl(mediaId: string): Promise<MediaUrlResult> {
    this.calls.push({ method: 'getMediaUrl', args: [mediaId], timestamp: Date.now() });
    return {
      url: `https://mock.example.com/media/${mediaId}`,
      mime_type: 'application/octet-stream',
      sha256: 'mock-sha256',
      file_size: 0,
      id: mediaId,
      messaging_product: 'whatsapp',
    };
  }

  /** @see WhatsAppClient.downloadMedia */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    this.calls.push({ method: 'downloadMedia', args: [mediaId], timestamp: Date.now() });
    return Buffer.from('mock-media-data');
  }

  /** @see WhatsAppClient.deleteMedia */
  async deleteMedia(mediaId: string): Promise<void> {
    this.calls.push({ method: 'deleteMedia', args: [mediaId], timestamp: Date.now() });
  }
}

// ---------------------------------------------------------------------------
// Webhook payload factory
// ---------------------------------------------------------------------------

/**
 * Create a realistic‑looking webhook payload for testing.
 *
 * @param type - Inbound message type.
 * @param data - Partial data merged into the generated message.
 * @returns A `WebhookPayload` ready to feed into `parseIncoming` or `handleWebhook`.
 *
 * @example
 * ```ts
 * const payload = createMockWebhookPayload('text', { text: { body: 'Hi!' } });
 * const messages = parseIncoming(payload);
 * ```
 */
export function createMockWebhookPayload(
  type: InboundMessageType | 'status',
  data?: Record<string, unknown>,
): WebhookPayload {
  const from = String(data?.from ?? '5215512345678');
  const timestamp = String(data?.timestamp ?? Math.floor(Date.now() / 1000));
  const id = String(data?.id ?? `wamid.test.${Date.now()}`);

  if (type === 'status') {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550001234', phone_number_id: 'PHONE_ID' },
                statuses: [
                  {
                    id,
                    recipient_id: from,
                    timestamp,
                    status: 'delivered',
                    ...data,
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  }

  const msg: Record<string, unknown> = { from, timestamp, id, type, ...buildTypeData(type, data) };

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550001234', phone_number_id: 'PHONE_ID' },
              contacts: [{ profile: { name: 'Test User' }, wa_id: from }],
              messages: [msg],
            },
          },
        ],
      },
    ],
  };
}

function buildTypeData(type: string, data?: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'text':
      return { text: { body: 'Hello', ...((data?.text ?? {}) as Record<string, unknown>) } };
    case 'image':
      return {
        image: {
          id: 'media123',
          mime_type: 'image/jpeg',
          sha256: 'abc',
          ...((data?.image ?? {}) as Record<string, unknown>),
        },
      };
    case 'video':
      return {
        video: {
          id: 'media123',
          mime_type: 'video/mp4',
          sha256: 'abc',
          ...((data?.video ?? {}) as Record<string, unknown>),
        },
      };
    case 'audio':
      return {
        audio: {
          id: 'media123',
          mime_type: 'audio/ogg',
          sha256: 'abc',
          ...((data?.audio ?? {}) as Record<string, unknown>),
        },
      };
    case 'document':
      return {
        document: {
          id: 'media123',
          mime_type: 'application/pdf',
          sha256: 'abc',
          filename: 'test.pdf',
          ...((data?.document ?? {}) as Record<string, unknown>),
        },
      };
    case 'sticker':
      return {
        sticker: {
          id: 'media123',
          mime_type: 'image/webp',
          sha256: 'abc',
          ...((data?.sticker ?? {}) as Record<string, unknown>),
        },
      };
    case 'location':
      return {
        location: {
          latitude: 19.4326,
          longitude: -99.1332,
          name: 'Mexico City',
          address: 'CDMX',
          ...((data?.location ?? {}) as Record<string, unknown>),
        },
      };
    case 'contacts':
      return {
        contacts: data?.contacts ?? [
          {
            name: { formatted_name: 'John Doe', first_name: 'John', last_name: 'Doe' },
            phones: [{ phone: '+1234567890', type: 'CELL' }],
          },
        ],
      };
    case 'interactive_reply':
      return {
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'btn_1', title: 'Yes' },
          ...((data?.interactive ?? {}) as Record<string, unknown>),
        },
      };
    case 'reaction':
      return {
        reaction: {
          message_id: 'wamid.original',
          emoji: '👍',
          ...((data?.reaction ?? {}) as Record<string, unknown>),
        },
      };
    case 'flow_reply':
      return {
        type: 'interactive',
        interactive: {
          type: 'nfm_reply',
          nfm_reply: {
            response_json: '{"screen":"WELCOME","data":{}}',
            body: 'Flow response',
            ...((data?.nfm_reply ?? {}) as Record<string, unknown>),
          },
        },
      };
    case 'order':
      return {
        order: {
          catalog_id: 'cat_123',
          product_items: [{ product_retailer_id: 'sku_1', quantity: 1, item_price: 100, currency: 'MXN' }],
          ...((data?.order ?? {}) as Record<string, unknown>),
        },
      };
    case 'system':
      return {
        system: {
          body: 'System message',
          type: 'customer_changed_number',
          ...((data?.system ?? {}) as Record<string, unknown>),
        },
      };
    case 'referral':
      return {
        referral: {
          source_url: 'https://example.com',
          source_type: 'ad',
          ...((data?.referral ?? {}) as Record<string, unknown>),
        },
        text: { body: 'From an ad' },
      };
    default:
      return {};
  }
}
