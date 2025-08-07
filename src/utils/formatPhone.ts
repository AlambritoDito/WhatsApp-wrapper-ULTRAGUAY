export function formatPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}