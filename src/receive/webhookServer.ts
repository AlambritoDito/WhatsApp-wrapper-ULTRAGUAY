/**
 * Standalone Express webhook server for WhatsApp.
 * Creates its own Express app — use webhookMiddleware instead if you already have a server.
 */

import type { Server } from 'http';
import type { WebhookServerOptions } from '../types/config.js';

/** Options for the webhook server factory. */
export interface WebhookServerFactoryOptions extends WebhookServerOptions {
  /** Webhook verification token. */
  verifyToken?: string;
  /** App secret for signature verification. */
  appSecret?: string;
  /** Callback invoked with the raw body on each valid POST. */
  onBody: (body: unknown) => void;
}

/**
 * Start a standalone Express webhook server.
 * Express is dynamically imported to keep it as an optional dependency.
 *
 * @param options - Server configuration.
 * @returns A promise that resolves to the HTTP server.
 */
export async function startWebhookServer(
  options: WebhookServerFactoryOptions,
): Promise<Server> {
  // Dynamic import so express is optional
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let express: { (): unknown; json: (opts: unknown) => unknown };
  try {
    // Using require for express since its type definitions are complex
    express = require('express');
  } catch {
    throw new Error(
      'Express is required for startWebhookServer(). Install it with: npm install express',
    );
  }

  const { createWebhookMiddleware } = await import('./webhookMiddleware.js');

  const app = express() as {
    use: (...args: unknown[]) => void;
    get: (path: string, handler: (req: unknown, res: { status: (n: number) => { json: (o: unknown) => void; send: (s: string) => void } }) => void) => void;
    listen: (port: number, cb: () => void) => Server;
  };

  const webhookPath = options.path ?? '/webhook';
  const port = options.port ?? 3000;

  // Raw body capture for signature verification
  app.use(
    webhookPath,
    express.json({
      verify: (req: unknown, _res: unknown, buf: Buffer) => {
        (req as Record<string, unknown>).rawBody = buf;
      },
    }),
  );

  // Mount webhook handlers
  const middleware = createWebhookMiddleware({
    verifyToken: options.verifyToken,
    appSecret: options.appSecret,
    allowUnsigned: options.allowUnsigned,
    onBody: options.onBody,
  });

  // Manually bind GET and POST since we avoid importing Express types
  app.get(webhookPath, (req, res) => {
    middleware.handleGet(req as never, res as never);
  });

  app.use(webhookPath, (req: unknown, res: unknown, _next: unknown) => {
    // POST handler
    const method = (req as Record<string, string>).method;
    if (method === 'POST') {
      middleware.handlePost(req as never, res as never);
    }
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
  });
}
