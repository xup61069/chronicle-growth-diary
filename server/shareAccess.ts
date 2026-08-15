import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type ShareMode = "private" | "public" | "link";

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashSharePassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${digest}`;
}

export function verifySharePassword(password: string, storedHash?: string | null) {
  if (!storedHash) return true;
  const [salt, digest] = storedHash.split(":");
  if (!salt || !digest) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(digest, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function isShareExpired(expiresAt?: number | null, now = Date.now()) {
  return Boolean(expiresAt && expiresAt <= now);
}

export function hasShareAccess(input: { mode: ShareMode; storedTokenHash?: string | null; providedToken?: string | null }) {
  if (input.mode === "private") return false;
  if (input.mode === "public") return true;
  if (!input.storedTokenHash || !input.providedToken) return false;
  const providedHash = Buffer.from(hashShareToken(input.providedToken), "hex");
  const storedHash = Buffer.from(input.storedTokenHash, "hex");
  return providedHash.length === storedHash.length && timingSafeEqual(providedHash, storedHash);
}

export function onlyPublicEvents<T extends { isPublic: boolean }>(events: T[]) {
  return events.filter((event) => event.isPublic);
}
