// Shopify requires E.164 (e.g. +11234567890). Assume a bare 10-digit number
// is a US number, since our forms have no separate country code field.
export function normalizePhone(phone) {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}
