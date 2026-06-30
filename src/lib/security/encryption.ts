import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM envelope encryption for sensitive at-rest fields (e.g. Etsy
 * OAuth tokens in Phase 2). Not used by any model yet — EtsyConnection
 * stores ciphertext produced by this module once Etsy OAuth ships.
 *
 * ENCRYPTION_KEY must be a high-entropy secret set via environment variable,
 * never committed. It is stretched with scrypt + a static salt derived from
 * the key itself so a 32-byte AES key can be derived from a passphrase of
 * any length without storing a separate salt per ciphertext.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY environment variable must be set to a value of at least 32 characters",
    );
  }
  return scryptSync(secret, "listingstudio-encryption-salt", 32);
}

/** Returns base64-encoded `iv:authTag:ciphertext`. */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
