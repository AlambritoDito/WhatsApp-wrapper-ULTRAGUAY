/**
 * Event types for the WhatsApp client EventEmitter.
 */

import type { IncomingMessage } from './messages.js';
import type { WebhookStatus } from './responses.js';

/** Status event payload, normalized. */
export interface StatusEvent {
  /** The wamid of the message this status refers to. */
  messageId: string;
  /** Status type. */
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';
  /** Unix timestamp (seconds). */
  timestamp: number;
  /** Recipient phone number. */
  recipientId: string;
  /** Conversation metadata, if available. */
  conversation?: {
    id: string;
    origin?: string;
  };
  /** Error details if status is 'failed'. */
  errors?: Array<{ code: number; title: string; message?: string }>;
  /** Raw webhook status object. */
  raw: WebhookStatus;
}

/** All events that WhatsAppClient emits. */
export interface WhatsAppClientEvents {
  /** Fired for every incoming message regardless of type. */
  message: (msg: IncomingMessage) => void;
  /** Fired for text messages. */
  'message:text': (msg: IncomingMessage) => void;
  /** Fired for image messages. */
  'message:image': (msg: IncomingMessage) => void;
  /** Fired for audio messages. */
  'message:audio': (msg: IncomingMessage) => void;
  /** Fired for video messages. */
  'message:video': (msg: IncomingMessage) => void;
  /** Fired for document messages. */
  'message:document': (msg: IncomingMessage) => void;
  /** Fired for sticker messages. */
  'message:sticker': (msg: IncomingMessage) => void;
  /** Fired for location messages. */
  'message:location': (msg: IncomingMessage) => void;
  /** Fired for contacts messages. */
  'message:contacts': (msg: IncomingMessage) => void;
  /** Fired for button reply messages. */
  'message:button_reply': (msg: IncomingMessage) => void;
  /** Fired for list reply messages. */
  'message:list_reply': (msg: IncomingMessage) => void;
  /** Fired for flow reply messages. */
  'message:flow_reply': (msg: IncomingMessage) => void;
  /** Fired for reaction messages. */
  'message:reaction': (msg: IncomingMessage) => void;
  /** Fired for unknown message types. */
  'message:unknown': (msg: IncomingMessage) => void;
  /** Fired for message status updates (delivered, read, failed, etc.). */
  status: (event: StatusEvent) => void;
  /** Fired on errors during webhook processing. */
  error: (err: Error) => void;
}
