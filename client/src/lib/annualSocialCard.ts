import type { SocialCardFormat } from "./socialMilestoneCard";

type AnnualShareEvent = {
  occurredAt: number;
  shareScope: "private" | "public" | "link";
  tags: Array<{ name: string }>;
};

export function buildAnnualShareCardData(events: AnnualShareEvent[], year: number, publicLead?: string) {
  const publicEvents = events.filter((event) => event.shareScope === "public" && new Date(event.occurredAt).getFullYear() === year);
  const tagCounts = new Map<string, number>();
  for (const event of publicEvents) for (const tag of event.tags) tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1);
  const tags = Array.from(tagCounts.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 3).map(([name]) => name);
  return { year, count: publicEvents.length, tags, lead: publicLead?.trim().slice(0, 160) || "這一年由公開的時間標記構成。" };
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

export function createAnnualShareCardSvg(data: ReturnType<typeof buildAnnualShareCardData>, format: SocialCardFormat) {
  const width = 1600;
  const height = format === "square" ? 1600 : 2000;
  const tags = data.tags.length ? data.tags.map((tag) => `#${tag}`).join("  ") : "#Chronicle";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ee623b"/><rect x="70" y="70" width="${width - 140}" height="${height - 140}" fill="#f6f1e7"/><text x="140" y="190" fill="#172c43" font-family="IBM Plex Mono,monospace" font-size="30" letter-spacing="7">CHRONICLE / YEAR IN REVIEW</text><text x="140" y="${format === "square" ? 560 : 700}" fill="#172c43" font-family="DM Serif Display,serif" font-size="210">${data.year}</text><text x="140" y="${format === "square" ? 740 : 890}" fill="#ee623b" font-family="DM Serif Display,serif" font-size="94">PUBLIC MILESTONES</text><text x="140" y="${format === "square" ? 845 : 1000}" fill="#172c43" font-family="Noto Sans TC,sans-serif" font-size="38">${escapeXml(data.lead)}</text><rect x="140" y="${format === "square" ? 930 : 1120}" width="1320" height="1" fill="#172c43" opacity=".35"/><text x="140" y="${format === "square" ? 1130 : 1330}" fill="#172c43" font-family="IBM Plex Mono,monospace" font-size="230">${String(data.count).padStart(2, "0")}</text><text x="140" y="${format === "square" ? 1200 : 1400}" fill="#172c43" font-family="IBM Plex Mono,monospace" font-size="34" letter-spacing="4">PUBLIC EVENTS</text><text x="140" y="${height - 230}" fill="#172c43" font-family="Noto Sans TC,sans-serif" font-size="44">${escapeXml(tags)}</text><text x="${width - 140}" y="${height - 150}" text-anchor="end" fill="#172c43" font-family="IBM Plex Mono,monospace" font-size="28" letter-spacing="4">TIME MADE VISIBLE</text></svg>`;
}

export function downloadAnnualShareCard(data: ReturnType<typeof buildAnnualShareCardData>, format: SocialCardFormat) {
  const url = URL.createObjectURL(new Blob([createAnnualShareCardSvg(data, format)], { type: "image/svg+xml;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `chronicle-year-${data.year}-${format}.svg`;
  anchor.click();
  URL.revokeObjectURL(url);
}
