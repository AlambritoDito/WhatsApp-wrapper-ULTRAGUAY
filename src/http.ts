/**
 * Internal HTTP transport built on native `fetch` with automatic retry,
 * exponential back‑off with jitter, and configurable timeout.
 *
 * @module http
 * @internal
 */

import { WhatsAppError } from './errors';
import type { HttpOptions } from './types';

/** Default configuration values. */
const DEFAULTS: Required<HttpOptions> = {
  timeoutMs: 30_000,
  maxRetries: 3,
  backoffMs: 1_000,
};

/** @internal */
export interface HttpClient {
  request<T = unknown>(url: string, init: RequestInit): Promise<T>;
  requestRaw(url: string, init: RequestInit): Promise<Response>;
}

/**
 * Create a configured HTTP client that wraps native `fetch`.
 *
 * - Retries only on 429 (rate‑limit) and 5xx responses.
 * - Uses exponential back‑off with ±25 % jitter.
 * - Uses `AbortController` for timeout enforcement.
 *
 * @internal
 */
export function createHttpClient(
  accessToken: string,
  opts?: HttpOptions,
): HttpClient {
  const cfg = { ...DEFAULTS, ...opts };

  async function requestRaw(url: string, init: RequestInit): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

      // Merge caller headers with auth header.
      const headers = new Headers(init.headers);
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      try {
        const res = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal,
        });

        // Non‑retryable success or client error → return immediately.
        if (res.ok || (res.status < 500 && res.status !== 429)) {
          return res;
        }

        // Retryable status — capture for potential rethrow.
        const body = await res.text().catch(() => '');
        const retryAfter = res.headers.get('retry-after');
        lastError = new WhatsAppError(
          `WhatsApp API error ${res.status}`,
          res.status,
          tryParseJson(body),
          retryAfter ? Number(retryAfter) : undefined,
        );

        // If we still have retries left, wait and continue.
        if (attempt < cfg.maxRetries) {
          const delay = computeBackoff(cfg.backoffMs, attempt, retryAfter);
          await sleep(delay);
          continue;
        }
      } catch (err: unknown) {
        if (err instanceof WhatsAppError) {
          lastError = err;
        } else if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new WhatsAppError('Request timed out', 0);
        } else {
          lastError = new WhatsAppError(
            err instanceof Error ? err.message : 'Unknown fetch error',
            0,
          );
        }
        if (attempt < cfg.maxRetries) {
          await sleep(computeBackoff(cfg.backoffMs, attempt));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new WhatsAppError('Request failed', 0);
  }

  async function request<T = unknown>(url: string, init: RequestInit): Promise<T> {
    const res = await requestRaw(url, init);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const retryAfter = res.headers.get('retry-after');
      throw new WhatsAppError(
        `WhatsApp API error ${res.status}`,
        res.status,
        tryParseJson(body),
        retryAfter ? Number(retryAfter) : undefined,
      );
    }

    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  return { request, requestRaw };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeBackoff(baseMs: number, attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1_000;
  }
  const exp = baseMs * 2 ** attempt;
  const jitter = exp * (0.75 + Math.random() * 0.5); // ±25 %
  return Math.min(jitter, 60_000); // cap at 60 s
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text || undefined;
  }
}
