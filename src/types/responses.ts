/**
 * Types for WhatsApp Cloud API responses.
 */

/** Successful message send response from the API. */
export interface MessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

/** Media upload response. */
export interface MediaUploadResponse {
  id: string;
}

/** Media metadata response (GET /<media-id>). */
export interface MediaMetadataResponse {
  id: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  messaging_product: 'whatsapp';
}

/** Error response from the API. */
export interface ApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_data?: {
      messaging_product: string;
      details: string;
    };
  };
}

/** Webhook entry from Meta. */
export interface WebhookBody {
  object: string;
  entry: WebhookEntry[];
}

/** A single entry in a webhook payload. */
export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

/** A change within a webhook entry. */
export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

/** The value payload from a webhook change. */
export interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
  errors?: WebhookError[];
}

/** Raw message from the webhook. */
export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: RawMediaObject;
  audio?: RawMediaObject;
  video?: RawMediaObject;
  document?: RawMediaObject & { filename?: string };
  sticker?: RawMediaObject;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    url?: string;
  };
  contacts?: Array<{
    name: {
      formatted_name: string;
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      suffix?: string;
      prefix?: string;
    };
    phones: Array<{
      phone: string;
      type?: string;
      wa_id?: string;
    }>;
  }>;
  reaction?: {
    message_id: string;
    emoji: string;
  };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
    nfm_reply?: { response_json?: string; body?: string };
  };
  button?: { payload: string; text?: string };
  context?: { from?: string; id: string };
  errors?: Array<{ code: number; title: string; message?: string; error_data?: { details: string } }>;
}

/** Raw media object from the webhook. */
export interface RawMediaObject {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

/** Status update from the webhook. */
export interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin?: { type: string };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
    error_data?: { details: string };
  }>;
}

/** Error from the webhook. */
export interface WebhookError {
  code: number;
  title: string;
  message?: string;
  error_data?: { details: string };
}
