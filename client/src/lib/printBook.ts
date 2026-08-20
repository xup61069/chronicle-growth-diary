export type PrintBookEvent = {
  id: number;
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  title: string;
  body: string;
  ageLabel?: string | null;
  place?: string | null;
  unlocksAt?: number | null;
  tags?: Array<{ name: string }>;
  media?: Array<{ url: string; caption?: string | null }>;
  voiceNotes?: Array<{ transcript: string }>;
};

export type PrintBookPhase = {
  key: string;
  label: string;
  note?: string;
  yearRange?: string;
  events: PrintBookEvent[];
};

export type PrintBookInput = {
  title: string;
  subtitle?: string | null;
  phases: PrintBookPhase[];
  printedAt?: Date;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

function formatEventDate(timestamp: number, precision: PrintBookEvent["datePrecision"]) {
  const date = new Date(timestamp);
  if (precision === "year") return String(date.getFullYear());
  if (precision === "month") return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function isLocked(event: PrintBookEvent, now: number) {
  return event.unlocksAt != null && event.unlocksAt > now;
}

function renderEvent(event: PrintBookEvent, now: number) {
  const locked = isLocked(event, now);
  const meta = [formatEventDate(event.occurredAt, event.datePrecision), event.ageLabel, event.place].filter(Boolean).join(" · ");
  const tags = event.tags?.length ? `<p class="tags">${event.tags.map((tag) => `#${escapeHtml(tag.name)}`).join(" ")}</p>` : "";
  const media = !locked && event.media?.length ? `<figure>${event.media.slice(0, 2).map((item) => `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption || event.title)}" /><figcaption>${escapeHtml(item.caption || "")}</figcaption>`).join("")}</figure>` : "";
  const transcript = !locked && event.voiceNotes?.length ? `<aside class="transcript"><b>語音逐字稿</b>${event.voiceNotes.map((note) => `<p>${escapeHtml(note.transcript)}</p>`).join("")}</aside>` : "";
  const body = locked ? `<p class="locked-copy">這段時空膠囊將於 ${new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date(event.unlocksAt!))} 解鎖。</p>` : `<p class="body">${escapeHtml(event.body || "這段記憶尚未寫下文字。").replace(/\n/g, "<br />")}</p>`;
  return `<article class="event ${locked ? "locked" : ""}"><header><span>${escapeHtml(meta)}</span><h3>${locked ? "時空膠囊 · 未解鎖" : escapeHtml(event.title)}</h3></header>${body}${locked ? "" : tags}${media}${transcript}</article>`;
}

export function createPrintBookDocument({ title, subtitle, phases, printedAt = new Date() }: PrintBookInput) {
  const now = printedAt.getTime();
  const totalEvents = phases.reduce((total, phase) => total + phase.events.length, 0);
  const chapters = phases.map((phase, index) => `<section class="chapter"><header class="chapter-header"><span>CHAPTER ${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(phase.label)}</h2><p>${escapeHtml(phase.yearRange || phase.note || "個人成長記事")}</p></header>${phase.events.map((event) => renderEvent(event, now)).join("")}</section>`).join("");
  const printedLabel = new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(printedAt);
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}｜A5 私人書冊</title><style>
    @page { size: A5 portrait; margin: 15mm 13mm 17mm; }
    * { box-sizing: border-box; } body { margin: 0; color: #14263a; background: #dcd6cb; font-family: "Noto Sans TC", system-ui, sans-serif; } .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; gap: 10px; padding: 12px; background: #14263a; } .toolbar button { border: 1px solid #fffdf8; color: #fffdf8; background: transparent; padding: 9px 13px; font: 600 12px system-ui; cursor: pointer; } .toolbar button:first-child { border-color: #ee623b; background: #ee623b; } .book { width: 148mm; min-height: 210mm; margin: 20px auto; background: #fffdf8; box-shadow: 0 10px 32px rgba(20,38,58,.18); } .cover, .chapter { padding: 22mm 16mm; } .cover { min-height: 210mm; display: flex; flex-direction: column; justify-content: flex-end; background: linear-gradient(145deg, #fffdf8 55%, #eee7da 55%); } .eyebrow, .chapter-header > span { color: #ee623b; font: 600 10px/1.4 ui-monospace, monospace; letter-spacing: .12em; } h1, h2, h3 { font-family: Georgia, "Noto Serif TC", serif; font-weight: 400; } h1 { max-width: 95%; margin: 12px 0; font-size: 40px; line-height: 1.08; letter-spacing: -.04em; } .subtitle { max-width: 80%; color: #52616d; line-height: 1.8; } .cover footer { margin-top: auto; padding-top: 28mm; color: #66747d; font: 10px ui-monospace, monospace; } .chapter { break-before: page; } .chapter-header { border-top: 2px solid #14263a; padding-top: 11px; margin-bottom: 22px; } .chapter-header h2 { margin: 6px 0; font-size: 28px; } .chapter-header p { margin: 0; color: #66747d; font-size: 12px; } .event { break-inside: avoid; margin: 0 0 18px; padding: 0 0 18px; border-bottom: 1px solid #d6d1c8; } .event header > span { color: #66747d; font: 10px ui-monospace, monospace; } .event h3 { margin: 5px 0 10px; font-size: 20px; line-height: 1.3; } .body, .locked-copy, .transcript p { margin: 0; font-size: 12px; line-height: 1.85; } .locked { border-left: 3px solid #ee623b; padding-left: 12px; } .locked-copy { color: #8b4e3c; } .tags { margin: 10px 0 0; color: #5c7082; font: 10px ui-monospace, monospace; } figure { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin: 14px 0 0; } figure img { width: 100%; max-height: 76mm; object-fit: cover; } figcaption { grid-column: 1 / -1; color: #66747d; font-size: 9px; } .transcript { margin-top: 12px; padding: 10px; background: #f2ede4; } .transcript b { color: #ee623b; font: 600 9px ui-monospace, monospace; letter-spacing: .08em; } .transcript p { margin-top: 5px; } @media print { body { background: #fff; } .toolbar { display: none; } .book { width: auto; min-height: 0; margin: 0; box-shadow: none; } .cover { min-height: 177mm; } } @media screen and (max-width: 620px) { .book { width: calc(100vw - 24px); min-height: auto; } .cover, .chapter { padding: 14mm 11mm; } h1 { font-size: 31px; } }
  </style></head><body><nav class="toolbar" aria-label="印刷控制"><button onclick="window.print()">列印／另存 PDF</button><button onclick="window.close()">關閉預覽</button></nav><main class="book"><section class="cover"><span class="eyebrow">CHRONICLE · PRIVATE PRINT EDITION</span><h1>${escapeHtml(title)}</h1>${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}<footer>${totalEvents} 段事件 · 於 ${printedLabel} 由你的裝置建立<br />本書冊僅限私人瀏覽與列印，請自行選擇安全的保存方式。</footer></section>${chapters}</main></body></html>`;
}

export function openPrintBook(input: PrintBookInput) {
  const printWindow = window.open("", "chronicle-a5-print-book", "popup,width=900,height=960");
  if (!printWindow) throw new Error("無法開啟書冊預覽。請允許此網站開啟預覽視窗後再試。");
  printWindow.document.open();
  printWindow.document.write(createPrintBookDocument(input));
  printWindow.document.close();
  printWindow.focus();
}
