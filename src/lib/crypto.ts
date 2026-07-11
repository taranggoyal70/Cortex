import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

// AES-256-GCM at rest for connector tokens. The 32-byte key is derived from
// CORTEX_ENCRYPTION_KEY so the raw env value can be any 32+ char secret.
function key(): Buffer {
  const secret = getServerEnv().CORTEX_ENCRYPTION_KEY;
  if (!secret) {
    throw new AppError(
      "CORTEX_ENCRYPTION_KEY is not configured; cannot store connector tokens.",
      503,
      "encryption_not_configured",
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(encoded: string): string {
  const [version, ivB64, tagB64, ctB64] = encoded.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !ctB64) {
    throw new AppError("Malformed encrypted secret.", 500, "bad_ciphertext");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
