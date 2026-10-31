import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for chat messages at rest (SPEC §6.6, §12). Stored as "v1:iv:tag:ciphertext" (base64url parts).
// CHAT_ENCRYPTION_KEY is 32 random bytes in base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
// Losing or changing the key makes every stored message unreadable.

function key() {
  const value = process.env.CHAT_ENCRYPTION_KEY;
  const buf = value ? Buffer.from(value, "base64") : null;
  if (!buf || buf.length !== 32) throw new Error("CHAT_ENCRYPTION_KEY must be 32 bytes in base64");
  return buf;
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(":");
}

export function decrypt(stored: string) {
  const [version, iv, tag, data] = stored.split(":");
  if (version !== "v1" || !iv || !tag || data === undefined) throw new Error("Unknown ciphertext format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
