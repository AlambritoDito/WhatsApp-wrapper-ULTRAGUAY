/**
 * Core types for WhatsApp Cloud API wrapper.
 * @module types
 */

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

/** Configuration options for {@link WhatsAppClient}. */
export interface WhatsAppClientConfig {
  /** Permanent or temporary access token issued by Meta. */
  accessToken: string;
  /** Phone‑number ID registered in the WhatsApp Business Account. */
  phoneNumberId: string;
  /** App secret used to verify webhook signatures (HMAC‑SHA256). */
  appSecret?: string;
  /** Graph API version. @default "v21.0" */
  apiVersion?: string;
  /** Optional storage adapter for persisting downloaded media. */
  storage?: import('./storage/adapter').StorageAdapter;
  /** HTTP transport tuning. */
  http?: HttpOptions;
}

/** HTTP transport options. */
export interface HttpOptions {
  /** Request timeout in milliseconds. @default 30_000 */
  timeoutMs?: number;
  /** Maximum automatic retries on 429 / 5xx. @default 3 */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (exponential back‑off). @default 1000 */
  backoffMs?: number;
}

// ---------------------------------------------------------------------------
// Common send helpers
// ---------------------------------------------------------------------------

/** Standard response returned by every send method. */
export interface SendResponse {
  /** WhatsApp message ID (wamid). */
  wamid: string;
}

/** Options shared by several send methods. */
export interface CommonSendOptions {
  /** Reply to a specific message by its wamid. */
  replyTo?: string;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export interface SendTextOptions extends CommonSendOptions {
  /** Enable link previews in the message. @default false */
  previewUrl?: boolean;
}

// ---------------------------------------------------------------------------
// Media helpers
// ---------------------------------------------------------------------------

/** A media reference — either a hosted URL **or** a previously‑uploaded media ID. */
export type MediaRef =
  | { url: string; id?: never }
  | { id: string; url?: never };

export interface SendImageOptions extends CommonSendOptions {
  caption?: string;
}

export interface SendVideoOptions extends CommonSendOptions {
  caption?: string;
}

export type SendAudioOptions = CommonSendOptions;

export interface SendDocumentOptions extends CommonSendOptions {
  filename?: string;
  caption?: string;
}

export type SendStickerOptions = CommonSendOptions;

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export interface SendTemplateOptions extends CommonSendOptions {
  /** BCP‑47 language code. @default "en_US" */
  language?: string;
  /** Template component parameters. */
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: string;
  index?: string;
  parameters: TemplateParameter[];
}

export type TemplateParameter =
  | { type: 'text'; text: string }
  | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } }
  | { type: 'date_time'; date_time: { fallback_value: string } }
  | { type: 'image'; image: MediaRef }
  | { type: 'video'; video: MediaRef }
  | { type: 'document'; document: MediaRef & { filename?: string } }
  | { type: 'payload'; payload: string };

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export interface Contact {
  name: ContactName;
  phones?: ContactPhone[];
  emails?: ContactEmail[];
  urls?: ContactUrl[];
  addresses?: ContactAddress[];
  org?: ContactOrg;
  birthday?: string;
}

export interface ContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  prefix?: string;
}

export interface ContactPhone {
  phone?: string;
  type?: 'CELL' | 'MAIN' | 'IPHONE' | 'HOME' | 'WORK' | string;
  wa_id?: string;
}

export interface ContactEmail {
  email?: string;
  type?: 'HOME' | 'WORK' | string;
}

export interface ContactUrl {
  url?: string;
  type?: 'HOME' | 'WORK' | string;
}

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  country_code?: string;
  type?: 'HOME' | 'WORK' | string;
}

export interface ContactOrg {
  company?: string;
  department?: string;
  title?: string;
}

// ---------------------------------------------------------------------------
// Interactive
// ---------------------------------------------------------------------------

/** Union of all supported interactive message shapes. */
export type Interactive =
  | InteractiveButtons
  | InteractiveList
  | InteractiveFlow
  | InteractiveCTA
  | InteractiveLocationRequest;

export interface InteractiveButtons {
  type: 'button';
  header?: InteractiveHeader;
  body: { text: string };
  footer?: { text: string };
  action: {
    buttons: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
  };
}

export interface InteractiveList {
  type: 'list';
  header?: InteractiveHeader;
  body: { text: string };
  footer?: { text: string };
  action: {
    button: string;
    sections: InteractiveSection[];
  };
}

export interface InteractiveSection {
  title?: string;
  rows: InteractiveRow[];
}

export interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveFlow {
  type: 'flow';
  header?: InteractiveHeader;
  body: { text: string };
  footer?: { text: string };
  action: {
    name: 'flow';
    parameters: Record<string, unknown>;
  };
}

export interface InteractiveCTA {
  type: 'cta_url';
  header?: InteractiveHeader;
  body: { text: string };
  footer?: { text: string };
  action: {
    name: 'cta_url';
    parameters: { display_text: string; url: string };
  };
}

export interface InteractiveLocationRequest {
  type: 'location_request_message';
  body: { text: string };
  action: { name: 'send_location' };
}

export type InteractiveHeader =
  | { type: 'text'; text: string }
  | { type: 'image'; image: MediaRef }
  | { type: 'video'; video: MediaRef }
  | { type: 'document'; document: MediaRef };

export type SendInteractiveOptions = CommonSendOptions;

// ---------------------------------------------------------------------------
// Media management
// ---------------------------------------------------------------------------

export interface UploadMediaResult {
  id: string;
}

export interface MediaUrlResult {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: string;
}

// ---------------------------------------------------------------------------
// Inbound message types (webhook parsing)
// ---------------------------------------------------------------------------

export interface InboundBase {
  /** Sender phone number (international format without +). */
  from: string;
  /** Unix epoch seconds. */
  timestamp: number;
  /** WhatsApp message ID. */
  wamid: string;
}

export interface InboundText extends InboundBase {
  type: 'text';
  text: string;
}

export interface InboundImage extends InboundBase {
  type: 'image';
  image: { mediaId: string; mimeType: string; sha256?: string; caption?: string };
}

export interface InboundVideo extends InboundBase {
  type: 'video';
  video: { mediaId: string; mimeType: string; sha256?: string; caption?: string };
}

export interface InboundAudio extends InboundBase {
  type: 'audio';
  audio: { mediaId: string; mimeType: string; sha256?: string; voice?: boolean };
}

export interface InboundDocument extends InboundBase {
  type: 'document';
  document: { mediaId: string; mimeType: string; sha256?: string; filename?: string; caption?: string };
}

export interface InboundSticker extends InboundBase {
  type: 'sticker';
  sticker: { mediaId: string; mimeType: string; sha256?: string; animated?: boolean };
}

export interface InboundLocation extends InboundBase {
  type: 'location';
  location: { latitude: number; longitude: number; name?: string; address?: string; url?: string };
}

export interface InboundContacts extends InboundBase {
  type: 'contacts';
  contacts: Contact[];
}

export interface InboundInteractiveReply extends InboundBase {
  type: 'interactive_reply';
  interactive: {
    subType: 'button_reply' | 'list_reply';
    id: string;
    title: string;
    description?: string;
  };
}

export interface InboundReaction extends InboundBase {
  type: 'reaction';
  reaction: { messageId: string; emoji: string };
}

export interface InboundFlowReply extends InboundBase {
  type: 'flow_reply';
  flow: { responseJson: Record<string, unknown>; body: string };
}

export interface InboundOrder extends InboundBase {
  type: 'order';
  order: { catalogId: string; productItems: OrderProductItem[]; text?: string };
}

export interface OrderProductItem {
  product_retailer_id: string;
  quantity: number;
  item_price: number;
  currency: string;
}

export interface InboundSystem extends InboundBase {
  type: 'system';
  system: { body: string; identity?: string; wa_id?: string; type?: string; customer?: string };
}

export interface InboundReferral extends InboundBase {
  type: 'referral';
  referral: { source_url?: string; source_type?: string; source_id?: string; headline?: string; body?: string; media_type?: string; image_url?: string; video_url?: string; thumbnail_url?: string; ctwa_clid?: string };
  /** The text message that came with the referral, if any. */
  text?: string;
}

export interface InboundUnsupported extends InboundBase {
  type: 'unsupported';
  errors?: Array<{ code: number; title: string; message?: string; error_data?: Record<string, unknown> }>;
}

/** Union of every inbound message type. */
export type InboundMessage =
  | InboundText
  | InboundImage
  | InboundVideo
  | InboundAudio
  | InboundDocument
  | InboundSticker
  | InboundLocation
  | InboundContacts
  | InboundInteractiveReply
  | InboundReaction
  | InboundFlowReply
  | InboundOrder
  | InboundSystem
  | InboundReferral
  | InboundUnsupported;

/** All possible values of {@link InboundMessage.type}. */
export type InboundMessageType = InboundMessage['type'];

// ---------------------------------------------------------------------------
// Status (delivery receipts)
// ---------------------------------------------------------------------------

export interface StatusUpdate {
  id: string;
  recipientId: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errors?: Array<{ code: number; title: string; message?: string; error_data?: Record<string, unknown> }>;
  conversation?: { id: string; origin?: { type: string } };
  pricing?: { billable: boolean; pricing_model: string; category: string };
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookChangeValue;
  field: string;
}

export interface WebhookChangeValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: Array<{ profile: { name: string }; wa_id: string }>;
  messages?: Array<Record<string, unknown>>;
  statuses?: Array<Record<string, unknown>>;
  errors?: Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface WhatsAppEvents {
  message: (msg: InboundMessage) => void;
  'message:text': (msg: InboundText) => void;
  'message:image': (msg: InboundImage) => void;
  'message:video': (msg: InboundVideo) => void;
  'message:audio': (msg: InboundAudio) => void;
  'message:document': (msg: InboundDocument) => void;
  'message:sticker': (msg: InboundSticker) => void;
  'message:location': (msg: InboundLocation) => void;
  'message:contacts': (msg: InboundContacts) => void;
  'message:interactive_reply': (msg: InboundInteractiveReply) => void;
  'message:reaction': (msg: InboundReaction) => void;
  'message:flow_reply': (msg: InboundFlowReply) => void;
  'message:order': (msg: InboundOrder) => void;
  'message:system': (msg: InboundSystem) => void;
  'message:referral': (msg: InboundReferral) => void;
  'message:unsupported': (msg: InboundUnsupported) => void;
  status: (status: StatusUpdate) => void;
  error: (err: Error) => void;
}
