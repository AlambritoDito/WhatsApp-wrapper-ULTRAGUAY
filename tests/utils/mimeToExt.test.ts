import { describe, it, expect } from 'vitest';
import { mimeToExt } from '../../src/utils/mimeToExt';

describe('mimeToExt', () => {
  it('should map image/jpeg to .jpg', () => {
    expect(mimeToExt('image/jpeg')).toBe('.jpg');
  });

  it('should map image/png to .png', () => {
    expect(mimeToExt('image/png')).toBe('.png');
  });

  it('should map audio/ogg to .ogg', () => {
    expect(mimeToExt('audio/ogg')).toBe('.ogg');
  });

  it('should map video/mp4 to .mp4', () => {
    expect(mimeToExt('video/mp4')).toBe('.mp4');
  });

  it('should map application/pdf to .pdf', () => {
    expect(mimeToExt('application/pdf')).toBe('.pdf');
  });

  it('should return .bin for unknown types', () => {
    expect(mimeToExt('application/x-custom')).toBe('.bin');
  });

  it('should be case-insensitive', () => {
    expect(mimeToExt('IMAGE/JPEG')).toBe('.jpg');
  });

  it('should trim whitespace', () => {
    expect(mimeToExt('  image/png  ')).toBe('.png');
  });
});
