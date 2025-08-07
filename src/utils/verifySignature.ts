import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { WEBHOOK_SECRET } from '../config/metaConfig';

export function verifySignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-hub-signature-256'] as string;
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');
  if (`sha256=${hash}` !== signature) {
    return res.status(401).send('Invalid signature');
  }
  next();
}