/**
 * Normalize a phone number by stripping non-digit characters.
 *
 * @param phone - Raw phone number (e.g., '+52 (1) 33-1234-5678').
 * @returns Digits only (e.g., '5213312345678').
 */
export function formatPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}
