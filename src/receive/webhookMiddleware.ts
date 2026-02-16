/**
 * Express middleware for handling WhatsApp webhook requests.
 * Framework-agnostic: exports a function that returns Express route handlers.
 */

import type { Request, Response, Router } from 'express';
import { verifyPayloadSignature } from '../utils/verifySignature.js';

/** Options for creating webhook middleware. */
export interface WebhookMiddlewareOptions {
  /** Webhook verification token (for GET verification requests). */
  verifyToken?: string;
  /** App secret for payload signature verification. */
  appSecret?: string;
  /** Allow unsigned payloads (for development only!). */
  allowUnsigned?: boolean;
  /** Callback invoked with the raw body on each valid POST. */
  onBody: (body: unknown) => void;
}

/**
 * Create Express middleware that handles both GET (verification) and POST (events)
 * webhook requests from Meta.
 *
 * @param options - Configuration for the middleware.
 * @returns An Express Router-compatible handler.
 *
 * @example
 * ```ts
 * import express from 'express';
 * const app = express();
 * app.use('/webhook', createWebhookMiddleware({
 *   verifyToken: 'my-token',
 *   appSecret: 'my-secret',
 *   onBody: (body) => client.processWebhook(body),
 * }));
 * ```
 */
export function createWebhookMiddleware(options: WebhookMiddlewareOptions) {
  return {
    /** Handle GET verification requests from Meta. */
    handleGet(req: Request, res: Response): void {
      const mode = req.query['hub.mode'] as string | undefined;
      const token = req.query['hub.verify_token'] as string | undefined;
      const challenge = req.query['hub.challenge'] as string | undefined;

      if (mode === 'subscribe' && token === options.verifyToken) {
        res.status(200).send(challenge ?? '');
      } else {
        res.status(403).send('Forbidden');
      }
    },

    /** Handle POST webhook events from Meta. */
    handlePost(req: Request, res: Response): void {
      // Always respond 200 quickly — Meta will retry otherwise
      res.status(200).send('OK');

      // Verify signature if appSecret is configured
      if (options.appSecret && !options.allowUnsigned) {
        const signature = req.headers['x-hub-signature-256'] as string | undefined;
        const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

        if (!signature || !rawBody) {
          return; // Silently ignore — already sent 200
        }

        if (!verifyPayloadSignature(rawBody, signature, options.appSecret)) {
          return; // Invalid signature — ignore
        }
      }

      try {
        options.onBody(req.body);
      } catch {
        // Error handling is done via client.on('error')
      }
    },

    /**
     * Mount on an Express router.
     *
     * @param router - Express Router or app.
     * @param path - Route path (default: '/webhook').
     */
    mount(router: Router, routePath = '/webhook'): void {
      router.get(routePath, this.handleGet.bind(this));
      router.post(routePath, this.handlePost.bind(this));
    },
  };
}
