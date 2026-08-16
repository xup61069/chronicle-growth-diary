import type { EventType } from "./diaryEditor";

export type LocalWritingGuide = {
  key: string;
  label: string;
  template: string;
};

const sharedGuides: LocalWritingGuide[] = [
  { key: "scene", label: "從一個畫面開始", template: "我記得那一刻，最先映入眼簾的是……" },
  { key: "feeling", label: "補上當時感受", template: "當時的我其實感到……" },
];

const closingGuideByType: Record<EventType, LocalWritingGuide> = {
  memory: { key: "meaning", label: "留下後來的意義", template: "多年後回看，這段記憶讓我明白……" },
  learning: { key: "learning", label: "寫下學到的事", template: "我從這次經驗帶走的是……" },
  achievement: { key: "achievement", label: "記下努力的線索", template: "為了走到這裡，我曾經……" },
  chapter: { key: "chapter", label: "辨認改變的起點", template: "從這一天開始，我開始改變……" },
};

/**
 * These prompts are created entirely in the browser. They never call an AI API
 * and do not transmit diary content, including when AI reflections are disabled.
 */
export function getLocalWritingGuides(eventType: EventType): LocalWritingGuide[] {
  return [...sharedGuides, closingGuideByType[eventType]];
}

export function appendWritingGuide(body: string, template: string): string {
  const trimmed = body.trimEnd();
  return trimmed ? `${trimmed}\n\n${template}` : template;
}
