import { getIcsOccurrenceImportPlan, parseIcsCalendar, selectedIcsImportCandidates, updateIcsImportCandidate, type IcsImportCandidate, type IcsImportPreview } from "@/lib/icsCalendarImport";
import { CalendarDays, Check, FileUp, Loader2, LockKeyhole, X } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

type PrivateIcsCalendarImportProps = {
  isImporting: boolean;
  onConfirm: (candidates: IcsImportCandidate[]) => Promise<void>;
};

function toInputDateTime(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PrivateIcsCalendarImport({ isImporting, onConfirm }: PrivateIcsCalendarImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<IcsImportPreview | null>(null);
  const [isReading, setIsReading] = useState(false);

  const chooseFile = () => inputRef.current?.click();
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("ICS 檔案不可超過 2MB。 ");
    if (!file.name.toLowerCase().endsWith(".ics") && file.type !== "text/calendar") return toast.error("請選擇 .ics 行事曆檔案。 ");
    setIsReading(true);
    try {
      setPreview(parseIcsCalendar(await file.text()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法讀取 ICS 檔。 ");
    } finally {
      setIsReading(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    const plan = getIcsOccurrenceImportPlan(preview);
    if (!plan.candidates.length) return toast.error("請至少選擇一個日曆事件。 ");
    if (plan.omittedCount) return toast.error(`本次選擇超過 250 段私人草稿上限。請減少週期展開或取消部分事件。`);
    try {
      await onConfirm(plan.candidates);
      setPreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法建立私人行事曆記錄。審核草稿仍保留在此頁。" );
    }
  };

  const occurrencePlan = preview ? getIcsOccurrenceImportPlan(preview) : null;
  return <>
    <input ref={inputRef} type="file" accept=".ics,text/calendar" onChange={handleFile} hidden />
    <section className="import-studio" aria-labelledby="ics-import-title">
      <div><p className="editor-kicker"><span /> CALENDAR / LOCAL REVIEW</p><h2 id="ics-import-title">從家庭行事曆建立草稿</h2><p>選取 `.ics` 後只在目前瀏覽器解析。提醒、受邀者、主辦人、會議網址、附件與重複規則不會帶入；確認前不會寫入日記。</p></div>
      <div className="import-warning"><LockKeyhole size={15} /> 確認後才建立 private 事件，並標記「行事曆匯入」。不會連接日曆帳號或讀取外部 URL。</div>
      <div className="import-actions"><button type="button" onClick={chooseFile} disabled={isReading || isImporting}>{isReading ? <Loader2 size={15} className="animate-spin" /> : <CalendarDays size={15} />} 選擇 ICS 檔案</button></div>
    </section>
    {preview ? <section className="import-studio" aria-labelledby="ics-review-title">
      <div><p className="editor-kicker"><span /> ICS DRAFT / PRIVATE</p><h2 id="ics-review-title">審核日曆事件</h2><p>可勾選、改寫標題、說明與日期。週期性行程預設只保留起始事件；如需展開，請在每個項目明確選擇有限次數，確認前不會寫入。</p></div>
      <div className="import-preview-list">{preview.candidates.map((candidate) => <article key={candidate.id}><span>{candidate.allDay ? "全天" : "定時"}</span><div><label><input type="checkbox" checked={candidate.selected} onChange={(event) => setPreview((current) => current ? updateIcsImportCandidate(current, candidate.id, { selected: event.target.checked }) : current)} disabled={isImporting} /> 匯入這個草稿</label><input aria-label={`${candidate.title}的標題`} value={candidate.title} maxLength={180} onChange={(event) => setPreview((current) => current ? updateIcsImportCandidate(current, candidate.id, { title: event.target.value }) : current)} disabled={isImporting} /><textarea aria-label={`${candidate.title}的說明`} value={candidate.body} maxLength={8000} onChange={(event) => setPreview((current) => current ? updateIcsImportCandidate(current, candidate.id, { body: event.target.value }) : current)} disabled={isImporting} /><input aria-label={`${candidate.title}的日期與時間`} type="datetime-local" value={toInputDateTime(candidate.occurredAt)} onChange={(event) => { const next = new Date(event.target.value).getTime(); if (Number.isFinite(next)) setPreview((current) => current ? updateIcsImportCandidate(current, candidate.id, { occurredAt: next }) : current); }} disabled={isImporting} />{candidate.isRecurring ? <label>週期處理<select aria-label={`${candidate.title}的週期處理`} value={candidate.recurrenceHandling} onChange={(event) => setPreview((current) => current ? updateIcsImportCandidate(current, candidate.id, { recurrenceHandling: event.target.value as "base" | "next_4" | "next_12" }) : current)} disabled={isImporting}><option value="base">只匯入起始事件（1 段）</option>{candidate.recurrenceOccurrences.length >= 4 ? <option value="next_4">匯入接下來 4 次</option> : null}{candidate.recurrenceOccurrences.length >= 12 ? <option value="next_12">匯入接下來 12 次</option> : null}</select></label> : null}<small>{candidate.isRecurring ? `週期事件：${candidate.recurrenceRule ?? "本機日期規則"}；只會建立所選的私人草稿` : "單次事件"} · source UID 僅用於本機審核</small></div></article>)}{preview.skipped.map((item, index) => <article key={`${item.sourceUid ?? "skip"}-${index}`}><span>略過</span><b>{item.sourceUid ?? "無 UID 事件"}</b><small>{item.reason}</small></article>)}</div>
      <div className="import-warning"><LockKeyhole size={15} /> {preview.warnings.join(" ")}</div>
      <div className="import-actions"><button type="button" onClick={() => setPreview(null)} disabled={isImporting}><X size={15} /> 取消</button><button type="button" onClick={() => void confirm()} disabled={isImporting || !selectedIcsImportCandidates(preview).length || Boolean(occurrencePlan?.omittedCount)}>{isImporting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 確認建立 {occurrencePlan?.candidates.length ?? 0} 段私人記錄</button></div>
    </section> : null}
  </>;
}
