/**
 * @brito/whatsapp-wrapper-ultra v2
 *
 * General-purpose TypeScript wrapper for the WhatsApp Cloud API.
 * Instanciable, no singletons, no global state, native fetch.
 *
 * @example
 * ```ts
 * import { WhatsAppClient, DiskStorageAdapter } from '@brito/whatsapp-wrapper-ultra';
 *
 * const client = new WhatsAppClient({
 *   accessToken: process.env.META_TOKEN!,
 *   phoneNumberId: process.env.PHONE_NUMBER_ID!,
 *   storage: new DiskStorageAdapter('./media'),
 * });
 *
 * client.on('message:text', async (msg) => {
 *   await msg.reply(`You said: ${msg.text}`);
 * });
 *
 * await client.startWebhookServer({ port: 3000 });
 * ```
 *
 * @packageDocumentation
 */

// ─── Main client ────────────────────────────────────────────────────
export { WhatsAppClient } from './client/WhatsAppClient.js';

// ─── Storage adapters ───────────────────────────────────────────────
export { DiskStorageAdapter } from './storage/DiskStorageAdapter.js';
export { S3StorageAdapter } from './storage/S3StorageAdapter.js';
export type { StorageAdapter, StorageSaveInput, StorageSaveResult } from './storage/StorageAdapter.js';
export type { S3StorageAdapterOptions } from './storage/S3StorageAdapter.js';

// ─── Errors ─────────────────────────────────────────────────────────
export { WhatsAppError } from './errors/WhatsAppError.js';

// ─── Types: Messages ────────────────────────────────────────────────
export type {
  MediaReference,
  ButtonOption,
  ListRow,
  ListSection,
  ListMessageOptions,
  DocumentOptions,
  LocationData,
  TemplateComponent,
  TemplateParameter,
  FlowOptions,
  MessageType,
  MediaInfo,
  LocationInfo,
  ContactName,
  ContactPhone,
  ContactInfo,
  SendResult,
  IncomingMessage,
} from './types/messages.js';

// ─── Types: Events ──────────────────────────────────────────────────
export type { WhatsAppClientEvents, StatusEvent } from './types/events.js';

// ─── Types: Config ──────────────────────────────────────────────────
export type {
  WhatsAppClientConfig,
  WebhookServerOptions,
  Logger,
  RetryConfig,
} from './types/config.js';

// ─── Types: Responses ───────────────────────────────────────────────
export type {
  MessageResponse,
  MediaUploadResponse,
  MediaMetadataResponse,
  WebhookBody,
  WebhookEntry,
  WebhookChange,
  WebhookValue,
  WebhookMessage,
  WebhookStatus,
  WebhookError,
} from './types/responses.js';

// ─── Utilities ──────────────────────────────────────────────────────
export { verifyPayloadSignature } from './utils/verifySignature.js';
export { formatPhone } from './utils/formatPhone.js';
export { mimeToExt } from './utils/mimeToExt.js';

// ─── Webhook parsing (standalone) ───────────────────────────────────
export { parseWebhookBody } from './receive/parseIncoming.js';
export type { ParsedWebhook } from './receive/parseIncoming.js';
