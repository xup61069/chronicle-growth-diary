/**
 * Design reminder — personal growth archive: structured like a private editorial desk,
 * with a live chronological canvas, tactile index cards, and deliberate cinnabar markers.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { exportDiaryAsLongImage, exportDiaryAsPdf } from "@/lib/diaryExport";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ArrowDownUp,
  BrainCircuit,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  FilePenLine,
  FileDown,
  Globe2,
  GripVertical,
  ImagePlus,
  ImageDown,
  Link2,
  Loader2,
  LockKeyhole,
  MapPin,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const eventTypes = [
  { value: "memory", label: "回憶" },
  { value: "learning", label: "學習" },
  { value: "achievement", label: "成就" },
  { value: "chapter", label: "人生章節" },
] as const;

const diaryColors = ["#EE623B", "#587A8B", "#78976D", "#A06A82", "#D19B43"] as const;

type EventType = (typeof eventTypes)[number]["value"];
type DatePrecision = "day" | "month" | "year";
type EventForm = {
  title: string;
  occurredAt: string;
  datePrecision: DatePrecision;
  eventType: EventType;
  body: string;
  ageLabel: string;
  place: string;
  color: (typeof diaryColors)[number];
  tagNames: string[];
};
type PendingImage = { name: string; type: string; base64: string; preview: string };
type ShareMode = "private" | "public" | "link";
type PhaseKey = "childhood" | "education" | "career";
type PhaseBoundaries = Record<PhaseKey, { start: string; end: string }>;

const today = new Date().toISOString().slice(0, 10);

const makeEmptyForm = (): EventForm => ({
  title: "",
  occurredAt: today,
  datePrecision: "day",
  eventType: "memory",
  body: "",
  ageLabel: "",
  place: "",
  color: "#EE623B",
  tagNames: [],
});

function formatInputDate(timestamp: number) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(timestamp: number, precision: DatePrecision) {
  const date = new Date(timestamp);
  if (precision === "year") return `${date.getFullYear()} 年`;
  if (precision === "month") return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function toTimestamp(value: string, precision: DatePrecision) {
  const [year, month = "01", day = "01"] = value.split("-");
  return new Date(Number(year), precision === "year" ? 0 : Number(month) - 1, precision === "day" ? Number(day) : 1).getTime();
}

async function readImage(file: File): Promise<PendingImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("無法讀取這張圖片。"));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve({ name: file.name, type: file.type, base64: dataUrl.split(",")[1] ?? "", preview: dataUrl });
    };
    reader.readAsDataURL(file);
  });
}

function DiaryEditorContent() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.diary.get.useQuery(undefined, { retry: 1, staleTime: 0, refetchOnMount: "always" });
  const [form, setForm] = useState<EventForm>(makeEmptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | EventType>("all");
  const [filterTag, setFilterTag] = useState("all");
  const [sortOrder, setSortOrder] = useState<"custom" | "newest" | "oldest">("custom");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [birthYear, setBirthYear] = useState("");
  const [educationStartYear, setEducationStartYear] = useState("");
  const [careerStartYear, setCareerStartYear] = useState("");
  const [privateToken, setPrivateToken] = useState<string | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [clearSharePassword, setClearSharePassword] = useState(false);
  const [shareExpiryDate, setShareExpiryDate] = useState("");
  const [phaseBoundaries, setPhaseBoundaries] = useState<PhaseBoundaries>({ childhood: { start: "", end: "" }, education: { start: "", end: "" }, career: { start: "", end: "" } });
  const [draggedEventId, setDraggedEventId] = useState<number | null>(null);
  const [editingReflectionKey, setEditingReflectionKey] = useState<PhaseKey | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState({ recap: "", reflection: "" });
  const exportRef = useRef<HTMLElement>(null);

  const saveMutation = trpc.diary.createEvent.useMutation();
  const updateMutation = trpc.diary.updateEvent.useMutation();
  const uploadMutation = trpc.diary.uploadImage.useMutation();
  const deleteMutation = trpc.diary.deleteEvent.useMutation();
  const deleteImageMutation = trpc.diary.deleteImage.useMutation();
  const visibilityMutation = trpc.diary.setEventVisibility.useMutation();
  const sharingMutation = trpc.diary.updateSharing.useMutation();
  const reorderMutation = trpc.diary.reorderEvents.useMutation();
  const phaseBoundariesMutation = trpc.diary.updatePhaseBoundaries.useMutation();
  const reflectionMutation = trpc.diary.generatePhaseReflection.useMutation();
  const reflectionSaveMutation = trpc.diary.updatePhaseReflection.useMutation();

  const events = data?.events ?? [];
  const visibleEvents = useMemo(
    () => {
      const filtered = events
        .filter((event) => filterType === "all" || event.eventType === filterType)
        .filter((event) => filterTag === "all" || event.tags.some((tag) => tag.name === filterTag));
      if (sortOrder === "custom") return filtered;
      return [...filtered].sort((left, right) => sortOrder === "oldest" ? left.occurredAt - right.occurredAt : right.occurredAt - left.occurredAt);
    },
    [events, filterTag, filterType, sortOrder],
  );
  const selectedEvent = events.find((event) => event.id === (selectedId ?? editingId)) ?? visibleEvents[0] ?? events[0];
  const isSaving = saveMutation.isPending || updateMutation.isPending || uploadMutation.isPending;
  const eventCountLabel = `${events.length.toString().padStart(2, "0")} 篇記憶`;
  const hasMedia = useMemo(() => events.reduce((total, event) => total + event.media.length, 0), [events]);
  const publicEventCount = useMemo(() => events.filter((event) => event.isPublic).length, [events]);
  const hasShareConfiguration = Boolean(data?.sharing.slug);
  const publicShareUrl = data?.sharing.slug ? `${window.location.origin}/story/${data.sharing.slug}` : "";
  const privateShareUrl = privateToken && data?.sharing.slug ? `${publicShareUrl}?token=${privateToken}` : "";
  const timelineYearRange = useMemo(() => {
    const years = events.map((event) => new Date(event.occurredAt).getFullYear());
    return { min: Math.min(...years, 1900) - 2, max: Math.max(...years, new Date().getFullYear()) + 2 };
  }, [events]);
  const reflectionsByPhase = useMemo(() => new Map((data?.reflections ?? []).map((reflection) => [reflection.phaseKey, reflection])), [data?.reflections]);

  useEffect(() => {
    if (!data) return;
    setShareMode(data.sharing.mode);
    setBirthYear(data.diary.birthYear?.toString() ?? "");
    setEducationStartYear(data.diary.educationStartYear?.toString() ?? "");
    setCareerStartYear(data.diary.careerStartYear?.toString() ?? "");
    setShareExpiryDate(data.sharing.expiresAt ? new Date(data.sharing.expiresAt).toISOString().slice(0, 10) : "");
    setClearSharePassword(false);
    setPhaseBoundaries({
      childhood: { start: data.diary.childhoodStartYear?.toString() ?? data.diary.birthYear?.toString() ?? "", end: data.diary.childhoodEndYear?.toString() ?? "" },
      education: { start: data.diary.educationStartYear?.toString() ?? "", end: data.diary.educationEndYear?.toString() ?? "" },
      career: { start: data.diary.careerStartYear?.toString() ?? "", end: data.diary.careerEndYear?.toString() ?? "" },
    });
  }, [data]);

  const addTag = (rawTag = tagDraft) => {
    const tag = rawTag.trim().replace(/\s+/g, " ");
    if (!tag) return;
    if (tag.length > 24) return toast.error("每個標籤最多 24 個字元。");
    if (form.tagNames.some((name) => name.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
      setTagDraft("");
      return;
    }
    if (form.tagNames.length >= 8) return toast.error("每筆記憶最多保留 8 個標籤。");
    setForm((current) => ({ ...current, tagNames: [...current.tagNames, tag] }));
    setTagDraft("");
  };

  const startNewEvent = () => {
    setEditingId(null);
    setSelectedId(null);
    setPendingImage(null);
    setTagDraft("");
    setForm(makeEmptyForm());
  };

  const editEvent = (event: (typeof events)[number]) => {
    setEditingId(event.id);
    setSelectedId(event.id);
    setTagDraft("");
    setPendingImage(null);
    setForm({
      title: event.title,
      occurredAt: formatInputDate(event.occurredAt),
      datePrecision: event.datePrecision,
      eventType: event.eventType,
      body: event.body,
      ageLabel: event.ageLabel ?? "",
      place: event.place ?? "",
      color: event.color as (typeof diaryColors)[number],
      tagNames: event.tags.map((tag) => tag.name),
    });
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("請選擇 JPG、PNG、WebP 或 GIF 圖片。");
    if (file.size > 4 * 1024 * 1024) return toast.error("圖片檔案不可超過 4MB。");
    try {
      setPendingImage(await readImage(file));
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "圖片暫存失敗。");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("先為這段記憶寫下標題。");
    const payload = {
      ...form,
      occurredAt: toTimestamp(form.occurredAt, form.datePrecision),
      ageLabel: form.ageLabel.trim() || null,
      place: form.place.trim() || null,
    };

    try {
      const saved = editingId
        ? await updateMutation.mutateAsync({ id: editingId, ...payload })
        : await saveMutation.mutateAsync(payload);

      if (pendingImage) {
        await uploadMutation.mutateAsync({
          eventId: saved.id,
          fileName: pendingImage.name,
          mimeType: pendingImage.type,
          base64: pendingImage.base64,
          caption: form.title.trim(),
        });
      }

      await utils.diary.get.invalidate();
      toast.success(editingId ? "這段記憶已更新。" : "新的成長事件已存入時間帶。" );
      startNewEvent();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "儲存時發生問題，請稍後再試。");
    }
  };

  const removeEvent = async (id: number) => {
    if (!window.confirm("確定要刪除這段記憶嗎？這個動作無法還原。")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      await utils.diary.get.invalidate();
      if (editingId === id) startNewEvent();
      toast.success("這段記憶已從時間帶移除。");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "刪除失敗，請稍後再試。");
    }
  };

  const removeImage = async (id: number) => {
    try {
      await deleteImageMutation.mutateAsync({ id });
      await utils.diary.get.invalidate();
      toast.success("圖片已移除。");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "圖片移除失敗。");
    }
  };

  const updateSharing = async (regenerateLink = false) => {
    try {
      const result = await sharingMutation.mutateAsync({
        shareMode,
        birthYear: birthYear ? Number(birthYear) : null,
        educationStartYear: educationStartYear ? Number(educationStartYear) : null,
        careerStartYear: careerStartYear ? Number(careerStartYear) : null,
        childhoodStartYear: phaseBoundaries.childhood.start ? Number(phaseBoundaries.childhood.start) : null,
        childhoodEndYear: phaseBoundaries.childhood.end ? Number(phaseBoundaries.childhood.end) : null,
        educationEndYear: phaseBoundaries.education.end ? Number(phaseBoundaries.education.end) : null,
        careerEndYear: phaseBoundaries.career.end ? Number(phaseBoundaries.career.end) : null,
        sharePassword: sharePassword || null,
        clearSharePassword,
        shareExpiresAt: shareExpiryDate ? new Date(`${shareExpiryDate}T23:59:59`).getTime() : null,
        regenerateLink: regenerateLink || (shareMode === "link" && !data?.sharing.hasPrivateLink),
      });
      if (result.shareToken) setPrivateToken(result.shareToken);
      setSharePassword("");
      setClearSharePassword(false);
      await utils.diary.get.invalidate();
      toast.success(shareMode === "private" ? "分享已關閉，日記維持私人狀態。" : "分享設定已儲存。");
    } catch (sharingError) {
      toast.error(sharingError instanceof Error ? sharingError.message : "無法更新分享設定。");
    }
  };

  const copyShareLink = async () => {
    const url = shareMode === "link" ? privateShareUrl : publicShareUrl;
    if (!url) return toast.info("先儲存分享設定，系統才會建立連結。");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("分享連結已複製。私密連結請只交給你信任的人。" );
    } catch {
      window.prompt("請複製以下分享連結：", url);
    }
  };

  const toggleSelectedEventVisibility = async () => {
    if (!selectedEvent) return;
    try {
      await visibilityMutation.mutateAsync({ id: selectedEvent.id, isPublic: !selectedEvent.isPublic });
      await utils.diary.get.invalidate();
      toast.success(selectedEvent.isPublic ? "這段記憶已改為私人。" : "這段記憶已允許出現在分享頁面。" );
    } catch (visibilityError) {
      toast.error(visibilityError instanceof Error ? visibilityError.message : "無法更新事件可見度。");
    }
  };

  const savePhaseBoundaries = async () => {
    const invalidBoundary = (["childhood", "education", "career"] as const).find((phaseKey) => {
      const phase = phaseBoundaries[phaseKey];
      return phase.start && phase.end && Number(phase.start) > Number(phase.end);
    });
    if (invalidBoundary) {
      const label = data?.lifePhases.find((phase) => phase.key === invalidBoundary)?.label ?? "此";
      return toast.error(`${label}階段的結束年份不能早於開始年份。`);
    }
    try {
      await phaseBoundariesMutation.mutateAsync({
        childhoodStartYear: phaseBoundaries.childhood.start ? Number(phaseBoundaries.childhood.start) : null,
        childhoodEndYear: phaseBoundaries.childhood.end ? Number(phaseBoundaries.childhood.end) : null,
        educationStartYear: phaseBoundaries.education.start ? Number(phaseBoundaries.education.start) : null,
        educationEndYear: phaseBoundaries.education.end ? Number(phaseBoundaries.education.end) : null,
        careerStartYear: phaseBoundaries.career.start ? Number(phaseBoundaries.career.start) : null,
        careerEndYear: phaseBoundaries.career.end ? Number(phaseBoundaries.career.end) : null,
      });
      await utils.diary.get.invalidate();
      toast.success("人生階段的時間邊界已更新。");
    } catch (boundaryError) {
      toast.error(boundaryError instanceof Error ? boundaryError.message : "無法更新階段時間。");
    }
  };

  const generateReflection = async (phaseKey: PhaseKey) => {
    try {
      await reflectionMutation.mutateAsync({ phaseKey });
      await utils.diary.get.invalidate();
      toast.success("AI 已根據這個階段的事件生成成長回顧。");
    } catch (reflectionError) {
      toast.error(reflectionError instanceof Error ? reflectionError.message : "AI 回顧暫時無法產生，請稍後再試。");
    }
  };

  const beginReflectionEdit = (phaseKey: PhaseKey) => {
    const existing = reflectionsByPhase.get(phaseKey);
    if (!existing) return;
    setEditingReflectionKey(phaseKey);
    setReflectionDraft({ recap: existing.recap, reflection: existing.reflection });
  };

  const saveReflectionEdit = async (phaseKey: PhaseKey) => {
    if (!reflectionDraft.recap.trim() || !reflectionDraft.reflection.trim()) return toast.error("請保留成長回顧與反思的內容。");
    try {
      await reflectionSaveMutation.mutateAsync({ phaseKey, recap: reflectionDraft.recap, reflection: reflectionDraft.reflection });
      await utils.diary.get.invalidate();
      setEditingReflectionKey(null);
      toast.success("你的手動調整已保留在這個人生階段。" );
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "無法保存手動調整。" );
    }
  };

  const dropEventAt = async (targetId: number) => {
    if (draggedEventId === null || draggedEventId === targetId) return;
    if (filterType !== "all" || filterTag !== "all" || sortOrder !== "custom") return toast.info("請先切換為「手動順序」並清除篩選，再拖曳重新排序。");
    const orderedIds = events.map((event) => event.id);
    const fromIndex = orderedIds.indexOf(draggedEventId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    orderedIds.splice(fromIndex, 1);
    orderedIds.splice(targetIndex, 0, draggedEventId);
    try {
      await reorderMutation.mutateAsync({ eventIds: orderedIds });
      await utils.diary.get.invalidate();
      toast.success("事件順序已更新。");
    } catch (orderError) {
      toast.error(orderError instanceof Error ? orderError.message : "無法儲存事件順序。");
    } finally {
      setDraggedEventId(null);
    }
  };

  const exportArchive = async (format: "pdf" | "image") => {
    if (!exportRef.current) return;
    if (events.length === 0) return toast.info("先寫下一段記憶，才能匯出成長史。" );
    const baseName = (data?.diary.title ?? "我的成長史").replace(/[^\u4e00-\u9fffa-zA-Z0-9_-]/g, "-") || "chronicle-growth-diary";
    try {
      if (format === "pdf") await exportDiaryAsPdf(exportRef.current, baseName);
      else await exportDiaryAsLongImage(exportRef.current, baseName);
      toast.success(format === "pdf" ? "PDF 已開始下載。" : "長圖片已開始下載。" );
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : "匯出失敗，請稍後再試。");
    }
  };

  if (isLoading) {
    return <div className="editor-loading"><Loader2 size={24} className="animate-spin" /> 正在開啟你的成長檔案…</div>;
  }

  if (error) {
    return <div className="editor-error"><Archive size={24} /><p>暫時無法讀取你的成長檔案。請重新整理頁面後再試。</p></div>;
  }

  return (
    <div className="diary-editor">
      <header className="editor-header">
        <div>
          <p className="editor-kicker"><span /> PERSONAL ARCHIVE / 01</p>
          <h1>{data?.diary.title ?? "我的成長史"}</h1>
          <p>將童年、學習、轉折與每一個值得記住的成就，編輯成一條只屬於你的時間帶。</p>
        </div>
        <div className="editor-stats" aria-label="成長日記統計">
          <span><b>{eventCountLabel}</b><small>已整理的故事</small></span>
          <span><b>{hasMedia.toString().padStart(2, "0")} 張</b><small>珍藏的影像</small></span>
        </div>
      </header>

      <section className="life-phase-overview" ref={exportRef} aria-labelledby="life-phase-title">
        <div className="phase-heading">
          <div><p className="editor-kicker"><span /> LIFE CHAPTERS / EDITABLE</p><h2 id="life-phase-title">人生階段總覽</h2><p>系統會先依事件時間與錨點編排階段；你也可以拖曳每個階段的起訖時間，讓分段更貼近自己的敘事。</p></div>
          <div className="export-actions"><span>完整成長史備份</span><button onClick={() => exportArchive("pdf")}><FileDown size={15} /> 匯出 PDF</button><button onClick={() => exportArchive("image")}><ImageDown size={15} /> 匯出長圖片</button></div>
        </div>
        <div className="phase-grid">
          {data?.lifePhases.length ? data.lifePhases.map((phase) => {
            const phaseKey = phase.key as PhaseKey;
            const boundaries = phaseBoundaries[phaseKey];
            const reflection = reflectionsByPhase.get(phase.key);
            const startYear = Number(boundaries.start || phase.startYear || timelineYearRange.min);
            const endYear = Number(boundaries.end || phase.endYear || timelineYearRange.max);
            return <article key={phase.key} className={`phase-card phase-${phase.key}`}>
              <span>{phase.yearRange ?? "時間待補"}</span><h3>{phase.label}</h3><p>{phase.note}</p><b>{phase.count.toString().padStart(2, "0")} <small>篇記憶</small></b>
              <div className="phase-boundary-editor">
                <p><GripVertical size={13} /> 拖曳調整時間邊界</p>
                <label>起於 <strong>{boundaries.start || phase.startYear || "未設定"}</strong><input aria-label={`${phase.label}開始年份`} type="range" min={timelineYearRange.min} max={Math.max(timelineYearRange.min, endYear)} value={boundaries.start || phase.startYear || timelineYearRange.min} onChange={(event) => setPhaseBoundaries((current) => ({ ...current, [phaseKey]: { ...current[phaseKey], start: event.target.value } }))} /></label>
                <label>止於 <strong>{boundaries.end || phase.endYear || "未設定"}</strong><input aria-label={`${phase.label}結束年份`} type="range" min={Math.min(timelineYearRange.max, startYear)} max={timelineYearRange.max} value={boundaries.end || phase.endYear || timelineYearRange.max} onChange={(event) => setPhaseBoundaries((current) => ({ ...current, [phaseKey]: { ...current[phaseKey], end: event.target.value } }))} /></label>
              </div>
              <div className="phase-reflection">
                {reflection ? <>
                  <p><BrainCircuit size={14} /> {reflection.model === "manual-edit" ? "已保留的手動回顧" : "AI 成長回顧"}</p>
                  {editingReflectionKey === phaseKey ? <div className="reflection-editor"><label>成長回顧<textarea value={reflectionDraft.recap} onChange={(event) => setReflectionDraft((draft) => ({ ...draft, recap: event.target.value }))} rows={4} maxLength={3000} /></label><label>我的反思<textarea value={reflectionDraft.reflection} onChange={(event) => setReflectionDraft((draft) => ({ ...draft, reflection: event.target.value }))} rows={3} maxLength={3000} /></label><div><button type="button" onClick={() => saveReflectionEdit(phaseKey)} disabled={reflectionSaveMutation.isPending}>{reflectionSaveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 保存我的調整</button><button type="button" className="reflection-cancel" onClick={() => setEditingReflectionKey(null)}>取消</button></div></div> : <><strong>{reflection.recap}</strong><em>{reflection.reflection}</em></>}
                </> : <p><BrainCircuit size={14} /> 尚未生成這個階段的成長回顧。</p>}
                <div className="reflection-actions"><button type="button" onClick={() => generateReflection(phaseKey)} disabled={reflectionMutation.isPending}>{reflectionMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}{reflection ? "重新生成回顧" : "生成成長回顧"}</button>{reflection && editingReflectionKey !== phaseKey ? <button type="button" className="reflection-edit" onClick={() => beginReflectionEdit(phaseKey)}><FilePenLine size={14} /> 手動調整</button> : null}</div>
              </div>
            </article>;
          }) : <div className="phase-empty"><BookOpenCheck size={21} /><p>當你寫下更多記憶，童年、求學與職涯會在這裡逐步浮現。</p></div>}
        </div>
        {data?.lifePhases.length ? <div className="phase-boundary-actions"><span>拖曳完成後，儲存就會重新分配事件所屬的階段。</span><button type="button" onClick={savePhaseBoundaries} disabled={phaseBoundariesMutation.isPending}>{phaseBoundariesMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <GripVertical size={14} />} 儲存階段邊界</button></div> : null}
        <div className="export-event-records">
          {events.map((event) => <article key={event.id}><span style={{ backgroundColor: event.color }} /><div className="export-record-content">{event.media[0] ? <img src={event.media[0].url} alt={event.media[0].caption ?? event.title} /> : null}<div className="export-record-copy"><b>{formatDate(event.occurredAt, event.datePrecision)} · {event.ageLabel ?? "成長記事"}</b><h3>{event.title}</h3><p>{event.body}</p>{event.place ? <small><MapPin size={12} /> {event.place}</small> : null}<div>{event.tags.map((tag) => <em key={tag.id}>{tag.name}</em>)}</div></div></div></article>)}
        </div>
      </section>

      <section className="sharing-studio" aria-labelledby="sharing-title">
        <div className="sharing-intro"><p className="editor-kicker"><span /> SHARING CONTROLS</p><h2 id="sharing-title">由你決定，哪些故事可以被看見。</h2><p>每個事件都從私人狀態開始。你可以只公開某些片段，或建立一條只交給特定對象的私密連結。</p><div className="sharing-stat"><ShieldCheck size={16} /><span>目前有 <b>{publicEventCount}</b> 篇事件允許分享</span></div></div>
        <div className="sharing-settings">
          <div className="share-mode-options">
            {([
              ["private", LockKeyhole, "私人", "不建立任何可閱覽連結。"],
              ["public", Globe2, "公開", "任何持有分享網址的人可閱讀公開事件。"],
              ["link", Link2, "私密連結", "必須持有完整秘密網址，才能閱讀公開事件。"],
            ] as const).map(([mode, Icon, label, copy]) => <button type="button" className={shareMode === mode ? "active" : ""} key={mode} onClick={() => { setShareMode(mode); if (mode !== "link") setPrivateToken(null); }}><Icon size={17} /><span><b>{label}</b><small>{copy}</small></span></button>)}
          </div>
          <div className="phase-anchor-fields"><p>人生階段的時間錨點（選填）</p><label>出生年<input type="number" min="1900" max="2200" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="例如：1994" /></label><label>開始求學<input type="number" min="1900" max="2200" value={educationStartYear} onChange={(event) => setEducationStartYear(event.target.value)} placeholder="例如：2000" /></label><label>開始職涯<input type="number" min="1900" max="2200" value={careerStartYear} onChange={(event) => setCareerStartYear(event.target.value)} placeholder="例如：2016" /></label></div>
          {shareMode !== "private" ? <div className="sharing-security-fields">
            <p><LockKeyhole size={14} /> 進階分享保護</p>
            <label>設定或更新密碼<input type="password" minLength={8} maxLength={128} value={sharePassword} onChange={(event) => { setSharePassword(event.target.value); setClearSharePassword(false); }} placeholder={data?.sharing.hasPassword ? "已設定密碼；輸入可更新" : "至少 8 個字元（選填）"} /></label>
            {data?.sharing.hasPassword ? <label className="share-checkbox"><input type="checkbox" checked={clearSharePassword} onChange={(event) => { setClearSharePassword(event.target.checked); if (event.target.checked) setSharePassword(""); }} /> 移除目前的密碼保護</label> : null}
            <label>連結到期日<input type="date" value={shareExpiryDate} onChange={(event) => setShareExpiryDate(event.target.value)} /></label>
            <div className="share-access-summary"><span><b>{data?.sharing.accessCount.toString().padStart(2, "0")}</b><small>累積可讀瀏覽</small></span><span><b>{data?.sharing.lastSharedAt ? new Date(data.sharing.lastSharedAt).toLocaleDateString("zh-TW") : "—"}</b><small>最後存取日期</small></span></div>
            {data?.sharing.recentAccesses.length ? <p className="share-log-note">最近存取：{data.sharing.recentAccesses.map((access) => new Date(access.accessedAt).toLocaleString("zh-TW")).join(" · ")}</p> : <p className="share-log-note">尚無成功的分享閱讀紀錄；系統不儲存閱覽者身分或 IP 位址。</p>}
          </div> : null}
          <div className="sharing-actions"><button className="save-sharing" onClick={() => updateSharing()} disabled={sharingMutation.isPending}>{sharingMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />} 儲存分享設定</button>{shareMode !== "private" ? <button className="copy-sharing" onClick={copyShareLink}><Copy size={15} /> 複製分享連結</button> : null}{shareMode === "link" ? <button className="regenerate-link" onClick={() => updateSharing(true)}><RefreshCw size={14} /> 重新產生私密連結</button> : null}</div>
          {shareMode === "link" && data?.sharing.hasPrivateLink && !privateToken ? <p className="private-link-note">為安全起見，既有私密連結不會再次顯示；需要時可重新產生。</p> : null}
          {hasShareConfiguration && shareMode === "public" ? <p className="sharing-url"><Globe2 size={14} /> {publicShareUrl}</p> : null}
          {privateShareUrl ? <p className="sharing-url private"><Link2 size={14} /> 私密連結已建立，請立即複製並妥善保管。</p> : null}
        </div>
      </section>

      <div className="editor-workspace">
        <aside className="event-index" aria-label="已整理的成長事件">
          <div className="panel-title"><span>事件索引</span><b>{eventCountLabel}</b></div>
          <button className="new-event-button" onClick={startNewEvent}><Plus size={16} /> 新增一段記憶</button>
          <div className="index-filters">
            <select aria-label="依事件類型篩選" value={filterType} onChange={(event) => setFilterType(event.target.value as "all" | EventType)}>
              <option value="all">全部類型</option>
              {eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <select aria-label="依標籤篩選" value={filterTag} onChange={(event) => setFilterTag(event.target.value)}>
              <option value="all">全部標籤</option>
              {data?.tags.map((tag) => <option key={tag.id} value={tag.name}>{tag.name}</option>)}
            </select>
            <button type="button" className="index-sort" onClick={() => setSortOrder((order) => order === "custom" ? "oldest" : order === "oldest" ? "newest" : "custom")}><ArrowDownUp size={13} /> {sortOrder === "custom" ? "手動順序" : sortOrder === "oldest" ? "由早至晚" : "由晚至早"}</button>
          </div>
          <div className="event-list">
            {events.length === 0 ? (
              <div className="empty-index"><Sparkles size={18} /><p>第一筆記憶，會是這條時間帶的起點。</p></div>
            ) : visibleEvents.length === 0 ? (
              <div className="empty-index"><Tag size={18} /><p>沒有符合目前條件的記憶。試著調整類型或標籤篩選。</p></div>
            ) : visibleEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                draggable={filterType === "all" && filterTag === "all" && sortOrder === "custom"}
                className={`event-index-card ${selectedEvent?.id === event.id ? "is-selected" : ""}`}
                onClick={() => editEvent(event)}
                onDragStart={(dragEvent) => { dragEvent.dataTransfer.effectAllowed = "move"; setDraggedEventId(event.id); }}
                onDragOver={(dragEvent) => dragEvent.preventDefault()}
                onDrop={() => dropEventAt(event.id)}
                onDragEnd={() => setDraggedEventId(null)}
              >
                <GripVertical size={14} className="event-drag-handle" />
                <span className="index-line" style={{ backgroundColor: event.color }} />
                <span className="index-date">{new Date(event.occurredAt).getFullYear()}</span>
                <span className="index-title">{event.title}</span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </aside>

        <section className="editor-form-panel" aria-labelledby="composer-title">
          <div className="form-heading">
            <div><p className="editor-kicker"><span /> {editingId ? "編輯中" : "新的篇章"}</p><h2 id="composer-title">{editingId ? "調整這段記憶" : "記下一個發生過的瞬間"}</h2></div>
            {editingId ? <button className="quiet-action" onClick={startNewEvent}>放棄編輯</button> : null}
          </div>

          <form onSubmit={handleSubmit} className="event-form">
            <label className="form-field form-title">
              <span>這段記憶的標題</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="例如：第一次站上舞台" maxLength={180} />
            </label>

            <div className="form-row">
              <label className="form-field">
                <span><CalendarDays size={14} /> 發生時間</span>
                <input type="date" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} required />
              </label>
              <fieldset className="precision-field">
                <legend>時間精度</legend>
                <div>
                  {(["day", "month", "year"] as DatePrecision[]).map((precision) => (
                    <button type="button" key={precision} className={form.datePrecision === precision ? "active" : ""} onClick={() => setForm({ ...form, datePrecision: precision })}>
                      {precision === "day" ? "日" : precision === "month" ? "月" : "年"}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="form-row">
              <label className="form-field">
                <span>事件類型</span>
                <select value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value as EventType })}>
                  {eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>那時的年紀（選填）</span>
                <input value={form.ageLabel} onChange={(event) => setForm({ ...form, ageLabel: event.target.value })} placeholder="例如：8 歲、國二" maxLength={80} />
              </label>
            </div>

            <label className="form-field">
              <span>把故事寫下來</span>
              <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="發生了什麼？你當時怎麼想？這段經驗後來帶給了你什麼？" rows={5} maxLength={8000} />
            </label>

            <label className="form-field">
              <span><MapPin size={14} /> 地點（選填）</span>
              <input value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} placeholder="例如：外婆家、學校禮堂" maxLength={180} />
            </label>

            <div className="form-field tags-field">
              <span><Tag size={14} /> 標籤</span>
              <div className="tag-input-row">
                <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder="輸入後按 Enter，例如：家庭" maxLength={24} />
                <button type="button" onClick={() => addTag()}>加入</button>
              </div>
              <div className="tag-chips">
                {form.tagNames.map((tag) => <button type="button" key={tag} onClick={() => setForm({ ...form, tagNames: form.tagNames.filter((item) => item !== tag) })}>{tag}<X size={12} /></button>)}
              </div>
              {data?.tags.length ? <div className="tag-suggestions">常用：{data.tags.slice(0, 5).map((tag) => <button type="button" key={tag.id} onClick={() => addTag(tag.name)}>{tag.name}</button>)}</div> : null}
            </div>

            <div className="form-field color-field">
              <span>事件標記色</span>
              <div>{diaryColors.map((color) => <button type="button" key={color} aria-label={`選擇${color}標記色`} className={form.color === color ? "selected" : ""} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })}><Check size={13} /></button>)}</div>
            </div>

            <div className="form-field media-field">
              <span><ImagePlus size={14} /> 珍藏一張影像</span>
              <label className="image-dropzone">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
                {pendingImage ? <img src={pendingImage.preview} alt="待上傳的事件影像預覽" /> : <><ImagePlus size={20} /><b>選擇圖片</b><small>JPG、PNG、WebP 或 GIF，最大 4MB</small></>}
              </label>
              {pendingImage ? <button type="button" className="remove-pending" onClick={() => setPendingImage(null)}><X size={14} /> 移除待上傳圖片</button> : null}
            </div>

            <div className="form-actions"><span>{editingId ? "修改將立即更新你的私人時間帶。" : "儲存後，這段記憶會出現在左側索引與時間預覽。"}</span><button type="submit" disabled={isSaving}>{isSaving ? <Loader2 size={16} className="animate-spin" /> : <PencilLine size={16} />}{editingId ? "儲存變更" : "存入時間帶"}</button></div>
          </form>
        </section>

        <aside className="timeline-preview" aria-label="選取事件的時間帶預覽">
          <div className="panel-title"><span>時間帶預覽</span><b>LIVE</b></div>
          {selectedEvent ? (
            <>
              <div className="preview-date"><span>{formatDate(selectedEvent.occurredAt, selectedEvent.datePrecision)}</span><i style={{ backgroundColor: selectedEvent.color }} /></div>
              <article className="preview-card">
                {selectedEvent.media[0] ? <div className="preview-image"><img src={selectedEvent.media[0].url} alt={selectedEvent.media[0].caption ?? selectedEvent.title} /><button onClick={() => removeImage(selectedEvent.media[0].id)} aria-label="移除這張圖片"><Trash2 size={14} /></button></div> : null}
                <p className="preview-type">{eventTypes.find((type) => type.value === selectedEvent.eventType)?.label} {selectedEvent.ageLabel ? `/ ${selectedEvent.ageLabel}` : ""}</p>
                <h3>{selectedEvent.title}</h3>
                <p className="preview-body">{selectedEvent.body || "這段記憶還在等待你寫下細節。"}</p>
                {selectedEvent.place ? <p className="preview-place"><MapPin size={13} /> {selectedEvent.place}</p> : null}
                <div className="preview-tags">{selectedEvent.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
                <div className="event-visibility-control"><span>{selectedEvent.isPublic ? <Globe2 size={13} /> : <LockKeyhole size={13} />}{selectedEvent.isPublic ? "允許分享" : "私人事件"}</span><button onClick={toggleSelectedEventVisibility} disabled={visibilityMutation.isPending}>{selectedEvent.isPublic ? "改為私人" : "允許分享"}</button></div>
                <div className="preview-actions"><button onClick={() => editEvent(selectedEvent)}><PencilLine size={14} /> 編輯</button><button className="delete" onClick={() => removeEvent(selectedEvent.id)}><Trash2 size={14} /> 刪除</button></div>
              </article>
              <div className="preview-ruler" aria-hidden="true"><i /><b>{new Date(selectedEvent.occurredAt).getFullYear()}</b><i /><span>NOW</span></div>
            </>
          ) : <div className="empty-preview"><Archive size={23} /><h3>尚未有事件</h3><p>在中間的編輯區寫下第一段記憶，時間軸就會從這裡開始。</p></div>}
        </aside>
      </div>
    </div>
  );
}

export default function DiaryEditor() {
  return <DashboardLayout><DiaryEditorContent /></DashboardLayout>;
}
