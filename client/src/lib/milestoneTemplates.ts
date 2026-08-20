import type { EventForm, EventType, MilestoneType, TimelineTrack } from "./diaryEditor";

export type MilestoneTemplate = {
  key: string;
  label: string;
  title: string;
  prompt: string;
  eventType: EventType;
  track: TimelineTrack;
  milestoneType: MilestoneType;
  tags: string[];
  phaseKeywords: string[];
};

export const milestoneTemplates: MilestoneTemplate[] = [
  { key: "first-steps", label: "第一次自己走幾步", title: "第一次自己走幾步", prompt: "當時在哪裡？誰先注意到？這一刻後來留下了什麼畫面？", eventType: "memory", track: "life", milestoneType: "highlight", tags: ["成長節點", "第一次"], phaseKeywords: ["行動", "家庭" ] },
  { key: "first-words", label: "第一次清楚說出想法", title: "第一次清楚說出想法", prompt: "說了什麼？當下的人怎麼回應？你想保留哪個細節？", eventType: "memory", track: "life", milestoneType: "highlight", tags: ["成長節點", "表達"], phaseKeywords: ["語言", "關係" ] },
  { key: "tooth-change", label: "第一次換牙", title: "第一次換牙", prompt: "是什麼時候發現的？這件小事帶來了哪些改變或對話？", eventType: "memory", track: "life", milestoneType: "standard", tags: ["成長節點", "日常"], phaseKeywords: ["身體", "家庭" ] },
  { key: "new-skill", label: "開始一項新練習", title: "開始練習＿＿＿", prompt: "為什麼想開始？第一天做了什麼？下一次想嘗試什麼？", eventType: "learning", track: "skills", milestoneType: "standard", tags: ["成長節點", "練習"], phaseKeywords: ["學習", "練習" ] },
  { key: "independent-moment", label: "完成一件自己負責的事", title: "第一次自己完成＿＿＿", prompt: "這件事由誰負責？遇到什麼困難？最後怎麼完成？", eventType: "achievement", track: "life", milestoneType: "highlight", tags: ["成長節點", "自主"], phaseKeywords: ["責任", "成就" ] },
  { key: "new-chapter", label: "進入新的生活階段", title: "開始一段新的生活", prompt: "這段時間從哪一天開始不同？想帶著什麼進入下一個階段？", eventType: "chapter", track: "life", milestoneType: "turning_point", tags: ["成長節點", "轉折"], phaseKeywords: ["轉變", "新階段" ] },
];

function mergeLimited(current: string[], additions: string[], limit: number) {
  return Array.from(new Set([...current, ...additions])).slice(0, limit);
}

/** Applies only suggested writing metadata; it preserves date, place, privacy, media and other user-entered context. */
export function applyMilestoneTemplate(form: EventForm, template: MilestoneTemplate): EventForm {
  const body = form.body.trim() ? `${form.body.trimEnd()}\n\n${template.prompt}` : template.prompt;
  return {
    ...form,
    title: template.title,
    body,
    eventType: template.eventType,
    track: template.track,
    milestoneType: template.milestoneType,
    milestoneWeight: template.milestoneType === "highlight" || template.milestoneType === "turning_point" ? 3 : form.milestoneWeight,
    tagNames: mergeLimited(form.tagNames, template.tags, 8),
    phaseKeywords: mergeLimited(form.phaseKeywords, template.phaseKeywords, 8),
  };
}
