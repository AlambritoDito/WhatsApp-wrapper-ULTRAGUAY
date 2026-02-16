/**
 * Disk‑based storage adapter that writes files to a local directory.
 * @module storage/disk
 */

import fs from 'fs';
import path from 'path';

import type { StorageAdapter, StorageSaveInput, StorageSaveResult } from './adapter';

/** Map common MIME types to file extensions. */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/3gpp': '.3gp',
    'audio/aac': '.aac',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/opus': '.opus',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  };
  return map[mime] ?? '';
}

/** Sanitise a filename — keep only word chars, dots, and hyphens. */
function sanitizeName(name: string): string {
  return name.replace(/[^\w.-]/g, '_');
}

/**
 * Saves downloaded media to a local directory.
 *
 * @example
 * ```ts
 * import { DiskStorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';
 *
 * const storage = new DiskStorageAdapter('/tmp/wa-media');
 * ```
 */
export class DiskStorageAdapter implements StorageAdapter {
  /** Absolute base directory for stored files. */
  private readonly baseDir: string;

  /**
   * @param baseDir - Directory where files will be written. Created recursively if needed.
   */
  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  /** @inheritdoc */
  async save(input: StorageSaveInput): Promise<StorageSaveResult> {
    const ext = extFromMime(input.mimeType);
    const name = sanitizeName(input.suggestedName ?? `wa_${Date.now()}`) + ext;
    const fullPath = path.join(this.baseDir, name);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, input.data);
    return { location: fullPath };
  }
}
