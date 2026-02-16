/**
 * Factory for creating pre-configured test clients with a mock adapter.
 * No real HTTP requests are made.
 */

import { WhatsAppClient } from '../client/WhatsAppClient.js';
import { MockAdapter } from './MockAdapter.js';
import { FetchClient } from '../http/fetchClient.js';
import type { WhatsAppClientConfig } from '../types/config.js';

/** Result of createTestClient. */
export interface TestClientResult {
  /** The WhatsApp client instance (with a mocked FetchClient). */
  client: WhatsAppClient;
  /** The mock adapter that recorded all outgoing calls. */
  mock: MockAdapter;
}

/** Default mock response for message sends. */
const MOCK_SEND_RESPONSE = {
  messaging_product: 'whatsapp',
  contacts: [{ input: '5511999999999', wa_id: '5511999999999' }],
  messages: [{ id: 'wamid.mock_message_id_12345' }],
};

/**
 * Create a WhatsAppClient wired to a MockAdapter.
 * All API calls are intercepted — nothing goes to Meta.
 *
 * @param configOverrides - Optional overrides for the client config.
 * @returns The client and mock adapter.
 *
 * @example
 * ```ts
 * const { client, mock } = createTestClient();
 *
 * client.on('message:text', async (msg) => {
 *   await msg.reply('Got it!');
 * });
 *
 * // Simulate an incoming message
 * client.processWebhook(makeTextWebhook('Hello'));
 *
 * expect(mock.messages).toHaveLength(1);
 * ```
 */
export function createTestClient(
  configOverrides?: Partial<WhatsAppClientConfig>,
): TestClientResult {
  const mock = new MockAdapter();

  const config: WhatsAppClientConfig = {
    accessToken: 'test-access-token',
    phoneNumberId: 'test-phone-number-id',
    appSecret: 'test-app-secret',
    webhookVerifyToken: 'test-verify-token',
    ...configOverrides,
  };

  const client = new WhatsAppClient(config);

  // Replace the internal fetchClient with a mock that records calls
  const originalPostJson = client._fetchClient.postJson.bind(client._fetchClient);
  client._fetchClient.postJson = async <T>(path: string, body: unknown): Promise<T> => {
    mock.record('POST', path, body);
    return MOCK_SEND_RESPONSE as T;
  };

  client._fetchClient.postForm = async <T>(path: string, _formData: FormData): Promise<T> => {
    mock.record('POST_FORM', path, { type: 'form-data' });
    return { id: 'mock-media-id' } as T;
  };

  client._fetchClient.get = async <T>(path: string): Promise<T> => {
    mock.record('GET', path, null);
    return {} as T;
  };

  return { client, mock };
}

/**
 * Create a webhook payload that simulates an incoming text message.
 * Useful for testing event handlers.
 *
 * @param text - The message text.
 * @param from - Sender phone number (default: '5511999999999').
 * @param messageId - Message ID (default: auto-generated).
 */
export function makeTextWebhook(
  text: string,
  from = '5511999999999',
  messageId?: string,
): unknown {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry-id',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'test-phone-number-id',
              },
              contacts: [{ profile: { name: 'Test User' }, wa_id: from }],
              messages: [
                {
                  from,
                  id: messageId ?? `wamid.test_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

/**
 * Create a webhook payload that simulates an incoming image message.
 */
export function makeImageWebhook(
  mediaId: string,
  mimeType = 'image/jpeg',
  from = '5511999999999',
): unknown {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry-id',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'test-phone-number-id',
              },
              messages: [
                {
                  from,
                  id: `wamid.test_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'image',
                  image: {
                    id: mediaId,
                    mime_type: mimeType,
                    sha256: 'abc123',
                    caption: 'Test image',
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

/**
 * Create a webhook payload that simulates a button reply.
 */
export function makeButtonReplyWebhook(
  buttonId: string,
  buttonTitle: string,
  from = '5511999999999',
): unknown {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry-id',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'test-phone-number-id',
              },
              messages: [
                {
                  from,
                  id: `wamid.test_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'interactive',
                  interactive: {
                    type: 'button_reply',
                    button_reply: { id: buttonId, title: buttonTitle },
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

/**
 * Create a webhook payload that simulates a status update.
 */
export function makeStatusWebhook(
  messageId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed',
  recipientId = '5511999999999',
): unknown {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry-id',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'test-phone-number-id',
              },
              statuses: [
                {
                  id: messageId,
                  status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: recipientId,
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}
