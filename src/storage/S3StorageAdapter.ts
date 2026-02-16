/**
 * Storage adapter that saves files to AWS S3.
 * Requires `@aws-sdk/client-s3` as a peer dependency.
 */

import type { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { mimeToExt } from '../utils/mimeToExt.js';
import type { StorageAdapter, StorageSaveInput, StorageSaveResult } from './StorageAdapter.js';

/** Configuration for S3StorageAdapter. */
export interface S3StorageAdapterOptions {
  /** S3 bucket name. */
  bucket: string;
  /** Key prefix (e.g., 'whatsapp/media/'). */
  prefix?: string;
  /** S3 client configuration (region, credentials, etc.). */
  s3?: S3ClientConfig;
}

/**
 * Saves media files to an AWS S3 bucket.
 *
 * @example
 * ```ts
 * const storage = new S3StorageAdapter({
 *   bucket: 'my-bucket',
 *   prefix: 'whatsapp/',
 *   s3: { region: 'us-east-1' },
 * });
 * ```
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client | undefined;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly s3Config: S3ClientConfig;

  constructor(options: S3StorageAdapterOptions) {
    this.bucket = options.bucket;
    this.prefix = options.prefix ?? '';
    this.s3Config = options.s3 ?? {};
  }

  /**
   * Lazy-initialize the S3 client to avoid import errors
   * when @aws-sdk/client-s3 is not installed.
   */
  private async getClient(): Promise<S3Client> {
    if (!this.client) {
      const { S3Client: S3 } = await import('@aws-sdk/client-s3');
      this.client = new S3(this.s3Config);
    }
    return this.client;
  }

  async save(input: StorageSaveInput): Promise<StorageSaveResult> {
    const s3 = await this.getClient();
    const ext = mimeToExt(input.mimeType);
    const filename = (input.suggestedName || `wa_${Date.now()}`) + ext;
    const key = `${this.prefix}${filename}`;

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.data,
        ContentType: input.mimeType,
      }),
    );

    return {
      location: `s3://${this.bucket}/${key}`,
      meta: { bucket: this.bucket, key },
    };
  }
}
