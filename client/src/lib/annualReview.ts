export type AnnualReviewEvent = {
  id: number;
  occurredAt: number;
  title: string;
  body: string;
  eventType: "memory" | "learning" | "achievement" | "chapter";
  tags: Array<{ name: string }>;
};

export const annualReviewTemplates = [
  { key: "narrative", label: "年度敘事", description: "以一段連貫文字收束今年的轉折與累積。" },
  { key: "milestones", label: "里程碑索引", description: "把值得標記的學習、成就與生活片段整理成清單。" },
  { key: "reflection", label: "回望提問", description: "以事件線索整理下一段旅程可以延續的覺察。" },
] as const;

export type AnnualReviewTemplate = (typeof annualReviewTemplates)[number]["key"];

function eventKindLabel(type: AnnualReviewEvent["eventType"]) {
  return type === "learning" ? "學習" : type === "achievement" ? "成就" : type === "chapter" ? "人生章節" : "回憶";
}

export function buildAnnualReview(events: AnnualReviewEvent[], year: number, template: AnnualReviewTemplate) {
  const records = events.filter((event) => new Date(event.occurredAt).getFullYear() === year);
  const tagNames = Array.from(new Set(records.flatMap((event) => event.tags.map((tag) => tag.name)))).slice(0, 5);
  const highlights = records.slice(0, 4).map((event) => ({ id: event.id, label: eventKindLabel(event.eventType), title: event.title, body: event.body, tags: event.tags.map((tag) => tag.name) }));
  const title = `${year} 年度回顧`;
  if (!records.length) return { title, count: 0, tags: [], highlights: [], lead: "這一年尚未有可回顧的日記片段。從第一段記憶開始，讓時間慢慢成為可閱讀的故事。", prompt: "今年有哪些想要記下、但還沒寫進時間帶的瞬間？" };

  if (template === "milestones") {
    return { title, count: records.length, tags: tagNames, highlights, lead: `這一年留下了 ${records.length} 個時間標記。把它們並置後，可以看見一條由事件、練習與選擇組成的路徑。`, prompt: "哪一個里程碑最值得帶進下一年，並繼續延伸？" };
  }
  if (template === "reflection") {
    return { title, count: records.length, tags: tagNames, highlights, lead: `從 ${records.length} 段記憶回看 ${year}，你已經把一些經驗寫成可以被理解的線索；不必急著下結論，先讓它們彼此對話。`, prompt: `在這些片段裡，哪些選擇、關係或練習讓你更接近想成為的自己？` };
  }
  const first = records[0];
  const last = records[records.length - 1];
  return { title, count: records.length, tags: tagNames, highlights, lead: `${year} 從「${first.title}」展開，並在「${last.title}」留下新的註腳。這一年由 ${records.length} 段記憶構成，每一段都為你的成長敘事增加了可回看的證據。`, prompt: "當你再次閱讀這一年，最想對當時的自己保留哪一句溫柔而具體的話？" };
}
