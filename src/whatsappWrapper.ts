import { StorageNotConfiguredError } from './errors/StorageNotConfiguredError';
import { MediaClient } from './media/MediaClient';
import { parseIncoming, InboundImageMessage } from './receive/parseIncoming';
import { StorageAdapter } from './storage/StorageAdapter';
import { verifyPayloadSignature } from './utils/verifySignature';

export type OnImageCallback = (ctx: {
  from: string;
  timestamp: number;
  wamid: string;
  image: {
    mediaId: string;
    mimeType: string;
    sha256?: string;
  };
  download: () => Promise<Buffer>;
  save: (opts?: { suggestedName?: string }) => Promise<{ location: string }>;
}) => Promise<void> | void;

export interface WhatsappWrapperOptions {
  accessToken: string;
  appSecret: string;
  storage?: StorageAdapter;
  http?: { timeoutMs?: number; retry?: { retries: number; backoffMs: number } };
}

export class WhatsappWrapper {
  private readonly mediaClient: MediaClient;
  private readonly imageCallbacks: OnImageCallback[] = [];
  constructor(private readonly opts: WhatsappWrapperOptions) {
    this.mediaClient = new MediaClient({ accessToken: opts.accessToken, http: opts.http });
  }

  onImage(cb: OnImageCallback): this {
    this.imageCallbacks.push(cb);
    return this;
  }

  async handleWebhook(input: { headers: any; rawBody: Buffer | string; json: any }): Promise<void> {
    const signature = input.headers['x-hub-signature-256'];
    if (!signature || !verifyPayloadSignature(input.rawBody, signature, this.opts.appSecret)) {
      throw new Error('Invalid signature');
    }
    const messages = parseIncoming(input.json);
    messages
      .filter((m): m is InboundImageMessage => m.type === 'image')
      .forEach((msg) => {
        const ctx = {
          from: msg.from,
          timestamp: msg.timestamp,
          wamid: msg.wamid,
          image: msg.image,
          download: async () => {
            const meta = await this.mediaClient.getMediaMetadata(msg.image.mediaId);
            return this.mediaClient.downloadMedia(meta.url);
          },
          save: async (opts?: { suggestedName?: string }) => {
            if (!this.opts.storage) throw new StorageNotConfiguredError();
            const meta = await this.mediaClient.getMediaMetadata(msg.image.mediaId);
            const bin = await this.mediaClient.downloadMedia(meta.url);
            return this.opts.storage.save({ data: bin, mimeType: meta.mimeType, suggestedName: opts?.suggestedName || msg.image.mediaId });
          },
        };
        this.imageCallbacks.forEach((cb) => {
          Promise.resolve(cb(ctx)).catch(() => {});
        });
      });
  }
}
