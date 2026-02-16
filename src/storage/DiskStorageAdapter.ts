/**
 * Storage adapter that saves files to the local filesystem.
 */

import fs from 'fs';
import path from 'path';
import { mimeToExt } from '../utils/mimeToExt.js';
import type { StorageAdapter, StorageSaveInput, StorageSaveResult } from './StorageAdapter.js';

/**
 * Sanitize a filename by replacing non-word characters with underscores.
 */
function sanitizeName(name: string): string {
  return name.replace(/[^\w.-]/g, '_');
}

/**
 * Saves media files to a local directory.
 *
 * @example
 * ```ts
 * const storage = new DiskStorageAdapter('./media');
 * const { location } = await storage.save({
 *   data: buffer,
 *   mimeType: 'image/png',
 *   suggestedName: 'profile_photo',
 * });
 * console.log(location); // './media/profile_photo.png'
 * ```
 */
export class DiskStorageAdapter implements StorageAdapter {
  constructor(private readonly baseDir: string) {}

  async save(input: StorageSaveInput): Promise<StorageSaveResult> {
    const ext = mimeToExt(input.mimeType);
    const baseName = sanitizeName(input.suggestedName || `wa_${Date.now()}`);
    const filename = baseName + ext;
    const fullPath = path.join(this.baseDir, filename);

    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, input.data);

    return { location: fullPath };
  }
}
