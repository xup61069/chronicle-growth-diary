import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthEventVoiceNotes, growthEvents } from "../../drizzle/schema";
import { safeMediaName } from "../diaryHelpers";
import { storageGetSignedUrl, storagePut } from "../storage";
import { transcribeAudio } from "../_core/voiceTranscription";
import type { TranscriptionError } from "../_core/voiceTranscription";

type DbClient = MySql2Database<Record<string, unknown>>;
type AssertEventWriteAccess = (eventId: number, userId: number) => Promise<unknown>;

export type VoiceNoteInput = {
  userId: number;
  eventId: number;
  fileName: string;
  mimeType: string;
  base64: string;
  durationMs?: number | null;
  language?: string;
  confirmAiProcessing: boolean;
};

function isTranscriptionError(result: Awaited<ReturnType<typeof transcribeAudio>>): result is TranscriptionError {
  return "error" in result;
}

export async function createVoiceNoteForEvent(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, input: VoiceNoteInput) {
  if (!input.confirmAiProcessing) throw new Error("請先確認本次錄音會送往語音轉寫服務。" );
  const event = await db.select({ id: growthEvents.id, shareScope: growthEvents.shareScope, isPublic: growthEvents.isPublic })
    .from(growthEvents).where(eq(growthEvents.id, input.eventId)).limit(1);
  if (!event[0]) throw new Error("找不到這段成長事件。" );
  await assertEventWriteAccess(input.eventId, input.userId);
  if (event[0].shareScope !== "private" || event[0].isPublic) throw new Error("語音日記只能附加在 private 範圍的事件。" );

  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.byteLength) throw new Error("錄音沒有可上傳的內容。" );
  if (bytes.byteLength > 16 * 1024 * 1024) throw new Error("音檔不可超過 16MB。" );
  const fileName = safeMediaName(input.fileName);
  const stored = await storagePut(`growth-diary/${input.userId}/event-${input.eventId}/voice/${Date.now()}-${fileName}`, bytes, input.mimeType);
  const signedUrl = await storageGetSignedUrl(stored.key);
  const transcription = await transcribeAudio({
    audioUrl: signedUrl,
    language: input.language,
    prompt: "Transcribe this private personal growth diary recording faithfully. Preserve the speaker's language and do not infer missing details.",
  });
  if (isTranscriptionError(transcription)) throw new Error(transcription.error);
  const transcript = transcription.text.trim();
  if (!transcript) throw new Error("錄音沒有可保存的逐字稿。" );

  await db.insert(growthEventVoiceNotes).values({
    eventId: input.eventId,
    storageKey: stored.key,
    url: stored.url,
    fileName,
    mimeType: input.mimeType,
    durationMs: input.durationMs ?? null,
    transcript,
    language: transcription.language || input.language || null,
    transcriptionModel: "whisper-1",
  });
  const created = await db.select().from(growthEventVoiceNotes).where(eq(growthEventVoiceNotes.eventId, input.eventId)).orderBy(growthEventVoiceNotes.id);
  return created.at(-1)!;
}

export async function deleteVoiceNoteForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, voiceNoteId: number) {
  const voiceNote = await db.select({ id: growthEventVoiceNotes.id, eventId: growthEventVoiceNotes.eventId })
    .from(growthEventVoiceNotes).where(eq(growthEventVoiceNotes.id, voiceNoteId)).limit(1);
  if (!voiceNote[0]) throw new Error("找不到這段語音日記，或你沒有刪除權限。" );
  await assertEventWriteAccess(voiceNote[0].eventId, userId);
  await db.delete(growthEventVoiceNotes).where(eq(growthEventVoiceNotes.id, voiceNoteId));
  return { id: voiceNoteId };
}
