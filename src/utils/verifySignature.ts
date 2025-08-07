import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { APP_SECRET } from '../config/metaConfig';

export function verifySignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) return res.status(401).send('Missing signature');

  const expected = 'sha256=' + crypto
    .createHmac('sha256', APP_SECRET)
    .update((req as any).rawBody) // importante: cuerpo crudo
    .digest('hex');

  if (expected !== signature) {
    return res.status(401).send('Invalid signature');
  }
  next();
}