import { formatVoiceDuration, type QueuedVoiceDraft } from "@/lib/voiceDrafts";
import { Loader2, LockKeyhole, Mic, Square, Trash2, Upload } from "lucide-react";
import React from "react";

type PrivateVoiceNote = {
  id: number;
  fileName: string;
  durationMs: number | null;
  language: string | null;
  url: string;
  transcript: string | null;
};

type PrivateVoiceDiaryProps = {
  shareScope: "private" | "public" | "link";
  canEdit: boolean;
  isRecording: boolean;
  isPreparing: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  drafts: QueuedVoiceDraft[];
  voiceNotes: PrivateVoiceNote[];
  aiConsent: boolean;
  onConsentChange: (enabled: boolean) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDiscardDraft: (draft: QueuedVoiceDraft) => void;
  onUploadDraft: (draft: QueuedVoiceDraft) => void;
  onDeleteVoiceNote: (voiceNoteId: number) => void;
};

/**
 * Presentation-only private voice diary. The parent owns MediaRecorder,
 * IndexedDB drafts, consent state, and all tRPC mutations.
 */
export function PrivateVoiceDiary({
  shareScope,
  canEdit,
  isRecording,
  isPreparing,
  isUploading,
  isDeleting,
  drafts,
  voiceNotes,
  aiConsent,
  onConsentChange,
  onStartRecording,
  onStopRecording,
  onDiscardDraft,
  onUploadDraft,
  onDeleteVoiceNote,
}: PrivateVoiceDiaryProps) {
  return <section className="voice-diary" aria-labelledby="voice-diary-title">
    <header><span id="voice-diary-title"><Mic size={14} /> VOICE DIARY / PRIVATE</span><small>{shareScope === "private" ? "只限這段私人事件" : "需要完全私人範圍"}</small></header>
    {shareScope !== "private" ? <p className="voice-diary-private-note"><LockKeyhole size={13} /> 語音日記不會出現在公開或連結分享。請先將這段事件設為「私人」後再錄音。</p> : <>
      <p>錄音會先保存在這台裝置。只有你按下「上傳並轉寫」且勾選本次同意後，音檔才會送往語音轉寫服務。</p>
      {canEdit ? <div className="voice-diary-actions"><button type="button" className={isRecording ? "voice-recording" : ""} onClick={isRecording ? onStopRecording : onStartRecording} disabled={isPreparing || isUploading}>{isRecording ? <><Square size={13} /> 停止並保留</> : <><Mic size={13} /> 開始錄音</>}</button>{isPreparing ? <span><Loader2 size={13} className="animate-spin" /> 正在保存到這台裝置…</span> : null}</div> : <p className="voice-diary-private-note">只有可編輯者能新增或移除語音日記。</p>}
      <p className="voice-diary-status" role="status" aria-live="polite">{isRecording ? "錄音中；停止後會先保留在這台裝置。" : isPreparing ? "正在將錄音保留在這台裝置。" : drafts.length ? `有 ${drafts.length} 段錄音尚未上傳。` : "尚未有待上傳的錄音。"}</p>
      {canEdit && drafts.length ? <><label className="voice-diary-consent"><input type="checkbox" checked={aiConsent} onChange={(event) => onConsentChange(event.target.checked)} disabled={isUploading} />我確認本次上傳的錄音會送往語音轉寫服務建立逐字稿；完成後必須再次確認。</label><div className="voice-diary-queue"><h4>THIS DEVICE / NOT UPLOADED</h4>{drafts.map((draft) => <article className="voice-note-item" key={draft.id}><div><b>{draft.fileName}</b><small>{formatVoiceDuration(draft.durationMs)} · 僅此裝置</small></div><footer><button type="button" onClick={() => onDiscardDraft(draft)} disabled={isUploading}><Trash2 size={12} /> 移除本機草稿</button><button type="button" onClick={() => onUploadDraft(draft)} disabled={!aiConsent || isUploading}>{isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} 上傳並轉寫</button></footer></article>)}</div></> : null}
      {voiceNotes.length ? <div className="voice-diary-library"><h4>PRIVATE RECORDINGS</h4>{voiceNotes.map((voiceNote) => <article className="voice-note-item" key={voiceNote.id}><div><b>{voiceNote.fileName}</b><small>{formatVoiceDuration(voiceNote.durationMs ?? 0)} · {voiceNote.language?.toUpperCase() ?? "語言未標示"}</small></div><audio controls preload="metadata" src={voiceNote.url}>你的瀏覽器不支援音訊播放。</audio><p>{voiceNote.transcript}</p>{canEdit ? <footer><button type="button" onClick={() => onDeleteVoiceNote(voiceNote.id)} disabled={isDeleting}><Trash2 size={12} /> 刪除原音與逐字稿</button></footer> : null}</article>)}</div> : null}
    </>}
  </section>;
}
