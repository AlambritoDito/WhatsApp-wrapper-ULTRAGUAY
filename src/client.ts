/**
 * The main `WhatsAppClient` class — instanciable, event‑driven WhatsApp
 * Cloud API wrapper.
 *
 * @module client
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

import { WhatsAppError, StorageNotConfiguredError } from './errors';
import { createHttpClient, type HttpClient } from './http';
import { parseIncoming, parseStatuses } from './parse-incoming';
import type {
  WhatsAppClientConfig,
  SendResponse,
  SendTextOptions,
  MediaRef,
  SendImageOptions,
  SendVideoOptions,
  SendAudioOptions,
  SendDocumentOptions,
  SendStickerOptions,
  Location,
  SendTemplateOptions,
  Contact,
  Interactive,
  SendInteractiveOptions,
  UploadMediaResult,
  MediaUrlResult,
  WebhookPayload,
  WhatsAppEvents,
} from './types';

const DEFAULT_API_VERSION = 'v21.0';

/**
 * Instanciable WhatsApp Cloud API client.
 *
 * @example
 * ```ts
 * import { WhatsAppClient } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
 *
 * const client = new WhatsAppClient({
 *   accessToken: process.env.WA_TOKEN!,
 *   phoneNumberId: process.env.WA_PHONE_ID!,
 * });
 *
 * await client.sendText('5215512345678', 'Hello!');
 * ```
 */
export class WhatsAppClient {
  private readonly http: HttpClient;
  private readonly config: Required<Pick<WhatsAppClientConfig, 'accessToken' | 'phoneNumberId' | 'apiVersion'>> &
    Pick<WhatsAppClientConfig, 'appSecret' | 'storage'>;
  private readonly emitter = new EventEmitter();

  constructor(cfg: WhatsAppClientConfig) {
    this.config = {
      accessToken: cfg.accessToken,
      phoneNumberId: cfg.phoneNumberId,
      apiVersion: cfg.apiVersion ?? DEFAULT_API_VERSION,
      appSecret: cfg.appSecret,
      storage: cfg.storage,
    };
    this.http = createHttpClient(cfg.accessToken, cfg.http);
  }

  // -----------------------------------------------------------------------
  // Event emitter delegation
  // -----------------------------------------------------------------------

  /**
   * Register an event listener.
   *
   * @param event - Event name (e.g. `'message'`, `'message:text'`, `'status'`, `'error'`).
   * @param listener - Callback invoked when the event fires.
   */
  on<K extends keyof WhatsAppEvents>(event: K, listener: WhatsAppEvents[K]): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Register a one‑shot event listener.
   */
  once<K extends keyof WhatsAppEvents>(event: K, listener: WhatsAppEvents[K]): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Remove an event listener.
   */
  off<K extends keyof WhatsAppEvents>(event: K, listener: WhatsAppEvents[K]): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Remove all listeners for a given event (or all events). */
  removeAllListeners(event?: keyof WhatsAppEvents): this {
    this.emitter.removeAllListeners(event);
    return this;
  }

  // -----------------------------------------------------------------------
  // URL helpers
  // -----------------------------------------------------------------------

  private baseUrl(): string {
    return `https://graph.facebook.com/${this.config.apiVersion}`;
  }

  private messagesUrl(): string {
    return `${this.baseUrl()}/${this.config.phoneNumberId}/messages`;
  }

  private mediaUploadUrl(): string {
    return `${this.baseUrl()}/${this.config.phoneNumberId}/media`;
  }

  // -----------------------------------------------------------------------
  // Internal send
  // -----------------------------------------------------------------------

  private async send(payload: Record<string, unknown>): Promise<SendResponse> {
    const res = await this.http.request<{ messages: Array<{ id: string }> }>(
      this.messagesUrl(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const wamid = res?.messages?.[0]?.id;
    if (!wamid) throw new WhatsAppError('No wamid in response', 0, res);
    return { wamid };
  }

  // -----------------------------------------------------------------------
  // Send methods
  // -----------------------------------------------------------------------

  /**
   * Send a plain text message.
   *
   * @param to - Recipient phone number (international format, digits only).
   * @param text - Message body.
   * @param opts - Optional settings (link preview, reply‑to).
   * @returns The WhatsApp message ID.
   */
  async sendText(to: string, text: string, opts?: SendTextOptions): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      ...(opts?.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      text: { body: text, preview_url: opts?.previewUrl ?? false },
    });
  }

  /**
   * Send an image message.
   *
   * @param to - Recipient phone number.
   * @param image - Media reference (URL or uploaded media ID).
   * @param opts - Optional caption and reply‑to.
   */
  async sendImage(to: string, image: MediaRef, opts?: SendImageOptions): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      ...(opts?.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      image: { ...image, ...(opts?.caption ? { caption: opts.caption } : {}) },
    });
  }

  /**
   * Send a video message.
   *
   * @param to - Recipient phone number.
   * @param video - Media reference (URL or uploaded media ID).
   * @param opts - Optional caption and reply‑to.
   */
  async sendVideo(to: string, video: MediaRef, opts?: SendVideoOptions): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'video',
      ...(opts?.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      video: { ...video, ...(opts?.caption ? { caption: opts.caption } : {}) },
    });
  }

  /**
   * Send an audio message.
   *
   * @param to - Recipient phone number.
   * @param audio - Media reference (URL or uploaded media ID).
   * @param opts - Optional reply‑to.
   */
  async sendAudio(to: string, audio: MediaRef, opts?: SendAudioOptions): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'audio',
      ...(opts?.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      audio,
    });
  }

  /**
   * Send a document message.
   *
   * @param to - Recipient phone number.
   * @param document - Media reference (URL or uploaded media ID).
   * @param opts - Optional filename, caption, and reply‑to.
   */
  async sendDocument(to: string, document: MediaRef, opts?: SendDocumentOptions): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      ...(opts?.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      document: {
        ...document,
        ...(opts?.filename ? { filename: opts.filename } : {}),
        ...(opts?.caption ? { caption: opts.caption } : {}),
      },
    });
  }

  /**
   * Send a sticker message.
   *
   * @param to - Recipient phone number.
   * @param sticker - Media reference (URL or uploaded media ID).
   * @param opts - Optional reply‑to.
   */
  async sendSticker(to: string, sticker: MediaRef, opts?: SendStickerOptions): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'sticker',
      ...(opts?.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      sticker,
    });
  }

  /**
   * Send a location message.
   *
   * @param to - Recipient phone number.
   * @param location - Coordinates and optional name/address.
   */
  async sendLocation(to: string, location: Location): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'location',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        address: location.address,
      },
    });
  }

  /**
   * Send a location‑request message (asks the user to share their location).
   *
   * @param to - Recipient phone number.
   * @param text - Body text displayed with the request.
   */
  async sendLocationRequest(to: string, text: string): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: { text },
        action: { name: 'send_location' },
      },
    });
  }

  /**
   * Send a template message.
   *
   * @param to - Recipient phone number.
   * @param templateName - Name of the approved template.
   * @param opts - Language code and component parameters.
   */
  async sendTemplate(to: string, templateName: string, opts?: SendTemplateOptions): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      ...(opts?.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      template: {
        name: templateName,
        language: { code: opts?.language ?? 'en_US' },
        ...(opts?.components?.length ? { components: opts.components } : {}),
      },
    });
  }

  /**
   * Send (or remove) a reaction to a message.
   *
   * @param to - Recipient phone number.
   * @param messageId - The wamid of the message to react to.
   * @param emoji - Emoji character, or empty string to remove the reaction.
   */
  async sendReaction(to: string, messageId: string, emoji: string): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'reaction',
      reaction: { message_id: messageId, emoji },
    });
  }

  /**
   * Send a contacts message.
   *
   * @param to - Recipient phone number.
   * @param contacts - Array of contact objects.
   */
  async sendContacts(to: string, contacts: Contact[]): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'contacts',
      contacts,
    });
  }

  /**
   * Send an interactive message (buttons, lists, flows, CTA URLs).
   *
   * @param to - Recipient phone number.
   * @param interactive - The interactive message payload.
   * @param opts - Optional reply‑to.
   */
  async sendInteractive(to: string, interactive: Interactive, opts?: SendInteractiveOptions): Promise<SendResponse> {
    return this.send({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      ...(opts?.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      interactive,
    });
  }

  /**
   * Mark a message as read (sends the blue check marks).
   *
   * @param messageId - The wamid of the message to mark as read.
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.http.request(this.messagesUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  }

  // -----------------------------------------------------------------------
  // Media methods
  // -----------------------------------------------------------------------

  /**
   * Upload a media file to WhatsApp servers.
   *
   * @param file - The file contents as a Buffer or Uint8Array.
   * @param mimeType - MIME type of the file.
   * @param filename - Optional filename.
   * @returns The uploaded media ID.
   */
  async uploadMedia(file: Buffer | Uint8Array, mimeType: string, filename?: string): Promise<UploadMediaResult> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file)], { type: mimeType });
    formData.append('file', blob, filename ?? 'file');
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);

    const res = await this.http.request<{ id: string }>(this.mediaUploadUrl(), {
      method: 'POST',
      // Let fetch set the Content-Type with boundary for FormData
      body: formData,
    });

    if (!res?.id) throw new WhatsAppError('No media ID in upload response', 0, res);
    return { id: res.id };
  }

  /**
   * Retrieve the download URL for a media asset.
   *
   * @param mediaId - The media ID.
   * @returns The download URL, MIME type, and file size.
   */
  async getMediaUrl(mediaId: string): Promise<MediaUrlResult> {
    const url = `${this.baseUrl()}/${mediaId}`;
    return this.http.request<MediaUrlResult>(url, { method: 'GET' });
  }

  /**
   * Download a media file by its ID. Resolves the URL internally.
   *
   * @param mediaId - The media ID to download.
   * @returns The file contents as a Buffer.
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    const meta = await this.getMediaUrl(mediaId);
    if (!meta?.url) throw new WhatsAppError('No URL in media metadata', 0, meta);

    const res = await this.http.requestRaw(meta.url, { method: 'GET' });
    if (!res.ok) {
      throw new WhatsAppError(`Failed to download media: ${res.status}`, res.status);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  /**
   * Delete a media file from WhatsApp servers.
   *
   * @param mediaId - The media ID to delete.
   */
  async deleteMedia(mediaId: string): Promise<void> {
    const url = `${this.baseUrl()}/${mediaId}`;
    await this.http.request(url, { method: 'DELETE' });
  }

  // -----------------------------------------------------------------------
  // Storage shorthand
  // -----------------------------------------------------------------------

  /**
   * Download a media file and persist it using the configured storage adapter.
   *
   * @param mediaId - The media ID to download and save.
   * @param suggestedName - Optional file name hint for storage.
   * @returns The storage location string.
   * @throws {StorageNotConfiguredError} if no storage adapter was provided.
   */
  async downloadAndSave(mediaId: string, suggestedName?: string): Promise<{ location: string }> {
    if (!this.config.storage) throw new StorageNotConfiguredError();
    const meta = await this.getMediaUrl(mediaId);
    const res = await this.http.requestRaw(meta.url, { method: 'GET' });
    if (!res.ok) throw new WhatsAppError(`Failed to download media: ${res.status}`, res.status);
    const ab = await res.arrayBuffer();
    const data = Buffer.from(ab);
    return this.config.storage.save({
      data,
      mimeType: meta.mime_type ?? 'application/octet-stream',
      suggestedName: suggestedName ?? mediaId,
    });
  }

  // -----------------------------------------------------------------------
  // Webhook handling
  // -----------------------------------------------------------------------

  /**
   * Verify an incoming webhook payload signature.
   *
   * @param rawBody - The raw request body (string or Buffer).
   * @param signature - The value of the `x-hub-signature-256` header.
   * @returns `true` if the signature is valid.
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    const secret = this.config.appSecret;
    if (!secret) throw new Error('appSecret is required for signature verification');
    return verifyWebhookSignature(rawBody, signature, secret);
  }

  /**
   * Process an incoming webhook: verify signature, parse messages and statuses,
   * and emit typed events.
   *
   * @param input - The raw request data.
   * @param input.rawBody - Raw body (Buffer or string) for signature verification.
   * @param input.signature - The `x-hub-signature-256` header value.
   * @param input.body - Parsed JSON body.
   */
  handleWebhook(input: { rawBody: Buffer | string; signature?: string; body: WebhookPayload }): void {
    // Verify signature if appSecret is configured and signature is provided.
    if (this.config.appSecret && input.signature) {
      if (!this.verifyWebhookSignature(input.rawBody, input.signature)) {
        const err = new WhatsAppError('Invalid webhook signature', 401);
        this.emitter.emit('error', err);
        throw err;
      }
    }

    try {
      const messages = parseIncoming(input.body);
      for (const msg of messages) {
        this.emitter.emit('message', msg);
        this.emitter.emit(`message:${msg.type}`, msg);
      }

      const statuses = parseStatuses(input.body);
      for (const status of statuses) {
        this.emitter.emit('status', status);
      }
    } catch (err: unknown) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      this.emitter.emit('error', wrapped);
      throw wrapped;
    }
  }
}

// ---------------------------------------------------------------------------
// Standalone webhook utilities
// ---------------------------------------------------------------------------

/**
 * Verify a webhook payload signature using HMAC‑SHA256.
 *
 * @param rawBody - The raw request body.
 * @param signature - The `x-hub-signature-256` header value.
 * @param appSecret - Your Meta app secret.
 * @returns `true` if the signature is valid.
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string, appSecret: string): boolean {
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
