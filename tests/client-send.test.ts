import { WhatsAppClient } from '../src/client';
import { WhatsAppError } from '../src/errors';

/**
 * Test suite for WhatsAppClient send methods.
 *
 * We mock global `fetch` to capture outgoing requests without hitting the
 * real WhatsApp API.
 */

const TOKEN = 'test-token';
const PHONE_ID = '123456789';
const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`;

/** Captured request from the mocked fetch. */
interface CapturedRequest {
  url: string;
  init: RequestInit;
  body: Record<string, unknown>;
}

let captured: CapturedRequest[] = [];
let fetchResponse: { ok: boolean; status: number; body: unknown } = {
  ok: true,
  status: 200,
  body: { messages: [{ id: 'wamid.HBgLNTIxNTUxMjM0NTY3OBUCABEYEjA' }] },
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  captured = [];
  fetchResponse = {
    ok: true,
    status: 200,
    body: { messages: [{ id: 'wamid.HBgLNTIxNTUxMjM0NTY3OBUCABEYEjA' }] },
  };
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    let body: Record<string, unknown> = {};
    if (typeof init?.body === 'string') {
      body = JSON.parse(init.body);
    }
    captured.push({ url, init: init ?? {}, body });
    return {
      ok: fetchResponse.ok,
      status: fetchResponse.status,
      headers: new Headers(),
      text: async () => JSON.stringify(fetchResponse.body),
      json: async () => fetchResponse.body,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response;
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

function createClient(): WhatsAppClient {
  return new WhatsAppClient({
    accessToken: TOKEN,
    phoneNumberId: PHONE_ID,
    apiVersion: API_VERSION,
    http: { maxRetries: 0 },
  });
}

describe('WhatsAppClient send methods', () => {
  it('sendText sends correct payload', async () => {
    const client = createClient();
    const res = await client.sendText('5215512345678', 'Hello!');
    expect(res.wamid).toBe('wamid.HBgLNTIxNTUxMjM0NTY3OBUCABEYEjA');
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe(BASE_URL);
    expect(captured[0].body).toEqual({
      messaging_product: 'whatsapp',
      to: '5215512345678',
      type: 'text',
      text: { body: 'Hello!', preview_url: false },
    });
  });

  it('sendText with previewUrl and replyTo', async () => {
    const client = createClient();
    await client.sendText('123', 'Check this: https://example.com', {
      previewUrl: true,
      replyTo: 'wamid.original',
    });
    expect(captured[0].body.text).toEqual({ body: 'Check this: https://example.com', preview_url: true });
    expect(captured[0].body.context).toEqual({ message_id: 'wamid.original' });
  });

  it('sendImage by URL with caption', async () => {
    const client = createClient();
    await client.sendImage('123', { url: 'https://example.com/img.jpg' }, { caption: 'Nice pic' });
    expect(captured[0].body.type).toBe('image');
    expect(captured[0].body.image).toEqual({ url: 'https://example.com/img.jpg', caption: 'Nice pic' });
  });

  it('sendImage by media ID', async () => {
    const client = createClient();
    await client.sendImage('123', { id: 'media123' });
    expect(captured[0].body.image).toEqual({ id: 'media123' });
  });

  it('sendVideo with caption', async () => {
    const client = createClient();
    await client.sendVideo('123', { url: 'https://example.com/vid.mp4' }, { caption: 'Watch this' });
    expect(captured[0].body.type).toBe('video');
    expect(captured[0].body.video).toEqual({ url: 'https://example.com/vid.mp4', caption: 'Watch this' });
  });

  it('sendAudio', async () => {
    const client = createClient();
    await client.sendAudio('123', { url: 'https://example.com/audio.ogg' });
    expect(captured[0].body.type).toBe('audio');
    expect(captured[0].body.audio).toEqual({ url: 'https://example.com/audio.ogg' });
  });

  it('sendDocument with filename', async () => {
    const client = createClient();
    await client.sendDocument('123', { url: 'https://example.com/doc.pdf' }, {
      filename: 'invoice.pdf',
      caption: 'Your invoice',
    });
    expect(captured[0].body.type).toBe('document');
    expect(captured[0].body.document).toEqual({
      url: 'https://example.com/doc.pdf',
      filename: 'invoice.pdf',
      caption: 'Your invoice',
    });
  });

  it('sendSticker', async () => {
    const client = createClient();
    await client.sendSticker('123', { id: 'sticker123' });
    expect(captured[0].body.type).toBe('sticker');
    expect(captured[0].body.sticker).toEqual({ id: 'sticker123' });
  });

  it('sendLocation', async () => {
    const client = createClient();
    await client.sendLocation('123', {
      latitude: 19.43,
      longitude: -99.13,
      name: 'CDMX',
      address: 'Mexico City',
    });
    expect(captured[0].body.type).toBe('location');
    expect(captured[0].body.location).toEqual({
      latitude: 19.43,
      longitude: -99.13,
      name: 'CDMX',
      address: 'Mexico City',
    });
  });

  it('sendLocationRequest', async () => {
    const client = createClient();
    await client.sendLocationRequest('123', 'Share your location');
    expect(captured[0].body.type).toBe('interactive');
    expect(captured[0].body.interactive).toEqual({
      type: 'location_request_message',
      body: { text: 'Share your location' },
      action: { name: 'send_location' },
    });
  });

  it('sendTemplate with defaults', async () => {
    const client = createClient();
    await client.sendTemplate('123', 'hello_world');
    expect(captured[0].body.type).toBe('template');
    expect(captured[0].body.template).toEqual({
      name: 'hello_world',
      language: { code: 'en_US' },
    });
  });

  it('sendTemplate with language and components', async () => {
    const client = createClient();
    await client.sendTemplate('123', 'order_update', {
      language: 'es_MX',
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: 'Order #42' }],
        },
      ],
    });
    expect(captured[0].body.template).toEqual({
      name: 'order_update',
      language: { code: 'es_MX' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'Order #42' }] }],
    });
  });

  it('sendReaction', async () => {
    const client = createClient();
    await client.sendReaction('123', 'wamid.target', '👍');
    expect(captured[0].body.type).toBe('reaction');
    expect(captured[0].body.reaction).toEqual({ message_id: 'wamid.target', emoji: '👍' });
  });

  it('sendReaction remove (empty emoji)', async () => {
    const client = createClient();
    await client.sendReaction('123', 'wamid.target', '');
    expect(captured[0].body.reaction).toEqual({ message_id: 'wamid.target', emoji: '' });
  });

  it('sendContacts', async () => {
    const client = createClient();
    await client.sendContacts('123', [
      { name: { formatted_name: 'Alice' }, phones: [{ phone: '+1555000000' }] },
    ]);
    expect(captured[0].body.type).toBe('contacts');
    expect(captured[0].body.contacts).toHaveLength(1);
  });

  it('sendInteractive (buttons)', async () => {
    const client = createClient();
    await client.sendInteractive('123', {
      type: 'button',
      body: { text: 'Choose:' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'a', title: 'Option A' } },
          { type: 'reply', reply: { id: 'b', title: 'Option B' } },
        ],
      },
    });
    expect(captured[0].body.type).toBe('interactive');
    const interactive = captured[0].body.interactive as Record<string, unknown>;
    expect(interactive).toHaveProperty('type', 'button');
  });

  it('sendInteractive (list)', async () => {
    const client = createClient();
    await client.sendInteractive('123', {
      type: 'list',
      body: { text: 'Choose:' },
      action: {
        button: 'See options',
        sections: [
          {
            title: 'Section 1',
            rows: [
              { id: 'r1', title: 'Row 1', description: 'Desc 1' },
              { id: 'r2', title: 'Row 2' },
            ],
          },
        ],
      },
    });
    const interactive = captured[0].body.interactive as Record<string, unknown>;
    expect(interactive).toHaveProperty('type', 'list');
  });

  it('markAsRead', async () => {
    fetchResponse.body = { success: true };
    const client = createClient();
    await client.markAsRead('wamid.toread');
    expect(captured[0].body).toEqual({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: 'wamid.toread',
    });
  });

  it('throws WhatsAppError on API error', async () => {
    fetchResponse = { ok: false, status: 400, body: { error: { message: 'Bad request' } } };
    const client = createClient();
    await expect(client.sendText('123', 'fail')).rejects.toThrow(WhatsAppError);
  });
});
