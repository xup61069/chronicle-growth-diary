import { getStorageProvider } from "./providers/storage";

export type { StorageProvider, StoredObject } from "./providers/storage";
export { getStorageProvider } from "./providers/storage";

export function storagePut(
  relativeKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
) {
  return getStorageProvider().put(relativeKey, data, contentType);
}

export function storageGet(relativeKey: string) {
  return getStorageProvider().get(relativeKey);
}

export function storageGetSignedUrl(relativeKey: string) {
  return getStorageProvider().getSignedUrl(relativeKey);
}
