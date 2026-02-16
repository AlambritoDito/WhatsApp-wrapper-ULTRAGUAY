/**
 * Webhook utilities subpath export.
 *
 * ```ts
 * import { parseIncoming, verifyWebhookSignature, createExpressMiddleware } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/webhook';
 * ```
 *
 * @module webhook
 */

import crypto from 'crypto';

import { parseIncoming, parseStatuses } from '../parse-incoming';
import type { WebhookPayload, InboundMessage, StatusUpdate } from '../types';

export { parseIncoming, parseStatuses } from '../parse-incoming';
export { verifyWebhookSignature } from '../client';

// Re‑export useful types.
export type { WebhookPayload, InboundMessage, StatusUpdate };

/**
 * Options for the Express webhook middleware helper.
 */
export interface ExpressMiddlewareOptions {
  /** Your Meta app secret for HMAC verification. */
  appSecret: string;
  /**
   * Called for every inbound message.
   * Errors thrown here are caught and forwarded to `onError`.
   */
  onMessage?: (msg: InboundMessage) => void | Promise<void>;
  /** Called for every status update. */
  onStatus?: (status: StatusUpdate) => void | Promise<void>;
  /** Called on errors (signature failures, parse errors, handler errors). */
  onError?: (err: Error) => void;
  /** The verify‑token string used during webhook registration (GET challenge). */
  verifyToken?: string;
}

/**
 * Create an Express‑compatible request handler for the webhook endpoint.
 *
 * Handles both the GET verification challenge and POST notification payloads.
 *
 * > **Note:** `express` is an optional peer dependency — this function returns
 * > generic `(req, res) => void` handlers that work with Express, Fastify's
 * > express compat layer, or any framework with the same signature.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createExpressMiddleware } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/webhook';
 *
 * const app = express();
 * app.use('/webhook', express.raw({ type: '*\/*' }), createExpressMiddleware({
 *   appSecret: process.env.APP_SECRET!,
 *   verifyToken: process.env.VERIFY_TOKEN!,
 *   onMessage: (msg) => console.log(msg),
 * }));
 * ```
 */
export function createExpressMiddleware(opts: ExpressMiddlewareOptions): (req: ExpressLikeRequest, res: ExpressLikeResponse) => void {
  return (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
    // GET — verification challenge
    if (req.method === 'GET') {
      const mode = getQuery(req, 'hub.mode');
      const token = getQuery(req, 'hub.verify_token');
      const challenge = getQuery(req, 'hub.challenge');
      if (mode === 'subscribe' && token === opts.verifyToken) {
        res.status(200).send(challenge);
      } else {
        res.status(403).send('Forbidden');
      }
      return;
    }

    // POST — notification
    try {
      const rawBody: Buffer | string = typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? req.body
        : JSON.stringify(req.body);

      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      if (signature) {
        const expected =
          'sha256=' + crypto.createHmac('sha256', opts.appSecret).update(rawBody).digest('hex');
        let valid = false;
        try {
          valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
        } catch { /* length mismatch → invalid */ }
        if (!valid) {
          opts.onError?.(new Error('Invalid webhook signature'));
          res.status(401).send('Invalid signature');
          return;
        }
      }

      const json: WebhookPayload = Buffer.isBuffer(rawBody) || typeof rawBody === 'string'
        ? JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'))
        : req.body as WebhookPayload;

      const messages = parseIncoming(json);
      const statuses = parseStatuses(json);

      for (const msg of messages) {
        Promise.resolve(opts.onMessage?.(msg)).catch((e: unknown) =>
          opts.onError?.(e instanceof Error ? e : new Error(String(e))),
        );
      }
      for (const s of statuses) {
        Promise.resolve(opts.onStatus?.(s)).catch((e: unknown) =>
          opts.onError?.(e instanceof Error ? e : new Error(String(e))),
        );
      }

      res.status(200).send('OK');
    } catch (err: unknown) {
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      res.status(500).send('Internal error');
    }
  };
}

// ---------------------------------------------------------------------------
// Minimal Express‑like types (so we don't depend on @types/express)
// ---------------------------------------------------------------------------

/** @internal */
export interface ExpressLikeRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/** @internal */
export interface ExpressLikeResponse {
  status(code: number): ExpressLikeResponse;
  send(body?: string): void;
}

function getQuery(req: ExpressLikeRequest, key: string): string | undefined {
  const val = req.query?.[key];
  return Array.isArray(val) ? val[0] : val;
}
