export class StorageNotConfiguredError extends Error {
  constructor() {
    super('Storage adapter not configured');
  }
}
