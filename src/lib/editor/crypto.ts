import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { requiredEnv } from "./config";

function key() {
  const secret = requiredEnv("SESSION_SECRET");
  if (secret.length < 32)
    throw new Error("SESSION_SECRET needs at least 32 characters.");
  return createHash("sha256").update(secret).digest();
}

export function seal(value: object, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function unseal<T extends { expiresAt: number }>(
  value: string | undefined,
  purpose: string,
): T | null {
  if (!value) return null;
  try {
    const data = Buffer.from(value, "base64url");
    const cipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
    cipher.setAAD(Buffer.from(purpose));
    cipher.setAuthTag(data.subarray(12, 28));
    const body = Buffer.concat([
      cipher.update(data.subarray(28)),
      cipher.final(),
    ]);
    const result = JSON.parse(body.toString("utf8")) as T;
    return Number.isFinite(result.expiresAt) && result.expiresAt > Date.now()
      ? result
      : null;
  } catch {
    return null;
  }
}
