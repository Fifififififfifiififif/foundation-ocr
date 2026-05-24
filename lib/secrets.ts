import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer {
  const raw =
    process.env.KSEF_ENCRYPTION_KEY?.trim() ||
    process.env.APP_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("KSEF_ENCRYPTION_KEY (or APP_SECRET) is required in production.");
    }
    return createHash("sha256").update("dev-ksef-encryption-fallback").digest();
  }
  return createHash("sha256").update(raw).digest();
}

/** Szyfruje wrażliwe dane (token KSeF, certyfikat). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid encrypted payload.");
  const iv = Buffer.from(parts[1]!, "base64");
  const tag = Buffer.from(parts[2]!, "base64");
  const data = Buffer.from(parts[3]!, "base64");
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
