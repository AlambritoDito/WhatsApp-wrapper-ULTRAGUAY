import { describe, it, expect } from 'vitest';
import { WhatsAppError } from '../../src/errors/WhatsAppError';

describe('WhatsAppError', () => {
  it('should create an error with all properties', () => {
    const err = new WhatsAppError('Rate limited', 429, '131056', { detail: 'too many' }, 30);
    expect(err.message).toBe('Rate limited');
    expect(err.statusCode).toBe(429);
    expect(err.errorCode).toBe('131056');
    expect(err.details).toEqual({ detail: 'too many' });
    expect(err.retryAfter).toBe(30);
    expect(err.name).toBe('WhatsAppError');
  });

  it('should default errorCode to UNKNOWN', () => {
    const err = new WhatsAppError('Oops', 500);
    expect(err.errorCode).toBe('UNKNOWN');
  });

  it('should be retryable for 429', () => {
    const err = new WhatsAppError('Rate limited', 429);
    expect(err.isRetryable).toBe(true);
  });

  it('should be retryable for 500', () => {
    const err = new WhatsAppError('Server error', 500);
    expect(err.isRetryable).toBe(true);
  });

  it('should be retryable for 502', () => {
    const err = new WhatsAppError('Bad gateway', 502);
    expect(err.isRetryable).toBe(true);
  });

  it('should NOT be retryable for 400', () => {
    const err = new WhatsAppError('Bad request', 400);
    expect(err.isRetryable).toBe(false);
  });

  it('should NOT be retryable for 401', () => {
    const err = new WhatsAppError('Unauthorized', 401);
    expect(err.isRetryable).toBe(false);
  });

  it('should be an instance of Error', () => {
    const err = new WhatsAppError('Test', 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WhatsAppError);
  });
});
