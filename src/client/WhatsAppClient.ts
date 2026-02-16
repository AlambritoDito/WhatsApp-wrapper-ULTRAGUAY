/**
 * WhatsAppClient — the main entry point for the v2 wrapper.
 *
 * Instanciable, no singletons, no global state.
 * Each instance owns its own HTTP client, media client, and event emitter.
 *
 * @example
 * ```ts
 * const client = new WhatsAppClient({
 *   accessToken: process.env.META_TOKEN!,
 *   phoneNumberId: process.env.PHONE_NUMBER_ID!,
 *   appSecret: process.env.APP_SECRET,
 *   webhookVerifyToken: process.env.WEBHOOK_SECRET,
 *   storage: new DiskStorageAdapter('./media'),
 *   logger: console,
 * });
 *
 * client.on('message:text', async (msg) => {
 *   await msg.reply('Hello!');
 * });
 *
 * client.startWebhookServer({ port: 3000 });
 * ```
 */

import { EventEmitter } from 'events';
import type { Server } from 'http';

import { FetchClient } from '../http/fetchClient.js';
import { MediaClient } from '../media/MediaClient.js';
import { parseWebhookBody } from '../receive/parseIncoming.js';
import { sendText } from '../send/sendText.js';
import { sendButtons } from '../send/sendButtons.js';
import { sendList } from '../send/sendList.js';
import { sendImage, sendVideo, sendAudio, sendDocument, sendSticker } from '../send/sendMedia.js';
import { sendLocation, requestLocation } from '../send/sendLocation.js';
import { sendTemplate } from '../send/sendTemplate.js';
import { sendReaction, removeReaction } from '../send/sendReaction.js';
import { sendFlow } from '../send/sendFlow.js';
import { markAsRead } from '../send/markAsRead.js';
import { silentLogger } from '../utils/logger.js';

import type { WhatsAppClientConfig, WebhookServerOptions, Logger } from '../types/config.js';
import type {
  ButtonOption,
  DocumentOptions,
  FlowOptions,
  IncomingMessage,
  ListMessageOptions,
  LocationData,
  MediaReference,
  SendResult,
  TemplateComponent,
} from '../types/messages.js';
import type { WhatsAppClientEvents, StatusEvent } from '../types/events.js';
import type { StorageAdapter } from '../storage/StorageAdapter.js';

const DEFAULT_API_VERSION = 'v20.0';
const GRAPH_BASE_URL = 'https://graph.facebook.com';

export class WhatsAppClient {
  private readonly fetchClient: FetchClient;
  private readonly mediaClient: MediaClient;
  private readonly emitter: EventEmitter;
  private readonly logger: Logger;
  private readonly config: WhatsAppClientConfig;
  private readonly storage?: StorageAdapter;

  constructor(config: WhatsAppClientConfig) {
    this.config = config;
    this.logger = config.logger ?? silentLogger;
    this.storage = config.storage;
    this.emitter = new EventEmitter();

    const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
    const baseUrl = `${GRAPH_BASE_URL}/${apiVersion}/${config.phoneNumberId}`;

    this.fetchClient = new FetchClient({
      baseUrl,
      accessToken: config.accessToken,
      timeoutMs: config.timeoutMs,
      retry: config.retry,
      logger: this.logger,
    });

    this.mediaClient = new MediaClient({
      fetchClient: this.fetchClient,
      graphBaseUrl: `${GRAPH_BASE_URL}/${apiVersion}`,
      accessToken: config.accessToken,
    });
  }

  // ─── Event methods ────────────────────────────────────────────────

  /** Register an event listener. */
  on<K extends keyof WhatsAppClientEvents>(
    event: K,
    listener: WhatsAppClientEvents[K],
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Register a one-time event listener. */
  once<K extends keyof WhatsAppClientEvents>(
    event: K,
    listener: WhatsAppClientEvents[K],
  ): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Remove an event listener. */
  off<K extends keyof WhatsAppClientEvents>(
    event: K,
    listener: WhatsAppClientEvents[K],
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Remove all listeners for an event (or all events). */
  removeAllListeners(event?: keyof WhatsAppClientEvents): this {
    this.emitter.removeAllListeners(event);
    return this;
  }

  // ─── Send methods ─────────────────────────────────────────────────

  /** Send a text message. Returns the wamid. */
  async sendText(
    to: string,
    text: string,
    options?: { previewUrl?: boolean; replyTo?: string },
  ): Promise<SendResult> {
    return sendText(this.fetchClient, to, text, options);
  }

  /** Send interactive reply buttons (max 3). Returns the wamid. */
  async sendButtons(
    to: string,
    body: string,
    buttons: ButtonOption[],
    options?: { header?: string; footer?: string; replyTo?: string },
  ): Promise<SendResult> {
    return sendButtons(this.fetchClient, to, body, buttons, options);
  }

  /** Send an interactive list message. Returns the wamid. */
  async sendList(
    to: string,
    options: ListMessageOptions,
    extra?: { replyTo?: string },
  ): Promise<SendResult> {
    return sendList(this.fetchClient, to, options, extra);
  }

  /** Send an image message. Returns the wamid. */
  async sendImage(
    to: string,
    media: MediaReference,
    caption?: string,
    replyTo?: string,
  ): Promise<SendResult> {
    return sendImage(this.fetchClient, to, media, caption, replyTo);
  }

  /** Send a video message. Returns the wamid. */
  async sendVideo(
    to: string,
    media: MediaReference,
    caption?: string,
    replyTo?: string,
  ): Promise<SendResult> {
    return sendVideo(this.fetchClient, to, media, caption, replyTo);
  }

  /** Send an audio message. Returns the wamid. */
  async sendAudio(
    to: string,
    media: MediaReference,
    replyTo?: string,
  ): Promise<SendResult> {
    return sendAudio(this.fetchClient, to, media, replyTo);
  }

  /** Send a document message. Returns the wamid. */
  async sendDocument(
    to: string,
    media: MediaReference,
    options?: DocumentOptions,
    replyTo?: string,
  ): Promise<SendResult> {
    return sendDocument(this.fetchClient, to, media, options, replyTo);
  }

  /** Send a sticker message. Returns the wamid. */
  async sendSticker(
    to: string,
    media: MediaReference,
    replyTo?: string,
  ): Promise<SendResult> {
    return sendSticker(this.fetchClient, to, media, replyTo);
  }

  /** Send a location pin. Returns the wamid. */
  async sendLocation(
    to: string,
    location: LocationData,
    replyTo?: string,
  ): Promise<SendResult> {
    return sendLocation(this.fetchClient, to, location, replyTo);
  }

  /** Request the user's location. Returns the wamid. */
  async requestLocation(
    to: string,
    body: string,
    replyTo?: string,
  ): Promise<SendResult> {
    return requestLocation(this.fetchClient, to, body, replyTo);
  }

  /** Send a template message. Returns the wamid. */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: TemplateComponent[],
    replyTo?: string,
  ): Promise<SendResult> {
    return sendTemplate(this.fetchClient, to, templateName, languageCode, components, replyTo);
  }

  /** React to a message with an emoji. */
  async sendReaction(to: string, messageId: string, emoji: string): Promise<void> {
    return sendReaction(this.fetchClient, to, messageId, emoji);
  }

  /** Remove a reaction from a message. */
  async removeReaction(to: string, messageId: string): Promise<void> {
    return removeReaction(this.fetchClient, to, messageId);
  }

  /** Mark a message as read (blue checkmarks). */
  async markAsRead(messageId: string): Promise<void> {
    return markAsRead(this.fetchClient, messageId);
  }

  /** Send a WhatsApp Flow. Returns the wamid. */
  async sendFlow(
    to: string,
    options: FlowOptions,
    replyTo?: string,
  ): Promise<SendResult> {
    return sendFlow(this.fetchClient, to, options, replyTo);
  }

  // ─── Media methods ────────────────────────────────────────────────

  /**
   * Upload a media file and get a reusable media ID.
   *
   * @param data - File data as a Buffer.
   * @param mimeType - MIME type of the file.
   * @param filename - Optional filename.
   * @returns The media ID.
   */
  async uploadMedia(data: Buffer, mimeType: string, filename?: string): Promise<string> {
    return this.mediaClient.uploadMedia(data, mimeType, filename);
  }

  /**
   * Download a media file by its ID.
   *
   * @param mediaId - The media ID from a webhook message.
   * @returns The file data as a Buffer.
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    return this.mediaClient.downloadMedia(mediaId);
  }

  // ─── Webhook handling ─────────────────────────────────────────────

  /**
   * Process a raw webhook body. Parses messages and statuses, emits events.
   * Call this from your own server or middleware.
   *
   * @param body - The parsed JSON body from the webhook POST.
   */
  processWebhook(body: unknown): void {
    try {
      const parsed = parseWebhookBody(body);

      for (const rawMsg of parsed.messages) {
        // Bind helper methods to this client
        const msg: IncomingMessage = {
          ...rawMsg,
          reply: (text: string) => this.sendText(rawMsg.from, text, { replyTo: rawMsg.id }),
          react: (emoji: string) => this.sendReaction(rawMsg.from, rawMsg.id, emoji),
          markRead: () => this.markAsRead(rawMsg.id),
          downloadMedia: () => {
            const mediaId = this.getMediaId(rawMsg);
            if (!mediaId) {
              return Promise.reject(new Error(`No media to download for message type '${rawMsg.type}'`));
            }
            return this.downloadMedia(mediaId);
          },
        };

        // Emit both the generic and type-specific events
        this.emitter.emit('message', msg);
        this.emitter.emit(`message:${msg.type}`, msg);
      }

      for (const status of parsed.statuses) {
        this.emitter.emit('status', status);
      }
    } catch (err) {
      this.logger.error('[WhatsApp] Error processing webhook:', err);
      this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Parse a webhook body without emitting events.
   * Useful for framework-agnostic manual processing.
   *
   * @param body - The parsed JSON body.
   * @param signature - The x-hub-signature-256 header value.
   * @returns Parsed messages (with client helpers bound).
   */
  parseWebhook(body: unknown, signature?: string): IncomingMessage[] {
    if (signature && this.config.appSecret) {
      const { verifyPayloadSignature } = require('../utils/verifySignature.js');
      const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
      if (!verifyPayloadSignature(rawBody, signature, this.config.appSecret)) {
        throw new Error('Invalid webhook signature');
      }
    }

    const parsed = parseWebhookBody(body);
    return parsed.messages.map((rawMsg) => ({
      ...rawMsg,
      reply: (text: string) => this.sendText(rawMsg.from, text, { replyTo: rawMsg.id }),
      react: (emoji: string) => this.sendReaction(rawMsg.from, rawMsg.id, emoji),
      markRead: () => this.markAsRead(rawMsg.id),
      downloadMedia: () => {
        const mediaId = this.getMediaId(rawMsg);
        if (!mediaId) {
          return Promise.reject(new Error(`No media to download for message type '${rawMsg.type}'`));
        }
        return this.downloadMedia(mediaId);
      },
    }));
  }

  /**
   * Create Express middleware for the webhook.
   * Returns an object with handleGet, handlePost, and mount methods.
   */
  webhookMiddleware() {
    const { createWebhookMiddleware } = require('../receive/webhookMiddleware.js');
    return createWebhookMiddleware({
      verifyToken: this.config.webhookVerifyToken,
      appSecret: this.config.appSecret,
      onBody: (body: unknown) => this.processWebhook(body),
    });
  }

  /**
   * Start a standalone Express webhook server.
   * Express must be installed as a dependency in your project.
   *
   * @param options - Server configuration.
   * @returns The HTTP server instance.
   */
  async startWebhookServer(options?: WebhookServerOptions): Promise<Server> {
    const { startWebhookServer: start } = await import('../receive/webhookServer.js');
    return start({
      ...options,
      verifyToken: this.config.webhookVerifyToken,
      appSecret: this.config.appSecret,
      onBody: (body: unknown) => this.processWebhook(body),
    });
  }

  // ─── Internal helpers ─────────────────────────────────────────────

  /** Extract media ID from a parsed message, if it's a media type. */
  private getMediaId(
    msg: Omit<IncomingMessage, 'reply' | 'react' | 'markRead' | 'downloadMedia'>,
  ): string | null {
    if (msg.image) return msg.image.id;
    if (msg.audio) return msg.audio.id;
    if (msg.video) return msg.video.id;
    if (msg.document) return msg.document.id;
    if (msg.sticker) return msg.sticker.id;
    return null;
  }

  /** Expose the internal FetchClient for testing/advanced use. */
  get _fetchClient(): FetchClient {
    return this.fetchClient;
  }

  /** Expose the internal MediaClient for testing/advanced use. */
  get _mediaClient(): MediaClient {
    return this.mediaClient;
  }
}
