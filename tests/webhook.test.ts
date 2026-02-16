import crypto from 'crypto';

import { WhatsAppClient, verifyWebhookSignature } from '../src/client';
import type { WebhookPayload, InboundMessage, StatusUpdate } from '../src/types';

const APP_SECRET = 'test-app-secret-123';

function sign(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyWebhookSignature (standalone)', () => {
  it('returns true for valid signature', () => {
    const body = '{"test":true}';
    const sig = sign(body, APP_SECRET);
    expect(verifyWebhookSignature(body, sig, APP_SECRET)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    expect(verifyWebhookSignature('body', 'sha256=invalid', APP_SECRET)).toBe(false);
  });

  it('returns false for wrong secret', () => {
    const body = '{"test":true}';
    const sig = sign(body, APP_SECRET);
    expect(verifyWebhookSignature(body, sig, 'wrong-secret')).toBe(false);
  });

  it('works with Buffer input', () => {
    const body = Buffer.from('{"test":true}');
    const sig = sign(body.toString(), APP_SECRET);
    expect(verifyWebhookSignature(body, sig, APP_SECRET)).toBe(true);
  });
});

describe('WhatsAppClient.handleWebhook', () => {
  // Mock fetch globally so constructing client doesn't fail
  const originalFetch = globalThis.fetch;
  beforeAll(() => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => '{}',
    } as Response));
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('emits message events for parsed messages', () => {
    const client = new WhatsAppClient({
      accessToken: 'token',
      phoneNumberId: 'phone',
      appSecret: APP_SECRET,
    });

    const received: InboundMessage[] = [];
    const textReceived: InboundMessage[] = [];

    client.on('message', (msg) => received.push(msg));
    client.on('message:text', (msg) => textReceived.push(msg));

    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550001234', phone_number_id: 'PID' },
                contacts: [{ profile: { name: 'Test' }, wa_id: '521' }],
                messages: [
                  { from: '521', id: 'w1', timestamp: '1700000000', type: 'text', text: { body: 'Hello' } },
                ],
              },
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = sign(rawBody, APP_SECRET);

    client.handleWebhook({ rawBody, signature, body: payload });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('text');
    expect(textReceived).toHaveLength(1);
  });

  it('emits status events', () => {
    const client = new WhatsAppClient({
      accessToken: 'token',
      phoneNumberId: 'phone',
      appSecret: APP_SECRET,
    });

    const statuses: StatusUpdate[] = [];
    client.on('status', (s) => statuses.push(s));

    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550001234', phone_number_id: 'PID' },
                statuses: [
                  { id: 'wamid.s1', recipient_id: '521', timestamp: '1700000000', status: 'delivered' },
                ],
              },
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    client.handleWebhook({ rawBody, signature: sign(rawBody, APP_SECRET), body: payload });

    expect(statuses).toHaveLength(1);
    expect(statuses[0].status).toBe('delivered');
  });

  it('throws on invalid signature', () => {
    const client = new WhatsAppClient({
      accessToken: 'token',
      phoneNumberId: 'phone',
      appSecret: APP_SECRET,
    });

    // Listen for errors
    const errors: Error[] = [];
    client.on('error', (e) => errors.push(e));

    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [],
    };

    expect(() =>
      client.handleWebhook({ rawBody: '{}', signature: 'sha256=bad', body: payload }),
    ).toThrow('Invalid webhook signature');
  });

  it('skips signature check when no appSecret configured', () => {
    const client = new WhatsAppClient({
      accessToken: 'token',
      phoneNumberId: 'phone',
      // No appSecret
    });

    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [],
    };

    // Should not throw even though signature is present
    expect(() =>
      client.handleWebhook({ rawBody: '{}', signature: 'sha256=anything', body: payload }),
    ).not.toThrow();
  });
});
