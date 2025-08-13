import fs from 'fs';
import path from 'path';
import { StorageAdapter } from './StorageAdapter';

function extFromMime(mime: string): string {
  return mime === 'image/png' ? '.png' : '.jpg';
}

function sanitizeName(name: string): string {
  return name.replace(/[^\w.-]/g, '_');
}

export class DiskStorageAdapter implements StorageAdapter {
  constructor(private readonly baseDir: string) {}

  async save({ data, mimeType, suggestedName }: { data: Buffer; mimeType: string; suggestedName?: string }) {
    const ext = extFromMime(mimeType);
    const name = sanitizeName(suggestedName || `wa_${Date.now()}`) + ext;
    const full = path.join(this.baseDir, name);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, data);
    return { location: full };
  }
}
