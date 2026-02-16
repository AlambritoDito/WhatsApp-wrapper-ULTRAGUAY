/**
 * Mock adapter for testing WhatsApp bots without hitting the real API.
 *
 * Records all outgoing messages and provides helpers to inspect them.
 * Can also simulate incoming messages by emitting events on a client.
 */

import { EventEmitter } from 'events';

/** A recorded outgoing message. */
export interface RecordedMessage {
  method: string;
  path: string;
  body: unknown;
  timestamp: number;
}

/**
 * MockAdapter intercepts and records all API calls made by a WhatsAppClient.
 * Use it in tests to verify your bot sends the right messages.
 *
 * @example
 * ```ts
 * const { client, mock } = createTestClient();
 *
 * await client.sendText('5511999999999', 'Hello!');
 *
 * expect(mock.messages).toHaveLength(1);
 * expect(mock.lastMessage?.body).toMatchObject({
 *   type: 'text',
 *   text: { body: 'Hello!' },
 * });
 * ```
 */
export class MockAdapter extends EventEmitter {
  /** All recorded outgoing messages. */
  readonly messages: RecordedMessage[] = [];

  /** Get the last recorded message, or undefined. */
  get lastMessage(): RecordedMessage | undefined {
    return this.messages[this.messages.length - 1];
  }

  /** Record an outgoing message. */
  record(method: string, path: string, body: unknown): void {
    const entry: RecordedMessage = {
      method,
      path,
      body,
      timestamp: Date.now(),
    };
    this.messages.push(entry);
    this.emit('outgoing', entry);
  }

  /** Clear all recorded messages. */
  clear(): void {
    this.messages.length = 0;
  }

  /** Get all messages sent to a specific phone number. */
  messagesTo(phone: string): RecordedMessage[] {
    return this.messages.filter((m) => {
      const body = m.body as Record<string, unknown> | undefined;
      return body?.to === phone;
    });
  }

  /** Get all messages of a specific type (text, image, interactive, etc.). */
  messagesOfType(type: string): RecordedMessage[] {
    return this.messages.filter((m) => {
      const body = m.body as Record<string, unknown> | undefined;
      return body?.type === type;
    });
  }
}
