import {
  hashLocalPassword,
  localOpenIdForEmail,
  normalizeLocalEmail,
  verifyLocalPassword,
} from "../../localCredentials";
import { describe, expect, it } from "vitest";

describe("local credentials", () => {
  it("normalizes email addresses and derives a stable non-email openId", () => {
    expect(normalizeLocalEmail("  PERSON@EXAMPLE.COM ")).toBe("person@example.com");
    expect(localOpenIdForEmail("PERSON@EXAMPLE.COM")).toBe(
      localOpenIdForEmail("person@example.com")
    );
    expect(localOpenIdForEmail("person@example.com")).not.toContain("person@example.com");
  });

  it("stores passwords as salted scrypt hashes and verifies only the exact value", () => {
    const hash = hashLocalPassword("a-long-local-passphrase");
    expect(hash).not.toContain("a-long-local-passphrase");
    expect(verifyLocalPassword("a-long-local-passphrase", hash)).toBe(true);
    expect(verifyLocalPassword("a-long-local-passphrase-incorrect", hash)).toBe(false);
    expect(verifyLocalPassword("anything", null)).toBe(false);
  });
});
