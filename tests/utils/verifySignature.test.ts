import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyPayloadSignature } from '../../src/utils/verifySignature';

describe('verifyPayloadSignature', () => {
  const appSecret = 'test-secret-123';
  const body = '{"test":"data"}';

  function makeSignature(payload: string, secret: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  it('should return true for a valid signature', () => {
    const signature = makeSignature(body, appSecret);
    expect(verifyPayloadSignature(body, signature, appSecret)).toBe(true);
  });

  it('should return true for a valid signature with Buffer body', () => {
    const buf = Buffer.from(body, 'utf8');
    const signature = makeSignature(body, appSecret);
    expect(verifyPayloadSignature(buf, signature, appSecret)).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    expect(verifyPayloadSignature(body, 'sha256=invalid', appSecret)).toBe(false);
  });

  it('should return false for a wrong secret', () => {
    const signature = makeSignature(body, 'wrong-secret');
    expect(verifyPayloadSignature(body, signature, appSecret)).toBe(false);
  });

  it('should return false for empty signature', () => {
    expect(verifyPayloadSignature(body, '', appSecret)).toBe(false);
  });

  it('should return false for empty appSecret', () => {
    const signature = makeSignature(body, appSecret);
    expect(verifyPayloadSignature(body, signature, '')).toBe(false);
  });

  it('should return false for mismatched length signatures', () => {
    expect(verifyPayloadSignature(body, 'sha256=short', appSecret)).toBe(false);
  });
});
