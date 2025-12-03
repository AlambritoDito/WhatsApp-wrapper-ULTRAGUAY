import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import { APP_SECRET } from '../config/metaConfig';

export function verifyPayloadSignature(rawBody: Buffer | string, signature: string, appSecret: string): boolean {
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return expected === signature;
}

export function createSignatureVerifier(appSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!signature) return res.status(401).send('Missing signature');

    const valid = verifyPayloadSignature((req as any).rawBody, signature, appSecret);
    if (!valid) {
      return res.status(401).send('Invalid signature');
    }
    next();
  };
}

export function verifySignature(req: Request, res: Response, next: NextFunction) {
  return createSignatureVerifier(APP_SECRET)(req, res, next);
}