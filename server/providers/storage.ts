import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "../_core/env";

export type StoredObject = { key: string; url: string };

export interface StorageProvider {
  readonly name: "forge" | "s3";
  put(
    relativeKey: string,
    data: Buffer | Uint8Array | string,
    contentType?: string
  ): Promise<StoredObject>;
  get(relativeKey: string): Promise<StoredObject>;
  getSignedUrl(relativeKey: string): Promise<string>;
}

function normalizeKey(relativeKey: string) {
  return relativeKey.replace(/^\/+/, "");
}

function appendHashSuffix(relativeKey: string) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relativeKey.lastIndexOf(".");
  return lastDot === -1
    ? `${relativeKey}_${hash}`
    : `${relativeKey.slice(0, lastDot)}_${hash}${relativeKey.slice(lastDot)}`;
}

class ForgeStorageProvider implements StorageProvider {
  readonly name = "forge" as const;

  private getConfig() {
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      throw new Error(
        "Forge 儲存未設定：請提供 BUILT_IN_FORGE_API_URL 與 BUILT_IN_FORGE_API_KEY"
      );
    }
    return {
      apiUrl: ENV.forgeApiUrl.replace(/\/+$/, ""),
      apiKey: ENV.forgeApiKey,
    };
  }

  async put(
    relativeKey: string,
    data: Buffer | Uint8Array | string,
    contentType = "application/octet-stream"
  ): Promise<StoredObject> {
    const { apiUrl, apiKey } = this.getConfig();
    const key = appendHashSuffix(normalizeKey(relativeKey));
    const presignUrl = new URL("v1/storage/presign/put", `${apiUrl}/`);
    presignUrl.searchParams.set("path", key);
    const presignResponse = await fetch(presignUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!presignResponse.ok) {
      throw new Error(`Forge 儲存簽章失敗（${presignResponse.status}）`);
    }
    const { url } = (await presignResponse.json()) as { url?: string };
    if (!url) throw new Error("Forge 儲存簽章回應缺少 URL");

    const bytes = typeof data === "string" ? undefined : new Uint8Array(data);
    const uploadResponse = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body:
        typeof data === "string"
          ? new Blob([data], { type: contentType })
          : new Blob([bytes!.buffer as ArrayBuffer], { type: contentType }),
    });
    if (!uploadResponse.ok) {
      throw new Error(`Forge 儲存上傳失敗（${uploadResponse.status}）`);
    }
    return { key, url: `/manus-storage/${key}` };
  }

  async get(relativeKey: string) {
    const key = normalizeKey(relativeKey);
    return { key, url: `/manus-storage/${key}` };
  }

  async getSignedUrl(relativeKey: string) {
    const { apiUrl, apiKey } = this.getConfig();
    const key = normalizeKey(relativeKey);
    const signedUrl = new URL("v1/storage/presign/get", `${apiUrl}/`);
    signedUrl.searchParams.set("path", key);
    const response = await fetch(signedUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`Forge 讀取簽章失敗（${response.status}）`);
    }
    const { url } = (await response.json()) as { url?: string };
    if (!url) throw new Error("Forge 讀取簽章回應缺少 URL");
    return url;
  }
}

class S3StorageProvider implements StorageProvider {
  readonly name = "s3" as const;
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (
      !ENV.storageS3Bucket ||
      !ENV.storageS3AccessKeyId ||
      !ENV.storageS3SecretAccessKey
    ) {
      throw new Error(
        "S3 儲存未設定：請提供 STORAGE_S3_BUCKET、STORAGE_S3_ACCESS_KEY_ID 與 STORAGE_S3_SECRET_ACCESS_KEY"
      );
    }
    this.bucket = ENV.storageS3Bucket;
    this.client = new S3Client({
      region: ENV.storageS3Region,
      ...(ENV.storageS3Endpoint
        ? { endpoint: ENV.storageS3Endpoint, forcePathStyle: true }
        : {}),
      credentials: {
        accessKeyId: ENV.storageS3AccessKeyId,
        secretAccessKey: ENV.storageS3SecretAccessKey,
      },
    });
  }

  async put(
    relativeKey: string,
    data: Buffer | Uint8Array | string,
    contentType = "application/octet-stream"
  ): Promise<StoredObject> {
    const key = appendHashSuffix(normalizeKey(relativeKey));
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
    return { key, url: `/manus-storage/${key}` };
  }

  async get(relativeKey: string) {
    const key = normalizeKey(relativeKey);
    return { key, url: `/manus-storage/${key}` };
  }

  getSignedUrl(relativeKey: string) {
    return getS3SignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: normalizeKey(relativeKey) }),
      { expiresIn: 900 }
    );
  }
}

let provider: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  provider = ENV.storageDriver === "s3" ? new S3StorageProvider() : new ForgeStorageProvider();
  return provider;
}

export function resetStorageProviderForTests() {
  provider = undefined;
}
