/**
 * Configuration types for WhatsAppClient.
 */

import type { StorageAdapter } from '../storage/StorageAdapter.js';

/** Logger interface — anything with debug/info/warn/error methods. */
export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/** HTTP retry configuration. */
export interface RetryConfig {
  /** Maximum number of retries (default: 3). */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000). */
  baseDelayMs?: number;
  /** Maximum delay in ms (default: 30000). */
  maxDelayMs?: number;
}

/** Configuration for the WhatsApp client. */
export interface WhatsAppClientConfig {
  /** Meta access token for the WhatsApp Cloud API. */
  accessToken: string;
  /** Phone number ID associated with the WhatsApp Business account. */
  phoneNumberId: string;
  /** App secret for webhook signature verification (optional but recommended). */
  appSecret?: string;
  /** Webhook verification token for GET requests (optional). */
  webhookVerifyToken?: string;
  /** Graph API version to use (default: 'v20.0'). */
  apiVersion?: string;
  /** Storage adapter for media files (optional). */
  storage?: StorageAdapter;
  /** Logger instance (default: silent). */
  logger?: Logger;
  /** Request timeout in milliseconds (default: 30000). */
  timeoutMs?: number;
  /** Retry configuration for failed requests. */
  retry?: RetryConfig;
}

/** Options for the standalone webhook server. */
export interface WebhookServerOptions {
  /** Port to listen on (default: 3000). */
  port?: number;
  /** Path for the webhook endpoint (default: '/webhook'). */
  path?: string;
  /** Whether to allow unsigned webhook payloads in development (default: false). */
  allowUnsigned?: boolean;
}
