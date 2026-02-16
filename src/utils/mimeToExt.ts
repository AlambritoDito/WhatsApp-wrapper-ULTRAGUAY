/**
 * Map MIME types to file extensions.
 * Covers the most common types used with WhatsApp Cloud API.
 */

const MIME_MAP: Record<string, string> = {
  // Images
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',

  // Audio
  'audio/aac': '.aac',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/amr': '.amr',
  'audio/ogg': '.ogg',
  'audio/opus': '.opus',
  'audio/ogg; codecs=opus': '.ogg',

  // Video
  'video/mp4': '.mp4',
  'video/3gpp': '.3gp',

  // Documents
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/json': '.json',
  'application/zip': '.zip',

};

/**
 * Get a file extension for a MIME type.
 *
 * @param mimeType - The MIME type string.
 * @returns File extension including the dot (e.g., '.png'), or '.bin' for unknown types.
 */
export function mimeToExt(mimeType: string): string {
  // Normalize: lowercase, trim
  const normalized = mimeType.toLowerCase().trim();
  return MIME_MAP[normalized] ?? '.bin';
}
