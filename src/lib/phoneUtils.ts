/**
 * Phone Number Privacy & Masking Utilities for INSPECTRA
 * Complies with Indian privacy standards: First 4 digits + XXXX + last 2 digits.
 * Example: 9956123476 -> 9956XXXX76
 */

/**
 * Masks a mobile number so complete phone number is never displayed.
 * Format: first 4 digits + XXXX + last 2 digits.
 * Example: 9956123476 -> 9956XXXX76
 */
export function maskPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const clean = String(phone).trim();
  const digits = clean.replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `${digits.slice(0, 4)}XXXX${digits.slice(8, 10)}`;
  }
  if (digits.length > 5) {
    return `${digits.slice(0, 3)}XXXX${digits.slice(-2)}`;
  }
  return 'XXXX';
}

/**
 * Validates a 10-digit Indian mobile number (begins with 6, 7, 8, or 9).
 */
export function isValidIndianMobile(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Extracts the clean 10 digits from any formatted string.
 */
export function normalizeIndianMobile(phone: string | undefined | null): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-10);
}
