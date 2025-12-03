import fs from 'fs';
import os from 'os';
import path from 'path';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

import { DiskStorageAdapter } from '../src/storage/DiskStorageAdapter';
import { S3StorageAdapter } from '../src/storage/S3StorageAdapter';

describe('StorageAdapters', () => {
  test('DiskStorageAdapter writes file', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wa-'));
    const adapter = new DiskStorageAdapter(dir);
    const res = await adapter.save({ data: Buffer.from('hi'), mimeType: 'image/png', suggestedName: 'file' });
    const content = await fs.promises.readFile(res.location);
    expect(content.toString()).toBe('hi');
    expect(res.location.endsWith('.png')).toBe(true);
  });

  test('S3StorageAdapter uploads object', async () => {
    const mock = mockClient(S3Client);
    const adapter = new S3StorageAdapter({ bucket: 'bkt', prefix: 'pre/' });
    await adapter.save({ data: Buffer.from('hi'), mimeType: 'image/jpeg', suggestedName: 'img' });
    expect(mock.commandCalls(PutObjectCommand).length).toBe(1);
    expect(mock.commandCalls(PutObjectCommand)[0].args[0].input).toMatchObject({
      Bucket: 'bkt',
      Key: 'pre/img.jpg',
      ContentType: 'image/jpeg',
    });
  });
});
