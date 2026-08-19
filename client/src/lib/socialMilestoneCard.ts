export type SocialMilestoneCardEvent = {
  id: number;
  occurredAt: number;
  title: string;
  body: string;
  track: "career" | "skills" | "life" | "hardware";
  milestoneType: "standard" | "highlight" | "turning_point" | "gear_workflow" | "reflection";
  milestoneWeight: number;
  color: string;
};

export type SocialCardFormat = "square" | "portrait";

const trackLabels: Record<SocialMilestoneCardEvent["track"], string> = { career: "職涯與專案", skills: "技術與技能", life: "生活與心境", hardware: "硬體與環境" };
const milestoneLabels: Record<SocialMilestoneCardEvent["milestoneType"], string> = { standard: "成長記事", highlight: "高光時刻", turning_point: "重大轉折", gear_workflow: "技術／設備", reflection: "日常反思" };

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

function clampText(value: string, max = 80) {
  const clean = value.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function createMilestoneCardSvg(event: SocialMilestoneCardEvent, format: SocialCardFormat) {
  const width = 1600;
  const height = format === "square" ? 1600 : 2000;
  const year = new Date(event.occurredAt).getFullYear();
  const weight = "●".repeat(Math.max(1, Math.min(5, event.milestoneWeight)));
  const body = clampText(event.body, format === "square" ? 115 : 165);
  const title = clampText(event.title, format === "square" ? 50 : 62);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f6f1e7"/><rect x="88" y="88" width="${width - 176}" height="${height - 176}" fill="#172c43"/><path d="M88 310H1512" stroke="${escapeXml(event.color)}" stroke-width="8"/><text x="148" y="185" fill="#f6f1e7" font-family="IBM Plex Mono,monospace" font-size="30" letter-spacing="7">CHRONICLE / MILESTONE</text><text x="148" y="265" fill="${escapeXml(event.color)}" font-family="IBM Plex Mono,monospace" font-size="38">${year} · ${escapeXml(trackLabels[event.track].toUpperCase())}</text><text x="148" y="${format === "square" ? 640 : 760}" fill="#f6f1e7" font-family="DM Serif Display,serif" font-size="${format === "square" ? 118 : 130}" font-weight="400">${escapeXml(title)}</text><text x="148" y="${format === "square" ? 835 : 1010}" fill="#d8d1c5" font-family="Noto Sans TC,sans-serif" font-size="42">${escapeXml(body)}</text><rect x="148" y="${height - 370}" width="${width - 296}" height="1" fill="#f6f1e7" opacity=".4"/><text x="148" y="${height - 285}" fill="${escapeXml(event.color)}" font-family="IBM Plex Mono,monospace" font-size="32" letter-spacing="3">${escapeXml(milestoneLabels[event.milestoneType].toUpperCase())}</text><text x="148" y="${height - 195}" fill="#f6f1e7" font-family="IBM Plex Mono,monospace" font-size="52">${weight}</text><text x="${width - 148}" y="${height - 195}" fill="#f6f1e7" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="28" letter-spacing="5">TIME MADE VISIBLE</text></svg>`;
}

export function downloadMilestoneCard(event: SocialMilestoneCardEvent, format: SocialCardFormat) {
  const url = URL.createObjectURL(new Blob([createMilestoneCardSvg(event, format)], { type: "image/svg+xml;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `chronicle-milestone-${event.id}-${format}.svg`;
  anchor.click();
  URL.revokeObjectURL(url);
}
