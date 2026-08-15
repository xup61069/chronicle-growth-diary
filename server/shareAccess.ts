import { createHash, timingSafeEqual } from "node:crypto";

export type ShareMode = "private" | "public" | "link";

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
