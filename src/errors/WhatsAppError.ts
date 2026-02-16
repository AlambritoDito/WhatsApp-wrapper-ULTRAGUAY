/**
 * Error class for WhatsApp Cloud API errors.
 * Captures HTTP status, Meta's error code, and retry-after hints.
 */
export class WhatsAppError extends Error {
  /** HTTP status code from the API response. */
  readonly statusCode: number;
  /** Meta's error code string (e.g., '131051'). */
  readonly errorCode: string;
  /** Full error details from the API. */
  readonly details: unknown;
  /** Seconds to wait before retrying (from Retry-After header or rate limit). */
  readonly retryAfter?: number;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string = 'UNKNOWN',
    details?: unknown,
    retryAfter?: number,
  ) {
    super(message);
    this.name = 'WhatsAppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.retryAfter = retryAfter;
  }

  /** Whether this error is retryable (429 or 5xx). */
  get isRetryable(): boolean {
    return this.statusCode === 429 || this.statusCode >= 500;
  }
}
