import { describe, it, expect } from 'vitest';
import { formatPhone } from '../../src/utils/formatPhone';

describe('formatPhone', () => {
  it('should strip non-digit characters', () => {
    expect(formatPhone('+52 (1) 33-1234-5678')).toBe('5213312345678');
  });

  it('should leave a clean number unchanged', () => {
    expect(formatPhone('5511999999999')).toBe('5511999999999');
  });

  it('should handle empty string', () => {
    expect(formatPhone('')).toBe('');
  });

  it('should strip spaces, dashes, parens, and plus', () => {
    expect(formatPhone('+1 (555) 123-4567')).toBe('15551234567');
  });
});
