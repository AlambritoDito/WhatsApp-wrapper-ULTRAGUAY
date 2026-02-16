/**
 * Default silent logger — produces no output.
 * Used when no logger is provided to WhatsAppClient.
 */
import type { Logger } from '../types/config.js';

const noop = (): void => {};

export const silentLogger: Logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};
