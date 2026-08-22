import { Check, Edit3, Loader2, LockKeyhole, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

type FamilyMilestone = { id: number; occurredAt: number; datePrecision: "day" | "month" | "year"; title: string; summary: string; sourceEventId?: number | null; updatedAt: Date | string };
type FamilyMilestoneDraft = { occurredAt: string; datePrecision: FamilyMilestone["datePrecision"]; title: string; summary: string; sourceEventId: string };
const emptyDraft = (): FamilyMilestoneDraft => ({ occurredAt: new Date().toISOString().slice(0, 10), datePrecision: "day", title: "", summary: "", sourceEventId: "" });

type FamilyMilestoneLayerProps = {
  milestones: FamilyMilestone[];
  canManage: boolean;
  sourceEvents: Array<{ id: number; title: string }>;
  isSaving: boolean;
  onCreate: (input: { occurredAt: number; datePrecision: FamilyMilestone["datePrecision"]; title: string; summary: string; sourceEventId: number | null }) => Promise<void>;
  onUpdate: (id: number, input: { occurredAt: number; datePrecision: FamilyMilestone["datePrecision"]; title: string; summary: string; sourceEventId: number | null }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function dateForInput(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

export function FamilyMilestoneLayer({ milestones, canManage, sourceEvents, isSaving, onCreate, onUpdate, onDelete }: FamilyMilestoneLayerProps) {
  const [draft, setDraft] = useState<FamilyMilestoneDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const submit = async () => {
    const occurredAt = new Date(`${draft.occurredAt}T12:00:00`).getTime();
    if (!draft.title.trim() || !draft.summary.trim() || Number.isNaN(occurredAt)) return;
    const input = { occurredAt, datePrecision: draft.datePrecision, title: draft.title, summary: draft.summary, sourceEventId: draft.sourceEventId ? Number(draft.sourceEventId) : null };
    if (editingId) await onUpdate(editingId, input);
    else await onCreate(input);
    setDraft(emptyDraft());
    setEditingId(null);
    setIsOpen(false);
  };
  const startEdit = (milestone: FamilyMilestone) => {
    setEditingId(milestone.id);
    setDraft({ occurredAt: dateForInput(milestone.occurredAt), datePrecision: milestone.datePrecision, title: milestone.title, summary: milestone.summary, sourceEventId: milestone.sourceEventId ? String(milestone.sourceEventId) : "" });
    setIsOpen(true);
  };
  return <section className="family-milestone-layer" aria-labelledby="family-milestone-title">
    <header><div><p className="editor-kicker"><span /> FAMILY MILESTONES / OPTIONAL</p><h2 id="family-milestone-title">把要一起記得的事，另寫成家庭大事記</h2><p>這是一層獨立的 family-only 摘要。只有日記擁有者可新增或修改；已接受邀請的家人只會看到你手動寫下的日期、標題和短摘要，不會取得原始日記、照片、語音或 GPS。</p></div>{canManage ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsOpen((open) => !open); }} disabled={isSaving}>{isOpen ? <X size={15} /> : <Plus size={15} />}{isOpen ? "收起" : "新增大事記"}</button> : <span className="family-milestone-readonly"><LockKeyhole size={14} /> family-only 閱讀</span>}</header>
    {canManage && isOpen ? <div className="family-milestone-form"><label>日期<input aria-label="家庭大事記日期" type="date" value={draft.occurredAt} onChange={(event) => setDraft((current) => ({ ...current, occurredAt: event.target.value }))} disabled={isSaving} /></label><label>日期精度<select aria-label="家庭大事記日期精度" value={draft.datePrecision} onChange={(event) => setDraft((current) => ({ ...current, datePrecision: event.target.value as FamilyMilestone["datePrecision"] }))} disabled={isSaving}><option value="day">日</option><option value="month">月</option><option value="year">年</option></select></label><label>標題<input aria-label="家庭大事記標題" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value.slice(0, 180) }))} maxLength={180} disabled={isSaving} /></label><label>短摘要<textarea aria-label="家庭大事記短摘要" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value.slice(0, 480) }))} maxLength={480} rows={3} disabled={isSaving} /></label><label>連結現有事件（選填）<select aria-label="連結現有事件" value={draft.sourceEventId} onChange={(event) => setDraft((current) => ({ ...current, sourceEventId: event.target.value }))} disabled={isSaving}><option value="">不連結，只分享這段摘要</option>{sourceEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><footer><small>連結只用於 owner 內部整理；不會向家人投影原始事件的內容或媒體。</small><div><button type="button" onClick={() => { setDraft(emptyDraft()); setEditingId(null); setIsOpen(false); }} disabled={isSaving}>取消</button><button type="button" onClick={submit} disabled={isSaving || !draft.occurredAt || !draft.title.trim() || !draft.summary.trim()}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{editingId ? "更新摘要" : "加入 family-only 圖層"}</button></div></footer></div> : null}
    <div className="family-milestone-list">{milestones.length ? milestones.map((milestone) => <article key={milestone.id}><time>{new Date(milestone.occurredAt).toLocaleDateString("zh-TW", { year: "numeric", month: milestone.datePrecision === "year" ? undefined : "long", day: milestone.datePrecision === "day" ? "numeric" : undefined })}</time><div><h3>{milestone.title}</h3><p>{milestone.summary}</p></div>{canManage ? <nav aria-label={`${milestone.title} 管理`}><button type="button" onClick={() => startEdit(milestone)} disabled={isSaving}><Edit3 size={14} /> 編輯</button><button type="button" onClick={() => void onDelete(milestone.id)} disabled={isSaving}><Trash2 size={14} /> 刪除</button></nav> : null}</article>) : <p className="family-milestone-empty">尚未選擇要放進 family-only 圖層的事件。這不會影響原有私人日記。</p>}</div>
  </section>;
}
