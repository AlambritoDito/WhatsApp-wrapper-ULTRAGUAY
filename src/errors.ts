/**
 * Error classes for WhatsApp Cloud API interactions.
 * @module errors
 */

/**
 * Error thrown when a WhatsApp Cloud API request fails.
 * Includes the HTTP status code, response details, and optional Retry‑After header.
 */
export class WhatsAppError extends Error {
  /** HTTP status code (0 when unknown / network error). */
  readonly statusCode: number;
  /** Raw error body returned by the API, if available. */
  readonly details: unknown;
  /** Value of the Retry‑After header in seconds, if present. */
  readonly retryAfter?: number;

  constructor(message: string, statusCode: number, details?: unknown, retryAfter?: number) {
    super(message);
    this.name = 'WhatsAppError';
    this.statusCode = statusCode;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when an operation requires a storage adapter but none was configured.
 */
export class StorageNotConfiguredError extends Error {
  constructor() {
    super('Storage adapter not configured — pass a StorageAdapter via the client config.');
    this.name = 'StorageNotConfiguredError';
  }
}
