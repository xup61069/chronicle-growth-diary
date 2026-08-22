import { Check, Edit3, History, Loader2, LockKeyhole, Minus, Plus, Trash2, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { diffFamilyAudience, effectiveFamilyAudienceMemberIds, familyAudienceFingerprint, familyAudienceRosterSignature, type FamilyAudienceDiff } from "@/lib/familyAudiencePreview";

type AudienceMode = "all_accepted" | "selected_members";
type FamilyMilestone = { id: number; occurredAt: number; datePrecision: "day" | "month" | "year"; title: string; summary: string; sourceEventId?: number | null; audienceMode?: AudienceMode; audienceMemberIds?: number[]; updatedAt: Date | string };
type FamilyMember = { id: number; name: string | null; email: string | null; role: "editor" | "commenter" };
type FamilyMilestoneDraft = { occurredAt: string; datePrecision: FamilyMilestone["datePrecision"]; title: string; summary: string; sourceEventId: string; audienceMode: AudienceMode; audienceMemberIds: number[] };
type FamilyAudienceAudit = { id: number; action: string; targetId: number | null; createdAt: Date | string };

const emptyDraft = (): FamilyMilestoneDraft => ({ occurredAt: new Date().toISOString().slice(0, 10), datePrecision: "day", title: "", summary: "", sourceEventId: "", audienceMode: "selected_members", audienceMemberIds: [] });

type FamilyMilestoneInput = { occurredAt: number; datePrecision: FamilyMilestone["datePrecision"]; title: string; summary: string; sourceEventId: number | null; audienceMode: AudienceMode; audienceMemberIds: number[] };
type FamilyMilestoneLayerProps = {
  milestones: FamilyMilestone[];
  canManage: boolean;
  sourceEvents: Array<{ id: number; title: string }>;
  familyMembers: FamilyMember[];
  audienceAudit: FamilyAudienceAudit[];
  isLoadingAudienceAudit: boolean;
  isSaving: boolean;
  onCreate: (input: FamilyMilestoneInput) => Promise<void>;
  onUpdate: (id: number, input: FamilyMilestoneInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function dateForInput(value: number) { return new Date(value).toISOString().slice(0, 10); }
function memberLabel(member: FamilyMember) { return member.name?.trim() || member.email || `家庭成員 #${member.id}`; }
function audiencePolicyLabel(mode: AudienceMode) { return mode === "all_accepted" ? "所有目前已接受的家庭成員" : "指定已接受的家庭成員"; }

export function FamilyMilestoneLayer({ milestones, canManage, sourceEvents, familyMembers, audienceAudit, isLoadingAudienceAudit, isSaving, onCreate, onUpdate, onDelete }: FamilyMilestoneLayerProps) {
  const [draft, setDraft] = useState<FamilyMilestoneDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [audiencePreview, setAudiencePreview] = useState<FamilyAudienceDiff | null>(null);
  const [audiencePreviewInvalidated, setAudiencePreviewInvalidated] = useState(false);
  const rosterSignature = useMemo(() => familyAudienceRosterSignature(familyMembers), [familyMembers]);
  const effectiveDraftAudienceIds = useMemo(() => effectiveFamilyAudienceMemberIds({ mode: draft.audienceMode, memberIds: draft.audienceMemberIds }, familyMembers), [draft.audienceMemberIds, draft.audienceMode, familyMembers]);
  const hasValidAudience = draft.audienceMode === "all_accepted" || effectiveDraftAudienceIds.length > 0;
  useEffect(() => {
    if (audiencePreview && audiencePreview.rosterSignature !== rosterSignature) {
      setAudiencePreview(null);
      setAudiencePreviewInvalidated(true);
    }
  }, [audiencePreview, rosterSignature]);
  useEffect(() => {
    if (audiencePreview && audiencePreview.proposedFingerprint !== familyAudienceFingerprint({ mode: draft.audienceMode, memberIds: draft.audienceMemberIds })) setAudiencePreview(null);
  }, [audiencePreview, draft.audienceMemberIds, draft.audienceMode]);

  const toggleAudienceMember = (memberId: number) => setDraft((current) => ({ ...current, audienceMemberIds: current.audienceMemberIds.includes(memberId) ? current.audienceMemberIds.filter((id) => id !== memberId) : [...current.audienceMemberIds, memberId].sort((a, b) => a - b) }));
  const createInput = (): FamilyMilestoneInput | null => {
    const occurredAt = new Date(`${draft.occurredAt}T12:00:00`).getTime();
    if (!draft.title.trim() || !draft.summary.trim() || Number.isNaN(occurredAt) || !hasValidAudience) return null;
    return { occurredAt, datePrecision: draft.datePrecision, title: draft.title, summary: draft.summary, sourceEventId: draft.sourceEventId ? Number(draft.sourceEventId) : null, audienceMode: draft.audienceMode, audienceMemberIds: draft.audienceMode === "selected_members" ? effectiveDraftAudienceIds : [] };
  };
  const closeForm = () => { setDraft(emptyDraft()); setEditingId(null); setAudiencePreview(null); setAudiencePreviewInvalidated(false); setIsOpen(false); };
  const submit = async () => {
    const input = createInput();
    if (!input) return;
    if (!editingId) { await onCreate(input); closeForm(); return; }
    const current = milestones.find((milestone) => milestone.id === editingId);
    if (!current) return;
    const diff = diffFamilyAudience({ mode: current.audienceMode ?? "all_accepted", memberIds: current.audienceMemberIds ?? [] }, { mode: input.audienceMode, memberIds: input.audienceMemberIds }, familyMembers);
    if (diff.hasChange) { setAudiencePreview(diff); setAudiencePreviewInvalidated(false); return; }
    await onUpdate(editingId, input);
    closeForm();
  };
  const confirmAudienceUpdate = async () => {
    const input = createInput();
    if (!editingId || !audiencePreview || !input) return;
    if (audiencePreview.rosterSignature !== rosterSignature || audiencePreview.proposedFingerprint !== familyAudienceFingerprint({ mode: input.audienceMode, memberIds: input.audienceMemberIds })) {
      setAudiencePreview(null);
      setAudiencePreviewInvalidated(true);
      return;
    }
    await onUpdate(editingId, input);
    closeForm();
  };
  const startEdit = (milestone: FamilyMilestone) => {
    setEditingId(milestone.id);
    setDraft({ occurredAt: dateForInput(milestone.occurredAt), datePrecision: milestone.datePrecision, title: milestone.title, summary: milestone.summary, sourceEventId: milestone.sourceEventId ? String(milestone.sourceEventId) : "", audienceMode: milestone.audienceMode ?? "all_accepted", audienceMemberIds: milestone.audienceMemberIds ?? [] });
    setAudiencePreview(null);
    setAudiencePreviewInvalidated(false);
    setIsOpen(true);
  };
  const memberLabels = (memberIds: number[]) => memberIds.map((memberId) => familyMembers.find((member) => member.id === memberId)).filter((member): member is FamilyMember => Boolean(member)).map(memberLabel);
  const activeMilestone = milestones.find((milestone) => milestone.id === editingId);
  const changes = audiencePreview ? [
    { key: "added", symbol: "+", label: "新增可見對象", copy: "這些成員會開始看到摘要。", members: memberLabels(audiencePreview.addedMemberIds) },
    { key: "removed", symbol: "−", label: "移除可見對象", copy: "這些成員不再看到摘要。", members: memberLabels(audiencePreview.removedMemberIds) },
  ] : [];

  return <section className="family-milestone-layer" aria-labelledby="family-milestone-title">
    <header><div><p className="editor-kicker"><span /> FAMILY MILESTONES / OPTIONAL</p><h2 id="family-milestone-title">把要一起記得的事，另寫成家庭大事記</h2><p>這是一層獨立的 family-only 摘要。只有日記擁有者可新增或修改；家人只會看到你明確授權的日期、標題和短摘要，不會取得原始日記、照片、語音或 GPS。</p></div>{canManage ? <button type="button" onClick={() => { if (isOpen) closeForm(); else { setEditingId(null); setDraft(emptyDraft()); setAudiencePreview(null); setAudiencePreviewInvalidated(false); setIsOpen(true); } }} disabled={isSaving}>{isOpen ? <X size={15} /> : <Plus size={15} />}{isOpen ? "收起" : "新增大事記"}</button> : <span className="family-milestone-readonly"><LockKeyhole size={14} /> family-only 閱讀</span>}</header>
    {canManage && isOpen ? <div className="family-milestone-form"><label>日期<input aria-label="家庭大事記日期" type="date" value={draft.occurredAt} onChange={(event) => setDraft((current) => ({ ...current, occurredAt: event.target.value }))} disabled={isSaving} /></label><label>日期精度<select aria-label="家庭大事記日期精度" value={draft.datePrecision} onChange={(event) => setDraft((current) => ({ ...current, datePrecision: event.target.value as FamilyMilestone["datePrecision"] }))} disabled={isSaving}><option value="day">日</option><option value="month">月</option><option value="year">年</option></select></label><label>標題<input aria-label="家庭大事記標題" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value.slice(0, 180) }))} maxLength={180} disabled={isSaving} /></label><label>短摘要<textarea aria-label="家庭大事記短摘要" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value.slice(0, 480) }))} maxLength={480} rows={3} disabled={isSaving} /></label><label>連結現有事件（選填）<select aria-label="連結現有事件" value={draft.sourceEventId} onChange={(event) => setDraft((current) => ({ ...current, sourceEventId: event.target.value }))} disabled={isSaving}><option value="">不連結，只分享這段摘要</option>{sourceEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><fieldset className="family-milestone-audience" disabled={isSaving}><legend><UsersRound size={14} />誰可以看到這一筆？</legend><label><input type="radio" name="family-milestone-audience" checked={draft.audienceMode === "selected_members"} onChange={() => setDraft((current) => ({ ...current, audienceMode: "selected_members" }))} />指定已接受的家庭成員</label><label><input type="radio" name="family-milestone-audience" checked={draft.audienceMode === "all_accepted"} onChange={() => setDraft((current) => ({ ...current, audienceMode: "all_accepted", audienceMemberIds: [] }))} />所有已接受的家庭成員（目前 {familyMembers.length} 位）</label>{draft.audienceMode === "selected_members" ? <div className="family-milestone-member-picker" aria-live="polite">{familyMembers.length ? familyMembers.map((member) => <label key={member.id}><input aria-label={`選擇 ${memberLabel(member)}`} type="checkbox" checked={draft.audienceMemberIds.includes(member.id)} onChange={() => toggleAudienceMember(member.id)} /> <span>{memberLabel(member)}</span><small>{member.role === "editor" ? "共同編輯" : "註解"}</small></label>) : <p>尚無已接受的家庭成員，暫時無法建立指定對象的大事記。</p>}<small>被選擇的成員只會看到日期、標題與短摘要；未選成員不會得知此項目存在。</small></div> : <small>所有目前已接受的家庭成員都只會看到日期、標題與短摘要。</small>}</fieldset>{audiencePreviewInvalidated ? <p className="family-audience-preview-invalidated" role="status">家庭成員名冊或選擇已變更。為避免套用過時範圍，請重新檢視受眾後再更新。</p> : null}{audiencePreview ? <aside className="family-audience-preview" role="dialog" aria-label="家庭大事記受眾變更預覽" aria-live="polite"><p className="editor-kicker"><span /> AUDIENCE CHANGE / REVIEW</p><h3>先確認誰會看到這筆摘要</h3><p>這是提交前的本機差異。按下確認前，不會更新 family-only 大事記。</p><div className="family-audience-preview-grid"><section className="family-audience-scope family-audience-scope-current"><b>目前</b><small>{audiencePolicyLabel(activeMilestone?.audienceMode ?? "all_accepted")}</small><div>{memberLabels(audiencePreview.currentMemberIds).length ? memberLabels(audiencePreview.currentMemberIds).map((label) => <span key={`current-${label}`}>{label}</span>) : <em>目前沒有有效受眾</em>}</div></section><section className="family-audience-scope family-audience-scope-proposed"><b>提議</b><small>{audiencePolicyLabel(draft.audienceMode)}</small><div>{memberLabels(audiencePreview.proposedMemberIds).length ? memberLabels(audiencePreview.proposedMemberIds).map((label) => <span key={`proposed-${label}`}>{label}</span>) : <em>目前沒有有效受眾</em>}</div></section></div><div className="family-audience-diff" aria-label="受眾差異">{changes.map((change) => <section className={`family-audience-change family-audience-change-${change.key}`} key={change.key}><header><span aria-hidden="true">{change.symbol}</span><div><b>{change.label}</b><small>{change.copy}</small></div></header><div>{change.members.length ? change.members.map((label) => <span key={`${change.key}-${label}`}>{label}</span>) : <em>沒有</em>}</div></section>)}</div>{audiencePreview.policyChanged ? <p className="family-audience-policy-note"><b>↔ 範圍規則調整</b>目前有效受眾可能相同，但未來接受邀請或撤銷成員時，影響範圍會不同。</p> : null}<div className="family-audience-preview-actions"><button type="button" onClick={() => setAudiencePreview(null)} disabled={isSaving}>返回調整</button><button type="button" onClick={confirmAudienceUpdate} disabled={isSaving}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}確認變更</button></div></aside> : null}<footer><small>連結只用於 owner 內部整理；不會向家人投影原始事件的內容或媒體。</small><div><button type="button" onClick={closeForm} disabled={isSaving}>取消</button><button type="button" onClick={submit} disabled={isSaving || !draft.occurredAt || !draft.title.trim() || !draft.summary.trim() || !hasValidAudience}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{editingId ? "更新摘要" : "加入 family-only 圖層"}</button></div></footer></div> : null}
    <div className="family-milestone-list">{milestones.length ? milestones.map((milestone) => <article key={milestone.id}><time>{new Date(milestone.occurredAt).toLocaleDateString("zh-TW", { year: "numeric", month: milestone.datePrecision === "year" ? undefined : "long", day: milestone.datePrecision === "day" ? "numeric" : undefined })}</time><div><h3>{milestone.title}</h3><p>{milestone.summary}</p>{canManage ? <small className="family-milestone-audience-label">{milestone.audienceMode === "selected_members" ? `指定 ${milestone.audienceMemberIds?.length ?? 0} 位成員` : "所有已接受成員"}</small> : null}</div>{canManage ? <nav aria-label={`${milestone.title} 管理`}><button type="button" onClick={() => startEdit(milestone)} disabled={isSaving}><Edit3 size={14} /> 編輯</button><button type="button" onClick={() => void onDelete(milestone.id)} disabled={isSaving}><Trash2 size={14} /> 刪除</button></nav> : null}</article>) : <p className="family-milestone-empty">尚未選擇要放進 family-only 圖層的事件。這不會影響原有私人日記。</p>}</div>
    {canManage ? <details className="family-audience-audit"><summary><History size={14} />查看已確認的受眾異動 <small>僅顯示時間、動作與大事記識別碼；不含摘要或成員資料。</small></summary><p>這是 owner 的被動稽核檢視。開啟不會通知任何成員，也不會建立新的紀錄。</p>{isLoadingAudienceAudit ? <span className="family-audience-audit-loading"><Loader2 size={13} className="animate-spin" /> 讀取中</span> : audienceAudit.length ? <div>{audienceAudit.map((audit) => <article key={audit.id}><time>{new Date(audit.createdAt).toLocaleString("zh-TW")}</time><b>已確認受眾範圍變更</b><small>大事記 #{audit.targetId ?? "—"}</small></article>)}</div> : <em>尚未有已確認的受眾範圍變更。</em>}</details> : null}
  </section>;
}
