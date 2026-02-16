/**
 * Tests for individual send functions to verify exact payload structure.
 * These test the functions directly (not through the client) to ensure
 * the payloads sent to the WhatsApp Cloud API are correct.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../../src/http/fetchClient';
import { sendText } from '../../src/send/sendText';
import { sendButtons } from '../../src/send/sendButtons';
import { sendList } from '../../src/send/sendList';
import { sendImage, sendVideo, sendAudio, sendDocument, sendSticker } from '../../src/send/sendMedia';
import { sendLocation, requestLocation } from '../../src/send/sendLocation';
import { sendTemplate } from '../../src/send/sendTemplate';
import { sendReaction, removeReaction } from '../../src/send/sendReaction';
import { markAsRead } from '../../src/send/markAsRead';

const MOCK_RESPONSE = {
  messaging_product: 'whatsapp',
  contacts: [{ input: '555', wa_id: '555' }],
  messages: [{ id: 'wamid.test_123' }],
};

function createMockFetchClient(): { fetchClient: FetchClient; getLastPayload: () => unknown } {
  const fetchClient = new FetchClient({
    baseUrl: 'https://graph.facebook.com/v20.0/12345',
    accessToken: 'test-token',
    retry: { maxRetries: 0 },
  });

  let lastPayload: unknown;
  fetchClient.postJson = vi.fn().mockImplementation(async (_path: string, body: unknown) => {
    lastPayload = body;
    return MOCK_RESPONSE;
  });

  return { fetchClient, getLastPayload: () => lastPayload };
}

describe('sendText', () => {
  it('should build correct text payload', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendText(fetchClient, '5511999999999', 'Hello world');

    expect(getLastPayload()).toEqual({
      messaging_product: 'whatsapp',
      to: '5511999999999',
      type: 'text',
      text: { body: 'Hello world', preview_url: false },
    });
  });

  it('should include preview_url when enabled', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendText(fetchClient, '555', 'Check https://example.com', { previewUrl: true });

    const payload = getLastPayload() as Record<string, unknown>;
    const text = payload.text as Record<string, unknown>;
    expect(text.preview_url).toBe(true);
  });

  it('should include context when replyTo is set', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendText(fetchClient, '555', 'Reply', { replyTo: 'wamid.original' });

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.context).toEqual({ message_id: 'wamid.original' });
  });

  it('should return messageId', async () => {
    const { fetchClient } = createMockFetchClient();
    const result = await sendText(fetchClient, '555', 'Test');
    expect(result.messageId).toBe('wamid.test_123');
  });
});

describe('sendButtons', () => {
  it('should build correct button payload', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendButtons(fetchClient, '555', 'Pick one:', [
      { id: 'opt_a', title: 'Option A' },
      { id: 'opt_b', title: 'Option B' },
    ]);

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('interactive');
    const interactive = payload.interactive as Record<string, unknown>;
    expect(interactive.type).toBe('button');
    expect((interactive.body as Record<string, unknown>).text).toBe('Pick one:');

    const action = interactive.action as Record<string, unknown>;
    const buttons = action.buttons as Array<Record<string, unknown>>;
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqual({
      type: 'reply',
      reply: { id: 'opt_a', title: 'Option A' },
    });
  });

  it('should include header and footer', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendButtons(fetchClient, '555', 'Body', [{ id: '1', title: 'Go' }], {
      header: 'Header Text',
      footer: 'Footer Text',
    });

    const payload = getLastPayload() as Record<string, unknown>;
    const interactive = payload.interactive as Record<string, unknown>;
    expect(interactive.header).toEqual({ type: 'text', text: 'Header Text' });
    expect(interactive.footer).toEqual({ text: 'Footer Text' });
  });
});

describe('sendList', () => {
  it('should build correct list payload', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendList(fetchClient, '555', {
      body: 'Choose an option:',
      buttonText: 'View Menu',
      sections: [
        {
          title: 'Food',
          rows: [
            { id: 'pizza', title: 'Pizza', description: 'Cheese & pepperoni' },
            { id: 'burger', title: 'Burger' },
          ],
        },
        {
          title: 'Drinks',
          rows: [{ id: 'cola', title: 'Cola' }],
        },
      ],
    });

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('interactive');
    const interactive = payload.interactive as Record<string, unknown>;
    expect(interactive.type).toBe('list');

    const action = interactive.action as Record<string, unknown>;
    expect(action.button).toBe('View Menu');
    const sections = action.sections as Array<Record<string, unknown>>;
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Food');
    const rows = sections[0].rows as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: 'pizza', title: 'Pizza', description: 'Cheese & pepperoni' });
  });
});

describe('sendMedia (image, video, audio, document, sticker)', () => {
  it('sendImage by URL with caption', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendImage(fetchClient, '555', { url: 'https://example.com/img.png' }, 'Nice photo');

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('image');
    const image = payload.image as Record<string, unknown>;
    expect(image.link).toBe('https://example.com/img.png');
    expect(image.caption).toBe('Nice photo');
  });

  it('sendImage by media ID', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendImage(fetchClient, '555', { id: 'media-id-123' });

    const payload = getLastPayload() as Record<string, unknown>;
    const image = payload.image as Record<string, unknown>;
    expect(image.id).toBe('media-id-123');
    expect(image.link).toBeUndefined();
  });

  it('sendVideo with caption', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendVideo(fetchClient, '555', { url: 'https://example.com/v.mp4' }, 'Watch this');

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('video');
    expect((payload.video as Record<string, unknown>).caption).toBe('Watch this');
  });

  it('sendAudio (no caption)', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendAudio(fetchClient, '555', { url: 'https://example.com/a.ogg' });

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('audio');
    expect((payload.audio as Record<string, unknown>).link).toBe('https://example.com/a.ogg');
  });

  it('sendDocument with filename and caption', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendDocument(fetchClient, '555', { url: 'https://example.com/doc.pdf' }, {
      filename: 'report.pdf',
      caption: 'Q4 Report',
    });

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('document');
    const doc = payload.document as Record<string, unknown>;
    expect(doc.filename).toBe('report.pdf');
    expect(doc.caption).toBe('Q4 Report');
  });

  it('sendSticker', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendSticker(fetchClient, '555', { id: 'sticker-id-99' });

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('sticker');
    expect((payload.sticker as Record<string, unknown>).id).toBe('sticker-id-99');
  });

  it('should reject MediaReference with neither url nor id', async () => {
    const { fetchClient } = createMockFetchClient();
    await expect(sendImage(fetchClient, '555', {})).rejects.toThrow('url');
  });
});

describe('sendLocation / requestLocation', () => {
  it('sendLocation with all fields', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendLocation(fetchClient, '555', {
      latitude: 20.67,
      longitude: -103.35,
      name: 'Office',
      address: '123 Main St',
    });

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('location');
    const loc = payload.location as Record<string, unknown>;
    expect(loc.latitude).toBe(20.67);
    expect(loc.longitude).toBe(-103.35);
    expect(loc.name).toBe('Office');
  });

  it('requestLocation', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await requestLocation(fetchClient, '555', 'Where are you?');

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('interactive');
    const interactive = payload.interactive as Record<string, unknown>;
    expect(interactive.type).toBe('location_request_message');
    expect((interactive.body as Record<string, unknown>).text).toBe('Where are you?');
  });
});

describe('sendTemplate', () => {
  it('should build template payload without components', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendTemplate(fetchClient, '555', 'hello_world', 'en');

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('template');
    const template = payload.template as Record<string, unknown>;
    expect(template.name).toBe('hello_world');
    expect(template.language).toEqual({ code: 'en' });
    expect(template.components).toBeUndefined();
  });

  it('should include components when provided', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendTemplate(fetchClient, '555', 'order_update', 'es', [
      { type: 'body', parameters: [{ type: 'text', text: 'Juan' }] },
    ]);

    const payload = getLastPayload() as Record<string, unknown>;
    const template = payload.template as Record<string, unknown>;
    expect(template.components).toHaveLength(1);
  });
});

describe('sendReaction / removeReaction', () => {
  it('sendReaction should send emoji reaction', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await sendReaction(fetchClient, '555', 'wamid.target', '❤️');

    const payload = getLastPayload() as Record<string, unknown>;
    expect(payload.type).toBe('reaction');
    const reaction = payload.reaction as Record<string, unknown>;
    expect(reaction.message_id).toBe('wamid.target');
    expect(reaction.emoji).toBe('❤️');
  });

  it('removeReaction should send empty emoji', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await removeReaction(fetchClient, '555', 'wamid.target');

    const payload = getLastPayload() as Record<string, unknown>;
    const reaction = payload.reaction as Record<string, unknown>;
    expect(reaction.emoji).toBe('');
  });
});

describe('markAsRead', () => {
  it('should send read status', async () => {
    const { fetchClient, getLastPayload } = createMockFetchClient();

    await markAsRead(fetchClient, 'wamid.to_mark');

    expect(getLastPayload()).toEqual({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: 'wamid.to_mark',
    });
  });
});
