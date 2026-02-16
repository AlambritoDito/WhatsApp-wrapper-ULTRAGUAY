import { describe, it, expect } from 'vitest';
import { parseWebhookBody } from '../../src/receive/parseIncoming';

/** Helper to wrap a raw message in a webhook body. */
function wrapMessage(msg: unknown) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'entry-id',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '15551234567', phone_number_id: 'pnid' },
          messages: [msg],
        },
        field: 'messages',
      }],
    }],
  };
}

/** Helper to wrap a status in a webhook body. */
function wrapStatus(status: unknown) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'entry-id',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '15551234567', phone_number_id: 'pnid' },
          statuses: [status],
        },
        field: 'messages',
      }],
    }],
  };
}

describe('parseWebhookBody', () => {
  it('should return empty for invalid body', () => {
    const result = parseWebhookBody(null);
    expect(result.messages).toHaveLength(0);
    expect(result.statuses).toHaveLength(0);
  });

  it('should return empty for non-object body', () => {
    expect(parseWebhookBody('string')).toEqual({ messages: [], statuses: [] });
    expect(parseWebhookBody(42)).toEqual({ messages: [], statuses: [] });
  });

  // ─── Text messages ───────────────────────────────────────────────

  it('should parse a text message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.test123',
      timestamp: '1700000000',
      type: 'text',
      text: { body: 'Hello world' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('text');
    expect(messages[0].text).toBe('Hello world');
    expect(messages[0].from).toBe('5511999999999');
    expect(messages[0].id).toBe('wamid.test123');
    expect(messages[0].timestamp).toBe(1700000000);
  });

  // ─── Image messages ──────────────────────────────────────────────

  it('should parse an image message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.img1',
      timestamp: '1700000000',
      type: 'image',
      image: { id: 'media-id-123', mime_type: 'image/jpeg', sha256: 'abc', caption: 'A photo' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('image');
    expect(messages[0].image).toEqual({
      id: 'media-id-123',
      mimeType: 'image/jpeg',
      sha256: 'abc',
      caption: 'A photo',
    });
  });

  // ─── Audio messages ──────────────────────────────────────────────

  it('should parse an audio message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.audio1',
      timestamp: '1700000000',
      type: 'audio',
      audio: { id: 'audio-media-id', mime_type: 'audio/ogg' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('audio');
    expect(messages[0].audio).toEqual({
      id: 'audio-media-id',
      mimeType: 'audio/ogg',
      sha256: undefined,
    });
  });

  // ─── Video messages ──────────────────────────────────────────────

  it('should parse a video message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.vid1',
      timestamp: '1700000000',
      type: 'video',
      video: { id: 'video-media-id', mime_type: 'video/mp4', caption: 'My video' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('video');
    expect(messages[0].video?.id).toBe('video-media-id');
    expect(messages[0].video?.caption).toBe('My video');
  });

  // ─── Document messages ───────────────────────────────────────────

  it('should parse a document message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.doc1',
      timestamp: '1700000000',
      type: 'document',
      document: { id: 'doc-id', mime_type: 'application/pdf', filename: 'report.pdf' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('document');
    expect(messages[0].document?.filename).toBe('report.pdf');
    expect(messages[0].document?.mimeType).toBe('application/pdf');
  });

  it('should default document filename to "document"', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.doc2',
      timestamp: '1700000000',
      type: 'document',
      document: { id: 'doc-id', mime_type: 'application/pdf' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].document?.filename).toBe('document');
  });

  // ─── Sticker messages ────────────────────────────────────────────

  it('should parse a sticker message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.sticker1',
      timestamp: '1700000000',
      type: 'sticker',
      sticker: { id: 'sticker-id', mime_type: 'image/webp' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('sticker');
    expect(messages[0].sticker?.mimeType).toBe('image/webp');
  });

  // ─── Location messages ───────────────────────────────────────────

  it('should parse a location message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.loc1',
      timestamp: '1700000000',
      type: 'location',
      location: {
        latitude: 20.67,
        longitude: -103.35,
        name: 'Office',
        address: '123 Main St',
        url: 'https://maps.google.com',
      },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('location');
    expect(messages[0].location).toEqual({
      latitude: 20.67,
      longitude: -103.35,
      name: 'Office',
      address: '123 Main St',
      url: 'https://maps.google.com',
    });
  });

  // ─── Contacts messages ───────────────────────────────────────────

  it('should parse a contacts message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.contact1',
      timestamp: '1700000000',
      type: 'contacts',
      contacts: [{
        name: { formatted_name: 'John Doe', first_name: 'John', last_name: 'Doe' },
        phones: [{ phone: '+15551234567', type: 'CELL' }],
      }],
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('contacts');
    expect(messages[0].contacts).toHaveLength(1);
    expect(messages[0].contacts![0].name.formatted_name).toBe('John Doe');
    expect(messages[0].contacts![0].phones[0].phone).toBe('+15551234567');
  });

  // ─── Interactive: button reply ────────────────────────────────────

  it('should parse a button reply', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.btn1',
      timestamp: '1700000000',
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: { id: 'btn_yes', title: 'Yes' },
      },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('button_reply');
    expect(messages[0].button_reply).toEqual({ id: 'btn_yes', title: 'Yes' });
  });

  // ─── Interactive: list reply ──────────────────────────────────────

  it('should parse a list reply', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.list1',
      timestamp: '1700000000',
      type: 'interactive',
      interactive: {
        type: 'list_reply',
        list_reply: { id: 'item_1', title: 'Item 1', description: 'First item' },
      },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('list_reply');
    expect(messages[0].list_reply).toEqual({
      id: 'item_1',
      title: 'Item 1',
      description: 'First item',
    });
  });

  // ─── Interactive: flow reply (nfm_reply) ──────────────────────────

  it('should parse a flow reply with valid JSON', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.flow1',
      timestamp: '1700000000',
      type: 'interactive',
      interactive: {
        type: 'nfm_reply',
        nfm_reply: {
          response_json: '{"screen":"CONFIRMATION","data":{"name":"John"}}',
          body: 'Flow completed',
        },
      },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('flow_reply');
    expect(messages[0].flow_reply).toEqual({
      screen: 'CONFIRMATION',
      data: { name: 'John' },
    });
  });

  it('should handle flow reply with invalid JSON gracefully', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.flow2',
      timestamp: '1700000000',
      type: 'interactive',
      interactive: {
        type: 'nfm_reply',
        nfm_reply: {
          response_json: 'NOT VALID JSON{{{',
          body: '',
        },
      },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('flow_reply');
    expect(messages[0].flow_reply).toEqual({});
  });

  // ─── Reaction messages ─────────────────────────────────────────────

  it('should parse a reaction message', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.react1',
      timestamp: '1700000000',
      type: 'reaction',
      reaction: { message_id: 'wamid.original_msg', emoji: '👍' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('reaction');
    expect(messages[0].reaction).toEqual({
      message_id: 'wamid.original_msg',
      emoji: '👍',
    });
  });

  it('should parse a reaction removal (empty emoji)', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.react2',
      timestamp: '1700000000',
      type: 'reaction',
      reaction: { message_id: 'wamid.original_msg', emoji: '' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('reaction');
    expect(messages[0].reaction?.emoji).toBe('');
  });

  // ─── Legacy button (quick reply) ─────────────────────────────────

  it('should parse a legacy button payload', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.legacy1',
      timestamp: '1700000000',
      type: 'button',
      button: { payload: 'CONFIRM_YES', text: 'Yes' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('button_reply');
    expect(messages[0].button_reply?.id).toBe('CONFIRM_YES');
    expect(messages[0].button_reply?.title).toBe('Yes');
  });

  // ─── Context (reply-to) ──────────────────────────────────────────

  it('should extract context (reply-to) when present', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.reply1',
      timestamp: '1700000000',
      type: 'text',
      text: { body: 'Replying to you' },
      context: { from: '15551234567', id: 'wamid.original_msg' },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].context).toEqual({ message_id: 'wamid.original_msg' });
  });

  // ─── Unknown type ────────────────────────────────────────────────

  it('should return unknown type for unrecognized message types', () => {
    const body = wrapMessage({
      from: '5511999999999',
      id: 'wamid.unknown1',
      timestamp: '1700000000',
      type: 'order',
      order: { catalog_id: '123', product_items: [] },
    });

    const { messages } = parseWebhookBody(body);
    expect(messages[0].type).toBe('unknown');
  });

  // ─── Status updates ──────────────────────────────────────────────

  it('should parse a delivered status', () => {
    const body = wrapStatus({
      id: 'wamid.status1',
      status: 'delivered',
      timestamp: '1700000000',
      recipient_id: '5511999999999',
    });

    const { statuses } = parseWebhookBody(body);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].status).toBe('delivered');
    expect(statuses[0].messageId).toBe('wamid.status1');
    expect(statuses[0].recipientId).toBe('5511999999999');
  });

  it('should parse a read status', () => {
    const body = wrapStatus({
      id: 'wamid.status2',
      status: 'read',
      timestamp: '1700000001',
      recipient_id: '5511888888888',
    });

    const { statuses } = parseWebhookBody(body);
    expect(statuses[0].status).toBe('read');
  });

  it('should parse a failed status with errors', () => {
    const body = wrapStatus({
      id: 'wamid.status3',
      status: 'failed',
      timestamp: '1700000002',
      recipient_id: '5511777777777',
      errors: [{ code: 131051, title: 'Message undeliverable', message: 'Could not deliver' }],
    });

    const { statuses } = parseWebhookBody(body);
    expect(statuses[0].status).toBe('failed');
    expect(statuses[0].errors).toHaveLength(1);
    expect(statuses[0].errors![0].code).toBe(131051);
  });

  it('should parse a status with conversation info', () => {
    const body = wrapStatus({
      id: 'wamid.status4',
      status: 'delivered',
      timestamp: '1700000003',
      recipient_id: '5511666666666',
      conversation: { id: 'conv-123', origin: { type: 'user_initiated' } },
    });

    const { statuses } = parseWebhookBody(body);
    expect(statuses[0].conversation).toEqual({ id: 'conv-123', origin: 'user_initiated' });
  });

  // ─── Multiple messages ───────────────────────────────────────────

  it('should parse multiple messages in one webhook', () => {
    const body = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry-id',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '15551234567', phone_number_id: 'pnid' },
            messages: [
              {
                from: '5511999999999',
                id: 'wamid.msg1',
                timestamp: '1700000000',
                type: 'text',
                text: { body: 'First' },
              },
              {
                from: '5511888888888',
                id: 'wamid.msg2',
                timestamp: '1700000001',
                type: 'text',
                text: { body: 'Second' },
              },
            ],
          },
          field: 'messages',
        }],
      }],
    };

    const { messages } = parseWebhookBody(body);
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe('First');
    expect(messages[1].text).toBe('Second');
  });

  // ─── Raw field ────────────────────────────────────────────────────

  it('should include the raw message object', () => {
    const rawMsg = {
      from: '5511999999999',
      id: 'wamid.raw1',
      timestamp: '1700000000',
      type: 'text',
      text: { body: 'Raw test' },
    };
    const body = wrapMessage(rawMsg);

    const { messages } = parseWebhookBody(body);
    expect(messages[0].raw).toEqual(rawMsg);
  });
});
