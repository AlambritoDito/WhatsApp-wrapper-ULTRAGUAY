import fs from 'fs';
import path from 'path';
import os from 'os';

import { DiskStorageAdapter } from '../src/storage/disk';

describe('DiskStorageAdapter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-storage-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves a file to disk with correct extension', async () => {
    const adapter = new DiskStorageAdapter(tmpDir);
    const data = Buffer.from('fake-image-data');
    const result = await adapter.save({ data, mimeType: 'image/jpeg', suggestedName: 'photo' });
    expect(result.location).toContain('photo.jpg');
    expect(fs.existsSync(result.location)).toBe(true);
    expect(fs.readFileSync(result.location).toString()).toBe('fake-image-data');
  });

  it('saves a PNG with .png extension', async () => {
    const adapter = new DiskStorageAdapter(tmpDir);
    const result = await adapter.save({ data: Buffer.from('png'), mimeType: 'image/png' });
    expect(result.location).toMatch(/\.png$/);
  });

  it('saves a PDF with .pdf extension', async () => {
    const adapter = new DiskStorageAdapter(tmpDir);
    const result = await adapter.save({ data: Buffer.from('pdf'), mimeType: 'application/pdf' });
    expect(result.location).toMatch(/\.pdf$/);
  });

  it('generates a name if none suggested', async () => {
    const adapter = new DiskStorageAdapter(tmpDir);
    const result = await adapter.save({ data: Buffer.from('data'), mimeType: 'audio/ogg' });
    expect(result.location).toContain('wa_');
    expect(result.location).toMatch(/\.ogg$/);
  });

  it('sanitises the filename', async () => {
    const adapter = new DiskStorageAdapter(tmpDir);
    const result = await adapter.save({
      data: Buffer.from('data'),
      mimeType: 'image/jpeg',
      suggestedName: 'foo/bar baz!@#',
    });
    // Should not contain slashes or special chars
    const basename = path.basename(result.location);
    expect(basename).not.toMatch(/[/\\!@# ]/);
  });
});
