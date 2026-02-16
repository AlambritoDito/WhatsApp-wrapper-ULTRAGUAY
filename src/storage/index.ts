/**
 * Storage adapters subpath export.
 *
 * ```ts
 * import { DiskStorageAdapter, S3StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';
 * ```
 *
 * @module storage
 */

export type { StorageAdapter, StorageSaveInput, StorageSaveResult } from './adapter';
export { DiskStorageAdapter } from './disk';
export { S3StorageAdapter, type S3StorageAdapterOptions } from './s3';
