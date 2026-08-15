import { describe, expect, it } from "vitest";
import { hasShareAccess, hashShareToken, onlyPublicEvents } from "./shareAccess";

describe("growth diary share access", () => {
  const token = "correct-private-share-token";
  const storedTokenHash = hashShareToken(token);

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
});
