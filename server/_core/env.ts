export const DEFAULT_AI_MODEL_HIGHLIGHTS = "gpt-5-mini";
export const DEFAULT_AI_MODEL_REFLECTION = "claude-haiku-4-5";

function optionalModel(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  authDriver: process.env.AUTH_DRIVER ?? "manus",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  storageDriver: process.env.STORAGE_DRIVER ?? "forge",
  storageS3Bucket: process.env.STORAGE_S3_BUCKET ?? "",
  storageS3Region: process.env.STORAGE_S3_REGION ?? "auto",
  storageS3Endpoint: process.env.STORAGE_S3_ENDPOINT ?? "",
  storageS3AccessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID ?? "",
  storageS3SecretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY ?? "",
  llmDriver: process.env.LLM_DRIVER ?? "forge",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  aiModelHighlights: optionalModel(
    process.env.CHRONICLE_AI_MODEL_HIGHLIGHTS,
    DEFAULT_AI_MODEL_HIGHLIGHTS
  ),
  aiModelReflection: optionalModel(
    process.env.CHRONICLE_AI_MODEL_REFLECTION,
    DEFAULT_AI_MODEL_REFLECTION
  ),
};
