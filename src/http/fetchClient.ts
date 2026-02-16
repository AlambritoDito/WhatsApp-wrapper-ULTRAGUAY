/**
 * Native fetch HTTP client with retry logic for the WhatsApp Cloud API.
 *
 * - Retries only on 429 (rate limit) and 5xx (server errors)
 * - Exponential backoff with jitter
 * - Respects Retry-After header
 * - Configurable timeout via AbortController
 * - No Axios dependency
 */

import { WhatsAppError } from '../errors/WhatsAppError.js';
import type { Logger, RetryConfig } from '../types/config.js';
import type { ApiErrorResponse } from '../types/responses.js';

/** Options for creating a FetchClient. */
export interface FetchClientOptions {
  /** Base URL for all requests (e.g., 'https://graph.facebook.com/v20.0/PHONE_ID'). */
  baseUrl: string;
  /** Bearer access token. */
  accessToken: string;
  /** Request timeout in ms (default: 30000). */
  timeoutMs?: number;
  /** Retry configuration. */
  retry?: RetryConfig;
  /** Logger instance. */
  logger?: Logger;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1_000;
const DEFAULT_MAX_DELAY_MS = 30_000;

/**
 * Lightweight HTTP client that wraps native fetch with retry and timeout.
 * Each WhatsAppClient instance creates its own FetchClient — no singletons.
 */
export class FetchClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly logger?: Logger;

  constructor(options: FetchClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.accessToken = options.accessToken;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.retry?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = options.retry?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.maxDelayMs = options.retry?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.logger = options.logger;
  }

  /** POST JSON to the API. Returns parsed response body. */
  async postJson<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /** POST form data to the API (for media uploads). */
  async postForm<T>(path: string, formData: FormData): Promise<T> {
    // FormData sets its own Content-Type with boundary
    return this.request<T>('POST', path, { body: formData });
  }

  /** GET from the API. Returns parsed response body. */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /** GET binary data (for media downloads). Returns Buffer. */
  async getBinary(url: string): Promise<Buffer> {
    // Media download URLs are absolute, not relative to baseUrl
    const response = await this.fetchWithRetry('GET', url, {
      isAbsolute: true,
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** Perform a request with retry logic. */
  private async request<T>(
    method: string,
    reqPath: string,
    init?: { headers?: Record<string, string>; body?: string | FormData },
  ): Promise<T> {
    const response = await this.fetchWithRetry(method, reqPath, init);
    const data = (await response.json()) as T;
    return data;
  }

  /** Core fetch with retry logic. */
  private async fetchWithRetry(
    method: string,
    pathOrUrl: string,
    init?: {
      headers?: Record<string, string>;
      body?: string | FormData;
      isAbsolute?: boolean;
    },
  ): Promise<Response> {
    const url = init?.isAbsolute
      ? pathOrUrl
      : `${this.baseUrl}${normalizePath(pathOrUrl)}`;
    let lastError: WhatsAppError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.calculateDelay(attempt, lastError?.retryAfter);
        this.logger?.debug(`[WhatsApp] Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms`);
        await sleep(delay);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            ...init?.headers,
          },
          body: init?.body,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          return response;
        }

        // Parse error response
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
        const isRetryable = response.status === 429 || response.status >= 500;

        let errorBody: unknown;
        let errorCode = 'UNKNOWN';
        let errorMessage = `HTTP ${response.status}`;

        try {
          errorBody = await response.json();
          const apiError = errorBody as ApiErrorResponse;
          if (apiError?.error) {
            errorCode = String(apiError.error.code ?? 'UNKNOWN');
            errorMessage = apiError.error.message ?? errorMessage;
          }
        } catch {
          // Could not parse error body — use defaults
        }

        lastError = new WhatsAppError(
          errorMessage,
          response.status,
          errorCode,
          errorBody,
          retryAfter,
        );

        if (!isRetryable || attempt === this.maxRetries) {
          throw lastError;
        }

        this.logger?.warn(
          `[WhatsApp] Retryable error ${response.status} on ${method} ${pathOrUrl}`,
        );
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof WhatsAppError) {
          throw err;
        }

        // Network/timeout errors
        const message =
          err instanceof Error && err.name === 'AbortError'
            ? `Request timeout after ${this.timeoutMs}ms`
            : `Network error: ${err instanceof Error ? err.message : String(err)}`;

        lastError = new WhatsAppError(message, 0, 'NETWORK_ERROR', undefined);

        if (attempt === this.maxRetries) {
          throw lastError;
        }

        this.logger?.warn(`[WhatsApp] Network error on ${method} ${pathOrUrl}: ${message}`);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new WhatsAppError('Unknown error', 0, 'UNKNOWN');
  }

  /** Calculate delay with exponential backoff and jitter. */
  private calculateDelay(attempt: number, retryAfterSeconds?: number): number {
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }
    const exponential = this.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * this.baseDelayMs;
    return Math.min(exponential + jitter, this.maxDelayMs);
  }
}

/** Ensure path starts with '/'. */
function normalizePath(p: string): string {
  return p.startsWith('/') ? p : `/${p}`;
}

/** Parse Retry-After header (seconds or HTTP date). */
function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (!isNaN(seconds)) return seconds;
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    const diff = (date.getTime() - Date.now()) / 1000;
    return diff > 0 ? diff : undefined;
  }
  return undefined;
}

/** Sleep for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
