/**
 * Interface for pluggable media storage backends.
 * Implementations handle saving media files to disk, S3, GCS, etc.
 */

/** Input to the save method. */
export interface StorageSaveInput {
  /** Binary data to store. */
  data: Buffer;
  /** MIME type of the data. */
  mimeType: string;
  /** Suggested filename (without extension). */
  suggestedName?: string;
}

/** Result of a successful save. */
export interface StorageSaveResult {
  /** Location/path/URI where the file was stored. */
  location: string;
  /** Any extra metadata from the storage backend. */
  meta?: Record<string, unknown>;
}

/**
 * Storage adapter interface.
 * Implement this to create custom storage backends.
 */
export interface StorageAdapter {
  /**
   * Save binary data to storage.
   *
   * @param input - The data, MIME type, and optional suggested name.
   * @returns The location where the file was stored.
   */
  save(input: StorageSaveInput): Promise<StorageSaveResult>;
}
