/**
 * Media operations for the WhatsApp Cloud API.
 * Handles downloading and uploading media files.
 */

import { FetchClient } from '../http/fetchClient.js';
import type { MediaMetadataResponse, MediaUploadResponse } from '../types/responses.js';

/** Options for creating a MediaClient. */
export interface MediaClientOptions {
  /** Pre-configured FetchClient instance. */
  fetchClient: FetchClient;
  /** Graph API base URL (without phone number ID). */
  graphBaseUrl: string;
  /** Access token for authenticated media downloads. */
  accessToken: string;
}

/**
 * Client for downloading and uploading media via the WhatsApp Cloud API.
 * Uses the FetchClient for consistent retry and timeout behavior.
 */
export class MediaClient {
  private readonly fetchClient: FetchClient;
  private readonly graphBaseUrl: string;
  private readonly accessToken: string;

  constructor(options: MediaClientOptions) {
    this.fetchClient = options.fetchClient;
    this.graphBaseUrl = options.graphBaseUrl.replace(/\/$/, '');
    this.accessToken = options.accessToken;
  }

  /**
   * Get metadata for a media file (URL, MIME type, size).
   *
   * @param mediaId - The media ID from the webhook payload.
   * @returns Media metadata including the download URL.
   */
  async getMediaMetadata(mediaId: string): Promise<MediaMetadataResponse> {
    // Media metadata is fetched from the graph API root (not the phone-specific endpoint)
    const response = await fetch(`${this.graphBaseUrl}/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok) {
      const { WhatsAppError } = await import('../errors/WhatsAppError.js');
      throw new WhatsAppError(
        `Failed to get media metadata: HTTP ${response.status}`,
        response.status,
        'MEDIA_METADATA_ERROR',
      );
    }

    return (await response.json()) as MediaMetadataResponse;
  }

  /**
   * Download a media file given its ID.
   * Two-step process: first get the URL via metadata, then download the binary.
   *
   * @param mediaId - The media ID from the webhook payload.
   * @returns The downloaded file as a Buffer.
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    const metadata = await this.getMediaMetadata(mediaId);
    return this.downloadFromUrl(metadata.url);
  }

  /**
   * Download a media file from a direct URL (with authentication).
   *
   * @param url - The authenticated media URL from getMediaMetadata.
   * @returns The file data as a Buffer.
   */
  async downloadFromUrl(url: string): Promise<Buffer> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok) {
      const { WhatsAppError } = await import('../errors/WhatsAppError.js');
      throw new WhatsAppError(
        `Failed to download media: HTTP ${response.status}`,
        response.status,
        'MEDIA_DOWNLOAD_ERROR',
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Upload a media file to the WhatsApp Cloud API.
   *
   * @param data - File data as a Buffer.
   * @param mimeType - MIME type of the file.
   * @param filename - Optional filename (default: 'file').
   * @returns The uploaded media ID that can be used in send operations.
   */
  async uploadMedia(data: Buffer, mimeType: string, filename?: string): Promise<string> {
    const blob = new Blob([data], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, filename ?? 'file');
    formData.append('type', mimeType);
    formData.append('messaging_product', 'whatsapp');

    const response = await this.fetchClient.postForm<MediaUploadResponse>('/media', formData);
    return response.id;
  }
}
