/**
 * Parse raw WhatsApp webhook payloads into normalized IncomingMessage objects.
 *
 * Supports ALL message types:
 * - text, image, audio, video, document, sticker, location, contacts
 * - interactive: button_reply, list_reply, nfm_reply (flows)
 * - legacy button (quick reply)
 *
 * Also extracts status updates.
 */

import type { IncomingMessage, MessageType, SendResult } from '../types/messages.js';
import type { StatusEvent } from '../types/events.js';
import type {
  WebhookBody,
  WebhookMessage,
  WebhookStatus,
  WebhookValue,
} from '../types/responses.js';

/** Result of parsing a webhook body. */
export interface ParsedWebhook {
  /** Parsed incoming messages. */
  messages: Omit<IncomingMessage, 'reply' | 'react' | 'markRead' | 'downloadMedia'>[];
  /** Parsed status updates. */
  statuses: StatusEvent[];
}

/**
 * Parse a raw webhook body from Meta into normalized messages and status events.
 * This is a pure function — no side effects, no client dependency.
 * The client adds helper methods (reply, react, etc.) after parsing.
 *
 * @param body - The raw webhook body (already JSON-parsed).
 * @returns Parsed messages and statuses.
 */
export function parseWebhookBody(body: unknown): ParsedWebhook {
  const result: ParsedWebhook = { messages: [], statuses: [] };

  if (!isWebhookBody(body)) {
    return result;
  }

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value;

      // Parse messages
      if (value.messages) {
        for (const msg of value.messages) {
          const parsed = parseSingleMessage(msg);
          if (parsed) {
            result.messages.push(parsed);
          }
        }
      }

      // Parse statuses
      if (value.statuses) {
        for (const status of value.statuses) {
          result.statuses.push(parseStatus(status));
        }
      }
    }
  }

  return result;
}

/**
 * Parse a single raw webhook message into a normalized IncomingMessage
 * (without client-bound helpers).
 */
function parseSingleMessage(
  msg: WebhookMessage,
): Omit<IncomingMessage, 'reply' | 'react' | 'markRead' | 'downloadMedia'> | null {
  const base = {
    id: msg.id,
    from: msg.from,
    timestamp: Number(msg.timestamp),
    context: msg.context ? { message_id: msg.context.id } : undefined,
    raw: msg,
  };

  // Interactive messages (button_reply, list_reply, flow/nfm_reply)
  if (msg.type === 'interactive' && msg.interactive) {
    const interactive = msg.interactive;

    if (interactive.type === 'button_reply' && interactive.button_reply) {
      return {
        ...base,
        type: 'button_reply',
        button_reply: {
          id: interactive.button_reply.id,
          title: interactive.button_reply.title,
        },
      };
    }

    if (interactive.type === 'list_reply' && interactive.list_reply) {
      return {
        ...base,
        type: 'list_reply',
        list_reply: {
          id: interactive.list_reply.id,
          title: interactive.list_reply.title,
          description: interactive.list_reply.description,
        },
      };
    }

    if (interactive.type === 'nfm_reply' && interactive.nfm_reply) {
      const jsonStr = interactive.nfm_reply.response_json ?? '{}';
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      } catch {
        // Invalid JSON — return empty object
      }
      return {
        ...base,
        type: 'flow_reply',
        flow_reply: parsed,
      };
    }
  }

  // Text
  if (msg.type === 'text' && msg.text) {
    return {
      ...base,
      type: 'text',
      text: msg.text.body,
    };
  }

  // Image
  if (msg.type === 'image' && msg.image) {
    return {
      ...base,
      type: 'image',
      image: {
        id: msg.image.id,
        mimeType: msg.image.mime_type,
        sha256: msg.image.sha256,
        caption: msg.image.caption,
      },
    };
  }

  // Audio
  if (msg.type === 'audio' && msg.audio) {
    return {
      ...base,
      type: 'audio',
      audio: {
        id: msg.audio.id,
        mimeType: msg.audio.mime_type,
        sha256: msg.audio.sha256,
      },
    };
  }

  // Video
  if (msg.type === 'video' && msg.video) {
    return {
      ...base,
      type: 'video',
      video: {
        id: msg.video.id,
        mimeType: msg.video.mime_type,
        sha256: msg.video.sha256,
        caption: msg.video.caption,
      },
    };
  }

  // Document
  if (msg.type === 'document' && msg.document) {
    return {
      ...base,
      type: 'document',
      document: {
        id: msg.document.id,
        mimeType: msg.document.mime_type,
        sha256: msg.document.sha256,
        caption: msg.document.caption,
        filename: msg.document.filename ?? 'document',
      },
    };
  }

  // Sticker
  if (msg.type === 'sticker' && msg.sticker) {
    return {
      ...base,
      type: 'sticker',
      sticker: {
        id: msg.sticker.id,
        mimeType: msg.sticker.mime_type,
        sha256: msg.sticker.sha256,
      },
    };
  }

  // Location
  if (msg.type === 'location' && msg.location) {
    return {
      ...base,
      type: 'location',
      location: {
        latitude: msg.location.latitude,
        longitude: msg.location.longitude,
        name: msg.location.name,
        address: msg.location.address,
        url: msg.location.url,
      },
    };
  }

  // Contacts
  if (msg.type === 'contacts' && msg.contacts) {
    return {
      ...base,
      type: 'contacts',
      contacts: msg.contacts.map((c) => ({
        name: c.name,
        phones: c.phones,
      })),
    };
  }

  // Reaction
  if (msg.type === 'reaction' && msg.reaction) {
    return {
      ...base,
      type: 'reaction',
      reaction: {
        message_id: msg.reaction.message_id,
        emoji: msg.reaction.emoji,
      },
    };
  }

  // Legacy button (quick reply — older API format)
  if (msg.button?.payload) {
    return {
      ...base,
      type: 'button_reply',
      button_reply: {
        id: msg.button.payload,
        title: msg.button.text ?? msg.button.payload,
      },
    };
  }

  // Unknown type — still return it with the raw data
  return {
    ...base,
    type: 'unknown',
  };
}

/** Parse a status update from the webhook. */
function parseStatus(status: WebhookStatus): StatusEvent {
  return {
    messageId: status.id,
    status: status.status,
    timestamp: Number(status.timestamp),
    recipientId: status.recipient_id,
    conversation: status.conversation
      ? {
          id: status.conversation.id,
          origin: status.conversation.origin?.type,
        }
      : undefined,
    errors: status.errors?.map((e) => ({
      code: e.code,
      title: e.title,
      message: e.message,
    })),
    raw: status,
  };
}

/** Type guard: check if the body looks like a valid webhook payload. */
function isWebhookBody(body: unknown): body is WebhookBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return Array.isArray(b.entry);
}
