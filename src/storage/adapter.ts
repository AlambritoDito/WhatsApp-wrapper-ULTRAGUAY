/**
 * Storage adapter interface for persisting downloaded media.
 * @module storage/adapter
 */

/** Input passed to a storage adapter's `save` method. */
export interface StorageSaveInput {
  /** Raw file data. */
  data: Buffer;
  /** MIME type of the file. */
  mimeType: string;
  /** Suggested file name (without extension). */
  suggestedName?: string;
}

/** Result of a successful save operation. */
export interface StorageSaveResult {
  /** Canonical location string (file path, S3 URI, etc.). */
  location: string;
  /** Optional extra metadata from the adapter. */
  meta?: Record<string, unknown>;
}

/**
 * Interface that every storage adapter must implement.
 *
 * @example
 * ```ts
 * class MyAdapter implements StorageAdapter {
 *   async save(input) {
 *     // persist `input.data` somewhere
 *     return { location: 'my://location' };
 *   }
 * }
 * ```
 */
export interface StorageAdapter {
  /** Persist media data and return its location. */
  save(input: StorageSaveInput): Promise<StorageSaveResult>;
}
