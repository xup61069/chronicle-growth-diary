export const timelineTracks = [
  { key: "career", label: "職涯與專案", shortLabel: "職涯", color: "#EE623B" },
  { key: "skills", label: "技術與技能", shortLabel: "技能", color: "#587A8B" },
  { key: "life", label: "生活與心境", shortLabel: "生活", color: "#78976D" },
  { key: "hardware", label: "硬體與環境", shortLabel: "硬體", color: "#A06A82" },
] as const;

export const milestoneLabels = {
  standard: "一般記錄",
  highlight: "高光時刻",
  turning_point: "重大轉折",
  gear_workflow: "技術／設備",
  reflection: "日常反思",
} as const;

export type TimelineTrack = (typeof timelineTracks)[number]["key"];
export type MilestoneType = keyof typeof milestoneLabels;

export type TimelineSkill = { id: number; name: string };
export type MultitrackEvent = {
  id: number;
  occurredAt: number;
  title: string;
  color: string;
  track: TimelineTrack;
  milestoneType: MilestoneType;
  milestoneWeight: number;
  skills: TimelineSkill[];
  phaseKeywords?: string[];
  unlocksAt?: number | null;
};

export function isTimeCapsuleLocked(event: Pick<MultitrackEvent, "unlocksAt">, now = Date.now()) {
  return typeof event.unlocksAt === "number" && event.unlocksAt > now;
}

export function getTimelineSkills(events: MultitrackEvent[]) {
  const skills = new Map<string, string>();
  for (const event of events) {
    event.skills.forEach((skill) => skills.set(skill.name.toLocaleLowerCase(), skill.name));
  }
  return Array.from(skills.values()).sort((left, right) => left.localeCompare(right, "zh-Hant"));
}

export function filterEventsBySkill<T extends MultitrackEvent>(events: T[], skillName: string | null): T[] {
  if (!skillName) return events;
  const normalizedSkill = skillName.toLocaleLowerCase();
  return events.filter((event) => event.skills.some((skill) => skill.name.toLocaleLowerCase() === normalizedSkill));
}

export function buildTrackRows<T extends MultitrackEvent>(events: T[], skillName: string | null, now = Date.now()) {
  const filtered = filterEventsBySkill(events, skillName);
  return timelineTracks.map((track) => ({
    ...track,
    events: filtered.filter((event) => event.track === track.key).sort((left, right) => left.occurredAt - right.occurredAt),
    lockedCount: filtered.filter((event) => event.track === track.key && isTimeCapsuleLocked(event, now)).length,
  }));
}

export function getTimelineInsights(events: MultitrackEvent[]) {
  const skillFrequency = new Map<string, number>();
  const keywordFrequency = new Map<string, number>();
  for (const event of events) {
    event.skills.forEach((skill) => skillFrequency.set(skill.name, (skillFrequency.get(skill.name) ?? 0) + 1));
    event.phaseKeywords?.forEach((keyword) => keywordFrequency.set(keyword, (keywordFrequency.get(keyword) ?? 0) + 1));
  }
  const leadingSkill = Array.from(skillFrequency.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-Hant"))[0]?.[0] ?? null;
  const leadingPhaseKeyword = Array.from(keywordFrequency.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-Hant"))[0]?.[0] ?? null;
  return {
    eventCount: events.length,
    projectCount: events.filter((event) => event.track === "career").length,
    highlightCount: events.filter((event) => event.milestoneType === "highlight" || event.milestoneWeight >= 4).length,
    turningPointCount: events.filter((event) => event.milestoneType === "turning_point").length,
    totalWeight: events.reduce((total, event) => total + event.milestoneWeight, 0),
    leadingSkill,
    leadingPhaseKeyword,
  };
}
