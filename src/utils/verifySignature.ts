/**
 * HMAC-SHA256 signature verification for WhatsApp webhook payloads.
 */

import crypto from 'crypto';

/**
 * Verify a webhook payload signature against an app secret.
 *
 * @param rawBody - The raw request body as a Buffer or string.
 * @param signature - The `x-hub-signature-256` header value (e.g., 'sha256=abc123...').
 * @param appSecret - The Meta app secret used to compute the expected signature.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyPayloadSignature(
  rawBody: Buffer | string,
  signature: string,
  appSecret: string,
): boolean {
  if (!signature || !appSecret) {
    return false;
  }

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(signature, 'utf8'),
  );
}
