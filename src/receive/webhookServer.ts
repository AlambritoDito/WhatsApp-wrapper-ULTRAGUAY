// src/receive/webhookServer.ts
import bodyParser from 'body-parser';
import express from 'express';

import { verifySignature, createSignatureVerifier } from '../utils/verifySignature';

import { parseIncoming, type InboundMessage } from './parseIncoming';

type Handler = (msg: InboundMessage) => Promise<void> | void;

export interface WebhookServerOptions {
  allowUnsignedTests?: boolean;
  webhookSecret?: string;
  appSecret?: string;
}

export function startWebhookServer(
  port: number,
  onMessage?: Handler,
  opts?: WebhookServerOptions
) {
  const app = express();
  const allowUnsigned = opts?.allowUnsignedTests ?? (process.env.ALLOW_UNSIGNED_TESTS === 'true');
  const webhookSecret = opts?.webhookSecret ?? process.env.WEBHOOK_SECRET;
  const appSecret = opts?.appSecret ?? process.env.APP_SECRET;

  if (!webhookSecret) {
    console.warn('⚠️  No WEBHOOK_SECRET provided. GET verification will fail.');
  }
  if (!appSecret) {
    console.warn('⚠️  No APP_SECRET provided. POST signature verification might fail or be insecure.');
  }

  app.use(bodyParser.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; }
  }));

  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.get('/health', (_req, res) => res.send('ok'));

  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === webhookSecret) {
      console.log('✅ GET /webhook verified');
      return res.status(200).send(challenge as string);
    }
    console.warn('❌ GET /webhook verification failed');
    return res.sendStatus(403);
  });

  const baseHandler = async (req: express.Request, res: express.Response) => {
    try {
      console.log('Incoming JSON:', JSON.stringify(req.body, null, 2));
      const parsed = parseIncoming(req.body);
      console.log('Parsed:', parsed);
      if (onMessage) {
        for (const msg of parsed) await onMessage(msg);
      }
      res.sendStatus(200);
    } catch (e: any) {
      console.error('Handler error:', e.message ?? e);
      res.sendStatus(500);
    }
  };

  app.post('/webhook', (req, res, next) => {
    const hasSig = Boolean(req.headers['x-hub-signature-256']);
    if (!hasSig && allowUnsigned) {
      console.warn('⚠️  No signature header; allowed due to ALLOW_UNSIGNED_TESTS');
      return baseHandler(req, res);
    }

    // Use the configured appSecret or fallback to the global one (which might be undefined if not set)
    // If appSecret is missing, verifyPayloadSignature will likely fail or throw if we don't handle it.
    // But createSignatureVerifier expects a string.

    if (!appSecret) {
      console.error('❌ Cannot verify signature: No APP_SECRET provided.');
      return res.status(500).send('Server configuration error');
    }

    const verifier = createSignatureVerifier(appSecret);
    verifier(req, res, (err?: any) => {
      if (err) return; // Should not happen with standard express next() unless we pass error
      return baseHandler(req, res);
    });
  });

  app.listen(port, () => console.log(`Webhook listening on ${port}`));
}
