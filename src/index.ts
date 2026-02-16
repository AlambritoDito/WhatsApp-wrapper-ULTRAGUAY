/**
 * Main entry point for `@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay`.
 *
 * ```ts
 * import { WhatsAppClient } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
 * ```
 *
 * @module index
 */

// Core client
export { WhatsAppClient, verifyWebhookSignature } from './client';

// Inbound parsing (convenience re‑export)
export { parseIncoming, parseStatuses } from './parse-incoming';

// Errors
export { WhatsAppError, StorageNotConfiguredError } from './errors';

// Storage adapter interface (so consumers can implement their own)
export type { StorageAdapter, StorageSaveInput, StorageSaveResult } from './storage/adapter';

// All types
export type {
  // Config
  WhatsAppClientConfig,
  HttpOptions,
  // Send
  SendResponse,
  CommonSendOptions,
  SendTextOptions,
  MediaRef,
  SendImageOptions,
  SendVideoOptions,
  SendAudioOptions,
  SendDocumentOptions,
  SendStickerOptions,
  Location,
  SendTemplateOptions,
  TemplateComponent,
  TemplateParameter,
  // Contacts
  Contact,
  ContactName,
  ContactPhone,
  ContactEmail,
  ContactUrl,
  ContactAddress,
  ContactOrg,
  // Interactive
  Interactive,
  InteractiveButtons,
  InteractiveList,
  InteractiveSection,
  InteractiveRow,
  InteractiveFlow,
  InteractiveCTA,
  InteractiveLocationRequest,
  InteractiveHeader,
  SendInteractiveOptions,
  // Media
  UploadMediaResult,
  MediaUrlResult,
  // Inbound
  InboundBase,
  InboundMessage,
  InboundMessageType,
  InboundText,
  InboundImage,
  InboundVideo,
  InboundAudio,
  InboundDocument,
  InboundSticker,
  InboundLocation,
  InboundContacts,
  InboundInteractiveReply,
  InboundReaction,
  InboundFlowReply,
  InboundOrder,
  OrderProductItem,
  InboundSystem,
  InboundReferral,
  InboundUnsupported,
  // Status
  StatusUpdate,
  // Webhook
  WebhookPayload,
  WebhookEntry,
  WebhookChange,
  WebhookChangeValue,
  // Events
  WhatsAppEvents,
} from './types';
