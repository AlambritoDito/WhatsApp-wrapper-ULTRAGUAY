export class WhatsAppError extends Error {
  statusCode: number;
  details?: any;
  retryAfter?: number;
  constructor(message: string, statusCode: number, details?: any, retryAfter?: number) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}