import { describe, expect, it } from "vitest";
import { hasShareAccess, hashSharePassword, hashShareToken, isShareExpired, makeShareSlug, makeShareToken, onlyPublicEvents, verifySharePassword } from "./shareAccess";

describe("growth diary share access", () => {
  const token = "correct-private-share-token";
  const storedTokenHash = hashShareToken(token);

  it("creates non-guessable story identifiers and link tokens", () => {
    expect(makeShareSlug(42)).toMatch(/^story-42-[a-f0-9]{10}$/);
    expect(makeShareToken()).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(makeShareToken()).not.toBe(makeShareToken());
  });

  it("keeps private diaries inaccessible through every share request", () => {
    expect(hasShareAccess({ mode: "private", storedTokenHash, providedToken: token })).toBe(false);
  });

  it("allows a public story without a token", () => {
    expect(hasShareAccess({ mode: "public" })).toBe(true);
  });

  it("rejects a link share with a missing or wrong token", () => {
    expect(hasShareAccess({ mode: "link", storedTokenHash })).toBe(false);
    expect(hasShareAccess({ mode: "link", storedTokenHash, providedToken: "incorrect-token" })).toBe(false);
  });

  it("allows a link share only with the correct token", () => {
    expect(hasShareAccess({ mode: "link", storedTokenHash, providedToken: token })).toBe(true);
  });

  it("only exposes explicitly shareable events", () => {
    expect(onlyPublicEvents([{ id: 1, isPublic: true }, { id: 2, isPublic: false }])).toEqual([{ id: 1, isPublic: true }]);
  });

  it("stores a share password as a salted hash and validates only the exact password", () => {
    const passwordHash = hashSharePassword("archive-passphrase");
    expect(passwordHash).not.toContain("archive-passphrase");
    expect(verifySharePassword("archive-passphrase", passwordHash)).toBe(true);
    expect(verifySharePassword("wrong-passphrase", passwordHash)).toBe(false);
  });

  it("blocks expired links while keeping future-dated links readable", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(isShareExpired(now - 1, now)).toBe(true);
    expect(isShareExpired(now + 1, now)).toBe(false);
    expect(isShareExpired(null, now)).toBe(false);
  });
});
