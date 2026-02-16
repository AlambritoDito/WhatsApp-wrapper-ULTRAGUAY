import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DiskStorageAdapter } from '../../src/storage/DiskStorageAdapter';

const TEST_DIR = path.join('/tmp', 'whatsapp-wrapper-test-storage');

afterAll(async () => {
  // Cleanup
  await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
});

describe('DiskStorageAdapter', () => {
  const adapter = new DiskStorageAdapter(TEST_DIR);

  it('should save a file and return the location', async () => {
    const data = Buffer.from('test image data');
    const result = await adapter.save({
      data,
      mimeType: 'image/png',
      suggestedName: 'test_image',
    });

    expect(result.location).toContain('test_image.png');
    expect(fs.existsSync(result.location)).toBe(true);

    const saved = await fs.promises.readFile(result.location);
    expect(saved.toString()).toBe('test image data');
  });

  it('should auto-generate a filename when not provided', async () => {
    const result = await adapter.save({
      data: Buffer.from('auto name'),
      mimeType: 'image/jpeg',
    });

    expect(result.location).toContain('.jpg');
    expect(result.location).toContain('wa_');
    expect(fs.existsSync(result.location)).toBe(true);
  });

  it('should use correct extension for PDFs', async () => {
    const result = await adapter.save({
      data: Buffer.from('pdf content'),
      mimeType: 'application/pdf',
      suggestedName: 'report',
    });

    expect(result.location).toContain('report.pdf');
  });

  it('should use correct extension for audio', async () => {
    const result = await adapter.save({
      data: Buffer.from('audio content'),
      mimeType: 'audio/ogg',
      suggestedName: 'voice_note',
    });

    expect(result.location).toContain('voice_note.ogg');
  });

  it('should sanitize filenames', async () => {
    const result = await adapter.save({
      data: Buffer.from('sanitize test'),
      mimeType: 'image/png',
      suggestedName: 'my file (copy) [2].png',
    });

    // Should not contain spaces, parens, or brackets
    expect(result.location).not.toContain(' ');
    expect(result.location).not.toContain('(');
    expect(fs.existsSync(result.location)).toBe(true);
  });

  it('should create directories recursively', async () => {
    const deepAdapter = new DiskStorageAdapter(path.join(TEST_DIR, 'deep', 'nested'));
    const result = await deepAdapter.save({
      data: Buffer.from('deep file'),
      mimeType: 'text/plain',
      suggestedName: 'deep_file',
    });

    expect(fs.existsSync(result.location)).toBe(true);
  });

  it('should use .bin for unknown MIME types', async () => {
    const result = await adapter.save({
      data: Buffer.from('mystery'),
      mimeType: 'application/x-mystery',
      suggestedName: 'mystery_file',
    });

    expect(result.location).toContain('.bin');
  });
});
