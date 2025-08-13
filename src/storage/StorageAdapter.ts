export interface StorageAdapter {
  save(input: { data: Buffer; mimeType: string; suggestedName?: string }): Promise<{ location: string; meta?: Record<string, any> }>; 
}
