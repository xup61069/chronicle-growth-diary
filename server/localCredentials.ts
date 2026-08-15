import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function normalizeLocalEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

export function localOpenIdForEmail(email: string) {
  const digest = createHash("sha256").update(normalizeLocalEmail(email)).digest("hex");
  return `local_${digest.slice(0, 56)}`;
}

export function hashLocalPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyLocalPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;
  const [salt, digest] = storedHash.split(":");
  if (!salt || !digest) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
