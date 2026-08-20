const DATABASE_NAME = "chronicle-voice-drafts";
const STORE_NAME = "drafts";

export type QueuedVoiceDraft = {
  id: string;
  eventId: number;
  blob: Blob;
  mimeType: string;
  fileName: string;
  durationMs: number;
  createdAt: number;
};

function openVoiceDraftDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error("無法開啟本機語音草稿。"));
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
  });
}

function getAll<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("本機語音草稿操作失敗。"));
    request.onsuccess = () => resolve(request.result);
  });
}

export function makeVoiceDraftFileName(mimeType: string, now = Date.now()) {
  const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3" : mimeType.includes("wav") ? "wav" : mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : "webm";
  return `voice-note-${new Date(now).toISOString().replace(/[:.]/g, "-")}.${extension}`;
}

export function formatVoiceDuration(durationMs: number) {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export async function queueVoiceDraft(draft: QueuedVoiceDraft) {
  const db = await openVoiceDraftDatabase();
  await getAll(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(draft));
  db.close();
}

export async function listVoiceDrafts(eventId: number) {
  const db = await openVoiceDraftDatabase();
  const drafts = await getAll(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll()) as QueuedVoiceDraft[];
  db.close();
  return drafts.filter((draft) => draft.eventId === eventId).sort((left, right) => right.createdAt - left.createdAt);
}

export async function removeVoiceDraft(id: string) {
  const db = await openVoiceDraftDatabase();
  await getAll(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id));
  db.close();
}

export async function voiceBlobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 32_768;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    const chunk = bytes.subarray(start, start + chunkSize);
    for (let index = 0; index < chunk.length; index += 1) binary += String.fromCharCode(chunk[index]!);
  }
  return window.btoa(binary);
}
