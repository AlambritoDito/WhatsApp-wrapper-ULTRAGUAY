import { parseIncoming, parseStatuses } from '../src/parse-incoming';
import type { WebhookPayload } from '../src/types';

/** Helper to build a minimal webhook payload wrapping raw message objects. */
function wrap(...messages: Array<Record<string, unknown>>): WebhookPayload {
  return {
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
              contacts: [{ profile: { name: 'Test' }, wa_id: '5215500000000' }],
              messages,
            },
          },
        ],
      },
    ],
  };
}

function wrapStatuses(...statuses: Array<Record<string, unknown>>): WebhookPayload {
  return {
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
              statuses,
            },
          },
        ],
      },
    ],
  };
}

describe('parseIncoming', () => {
  it('returns empty array for empty payload', () => {
    const result = parseIncoming({ object: 'whatsapp_business_account', entry: [] });
    expect(result).toEqual([]);
  });

  it('parses a text message', () => {
    const payload = wrap({
      from: '5215512345678',
      id: 'wamid.test1',
      timestamp: '1700000000',
      type: 'text',
      text: { body: 'Hello world' },
    });
    const msgs = parseIncoming(payload);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toEqual({
      from: '5215512345678',
      wamid: 'wamid.test1',
      timestamp: 1700000000,
      type: 'text',
      text: 'Hello world',
    });
  });

  it('parses an image message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.img',
        timestamp: '1700000000',
        type: 'image',
        image: { id: 'media1', mime_type: 'image/jpeg', sha256: 'abc', caption: 'Look!' },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0].type).toBe('image');
    if (msgs[0].type === 'image') {
      expect(msgs[0].image.mediaId).toBe('media1');
      expect(msgs[0].image.mimeType).toBe('image/jpeg');
      expect(msgs[0].image.caption).toBe('Look!');
    }
  });

  it('parses a video message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.vid',
        timestamp: '1700000000',
        type: 'video',
        video: { id: 'media2', mime_type: 'video/mp4', sha256: 'def' },
      }),
    );
    expect(msgs[0].type).toBe('video');
    if (msgs[0].type === 'video') {
      expect(msgs[0].video.mediaId).toBe('media2');
    }
  });

  it('parses an audio message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.aud',
        timestamp: '1700000000',
        type: 'audio',
        audio: { id: 'media3', mime_type: 'audio/ogg', sha256: 'ghi', voice: true },
      }),
    );
    expect(msgs[0].type).toBe('audio');
    if (msgs[0].type === 'audio') {
      expect(msgs[0].audio.voice).toBe(true);
    }
  });

  it('parses a document message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.doc',
        timestamp: '1700000000',
        type: 'document',
        document: { id: 'media4', mime_type: 'application/pdf', sha256: 'jkl', filename: 'invoice.pdf' },
      }),
    );
    expect(msgs[0].type).toBe('document');
    if (msgs[0].type === 'document') {
      expect(msgs[0].document.filename).toBe('invoice.pdf');
    }
  });

  it('parses a sticker message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.stk',
        timestamp: '1700000000',
        type: 'sticker',
        sticker: { id: 'media5', mime_type: 'image/webp', animated: true },
      }),
    );
    expect(msgs[0].type).toBe('sticker');
    if (msgs[0].type === 'sticker') {
      expect(msgs[0].sticker.animated).toBe(true);
    }
  });

  it('parses a location message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.loc',
        timestamp: '1700000000',
        type: 'location',
        location: { latitude: 19.43, longitude: -99.13, name: 'CDMX', address: 'Mexico' },
      }),
    );
    expect(msgs[0].type).toBe('location');
    if (msgs[0].type === 'location') {
      expect(msgs[0].location.latitude).toBeCloseTo(19.43);
      expect(msgs[0].location.name).toBe('CDMX');
    }
  });

  it('parses a contacts message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.cnt',
        timestamp: '1700000000',
        type: 'contacts',
        contacts: [
          {
            name: { formatted_name: 'Jane Doe', first_name: 'Jane' },
            phones: [{ phone: '+1234567890', type: 'CELL' }],
          },
        ],
      }),
    );
    expect(msgs[0].type).toBe('contacts');
    if (msgs[0].type === 'contacts') {
      expect(msgs[0].contacts[0].name.formatted_name).toBe('Jane Doe');
    }
  });

  it('parses a button reply (interactive)', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.btn',
        timestamp: '1700000000',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'btn_yes', title: 'Yes' },
        },
      }),
    );
    expect(msgs[0].type).toBe('interactive_reply');
    if (msgs[0].type === 'interactive_reply') {
      expect(msgs[0].interactive.subType).toBe('button_reply');
      expect(msgs[0].interactive.id).toBe('btn_yes');
    }
  });

  it('parses a list reply (interactive)', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.lst',
        timestamp: '1700000000',
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: 'row_1', title: 'Option A', description: 'Description A' },
        },
      }),
    );
    expect(msgs[0].type).toBe('interactive_reply');
    if (msgs[0].type === 'interactive_reply') {
      expect(msgs[0].interactive.subType).toBe('list_reply');
      expect(msgs[0].interactive.description).toBe('Description A');
    }
  });

  it('parses a reaction', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.rxn',
        timestamp: '1700000000',
        type: 'reaction',
        reaction: { message_id: 'wamid.original', emoji: '👍' },
      }),
    );
    expect(msgs[0].type).toBe('reaction');
    if (msgs[0].type === 'reaction') {
      expect(msgs[0].reaction.emoji).toBe('👍');
      expect(msgs[0].reaction.messageId).toBe('wamid.original');
    }
  });

  it('parses a flow reply (nfm_reply)', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.flow',
        timestamp: '1700000000',
        type: 'interactive',
        interactive: {
          type: 'nfm_reply',
          nfm_reply: {
            response_json: '{"screen":"DONE","foo":"bar"}',
            body: 'completed',
          },
        },
      }),
    );
    expect(msgs[0].type).toBe('flow_reply');
    if (msgs[0].type === 'flow_reply') {
      expect(msgs[0].flow.responseJson).toEqual({ screen: 'DONE', foo: 'bar' });
    }
  });

  it('parses an order message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.ord',
        timestamp: '1700000000',
        type: 'order',
        order: {
          catalog_id: 'cat1',
          product_items: [{ product_retailer_id: 'sku1', quantity: 2, item_price: 50, currency: 'MXN' }],
        },
      }),
    );
    expect(msgs[0].type).toBe('order');
    if (msgs[0].type === 'order') {
      expect(msgs[0].order.catalogId).toBe('cat1');
      expect(msgs[0].order.productItems).toHaveLength(1);
    }
  });

  it('parses a system message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.sys',
        timestamp: '1700000000',
        type: 'system',
        system: { body: 'Number changed', type: 'customer_changed_number' },
      }),
    );
    expect(msgs[0].type).toBe('system');
  });

  it('parses a referral message', () => {
    const msgs = parseIncoming(
      wrap({
        from: '123',
        id: 'wamid.ref',
        timestamp: '1700000000',
        type: 'referral',
        referral: { source_url: 'https://ad.example.com', source_type: 'ad' },
        text: { body: 'From an ad' },
      }),
    );
    expect(msgs[0].type).toBe('referral');
    if (msgs[0].type === 'referral') {
      expect(msgs[0].referral.source_type).toBe('ad');
      expect(msgs[0].text).toBe('From an ad');
    }
  });

  it('returns unsupported for unknown types', () => {
    const msgs = parseIncoming(
      wrap({ from: '123', id: 'wamid.unk', timestamp: '1700000000', type: 'ephemeral' }),
    );
    expect(msgs[0].type).toBe('unsupported');
  });

  it('handles multiple messages in one payload', () => {
    const msgs = parseIncoming(
      wrap(
        { from: '123', id: 'w1', timestamp: '1700000000', type: 'text', text: { body: 'A' } },
        { from: '456', id: 'w2', timestamp: '1700000001', type: 'text', text: { body: 'B' } },
      ),
    );
    expect(msgs).toHaveLength(2);
  });
});

describe('parseStatuses', () => {
  it('parses a delivered status', () => {
    const statuses = parseStatuses(
      wrapStatuses({
        id: 'wamid.s1',
        recipient_id: '5215500000000',
        timestamp: '1700000000',
        status: 'delivered',
        conversation: { id: 'conv1', origin: { type: 'user_initiated' } },
        pricing: { billable: true, pricing_model: 'CBP', category: 'service' },
      }),
    );
    expect(statuses).toHaveLength(1);
    expect(statuses[0].status).toBe('delivered');
    expect(statuses[0].conversation?.id).toBe('conv1');
    expect(statuses[0].pricing?.billable).toBe(true);
  });

  it('returns empty for no statuses', () => {
    expect(parseStatuses({ object: 'whatsapp_business_account', entry: [] })).toEqual([]);
  });
});
