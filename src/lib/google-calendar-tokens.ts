import {
  decryptNullableSensitiveText,
  encryptNullableSensitiveText,
} from "@/lib/encryption";

export function encryptGoogleToken(value: string | null | undefined) {
  return encryptNullableSensitiveText(value) || null;
}

export function decryptGoogleToken(value: string | null | undefined) {
  return decryptNullableSensitiveText(value) || null;
}

export function hasGoogleToken(value: string | null | undefined) {
  return Boolean(decryptGoogleToken(value));
}
