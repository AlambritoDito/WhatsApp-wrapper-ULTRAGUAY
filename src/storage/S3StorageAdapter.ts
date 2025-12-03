import { PutObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

import { StorageAdapter } from './StorageAdapter';

function extFromMime(mime: string): string {
  return mime === 'image/png' ? 'png' : 'jpg';
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix?: string;
  constructor(cfg: { bucket: string; prefix?: string; s3?: S3ClientConfig }) {
    this.bucket = cfg.bucket;
    this.prefix = cfg.prefix;
    this.client = new S3Client(cfg.s3 || {});
  }

  async save({ data, mimeType, suggestedName }: { data: Buffer; mimeType: string; suggestedName?: string }) {
    const key = `${this.prefix ?? ''}${suggestedName || `wa_${Date.now()}`}.${extFromMime(mimeType)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: mimeType,
      })
    );
    return { location: `s3://${this.bucket}/${key}` };
  }
}
