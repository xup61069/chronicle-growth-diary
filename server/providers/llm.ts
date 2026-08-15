import { ENV } from "../_core/env";

export type LLMProviderName = "forge" | "openai-compatible";

export interface LLMProviderConfig {
  readonly name: LLMProviderName;
  readonly chatCompletionsUrl: string;
  readonly modelsUrl: string;
  readonly apiKey: string;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function buildProviderConfig(): LLMProviderConfig {
  if (ENV.llmDriver === "openai-compatible") {
    if (!ENV.llmBaseUrl || !ENV.llmApiKey) {
      throw new Error(
        "OpenAI-compatible LLM 未設定：請提供 LLM_BASE_URL 與 LLM_API_KEY"
      );
    }
    const baseUrl = normalizeBaseUrl(ENV.llmBaseUrl);
    return {
      name: "openai-compatible",
      chatCompletionsUrl: `${baseUrl}/chat/completions`,
      modelsUrl: `${baseUrl}/models`,
      apiKey: ENV.llmApiKey,
    };
  }

  if (!ENV.forgeApiKey) {
    throw new Error("Forge LLM 未設定：請提供 BUILT_IN_FORGE_API_KEY");
  }
  const baseUrl = normalizeBaseUrl(ENV.forgeApiUrl || "https://forge.manus.im");
  return {
    name: "forge",
    chatCompletionsUrl: `${baseUrl}/v1/chat/completions`,
    modelsUrl: `${baseUrl}/v1/models`,
    apiKey: ENV.forgeApiKey,
  };
}

let provider: LLMProviderConfig | undefined;

export function getLLMProvider(): LLMProviderConfig {
  if (!provider) provider = buildProviderConfig();
  return provider;
}

export function resetLLMProviderForTests() {
  provider = undefined;
}
