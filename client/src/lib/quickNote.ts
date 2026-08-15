export const QUICK_NOTE_STORAGE_KEY = "chronicle.quick-note.v1";

export type QuickNoteDraft = {
  body: string;
  updatedAt: number;
};

export function createQuickNoteDraft(body = "", updatedAt = Date.now()): QuickNoteDraft {
  return { body, updatedAt };
}

export function parseQuickNoteDraft(raw: string | null): QuickNoteDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<QuickNoteDraft>;
    if (typeof parsed.body !== "string" || typeof parsed.updatedAt !== "number") return null;
    return { body: parsed.body, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function formatQuickNoteForClipboard(draft: QuickNoteDraft) {
  const date = new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.updatedAt));
  return `# Chronicle 快速記事\n\n${draft.body.trim()}\n\n— 草稿更新於 ${date}`;
}
