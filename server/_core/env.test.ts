import { afterEach, describe, expect, it, vi } from "vitest";

const originalHighlights = process.env.CHRONICLE_AI_MODEL_HIGHLIGHTS;
const originalReflection = process.env.CHRONICLE_AI_MODEL_REFLECTION;

async function loadEnv() {
  vi.resetModules();
  return import("./env");
}

afterEach(() => {
  if (originalHighlights === undefined) delete process.env.CHRONICLE_AI_MODEL_HIGHLIGHTS;
  else process.env.CHRONICLE_AI_MODEL_HIGHLIGHTS = originalHighlights;
  if (originalReflection === undefined) delete process.env.CHRONICLE_AI_MODEL_REFLECTION;
  else process.env.CHRONICLE_AI_MODEL_REFLECTION = originalReflection;
  vi.resetModules();
});

describe("feature AI model environment settings", () => {
  it("uses the current models when feature variables are unset", async () => {
    delete process.env.CHRONICLE_AI_MODEL_HIGHLIGHTS;
    delete process.env.CHRONICLE_AI_MODEL_REFLECTION;

    const { DEFAULT_AI_MODEL_HIGHLIGHTS, DEFAULT_AI_MODEL_REFLECTION, ENV } = await loadEnv();

    expect(ENV.aiModelHighlights).toBe(DEFAULT_AI_MODEL_HIGHLIGHTS);
    expect(ENV.aiModelReflection).toBe(DEFAULT_AI_MODEL_REFLECTION);
  });

  it("allows self-hosters to override feature model IDs", async () => {
    process.env.CHRONICLE_AI_MODEL_HIGHLIGHTS = "selfhost-highlight-model";
    process.env.CHRONICLE_AI_MODEL_REFLECTION = "selfhost-reflection-model";

    const { ENV } = await loadEnv();

    expect(ENV.aiModelHighlights).toBe("selfhost-highlight-model");
    expect(ENV.aiModelReflection).toBe("selfhost-reflection-model");
  });
});
