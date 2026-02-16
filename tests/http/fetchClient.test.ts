import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../../src/http/fetchClient';
import { WhatsAppError } from '../../src/errors/WhatsAppError';

describe('FetchClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(response: {
    ok: boolean;
    status: number;
    headers?: Record<string, string>;
    json?: () => Promise<unknown>;
  }) {
    const headers = new Headers(response.headers ?? {});
    const fn = vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      headers,
      json: response.json ?? (() => Promise.resolve({})),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    globalThis.fetch = fn;
    return fn;
  }

  function createClient(overrides?: Record<string, unknown>) {
    return new FetchClient({
      baseUrl: 'https://graph.facebook.com/v20.0/12345',
      accessToken: 'test-token',
      timeoutMs: 5000,
      retry: { maxRetries: 0 }, // Disable retries by default for simpler tests
      ...overrides,
    });
  }

  describe('postJson', () => {
    it('should POST JSON and return parsed response', async () => {
      const mockResponse = {
        messaging_product: 'whatsapp',
        messages: [{ id: 'wamid.123' }],
      };

      const fetchMock = mockFetch({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient();
      const result = await client.postJson('/messages', { type: 'text' });

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledOnce();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://graph.facebook.com/v20.0/12345/messages');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer test-token');
      expect(init.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('error handling', () => {
    it('should throw WhatsAppError on 400', async () => {
      mockFetch({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: { message: 'Invalid parameter', code: 100, type: 'OAuthException' },
        }),
      });

      const client = createClient();
      await expect(client.postJson('/messages', {})).rejects.toThrow(WhatsAppError);

      try {
        await client.postJson('/messages', {});
      } catch (err) {
        expect(err).toBeInstanceOf(WhatsAppError);
        const waErr = err as WhatsAppError;
        expect(waErr.statusCode).toBe(400);
        expect(waErr.errorCode).toBe('100');
        expect(waErr.isRetryable).toBe(false);
      }
    });

    it('should throw WhatsAppError on 429 (no retries)', async () => {
      mockFetch({
        ok: false,
        status: 429,
        headers: { 'retry-after': '30' },
        json: () => Promise.resolve({ error: { message: 'Rate limited', code: 4 } }),
      });

      const client = createClient();

      try {
        await client.postJson('/messages', {});
        expect.fail('Should have thrown');
      } catch (err) {
        const waErr = err as WhatsAppError;
        expect(waErr.statusCode).toBe(429);
        expect(waErr.isRetryable).toBe(true);
        expect(waErr.retryAfter).toBe(30);
      }
    });
  });

  describe('retry logic', () => {
    it('should retry on 500 and succeed', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 500,
            headers: new Headers(),
            json: () => Promise.resolve({ error: { message: 'Internal', code: 1 } }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ messages: [{ id: 'wamid.retry_success' }] }),
        };
      });

      const client = new FetchClient({
        baseUrl: 'https://graph.facebook.com/v20.0/12345',
        accessToken: 'test-token',
        retry: { maxRetries: 1, baseDelayMs: 10 }, // Fast retry for tests
      });

      const result = await client.postJson<{ messages: Array<{ id: string }> }>('/messages', {});
      expect(result.messages[0].id).toBe('wamid.retry_success');
      expect(callCount).toBe(2);
    });

    it('should NOT retry on 400', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          ok: false,
          status: 400,
          headers: new Headers(),
          json: () => Promise.resolve({ error: { message: 'Bad request', code: 100 } }),
        };
      });

      const client = new FetchClient({
        baseUrl: 'https://graph.facebook.com/v20.0/12345',
        accessToken: 'test-token',
        retry: { maxRetries: 3, baseDelayMs: 10 },
      });

      await expect(client.postJson('/messages', {})).rejects.toThrow(WhatsAppError);
      expect(callCount).toBe(1); // No retries
    });
  });

  describe('get', () => {
    it('should make a GET request', async () => {
      const fetchMock = mockFetch({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ url: 'https://media.example.com' }),
      });

      const client = createClient();
      const result = await client.get<{ url: string }>('/media-id');

      expect(result.url).toBe('https://media.example.com');
      const [, init] = fetchMock.mock.calls[0];
      expect(init.method).toBe('GET');
    });
  });
});
