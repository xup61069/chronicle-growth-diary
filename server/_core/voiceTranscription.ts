import { ENV } from "./env";

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "SERVICE_ERROR";
};

const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

function extensionForMimeType(mimeType: string) {
  return {
    "audio/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
  }[mimeType] ?? "audio";
}

/** Sends one already-stored audio object to the built-in Whisper endpoint. */
export async function transcribeAudio(options: { audioUrl: string; language?: string; prompt?: string }): Promise<WhisperResponse | TranscriptionError> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return { error: "語音轉寫服務暫時未設定。", code: "SERVICE_ERROR" };

  let audioBuffer: Buffer;
  let mimeType: string;
  try {
    const source = await fetch(options.audioUrl);
    if (!source.ok) return { error: "無法讀取剛剛儲存的音檔。", code: "INVALID_FORMAT" };
    audioBuffer = Buffer.from(await source.arrayBuffer());
    mimeType = source.headers.get("content-type")?.split(";")[0]?.trim() || "audio/webm";
  } catch {
    return { error: "無法讀取剛剛儲存的音檔。", code: "SERVICE_ERROR" };
  }

  if (!audioBuffer.byteLength) return { error: "錄音沒有可轉寫的內容。", code: "INVALID_FORMAT" };
  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) return { error: "音檔超過 16MB，請縮短錄音後再試。", code: "FILE_TOO_LARGE" };

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `voice-note.${extensionForMimeType(mimeType)}`);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("prompt", options.prompt ?? "Transcribe this personal voice diary faithfully. Preserve the speaker's language and do not add content.");
  if (options.language) form.append("language", options.language);

  const endpoint = new URL("v1/audio/transcriptions", `${ENV.forgeApiUrl.replace(/\/+$/, "")}/`).toString();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${ENV.forgeApiKey}`, "Accept-Encoding": "identity" },
      body: form,
    });
    if (!response.ok) return { error: "語音轉寫暫時無法完成，請稍後再試。", code: "TRANSCRIPTION_FAILED" };
    const result = await response.json() as WhisperResponse;
    if (!result.text || typeof result.text !== "string") return { error: "語音轉寫回傳格式不完整。", code: "SERVICE_ERROR" };
    return result;
  } catch {
    return { error: "語音轉寫暫時無法完成，請稍後再試。", code: "SERVICE_ERROR" };
  }
}
