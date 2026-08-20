/**
 * Design reminder — personal growth archive: structured like a private editorial desk,
 * with a live chronological canvas, tactile index cards, and deliberate cinnabar markers.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { DiaryEditorHeader } from "@/components/DiaryEditorHeader";
import { DiaryLoadState } from "@/components/DiaryLoadState";
import { annualReviewTemplates, buildAnnualReview, createAnnualReviewFrontmatter, type AnnualReviewTemplate } from "@/lib/annualReview";
import { consumeTagInputEnter, diaryColors, eventTypes, formatDate, formatInputDate, makeEmptyForm, parseCoordinateE6, readImage, toTimestamp, type DatePrecision, type EventForm, type EventType, type PendingImage } from "@/lib/diaryEditor";
import { filterDiaryEvents, type DiarySortOrder } from "@/lib/diaryFilters";
import { getDiaryLoadStatus } from "@/lib/diaryLoadState";
import { exportDiaryAsLongImage, exportDiaryAsPdf } from "@/lib/diaryExport";
import { createMediaArchive, downloadMediaArchive, readMediaArchive, type ImportedMediaArchive } from "@/lib/diaryMediaArchive";
import { createPortableDiaryExport, downloadPortableDiary } from "@/lib/diaryPortable";
import { parseChronicleImport, type ChronicleImportPreview } from "@/lib/diaryImport";
import { appendWritingGuide, getLocalWritingGuides } from "@/lib/writingGuide";
import { getComparisonPair } from "@/lib/beforeAfter";
import { formatCapsuleCountdown, getLifeProgress, getTimeCapsuleStatus } from "@/lib/lifeProgress";
import { getVisualExportRecord } from "@/lib/visualExport";
import { createChronicleFrontmatter, downloadChronicleFrontmatter, parseChronicleFrontmatter } from "@/lib/diaryFrontmatter";
import { downloadMilestoneCard } from "@/lib/socialMilestoneCard";
import { buildAnnualShareCardData, downloadAnnualShareCard } from "@/lib/annualSocialCard";
import { parseSocialDraftCsv, parseSocialDraftJson, type SocialDraftCandidate } from "@/lib/socialDraftImport";
import { buildTrackRows, filterEventsBySkill, getTimelineInsights, getTimelineSkills, isTimeCapsuleLocked, milestoneLabels } from "@/lib/multitrackTimeline";
import { buildPlaceFootprints, buildSpatialFootprints, getBentoSpan, timelineViewOptions, type TimelineViewMode } from "@/lib/timelineViews";
import { trpc } from "@/lib/trpc";
import { canEditFamilyDiary, canManageAnnualReview, canManageFamilyDiarySettings, describeFamilyAuditAction, type FamilyDiaryAccessRole } from "@/lib/familyCollaboration";
import "@/styles/family-collaboration.css";
import "@/styles/diary-profile.css";
import "@/styles/annual-review.css";
import "@/styles/account-revisions.css";
import "@/styles/diary-workspace.css";
import "@/styles/diary-event-studio.css";
import {
  Archive,
  ArrowDownUp,
  BrainCircuit,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronRight,
  Copy,
  FilePenLine,
  FileJson,
  FileDown,
  Globe2,
  GripVertical,
  History,
  ImagePlus,
  ImageDown,
  Link2,
  Loader2,
  LockKeyhole,
  MapPin,
  Music,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ShareMode = "private" | "public" | "link";
type PublicStoryLayout = "editorial" | "gallery" | "minimal";
type PhaseKey = "childhood" | "education" | "career";
type PhaseBoundaries = Record<PhaseKey, { start: string; end: string }>;
type MobileWorkspacePanel = "index" | "compose" | "preview";

function DiaryEditorContent() {
  const utils = trpc.useUtils();
  const [location] = useLocation();
  const requestedDiaryId = useMemo(() => {
    const value = new URLSearchParams(location.split("?")[1] ?? "").get("diary");
    const parsed = value ? Number(value) : undefined;
    return parsed && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, [location]);
  const diaryQueryInput = useMemo(() => requestedDiaryId ? { diaryId: requestedDiaryId } : undefined, [requestedDiaryId]);
  const { data, isLoading, error, refetch } = trpc.diary.get.useQuery(diaryQueryInput, { retry: 1, staleTime: 0, refetchOnMount: "always" });
  const accessRole = (data?.accessRole ?? "owner") as FamilyDiaryAccessRole;
  const canEdit = canEditFamilyDiary(accessRole);
  const isOwner = canManageFamilyDiarySettings(accessRole);
  const canManageCurrentAnnualReview = canManageAnnualReview(accessRole);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [form, setForm] = useState<EventForm>(makeEmptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [skillDraft, setSkillDraft] = useState("");
  const [phaseKeywordDraft, setPhaseKeywordDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [familyInviteEmail, setFamilyInviteEmail] = useState("");
  const [familyInviteRole, setFamilyInviteRole] = useState<"editor" | "commenter">("commenter");
  const [familyInviteUrl, setFamilyInviteUrl] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | EventType>("all");
  const [filterTag, setFilterTag] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [timelineViewMode, setTimelineViewMode] = useState<TimelineViewMode>("timeline");
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<DiarySortOrder>("custom");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [birthYear, setBirthYear] = useState("");
  const [educationStartYear, setEducationStartYear] = useState("");
  const [careerStartYear, setCareerStartYear] = useState("");
  const [privateToken, setPrivateToken] = useState<string | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [clearSharePassword, setClearSharePassword] = useState(false);
  const [shareExpiryDate, setShareExpiryDate] = useState("");
  const [publicCoverTitle, setPublicCoverTitle] = useState("");
  const [publicStoryLayout, setPublicStoryLayout] = useState<PublicStoryLayout>("editorial");
  const [pendingCover, setPendingCover] = useState<PendingImage | null>(null);
  const [clearPublicCover, setClearPublicCover] = useState(false);
  const [profileTitle, setProfileTitle] = useState("");
  const [profileSubtitle, setProfileSubtitle] = useState("");
  const [annualYear, setAnnualYear] = useState("");
  const [annualTemplate, setAnnualTemplate] = useState<AnnualReviewTemplate>("narrative");
  const [annualAiConsent, setAnnualAiConsent] = useState(false);
  const [phaseBoundaries, setPhaseBoundaries] = useState<PhaseBoundaries>({ childhood: { start: "", end: "" }, education: { start: "", end: "" }, career: { start: "", end: "" } });
  const [draggedEventId, setDraggedEventId] = useState<number | null>(null);
  const [draggedMediaId, setDraggedMediaId] = useState<number | null>(null);
  const [mediaCaptionDrafts, setMediaCaptionDrafts] = useState<Record<number, string>>({});
  const [editingReflectionKey, setEditingReflectionKey] = useState<PhaseKey | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState({ recap: "", reflection: "" });
  const [mobileWorkspacePanel, setMobileWorkspacePanel] = useState<MobileWorkspacePanel>("compose");
  const [importPreview, setImportPreview] = useState<ChronicleImportPreview | null>(null);
  const [socialPreview, setSocialPreview] = useState<SocialDraftCandidate[] | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [accountDeleteConfirmation, setAccountDeleteConfirmation] = useState("");
  const [mediaArchivePreview, setMediaArchivePreview] = useState<ImportedMediaArchive | null>(null);
  const [isMediaArchiveExporting, setIsMediaArchiveExporting] = useState(false);
  const [isMediaArchiveImporting, setIsMediaArchiveImporting] = useState(false);
  const exportRef = useRef<HTMLElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const socialImportInputRef = useRef<HTMLInputElement>(null);
  const mediaArchiveInputRef = useRef<HTMLInputElement>(null);
  const tagEnterSubmitGuard = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      setLoadTimedOut(false);
      return;
    }
    const timeout = window.setTimeout(() => setLoadTimedOut(true), 10_000);
    return () => window.clearTimeout(timeout);
  }, [isLoading]);

  const saveMutation = trpc.diary.createEvent.useMutation();
  const updateMutation = trpc.diary.updateEvent.useMutation();
  const uploadMutation = trpc.diary.uploadImage.useMutation();
  const deleteMutation = trpc.diary.deleteEvent.useMutation();
  const deleteImageMutation = trpc.diary.deleteImage.useMutation();
  const updateImageMutation = trpc.diary.updateImage.useMutation();
  const reorderImagesMutation = trpc.diary.reorderImages.useMutation();
  const uploadCoverMutation = trpc.diary.uploadCoverImage.useMutation();
  const visibilityMutation = trpc.diary.setEventVisibility.useMutation();
  const sharingMutation = trpc.diary.updateSharing.useMutation();
  const reorderMutation = trpc.diary.reorderEvents.useMutation();
  const phaseBoundariesMutation = trpc.diary.updatePhaseBoundaries.useMutation();
  const reflectionMutation = trpc.diary.generatePhaseReflection.useMutation();
  const reflectionSaveMutation = trpc.diary.updatePhaseReflection.useMutation();
  const aiPreferenceMutation = trpc.diary.updateAiPreference.useMutation();
  const annualReflectionMutation = trpc.diary.generateAnnualReflection.useMutation({
    onSuccess: async () => {
      setAnnualAiConsent(false);
      await utils.diary.get.invalidate();
      toast.success("已保存 AI 年度回顧。你可隨時刪除這段文字。");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteAnnualReflectionMutation = trpc.diary.deleteAnnualReflection.useMutation({
    onSuccess: async () => {
      await utils.diary.get.invalidate();
      toast.success("已刪除 AI 年度回顧。原始事件不會受到影響。");
    },
    onError: (error) => toast.error(error.message),
  });
  const profileMutation = trpc.diary.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.diary.get.invalidate();
      toast.success("已更新這本成長史的側寫。");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteReflectionMutation = trpc.diary.deletePhaseReflection.useMutation();
  const importMutation = trpc.diary.importEvents.useMutation();
  const restoreRevisionMutation = trpc.diary.restoreEventRevision.useMutation();
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();
  const familyInviteMutation = trpc.diary.createFamilyInvite.useMutation({
    onSuccess: (invite) => {
      setFamilyInviteEmail("");
      setFamilyInviteUrl(`${window.location.origin}/family-invite?token=${encodeURIComponent(invite.token)}`);
      toast.success(`已建立 ${invite.role === "editor" ? "共同編輯" : "註解"}邀請；請安全地交給指定收件者。`);
    },
    onError: (error) => toast.error(error.message),
  });
  const eventCommentsQuery = trpc.diary.getEventComments.useQuery({ eventId: selectedId ?? 0 }, { enabled: Boolean(selectedId) });
  const createCommentMutation = trpc.diary.createEventComment.useMutation({
    onSuccess: async () => {
      setCommentDraft("");
      await utils.diary.getEventComments.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const familyMembersQuery = trpc.diary.getFamilyMembers.useQuery(undefined, { enabled: isOwner });
  const familyAuditQuery = trpc.diary.getFamilyAudit.useQuery(undefined, { enabled: isOwner });
  const removeFamilyMemberMutation = trpc.diary.removeFamilyMember.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.diary.getFamilyMembers.invalidate(), utils.diary.getFamilyAudit.invalidate()]);
      toast.success("已移除家庭成員的日記存取權限。");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateFamilyMemberRoleMutation = trpc.diary.updateFamilyMemberRole.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.diary.getFamilyMembers.invalidate(), utils.diary.getFamilyAudit.invalidate()]);
      toast.success("已更新家庭成員角色。");
    },
    onError: (error) => toast.error(error.message),
  });

  type DiaryEvent = NonNullable<typeof data>["events"][number];
  const events: DiaryEvent[] = data?.events ?? [];
  const baseVisibleEvents = useMemo(
    () => filterDiaryEvents(events, { type: filterType, tag: filterTag, search: searchQuery, dateFrom, dateTo, sortOrder }),
    [dateFrom, dateTo, events, filterTag, filterType, searchQuery, sortOrder],
  );
  const phaseScopedEvents = useMemo(() => {
    if (phaseFilter === "all") return baseVisibleEvents;
    const phase = data?.lifePhases.find((item) => item.key === phaseFilter);
    if (!phase) return baseVisibleEvents;
    const eventIds = new Set(phase.events.map((event) => event.id));
    return baseVisibleEvents.filter((event) => eventIds.has(event.id));
  }, [baseVisibleEvents, data?.lifePhases, phaseFilter]);
  const timelineSkills = useMemo(() => getTimelineSkills(phaseScopedEvents), [phaseScopedEvents]);
  const visibleEvents = useMemo(() => filterEventsBySkill(phaseScopedEvents, skillFilter), [phaseScopedEvents, skillFilter]);
  const trackRows = useMemo(() => buildTrackRows(visibleEvents, null), [visibleEvents]);
  const timelineInsights = useMemo(() => getTimelineInsights(visibleEvents), [visibleEvents]);
  const bentoEvents = useMemo(() => [...visibleEvents].sort((left, right) => right.milestoneWeight - left.milestoneWeight || right.occurredAt - left.occurredAt), [visibleEvents]);
  const placeFootprints = useMemo(() => buildPlaceFootprints(visibleEvents), [visibleEvents]);
  const spatialFootprints = useMemo(() => buildSpatialFootprints(visibleEvents), [visibleEvents]);
  const selectedEvent = events.find((event) => event.id === (selectedId ?? editingId)) ?? visibleEvents[0] ?? events[0];
  const comparisonPair = useMemo(() => getComparisonPair(events, selectedEvent), [events, selectedEvent]);
  const selectedCapsuleStatus = useMemo(() => getTimeCapsuleStatus(selectedEvent?.unlocksAt), [selectedEvent?.unlocksAt]);
  const lifeProgress = useMemo(() => getLifeProgress(data?.diary.birthYear), [data?.diary.birthYear]);
  const visualExportRecords = useMemo(() => events.map((event) => getVisualExportRecord(event)), [events]);
  const revisionsQuery = trpc.diary.getEventRevisions.useQuery(
    { eventId: selectedEvent?.id ?? 0 },
    { enabled: Boolean(selectedEvent && showRevisions), staleTime: 0 },
  );
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
  const privateAnnualEvents = useMemo(() => events.filter((event) => event.shareScope === "private"), [events]);
  const availableYears = useMemo(() => Array.from(new Set(privateAnnualEvents.map((event) => new Date(event.occurredAt).getFullYear()))).sort((left, right) => right - left), [privateAnnualEvents]);
  const annualReview = useMemo(() => buildAnnualReview(privateAnnualEvents, Number(annualYear || availableYears[0] || new Date().getFullYear()), annualTemplate), [annualTemplate, annualYear, availableYears, privateAnnualEvents]);
  const activeAnnualYear = Number(annualYear || availableYears[0] || new Date().getFullYear());
  const annualPublicReview = useMemo(() => buildAnnualReview(events.filter((event) => event.shareScope === "public"), activeAnnualYear, annualTemplate), [activeAnnualYear, annualTemplate, events]);
  const annualShareCard = useMemo(() => buildAnnualShareCardData(events, activeAnnualYear, annualPublicReview.lead), [activeAnnualYear, annualPublicReview.lead, events]);
  const annualAiReflection = data?.annualReflections.find((reflection) => reflection.year === activeAnnualYear);
  const exportAnnualReviewMarkdown = () => {
    if (!data) return;
    const content = createAnnualReviewFrontmatter({
      diaryTitle: data.diary.title,
      year: activeAnnualYear,
      template: annualTemplate,
      review: annualReview,
      aiReflection: annualAiReflection,
    });
    downloadChronicleFrontmatter(content, `year-review-${activeAnnualYear}`);
    toast.success("已匯出年度回顧 Markdown。內容僅保存在此下載檔。 ");
  };
  const writingGuides = useMemo(() => getLocalWritingGuides(form.eventType), [form.eventType]);

  useEffect(() => {
    if (!data) return;
    setShareMode(data.sharing.mode);
    setBirthYear(data.diary.birthYear?.toString() ?? "");
    setEducationStartYear(data.diary.educationStartYear?.toString() ?? "");
    setCareerStartYear(data.diary.careerStartYear?.toString() ?? "");
    setShareExpiryDate(data.sharing.expiresAt ? new Date(data.sharing.expiresAt).toISOString().slice(0, 10) : "");
    setClearSharePassword(false);
    setPublicCoverTitle(data.diary.publicCoverTitle ?? "");
    setPublicStoryLayout(data.diary.publicStoryLayout);
    setClearPublicCover(false);
    setPendingCover(null);
    setProfileTitle(data.diary.title);
    setProfileSubtitle(data.diary.subtitle ?? "");
    setAnnualYear((current) => current || String(availableYears[0] ?? new Date().getFullYear()));
    setPhaseBoundaries({
      childhood: { start: data.diary.childhoodStartYear?.toString() ?? data.diary.birthYear?.toString() ?? "", end: data.diary.childhoodEndYear?.toString() ?? "" },
      education: { start: data.diary.educationStartYear?.toString() ?? "", end: data.diary.educationEndYear?.toString() ?? "" },
      career: { start: data.diary.careerStartYear?.toString() ?? "", end: data.diary.careerEndYear?.toString() ?? "" },
    });
  }, [availableYears, data]);

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

  const addSkill = (rawSkill = skillDraft) => {
    const skill = rawSkill.trim().replace(/\s+/g, " ");
    if (!skill) return;
    if (skill.length > 24) return toast.error("每個技能標籤最多 24 個字元。");
    if (form.skillNames.some((name) => name.toLocaleLowerCase() === skill.toLocaleLowerCase())) {
      setSkillDraft("");
      return;
    }
    if (form.skillNames.length >= 8) return toast.error("每筆記憶最多保留 8 個技能標籤。");
    setForm((current) => ({ ...current, skillNames: [...current.skillNames, skill] }));
    setSkillDraft("");
  };

  const addPhaseKeyword = (rawKeyword = phaseKeywordDraft) => {
    const keyword = rawKeyword.trim().replace(/\s+/g, " ");
    if (!keyword) return;
    if (keyword.length > 24) return toast.error("每個階段關鍵字最多 24 個字元。");
    if (form.phaseKeywords.some((item) => item.toLocaleLowerCase() === keyword.toLocaleLowerCase())) {
      setPhaseKeywordDraft("");
      return;
    }
    if (form.phaseKeywords.length >= 8) return toast.error("每筆記憶最多保留 8 個階段關鍵字。");
    setForm((current) => ({ ...current, phaseKeywords: [...current.phaseKeywords, keyword] }));
    setPhaseKeywordDraft("");
  };

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const consumed = consumeTagInputEnter(event, () => {
      tagEnterSubmitGuard.current = true;
      addTag();
    });
    if (consumed) window.setTimeout(() => { tagEnterSubmitGuard.current = false; }, 0);
  };

  const handleSkillInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const consumed = consumeTagInputEnter(event, () => {
      tagEnterSubmitGuard.current = true;
      addSkill();
    });
    if (consumed) window.setTimeout(() => { tagEnterSubmitGuard.current = false; }, 0);
  };

  const handlePhaseKeywordInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const consumed = consumeTagInputEnter(event, () => {
      tagEnterSubmitGuard.current = true;
      addPhaseKeyword();
    });
    if (consumed) window.setTimeout(() => { tagEnterSubmitGuard.current = false; }, 0);
  };

  const applyWritingGuide = (template: string) => {
    setForm((current) => ({ ...current, body: appendWritingGuide(current.body, template) }));
  };

  const saveDiaryProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwner) return;
    profileMutation.mutate({ title: profileTitle, subtitle: profileSubtitle || null });
  };

  const startNewEvent = () => {
    setMobileWorkspacePanel("compose");
    setEditingId(null);
    setSelectedId(null);
    setPendingImages([]);
    setTagDraft("");
    setSkillDraft("");
    setPhaseKeywordDraft("");
    setForm(makeEmptyForm());
  };

  const editEvent = (event: (typeof events)[number]) => {
    setMobileWorkspacePanel("compose");
    setEditingId(event.id);
    setSelectedId(event.id);
    setTagDraft("");
    setSkillDraft("");
    setPhaseKeywordDraft("");
    setPendingImages([]);
    setShowRevisions(false);
    setMediaCaptionDrafts(Object.fromEntries(event.media.map((media) => [media.id, media.caption ?? ""])));
    setForm({
      title: event.title,
      occurredAt: formatInputDate(event.occurredAt),
      datePrecision: event.datePrecision,
      eventType: event.eventType,
      body: event.body,
      ageLabel: event.ageLabel ?? "",
      place: event.place ?? "",
      mapLatitude: event.mapLatitudeE6 == null ? "" : String(event.mapLatitudeE6 / 1_000_000),
      mapLongitude: event.mapLongitudeE6 == null ? "" : String(event.mapLongitudeE6 / 1_000_000),
      locationPrivacy: event.locationPrivacy,
      color: event.color as (typeof diaryColors)[number],
      tagNames: event.tags.map((tag) => tag.name),
      skillNames: event.skills.map((skill) => skill.name),
      phaseKeywords: event.phaseKeywords,
      track: event.track,
      milestoneType: event.milestoneType,
      milestoneWeight: event.milestoneWeight,
      comparisonGroup: event.comparisonGroup ?? "",
      unlocksAt: event.unlocksAt ? formatInputDate(event.unlocksAt) : "",
      soundtrackTitle: event.soundtrackTitle ?? "",
      soundtrackUrl: event.soundtrackUrl ?? "",
      shareScope: event.shareScope,
    });
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const validFiles = files.filter((file) => file.type.startsWith("image/") && file.size <= 4 * 1024 * 1024);
    if (validFiles.length !== files.length) toast.error("僅可加入 JPG、PNG、WebP 或 GIF，且每張圖片不可超過 4MB。");
    if (!validFiles.length) return;
    try {
      const images = await Promise.all(validFiles.map(readImage));
      setPendingImages((current) => [...current, ...images].slice(0, 8));
      if (pendingImages.length + images.length > 8) toast.info("每段記憶最多一次加入 8 張圖片。");
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "圖片暫存失敗。");
    }
  };

  const handleCoverImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return toast.error("封面需為 4MB 以內的 JPG、PNG、WebP 或 GIF 圖片。");
    try {
      setPendingCover(await readImage(file));
      setClearPublicCover(false);
    } catch (coverError) {
      toast.error(coverError instanceof Error ? coverError.message : "無法讀取封面圖片。");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return toast.error("你目前只有註解權限，無法修改事件。");
    if (tagEnterSubmitGuard.current) {
      tagEnterSubmitGuard.current = false;
      return;
    }
    if (!form.title.trim()) return toast.error("先為這段記憶寫下標題。");
    const mapLatitudeE6 = parseCoordinateE6(form.mapLatitude, 90);
    const mapLongitudeE6 = parseCoordinateE6(form.mapLongitude, 180);
    if (mapLatitudeE6 === undefined || mapLongitudeE6 === undefined) return toast.error("私有座標超出有效範圍，緯度需在 -90 到 90、經度需在 -180 到 180 之間。");
    if ((mapLatitudeE6 === null) !== (mapLongitudeE6 === null)) return toast.error("請同時填入緯度與經度，或清空兩者。 ");
    if (form.locationPrivacy === "precise" && (mapLatitudeE6 === null || mapLongitudeE6 === null)) return toast.error("精確位置僅私用時，請主動填入完整座標。 ");
    const { mapLatitude: _mapLatitude, mapLongitude: _mapLongitude, ...eventForm } = form;
    const payload = {
      ...eventForm,
      occurredAt: toTimestamp(form.occurredAt, form.datePrecision),
      ageLabel: form.ageLabel.trim() || null,
      place: form.place.trim() || null,
      comparisonGroup: form.comparisonGroup.trim() || null,
      unlocksAt: form.unlocksAt ? new Date(`${form.unlocksAt}T00:00:00`).getTime() : null,
      mapLatitudeE6,
      mapLongitudeE6,
      soundtrackTitle: form.soundtrackTitle.trim() || null,
      soundtrackUrl: form.soundtrackUrl.trim() || null,
    };

    try {
      const saved = editingId
        ? await updateMutation.mutateAsync({ id: editingId, ...payload })
        : await saveMutation.mutateAsync({ ...payload, ...(requestedDiaryId ? { diaryId: requestedDiaryId } : {}) });

      for (const image of pendingImages) {
        await uploadMutation.mutateAsync({ eventId: saved.id, fileName: image.name, mimeType: image.type, base64: image.base64, caption: image.caption.trim() || undefined });
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

  const saveImageCaption = async (id: number) => {
    if (!canEdit) return toast.error("你目前只有註解權限，無法修改圖片說明。");
    try {
      await updateImageMutation.mutateAsync({ id, caption: mediaCaptionDrafts[id]?.trim() || null });
      await utils.diary.get.invalidate();
      toast.success("圖片說明已更新。");
    } catch (mediaError) {
      toast.error(mediaError instanceof Error ? mediaError.message : "無法更新圖片說明。");
    }
  };

  const dropImageAt = async (targetId: number) => {
    if (!selectedEvent || draggedMediaId === null || draggedMediaId === targetId) return;
    const mediaIds = selectedEvent.media.map((media) => media.id);
    const fromIndex = mediaIds.indexOf(draggedMediaId);
    const targetIndex = mediaIds.indexOf(targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    mediaIds.splice(fromIndex, 1);
    mediaIds.splice(targetIndex, 0, draggedMediaId);
    try {
      await reorderImagesMutation.mutateAsync({ eventId: selectedEvent.id, mediaIds });
      await utils.diary.get.invalidate();
      toast.success("圖片順序已更新。");
    } catch (mediaError) {
      toast.error(mediaError instanceof Error ? mediaError.message : "無法儲存圖片順序。");
    } finally {
      setDraggedMediaId(null);
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
        publicCoverTitle: publicCoverTitle || null,
        publicStoryLayout,
        clearPublicCover,
      });
      if (pendingCover) {
        await uploadCoverMutation.mutateAsync({ fileName: pendingCover.name, mimeType: pendingCover.type, base64: pendingCover.base64 });
        setPendingCover(null);
      }
      if (result.shareToken) setPrivateToken(result.shareToken);
      setSharePassword("");
      setClearSharePassword(false);
      setClearPublicCover(false);
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
    if (!canEdit) return toast.error("你目前只有註解權限，無法修改事件可見度。");
    try {
      await visibilityMutation.mutateAsync({ id: selectedEvent.id, shareScope: selectedEvent.shareScope === "public" ? "private" : "public" });
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

  const updateAiPreference = async (aiEnabled: boolean) => {
    if (!aiEnabled && !window.confirm("關閉 AI 後，系統不會再將事件內容送去生成新的回顧；已保存的回顧仍可手動刪除。要繼續嗎？")) return;
    try {
      await aiPreferenceMutation.mutateAsync({ aiEnabled });
      await utils.diary.get.invalidate();
      toast.success(aiEnabled ? "AI 回顧已啟用。生成時只會使用你選定階段的事件。" : "AI 回顧已關閉。原始日記與既有文字不會被更動。" );
    } catch (preferenceError) {
      toast.error(preferenceError instanceof Error ? preferenceError.message : "無法更新 AI 偏好。 ");
    }
  };

  const removePhaseReflection = async (phaseKey: PhaseKey) => {
    if (!window.confirm("確定要刪除這個階段的已保存回顧嗎？原始日記事件不會受到影響。")) return;
    try {
      await deleteReflectionMutation.mutateAsync({ phaseKey });
      await utils.diary.get.invalidate();
      setEditingReflectionKey(null);
      toast.success("這段已保存的回顧已刪除。原始事件維持不變。" );
    } catch (reflectionError) {
      toast.error(reflectionError instanceof Error ? reflectionError.message : "無法刪除這段回顧。 ");
    }
  };

  const restoreEventRevision = async (revisionId: number, version: number) => {
    if (!selectedEvent) return;
    if (!window.confirm(`要還原「${selectedEvent.title}」到第 ${version} 版嗎？目前內容會先自動保存為新的版本。`)) return;
    try {
      await restoreRevisionMutation.mutateAsync({ eventId: selectedEvent.id, revisionId });
      await Promise.all([utils.diary.get.invalidate(), revisionsQuery.refetch()]);
      toast.success(`已還原至第 ${version} 版；還原前內容也已保留在版本歷程。`);
    } catch (restoreError) {
      toast.error(restoreError instanceof Error ? restoreError.message : "無法還原這個版本，請稍後再試。 ");
    }
  };

  const deleteCurrentAccount = async () => {
    if (accountDeleteConfirmation !== "刪除我的帳號") return;
    try {
      await deleteAccountMutation.mutateAsync({ confirmation: accountDeleteConfirmation });
      toast.success("帳號與日記資料已清除。即將回到首頁。 ");
      window.setTimeout(() => window.location.assign("/"), 700);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "無法刪除帳號，請稍後再試。 ");
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
    if (!canEdit) return toast.error("你目前只有註解權限，無法調整事件順序。");
    if (filterType !== "all" || filterTag !== "all" || searchQuery || dateFrom || dateTo || sortOrder !== "custom") return toast.info("請先切換為「手動順序」並清除搜尋與篩選，再拖曳重新排序。");
    const orderedIds = events.map((event) => event.id);
    const fromIndex = orderedIds.indexOf(draggedEventId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    orderedIds.splice(fromIndex, 1);
    orderedIds.splice(targetIndex, 0, draggedEventId);
    try {
      await reorderMutation.mutateAsync({ eventIds: orderedIds, ...(requestedDiaryId ? { diaryId: requestedDiaryId } : {}) });
      await utils.diary.get.invalidate();
      toast.success("事件順序已更新。");
    } catch (orderError) {
      toast.error(orderError instanceof Error ? orderError.message : "無法儲存事件順序。");
    } finally {
      setDraggedEventId(null);
    }
  };

  const exportArchive = async (format: "pdf" | "image" | "json" | "markdown" | "frontmatter") => {
    if (!exportRef.current) return;
    if (events.length === 0) return toast.info("先寫下一段記憶，才能匯出成長史。" );
    const baseName = (data?.diary.title ?? "我的成長史").replace(/[^\u4e00-\u9fffa-zA-Z0-9_-]/g, "-") || "chronicle-growth-diary";
    try {
      if (format === "pdf") await exportDiaryAsPdf(exportRef.current, baseName);
      else if (format === "image") await exportDiaryAsLongImage(exportRef.current, baseName);
      else if (format === "frontmatter") {
        if (!data) return;
        downloadChronicleFrontmatter(createChronicleFrontmatter({ diary: data.diary, events }), baseName);
      }
      else if (data) downloadPortableDiary(createPortableDiaryExport(data), format, baseName);
      toast.success(format === "pdf" ? "PDF 已開始下載。" : format === "image" ? "長圖片已開始下載。" : format === "json" ? "JSON 備份已開始下載。" : format === "frontmatter" ? "Frontmatter Markdown 已開始下載。" : "Markdown 備份已開始下載。" );
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : "匯出失敗，請稍後再試。");
    }
  };

  const exportMediaArchive = async () => {
    if (!canEdit) return toast.error("你目前只有註解權限，無法建立媒體封存。");
    if (!events.some((item) => item.media.length)) return toast.info("目前沒有事件圖片可打包。");
    const baseName = (data?.diary.title ?? "我的成長史").replace(/[^\u4e00-\u9fffa-zA-Z0-9_-]/g, "-") || "chronicle-growth-diary";
    setIsMediaArchiveExporting(true);
    try {
      const archive = await createMediaArchive(events);
      downloadMediaArchive(archive.blob, baseName);
      toast.success(`已建立媒體封存：${archive.itemCount} 張圖片。`);
    } catch (archiveError) {
      toast.error(archiveError instanceof Error ? archiveError.message : "無法建立媒體封存。");
    } finally {
      setIsMediaArchiveExporting(false);
    }
  };

  const selectImportFile = () => importInputRef.current?.click();
  const selectSocialImportFile = () => socialImportInputRef.current?.click();
  const selectMediaArchiveFile = () => mediaArchiveInputRef.current?.click();

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("匯入檔案不可超過 2MB；媒體請在匯入後自行重新上傳。 ");
    try {
      const raw = await file.text();
      setImportPreview(file.name.toLowerCase().endsWith(".md") ? parseChronicleFrontmatter(raw) : parseChronicleImport(raw));
    } catch (importError) {
      toast.error(importError instanceof Error ? importError.message : "無法讀取這份備份檔。 ");
    }
  };

  const handleMediaArchiveFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const archive = await readMediaArchive(file);
      if (archive.eventCount !== events.length || archive.items.some((item) => {
        const target = events[item.eventIndex];
        return !target || target.title !== item.eventTitle || target.occurredAt !== item.occurredAt;
      })) {
        throw new Error("媒體封存與目前日記事件不一致；請先匯入相同的 Chronicle JSON，再選擇對應的媒體封存。");
      }
      setMediaArchivePreview(archive);
    } catch (archiveError) {
      toast.error(archiveError instanceof Error ? archiveError.message : "無法讀取媒體封存。");
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    try {
      const result = await importMutation.mutateAsync({ events: importPreview.events, ...(requestedDiaryId ? { diaryId: requestedDiaryId } : {}) });
      await utils.diary.get.invalidate();
      setImportPreview(null);
      startNewEvent();
      toast.success(`已建立 ${result.importedCount} 段私人記事。媒體請自行重新上傳。`);
    } catch (importError) {
      toast.error(importError instanceof Error ? importError.message : "匯入未完成，沒有保留這批內容。 ");
    }
  };

  const confirmMediaArchiveImport = async () => {
    if (!mediaArchivePreview) return;
    setIsMediaArchiveImporting(true);
    try {
      for (const item of mediaArchivePreview.items) {
        const target = events[item.eventIndex];
        if (!target) throw new Error("找不到媒體對應事件，已停止匯入。");
        const pendingImage = await readImage(item.file);
        await uploadMutation.mutateAsync({ eventId: target.id, fileName: pendingImage.name, mimeType: pendingImage.type, base64: pendingImage.base64, caption: item.caption ?? undefined });
      }
      await utils.diary.get.invalidate();
      setMediaArchivePreview(null);
      toast.success(`已安全匯入 ${mediaArchivePreview.items.length} 張事件圖片。`);
    } catch (archiveError) {
      toast.error(archiveError instanceof Error ? archiveError.message : "媒體匯入未完成；已完成的圖片會保留。");
    } finally {
      setIsMediaArchiveImporting(false);
    }
  };

  const handleSocialImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const raw = await file.text();
      setSocialPreview(file.name.toLowerCase().endsWith(".csv") ? parseSocialDraftCsv(raw) : parseSocialDraftJson(raw));
    } catch (importError) {
      toast.error(importError instanceof Error ? importError.message : "無法讀取社群匯出檔。 ");
    }
  };

  const confirmSocialImport = async () => {
    if (!socialPreview?.length) return;
    try {
      const result = await importMutation.mutateAsync({ events: socialPreview.map((candidate) => ({ occurredAt: candidate.occurredAt, datePrecision: "day" as const, eventType: "memory" as const, title: candidate.title, body: candidate.body, ageLabel: null, place: null, color: "#EE623B" as const, tagNames: ["社群匯入"] })), ...(requestedDiaryId ? { diaryId: requestedDiaryId } : {}) });
      await utils.diary.get.invalidate();
      setSocialPreview(null);
      toast.success(`已建立 ${result.importedCount} 段私人社群記事。`);
    } catch (importError) {
      toast.error(importError instanceof Error ? importError.message : "社群匯入未完成，沒有保留這批內容。 ");
    }
  };

  const loadStatus = getDiaryLoadStatus({ isLoading, hasError: Boolean(error), timedOut: loadTimedOut });

  if (loadStatus === "loading") return <DiaryLoadState status="loading" />;

  if (loadStatus === "error") {
    return <DiaryLoadState status="error" timedOut={loadTimedOut} onRetry={() => { setLoadTimedOut(false); void refetch(); }} />;
  }

  return (
    <div className="diary-editor">
      <DiaryEditorHeader title={data?.diary.title ?? "我的成長史"} eventCountLabel={eventCountLabel} mediaCount={hasMedia} />
      {!isOwner ? <section className="family-access-notice" aria-label="家庭共寫權限"><ShieldCheck size={17} /><div><b>{accessRole === "editor" ? "共同編輯權限" : "註解權限"}</b><p>{accessRole === "editor" ? "你可新增、編輯、排序事件與圖片，也可與家人以註解交流；分享、AI、階段設定與成員管理仍只由日記擁有者控制。" : "你可閱讀事件並新增註解；日記內容、圖片、排序、分享與帳號設定均維持由日記擁有者管理。"}</p></div></section> : null}

      {isOwner ? <section className="diary-profile-studio" aria-labelledby="diary-profile-title"><div><p className="editor-kicker"><span /> PERSONAL ARCHIVE / OWNER ONLY</p><h2 id="diary-profile-title">為這本成長史留下側寫</h2><p>以標題和短句定義這段人生的閱讀方式。側寫預設只留在私人日記中；此處不蒐集聯絡方式、完整出生日期或其他敏感個資。</p></div><form className="diary-profile-form" onSubmit={saveDiaryProfile}><label>成長史標題<input value={profileTitle} onChange={(event) => setProfileTitle(event.target.value)} maxLength={160} required /></label><label>副標題（選填）<textarea value={profileSubtitle} onChange={(event) => setProfileSubtitle(event.target.value)} maxLength={240} placeholder="例如：把重要轉折、學習與日常心緒慢慢編成一條時間帶。" /></label><footer><span>{profileSubtitle.length}/240 · 僅日記擁有者可修改</span><button type="submit" disabled={profileMutation.isPending}>{profileMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 保存側寫</button></footer></form></section> : null}

      {isOwner ? <section className="life-progress-ring" aria-labelledby="life-progress-title">{lifeProgress ? <><div className="life-progress-gauge" style={{ "--life-progress": lifeProgress.percentage } as React.CSSProperties}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" /><circle className="life-progress-value" cx="60" cy="60" r="48" /></svg><b>{lifeProgress.percentage}%</b></div><div><p className="editor-kicker"><span /> LIFE PROGRESS / PRIVATE</p><h2 id="life-progress-title">把今天，留給下一個章節。</h2><p>以年份推算的私人人生進度視覺；目前約 {lifeProgress.age} 歲，採 {lifeProgress.horizonYears} 年作為閱讀刻度。這不是壽命預測，也不會出現在公開故事。</p></div></> : <><div className="life-progress-gauge is-unset"><span>—</span></div><div><p className="editor-kicker"><span /> LIFE PROGRESS / OPTIONAL</p><h2 id="life-progress-title">人生進度環尚未啟用</h2><p>如需使用，請在分享設定中選擇性提供出生年份。系統只使用年份建立私人閱讀刻度，不要求完整出生日期。</p></div></>}</section> : null}

      <section className="life-phase-overview" ref={exportRef} aria-labelledby="life-phase-title">
        <div className="phase-heading">
          <div><p className="editor-kicker"><span /> LIFE CHAPTERS / EDITABLE</p><h2 id="life-phase-title">人生階段總覽</h2><p>系統會先依事件時間與錨點編排階段；你也可以拖曳每個階段的起訖時間，讓分段更貼近自己的敘事。</p></div>
          <div className="export-actions"><span>完整成長史備份<small>未解鎖時空膠囊在 PDF／長圖中會自動遮罩</small></span><input ref={importInputRef} type="file" accept="application/json,.json,text/markdown,.md" onChange={handleImportFile} hidden /><input ref={socialImportInputRef} type="file" accept="application/json,.json,text/csv,.csv" onChange={handleSocialImportFile} hidden /><input ref={mediaArchiveInputRef} type="file" accept="application/zip,.zip" onChange={handleMediaArchiveFile} hidden /><button onClick={() => exportArchive("pdf")}><FileDown size={15} /> 匯出 PDF</button><button onClick={() => exportArchive("image")}><ImageDown size={15} /> 匯出長圖片</button><button onClick={() => exportArchive("json")}><FileJson size={15} /> 匯出 JSON</button><button onClick={() => exportArchive("markdown")}><FilePenLine size={15} /> 匯出 Markdown</button><button onClick={() => exportArchive("frontmatter")}><FilePenLine size={15} /> 匯出 Frontmatter</button>{canEdit ? <><button onClick={exportMediaArchive} disabled={isMediaArchiveExporting}>{isMediaArchiveExporting ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />} 匯出媒體 ZIP</button><button onClick={selectMediaArchiveFile}><Archive size={15} /> 匯入媒體 ZIP</button><button onClick={selectImportFile}><Archive size={15} /> 匯入 JSON／Frontmatter</button><button onClick={selectSocialImportFile}><Archive size={15} /> 匯入社群草稿</button></> : null}</div>
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
                <label>起於 <strong>{boundaries.start || phase.startYear || "未設定"}</strong><input aria-label={`${phase.label}開始年份`} type="range" min={timelineYearRange.min} max={Math.max(timelineYearRange.min, endYear)} value={boundaries.start || phase.startYear || timelineYearRange.min} onChange={(event) => setPhaseBoundaries((current) => ({ ...current, [phaseKey]: { ...current[phaseKey], start: event.target.value } }))} disabled={!isOwner} /></label>
                <label>止於 <strong>{boundaries.end || phase.endYear || "未設定"}</strong><input aria-label={`${phase.label}結束年份`} type="range" min={Math.min(timelineYearRange.max, startYear)} max={timelineYearRange.max} value={boundaries.end || phase.endYear || timelineYearRange.max} onChange={(event) => setPhaseBoundaries((current) => ({ ...current, [phaseKey]: { ...current[phaseKey], end: event.target.value } }))} disabled={!isOwner} /></label>
              </div>
              <div className="phase-reflection">
                {reflection ? <>
                  <p><BrainCircuit size={14} /> {reflection.model === "manual-edit" ? "已保留的手動回顧" : "AI 成長回顧"}</p>
                  {isOwner && editingReflectionKey === phaseKey ? <div className="reflection-editor"><label>成長回顧<textarea value={reflectionDraft.recap} onChange={(event) => setReflectionDraft((draft) => ({ ...draft, recap: event.target.value }))} rows={4} maxLength={3000} /></label><label>我的反思<textarea value={reflectionDraft.reflection} onChange={(event) => setReflectionDraft((draft) => ({ ...draft, reflection: event.target.value }))} rows={3} maxLength={3000} /></label><div><button type="button" onClick={() => saveReflectionEdit(phaseKey)} disabled={reflectionSaveMutation.isPending}>{reflectionSaveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 保存我的調整</button><button type="button" className="reflection-cancel" onClick={() => setEditingReflectionKey(null)}>取消</button></div></div> : <><strong>{reflection.recap}</strong><em>{reflection.reflection}</em></>}
                </> : <p><BrainCircuit size={14} /> 尚未生成這個階段的成長回顧。</p>}
                <div className="reflection-actions">{isOwner && data?.diary.aiEnabled ? <button type="button" onClick={() => generateReflection(phaseKey)} disabled={reflectionMutation.isPending}>{reflectionMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}{reflection ? "重新生成回顧" : "生成成長回顧"}</button> : !data?.diary.aiEnabled ? <span className="ai-disabled-note"><LockKeyhole size={13} /> AI 已關閉</span> : null}{isOwner && reflection && editingReflectionKey !== phaseKey ? <button type="button" className="reflection-edit" onClick={() => beginReflectionEdit(phaseKey)}><FilePenLine size={14} /> 手動調整</button> : null}{isOwner && reflection ? <button type="button" className="reflection-delete" onClick={() => removePhaseReflection(phaseKey)} disabled={deleteReflectionMutation.isPending}><Trash2 size={14} /> 刪除回顧</button> : null}</div>
              </div>
            </article>;
          }) : <div className="phase-empty"><BookOpenCheck size={21} /><p>當你寫下更多記憶，童年、求學與職涯會在這裡逐步浮現。</p></div>}
        </div>
        <div className="ai-privacy-control"><div><p><BrainCircuit size={15} /> AI 回顧資料控制</p><span>{data?.diary.aiEnabled ? "啟用時，生成只會使用你選定階段的事件；你可隨時關閉或刪除已保存文字。" : "AI 已關閉。系統不會針對任何事件發出新的 AI 生成請求。"}</span></div>{isOwner ? <button type="button" onClick={() => updateAiPreference(!data?.diary.aiEnabled)} disabled={aiPreferenceMutation.isPending}>{aiPreferenceMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : data?.diary.aiEnabled ? <LockKeyhole size={14} /> : <WandSparkles size={14} />}{data?.diary.aiEnabled ? "關閉 AI 回顧" : "啟用 AI 回顧"}</button> : null}</div>
        {isOwner && data?.lifePhases.length ? <div className="phase-boundary-actions"><span>拖曳完成後，儲存就會重新分配事件所屬的階段。</span><button type="button" onClick={savePhaseBoundaries} disabled={phaseBoundariesMutation.isPending}>{phaseBoundariesMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <GripVertical size={14} />} 儲存階段邊界</button></div> : null}
        <div className="export-event-records">
          {visualExportRecords.map((event) => {
            return <article key={event.id}><span style={{ backgroundColor: event.color }} />{event.isTimeCapsuleLocked ? <div className="export-capsule-locked"><LockKeyhole size={16} /><b>時空膠囊鎖定中</b><p>{formatCapsuleCountdown(event.capsule.daysRemaining)} · 解鎖日：{new Date(event.capsule.unlocksAt!).toLocaleDateString("zh-TW")}</p></div> : <div className="export-record-content">{event.media[0] ? <img src={event.media[0].url} alt={event.media[0].caption ?? event.title} /> : null}<div className="export-record-copy"><b>{formatDate(event.occurredAt, event.datePrecision)} · {event.ageLabel ?? "成長記事"}</b><h3>{event.title}</h3><p>{event.body}</p>{event.place ? <small><MapPin size={12} /> {event.place}</small> : null}<div>{event.tags.map((tag) => <em key={tag.id}>{tag.name}</em>)}</div></div></div>}</article>;
          })}
        </div>
      </section>

      {importPreview ? <section className="import-studio" aria-labelledby="import-title">
        <div><p className="editor-kicker"><span /> REVIEW BEFORE IMPORT</p><h2 id="import-title">確認要帶進來的舊日記</h2><p>來源為「{importPreview.title}」，共 {importPreview.events.length} 段事件。這次匯入一律建立為私人記事，不會帶入媒體、分享設定、帳號資料或任何私密憑證。</p></div>
        <div className="import-preview-list">{importPreview.events.slice(0, 5).map((event) => <article key={`${event.occurredAt}-${event.title}`}><span>{formatDate(event.occurredAt, event.datePrecision)}</span><b>{event.title}</b><small>{event.tagNames.length ? event.tagNames.map((tag) => `#${tag}`).join(" ") : "未標記"}</small></article>)}{importPreview.events.length > 5 ? <p>另有 {importPreview.events.length - 5} 段事件將一併建立。</p> : null}</div>
        <div className="import-warning"><Archive size={15} /> {importPreview.warnings[0]}</div>
        <div className="import-actions"><button type="button" onClick={() => setImportPreview(null)} disabled={importMutation.isPending}>取消</button><button type="button" onClick={confirmImport} disabled={importMutation.isPending}>{importMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 確認建立 {importPreview.events.length} 段事件</button></div>
      </section> : null}
      {mediaArchivePreview ? <section className="import-studio" aria-labelledby="media-import-title"><div><p className="editor-kicker"><span /> MEDIA ARCHIVE / VERIFIED</p><h2 id="media-import-title">確認要還原的事件圖片</h2><p>已驗證媒體封存的 manifest、事件標題與發生時間。這次將把 {mediaArchivePreview.items.length} 張圖片加回目前相符的事件；不會接受外部 URL、儲存金鑰、分享設定或帳號資料。</p></div><div className="import-warning"><Archive size={15} /> 只接受 JPG、PNG、WebP、GIF；單張最大 4MB，封存與解壓後總量皆受 25MB 上限保護。</div><div className="import-actions"><button type="button" onClick={() => setMediaArchivePreview(null)} disabled={isMediaArchiveImporting}>取消</button><button type="button" onClick={confirmMediaArchiveImport} disabled={isMediaArchiveImporting}>{isMediaArchiveImporting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 匯入 {mediaArchivePreview.items.length} 張圖片</button></div></section> : null}
      {socialPreview ? <section className="import-studio" aria-labelledby="social-import-title"><div><p className="editor-kicker"><span /> SOCIAL DRAFT / LOCAL ONLY</p><h2 id="social-import-title">先檢視，再帶進成長史</h2><p>已在此裝置解析 {socialPreview.length} 則候選；系統已依來源 ID 去重。確認前不會寫入日記，也不會連接社群帳號。</p></div><div className="import-preview-list">{socialPreview.slice(0, 5).map((candidate) => <article key={candidate.sourceId}><span>{formatDate(candidate.occurredAt, "day")}</span><b>{candidate.title}</b><small>{candidate.isSignificant ? "重大事件候選" : "一般候選"}</small></article>)}</div><div className="import-warning"><Archive size={15} /> 確認後一律建立為私人事件，並標記「社群匯入」。請先檢視原始內容。</div><div className="import-actions"><button type="button" onClick={() => setSocialPreview(null)} disabled={importMutation.isPending}>取消</button><button type="button" onClick={confirmSocialImport} disabled={importMutation.isPending}>{importMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 確認建立 {socialPreview.length} 段事件</button></div></section> : null}

      <section className="annual-review-studio" aria-labelledby="annual-review-title">
        <div className="annual-review-heading"><p className="editor-kicker"><span /> YEAR IN REVIEW</p><h2 id="annual-review-title">把一年，整理成下一段故事的起點。</h2><p>從已經寫下的事件建立年度回顧。模板只重組你的日記內容，不會虛構新的經歷。</p></div>
        <div className="annual-review-controls"><label>回顧年份<select value={annualYear || String(availableYears[0] ?? new Date().getFullYear())} onChange={(event) => { setAnnualYear(event.target.value); setAnnualAiConsent(false); }}>{(availableYears.length ? availableYears : [new Date().getFullYear()]).map((year) => <option value={year} key={year}>{year} 年</option>)}</select></label><div>{annualReviewTemplates.map((template) => <button type="button" key={template.key} className={annualTemplate === template.key ? "active" : ""} onClick={() => setAnnualTemplate(template.key)}><b>{template.label}</b><small>{template.description}</small></button>)}</div></div>
        <article className={`annual-review-card annual-${annualTemplate}`}>
          <div><p>{annualReview.title}</p><b>{annualReview.count.toString().padStart(2, "0")} <small>段日記</small></b></div>
          <h3>{annualReview.lead}</h3>
          <div className="annual-review-highlights">{annualReview.highlights.map((highlight) => <article key={highlight.id}><span>{highlight.label}</span><h4>{highlight.title}</h4><p>{highlight.body}</p></article>)}</div>
          {annualReview.tags.length ? <div className="annual-review-tags">{annualReview.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
          <blockquote>{annualReview.prompt}</blockquote>
          {canManageCurrentAnnualReview ? <>
            <section className="social-card-actions annual-social-card-actions" aria-label="年度總結社群卡"><div><span>YEAR SHARE CARD / PUBLIC ONLY</span><small>本卡只統計 {annualShareCard.count} 段公開事件；私人與連結限定內容不會納入。</small></div><div><button type="button" onClick={() => downloadAnnualShareCard(annualShareCard, "square")}>下載年度 1:1</button><button type="button" onClick={() => downloadAnnualShareCard(annualShareCard, "portrait")}>下載年度 9:16</button></div></section>
            <section className="social-card-actions annual-social-card-actions" aria-label="年度回顧 Markdown 匯出"><div><span>PORTABLE MARKDOWN / PRIVATE EXPORT</span><small>匯出只下載至目前裝置；可能包含本年度私人事件與已保存的 AI 回顧，但不包含 token、分享設定或帳號資料。</small></div><div><button type="button" onClick={exportAnnualReviewMarkdown} disabled={annualReview.count === 0}><FileJson size={14} /> 匯出年度 Markdown</button></div></section>
            <div className="annual-ai-reflection"><p><BrainCircuit size={14} /> AI 年度回顧</p><span>{data?.diary.aiEnabled ? "只會使用此年度的事件內容生成文字；不會傳送其他年份、分享設定或帳號資料。" : "AI 已關閉。請先在上方資料控制區重新啟用。"}</span><label className="annual-ai-consent"><input type="checkbox" checked={annualAiConsent} onChange={(event) => setAnnualAiConsent(event.target.checked)} disabled={!data?.diary.aiEnabled || annualReflectionMutation.isPending} />我確認僅將 {activeAnnualYear} 年的事件內容送往 AI 生成回顧；這次生成後需要再次確認。</label>{annualAiReflection ? <><strong>{annualAiReflection.recap}</strong><em>{annualAiReflection.reflection}</em><div><button type="button" onClick={() => annualReflectionMutation.mutate({ year: activeAnnualYear, confirmAiProcessing: annualAiConsent })} disabled={annualReflectionMutation.isPending || !data?.diary.aiEnabled || !annualAiConsent}>{annualReflectionMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />} 重新生成</button><button type="button" className="annual-ai-delete" onClick={() => deleteAnnualReflectionMutation.mutate({ year: activeAnnualYear })} disabled={deleteAnnualReflectionMutation.isPending}><Trash2 size={14} /> 刪除</button></div></> : <button type="button" onClick={() => annualReflectionMutation.mutate({ year: activeAnnualYear, confirmAiProcessing: annualAiConsent })} disabled={!data?.diary.aiEnabled || !annualAiConsent || annualReflectionMutation.isPending || annualReview.count === 0}>{annualReflectionMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />} 生成 AI 年度回顧</button>}</div>
          </> : null}
        </article>
      </section>

      {isOwner ? <>
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
            <div className="family-collaboration-control">
              <p><ShieldCheck size={14} /> 家庭共寫邀請</p><small>邀請只授予此私人日記的共同編輯或註解權限；連結僅能使用一次，且預設 7 天後失效。</small>
              <div><input type="email" value={familyInviteEmail} onChange={(event) => setFamilyInviteEmail(event.target.value)} placeholder="家人的電子郵件" maxLength={320} /><select value={familyInviteRole} onChange={(event) => setFamilyInviteRole(event.target.value as "editor" | "commenter")}><option value="commenter">可註解</option><option value="editor">可共同編輯</option></select><button type="button" onClick={() => familyInviteMutation.mutate({ email: familyInviteEmail, role: familyInviteRole, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 })} disabled={!familyInviteEmail || familyInviteMutation.isPending}>{familyInviteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />} 建立邀請</button></div>
              {familyInviteUrl ? <div className="family-invite-url"><span>一次性邀請已建立；離開此頁後不會再次顯示。</span><button type="button" onClick={() => navigator.clipboard.writeText(familyInviteUrl).then(() => toast.success("已複製家庭邀請連結。"))}><Copy size={13} /> 複製邀請連結</button></div> : null}
              {familyMembersQuery.data?.length ? <div className="family-member-list">{familyMembersQuery.data.map((member) => <article key={member.id}><span><b>{member.name ?? member.email ?? "受邀成員"}</b><small>{member.role === "editor" ? "共同編輯" : "可註解"}</small></span><select aria-label={`${member.name ?? member.email ?? "成員"}角色`} value={member.role} onChange={(event) => updateFamilyMemberRoleMutation.mutate({ memberId: member.id, role: event.target.value as "editor" | "commenter" })} disabled={updateFamilyMemberRoleMutation.isPending}><option value="commenter">可註解</option><option value="editor">共同編輯</option></select><button type="button" onClick={() => removeFamilyMemberMutation.mutate({ memberId: member.id })} disabled={removeFamilyMemberMutation.isPending}>移除</button></article>)}</div> : <p className="family-empty">尚未有已接受邀請的家庭成員。</p>}
              {familyAuditQuery.data?.length ? <details className="family-audit"><summary>查看最近協作紀錄</summary><div>{familyAuditQuery.data.slice(0, 6).map((log) => <p key={log.id}><b>{log.actorName ?? "成員"}</b> · {describeFamilyAuditAction(log.action)} · {new Date(log.createdAt).toLocaleString("zh-TW")}</p>)}</div></details> : null}
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
          <div className="public-story-settings"><p><ImagePlus size={14} /> 公開故事封面與排版</p><label>封面標題<input value={publicCoverTitle} onChange={(event) => setPublicCoverTitle(event.target.value)} placeholder="預設使用日記標題" maxLength={160} /></label><label>閱讀版型<select value={publicStoryLayout} onChange={(event) => setPublicStoryLayout(event.target.value as PublicStoryLayout)}><option value="editorial">編輯式長文</option><option value="gallery">影像畫廊</option><option value="minimal">極簡時間帶</option></select></label><label className="cover-dropzone"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleCoverImageChange} />{pendingCover ? <img src={pendingCover.preview} alt="待上傳的公開故事封面" /> : data?.diary.publicCoverUrl ? <img src={data.diary.publicCoverUrl} alt="目前的公開故事封面" /> : <><ImagePlus size={20} /><b>選擇公開故事封面</b><small>JPG、PNG、WebP 或 GIF，最大 4MB</small></>}</label>{(pendingCover || data?.diary.publicCoverUrl) ? <label className="share-checkbox"><input type="checkbox" checked={clearPublicCover} onChange={(event) => { setClearPublicCover(event.target.checked); if (event.target.checked) setPendingCover(null); }} /> 移除目前封面，改用純文字開場</label> : null}</div>
          <div className="sharing-actions"><button className="save-sharing" onClick={() => updateSharing()} disabled={sharingMutation.isPending}>{sharingMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />} 儲存分享設定</button>{shareMode !== "private" ? <button className="copy-sharing" onClick={copyShareLink}><Copy size={15} /> 複製分享連結</button> : null}{shareMode === "link" ? <button className="regenerate-link" onClick={() => updateSharing(true)}><RefreshCw size={14} /> 重新產生私密連結</button> : null}</div>
          {shareMode === "link" && data?.sharing.hasPrivateLink && !privateToken ? <p className="private-link-note">為安全起見，既有私密連結不會再次顯示；需要時可重新產生。</p> : null}
          {hasShareConfiguration && shareMode === "public" ? <p className="sharing-url"><Globe2 size={14} /> {publicShareUrl}</p> : null}
          {privateShareUrl ? <p className="sharing-url private"><Link2 size={14} /> 私密連結已建立，請立即複製並妥善保管。</p> : null}
        </div>
      </section>

      <section className="account-danger-zone" aria-labelledby="account-delete-title">
        <div>
          <p className="editor-kicker"><span /> DATA CONTROL / IRREVERSIBLE</p>
          <h2 id="account-delete-title">刪除帳號與日記資料</h2>
          <p>這會立即刪除帳號、日記、事件、標籤、分享設定、存取紀錄、AI 回顧與版本歷程。媒體中繼資料與可存取引用也會一併移除；已上傳檔案不再有任何日記引用。</p>
        </div>
        <label>請輸入 <strong>刪除我的帳號</strong> 以確認<input value={accountDeleteConfirmation} onChange={(event) => setAccountDeleteConfirmation(event.target.value)} placeholder="刪除我的帳號" autoComplete="off" /></label>
        <button type="button" onClick={deleteCurrentAccount} disabled={accountDeleteConfirmation !== "刪除我的帳號" || deleteAccountMutation.isPending}>{deleteAccountMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} 永久刪除我的帳號</button>
      </section>
      </> : null}

      <nav className="editor-mobile-tabs" aria-label="日記工作區分頁" role="tablist">
        {([
          ["index", Archive, "索引"],
          ["compose", PencilLine, "撰寫"],
          ["preview", BookOpenCheck, "預覽"],
        ] as const).map(([panel, Icon, label]) => (
          <button
            key={panel}
            type="button"
            role="tab"
            aria-selected={mobileWorkspacePanel === panel}
            aria-controls={`mobile-workspace-${panel}`}
            className={mobileWorkspacePanel === panel ? "active" : ""}
            onClick={() => setMobileWorkspacePanel(panel)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <div className="editor-workspace">
        <aside id="mobile-workspace-index" role="tabpanel" className={`event-index mobile-workspace-panel ${mobileWorkspacePanel === "index" ? "is-active" : ""}`} aria-label="已整理的成長事件">
          <div className="panel-title"><span>事件索引</span><b>{eventCountLabel}</b></div>
          {canEdit ? <button className="new-event-button" onClick={startNewEvent}><Plus size={16} /> 新增一段記憶</button> : <p className="commenter-index-note"><LockKeyhole size={13} /> 註解者可選取事件閱讀，並在預覽欄留下補充。</p>}
          <div className="index-filters">
            <label className="index-search"><Search size={13} /><input aria-label="搜尋日記全文" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜尋標題、內容、地點或標籤" /></label>
            <label className="index-date-filter"><CalendarRange size={13} /><input aria-label="篩選開始日期" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /><span>至</span><input aria-label="篩選結束日期" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
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
                draggable={canEdit && filterType === "all" && filterTag === "all" && !searchQuery && !dateFrom && !dateTo && sortOrder === "custom"}
                className={`event-index-card ${selectedEvent?.id === event.id ? "is-selected" : ""}`}
                onClick={() => canEdit ? editEvent(event) : setSelectedId(event.id)}
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

        <section id="mobile-workspace-compose" role="tabpanel" className={`editor-form-panel mobile-workspace-panel ${mobileWorkspacePanel === "compose" ? "is-active" : ""}`} aria-labelledby="composer-title">
          <div className="form-heading">
            <div><p className="editor-kicker"><span /> {editingId ? "編輯中" : "新的篇章"}</p><h2 id="composer-title">{editingId ? "調整這段記憶" : "記下一個發生過的瞬間"}</h2></div>
            {canEdit && editingId ? <button className="quiet-action" onClick={startNewEvent}>放棄編輯</button> : null}
          </div>

          <form onSubmit={handleSubmit} className="event-form">
            {canEdit ? <>
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

            <div className="form-row">
              <label className="form-field">
                <span>平行軌道</span>
                <select value={form.track} onChange={(event) => setForm({ ...form, track: event.target.value as EventForm["track"] })}>
                  <option value="career">職涯與專案</option>
                  <option value="skills">技術與技能</option>
                  <option value="life">生活與心境</option>
                  <option value="hardware">硬體與環境</option>
                </select>
              </label>
              <label className="form-field">
                <span>里程碑類型</span>
                <select value={form.milestoneType} onChange={(event) => setForm({ ...form, milestoneType: event.target.value as EventForm["milestoneType"] })}>
                  <option value="standard">一般記錄</option>
                  <option value="highlight">高光時刻</option>
                  <option value="turning_point">重大轉折</option>
                  <option value="gear_workflow">技術／設備紀錄</option>
                  <option value="reflection">日常反思</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label className="form-field">
                <span>里程碑權重</span>
                <select value={form.milestoneWeight} onChange={(event) => setForm({ ...form, milestoneWeight: Number(event.target.value) })}>
                  <option value={1}>1 — 日常</option>
                  <option value={2}>2 — 重要</option>
                  <option value={3}>3 — 顯著</option>
                  <option value={4}>4 — 關鍵</option>
                  <option value={5}>5 — 人生節點</option>
                </select>
              </label>
              <label className="form-field">
                <span>Before／After 對比群組（選填）</span>
                <input value={form.comparisonGroup} onChange={(event) => setForm({ ...form, comparisonGroup: event.target.value })} placeholder="例如：工作桌演進" maxLength={96} />
              </label>
            </div>

            <label className="form-field">
              <span>把故事寫下來</span>
              <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="發生了什麼？你當時怎麼想？這段經驗後來帶給了你什麼？" rows={5} maxLength={8000} />
            </label>

            <section className="writing-guide" aria-labelledby="writing-guide-title">
              <header><span id="writing-guide-title"><LockKeyhole size={13} /> 本機寫作引導</span><small>只在此裝置補上文字，不會送出日記內容。</small></header>
              <p>選一個起筆，會附加在目前草稿後方，你仍可自由修改或刪除。</p>
              <div>{writingGuides.map((guide) => <button type="button" key={guide.key} onClick={() => applyWritingGuide(guide.template)}>{guide.label}</button>)}</div>
            </section>

            <label className="form-field">
              <span><MapPin size={14} /> 地點（選填）</span>
              <input value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} placeholder="例如：外婆家、學校禮堂" maxLength={180} />
            </label>

            <div className="form-row location-privacy-row">
              <label className="form-field">
                <span>分享時的位置精度</span>
                <select value={form.locationPrivacy} onChange={(event) => setForm({ ...form, locationPrivacy: event.target.value as EventForm["locationPrivacy"] })}>
                  <option value="none">不顯示地點</option>
                  <option value="city">僅顯示城市／區域文字</option>
                  <option value="precise">精確座標僅私人足跡使用</option>
                </select>
              </label>
              <div className="form-field private-coordinates">
                <span><LockKeyhole size={14} /> 私有座標（選填）</span>
                <div><input value={form.mapLatitude} onChange={(event) => setForm({ ...form, mapLatitude: event.target.value })} inputMode="decimal" placeholder="緯度，例如 25.033" /><input value={form.mapLongitude} onChange={(event) => setForm({ ...form, mapLongitude: event.target.value })} inputMode="decimal" placeholder="經度，例如 121.565" /></div>
                <small>不自動地理編碼；精確點位永遠不會出現在公開／密碼分享頁。</small>
              </div>
            </div>

            <section className="form-field soundtrack-field" aria-labelledby="soundtrack-field-title">
              <span id="soundtrack-field-title"><Music size={14} /> 章節 BGM（選填）</span>
              <div className="soundtrack-inputs"><input value={form.soundtrackTitle} onChange={(event) => setForm({ ...form, soundtrackTitle: event.target.value })} placeholder="曲名或這段時期的主題" maxLength={120} /><input type="url" value={form.soundtrackUrl} onChange={(event) => setForm({ ...form, soundtrackUrl: event.target.value })} placeholder="直接音訊網址（https://… .mp3）" maxLength={1024} /></div>
              <small>只支援可由瀏覽器直接播放的音訊網址；閱讀者必須自行按下播放，系統不會因切換事件或滑動頁面而自動播放。</small>
            </section>

            <label className="form-field event-share-scope-field">
              <span><Globe2 size={14} /> 事件分享範圍</span>
              <select value={form.shareScope} onChange={(event) => setForm({ ...form, shareScope: event.target.value as EventForm["shareScope"] })}>
                <option value="private">完全私人</option>
                <option value="link">僅持有密碼／私密連結者</option>
                <option value="public">公開故事可閱</option>
              </select>
              <small>公開故事只會讀取「公開故事可閱」事件；私密連結或密碼分享可額外讀取「僅持有連結者」事件。</small>
            </label>

            <div className="form-field tags-field">
              <span><Tag size={14} /> 標籤</span>
              <div className="tag-input-row">
                <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={handleTagInputKeyDown} placeholder="輸入後按 Enter，例如：家庭" maxLength={24} />
                <button type="button" onClick={() => addTag()}>加入</button>
              </div>
              <div className="tag-chips">
                {form.tagNames.map((tag) => <button type="button" key={tag} onClick={() => setForm({ ...form, tagNames: form.tagNames.filter((item) => item !== tag) })}>{tag}<X size={12} /></button>)}
              </div>
              {data?.tags.length ? <div className="tag-suggestions">常用：{data.tags.slice(0, 5).map((tag) => <button type="button" key={tag.id} onClick={() => addTag(tag.name)}>{tag.name}</button>)}</div> : null}
            </div>

            <div className="form-field tags-field skill-tags-field">
              <span><Sparkles size={14} /> 技能標籤</span>
              <div className="tag-input-row">
                <input value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} onKeyDown={handleSkillInputKeyDown} placeholder="輸入後按 Enter，例如：Ableton Live" maxLength={24} />
                <button type="button" onClick={() => addSkill()}>加入</button>
              </div>
              <div className="tag-chips">
                {form.skillNames.map((skill) => <button type="button" key={skill} onClick={() => setForm({ ...form, skillNames: form.skillNames.filter((item) => item !== skill) })}>{skill}<X size={12} /></button>)}
              </div>
              <small>技能會獨立保存，可在多軌時間軸中反向篩選相關成長事件。</small>
            </div>

            <div className="form-field tags-field phase-keywords-field">
              <span><BookOpenCheck size={14} /> 階段關鍵字</span>
              <div className="tag-input-row">
                <input value={phaseKeywordDraft} onChange={(event) => setPhaseKeywordDraft(event.target.value)} onKeyDown={handlePhaseKeywordInputKeyDown} placeholder="輸入後按 Enter，例如：重新定位" maxLength={24} />
                <button type="button" onClick={() => addPhaseKeyword()}>加入</button>
              </div>
              <div className="tag-chips">
                {form.phaseKeywords.map((keyword) => <button type="button" key={keyword} onClick={() => setForm({ ...form, phaseKeywords: form.phaseKeywords.filter((item) => item !== keyword) })}>{keyword}<X size={12} /></button>)}
              </div>
              <small>用來描述這段事件在所屬人生章節中的主題；它不會取代一般標籤或技能。</small>
            </div>

            <label className="form-field">
              <span><LockKeyhole size={14} /> 時空膠囊解鎖日（選填）</span>
              <input type="date" value={form.unlocksAt} onChange={(event) => setForm({ ...form, unlocksAt: event.target.value })} />
              <small>設定後，閱讀端會在指定日期前維持鎖定狀態。</small>
            </label>

            <div className="form-field color-field">
              <span>事件標記色</span>
              <div>{diaryColors.map((color) => <button type="button" key={color} aria-label={`選擇${color}標記色`} className={form.color === color ? "selected" : ""} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })}><Check size={13} /></button>)}</div>
            </div>

            <div className="form-field media-field">
              <span><ImagePlus size={14} /> 珍藏影像（可多選）</span>
              <label className="image-dropzone">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleImageChange} />
                <><ImagePlus size={20} /><b>選擇圖片</b><small>可一次選取多張 JPG、PNG、WebP 或 GIF；每張最大 4MB</small></>
              </label>
              {pendingImages.length ? <div className="pending-media-grid">{pendingImages.map((image) => <article key={image.id}><img src={image.preview} alt={`${image.name} 預覽`} /><input value={image.caption} onChange={(event) => setPendingImages((current) => current.map((item) => item.id === image.id ? { ...item, caption: event.target.value } : item))} placeholder="圖片說明（選填）" maxLength={240} /><button type="button" onClick={() => setPendingImages((current) => current.filter((item) => item.id !== image.id))} aria-label={`移除 ${image.name}`}><X size={13} /></button></article>)}</div> : null}
            </div>

            <div className="form-actions"><span>{editingId ? "修改將立即更新你的私人時間帶。" : "儲存後，這段記憶會出現在左側索引與時間預覽。"}</span><button type="submit" disabled={isSaving}>{isSaving ? <Loader2 size={16} className="animate-spin" /> : <PencilLine size={16} />}{editingId ? "儲存變更" : "存入時間帶"}</button></div>
            </> : <div className="commenter-form-note"><LockKeyhole size={17} /><div><b>此成長史目前為唯讀</b><p>你可以在右側事件預覽閱讀內容，並透過家庭註解留下補充或提問。</p></div></div>}
          </form>
        </section>

        <aside id="mobile-workspace-preview" role="tabpanel" className={`timeline-preview mobile-workspace-panel ${mobileWorkspacePanel === "preview" ? "is-active" : ""}`} aria-label="選取事件的時間帶預覽">
          <div className="panel-title"><span>時間帶預覽</span><b>LIVE</b></div>
          <nav className="timeline-view-switch" aria-label="時間軸閱讀視角">
            {timelineViewOptions.map((view) => <button type="button" key={view.key} className={timelineViewMode === view.key ? "is-active" : ""} aria-pressed={timelineViewMode === view.key} onClick={() => setTimelineViewMode(view.key)}><b>{view.label}</b><small>{view.description}</small></button>)}
          </nav>
          {timelineViewMode === "timeline" ? <section className="multitrack-timeline" aria-labelledby="multitrack-title">
            <header className="multitrack-heading">
              <div><p>PARALLEL LOG / {visibleEvents.length.toString().padStart(2, "0")}</p><h3 id="multitrack-title">四條軌道，同步回看</h3></div>
              {skillFilter ? <button type="button" className="multitrack-reset" onClick={() => setSkillFilter(null)}>清除技能篩選</button> : null}
            </header>
            {data?.lifePhases.length ? <div className="phase-filter-list" aria-label="依人生階段檢視多軌事件">
              <button type="button" className={phaseFilter === "all" ? "is-active" : ""} aria-pressed={phaseFilter === "all"} onClick={() => { setPhaseFilter("all"); setSkillFilter(null); }}>全部階段</button>
              {data.lifePhases.map((phase) => <button type="button" key={phase.key} className={phaseFilter === phase.key ? "is-active" : ""} aria-pressed={phaseFilter === phase.key} onClick={() => { setPhaseFilter(phase.key); setSkillFilter(null); }}>{phase.label} <small>{phase.yearRange ?? `${phase.count} 段`}</small></button>)}
            </div> : null}
            {timelineSkills.length ? <div className="skill-filter-list" aria-label="依技能反向篩選事件">
              {timelineSkills.map((skill) => <button type="button" key={skill} className={skillFilter === skill ? "is-active" : ""} aria-pressed={skillFilter === skill} onClick={() => setSkillFilter((current) => current === skill ? null : skill)}>{skill}</button>)}
            </div> : <p className="multitrack-empty-note">為事件加入技能標籤後，可從這裡反向查看技能如何穿越不同人生軌道。</p>}
            <div className="track-insights" aria-label="目前篩選範圍的里程碑統計">
              <span><b>{timelineInsights.projectCount}</b>職涯／專案</span>
              <span><b>{timelineInsights.highlightCount}</b>高光節點</span>
              <span><b>{timelineInsights.turningPointCount}</b>重大轉折</span>
              <span><b>{timelineInsights.leadingSkill ?? "—"}</b>投入最深技能</span>
              <span><b>{timelineInsights.leadingPhaseKeyword ?? "—"}</b>階段代表字</span>
            </div>
            <div className="track-lanes">
              {trackRows.map((track) => <section className="track-lane" key={track.key} style={{ "--track-color": track.color } as React.CSSProperties} aria-label={`${track.label}軌道`}>
                <header><span className="track-label"><i />{track.shortLabel}</span><small>{track.events.length.toString().padStart(2, "0")} 段 {track.lockedCount ? `／ ${track.lockedCount} 個膠囊` : ""}</small></header>
                <div className="track-events">
                  {track.events.length ? track.events.map((event) => {
                    const isLocked = isTimeCapsuleLocked(event);
                    return <button type="button" className={`track-event milestone-${event.milestoneType} ${selectedEvent?.id === event.id ? "is-selected" : ""}`} key={event.id} onClick={() => { setSelectedId(event.id); setMobileWorkspacePanel("preview"); }}>
                      <span className="track-event-marker" style={{ backgroundColor: event.color }} />
                      <span className="track-event-copy"><small>{new Date(event.occurredAt).getFullYear()} · {isLocked ? `解鎖於 ${new Date(event.unlocksAt!).toLocaleDateString("zh-TW")}` : milestoneLabels[event.milestoneType]}</small><b>{isLocked ? "時空膠囊鎖定中" : event.title}</b></span>
                      <em aria-label={`里程碑權重 ${event.milestoneWeight}／5`}>{event.milestoneWeight}</em>
                    </button>;
                  }) : <p>尚無事件</p>}
                </div>
              </section>)}
            </div>
          </section> : null}
          {timelineViewMode === "bento" ? <section className="bento-timeline" aria-labelledby="bento-timeline-title">
            <header><div><p>BENTO / PRIORITY</p><h3 id="bento-timeline-title">把重要時刻放大</h3></div><small>{bentoEvents.length.toString().padStart(2, "0")} 段</small></header>
            {bentoEvents.length ? <div className="bento-event-grid">{bentoEvents.map((event) => <button type="button" key={event.id} className={`bento-event bento-${getBentoSpan(event.milestoneWeight)} ${selectedEvent?.id === event.id ? "is-selected" : ""}`} onClick={() => { setSelectedId(event.id); setMobileWorkspacePanel("preview"); }}>
              {event.media[0] ? <img src={event.media[0].url} alt={event.media[0].caption ?? event.title} /> : <span className="bento-color-field" style={{ backgroundColor: event.color }} />}
              <span className="bento-event-copy"><small>{new Date(event.occurredAt).getFullYear()} · {event.track}</small><b>{event.title}</b>{event.place ? <em><MapPin size={11} /> {event.place}</em> : null}</span><i aria-label={`里程碑權重 ${event.milestoneWeight}／5`}>{event.milestoneWeight}</i>
            </button>)}</div> : <p className="view-empty-note">目前篩選範圍尚未有可排入精華格的事件。</p>}
          </section> : null}
          {timelineViewMode === "map" ? <section className="footprint-atlas" aria-labelledby="footprint-atlas-title">
            <header><div><p>PRIVATE ATLAS / LOCAL ONLY</p><h3 id="footprint-atlas-title">以地點串起移動</h3></div><small>不使用 GPS 或外部地圖</small></header>
            <p className="footprint-privacy-note"><LockKeyhole size={12} /> 已填入的私有經緯度會以世界格網顯示；座標不會送往第三方，公開／密碼分享頁也永遠不會收到精確點位。</p>
            {spatialFootprints.length ? <div className="spatial-footprint-map" aria-label="以私有經緯度投影的事件據點圖"><span className="spatial-equator" aria-hidden="true" />{spatialFootprints.map((event, index) => <button type="button" key={event.id} className={`spatial-footprint-node track-${event.track} ${selectedEvent?.id === event.id ? "is-selected" : ""}`} style={{ left: `${event.x}%`, top: `${event.y}%`, "--node-color": event.color, "--node-order": index } as React.CSSProperties} onClick={() => { setSelectedId(event.id); setMobileWorkspacePanel("preview"); }} aria-label={`${event.title}，${event.place ?? "私有位置"}`}><i /><span>{event.place ?? event.title}</span></button>)}</div> : <p className="spatial-map-empty">尚未有設定私有座標的事件。可在撰寫欄填入經緯度後，於此查看真實空間分佈。</p>}
            {placeFootprints.length ? <div className="footprint-route">{placeFootprints.map((footprint, index) => <article key={footprint.place} className="footprint-stop"><span className="footprint-step">{String(index + 1).padStart(2, "0")}</span><div><h4>{footprint.place}</h4><p>{new Date(footprint.firstSeenAt).getFullYear()} — {new Date(footprint.lastSeenAt).getFullYear()} · {footprint.events.length} 段記憶</p><div>{footprint.events.map((event) => <button type="button" key={event.id} onClick={() => { setSelectedId(event.id); setMobileWorkspacePanel("preview"); }}>{event.title}</button>)}</div></div><small>{footprint.tracks.join(" / ")}</small></article>)}</div> : <p className="view-empty-note">為事件補上地點後，這裡會建立不含座標的私人足跡索引。</p>}
          </section> : null}
          {selectedEvent ? (
            <>
              <div className="preview-date"><span>{formatDate(selectedEvent.occurredAt, selectedEvent.datePrecision)}</span><i style={{ backgroundColor: selectedEvent.color }} /></div>
              <article className={`preview-card ${selectedCapsuleStatus.isLocked ? "is-capsule-locked" : ""}`}>
                {selectedCapsuleStatus.isLocked ? <section className="capsule-lock-notice" aria-label="時空膠囊鎖定中"><LockKeyhole size={23} /><p>TIME CAPSULE / SEALED</p><h3>這段記憶正在等待未來的你。</h3><strong>{formatCapsuleCountdown(selectedCapsuleStatus.daysRemaining)}</strong><span>解鎖日：{new Date(selectedCapsuleStatus.unlocksAt!).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}</span></section> : null}
                {selectedEvent.media[0] ? <div className="preview-image"><img src={selectedEvent.media[0].url} alt={selectedEvent.media[0].caption ?? selectedEvent.title} /></div> : null}
                <p className="preview-type">{eventTypes.find((type) => type.value === selectedEvent.eventType)?.label} {selectedEvent.ageLabel ? `/ ${selectedEvent.ageLabel}` : ""}</p>
                <h3>{selectedEvent.title}</h3>
                <p className="preview-body">{selectedEvent.body || "這段記憶還在等待你寫下細節。"}</p>
                {selectedEvent.place ? <p className="preview-place"><MapPin size={13} /> {selectedEvent.place}</p> : null}
                {comparisonPair ? <section className="before-after-comparison" aria-labelledby="comparison-title"><header><span id="comparison-title">BEFORE / AFTER · {comparisonPair.group}</span><small>左右拖曳比較</small></header><div className="comparison-frame"><img src={comparisonPair.before.media[0]!.url} alt={`${comparisonPair.before.title}：Before`} /><img className="comparison-after" style={{ clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)` }} src={comparisonPair.after.media[0]!.url} alt={`${comparisonPair.after.title}：After`} /><i style={{ left: `${comparisonPosition}%` }} aria-hidden="true" /></div><input aria-label={`調整 ${comparisonPair.group} Before 與 After 的比較位置`} type="range" min="0" max="100" value={comparisonPosition} onChange={(event) => setComparisonPosition(Number(event.target.value))} /><footer><span>{new Date(comparisonPair.before.occurredAt).getFullYear()} · {comparisonPair.before.title}</span><span>{new Date(comparisonPair.after.occurredAt).getFullYear()} · {comparisonPair.after.title}</span></footer></section> : null}
                {selectedEvent.soundtrackUrl ? <section className="event-soundtrack" aria-label="章節背景音樂，需手動播放"><header><span><Music size={13} /> {selectedEvent.soundtrackTitle || "這段時期的主題曲"}</span><small>手動播放</small></header><audio controls preload="metadata" src={selectedEvent.soundtrackUrl}>你的瀏覽器不支援音訊播放。</audio></section> : null}
                {canEdit && (selectedEvent.milestoneType !== "standard" || selectedEvent.milestoneWeight >= 3) ? <section className="social-card-actions" aria-label="里程碑社群卡"><div><span>SHARE CARD / SVG</span><small>使用這筆真實事件資料輸出向量圖；不會自動發布到社群。</small></div><div><button type="button" onClick={() => downloadMilestoneCard(selectedEvent, "square")}>下載 1:1</button><button type="button" onClick={() => downloadMilestoneCard(selectedEvent, "portrait")}>下載 9:16</button></div></section> : null}
                <div className="preview-tags">{selectedEvent.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
                <div className="event-visibility-control"><span>{selectedEvent.shareScope === "public" ? <Globe2 size={13} /> : <LockKeyhole size={13} />}{selectedEvent.shareScope === "public" ? "公開故事可閱" : selectedEvent.shareScope === "link" ? "僅私密連結／密碼分享可閱" : "完全私人"}</span>{canEdit ? <select aria-label="更新事件分享範圍" value={selectedEvent.shareScope} onChange={async (event) => { try { await visibilityMutation.mutateAsync({ id: selectedEvent.id, shareScope: event.target.value as "private" | "public" | "link" }); await utils.diary.get.invalidate(); toast.success("事件分享範圍已更新。"); } catch (visibilityError) { toast.error(visibilityError instanceof Error ? visibilityError.message : "無法更新事件分享範圍。"); } }} disabled={visibilityMutation.isPending}><option value="private">私人</option><option value="link">連結／密碼</option><option value="public">公開</option></select> : null}</div>
                {selectedEvent.media.length ? <section className="media-editor" aria-label={canEdit ? "事件圖片編輯" : "事件圖片"}><header><span><GripVertical size={13} /> {canEdit ? "圖片排序與說明" : "事件圖片"}</span><b>{selectedEvent.media.length.toString().padStart(2, "0")} 張</b></header>{selectedEvent.media.map((media) => <article key={media.id} draggable={canEdit && selectedEvent.media.length > 1} onDragStart={() => canEdit && setDraggedMediaId(media.id)} onDragOver={(event) => canEdit && event.preventDefault()} onDrop={() => canEdit && dropImageAt(media.id)} onDragEnd={() => setDraggedMediaId(null)}><img src={media.url} alt={media.caption ?? selectedEvent.title} /><div>{canEdit ? <><input value={mediaCaptionDrafts[media.id] ?? media.caption ?? ""} onChange={(event) => setMediaCaptionDrafts((current) => ({ ...current, [media.id]: event.target.value }))} placeholder="為這張圖片寫下說明" maxLength={240} /><div><button type="button" onClick={() => saveImageCaption(media.id)} disabled={updateImageMutation.isPending}><Save size={12} /> 儲存說明</button><button type="button" onClick={() => removeImage(media.id)}><Trash2 size={12} /> 移除</button></div></> : <p className="media-caption-readonly">{media.caption ?? "未提供圖片說明"}</p>}</div></article>)}</section> : null}
                {canEdit ? <section className="event-revisions" aria-label="事件版本歷程">
                  <button type="button" className="event-revisions-toggle" onClick={() => setShowRevisions((visible) => !visible)}><History size={13} /> {showRevisions ? "收起版本歷程" : "查看版本歷程"}</button>
                  {showRevisions ? <div className="event-revisions-list">{revisionsQuery.isLoading ? <p><Loader2 size={13} className="animate-spin" /> 載入版本中…</p> : revisionsQuery.error ? <p>無法讀取版本：{revisionsQuery.error.message}</p> : revisionsQuery.data?.length ? revisionsQuery.data.map((revision) => <article key={revision.id}><div><b>第 {revision.version} 版</b><span>{revision.changeType === "create" ? "初始建立" : revision.changeType === "restore" ? "還原版本" : "內容更新"} · {new Date(revision.createdAt).toLocaleString("zh-TW")}</span></div><p>{revision.snapshot.title}</p>{canEdit ? <button type="button" onClick={() => restoreEventRevision(revision.id, revision.version)} disabled={restoreRevisionMutation.isPending}><RotateCcw size={12} /> 還原此版</button> : null}</article>) : <p>這段事件尚未有可顯示的版本。</p>}</div> : null}
                </section> : null}
                <section className="event-comments" aria-label="家庭共寫註解">
                  <header><span><BookOpenCheck size={13} /> 家庭註解</span><small>只有日記擁有者與受邀成員可查看。</small></header>
                  {eventCommentsQuery.isLoading ? <p><Loader2 size={13} className="animate-spin" /> 載入註解中…</p> : eventCommentsQuery.data?.length ? <div className="event-comment-list">{eventCommentsQuery.data.map((comment) => <article key={comment.id}><b>{comment.authorName ?? "受邀成員"}</b><span>{new Date(comment.createdAt).toLocaleString("zh-TW")}</span><p>{comment.body}</p></article>)}</div> : <p>尚未有家庭註解。</p>}
                  <div className="event-comment-compose"><textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="為這段記憶留下補充或提問" maxLength={2000} rows={3} /><button type="button" onClick={() => createCommentMutation.mutate({ eventId: selectedEvent.id, body: commentDraft })} disabled={!commentDraft.trim() || createCommentMutation.isPending}>{createCommentMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} 發表註解</button></div>
                </section>
                {canEdit ? <div className="preview-actions"><button onClick={() => editEvent(selectedEvent)}><PencilLine size={14} /> 編輯</button><button className="delete" onClick={() => removeEvent(selectedEvent.id)}><Trash2 size={14} /> 刪除</button></div> : null}
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
