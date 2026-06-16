import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

let cachedEncryptionKey: Buffer | null = null;

function toBase64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, "base64");
}

function isProbablyHexKey(value: string) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function getEncryptionKey() {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  const rawKey = process.env.DATA_ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    throw new Error(
      "DATA_ENCRYPTION_KEY não configurada. Defina essa variável no .env local e na Vercel antes de salvar ou ler dados criptografados.",
    );
  }

  if (isProbablyHexKey(rawKey)) {
    cachedEncryptionKey = Buffer.from(rawKey, "hex");
    return cachedEncryptionKey;
  }

  const base64Candidate = Buffer.from(rawKey, "base64");

  if (base64Candidate.length === KEY_LENGTH) {
    cachedEncryptionKey = base64Candidate;
    return cachedEncryptionKey;
  }

  if (Buffer.byteLength(rawKey, "utf8") >= KEY_LENGTH) {
    cachedEncryptionKey = createHash("sha256").update(rawKey).digest();
    return cachedEncryptionKey;
  }

  throw new Error(
    "DATA_ENCRYPTION_KEY inválida. Gere uma chave com: openssl rand -base64 32",
  );
}

export function isEncryptedText(value: unknown) {
  return typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptSensitiveText(value: string) {
  if (!value || isEncryptedText(value)) {
    return value;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${toBase64Url(iv)}:${toBase64Url(authTag)}:${toBase64Url(encrypted)}`;
}

export function encryptNullableSensitiveText(value: string | null | undefined) {
  if (!value) {
    return value ?? null;
  }

  return encryptSensitiveText(value);
}

export function decryptSensitiveText(value: string) {
  if (!isEncryptedText(value)) {
    return value;
  }

  const encryptedPayload = value.slice(ENCRYPTION_PREFIX.length);
  const [ivText, authTagText, encryptedText] = encryptedPayload.split(":");

  if (!ivText || !authTagText || !encryptedText) {
    throw new Error("Texto criptografado inválido ou corrompido.");
  }

  const key = getEncryptionKey();
  const iv = fromBase64Url(ivText);
  const authTag = fromBase64Url(authTagText);
  const encrypted = fromBase64Url(encryptedText);

  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function decryptNullableSensitiveText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return decryptSensitiveText(value);
}
