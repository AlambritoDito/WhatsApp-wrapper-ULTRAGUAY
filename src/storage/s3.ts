/**
 * S3‑based storage adapter using the AWS SDK v3.
 *
 * The `@aws-sdk/client-s3` package is a **peer dependency** — install it
 * separately if you intend to use this adapter.
 *
 * @module storage/s3
 */

import type { StorageAdapter, StorageSaveInput, StorageSaveResult } from './adapter';

/** Map common MIME types to short extensions. */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'application/pdf': 'pdf',
  };
  return map[mime] ?? 'bin';
}

/** Configuration for the S3 storage adapter. */
export interface S3StorageAdapterOptions {
  /** S3 bucket name. */
  bucket: string;
  /** Optional key prefix (e.g. `"whatsapp-media/"`). */
  prefix?: string;
  /** Optional S3 client configuration (region, credentials, endpoint, etc.). */
  s3?: import('@aws-sdk/client-s3').S3ClientConfig;
}

/**
 * Saves downloaded media to an S3‑compatible bucket.
 *
 * @example
 * ```ts
 * import { S3StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';
 *
 * const storage = new S3StorageAdapter({
 *   bucket: 'my-bucket',
 *   prefix: 'wa-media/',
 *   s3: { region: 'us-east-1' },
 * });
 * ```
 */
export class S3StorageAdapter implements StorageAdapter {
  private readonly bucket: string;
  private readonly prefix: string;
  private client: import('@aws-sdk/client-s3').S3Client | undefined;
  private readonly s3Config: import('@aws-sdk/client-s3').S3ClientConfig | undefined;

  constructor(cfg: S3StorageAdapterOptions) {
    this.bucket = cfg.bucket;
    this.prefix = cfg.prefix ?? '';
    this.s3Config = cfg.s3;
  }

  /** Lazy‑initialise the S3 client (defers the dynamic import). */
  private async getClient(): Promise<import('@aws-sdk/client-s3').S3Client> {
    if (!this.client) {
      const { S3Client: S3ClientImpl } = await import('@aws-sdk/client-s3');
      this.client = new S3ClientImpl(this.s3Config ?? {});
    }
    return this.client;
  }

  /** @inheritdoc */
  async save(input: StorageSaveInput): Promise<StorageSaveResult> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getClient();
    const ext = extFromMime(input.mimeType);
    const key = `${this.prefix}${input.suggestedName ?? `wa_${Date.now()}`}.${ext}`;
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.data,
        ContentType: input.mimeType,
      }),
    );
    return { location: `s3://${this.bucket}/${key}` };
  }
}
