import { Archive, Check, FileArchive, Loader2, RotateCcw, X } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { createJourneyReviewDraft, finalizeJourneyReviewDraft, type JourneyReviewDraft } from "@/lib/journeyImportDraft";
import { readJourneyImport, type JourneyImportPreview } from "@/lib/journeyImport";

type PrivateJourneyImportProps = {
  disabled: boolean;
  onConfirm: (candidates: JourneyImportPreview["candidates"]) => Promise<void>;
};

export function PrivateJourneyImport({ disabled, onConfirm }: PrivateJourneyImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<JourneyImportPreview | null>(null);
  const [drafts, setDrafts] = useState<JourneyReviewDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = new Set(selectedIds);
  const clear = () => { setPreview(null); setDrafts([]); setSelectedIds([]); setError(null); };
  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsReading(true);
    setError(null);
    try {
      const next = await readJourneyImport(file);
      setPreview(next);
      setDrafts(next.candidates.map(createJourneyReviewDraft));
      setSelectedIds(next.candidates.map((candidate) => candidate.sourceId));
    } catch (readError) {
      setPreview(null);
      setDrafts([]);
      setSelectedIds([]);
      setError(readError instanceof Error ? readError.message : "無法讀取這份 Journey 匯出檔。 ");
    } finally {
      setIsReading(false);
    }
  };
  const confirm = async () => {
    if (!preview) return;
    const selectedDrafts = drafts.filter((candidate) => selected.has(candidate.sourceId));
    if (selectedDrafts.some((candidate) => finalizeJourneyReviewDraft(candidate) === null)) {
      setError("請為每一筆已選 Journey 草稿輸入有效日期與時間，或按重設回到原始日期。 ");
      return;
    }
    setIsConfirming(true);
    try {
      await onConfirm(selectedDrafts.flatMap((candidate) => {
        const finalized = finalizeJourneyReviewDraft(candidate);
        return finalized ? [finalized] : [];
      }));
      clear();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Journey 匯入未完成，沒有保留審核草稿。 ");
    } finally {
      setIsConfirming(false);
    }
  };
  const updateDraft = (sourceId: string, update: Partial<JourneyReviewDraft>) => {
    setDrafts((current) => current.map((candidate) => candidate.sourceId === sourceId ? { ...candidate, ...update } : candidate));
    setError(null);
  };
  const resetDraft = (sourceId: string) => {
    const original = preview?.candidates.find((candidate) => candidate.sourceId === sourceId);
    if (original) updateDraft(sourceId, createJourneyReviewDraft(original));
  };
  return <section className="import-studio journey-import" aria-labelledby="journey-import-title">
    <input ref={inputRef} type="file" accept="application/zip,.zip" hidden onChange={onFileChange} />
    <div><p className="editor-kicker"><span /> JOURNEY / LOCAL REVIEW</p><h2 id="journey-import-title">先審核，再帶入 Journey 日記</h2><p>你選擇 Journey ZIP 並按下讀取後，安全 ZIP 路徑中的 JSON 記事只在這個瀏覽器轉為暫態草稿。可逐項微調標題與日期時間；這一版只保留日期、純文字與受限標籤，媒體、位置、天氣、時區、裝置與來源 metadata 都會捨棄。</p></div>
    <div className="import-warning"><Archive size={15} /> 確認前不會上傳附件、建立事件、保留 ZIP 或連結 Journey 帳號。確認後所有項目一律建立為 private。</div>
    {!preview ? <><div className="import-actions"><button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || isReading}>{isReading ? <Loader2 size={15} className="animate-spin" /> : <FileArchive size={15} />} 選擇 Journey ZIP</button></div>{error ? <p className="import-error" role="alert">{error}</p> : null}</> : <><div className="import-preview-list journey-import-preview" data-testid="journey-import-preview">{drafts.map((candidate) => <article key={candidate.sourceId}><label><input type="checkbox" aria-label={`選取 ${candidate.title || "Journey 草稿"}`} checked={selected.has(candidate.sourceId)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? Array.from(new Set([...ids, candidate.sourceId])) : ids.filter((id) => id !== candidate.sourceId))} disabled={disabled || isConfirming} /> 匯入為 private</label><div className="journey-draft-fields"><label>標題<input aria-label={`Journey 草稿標題 ${candidate.sourceId}`} value={candidate.title} maxLength={180} onChange={(event) => updateDraft(candidate.sourceId, { title: event.target.value.slice(0, 180) })} disabled={disabled || isConfirming} /></label><label>日期與時間<input aria-label={`Journey 草稿日期 ${candidate.sourceId}`} type="datetime-local" value={candidate.dateInput} onChange={(event) => updateDraft(candidate.sourceId, { dateInput: event.target.value })} disabled={disabled || isConfirming} /></label><button type="button" onClick={() => resetDraft(candidate.sourceId)} disabled={disabled || isConfirming}><RotateCcw size={13} /> 重設此筆</button></div><small>{candidate.tagNames.map((tag) => `#${tag}`).join(" ")}</small></article>)}</div><p className="day-one-import-summary">已從 Journey ZIP 建立 {preview.candidates.length} 個暫態草稿；略過 {preview.skippedCount} 筆不完整資料、排除 {preview.duplicateCount} 筆同檔重複資料。標題與日期微調只存在目前瀏覽器；檔名只作為目前預覽的去重鍵，不會保存。</p>{error ? <p className="import-error" role="alert">{error}</p> : null}<div className="import-actions"><button type="button" onClick={clear} disabled={isConfirming}><X size={15} /> 取消</button><button type="button" onClick={confirm} disabled={disabled || isConfirming || !selectedIds.length}>{isConfirming ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 確認建立 {selectedIds.length} 段 private 記錄</button></div></>}
  </section>;
}
