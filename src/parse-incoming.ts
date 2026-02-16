/**
 * Parse raw WhatsApp Cloud API webhook payloads into strongly‑typed inbound
 * messages and status updates.
 *
 * @module parse-incoming
 */

import type {
  Contact,
  ContactName,
  ContactPhone,
  ContactEmail,
  ContactUrl,
  ContactAddress,
  ContactOrg,
  InboundMessage,
  InboundBase,
  StatusUpdate,
  WebhookPayload,
} from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract and normalise every inbound message from a webhook payload.
 *
 * @param body - The raw JSON body received on your webhook endpoint.
 * @returns An array of parsed inbound messages (may be empty).
 */
export function parseIncoming(body: WebhookPayload): InboundMessage[] {
  const results: InboundMessage[] = [];

  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const messages = change?.value?.messages;
      if (!Array.isArray(messages)) continue;
      for (const raw of messages) {
        results.push(parseSingle(raw));
      }
    }
  }

  return results;
}

/**
 * Extract status updates (delivery receipts) from a webhook payload.
 *
 * @param body - The raw JSON body received on your webhook endpoint.
 * @returns An array of parsed status updates (may be empty).
 */
export function parseStatuses(body: WebhookPayload): StatusUpdate[] {
  const results: StatusUpdate[] = [];

  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const statuses = change?.value?.statuses;
      if (!Array.isArray(statuses)) continue;
      for (const raw of statuses) {
        results.push(parseStatus(raw as Record<string, unknown>));
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Single message parser
// ---------------------------------------------------------------------------

function parseSingle(msg: Record<string, unknown>): InboundMessage {
  const base: InboundBase = {
    from: String((msg as Record<string, unknown>).from ?? ''),
    timestamp: Number((msg as Record<string, unknown>).timestamp ?? 0),
    wamid: String((msg as Record<string, unknown>).id ?? ''),
  };

  const type = String((msg as Record<string, unknown>).type ?? '');

  switch (type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        text: String(((msg as Record<string, unknown>).text as Record<string, unknown>)?.body ?? ''),
      };

    case 'image':
      return {
        ...base,
        type: 'image',
        image: parseMediaFields(msg.image as Record<string, unknown>),
      };

    case 'video':
      return {
        ...base,
        type: 'video',
        video: parseMediaFields(msg.video as Record<string, unknown>),
      };

    case 'audio':
      return {
        ...base,
        type: 'audio',
        audio: {
          ...parseMediaFields(msg.audio as Record<string, unknown>),
          voice: Boolean((msg.audio as Record<string, unknown>)?.voice),
        },
      };

    case 'document':
      return {
        ...base,
        type: 'document',
        document: {
          ...parseMediaFields(msg.document as Record<string, unknown>),
          filename: optStr((msg.document as Record<string, unknown>)?.filename),
        },
      };

    case 'sticker':
      return {
        ...base,
        type: 'sticker',
        sticker: {
          mediaId: String((msg.sticker as Record<string, unknown>)?.id ?? ''),
          mimeType: String((msg.sticker as Record<string, unknown>)?.mime_type ?? 'image/webp'),
          sha256: optStr((msg.sticker as Record<string, unknown>)?.sha256),
          animated: Boolean((msg.sticker as Record<string, unknown>)?.animated),
        },
      };

    case 'location':
      return {
        ...base,
        type: 'location',
        location: parseLocation(msg.location as Record<string, unknown>),
      };

    case 'contacts':
      return {
        ...base,
        type: 'contacts',
        contacts: parseContacts(msg.contacts as Array<Record<string, unknown>>),
      };

    case 'interactive':
      return parseInteractiveReply(base, msg.interactive as Record<string, unknown>);

    case 'reaction':
      return {
        ...base,
        type: 'reaction',
        reaction: {
          messageId: String((msg.reaction as Record<string, unknown>)?.message_id ?? ''),
          emoji: String((msg.reaction as Record<string, unknown>)?.emoji ?? ''),
        },
      };

    case 'order':
      return {
        ...base,
        type: 'order',
        order: parseOrder(msg.order as Record<string, unknown>),
      };

    case 'system':
      return {
        ...base,
        type: 'system',
        system: {
          body: String((msg.system as Record<string, unknown>)?.body ?? ''),
          identity: optStr((msg.system as Record<string, unknown>)?.identity),
          wa_id: optStr((msg.system as Record<string, unknown>)?.wa_id),
          type: optStr((msg.system as Record<string, unknown>)?.type),
          customer: optStr((msg.system as Record<string, unknown>)?.customer),
        },
      };

    case 'referral': {
      const ref = (msg.referral ?? {}) as Record<string, unknown>;
      return {
        ...base,
        type: 'referral',
        referral: {
          source_url: optStr(ref.source_url),
          source_type: optStr(ref.source_type),
          source_id: optStr(ref.source_id),
          headline: optStr(ref.headline),
          body: optStr(ref.body),
          media_type: optStr(ref.media_type),
          image_url: optStr(ref.image_url),
          video_url: optStr(ref.video_url),
          thumbnail_url: optStr(ref.thumbnail_url),
          ctwa_clid: optStr(ref.ctwa_clid),
        },
        text: optStr((msg.text as Record<string, unknown>)?.body),
      };
    }

    default:
      // Also handle messages that have a referral field alongside text
      if (msg.referral && msg.text) {
        const ref = msg.referral as Record<string, unknown>;
        return {
          ...base,
          type: 'referral',
          referral: {
            source_url: optStr(ref.source_url),
            source_type: optStr(ref.source_type),
            source_id: optStr(ref.source_id),
            headline: optStr(ref.headline),
            body: optStr(ref.body),
            media_type: optStr(ref.media_type),
            image_url: optStr(ref.image_url),
            video_url: optStr(ref.video_url),
            thumbnail_url: optStr(ref.thumbnail_url),
            ctwa_clid: optStr(ref.ctwa_clid),
          },
          text: optStr((msg.text as Record<string, unknown>)?.body),
        };
      }
      return {
        ...base,
        type: 'unsupported',
        errors: Array.isArray(msg.errors) ? msg.errors as InboundMessage extends { errors: infer E } ? E : never : undefined,
      };
  }
}

// ---------------------------------------------------------------------------
// Interactive reply parser
// ---------------------------------------------------------------------------

function parseInteractiveReply(base: InboundBase, raw: Record<string, unknown>): InboundMessage {
  const subType = String(raw?.type ?? '');

  // NFM / Flow reply
  if (subType === 'nfm_reply') {
    const nfm = raw.nfm_reply as Record<string, unknown> | undefined;
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(String(nfm?.response_json ?? '{}')) as Record<string, unknown>;
    } catch { /* ignore */ }
    return {
      ...base,
      type: 'flow_reply',
      flow: { responseJson: json, body: String(nfm?.body ?? '') },
    };
  }

  // Button reply
  if (subType === 'button_reply') {
    const btn = raw.button_reply as Record<string, unknown>;
    return {
      ...base,
      type: 'interactive_reply',
      interactive: {
        subType: 'button_reply',
        id: String(btn?.id ?? ''),
        title: String(btn?.title ?? ''),
      },
    };
  }

  // List reply
  if (subType === 'list_reply') {
    const row = raw.list_reply as Record<string, unknown>;
    return {
      ...base,
      type: 'interactive_reply',
      interactive: {
        subType: 'list_reply',
        id: String(row?.id ?? ''),
        title: String(row?.title ?? ''),
        description: optStr(row?.description),
      },
    };
  }

  return { ...base, type: 'unsupported' };
}

// ---------------------------------------------------------------------------
// Media field helpers
// ---------------------------------------------------------------------------

function parseMediaFields(raw: Record<string, unknown> | undefined): {
  mediaId: string;
  mimeType: string;
  sha256?: string;
  caption?: string;
} {
  return {
    mediaId: String(raw?.id ?? ''),
    mimeType: String(raw?.mime_type ?? 'application/octet-stream'),
    sha256: optStr(raw?.sha256),
    caption: optStr(raw?.caption),
  };
}

// ---------------------------------------------------------------------------
// Contact helpers
// ---------------------------------------------------------------------------

function parseContacts(raw: Array<Record<string, unknown>> | undefined): Contact[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => {
    const nameRaw = (c.name ?? {}) as Record<string, unknown>;
    const name: ContactName = {
      formatted_name: String(nameRaw.formatted_name ?? ''),
      first_name: optStr(nameRaw.first_name),
      last_name: optStr(nameRaw.last_name),
      middle_name: optStr(nameRaw.middle_name),
      suffix: optStr(nameRaw.suffix),
      prefix: optStr(nameRaw.prefix),
    };

    const phones: ContactPhone[] = Array.isArray(c.phones)
      ? (c.phones as Array<Record<string, unknown>>).map((p) => ({
          phone: optStr(p.phone),
          type: optStr(p.type),
          wa_id: optStr(p.wa_id),
        }))
      : [];

    const emails: ContactEmail[] = Array.isArray(c.emails)
      ? (c.emails as Array<Record<string, unknown>>).map((e) => ({
          email: optStr(e.email),
          type: optStr(e.type),
        }))
      : [];

    const urls: ContactUrl[] = Array.isArray(c.urls)
      ? (c.urls as Array<Record<string, unknown>>).map((u) => ({
          url: optStr(u.url),
          type: optStr(u.type),
        }))
      : [];

    const addresses: ContactAddress[] = Array.isArray(c.addresses)
      ? (c.addresses as Array<Record<string, unknown>>).map((a) => ({
          street: optStr(a.street),
          city: optStr(a.city),
          state: optStr(a.state),
          zip: optStr(a.zip),
          country: optStr(a.country),
          country_code: optStr(a.country_code),
          type: optStr(a.type),
        }))
      : [];

    const orgRaw = c.org as Record<string, unknown> | undefined;
    const org: ContactOrg | undefined = orgRaw
      ? {
          company: optStr(orgRaw.company),
          department: optStr(orgRaw.department),
          title: optStr(orgRaw.title),
        }
      : undefined;

    return { name, phones, emails, urls, addresses, org, birthday: optStr(c.birthday) };
  });
}

// ---------------------------------------------------------------------------
// Location helper
// ---------------------------------------------------------------------------

function parseLocation(raw: Record<string, unknown> | undefined): {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  url?: string;
} {
  return {
    latitude: Number(raw?.latitude ?? 0),
    longitude: Number(raw?.longitude ?? 0),
    name: optStr(raw?.name),
    address: optStr(raw?.address),
    url: optStr(raw?.url),
  };
}

// ---------------------------------------------------------------------------
// Order helper
// ---------------------------------------------------------------------------

function parseOrder(raw: Record<string, unknown> | undefined): {
  catalogId: string;
  productItems: Array<{ product_retailer_id: string; quantity: number; item_price: number; currency: string }>;
  text?: string;
} {
  const items = Array.isArray(raw?.product_items)
    ? (raw.product_items as Array<Record<string, unknown>>).map((pi) => ({
        product_retailer_id: String(pi.product_retailer_id ?? ''),
        quantity: Number(pi.quantity ?? 0),
        item_price: Number(pi.item_price ?? 0),
        currency: String(pi.currency ?? ''),
      }))
    : [];

  return {
    catalogId: String(raw?.catalog_id ?? ''),
    productItems: items,
    text: optStr(raw?.text),
  };
}

// ---------------------------------------------------------------------------
// Status parser
// ---------------------------------------------------------------------------

function parseStatus(raw: Record<string, unknown>): StatusUpdate {
  return {
    id: String(raw.id ?? ''),
    recipientId: String(raw.recipient_id ?? ''),
    timestamp: Number(raw.timestamp ?? 0),
    status: String(raw.status ?? 'sent') as StatusUpdate['status'],
    errors: Array.isArray(raw.errors)
      ? (raw.errors as Array<Record<string, unknown>>).map((e) => ({
          code: Number(e.code ?? 0),
          title: String(e.title ?? ''),
          message: optStr(e.message),
          error_data: e.error_data as Record<string, unknown> | undefined,
        }))
      : undefined,
    conversation: raw.conversation
      ? {
          id: String((raw.conversation as Record<string, unknown>).id ?? ''),
          origin: (raw.conversation as Record<string, unknown>).origin
            ? { type: String(((raw.conversation as Record<string, unknown>).origin as Record<string, unknown>).type ?? '') }
            : undefined,
        }
      : undefined,
    pricing: raw.pricing
      ? {
          billable: Boolean((raw.pricing as Record<string, unknown>).billable),
          pricing_model: String((raw.pricing as Record<string, unknown>).pricing_model ?? ''),
          category: String((raw.pricing as Record<string, unknown>).category ?? ''),
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function optStr(v: unknown): string | undefined {
  return v != null ? String(v) : undefined;
}
