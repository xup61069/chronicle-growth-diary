export type DiaryEventRevisionSnapshot = {
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  eventType: "memory" | "learning" | "achievement" | "chapter";
  title: string;
  body: string;
  ageLabel?: string | null;
  place?: string | null;
  color: string;
  track: "career" | "skills" | "life" | "hardware";
  milestoneType: "standard" | "highlight" | "turning_point" | "gear_workflow" | "reflection";
  milestoneWeight: number;
  comparisonGroup?: string | null;
  unlocksAt?: number | null;
  phaseKeywords: string[];
  mapLatitudeE6?: number | null;
  mapLongitudeE6?: number | null;
  locationPrivacy: "none" | "city" | "precise";
  soundtrackTitle?: string | null;
  soundtrackUrl?: string | null;
  shareScope: "private" | "public" | "link";
  isPublic: boolean;
  timelinePosition: number;
  tagNames: string[];
  skillNames: string[];
};

export function parseDiaryEventRevisionSnapshot(snapshot: string): DiaryEventRevisionSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error("這個版本快照已損毀，無法還原。");
  }
  if (
    !parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
    typeof (parsed as Record<string, unknown>).occurredAt !== "number" ||
    typeof (parsed as Record<string, unknown>).title !== "string" ||
    typeof (parsed as Record<string, unknown>).body !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>).tagNames)
  ) {
    throw new Error("這個版本快照格式無效，無法還原。");
  }
  const value = parsed as Record<string, unknown>;
  return {
    ...(value as Omit<DiaryEventRevisionSnapshot, "track" | "milestoneType" | "milestoneWeight" | "comparisonGroup" | "unlocksAt" | "phaseKeywords" | "mapLatitudeE6" | "mapLongitudeE6" | "locationPrivacy" | "soundtrackTitle" | "soundtrackUrl" | "shareScope" | "skillNames">),
    track: value.track === "career" || value.track === "skills" || value.track === "hardware" ? value.track : "life",
    milestoneType: value.milestoneType === "highlight" || value.milestoneType === "turning_point" || value.milestoneType === "gear_workflow" || value.milestoneType === "reflection" ? value.milestoneType : "standard",
    milestoneWeight: typeof value.milestoneWeight === "number" && value.milestoneWeight >= 1 && value.milestoneWeight <= 5 ? value.milestoneWeight : 1,
    comparisonGroup: typeof value.comparisonGroup === "string" ? value.comparisonGroup : null,
    unlocksAt: typeof value.unlocksAt === "number" ? value.unlocksAt : null,
    phaseKeywords: Array.isArray(value.phaseKeywords) ? value.phaseKeywords.filter((keyword): keyword is string => typeof keyword === "string") : [],
    mapLatitudeE6: typeof value.mapLatitudeE6 === "number" ? value.mapLatitudeE6 : null,
    mapLongitudeE6: typeof value.mapLongitudeE6 === "number" ? value.mapLongitudeE6 : null,
    locationPrivacy: value.locationPrivacy === "city" || value.locationPrivacy === "precise" ? value.locationPrivacy : "none",
    soundtrackTitle: typeof value.soundtrackTitle === "string" ? value.soundtrackTitle : null,
    soundtrackUrl: typeof value.soundtrackUrl === "string" ? value.soundtrackUrl : null,
    shareScope: value.shareScope === "public" || value.shareScope === "link" ? value.shareScope : value.isPublic === true ? "public" : "private",
    skillNames: Array.isArray(value.skillNames) ? value.skillNames.filter((name): name is string => typeof name === "string") : [],
  };
}
