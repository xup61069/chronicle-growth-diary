export const eventTypes = [
  { value: "memory", label: "回憶" },
  { value: "learning", label: "學習" },
  { value: "achievement", label: "成就" },
  { value: "chapter", label: "人生章節" },
] as const;

export const diaryColors = ["#EE623B", "#587A8B", "#78976D", "#A06A82", "#D19B43"] as const;

export type EventType = (typeof eventTypes)[number]["value"];
export type DatePrecision = "day" | "month" | "year";
export type TimelineTrack = "career" | "skills" | "life" | "hardware";
export type MilestoneType = "standard" | "highlight" | "turning_point" | "gear_workflow" | "reflection";
export type EventForm = {
  title: string;
  occurredAt: string;
  datePrecision: DatePrecision;
  eventType: EventType;
  body: string;
  ageLabel: string;
  place: string;
  color: (typeof diaryColors)[number];
  tagNames: string[];
  skillNames: string[];
  track: TimelineTrack;
  milestoneType: MilestoneType;
  milestoneWeight: number;
  comparisonGroup: string;
  unlocksAt: string;
};
export type PendingImage = { id: string; name: string; type: string; base64: string; preview: string; caption: string };
export type TagInputKeyEvent = { key: string; preventDefault: () => void; stopPropagation: () => void };

const today = new Date().toISOString().slice(0, 10);

export const makeEmptyForm = (): EventForm => ({
  title: "",
  occurredAt: today,
  datePrecision: "day",
  eventType: "memory",
  body: "",
  ageLabel: "",
  place: "",
  color: "#EE623B",
  tagNames: [],
  skillNames: [],
  track: "life",
  milestoneType: "standard",
  milestoneWeight: 1,
  comparisonGroup: "",
  unlocksAt: "",
});

export function formatInputDate(timestamp: number) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDate(timestamp: number, precision: DatePrecision) {
  const date = new Date(timestamp);
  if (precision === "year") return `${date.getFullYear()} 年`;
  if (precision === "month") return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function toTimestamp(value: string, precision: DatePrecision) {
  const [year, month = "01", day = "01"] = value.split("-");
  return new Date(Number(year), precision === "year" ? 0 : Number(month) - 1, precision === "day" ? Number(day) : 1).getTime();
}

/**
 * Consume Enter inside the tag input so it only turns a draft into a tag. Without
 * stopping propagation, browsers may also submit the enclosing event form.
 */
export function consumeTagInputEnter(event: TagInputKeyEvent, onAddTag: () => void) {
  if (event.key !== "Enter") return false;
  event.preventDefault();
  event.stopPropagation();
  onAddTag();
  return true;
}

export async function readImage(file: File): Promise<PendingImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("無法讀取這張圖片。"));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, base64: dataUrl.split(",")[1] ?? "", preview: dataUrl, caption: "" });
    };
    reader.readAsDataURL(file);
  });
}
