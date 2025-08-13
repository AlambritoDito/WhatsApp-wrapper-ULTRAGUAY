import axios, { AxiosInstance } from 'axios';
import { setupRetryInterceptor } from '../http/retryInterceptor';
import { WhatsAppError } from '../errors/WhatsAppError';

export class MediaClient {
  private readonly client: AxiosInstance;
  constructor(private readonly opts: { accessToken: string; http?: { timeoutMs?: number; retry?: { retries: number; backoffMs: number } } }) {
    this.client = axios.create({
      baseURL: 'https://graph.facebook.com/v20.0',
      headers: { Authorization: `Bearer ${opts.accessToken}` },
      timeout: opts.http?.timeoutMs,
    });
    if (opts.http?.retry) {
      setupRetryInterceptor(this.client, { retries: opts.http.retry.retries, retryDelay: opts.http.retry.backoffMs });
    }
  }

  async getMediaMetadata(mediaId: string): Promise<{ url: string; mimeType: string }> {
    try {
      const r = await this.client.get(`/${mediaId}`);
      const url = r.data?.url;
      const mimeType = r.data?.mime_type ?? 'image/jpeg';
      if (!url) throw new WhatsAppError('Missing media url', r.status, r.data);
      return { url, mimeType };
    } catch (err: any) {
      const status = err.response?.status ?? 0;
      const retryAfter = err.response?.headers?.['retry-after'];
      throw new WhatsAppError('Failed to get media metadata', status, err.response?.data, retryAfter ? Number(retryAfter) : undefined);
    }
  }

  async downloadMedia(url: string): Promise<Buffer> {
    try {
      const r = await this.client.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(r.data);
    } catch (err: any) {
      const status = err.response?.status ?? 0;
      const retryAfter = err.response?.headers?.['retry-after'];
      throw new WhatsAppError('Failed to download media', status, err.response?.data, retryAfter ? Number(retryAfter) : undefined);
    }
  }
}
