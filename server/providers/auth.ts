import type { User } from "../../drizzle/schema";
import type { Request } from "express";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";

export type AuthProviderName = "manus" | "session" | "local";

export interface AuthProvider {
  readonly name: AuthProviderName;
  authenticateRequest(request: Request): Promise<User>;
  createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string }
  ): Promise<string>;
}

class SessionAuthProvider implements AuthProvider {
  constructor(readonly name: AuthProviderName) {}

  authenticateRequest(request: Request) {
    return sdk.authenticateRequest(request);
  }

  createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string }
  ) {
    return sdk.createSessionToken(openId, options);
  }
}

let provider: AuthProvider | undefined;

export function getAuthProvider(): AuthProvider {
  if (provider) return provider;

  // `session` is intentionally limited to session verification/signing. It is
  // the safe base for a future local credential provider without changing the
  // cookie contract used by existing OAuth users.
  const name: AuthProviderName =
    ENV.authDriver === "local"
      ? "local"
      : ENV.authDriver === "session"
        ? "session"
        : "manus";
  provider = new SessionAuthProvider(name);
  return provider;
}

export function resetAuthProviderForTests() {
  provider = undefined;
}
