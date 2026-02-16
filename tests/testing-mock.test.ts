import { parseIncoming, parseStatuses } from '../src/parse-incoming';
import { MockWhatsAppClient, createMockWebhookPayload } from '../src/testing/index';

describe('MockWhatsAppClient', () => {
  it('records sendText calls and returns wamid', async () => {
    const mock = new MockWhatsAppClient();
    const res = await mock.sendText('123', 'hello');
    expect(res.wamid).toMatch(/^wamid\.mock\./);
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('sendText');
    expect(mock.calls[0].args).toEqual(['123', 'hello', undefined]);
  });

  it('records all send method types', async () => {
    const mock = new MockWhatsAppClient();
    await mock.sendImage('1', { url: 'http://img' }, { caption: 'hi' });
    await mock.sendVideo('2', { id: 'vid1' });
    await mock.sendAudio('3', { url: 'http://aud' });
    await mock.sendDocument('4', { url: 'http://doc' }, { filename: 'f.pdf' });
    await mock.sendSticker('5', { id: 'stk1' });
    await mock.sendLocation('6', { latitude: 0, longitude: 0 });
    await mock.sendLocationRequest('7', 'share pls');
    await mock.sendTemplate('8', 'tmpl');
    await mock.sendReaction('9', 'wamid.x', '🔥');
    await mock.sendContacts('10', [{ name: { formatted_name: 'A' } }]);
    await mock.sendInteractive('11', { type: 'button', body: { text: 'Choose' }, action: { buttons: [] } });
    await mock.markAsRead('wamid.read');

    expect(mock.calls).toHaveLength(12);
    expect(mock.callsFor('sendImage')).toHaveLength(1);
    expect(mock.callsFor('markAsRead')).toHaveLength(1);
  });

  it('records media methods', async () => {
    const mock = new MockWhatsAppClient();
    const upload = await mock.uploadMedia(Buffer.from('data'), 'image/png');
    expect(upload.id).toMatch(/^media\.mock\./);

    const meta = await mock.getMediaUrl('m1');
    expect(meta.url).toContain('m1');

    const buf = await mock.downloadMedia('m2');
    expect(Buffer.isBuffer(buf)).toBe(true);

    await mock.deleteMedia('m3');

    expect(mock.calls).toHaveLength(4);
  });

  it('reset clears calls', async () => {
    const mock = new MockWhatsAppClient();
    await mock.sendText('1', 'a');
    expect(mock.calls).toHaveLength(1);
    mock.reset();
    expect(mock.calls).toHaveLength(0);
  });

  it('nextWamidOverride customises returned wamid', async () => {
    const mock = new MockWhatsAppClient();
    mock.nextWamidOverride = 'wamid.custom';
    const res = await mock.sendText('1', 'hello');
    expect(res.wamid).toBe('wamid.custom');
    // Override is consumed
    const res2 = await mock.sendText('1', 'hello');
    expect(res2.wamid).toMatch(/^wamid\.mock\./);
  });
});

describe('createMockWebhookPayload', () => {
  it('creates a text message payload', () => {
    const payload = createMockWebhookPayload('text', { text: { body: 'Test msg' } });
    const msgs = parseIncoming(payload);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].type).toBe('text');
    if (msgs[0].type === 'text') {
      expect(msgs[0].text).toBe('Test msg');
    }
  });

  it('creates an image payload', () => {
    const payload = createMockWebhookPayload('image');
    const msgs = parseIncoming(payload);
    expect(msgs[0].type).toBe('image');
  });

  it('creates a status payload', () => {
    const payload = createMockWebhookPayload('status', {
      status: 'read',
      recipient_id: '999',
    });
    const statuses = parseStatuses(payload);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].status).toBe('read');
  });

  it('creates payloads for all message types', () => {
    const types: Array<'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contacts' | 'reaction' | 'order' | 'system' | 'referral'> = [
      'text', 'image', 'video', 'audio', 'document', 'sticker',
      'location', 'contacts', 'reaction', 'order', 'system', 'referral',
    ];

    for (const t of types) {
      const payload = createMockWebhookPayload(t);
      const msgs = parseIncoming(payload);
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    }
  });
});
