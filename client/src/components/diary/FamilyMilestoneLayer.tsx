import { Check, Edit3, Loader2, LockKeyhole, Plus, Trash2, UsersRound, X } from "lucide-react";
import { useState } from "react";

type AudienceMode = "all_accepted" | "selected_members";
type FamilyMilestone = { id: number; occurredAt: number; datePrecision: "day" | "month" | "year"; title: string; summary: string; sourceEventId?: number | null; audienceMode?: AudienceMode; audienceMemberIds?: number[]; updatedAt: Date | string };
type FamilyMember = { id: number; name: string | null; email: string | null; role: "editor" | "commenter" };
type FamilyMilestoneDraft = { occurredAt: string; datePrecision: FamilyMilestone["datePrecision"]; title: string; summary: string; sourceEventId: string; audienceMode: AudienceMode; audienceMemberIds: number[] };

const emptyDraft = (): FamilyMilestoneDraft => ({ occurredAt: new Date().toISOString().slice(0, 10), datePrecision: "day", title: "", summary: "", sourceEventId: "", audienceMode: "selected_members", audienceMemberIds: [] });

type FamilyMilestoneInput = { occurredAt: number; datePrecision: FamilyMilestone["datePrecision"]; title: string; summary: string; sourceEventId: number | null; audienceMode: AudienceMode; audienceMemberIds: number[] };
type FamilyMilestoneLayerProps = {
  milestones: FamilyMilestone[];
  canManage: boolean;
  sourceEvents: Array<{ id: number; title: string }>;
  familyMembers: FamilyMember[];
  isSaving: boolean;
  onCreate: (input: FamilyMilestoneInput) => Promise<void>;
  onUpdate: (id: number, input: FamilyMilestoneInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function dateForInput(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function memberLabel(member: FamilyMember) {
  return member.name?.trim() || member.email || `家庭成員 #${member.id}`;
}

export function FamilyMilestoneLayer({ milestones, canManage, sourceEvents, familyMembers, isSaving, onCreate, onUpdate, onDelete }: FamilyMilestoneLayerProps) {
  const [draft, setDraft] = useState<FamilyMilestoneDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const hasValidAudience = draft.audienceMode === "all_accepted" || draft.audienceMemberIds.length > 0;
  const toggleAudienceMember = (memberId: number) => setDraft((current) => ({ ...current, audienceMemberIds: current.audienceMemberIds.includes(memberId) ? current.audienceMemberIds.filter((id) => id !== memberId) : [...current.audienceMemberIds, memberId].sort((a, b) => a - b) }));
  const submit = async () => {
    const occurredAt = new Date(`${draft.occurredAt}T12:00:00`).getTime();
    if (!draft.title.trim() || !draft.summary.trim() || Number.isNaN(occurredAt) || !hasValidAudience) return;
    const input: FamilyMilestoneInput = { occurredAt, datePrecision: draft.datePrecision, title: draft.title, summary: draft.summary, sourceEventId: draft.sourceEventId ? Number(draft.sourceEventId) : null, audienceMode: draft.audienceMode, audienceMemberIds: draft.audienceMode === "selected_members" ? draft.audienceMemberIds : [] };
    if (editingId) await onUpdate(editingId, input);
    else await onCreate(input);
    setDraft(emptyDraft());
    setEditingId(null);
    setIsOpen(false);
  };
  const startEdit = (milestone: FamilyMilestone) => {
    setEditingId(milestone.id);
    setDraft({ occurredAt: dateForInput(milestone.occurredAt), datePrecision: milestone.datePrecision, title: milestone.title, summary: milestone.summary, sourceEventId: milestone.sourceEventId ? String(milestone.sourceEventId) : "", audienceMode: milestone.audienceMode ?? "all_accepted", audienceMemberIds: milestone.audienceMemberIds ?? [] });
    setIsOpen(true);
  };
  return <section className="family-milestone-layer" aria-labelledby="family-milestone-title">
    <header><div><p className="editor-kicker"><span /> FAMILY MILESTONES / OPTIONAL</p><h2 id="family-milestone-title">把要一起記得的事，另寫成家庭大事記</h2><p>這是一層獨立的 family-only 摘要。只有日記擁有者可新增或修改；家人只會看到你明確授權的日期、標題和短摘要，不會取得原始日記、照片、語音或 GPS。</p></div>{canManage ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsOpen((open) => !open); }} disabled={isSaving}>{isOpen ? <X size={15} /> : <Plus size={15} />}{isOpen ? "收起" : "新增大事記"}</button> : <span className="family-milestone-readonly"><LockKeyhole size={14} /> family-only 閱讀</span>}</header>
    {canManage && isOpen ? <div className="family-milestone-form"><label>日期<input aria-label="家庭大事記日期" type="date" value={draft.occurredAt} onChange={(event) => setDraft((current) => ({ ...current, occurredAt: event.target.value }))} disabled={isSaving} /></label><label>日期精度<select aria-label="家庭大事記日期精度" value={draft.datePrecision} onChange={(event) => setDraft((current) => ({ ...current, datePrecision: event.target.value as FamilyMilestone["datePrecision"] }))} disabled={isSaving}><option value="day">日</option><option value="month">月</option><option value="year">年</option></select></label><label>標題<input aria-label="家庭大事記標題" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value.slice(0, 180) }))} maxLength={180} disabled={isSaving} /></label><label>短摘要<textarea aria-label="家庭大事記短摘要" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value.slice(0, 480) }))} maxLength={480} rows={3} disabled={isSaving} /></label><label>連結現有事件（選填）<select aria-label="連結現有事件" value={draft.sourceEventId} onChange={(event) => setDraft((current) => ({ ...current, sourceEventId: event.target.value }))} disabled={isSaving}><option value="">不連結，只分享這段摘要</option>{sourceEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><fieldset className="family-milestone-audience" disabled={isSaving}><legend><UsersRound size={14} />誰可以看到這一筆？</legend><label><input type="radio" name="family-milestone-audience" checked={draft.audienceMode === "selected_members"} onChange={() => setDraft((current) => ({ ...current, audienceMode: "selected_members" }))} />指定已接受的家庭成員</label><label><input type="radio" name="family-milestone-audience" checked={draft.audienceMode === "all_accepted"} onChange={() => setDraft((current) => ({ ...current, audienceMode: "all_accepted", audienceMemberIds: [] }))} />所有已接受的家庭成員（目前 {familyMembers.length} 位）</label>{draft.audienceMode === "selected_members" ? <div className="family-milestone-member-picker" aria-live="polite">{familyMembers.length ? familyMembers.map((member) => <label key={member.id}><input aria-label={`選擇 ${memberLabel(member)}`} type="checkbox" checked={draft.audienceMemberIds.includes(member.id)} onChange={() => toggleAudienceMember(member.id)} /> <span>{memberLabel(member)}</span><small>{member.role === "editor" ? "共同編輯" : "註解"}</small></label>) : <p>尚無已接受的家庭成員，暫時無法建立指定對象的大事記。</p>}<small>被選擇的成員只會看到日期、標題與短摘要；未選成員不會得知此項目存在。</small></div> : <small>所有目前已接受的家庭成員都只會看到日期、標題與短摘要。</small>}</fieldset><footer><small>連結只用於 owner 內部整理；不會向家人投影原始事件的內容或媒體。</small><div><button type="button" onClick={() => { setDraft(emptyDraft()); setEditingId(null); setIsOpen(false); }} disabled={isSaving}>取消</button><button type="button" onClick={submit} disabled={isSaving || !draft.occurredAt || !draft.title.trim() || !draft.summary.trim() || !hasValidAudience}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{editingId ? "更新摘要" : "加入 family-only 圖層"}</button></div></footer></div> : null}
    <div className="family-milestone-list">{milestones.length ? milestones.map((milestone) => <article key={milestone.id}><time>{new Date(milestone.occurredAt).toLocaleDateString("zh-TW", { year: "numeric", month: milestone.datePrecision === "year" ? undefined : "long", day: milestone.datePrecision === "day" ? "numeric" : undefined })}</time><div><h3>{milestone.title}</h3><p>{milestone.summary}</p>{canManage ? <small className="family-milestone-audience-label">{milestone.audienceMode === "selected_members" ? `指定 ${milestone.audienceMemberIds?.length ?? 0} 位成員` : "所有已接受成員"}</small> : null}</div>{canManage ? <nav aria-label={`${milestone.title} 管理`}><button type="button" onClick={() => startEdit(milestone)} disabled={isSaving}><Edit3 size={14} /> 編輯</button><button type="button" onClick={() => void onDelete(milestone.id)} disabled={isSaving}><Trash2 size={14} /> 刪除</button></nav> : null}</article>) : <p className="family-milestone-empty">尚未選擇要放進 family-only 圖層的事件。這不會影響原有私人日記。</p>}</div>
  </section>;
}
