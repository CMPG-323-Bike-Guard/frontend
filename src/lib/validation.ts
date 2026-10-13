import { PHOTO_ACCEPTED_TYPES, PHOTO_MAX_BYTES } from './constants';
import { formatBytes } from './format';

/**
 * Client-side validation only. Every rule here is also the backend's
 * responsibility ,  the API is the authority (Technical Specification 5.1).
 */

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

/**
 * ASSUMPTION: NWU student and staff numbers are 8 digits. Every number in the
 * project documents (for example 51586509, 35163984) follows that pattern.
 */
export const STUDENT_NUMBER_PATTERN = /^\d{8}$/;

/**
 * ASSUMPTION: the documents never state a tag identifier format. UHF EPC
 * references are accepted as 6–24 uppercase alphanumeric characters with
 * optional dashes, which covers the common vendor formats.
 */
export const TAG_REF_PATTERN = /^[A-Z0-9][A-Z0-9-]{4,23}$/;

export function requireText(value: string, label: string, min = 2, max = 80): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < min) return `${label} needs at least ${min} characters.`;
  if (trimmed.length > max) return `${label} cannot be longer than ${max} characters.`;
  return undefined;
}

export function validateStudentNumber(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your student or staff number.';
  if (!STUDENT_NUMBER_PATTERN.test(trimmed)) return 'A student or staff number is 8 digits.';
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Enter your password.';
  if (value.length < 8) return 'Passwords are at least 8 characters.';
  return undefined;
}

export function validateTagRef(value: string): string | undefined {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return 'Scan or type the tag reference printed on the tag.';
  if (!TAG_REF_PATTERN.test(trimmed)) {
    return 'A tag reference is 6–24 characters, using A–Z, 0–9 and dashes.';
  }
  return undefined;
}

export function validatePhoto(file: File | null, required = true): string | undefined {
  if (!file) return required ? 'A photo of the bike is required.' : undefined;
  if (!PHOTO_ACCEPTED_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image.';
  if (file.size > PHOTO_MAX_BYTES) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(PHOTO_MAX_BYTES)}.`;
  }
  return undefined;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
