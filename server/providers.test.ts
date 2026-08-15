import { ENV } from "./_core/env";
import { getAuthProvider, resetAuthProviderForTests } from "./providers/auth";
import { getLLMProvider, resetLLMProviderForTests } from "./providers/llm";
import { getStorageProvider, resetStorageProviderForTests } from "./providers/storage";
import { afterEach, describe, expect, it } from "vitest";

const originalEnvironment = { ...ENV };

function restoreEnvironment() {
  Object.assign(ENV, originalEnvironment);
  resetAuthProviderForTests();
  resetLLMProviderForTests();
  resetStorageProviderForTests();
}

afterEach(restoreEnvironment);

describe("service providers", () => {
  it("keeps managed Forge services and Manus authentication as defaults", () => {
    ENV.authDriver = "manus";
    ENV.storageDriver = "forge";
    ENV.llmDriver = "forge";
    ENV.forgeApiUrl = "https://forge.test";
    ENV.forgeApiKey = "forge-test-key";

    expect(getAuthProvider().name).toBe("manus");
    expect(getStorageProvider().name).toBe("forge");
    expect(getLLMProvider().name).toBe("forge");
  });

  it("builds OpenAI-compatible endpoints from the configured base URL", () => {
    ENV.llmDriver = "openai-compatible";
    ENV.llmBaseUrl = "http://localhost:11434/v1/";
    ENV.llmApiKey = "local-test-key";

    expect(getLLMProvider()).toMatchObject({
      name: "openai-compatible",
      chatCompletionsUrl: "http://localhost:11434/v1/chat/completions",
      modelsUrl: "http://localhost:11434/v1/models",
      apiKey: "local-test-key",
    });
  });

  it("rejects an incomplete S3 configuration before performing a network request", () => {
    ENV.storageDriver = "s3";
    ENV.storageS3Bucket = "";
    ENV.storageS3AccessKeyId = "";
    ENV.storageS3SecretAccessKey = "";

    expect(() => getStorageProvider()).toThrow("S3 儲存未設定");
  });

  it("can select the session-compatible auth provider without changing the cookie contract", () => {
    ENV.authDriver = "session";
    expect(getAuthProvider().name).toBe("session");
  });
});
