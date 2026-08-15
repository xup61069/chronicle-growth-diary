export type LifePhaseInput = {
  occurredAt: number;
  eventType: "memory" | "learning" | "achievement" | "chapter";
  ageLabel?: string | null;
};

export type LifePhaseAnchors = {
  birthYear?: number | null;
  educationStartYear?: number | null;
  careerStartYear?: number | null;
  childhoodStartYear?: number | null;
  childhoodEndYear?: number | null;
  educationEndYear?: number | null;
  careerEndYear?: number | null;
};

export const LIFE_PHASES = [
  { key: "childhood", label: "童年", note: "最早的記憶、家人與第一次發現。" },
  { key: "education", label: "求學", note: "在學習、同儕與探索中逐漸成形。" },
  { key: "career", label: "職涯", note: "把能力帶進世界，持續選擇與累積。" },
] as const;

export type LifePhaseKey = (typeof LIFE_PHASES)[number]["key"];

export function getInvalidLifePhaseBoundary(anchors: LifePhaseAnchors) {
  const boundaries: Array<{ key: LifePhaseKey; label: string; start?: number | null; end?: number | null }> = [
    { key: "childhood", label: "童年", start: anchors.childhoodStartYear ?? anchors.birthYear, end: anchors.childhoodEndYear },
    { key: "education", label: "求學", start: anchors.educationStartYear, end: anchors.educationEndYear },
    { key: "career", label: "職涯", start: anchors.careerStartYear, end: anchors.careerEndYear },
  ];
  return boundaries.find((boundary) => boundary.start != null && boundary.end != null && boundary.start > boundary.end);
}

function extractAge(ageLabel?: string | null) {
  if (!ageLabel) return undefined;
  const match = ageLabel.match(/\d{1,2}/);
  return match ? Number(match[0]) : undefined;
}

export function inferLifePhaseKey(event: LifePhaseInput, anchors: LifePhaseAnchors): LifePhaseKey {
  const year = new Date(event.occurredAt).getFullYear();
  const age = extractAge(event.ageLabel);
  const schoolYear = anchors.educationStartYear ?? (anchors.birthYear ? anchors.birthYear + 6 : undefined);
  const careerYear = anchors.careerStartYear ?? (schoolYear ? schoolYear + 16 : undefined);

  if (age !== undefined) {
    if (age < 7) return "childhood";
    if (age < 23) return "education";
    return "career";
  }
  if (anchors.childhoodEndYear && year <= anchors.childhoodEndYear) return "childhood";
  if (anchors.educationEndYear && year <= anchors.educationEndYear && (!schoolYear || year >= schoolYear)) return "education";
  if (anchors.careerStartYear && year >= anchors.careerStartYear) return "career";
  if (careerYear !== undefined && year >= careerYear) return "career";
  if (schoolYear !== undefined && year >= schoolYear) return "education";
  if (event.eventType === "learning") return "education";
  return "childhood";
}

export function deriveLifePhases<T extends LifePhaseInput>(events: T[], anchors: LifePhaseAnchors) {
  return LIFE_PHASES.map((phase) => {
    const phaseEvents = events.filter((event) => inferLifePhaseKey(event, anchors) === phase.key);
    const years = phaseEvents.map((event) => new Date(event.occurredAt).getFullYear());
    return {
      ...phase,
      count: phaseEvents.length,
      yearRange: years.length ? `${Math.min(...years)} — ${Math.max(...years)}` : undefined,
      startYear: phase.key === "childhood" ? anchors.childhoodStartYear ?? anchors.birthYear ?? (years.length ? Math.min(...years) : undefined) : phase.key === "education" ? anchors.educationStartYear ?? (years.length ? Math.min(...years) : undefined) : anchors.careerStartYear ?? (years.length ? Math.min(...years) : undefined),
      endYear: phase.key === "childhood" ? anchors.childhoodEndYear ?? (years.length ? Math.max(...years) : undefined) : phase.key === "education" ? anchors.educationEndYear ?? (years.length ? Math.max(...years) : undefined) : anchors.careerEndYear ?? (years.length ? Math.max(...years) : undefined),
      events: phaseEvents,
    };
  }).filter((phase) => phase.count > 0);
}
