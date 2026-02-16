import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaClient } from '../../src/media/MediaClient';
import { FetchClient } from '../../src/http/fetchClient';
import { WhatsAppError } from '../../src/errors/WhatsAppError';

describe('MediaClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createMediaClient() {
    const fetchClient = new FetchClient({
      baseUrl: 'https://graph.facebook.com/v20.0/12345',
      accessToken: 'test-token',
      retry: { maxRetries: 0 },
    });

    const mediaClient = new MediaClient({
      fetchClient,
      graphBaseUrl: 'https://graph.facebook.com/v20.0',
      accessToken: 'test-token',
    });

    return { fetchClient, mediaClient };
  }

  describe('getMediaMetadata', () => {
    it('should fetch media metadata by ID', async () => {
      const metadata = {
        id: 'media-123',
        url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/...',
        mime_type: 'image/jpeg',
        sha256: 'abc123',
        file_size: 12345,
        messaging_product: 'whatsapp',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(metadata),
      });

      const { mediaClient } = createMediaClient();
      const result = await mediaClient.getMediaMetadata('media-123');

      expect(result).toEqual(metadata);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v20.0/media-123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        }),
      );
    });

    it('should throw WhatsAppError on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { mediaClient } = createMediaClient();

      await expect(mediaClient.getMediaMetadata('bad-id')).rejects.toThrow(WhatsAppError);
    });
  });

  describe('downloadMedia', () => {
    it('should download media in two steps (metadata then binary)', async () => {
      const mediaData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: metadata
          return {
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                id: 'media-123',
                url: 'https://lookaside.fbsbx.com/download/media-123',
                mime_type: 'image/png',
                sha256: 'def456',
                file_size: 4,
                messaging_product: 'whatsapp',
              }),
          };
        }
        // Second call: binary download
        return {
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(mediaData.buffer),
        };
      });

      const { mediaClient } = createMediaClient();
      const buffer = await mediaClient.downloadMedia('media-123');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(4);
      expect(callCount).toBe(2);
    });

    it('should throw on failed binary download', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('media-123') && !url.includes('download')) {
          return {
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                id: 'media-123',
                url: 'https://lookaside.fbsbx.com/download/media-123',
                mime_type: 'image/png',
                sha256: 'def456',
                file_size: 4,
                messaging_product: 'whatsapp',
              }),
          };
        }
        return { ok: false, status: 500 };
      });

      const { mediaClient } = createMediaClient();
      await expect(mediaClient.downloadMedia('media-123')).rejects.toThrow(WhatsAppError);
    });
  });

  describe('uploadMedia', () => {
    it('should upload media and return the ID', async () => {
      const fetchClient = new FetchClient({
        baseUrl: 'https://graph.facebook.com/v20.0/12345',
        accessToken: 'test-token',
        retry: { maxRetries: 0 },
      });

      // Mock the postForm method
      fetchClient.postForm = vi.fn().mockResolvedValue({ id: 'uploaded-media-456' });

      const mediaClient = new MediaClient({
        fetchClient,
        graphBaseUrl: 'https://graph.facebook.com/v20.0',
        accessToken: 'test-token',
      });

      const data = Buffer.from('fake image data');
      const mediaId = await mediaClient.uploadMedia(data, 'image/png', 'photo.png');

      expect(mediaId).toBe('uploaded-media-456');
      expect(fetchClient.postForm).toHaveBeenCalledWith('/media', expect.any(FormData));
    });

    it('should upload without explicit filename', async () => {
      const fetchClient = new FetchClient({
        baseUrl: 'https://graph.facebook.com/v20.0/12345',
        accessToken: 'test-token',
        retry: { maxRetries: 0 },
      });

      fetchClient.postForm = vi.fn().mockResolvedValue({ id: 'uploaded-media-789' });

      const mediaClient = new MediaClient({
        fetchClient,
        graphBaseUrl: 'https://graph.facebook.com/v20.0',
        accessToken: 'test-token',
      });

      const data = Buffer.from('audio data');
      const mediaId = await mediaClient.uploadMedia(data, 'audio/ogg');

      expect(mediaId).toBe('uploaded-media-789');

      // Check the FormData was constructed correctly
      const formData = (fetchClient.postForm as ReturnType<typeof vi.fn>).mock.calls[0][1] as FormData;
      expect(formData.get('type')).toBe('audio/ogg');
      expect(formData.get('messaging_product')).toBe('whatsapp');
    });
  });
});
