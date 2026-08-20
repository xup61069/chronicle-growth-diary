import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storagePut: vi.fn(),
  storageGetSignedUrl: vi.fn(),
  transcribeAudio: vi.fn(),
}));

vi.mock("../storage", () => ({
  storagePut: mocks.storagePut,
  storageGetSignedUrl: mocks.storageGetSignedUrl,
}));
vi.mock("../_core/voiceTranscription", () => ({ transcribeAudio: mocks.transcribeAudio }));

import { createVoiceNoteForEvent } from "./voiceNotes";

function eventSelect(event: { id: number; shareScope: string; isPublic: boolean }) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([event]) })),
    })),
  };
}

function voiceSelect(note: { id: number; eventId: number; transcript: string }) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([note]) })),
    })),
  };
}

describe("voice diary storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storagePut.mockResolvedValue({ key: "growth-diary/1/event-8/voice/note.webm", url: "/manus-storage/growth-diary/1/event-8/voice/note.webm" });
    mocks.storageGetSignedUrl.mockResolvedValue("https://storage.example.test/signed-voice-note");
    mocks.transcribeAudio.mockResolvedValue({ task: "transcribe", language: "zh", duration: 1.2, text: "今天完成了第一份作品。", segments: [] });
  });

  it("requires fresh consent before reading, storing, or transcribing a recording", async () => {
    const db = { select: vi.fn(), insert: vi.fn() } as never;
    const assertWriteAccess = vi.fn();

    await expect(createVoiceNoteForEvent(db, assertWriteAccess, {
      userId: 1, eventId: 8, fileName: "note.webm", mimeType: "audio/webm", base64: "AQID", confirmAiProcessing: false,
    })).rejects.toThrow("請先確認本次錄音會送往語音轉寫服務");

    expect(assertWriteAccess).not.toHaveBeenCalled();
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
  });

  it("rejects a public or link-shared event before an audio object is stored", async () => {
    const db = { select: vi.fn(() => eventSelect({ id: 8, shareScope: "link", isPublic: false })), insert: vi.fn() } as never;
    const assertWriteAccess = vi.fn();

    await expect(createVoiceNoteForEvent(db, assertWriteAccess, {
      userId: 1, eventId: 8, fileName: "note.webm", mimeType: "audio/webm", base64: "AQID", confirmAiProcessing: true,
    })).rejects.toThrow("private 範圍");

    expect(assertWriteAccess).toHaveBeenCalledWith(8, 1);
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("stores private metadata only after a successful transcription", async () => {
    const note = { id: 31, eventId: 8, transcript: "今天完成了第一份作品。" };
    const values = vi.fn().mockResolvedValue(undefined);
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(eventSelect({ id: 8, shareScope: "private", isPublic: false }))
        .mockReturnValueOnce(voiceSelect(note)),
      insert: vi.fn(() => ({ values })),
    } as never;
    const assertWriteAccess = vi.fn();

    await expect(createVoiceNoteForEvent(db, assertWriteAccess, {
      userId: 1, eventId: 8, fileName: "今天的錄音.webm", mimeType: "audio/webm", base64: "AQID", durationMs: 1200, language: "zh", confirmAiProcessing: true,
    })).resolves.toEqual(note);

    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringContaining("growth-diary/1/event-8/voice/"), expect.any(Buffer), "audio/webm");
    expect(mocks.transcribeAudio).toHaveBeenCalledWith(expect.objectContaining({ audioUrl: "https://storage.example.test/signed-voice-note", language: "zh" }));
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ eventId: 8, transcript: "今天完成了第一份作品。", language: "zh", durationMs: 1200 }));
  });
});
