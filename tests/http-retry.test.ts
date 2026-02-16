import { createHttpClient } from '../src/http';
import { WhatsAppError } from '../src/errors';

const originalFetch = globalThis.fetch;

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('HTTP client retry logic', () => {
  it('retries on 429 and succeeds', async () => {
    let attempt = 0;
    globalThis.fetch = jest.fn(async () => {
      attempt++;
      if (attempt < 3) {
        return {
          ok: false,
          status: 429,
          headers: new Headers({ 'retry-after': '0' }),
          text: async () => '{"error":"rate limit"}',
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => '{"result":"ok"}',
      } as Response;
    });

    const client = createHttpClient('token', { maxRetries: 3, backoffMs: 10 });
    const res = await client.request<{ result: string }>('https://example.com', { method: 'GET' });
    expect(res.result).toBe('ok');
    expect(attempt).toBe(3);
  });

  it('retries on 500 and eventually throws', async () => {
    globalThis.fetch = jest.fn(async () => {
      return {
        ok: false,
        status: 500,
        headers: new Headers(),
        text: async () => '{"error":"server error"}',
      } as Response;
    });

    const client = createHttpClient('token', { maxRetries: 2, backoffMs: 10 });
    await expect(client.request('https://example.com', { method: 'GET' })).rejects.toThrow(WhatsAppError);
    // 1 initial + 2 retries = 3 calls
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 400', async () => {
    globalThis.fetch = jest.fn(async () => {
      return {
        ok: false,
        status: 400,
        headers: new Headers(),
        text: async () => '{"error":"bad request"}',
      } as Response;
    });

    const client = createHttpClient('token', { maxRetries: 3, backoffMs: 10 });
    await expect(client.request('https://example.com', { method: 'GET' })).rejects.toThrow(WhatsAppError);
    // No retries on 4xx (except 429)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 401', async () => {
    globalThis.fetch = jest.fn(async () => {
      return {
        ok: false,
        status: 401,
        headers: new Headers(),
        text: async () => '{"error":"unauthorized"}',
      } as Response;
    });

    const client = createHttpClient('token', { maxRetries: 3, backoffMs: 10 });
    await expect(client.request('https://example.com', { method: 'GET' })).rejects.toThrow(WhatsAppError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('sets Authorization header', async () => {
    let capturedHeaders: Headers | undefined;
    globalThis.fetch = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Headers;
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => '{}',
      } as Response;
    });

    const client = createHttpClient('my-secret-token', { maxRetries: 0 });
    await client.request('https://example.com', { method: 'GET' });
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer my-secret-token');
  });

  it('handles timeout (AbortError)', async () => {
    globalThis.fetch = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      // Simulate abort
      const error = new DOMException('The operation was aborted', 'AbortError');
      throw error;
    });

    const client = createHttpClient('token', { maxRetries: 0, timeoutMs: 100 });
    await expect(client.request('https://example.com', { method: 'GET' })).rejects.toThrow('timed out');
  });
});
