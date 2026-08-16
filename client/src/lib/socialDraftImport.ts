export type SocialDraftCandidate = { sourceId: string; occurredAt: number; body: string; title: string; isSignificant: boolean };

const MAX_CANDIDATES = 250;

function toText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 8000) : "";
}

function toTimestamp(value: unknown) {
  const timestamp = typeof value === "number" ? value : typeof value === "string" ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) && timestamp >= -2208988800000 && timestamp <= 4102444800000 ? timestamp : null;
}

function toSourceId(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : toText(value);
}

/** Parses Plurk-compatible `plurks` exports or generic `posts` arrays locally. */
export function parseSocialDraftJson(raw: string): SocialDraftCandidate[] {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("檔案不是有效的 JSON。請選擇社群貼文匯出檔。 "); }
  const record = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  const posts = Array.isArray(parsed) ? parsed : Array.isArray(record?.plurks) ? record.plurks : Array.isArray(record?.posts) ? record.posts : null;
  if (!posts?.length) throw new Error("找不到可讀取的貼文陣列。支援噗浪相容的 plurks 或通用 posts JSON。 ");
  const seen = new Set<string>();
  const candidates: SocialDraftCandidate[] = [];
  for (const item of posts) {
    if (!item || typeof item !== "object") continue;
    const post = item as Record<string, unknown>;
    const body = toText(post.content_raw ?? post.text ?? post.content);
    const occurredAt = toTimestamp(post.posted ?? post.created_at ?? post.createdAt ?? post.timestamp);
    if (!body || occurredAt === null) continue;
    const sourceId = toSourceId(post.plurk_id ?? post.id) || `${occurredAt}:${body.slice(0, 80)}`;
    if (seen.has(sourceId) || candidates.length >= MAX_CANDIDATES) continue;
    seen.add(sourceId);
    candidates.push({ sourceId, occurredAt, body, title: body.slice(0, 56), isSignificant: body.length >= 80 || /畢業|錄取|搬家|結婚|出生|離職|轉職|獲獎/.test(body) });
  }
  if (!candidates.length) throw new Error("貼文缺少可辨識的日期或文字內容。 ");
  return candidates.sort((left, right) => left.occurredAt - right.occurredAt);
}

/** Parses a small local CSV export with `id`, `posted`/`created_at`, and `content`/`text` columns. */
export function parseSocialDraftCsv(raw: string): SocialDraftCandidate[] {
  const [header, ...rows] = raw.trim().split(/\r?\n/);
  if (!header || !rows.length) throw new Error("CSV 檔案沒有可讀取的標頭或貼文資料。 ");
  const columns = header.split(",").map((column) => column.trim().toLowerCase());
  const indexOf = (...names: string[]) => columns.findIndex((column) => names.includes(column));
  const idIndex = indexOf("id", "plurk_id");
  const dateIndex = indexOf("posted", "created_at", "createdat", "timestamp");
  const bodyIndex = indexOf("content_raw", "content", "text");
  if (dateIndex < 0 || bodyIndex < 0) throw new Error("CSV 需要日期與貼文文字欄位。 ");
  const posts = rows.map((row) => {
    const values = row.split(",");
    return { id: idIndex >= 0 ? values[idIndex] : undefined, posted: values[dateIndex], content_raw: values[bodyIndex] };
  });
  return parseSocialDraftJson(JSON.stringify({ plurks: posts }));
}

export { MAX_CANDIDATES };
