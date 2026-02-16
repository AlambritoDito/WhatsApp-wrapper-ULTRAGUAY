/**
 * All message-related types for WhatsApp Cloud API v2.
 */

// ─── Outbound message types ───────────────────────────────────────────

/** Media reference: either a URL or a previously uploaded media ID. */
export interface MediaReference {
  url?: string;
  id?: string;
}

/** Button for interactive reply button messages (max 3). */
export interface ButtonOption {
  id: string;
  title: string;
}

/** Row inside a list section. */
export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

/** Section in a list message. */
export interface ListSection {
  title: string;
  rows: ListRow[];
}

/** Options for sending a list message. */
export interface ListMessageOptions {
  body: string;
  buttonText: string;
  sections: ListSection[];
  header?: string;
  footer?: string;
}

/** Options for sending a document. */
export interface DocumentOptions {
  filename?: string;
  caption?: string;
}

/** Location data for sending. */
export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/** Template component for template messages. */
export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  parameters: TemplateParameter[];
}

/** Individual template parameter. */
export type TemplateParameter =
  | { type: 'text'; text: string }
  | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } }
  | { type: 'date_time'; date_time: { fallback_value: string } }
  | { type: 'image'; image: MediaReference }
  | { type: 'document'; document: MediaReference }
  | { type: 'video'; video: MediaReference }
  | { type: 'payload'; payload: string };

/** Options for WhatsApp Flows. */
export interface FlowOptions {
  header?: string;
  body: string;
  footer?: string;
  flowId: string;
  flowToken: string;
  ctaText: string;
  mode?: 'draft' | 'published';
  screen?: string;
  data?: Record<string, unknown>;
}

// ─── Inbound message types ────────────────────────────────────────────

/** All recognized inbound message types. */
export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'button_reply'
  | 'list_reply'
  | 'flow_reply'
  | 'reaction'
  | 'unknown';

/** Media info extracted from an inbound media message. */
export interface MediaInfo {
  id: string;
  mimeType: string;
  sha256?: string;
  caption?: string;
}

/** Location info from an inbound location message. */
export interface LocationInfo {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  url?: string;
}

/** A single contact name entry. */
export interface ContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  prefix?: string;
}

/** Phone entry within a contact. */
export interface ContactPhone {
  phone: string;
  type?: string;
  wa_id?: string;
}

/** Contact info from an inbound contacts message. */
export interface ContactInfo {
  name: ContactName;
  phones: ContactPhone[];
}

// ─── Send result ──────────────────────────────────────────────────────

/** Result returned from all send operations. */
export interface SendResult {
  messageId: string;
}

// ─── Inbound message (normalized) ─────────────────────────────────────

/**
 * Normalized incoming message with type-specific payloads and helper methods.
 * The helpers (reply, react, markRead, downloadMedia) are bound to the client
 * that received the message, so consumers can call `msg.reply('thanks')`.
 */
export interface IncomingMessage {
  /** WhatsApp message ID (wamid). */
  id: string;
  /** Sender phone number. */
  from: string;
  /** Unix timestamp (seconds). */
  timestamp: number;
  /** Discriminated message type. */
  type: MessageType;

  // Type-specific payloads (only the one matching `type` is populated)
  text?: string;
  image?: MediaInfo;
  audio?: MediaInfo;
  video?: MediaInfo;
  document?: MediaInfo & { filename: string };
  sticker?: MediaInfo;
  location?: LocationInfo;
  contacts?: ContactInfo[];
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description?: string };
  flow_reply?: Record<string, unknown>;
  reaction?: { message_id: string; emoji: string };

  /** Context if this message is a reply to another message. */
  context?: { message_id: string };

  /** The raw webhook message object, for advanced use. */
  raw: unknown;

  // ─── Convenience helpers (bound to the client) ──────────────────
  /** Reply with a text message. */
  reply: (text: string) => Promise<SendResult>;
  /** React with an emoji. */
  react: (emoji: string) => Promise<void>;
  /** Mark this message as read. */
  markRead: () => Promise<void>;
  /** Download the media attachment (only for media types). */
  downloadMedia: () => Promise<Buffer>;
}
